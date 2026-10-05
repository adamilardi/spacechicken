/**
 * Cross-device verification: mobile phones, tablets, and desktop PCs.
 *
 * For every profile in PerformanceBudgets.js (or a DEVICE_FILTER subset):
 * layout fits, touch/keyboard input drives the chicken, pause works,
 * rotation re-lays-out, and main-thread + resource budgets hold so gameplay
 * stays smooth.
 *
 * Usage:
 *   node scripts/verify-device-matrix.mjs
 *   DEVICE_FILTER=iphone-14 node scripts/verify-device-matrix.mjs
 *   ALL_DEVICES=1 node scripts/verify-device-matrix.mjs   # full 12-device matrix
 */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import { chromium } from 'playwright';

import { DEVICE_PROFILES } from '../PerformanceBudgets.js';
import { summarizeFrames, summarizeSamples } from '../PerformanceMetrics.js';
import {
    checkEmulatedFrameHealth,
    checkEmulatedMainThread,
    checkSceneResources,
    checkTextureBudget,
} from '../PerformanceBudgets.js';

const require = createRequire(import.meta.url);
const { createServer } = require('../server.cjs');

const DEFAULT_IDS = [
    'iphone-se',
    'iphone-14',
    'iphone-landscape',
    'ipad-portrait',
    'laptop-1366',
    'desktop-720p',
    'desktop-1080p',
    'ultrawide',
];
const SAMPLE_MS = Number(process.env.DEVICE_SAMPLE_MS || 3000);
const output = process.env.DEVICE_MATRIX_OUT || '/tmp/space-chicken-device-matrix';
await mkdir(output, { recursive: true });

const profiles = DEVICE_PROFILES.filter((profile) => {
    if (process.env.DEVICE_FILTER) return profile.id === process.env.DEVICE_FILTER;
    if (process.env.ALL_DEVICES === '1') return true;
    return DEFAULT_IDS.includes(profile.id);
});
assert.ok(profiles.length > 0, 'no device profiles selected');

const server = createServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const localUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const results = [];

async function layoutState(page) {
    return page.evaluate(() => {
        const game = window.SPACE_CHICKEN_GAME;
        const scene = game.scene.getScenes(false)[0];
        const names = ['leftButton', 'rightButton', 'jumpButton', 'timerText', 'levelText'];
        const bounds = Object.fromEntries(
            names
                .filter((name) => scene.uiManager[name]?.getBounds)
                .map((name) => {
                    const rect = scene.uiManager[name].getBounds();
                    return [name, { x: rect.x, y: rect.y, width: rect.width, height: rect.height }];
                })
        );
        return {
            width: game.scale.width,
            height: game.scale.height,
            touch: scene.uiManager.touchControlsEnabled,
            bounds,
            overflow: document.documentElement.scrollWidth > window.innerWidth,
        };
    });
}

function checkLayout(state, profile) {
    assert.equal(state.width, profile.width, `${profile.id} game width`);
    assert.equal(state.height, profile.height, `${profile.id} game height`);
    assert.equal(state.touch, profile.hasTouch, `${profile.id} touch controls`);
    assert.equal(state.overflow, false, `${profile.id} horizontal overflow`);
    for (const [name, rect] of Object.entries(state.bounds)) {
        assert.ok(rect.x >= -1 && rect.y >= -1, `${profile.id} ${name} outside viewport`);
        assert.ok(rect.x + rect.width <= profile.width + 1, `${profile.id} ${name} exceeds width`);
        assert.ok(
            rect.y + rect.height <= profile.height + 1,
            `${profile.id} ${name} exceeds height`
        );
        if (name.endsWith('Button')) {
            assert.ok(
                rect.width >= 44 && rect.height >= 44,
                `${profile.id} ${name} below 44px touch target`
            );
        }
    }
}

