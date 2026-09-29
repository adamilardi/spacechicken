import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const { createServer } = require('../server.cjs');
const output = process.env.PERF_OUT || '/tmp/space-chicken-performance';
const duration = Number(process.env.PERF_DURATION_MS || 4000);
await fs.mkdir(output, { recursive: true });
const server = createServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const localUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const cases = [
    ...[1, 2, 3, 4].map((level) => ({
        name: `desktop-l${level}`,
        level,
        width: 1280,
        height: 720,
    })),
    { name: 'phone', level: 3, width: 390, height: 844 },
    { name: 'landscape', level: 3, width: 844, height: 390 },
    { name: 'race', level: 3, width: 1280, height: 720, coop: 'keyboard' },
    { name: 'cpu4x', level: 3, width: 390, height: 844, cpu: 4 },
];
const reports = [];

function hotspots(profile) {
    const counts = new Map();
    const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
    for (let i = 0; i < (profile.samples || []).length; i++) {
        const frame = nodes.get(profile.samples[i]).callFrame;
        const key = `${frame.functionName || '(anonymous)'} ${frame.url.split('/').pop()}:${frame.lineNumber + 1}`;
        counts.set(key, (counts.get(key) || 0) + (profile.timeDeltas?.[i] || 0));
    }
    return [...counts]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([functionName, us]) => ({ functionName, ms: Math.round(us / 1000) }));
}

try {
    const system = await browser.newBrowserCDPSession();
    const gpu = await system.send('SystemInfo.getInfo');
    await fs.writeFile(`${output}/gpu.json`, JSON.stringify(gpu.gpu, null, 2));
    for (const scenario of cases.filter(
        (item) => !process.env.PERF_CASE || item.name === process.env.PERF_CASE
    )) {
        const context = await browser.newContext({
            viewport: { width: scenario.width, height: scenario.height },
        });
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        if (scenario.cpu) await cdp.send('Emulation.setCPUThrottlingRate', { rate: scenario.cpu });
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        const url = new URL(localUrl);
        url.search = new URLSearchParams({
            level: scenario.level,
            bot: 'performance',
            seed: 42,
            ...(scenario.coop ? { coop: scenario.coop } : {}),
        });
        const started = Date.now();
        await page.goto(url.href);
        await page.waitForFunction(() => window.__spaceChickenDebug?.ready());
        const readyMs = Date.now() - started;
        await page.evaluate((ablation) => {
            const scene = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0];
            // Keep the benchmark in active play rather than spending samples in death resets.
            scene.failFromHazard = () => {};
            scene.collectGem = () => {};
            if (ablation === 'timer') scene.uiManager.updateTimer = () => {};
            if (ablation === 'timer-unthrottled') {
                const update = scene.uiManager.updateTimer.bind(scene.uiManager);
                scene.uiManager.updateTimer = (elapsed) => {
                    scene.uiManager.lastTimerBucket = null;
                    update(elapsed);
                };
            }
            if (ablation === 'background')
                scene.backgroundRenderer.layerSprites.forEach((r) => r.image.setVisible(false));
            if (ablation === 'render')
                scene.game.scene.render = () => {
                    scene.game.scene.isProcessing = false;
                };
        }, process.env.PERF_ABLATION || '');
        if (process.env.PERF_RENDER_OFF)
            await page.evaluate(() => {
                window.SPACE_CHICKEN_GAME.scene.render = () => {
                    window.SPACE_CHICKEN_GAME.scene.isProcessing = false;
                };
            });
        await page.waitForTimeout(1200);
        await page.evaluate(() => {
            const game = window.SPACE_CHICKEN_GAME;
            const samples = { frames: [], update: [], render: [], longTasks: [], timerRedraws: 0 };
            const timer = game.scene.getScenes(true)[0].uiManager.timerText;
            const setText = timer.setText.bind(timer);
            timer.setText = (...args) => {
                samples.timerRedraws++;
                return setText(...args);
            };
            let previous = performance.now();
            let updateAt;
            let renderAt;
            game.events.on('prestep', () => {
                const now = performance.now();
                samples.frames.push(now - previous);
                previous = now;
                updateAt = now;
                const scene = game.scene.getScenes(true)[0];
                const tick = Math.floor(now / 1200);
                window.__spaceChickenBotInput = {
                    right: tick % 2 === 0,
                    left: tick % 2 !== 0,
                    jump: now % 600 < 150,
                };
                if (scene.player.y > scene.worldHeight || scene.player.x < 0)
                    scene.player.body.reset(
                        scene.levelConfig.playerStart.x,
                        scene.levelConfig.playerStart.y
                    );
            });
            game.events.on('poststep', () => samples.update.push(performance.now() - updateAt));
            game.events.on('prerender', () => {
                renderAt = performance.now();
            });
            game.events.on('postrender', () => samples.render.push(performance.now() - renderAt));
            new PerformanceObserver((list) =>
                samples.longTasks.push(...list.getEntries().map((item) => item.duration))
            ).observe({ type: 'longtask', buffered: false });
            window.__perfSamples = samples;
        });
        await cdp.send('Profiler.enable');
        await cdp.send('Profiler.start');
        await page.waitForTimeout(duration);
        const { profile } = await cdp.send('Profiler.stop');
        const metrics = await page.evaluate(() => {
            const game = window.SPACE_CHICKEN_GAME;
            const scene = game.scene.getScenes(true)[0];
            const summary = (items) => {
                const sorted = items.slice(1).sort((a, b) => a - b);
                return {
                    count: sorted.length,
                    mean: sorted.reduce((a, b) => a + b, 0) / sorted.length,
                    p50: sorted[Math.floor(sorted.length * 0.5)],
                    p95: sorted[Math.floor(sorted.length * 0.95)],
                    max: sorted.at(-1),
                };
            };
            const textures = game.textures.getTextureKeys().map((key) => {
                const source = game.textures.get(key).source[0];
                return { key, bytes: source.width * source.height * 4 };
            });
            const gl = game.renderer.gl;
            const extension = gl?.getExtension('WEBGL_debug_renderer_info');
            return {
                frames: summary(window.__perfSamples.frames),
                update: summary(window.__perfSamples.update),
                render: summary(window.__perfSamples.render),
                longTasks: window.__perfSamples.longTasks,
                timerRedraws: window.__perfSamples.timerRedraws,
                renderer: game.renderer.type,
                gpu: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : 'Canvas',
                objects: scene.children.list.length,
                bodies: scene.physics.world.bodies.size,
                particles: scene.effectsManager.live.size,
                textureMiB: textures.reduce((sum, item) => sum + item.bytes, 0) / 1048576,
                textures: textures.length,
                resources: performance.getEntriesByType('resource').map((r) => ({
                    name: r.name.split('/').pop(),
                    bytes: r.transferSize,
                    ms: r.duration,
                })),
            };
        });
        const report = { scenario, readyMs, ...metrics, hotspots: hotspots(profile), errors };
        reports.push(report);
        await fs.writeFile(`${output}/${scenario.name}.cpuprofile`, JSON.stringify(profile));
        console.log(
            JSON.stringify({
                name: scenario.name,
                readyMs,
                frames: metrics.frames,
                update: metrics.update,
                render: metrics.render,
                gpu: metrics.gpu,
                textureMiB: metrics.textureMiB,
                timerRedraws: metrics.timerRedraws,
                errors,
            })
        );
        await context.close();
    }
    await fs.writeFile(`${output}/report.json`, JSON.stringify(reports, null, 2));
} finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
}
