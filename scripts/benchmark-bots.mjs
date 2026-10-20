/** Experimental throughput benchmark; does not change the shipped game.
 * LEVELS="1 3 7" FRAMES=1800 REPEATS=2 node scripts/benchmark-bots.mjs
 * MODES=realtime-webgl,realtime,rendered,unrendered,headless (default: all)
 * Experimental clock: virtualizes rAF, Date.now, performance.now and new
 * timeouts after boot. It is not a general replacement for browser timers.
 */
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { buildPilotSource } from './pilot-brain.mjs';
import { defaultLaunchOptions } from './rl/chrome.mjs';

const require = createRequire(import.meta.url);
const { createServer } = require('../server.cjs');
const frames = Number(process.env.FRAMES || 1800);
const repeats = Number(process.env.REPEATS || 2);
const levels = (process.env.LEVELS || '1 3 7').split(/\s+/).map(Number);
const modes = (process.env.MODES || 'realtime-webgl,realtime,rendered,unrendered,headless').split(
    ','
);
const results = [];
const server = createServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
let browser;

// Only used inside disposable benchmark pages. Preserve real time for measurement.
function installStepper() {
    const game = window.SPACE_CHICKEN_GAME;
    game.loop.stop();
    const realNow = performance.now.bind(performance);
    let now = 1000;
    const epoch = 1700000000000;
    let randomState = 42;
    Math.random = () => {
        randomState ^= randomState << 13;
        randomState ^= randomState >>> 17;
        randomState ^= randomState << 5;
        return (randomState >>> 0) / 4294967296;
    };
    Object.defineProperty(performance, 'now', { configurable: true, value: () => now });
    Date.now = () => Math.floor(epoch + now);
    let id = 0;
    const rafs = new Map();
    const timers = new Map();
    window.requestAnimationFrame = (fn) => {
        rafs.set(++id, fn);
        return id;
    };
    window.cancelAnimationFrame = (key) => rafs.delete(key);
    const realClear = window.clearTimeout.bind(window);
    window.setTimeout = (fn, delay = 0, ...args) => {
        const key = ++id + 1000000;
        timers.set(key, { fn, at: now + Number(delay), args });
        return key;
    };
    window.clearTimeout = (key) => {
        if (!timers.delete(key)) realClear(key);
    };
    window.__benchmarkStep = (count, render) => {
        const started = realNow();
        let completed = 0;
        let traceHash = 2166136261;
        for (; completed < count; completed++) {
            now += 1000 / 60;
            for (const [key, timer] of [...timers]) {
                if (timer.at <= now) {
                    timers.delete(key);
                    timer.fn(...timer.args);
                }
            }
            const callbacks = [...rafs.values()];
            rafs.clear();
            for (const callback of callbacks) callback(now);
            if (render) game.step(now, 1000 / 60);
            else {
                game.headlessStep(now, 1000 / 60);
                // Camera follow/worldView normally advance during rendering.
                for (const scene of game.scene.getScenes(true)) {
                    for (const camera of scene.cameras.cameras) {
                        if (camera.visible && camera.alpha > 0) camera.preRender();
                    }
                }
            }
            if (window.__spaceChickenPilotError) throw Error(window.__spaceChickenPilotError);
            const scene = game.scene.getScenes(true).find((item) => item.player);
            for (const value of [scene?.player.x, scene?.player.y, scene?.deathCount]) {
                traceHash = Math.imul(traceHash ^ Math.round(value * 1000), 16777619);
            }
            if (window.__spaceChickenPilotOutcome) {
                completed++;
                break;
            }
        }
        const snap = window.__spaceChickenDebug.getBotSnapshot();
        return {
            frames: completed,
            traceHash: traceHash >>> 0,
            computeMs: realNow() - started,
            elapsedMs: snap.elapsedMs,
            x: snap.player?.x,
            y: snap.player?.y,
            deaths: snap.deaths,
            outcome: window.__spaceChickenPilotOutcome,
        };
    };
}

async function run(mode, level, repeat) {
    const started = performance.now();
    const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    try {
        if (mode === 'headless') {
            await page.route('**/GameConfig.js', async (route) => {
                const response = await route.fetch();
                const source = (await response.text()).replace(
                    'type: resolveRendererType(),',
                    'type: Phaser.HEADLESS, audio: { noAudio: true },'
                );
                await route.fulfill({ response, body: source });
            });
        }
        await page.goto(
            `http://127.0.0.1:${server.address().port}/?bot=1&level=${level}&seed=42&renderer=${mode === 'realtime-webgl' ? 'auto' : 'canvas'}`
        );
        await page.waitForFunction(() => window.__spaceChickenDebug?.ready(), null, {
            timeout: 20000,
        });
        let result;
        if (mode.startsWith('realtime')) {
            await page.evaluate(buildPilotSource());
            result = await page.evaluate(async () => {
                let ticks = 0;
                const game = window.SPACE_CHICKEN_GAME;
                const tick = () => ticks++;
                game.events.on('poststep', tick);
                const started = performance.now();
                await new Promise((resolve) => setTimeout(resolve, 3000));
                game.events.off('poststep', tick);
                return { frames: ticks, computeMs: performance.now() - started };
            });
        } else {
            await page.evaluate(installStepper);
            // Restart under the controlled clock so boot-time frames do not
            // determine the starting physics/tween phase of the experiment.
            await page.evaluate(() => {
                window.__spaceChickenTest.reset(42);
                window.__benchmarkStep(2, false);
            });
            await page.evaluate(buildPilotSource());
            result = await page.evaluate(
                ({ frames, render }) => window.__benchmarkStep(frames, render),
                {
                    frames,
                    render: mode === 'rendered',
                }
            );
        }
        const row = {
            mode,
            level,
            repeat,
            ...result,
            framesPerSecond: (result.frames * 1000) / result.computeMs,
            simulationSpeed: mode.startsWith('realtime')
                ? null
                : (result.frames * 1000) / (60 * result.computeMs),
            endToEndSpeed: mode.startsWith('realtime')
                ? null
                : (result.frames * 1000) / (60 * (performance.now() - started)),
            totalMs: performance.now() - started,
            errors,
        };
        results.push(row);
        console.log(JSON.stringify(row));
    } catch (error) {
        const row = { mode, level, repeat, error: error.message, errors };
        results.push(row);
        console.log(JSON.stringify(row));
    } finally {
        await page.close();
    }
}

try {
    browser = await chromium.launch(defaultLaunchOptions(true));
    for (const level of levels) {
        for (const mode of modes) {
            for (let repeat = 0; repeat < repeats; repeat++) await run(mode, level, repeat);
        }
    }
    writeFileSync(
        process.env.BENCH_OUT || '/tmp/space-chicken-benchmark.json',
        JSON.stringify(results, null, 2) + '\n'
    );
    if (results.some((row) => row.error || row.errors.length)) process.exitCode = 1;
} finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
}