async function startGame(page, context, profile) {
    // Tap a point the game canvas actually receives: centered DOM buttons
    // (race setup, pause) swallow touches on some viewports.
    if (profile.hasTouch) {
        const point = await page.evaluate(() => {
            const game = window.SPACE_CHICKEN_GAME;
            const scene = game.scene.getScenes(true)[0];
            const ui = scene.uiManager;
            const width = game.scale.width;
            const height = game.scale.height;
            // Phaser UI lives inside one canvas element, so DOM hit-testing
            // alone is not enough: also steer clear of tappable game objects
            // (tapping the name/leaders/buttons intentionally does nothing).
            const avoid = [
                'playerNameText',
                'leaderboardButton',
                'musicToggleButton',
                'jumpButton',
                'leftButton',
                'rightButton',
                'phaserButton',
            ]
                .map((name) => {
                    try {
                        return ui[name]?.getBounds?.();
                    } catch {
                        return null;
                    }
                })
                .filter(Boolean)
                .map((rect) => ({
                    x: rect.x - 8,
                    y: rect.y - 8,
                    width: rect.width + 16,
                    height: rect.height + 16,
                }));
            const titleTop = ui.titleText?.getBounds?.()?.y ?? height * 0.3;
            const candidates = [
                { x: width / 2, y: Math.max(40, titleTop - 70) },
                { x: width / 2, y: height * 0.22 },
                { x: width * 0.25, y: height * 0.3 },
                { x: width / 2, y: height * 0.7 },
            ];
            const blocked = (candidate) =>
                avoid.some(
                    (rect) =>
                        candidate.x >= rect.x &&
                        candidate.x <= rect.x + rect.width &&
                        candidate.y >= rect.y &&
                        candidate.y <= rect.y + rect.height
                );
            for (const candidate of candidates) {
                if (
                    !blocked(candidate) &&
                    document.elementFromPoint(candidate.x, candidate.y)?.tagName === 'CANVAS'
                )
                    return candidate;
            }
            return candidates[0];
        });
        await page.touchscreen.tap(point.x, point.y);
    } else {
        await page.keyboard.down('Space');
        await page.waitForTimeout(300);
        await page.keyboard.up('Space');
    }
    await page.waitForFunction(
        () => !window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].awaitingStart,
        null,
        { timeout: 15000 }
    );
}

async function checkTouchInput(page, context, profile) {
    const controls = (await layoutState(page)).bounds;
    assert.ok(controls.rightButton, `${profile.id} missing move button`);
    assert.ok(controls.jumpButton, `${profile.id} missing jump button`);
    const point = (rect, id) => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, id });
    const move = point(controls.rightButton, 1);
    const jump = point(controls.jumpButton, 2);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [move] });
    await page.waitForTimeout(80);
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [move, jump],
    });
    await page.waitForTimeout(80);
    const movingJump = await page.evaluate(() => {
        const scene = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0];
        return {
            right: scene.rightPressed,
            jumping: scene.jumpCount > 0,
            vx: scene.player.body.velocity.x,
        };
    });
    assert.equal(movingJump.right, true, `${profile.id} second finger cancelled movement`);
    assert.equal(movingJump.jumping, true, `${profile.id} second finger did not jump`);
    assert.ok(movingJump.vx > 0, `${profile.id} player did not move while jumping`);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [jump] });
    await page.waitForTimeout(60);
    assert.equal(
        await page.evaluate(() => window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].rightPressed),
        true,
        `${profile.id} releasing jump dropped held movement`
    );
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(60);
}

async function checkKeyboardInput(page, profile) {
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(150);
    // Hold Space across slow emulated frames so the press is never missed.
    await page.keyboard.down('Space');
    await page.waitForTimeout(300);
    await page.keyboard.up('Space');
    await page.waitForTimeout(150);
    const moving = await page.evaluate(() => {
        const scene = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0];
        return {
            keyHeld: scene.cursors.right.isDown,
            jumping: scene.jumpCount > 0,
            vx: scene.player.body.velocity.x,
        };
    });
    assert.equal(moving.keyHeld, true, `${profile.id} ArrowRight did not move`);
    assert.ok(moving.vx > 0, `${profile.id} player velocity stayed zero`);
    assert.equal(moving.jumping, true, `${profile.id} Space did not jump`);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(150);
    const released = await page.evaluate(() => {
        const scene = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0];
        return { keyHeld: scene.cursors.right.isDown, vx: scene.player.body.velocity.x };
    });
    assert.equal(released.keyHeld, false, `${profile.id} released key stayed down`);
    assert.equal(released.vx, 0, `${profile.id} player kept moving after key release`);
}

async function samplePerformance(page, profile) {
    // Let texture uploads and GC from load/input settle before sampling.
    await page.waitForTimeout(1200);
    // Bigger canvases rasterize slower under SwiftShader; scale the window so
    // every device yields enough samples for stable mean/max estimates.
    const pixels = profile.width * profile.height;
    const windowMs = Math.min(12000, Math.ceil((SAMPLE_MS * pixels) / (1280 * 720)));
    await page.evaluate(() => {
        const game = window.SPACE_CHICKEN_GAME;
        const samples = { frames: [], update: [], render: [], longTasks: [] };
        let previous = performance.now();
        let updateAt;
        let renderAt;
        game.events.on('prestep', () => {
            const now = performance.now();
            samples.frames.push(now - previous);
            previous = now;
            updateAt = now;
        });
        game.events.on('poststep', () => samples.update.push(performance.now() - updateAt));
        game.events.on('prerender', () => {
            renderAt = performance.now();
        });
        game.events.on('postrender', () => samples.render.push(performance.now() - renderAt));
        new PerformanceObserver((list) =>
            samples.longTasks.push(...list.getEntries().map((item) => item.duration))
        ).observe({ type: 'longtask', buffered: false });
        window.__devicePerfSamples = samples;
    });
    await page.waitForTimeout(windowMs);
    return page.evaluate(() => {
        const game = window.SPACE_CHICKEN_GAME;
        const scene = game.scene.getScenes(true)[0];
        const textures = game.textures.getTextureKeys().map((key) => {
            const source = game.textures.get(key).source[0];
            return (source.width * source.height * 4) / 1048576;
        });
        return {
            samples: window.__devicePerfSamples,
            objects: scene.children.list.length,
            bodies: scene.physics.world.bodies.size,
            particles: scene.effectsManager.live.size,
            textures: game.textures.getTextureKeys().length,
            textureMiB: textures.reduce((sum, mib) => sum + mib, 0),
        };
    });
}

