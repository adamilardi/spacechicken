import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

const cachedChrome = join(homedir(), '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome');
const output = process.env.MOBILE_SCREENSHOT_DIR || '/tmp/space-chicken-mobile';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
    executablePath:
        process.env.PLAYWRIGHT_CHROME || (existsSync(cachedChrome) ? cachedChrome : undefined),
    headless: true,
    args: ['--no-sandbox'],
});

async function layout(page) {
    return page.evaluate(() => {
        const game = window.SPACE_CHICKEN_GAME;
        const scene = game.scene.getScenes(false)[0];
        const names = [
            'leftButton',
            'rightButton',
            'jumpButton',
            'titleText',
            'titlePrompt',
            'timerText',
            'deathText',
            'levelText',
            'playerNameText',
        ];
        const bounds = Object.fromEntries(
            names
                .filter((name) => scene.uiManager[name])
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
            overflow: document.documentElement.scrollWidth > innerWidth,
        };
    });
}

function checkLayout(state, viewport) {
    assert.equal(state.width, viewport.width);
    assert.equal(state.height, viewport.height);
    assert.equal(state.touch, true);
    assert.equal(state.overflow, false);
    for (const [name, rect] of Object.entries(state.bounds)) {
        assert.ok(rect.x >= -1 && rect.y >= -1, `${name} starts outside viewport`);
        assert.ok(rect.x + rect.width <= viewport.width + 1, `${name} exceeds width`);
        assert.ok(rect.y + rect.height <= viewport.height + 1, `${name} exceeds height`);
        if (name.endsWith('Button')) {
            assert.ok(rect.width >= 44 && rect.height >= 44, `${name} too small`);
        }
    }
}

try {
    for (const viewport of [
        { width: 320, height: 568 },
        { width: 390, height: 844 },
        { width: 844, height: 390 },
        { width: 768, height: 1024 },
        { width: 1024, height: 768 },
    ]) {
        const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(process.env.SPACE_CHICKEN_URL || 'http://127.0.0.1:3000');
        await page.waitForFunction(
            () => window.SPACE_CHICKEN_GAME?.scene.getScenes(true)[0]?.awaitingStart
        );
        checkLayout(await layout(page), viewport);
        const label = `${viewport.width}x${viewport.height}`;
        await page.screenshot({ path: join(output, `${label}-title.png`) });
        // Tap a point the canvas receives: centered DOM buttons (race setup)
        // swallow touches on larger viewports, and tappable Phaser HUD objects
        // intentionally ignore title-start taps.
        const startPoint = await page.evaluate(() => {
            const game = window.SPACE_CHICKEN_GAME;
            const scene = game.scene.getScenes(true)[0];
            const ui = scene.uiManager;
            const width = game.scale.width;
            const height = game.scale.height;
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
        await page.touchscreen.tap(startPoint.x, startPoint.y);
        await page.waitForFunction(
            () => !window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].awaitingStart
        );
        await page.waitForTimeout(500);
        const controls = (await layout(page)).bounds;
        if (viewport.width <= 360 && viewport.height > viewport.width) {
            const deaths = controls.deathText;
            const narrow = await page.evaluate(() => {
                const scene = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0];
                const ui = scene.uiManager;
                return {
                    board: ui.leaderboardButton.getBounds(),
                    name: ui.playerNameText.getBounds(),
                    banner: ui.bannerTitle.getBounds(),
                };
            });
            assert.ok(
                deaths.y >= narrow.board.y + narrow.board.height,
                'narrow phone stats must sit below the top buttons'
            );
            assert.ok(
                narrow.banner.y >= narrow.name.y + narrow.name.height + 8,
                'level banner must clear the narrow phone HUD'
            );
        }
        const point = (rect, id) => ({
            x: rect.x + rect.width / 2,
            y: rect.y + rect.height / 2,
            id,
        });
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
        assert.equal(movingJump.right, true, 'second finger must not cancel held movement');
        assert.equal(movingJump.jumping, true, 'second finger must trigger jump');
        assert.ok(movingJump.vx > 0, 'player must move while jumping');
        // CDP touchEnd identifies the released contact; the movement contact stays down.
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [jump] });
        await page.waitForTimeout(60);
        assert.equal(
            await page.evaluate(
                () => window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].rightPressed
            ),
            true,
            'releasing jump must preserve held movement'
        );
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForTimeout(60);
        assert.equal(
            await page.evaluate(
                () => window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].rightPressed
            ),
            false,
            'released movement must clear'
        );
        await page.screenshot({ path: join(output, `${label}-play.png`) });
        await page.locator('#pause-button').tap();
        assert.equal(await page.locator('dialog').evaluate((dialog) => dialog.open), true);
        const heading = await page.locator('#pause-title').boundingBox();
        assert.ok(heading && heading.y >= 0, 'pause heading must be visible');
        await page.screenshot({ path: join(output, `${label}-pause.png`) });
        await page.locator('#resume-button').tap();
        // Phaser levels add a fourth bottom-row button; the fire row must
        // fit without overlapping (regression: fire covered move-right in
        // narrow portrait).
        await page.evaluate(() => {
            window.SPACE_CHICKEN_GAME.scene
                .getScenes(true)[0]
                .scene.restart({ level: 7, deathCount: 0, coopMode: null });
        });
        await page.waitForFunction(() => {
            const scene = window.SPACE_CHICKEN_GAME?.scene.getScenes(true)[0];
            return Boolean(scene?.uiManager?.phaserButton && scene?.uiManager?.jumpButton);
        });
        const fireRow = await page.evaluate(() => {
            const ui = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].uiManager;
            const rects = {};
            for (const name of ['leftButton', 'rightButton', 'phaserButton', 'jumpButton']) {
                const rect = ui[name].getBounds();
                rects[name] = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
            }
            return rects;
        });
        const row = Object.entries(fireRow)
            .map(([name, rect]) => ({ name, ...rect }))
            .sort((a, b) => a.x - b.x);
        for (const rect of row) {
            assert.ok(rect.x >= -1 && rect.y >= -1, `${rect.name} starts outside viewport`);
            assert.ok(rect.x + rect.width <= viewport.width + 1, `${rect.name} exceeds width`);
            assert.ok(rect.y + rect.height <= viewport.height + 1, `${rect.name} exceeds height`);
            assert.ok(rect.width >= 44 && rect.height >= 44, `${rect.name} too small`);
        }
        for (let i = 1; i < row.length; i++) {
            assert.ok(
                row[i - 1].x + row[i - 1].width <= row[i].x + 1,
                `fire row overlaps: ${row[i - 1].name} covers ${row[i].name}`
            );
        }
        await page.screenshot({ path: join(output, `${label}-phaser.png`) });
        const rotated = { width: viewport.height, height: viewport.width };
        await page.setViewportSize(rotated);
        await page.waitForTimeout(200);
        checkLayout(await layout(page), rotated);
        const frameMs = await page.evaluate(
            () =>
                new Promise((resolve) => {
                    const samples = [];
                    let previous;
                    const sample = (now) => {
                        if (previous !== undefined) samples.push(now - previous);
                        previous = now;
                        if (samples.length < 60) requestAnimationFrame(sample);
                        else resolve(samples.sort((a, b) => a - b)[56]);
                    };
                    requestAnimationFrame(sample);
                })
        );
        assert.deepEqual(errors, []);
        console.log(
            `PASS ${label}: layout, real multitouch move+jump, release, pause, fire-row, rotation; frame p95 ${frameMs.toFixed(1)}ms (desktop emulation)`
        );
        await context.close();
    }
    console.log(`Screenshots: ${output}`);
} finally {
    await browser.close();
}
