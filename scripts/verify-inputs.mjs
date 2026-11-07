/** Browser input regression sweep. Gamepads are simulated at the browser API. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { resolveChromeExecutable } from './chrome-path.mjs';

const require = createRequire(import.meta.url);
const { createServer } = require('../server.cjs');
const output = process.env.INPUT_REPORT_DIR || '/tmp/space-chicken-inputs';
await mkdir(output, { recursive: true });
const server = createServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const results = [];
const filter = process.argv[2] || '';
const includes = (name) => !filter || name.includes(filter);
let browser;

async function openGame(level, mode = 'normal', touch = false) {
    const context = await browser.newContext({
        viewport: touch || { width: 1000, height: 700 },
        hasTouch: Boolean(touch),
        isMobile: Boolean(touch),
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => {
        errors.push(error.message);
        console.error(error.message);
    });
    await page.addInitScript((mode) => {
        localStorage.setItem('spaceChickenDifficulty', mode);
        localStorage.setItem('spaceChickenJumpMode', 'fine');
        window.testPads = [];
        Object.defineProperty(navigator, 'getGamepads', { value: () => window.testPads });
    }, mode);
    await page.goto(`${url}/?level=${level}&debug=1&renderer=canvas`);
    await page.waitForFunction(() => window.SPACE_CHICKEN_GAME?.scene.getScenes(true)[0]?.player);
    if (level === 1) {
        await page.evaluate(() => {
            window.SPACE_CHICKEN_GAME.scene
                .getScenes(true)[0]
                .uiManager.overlays.setTitleView('campaign');
        });
        await press(page, 'Space');
    }
    await page.waitForFunction(
        () => window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0]?.hasStartedPlay
    );
    await page.waitForTimeout(180);
    return { page, context, errors };
}

async function press(page, key) {
    await page.keyboard.down(key);
    await page.waitForTimeout(80);
    await page.keyboard.up(key);
    await page.waitForTimeout(50);
}

async function snapshot(page) {
    return page.evaluate(() => {
        const s = window.SPACE_CHICKEN_GAME.scene.getScenes(false)[0];
        const player = (p) =>
            p && {
                x: p.x,
                y: p.y,
                vx: p.body.velocity.x,
                vy: p.body.velocity.y,
                weapon: p.weapon,
                lastShot: p.lastPhaserAt || 0,
            };
        return {
            p1: player(s.player),
            p2: player(s.player2),
            jumps: s.jumpCount,
            p2Jumps: s.player2JumpCount,
            coop: s.coopMode,
            paused: s.scene.isPaused(),
            deaths: s.deathCount,
            fire: s.phaserHeld,
            aimUp: s.touchAimUpHeld,
            aimDown: s.touchAimDownHeld,
        };
    });
}

async function finish(session, name) {
    assert.deepEqual(session.errors, [], `${name}: browser errors`);
    await session.page.screenshot({ path: `${output}/${name}.png` });
    results.push({ name, passed: true });
    console.log(`PASS ${name}`);
    await session.context.close();
}

async function checkKeyboard(level, mode) {
    const session = await openGame(level, mode);
    const { page } = session;
    for (const [key, direction] of [
        ['ArrowRight', 1],
        ['a', -1],
    ]) {
        await page.keyboard.down(key);
        await page.waitForTimeout(100);
        assert.ok((await snapshot(page)).p1.vx * direction > 0, `${key} moves`);
        await page.keyboard.up(key);
        await page.waitForTimeout(80);
        assert.equal((await snapshot(page)).p1.vx, 0, `${key} releases`);
    }
    await page.keyboard.down('k');
    await page.waitForTimeout(80);
    assert.ok((await snapshot(page)).p1.vy < 0, 'K jumps');
    await page.keyboard.up('k');
    if (level === 8) {
        await page.keyboard.down('j');
        await page.keyboard.down('w');
        await page.waitForTimeout(140);
        const shots = await page.evaluate(() => {
            const s = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0];
            return s.phaserBolts
                .getChildren()
                .filter((bolt) => bolt.active)
                .map((bolt) => bolt.body.velocity.y);
        });
        assert.ok(
            shots.some((y) => y < 0),
            'J + W fires upward'
        );
        await page.keyboard.up('w');
        await page.keyboard.up('j');
        const before = (await snapshot(page)).p1.weapon;
        await press(page, 'g');
        assert.notEqual((await snapshot(page)).p1.weapon, before, 'G switches once');
    }
    await press(page, 'p');
    const paused = await snapshot(page);
    assert.equal(paused.paused, true);
    await page.waitForTimeout(150);
    assert.deepEqual((await snapshot(page)).p1, paused.p1, 'pause freezes player');
    await page.locator('#resume-button').click();
    await page.waitForTimeout(100);
    assert.equal((await snapshot(page)).paused, false);
    await press(page, 'Escape');
    assert.equal((await snapshot(page)).paused, true);
    await press(page, 'Escape');
    assert.equal((await snapshot(page)).paused, false);
    // Position at a real fall boundary, then let physics trigger death and respawn.
    const deaths = (await snapshot(page)).deaths;
    await page.evaluate(() => {
        const s = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0];
        s.player.setPosition(s.player.x, s.killZoneFallY + 5);
    });
    await page.waitForFunction((deaths) => {
        const s = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0];
        return s.deathCount > deaths && !s.isTransitioning && s.player.body.enable;
    }, deaths);
    await press(page, 'Space');
    assert.ok((await snapshot(page)).jumps > 0, 'jump works after respawn');
    await finish(session, `keyboard-L${level}-${mode}`);
}

async function installPads(page, count) {
    await page.evaluate((count) => {
        window.testPads = Array.from({ length: count * 2 }, (_, index) =>
            index % 2 === 0
                ? null
                : {
                      id: `test-${index}`,
                      index,
                      connected: true,
                      mapping: 'standard',
                      axes: [0, 0],
                      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
                  }
        );
    }, count);
    await page.waitForTimeout(650);
}

async function setPad(page, slot, changes) {
    await page.evaluate(
        ({ slot, changes }) => {
            const pad = window.testPads[slot];
            if (changes.axes) pad.axes = changes.axes;
            for (const [index, pressed] of Object.entries(changes.buttons || {})) {
                pad.buttons[index] = { pressed, value: Number(pressed) };
            }
        },
        { slot, changes }
    );
    await page.waitForTimeout(100);
}

async function checkCoop(key, mode) {
    const session = await openGame(8, mode);
    const { page } = session;
    if (key !== '2') await installPads(page, key === '4' ? 2 : 1);
    await press(page, key);
    const expected = { 2: 'keyboard', 3: 'keyboard-controller', 4: 'controllers' }[key];
    assert.equal((await snapshot(page)).coop, expected);
    if (key === '2') {
        await page.keyboard.down('ArrowRight');
        await page.keyboard.down('ArrowUp');
        await page.waitForTimeout(80);
        const state = await snapshot(page);
        assert.ok(state.p2.vx > 0 && state.p2.vy < 0, 'P2 arrows move and jump');
        assert.equal(state.p1.vx, 0);
        assert.equal(state.jumps, 0);
        await page.keyboard.up('ArrowRight');
        await page.keyboard.up('ArrowUp');
        await press(page, 'Numpad0');
        assert.equal((await snapshot(page)).p2Jumps, 2, 'P2 numpad double jump');
        await page.keyboard.down('Numpad1');
        await page.waitForTimeout(120);
        assert.ok((await snapshot(page)).p2.lastShot > 0, 'P2 numpad fires');
        await page.keyboard.up('Numpad1');
        const before = (await snapshot(page)).p2.weapon;
        await press(page, 'Numpad2');
        assert.notEqual((await snapshot(page)).p2.weapon, before);
    } else {
        const secondSlot = key === '3' ? 1 : 3;
        await setPad(page, secondSlot, {
            axes: [0.8, -0.8],
            buttons: { 0: true, 2: true, 3: true },
        });
        const state = await snapshot(page);
        assert.ok(state.p2.vx > 0 && state.p2.vy < 0, 'P2 pad moves and jumps');
        assert.ok(state.p2.lastShot > 0, 'P2 pad fires');
        assert.equal(state.jumps, 0, 'P2 pad does not jump P1');
        assert.equal(state.p1.lastShot, 0, 'P2 pad does not fire P1');
        await setPad(page, secondSlot, { axes: [0, 0], buttons: { 0: false, 2: false, 3: false } });
        await setPad(page, secondSlot, { buttons: { 9: true } });
        assert.equal((await snapshot(page)).paused, true, 'P2 Start pauses');
        await setPad(page, secondSlot, { buttons: { 9: false } });
        await setPad(page, secondSlot, { buttons: { 0: true } });
        assert.equal((await snapshot(page)).paused, false, 'P2 A resumes');
        await setPad(page, secondSlot, { buttons: { 0: false } });
        if (key === '4') {
            await page.evaluate(() => {
                window.testPads[1] = null;
            });
            await page.waitForTimeout(100);
            await setPad(page, 3, { axes: [-0.8, 0] });
            assert.equal((await snapshot(page)).p1.vx, 0, 'P2 keeps its slot after P1 disconnect');
            assert.ok((await snapshot(page)).p2.vx < 0);
        }
    }
    await finish(session, `coop-${expected}-${mode}`);
}

async function checkSoloPad(level) {
    const session = await openGame(level);
    const { page } = session;
    if (level === 1) {
        await page.reload();
        await page.waitForFunction(
            () => window.SPACE_CHICKEN_GAME?.scene.getScenes(true)[0]?.awaitingStart
        );
        await page.evaluate(() => {
            window.SPACE_CHICKEN_GAME.scene
                .getScenes(true)[0]
                .uiManager.overlays.setTitleView('campaign');
        });
    }
    await installPads(page, 1);
    if (level === 1) {
        await setPad(page, 1, { buttons: { 3: true } });
        assert.equal(
            await page.evaluate(
                () =>
                    window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].uiManager.overlays
                        .leaderboardVisible
            ),
            true
        );
        await setPad(page, 1, { buttons: { 3: false, 1: true } });
        assert.equal(
            await page.evaluate(
                () =>
                    window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].uiManager.overlays
                        .leaderboardVisible
            ),
            false
        );
        await setPad(page, 1, { buttons: { 1: false, 0: true } });
        await page.waitForFunction(
            () => window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0]?.hasStartedPlay
        );
        await setPad(page, 1, { buttons: { 0: false } });
    }
    await setPad(page, 1, { axes: [0.8, 0], buttons: { 0: true, 2: true, 3: true } });
    const active = await snapshot(page);
    assert.ok(active.p1.vx > 0 && active.jumps > 0, 'solo pad moves and jumps');
    if (level === 8) assert.ok(active.p1.lastShot > 0, 'solo pad fires');
    else assert.equal(active.p1.lastShot, 0, 'no gun on non-combat level');
    await page.evaluate(() => {
        window.testPads[1] = null;
    });
    await page.waitForTimeout(120);
    assert.equal((await snapshot(page)).p1.vx, 0, 'disconnect releases movement');
    await finish(session, `solo-gamepad-L${level}`);
}

async function checkTouch(viewport) {
    const session = await openGame(8, 'normal', viewport);
    const { page, context } = session;
    const points = await page.evaluate(() => {
        const ui = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].uiManager;
        return Object.fromEntries(
            ['rightButton', 'jumpButton', 'phaserButton', 'aimUpButton'].map((name, id) => {
                const b = ui[name].getBounds();
                return [name, { x: b.centerX, y: b.centerY, id: id + 1 }];
            })
        );
    });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [points.rightButton],
    });
    await page.waitForTimeout(80);
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [points.rightButton, points.jumpButton, points.phaserButton],
    });
    await page.waitForTimeout(100);
    const active = await snapshot(page);
    assert.ok(
        active.p1.vx > 0 && active.p1.vy < 0 && active.p1.lastShot > 0,
        'three-finger move/jump/fire'
    );
    await page.locator('#pause-button').click();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.locator('#resume-button').click();
    await page.waitForTimeout(100);
    assert.equal((await snapshot(page)).fire, false, 'fire released while paused');
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [points.aimUpButton],
    });
    await page.waitForTimeout(80);
    assert.equal((await snapshot(page)).aimUp, true);
    await page.locator('#pause-button').click();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.locator('#resume-button').click();
    await page.waitForTimeout(100);
    assert.equal((await snapshot(page)).aimUp, false, 'aim released while paused');
    await finish(session, `touch-${viewport.width}x${viewport.height}`);
}

async function checkBranch() {
    const session = await openGame(12);
    const { page } = session;
    await installPads(page, 1);
    // Set up the post-crown UI directly; route selection still uses pad input.
    await page.evaluate(() => {
        window.SPACE_CHICKEN_GAME.scene
            .getScenes(true)[0]
            .offerBranchChoice('INPUT CHECK', 1000, 0);
    });
    await setPad(page, 1, { buttons: { 13: true } });
    assert.equal(
        await page.evaluate(
            () =>
                window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].uiManager.overlays
                    .branchMenuIndex
        ),
        1
    );
    await setPad(page, 1, { buttons: { 13: false, 0: true } });
    await page.waitForFunction(
        () => window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0]?.level === 16
    );
    await finish(session, 'gamepad-branch-L12-to-L16');
}

try {
    browser = await chromium.launch({
        executablePath: resolveChromeExecutable(),
        headless: true,
        args: ['--no-sandbox'],
    });
    for (const mode of ['normal', 'hard']) {
        if (includes('keyboard')) for (const level of [1, 2, 8]) await checkKeyboard(level, mode);
        if (includes('coop')) for (const key of ['2', '3', '4']) await checkCoop(key, mode);
    }
    if (includes('solo')) for (const level of [1, 8]) await checkSoloPad(level);
    if (includes('branch')) await checkBranch();
    for (const viewport of [
        { width: 844, height: 390 },
        { width: 390, height: 844 },
    ]) {
        if (includes('touch')) await checkTouch(viewport);
    }
    await writeFile(`${output}/report.json`, JSON.stringify(results, null, 2));
} finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
}
