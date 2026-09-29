import { createGameConfig } from './GameConfig.js';
import { SpaceChicken } from './SpaceChicken.js';
import { summarizeSamples, summarizeFrames } from './PerformanceMetrics.js';

const BUILD = 'phone-benchmark-v1';
const SEED = 42;
const WARMUP_MS = 3000;
const scenarios = [
    { id: 'solo-level-3', label: 'Solo · Level 3', level: 3, coopMode: null },
    { id: 'solo-level-4', label: 'Solo · Level 4', level: 4, coopMode: null },
    { id: 'race-level-3', label: 'Split-screen race · Level 3', level: 3, coopMode: 'keyboard' },
];
const element = (id) => document.getElementById(id);
let game;
let controller;
let active;
let report;
let wakeLock;
let bootReadyMs;
let bootErrors = [];
const errors = [];
const interruptions = [];
let progressTimer;

function viewport() {
    const visual = window.visualViewport;
    return {
        width: Math.max(1, Math.round(visual?.width || innerWidth)),
        height: Math.max(1, Math.round(visual?.height || innerHeight)),
    };
}

function syncViewport() {
    const size = viewport();
    const changed = game && (size.width !== game.scale.width || size.height !== game.scale.height);
    if (
        active?.measuring &&
        (size.width !== active.viewport.width || size.height !== active.viewport.height)
    )
        interrupt(
            'viewport-changed',
            'Screen size changed. Run again without rotating or opening the keyboard.'
        );
    const parent = element('phaser-game');
    parent.style.width = `${size.width}px`;
    parent.style.height = `${size.height}px`;
    parent.style.left = `${window.visualViewport?.offsetLeft || 0}px`;
    parent.style.top = `${window.visualViewport?.offsetTop || 0}px`;
    if (changed) game.scale.resize(size.width, size.height);
}

function interrupt(reason, message) {
    if (!controller || controller.signal.aborted) return;
    interruptions.push({ reason, atMs: Math.round(performance.now()) });
    controller.abort(new Error(message));
}

function wait(ms, signal) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(signal.reason);
            return;
        }
        const aborted = () => {
            clearTimeout(timer);
            reject(signal.reason);
        };
        const timer = setTimeout(() => {
            signal?.removeEventListener('abort', aborted);
            resolve();
        }, ms);
        signal?.addEventListener('abort', aborted, { once: true });
    });
}

async function untilReady(signal) {
    const start = performance.now();
    while (!game.scene.getScenes(true)[0]?.hasStartedPlay) {
        if (performance.now() - start > 20000)
            throw new Error('The game took too long to load. Refresh and try again.');
        await wait(50, signal);
    }
    return game.scene.getScenes(true)[0];
}

function resourceSnapshot(scene) {
    const keys = game.textures.getTextureKeys();
    return {
        objects: scene.children.list.length,
        dynamicBodies: scene.physics.world.bodies.size,
        cameras: scene.cameras.cameras.length,
        particles: scene.effectsManager.live.size,
        pooledParticles: scene.effectsManager.pool.length,
        textures: keys.length,
        estimatedTextureMiB:
            Math.round(
                (keys.reduce((sum, key) => {
                    const source = game.textures.get(key).source[0];
                    return sum + source.width * source.height * 4;
                }, 0) /
                    1048576) *
                    100
            ) / 100,
        heapBytes: performance.memory?.usedJSHeapSize ?? null,
        audioContextState: scene.sound.context?.state || 'unavailable',
        musicUnlocked: scene.audioManager.audioUnlocked,
    };
}

function rendererInfo() {
    const gl = game.renderer.gl;
    const extension = gl?.getExtension('WEBGL_debug_renderer_info');
    return {
        type: gl ? 'WebGL' : 'Canvas',
        vendor: extension ? gl.getParameter(extension.UNMASKED_VENDOR_WEBGL) : null,
        renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : null,
        canvasWidth: game.canvas.width,
        canvasHeight: game.canvas.height,
    };
}

function prepareScene(scene) {
    // Keep the workload in active play; hazards/particles still run and draw.
    scene.failFromHazard = () => {};
    scene.collectGem = () => {};
    scene.scene.setVisible(true);
    scene.input.enabled = false;
    scene.inputController.pollGamepad = () => {};
    scene.inputController.getGamepad = () => null;
    scene.input.keyboard.resetKeys();
    if (scene.sound.context?.state === 'running')
        scene.audioManager.installAudioUnlockHandler(false);
}