try {
    for (const profile of profiles) {
        const context = await browser.newContext({
            viewport: { width: profile.width, height: profile.height },
            deviceScaleFactor: profile.deviceScaleFactor,
            hasTouch: profile.hasTouch,
            isMobile: profile.isMobile,
        });
        // Emulate the notch/status bar so the safe-area layout path is exercised.
        await context.addInitScript((insets) => {
            const apply = () => {
                const root = document.documentElement;
                if (!root) return;
                root.style.setProperty('--safe-area-top', `${insets.top}px`);
                root.style.setProperty('--safe-area-right', `${insets.right}px`);
                root.style.setProperty('--safe-area-bottom', `${insets.bottom}px`);
                root.style.setProperty('--safe-area-left', `${insets.left}px`);
            };
            if (document.readyState === 'loading')
                document.addEventListener('DOMContentLoaded', apply, { once: true });
            apply();
        }, profile.safeArea);
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(localUrl);
        await page.waitForFunction(
            () => window.SPACE_CHICKEN_GAME?.scene.getScenes(true)[0]?.awaitingStart,
            null,
            { timeout: 30000 }
        );
        checkLayout(await layoutState(page), profile);
        await page.screenshot({ path: `${output}/${profile.id}-title.png` });

        await startGame(page, context, profile);
        await page.waitForTimeout(400);
        if (profile.hasTouch) await checkTouchInput(page, context, profile);
        else await checkKeyboardInput(page, profile);
        await page.screenshot({ path: `${output}/${profile.id}-play.png` });

        const perf = await samplePerformance(page, profile);
        const frames = summarizeFrames(perf.samples.frames.slice(1));
        const update = summarizeSamples(perf.samples.update.slice(1));
        const render = summarizeSamples(perf.samples.render.slice(1));
        const frameHealth = checkEmulatedFrameHealth(frames);
        // p95 over a dozen slow emulated frames ≈ max, so the emulated gate
        // uses mean/max; the strict p95 budgets still apply to well-sampled
        // data via checkMainThreadHealth (unit-tested, used by profiling).
        const threadHealth = checkEmulatedMainThread({ update, render });
        const textureHealth = checkTextureBudget(Math.round(perf.textureMiB * 100) / 100);
        const resourceHealth = checkSceneResources({
            objects: perf.objects,
            dynamicBodies: perf.bodies,
            particles: perf.particles,
            textures: perf.textures,
        });
        for (const [name, health] of [
            ['frame spacing', frameHealth],
            ['main thread', threadHealth],
            ['textures', textureHealth],
            ['scene resources', resourceHealth],
        ]) {
            assert.deepEqual(health.reasons, [], `${profile.id} ${name}: ${health.reasons}`);
        }

        // Rotation / desktop resize must re-lay-out without clipping.
        const rotated = { width: profile.height, height: profile.width };
        await page.setViewportSize(rotated);
        await page.waitForTimeout(250);
        checkLayout(await layoutState(page), { ...profile, ...rotated });

        assert.deepEqual(errors, [], `${profile.id} page errors: ${errors}`);
        results.push({
            device: profile.id,
            frames,
            updateP95Ms: update.p95Ms,
            renderP95Ms: render.p95Ms,
            longTasks: perf.samples.longTasks.length,
            textureMiB: Math.round(perf.textureMiB * 100) / 100,
            objects: perf.objects,
            bodies: perf.bodies,
        });
        console.log(
            `PASS ${profile.id}: layout, ${profile.hasTouch ? 'multitouch' : 'keyboard'}, ` +
                `frame p95 ${frames.p95Ms?.toFixed(1)}ms (env), update ${update.meanMs?.toFixed(1)}/` +
                `${update.maxMs?.toFixed(1)}ms mean/max, render ${render.meanMs?.toFixed(1)}/` +
                `${render.maxMs?.toFixed(1)}ms mean/max, textures ${(Math.round(perf.textureMiB * 100) / 100).toFixed(1)}MiB, rotation`
        );
        await context.close();
    }
    await writeFile(`${output}/report.json`, JSON.stringify(results, null, 2));
    console.log(`Report: ${output}/report.json`);
} finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
}
