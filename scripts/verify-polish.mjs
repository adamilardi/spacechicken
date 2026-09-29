import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const { createServer } = require('../server.cjs');
const server = createServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const out = '/tmp/space-chicken-polish-performance';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
try {
    const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        bypassCSP: true,
    });
    await context.addInitScript(() => {
        window.__pads = [
            {
                connected: true,
                axes: [0, 0],
                buttons: Array.from({ length: 17 }, () => ({ pressed: false })),
            },
        ];
        navigator.getGamepads = () => window.__pads;
    });
    const page = await context.newPage();
    const errors = [];
    page.on('dialog', (dialog) => dialog.dismiss());
    page.on('pageerror', (e) => errors.push(e.message));
    const scene = () =>
        page.evaluate(() => {
            const s = window.SPACE_CHICKEN_GAME.scene.getScenes(false)[0];
            return {
                level: s.level,
                awaiting: s.awaitingStart,
                coop: s.coopMode,
                board: s.uiManager.leaderboardVisible,
                finish: s.gameOver,
                particles: s.effectsManager.live.size,
            };
        });
    const press = async (index) => {
        await page.evaluate((i) => {
            window.__pads[0].buttons[i].pressed = true;
        }, index);
        await page.waitForTimeout(300);
        await page.evaluate((i) => {
            window.__pads[0].buttons[i].pressed = false;
        }, index);
        await page.waitForTimeout(300);
    };
    await page.goto(`${origin}/?debug=1&seed=42`);
    await page.waitForFunction(() => window.__spaceChickenDebug?.ready());
    await page.locator('#race-setup-button').click();
    assert.equal(await page.locator('#race-setup-dialog').evaluate((d) => d.open), true);
    assert.equal((await scene()).awaiting, true);
    await page.screenshot({ path: `${out}/race-phone.png` });
    await press(13);
    await press(0);
    await page.waitForFunction(
        () => window.SPACE_CHICKEN_GAME.scene.getScenes(false)[0].coopMode === 'keyboard'
    );
    assert.equal((await scene()).awaiting, true);
    await page.locator('#race-setup-button').click();
    await page.locator('[data-mode="controllers"]').click();
    assert.equal(await page.locator('#race-setup-dialog').evaluate((d) => d.open), true);
    await page.locator('[data-mode="solo"]').click();
    await page.waitForFunction(
        () => window.SPACE_CHICKEN_GAME.scene.getScenes(false)[0].coopMode === null
    );
    await press(0);
    assert.equal((await scene()).awaiting, false);
    await page.evaluate(() => {
        const s = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0];
        s.failFromHazard = () => {};
    });
    await press(9);
    assert.equal(await page.locator('#pause-dialog').evaluate((d) => d.open), true);
    await press(0);
    assert.equal(await page.locator('#pause-dialog').evaluate((d) => d.open), false);
    assert.equal(
        await page.evaluate(() => window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].jumpCount),
        0,
        'resume press is consumed'
    );
    await page.evaluate(() => {
        const s = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0];
        s.scene.restart({ level: 3, deathCount: 0 });
    });
    await page.waitForFunction(
        () => window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0]?.level === 3
    );
    await page.evaluate(() =>
        window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].completeRun(12345)
    );
    await page.waitForFunction(
        () => window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].restartDelayDone
    );
    await page.waitForFunction(
        () => window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].effectsManager.live.size === 0
    );
    assert.equal((await scene()).particles, 0, 'finish particles expire');
    await press(3);
    assert.equal((await scene()).board, true);
    await press(15);
    await press(1);
    assert.equal((await scene()).board, false);
    await press(0);
    await page.waitForFunction(() => !window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].gameOver);
    assert.equal((await scene()).level, 3, 'A defaults to retry');
    await page.evaluate(() =>
        window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].completeRun(23456)
    );
    await page.waitForFunction(
        () => window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].restartDelayDone
    );
    await press(15);
    await press(0);
    await page.waitForFunction(
        () => window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0]?.awaitingStart
    );
    assert.equal((await scene()).level, 1, 'selected new game returns to title');
    await page.setViewportSize({ width: 844, height: 390 });
    await page.locator('#race-setup-button').click();
    await page.screenshot({ path: `${out}/race-landscape.png` });
    await press(1);
    await press(0);
    await page.evaluate(() => window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].collectGem());
    await page.waitForTimeout(2200);
    assert.equal((await scene()).level, 1, 'result remains readable before transition');
    assert.equal(
        await page.evaluate(
            () =>
                window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].uiManager.bannerTitle.alpha > 0.9
        ),
        true
    );
    await page.waitForFunction(
        () => window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0]?.level === 2
    );
    console.log('PASS menus and result timing');
    // Measure retained resources after all levels are warm, then a second complete cycle.
    const cdp = await context.newCDPSession(page);
    const snapshots = [];
    for (let cycle = 0; cycle < 2; cycle++) {
        for (const level of [3, 4, 1, 2]) {
            console.log(`Resource cycle ${cycle}, level ${level}`);
            await page.evaluate((n) => {
                window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].scene.restart({ level: n });
            }, level);
            await page.waitForFunction(
                (n) => window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0]?.level === n,
                level
            );
            await page.waitForTimeout(250);
        }
        await cdp.send('HeapProfiler.collectGarbage');
        const heap = await cdp.send('Runtime.getHeapUsage');
        const resources = await page.evaluate(() => {
            const game = window.SPACE_CHICKEN_GAME;
            const s = game.scene.getScenes(true)[0];
            return {
                textures: game.textures.getTextureKeys().length,
                textureMiB: game.textures.getTextureKeys().reduce((sum, key) => {
                    const source = game.textures.get(key).source[0];
                    return sum + (source.width * source.height * 4) / 1048576;
                }, 0),
                objects:
                    s.children.list.length -
                    s.effectsManager.live.size -
                    s.effectsManager.pool.length,
                particleSprites: s.effectsManager.live.size + s.effectsManager.pool.length,
                bodies: s.physics.world.bodies.size,
                cameras: s.cameras.cameras.length,
                timers: s.time._active.length + s.time._pendingInsertion.length,
            };
        });
        snapshots.push({ cycle, heapBytes: heap.usedSize, ...resources });
    }
    for (const key of ['textures', 'objects', 'bodies', 'cameras', 'timers'])
        assert.equal(snapshots[0][key], snapshots[1][key], `${key} stable through level restarts`);
    assert.ok(snapshots[1].particleSprites < 128, 'particle pool stays bounded');
    assert.ok(snapshots[1].textureMiB < 30, 'visited backdrops do not accumulate');
    assert.ok(snapshots[1].heapBytes < snapshots[0].heapBytes * 1.2, 'retained heap stays bounded');
    assert.deepEqual(errors, []);
    await writeFile(`${out}/stability.json`, JSON.stringify(snapshots, null, 2));
    console.log(
        JSON.stringify({ menus: 'passed', resultTiming: 'passed', stability: snapshots, errors })
    );
} finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
}