function driveScene(scene, elapsed) {
    const right = Math.floor(elapsed / 1800) % 2 === 0;
    const jumpBeat = Math.floor(elapsed / 650);
    const jump = jumpBeat !== active.jumpBeat;
    active.jumpBeat = jumpBeat;
    window.__spaceChickenBotInput = { right, left: !right, jump };
    if (scene.player2) {
        scene.player2Keys.left.isDown = right;
        scene.player2Keys.right.isDown = !right;
        if (jump) scene.attemptPlayer2Jump();
    }
    for (const player of [scene.player, scene.player2]) {
        if (!player) continue;
        if (player.y > scene.worldHeight + 100 || player.x < 0 || player.x > scene.worldWidth) {
            const spawn = scene.levelConfig.playerStart;
            player.body.reset(spawn.x + (player === scene.player2 ? 42 : 0), spawn.y);
            if (player === scene.player2) scene.player2JumpCount = 0;
            else scene.jumpCount = 0;
            active.respawns++;
        }
    }
}

function installSampling() {
    game.events.on('prestep', () => {
        if (!active) return;
        const now = performance.now();
        const scene = game.scene.getScenes(true)[0];
        if (!scene) return;
        if (active.measuring && active.previous != null) active.frames.push(now - active.previous);
        active.previous = now;
        active.updateAt = now;
        driveScene(scene, now - active.routeStart);
    });
    game.events.on('poststep', () => {
        if (active?.measuring && active.updateAt != null)
            active.update.push(performance.now() - active.updateAt);
    });
    game.events.on('prerender', () => {
        if (active) active.renderAt = performance.now();
    });
    game.events.on('postrender', () => {
        if (active?.measuring && active.renderAt != null)
            active.render.push(performance.now() - active.renderAt);
    });
}

function createObserver(type, callback) {
    if (!window.PerformanceObserver?.supportedEntryTypes?.includes(type)) return null;
    try {
        const observer = new PerformanceObserver((list) => callback(list.getEntries()));
        observer.observe({ type, buffered: false });
        return observer;
    } catch {
        return null;
    }
}

async function restartScene(scenario, signal) {
    const scene = game.scene.getScenes(false)[0];
    const started = performance.now();
    await new Promise((resolve, reject) => {
        const finish = () => {
            cleanup();
            prepareScene(scene);
            resolve();
        };
        const aborted = () => {
            cleanup();
            reject(signal.reason);
        };
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('A level could not start. Refresh and try again.'));
        }, 20000);
        const cleanup = () => {
            clearTimeout(timeout);
            scene.events.off('create', finish);
            signal.removeEventListener('abort', aborted);
        };
        scene.events.once('create', finish);
        signal.addEventListener('abort', aborted, { once: true });
        scene.scene.restart({
            level: scenario.level,
            coopMode: scenario.coopMode,
            testSeed: SEED,
            deathCount: 0,
        });
    });
    return { scene, setupMs: Math.round(performance.now() - started) };
}

function finishSample(scenario, setup, outcome) {
    const duration = performance.now() - active.sampleStart;
    const result = {
        ...scenario,
        outcome,
        setupMs: setup.setupMs,
        durationMs: Math.round(duration),
        viewport: active.viewport,
        frames: summarizeFrames(active.frames),
        update: summarizeSamples(active.update),
        renderSubmission: summarizeSamples(active.render),
        longTasks: active.longTasksSupported ? summarizeSamples(active.longTasks) : null,
        respawns: active.respawns,
        resourcesBefore: active.resourcesBefore,
        resourcesAfter: resourceSnapshot(setup.scene),
        // Raw frame intervals allow analysis without collecting an oversized profiler trace.
        frameIntervalsMs: active.frames.map((value) => Math.round(value * 100) / 100),
    };
    report.scenarios.push(result);
}

async function sampleScenario(scenario, duration, signal) {
    const setup = await restartScene(scenario, signal);
    active = {
        frames: [],
        update: [],
        render: [],
        longTasks: [],
        routeStart: performance.now(),
        measuring: false,
        jumpBeat: -1,
        respawns: 0,
    };
    element('progress').textContent = `${scenario.label} · warming up`;
    await wait(WARMUP_MS, signal);
    active.viewport = viewport();
    active.resourcesBefore = resourceSnapshot(setup.scene);
    active.sampleStart = performance.now();
    active.previous = null;
    active.measuring = true;
    const observer = createObserver('longtask', (entries) => {
        if (active)
            active.longTasks.push(
                ...entries
                    .filter((entry) => entry.startTime >= active.sampleStart)
                    .map((entry) => entry.duration)
            );
    });
    active.longTasksSupported = Boolean(observer);
    progressTimer = setInterval(() => {
        const remaining = Math.max(
            0,
            Math.ceil((duration - (performance.now() - active.sampleStart)) / 1000)
        );
        element('progress').textContent = `${scenario.label} · ${remaining}s remaining`;
    }, 1000);
    let outcome = 'complete';
    try {
        await wait(duration, signal);
    } catch (error) {
        outcome = 'interrupted';
        throw error;
    } finally {
        if (observer) {
            active.longTasks.push(
                ...observer
                    .takeRecords()
                    .filter((entry) => entry.startTime >= active.sampleStart)
                    .map((entry) => entry.duration)
            );
            observer.disconnect();
        }
        clearInterval(progressTimer);
        active.measuring = false;
        finishSample(scenario, setup, outcome);
        active = null;
    }
}

function makeReport(duration) {
    return {
        schemaVersion: 1,
        benchmark: BUILD,
        createdAt: new Date().toISOString(),
        outcome: 'running',
        device: {
            label: element('device-label').value.trim(),
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            hardwareConcurrency: navigator.hardwareConcurrency ?? null,
            deviceMemoryGiB: navigator.deviceMemory ?? null,
            devicePixelRatio: devicePixelRatio,
            viewport: viewport(),
            screen: { width: screen.width, height: screen.height },
            renderer: rendererInfo(),
        },
        methodology: {
            seed: SEED,
            scenarioDurationMs: duration,
            warmupMs: WARMUP_MS,
            automatedMovement: true,
            hazardDeathsDisabled: true,
            crownCompletionDisabled: true,
            timerPrecisionUnchanged: true,
            renderTiming: 'CPU submission only; not GPU completion',
            heapTiming: 'Optional browser estimate; no forced garbage collection',
            scoresSubmitted: false,
        },
        loading: {
            gameReadyFromNavigationMs: bootReadyMs,
            errors: bootErrors,
            resources: performance
                .getEntriesByType('resource')
                .filter((entry) => new URL(entry.name).origin === location.origin)
                .map((entry) => ({
                    name: new URL(entry.name).pathname,
                    durationMs: Math.round(entry.duration),
                    transferBytes: entry.transferSize,
                    decodedBytes: entry.decodedBodySize,
                })),
        },
        scenarios: [],
        interruptions: [],
        errors: [],
    };
}

function showReport(message) {
    element('panel').hidden = false;
    element('toolbar').hidden = true;
    element('setup').hidden = true;
    element('results').hidden = false;
    element('status').textContent = message;
    element('report-text').value = JSON.stringify(report, null, 2);
    element('summary').replaceChildren();
    for (const result of report.scenarios) {
        const row = document.createElement('section');
        row.className = 'result';
        const heading = document.createElement('h3');
        heading.textContent = `${result.label}${result.outcome === 'complete' ? '' : ' · incomplete'}`;
        const text = document.createElement('p');
        const f = result.frames;
        text.textContent = f.count
            ? `${f.averageFps} FPS average · p95 frame ${f.p95Ms} ms · ${f.over50Ms} frames over 50 ms`
            : 'No complete frame intervals captured.';
        row.append(heading, text);
        element('summary').append(row);
    }
    element('share').hidden = !navigator.canShare?.({ files: [reportFile()] });
}

function reportFile() {
    return new File(
        [JSON.stringify(report, null, 2)],
        `space-chicken-performance-${report.createdAt.replace(/[:.]/g, '-')}.json`,
        { type: 'application/json' }
    );
}

async function runTest() {
    if (controller) return;
    document.activeElement?.blur();
    errors.length = 0;
    interruptions.length = 0;
    const selected = Number(element('duration').value);
    const duration = [15000, 30000, 120000].includes(selected) ? selected : 30000;
    controller = new AbortController();
    const signal = controller.signal;
    report = makeReport(duration);
    element('progress').textContent = 'Starting test…';
    element('panel').hidden = true;
    element('toolbar').hidden = false;
    document.body.style.overflow = 'hidden';
    game.scene.getScenes(false)[0].scene.resume();
    // Called during the Start gesture so browsers can unlock sound.
    const audioReady = game.sound.context?.resume()?.catch(() => {});
    game.scene.getScenes(false)[0].audioManager.audioUnlockHandler?.();
    let message;
    try {
        await audioReady;
        try {
            wakeLock = await navigator.wakeLock?.request('screen');
        } catch {
            /* Optional on unsupported browsers. */
        }
        for (const scenario of scenarios) await sampleScenario(scenario, duration, signal);
        report.outcome = 'complete';
        message = 'Test complete. Download or share the report and attach it to our conversation.';
    } catch (error) {
        report.outcome = signal.aborted ? 'interrupted' : 'failed';
        message =
            error.message ||
            'The test could not finish. You can still download the partial report.';
        if (!signal.aborted) errors.push({ message, atMs: Math.round(performance.now()) });
    } finally {
        active = null;
        window.__spaceChickenBotInput = null;
        game.scene.getScenes(false)[0]?.scene.pause();
        game.scene.getScenes(false)[0]?.scene.setVisible(false);
        game.sound.context?.suspend()?.catch(() => {});
        await wakeLock?.release()?.catch(() => {});
        wakeLock = null;
        report.interruptions = [...interruptions];
        report.errors = [...errors];
        report.finishedAt = new Date().toISOString();
        controller = null;
        document.body.style.overflow = '';
        showReport(message);
    }
}

function installControls() {
    element('start').addEventListener('click', runTest);
    element('stop').addEventListener('click', () =>
        interrupt('cancelled', 'Test stopped. You can download the partial report or run again.')
    );
    element('again').addEventListener('click', () => {
        element('results').hidden = true;
        element('setup').hidden = false;
        element('status').textContent = 'Ready. Keep the phone in one orientation during each run.';
    });
    element('download').addEventListener('click', () => {
        const file = reportFile();
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    });
    element('share').addEventListener('click', async () => {
        try {
            await navigator.share({
                files: [reportFile()],
                title: 'Space Chicken performance report',
            });
        } catch (error) {
            if (error.name !== 'AbortError')
                element('status').textContent =
                    'Sharing isn’t available here. Use Download report or copy the report text.';
        }
    });
    element('copy').addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(element('report-text').value);
            element('status').textContent = 'Report copied.';
        } catch {
            element('report-text').select();
            element('status').textContent = 'Select and copy the report text below.';
        }
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden)
            interrupt(
                'backgrounded',
                'The page was hidden or the phone locked. Run again with the tab visible.'
            );
    });
    window.addEventListener('resize', syncViewport);
    window.visualViewport?.addEventListener('resize', syncViewport);
}

window.addEventListener('error', (event) => {
    if (errors.length < 40)
        errors.push({
            message: String(event.message).slice(0, 1000),
            atMs: Math.round(performance.now()),
        });
});
window.addEventListener('unhandledrejection', (event) => {
    if (errors.length < 40)
        errors.push({
            message: String(event.reason?.message || event.reason).slice(0, 1000),
            atMs: Math.round(performance.now()),
        });
});

try {
    const query = new URLSearchParams(location.search);
    query.set('bot', 'performance');
    query.set('seed', String(SEED));
    query.set('level', '3');
    query.delete('coop');
    query.delete('timeScale');
    history.replaceState(null, '', `${location.pathname}?${query}`);
    game = new Phaser.Game(createGameConfig(viewport(), SpaceChicken));
    window.SPACE_CHICKEN_GAME = game;
    syncViewport();
    const scene = await untilReady();
    bootReadyMs = Math.round(performance.now());
    bootErrors = [...errors];
    prepareScene(scene);
    scene.scene.pause();
    scene.scene.setVisible(false);
    installSampling();
    installControls();
    element('start').disabled = false;
    element('start').textContent = 'Start test';
    element('status').textContent = 'Ready. Keep this page visible while the game plays itself.';
} catch (error) {
    element('status').textContent =
        error.message || 'The game could not load. Refresh to try again.';
}
