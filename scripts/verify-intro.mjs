import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

const cachedChrome = join(homedir(), '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome');
const browser = await chromium.launch({
    executablePath: existsSync(cachedChrome) ? cachedChrome : undefined,
    headless: true,
    args: ['--no-sandbox'],
});

try {
    for (const viewport of [
        { width: 1280, height: 720 },
        { width: 390, height: 844 },
        { width: 844, height: 390 },
    ]) {
        const page = await browser.newPage({
            viewport,
            hasTouch: viewport.width === 390,
            isMobile: viewport.width === 390,
        });
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.stack || error.message));
        await page.goto(process.env.SPACE_CHICKEN_URL || 'http://127.0.0.1:3000');
        await page.waitForFunction(
            () => window.SPACE_CHICKEN_GAME?.scene.getScenes(true)[0]?.awaitingStart
        );
        const snapshot = () =>
            page.evaluate(() => {
                const scene = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0];
                const ui = scene.uiManager;
                const bounds = (object) => {
                    const { x, y, width, height } = object.getBounds();
                    return { x, y, width, height };
                };
                return {
                    awaitingStart: scene.awaitingStart,
                    name: ui.playerNameText.text,
                    leaderboard: ui.leaderboardButton.text,
                    controls: ui.titleControls.text,
                    gamepad: ui.titleGamepadStatus.text,
                    bounds: {
                        name: bounds(ui.playerNameText),
                        leaderboard: bounds(ui.leaderboardButton),
                        title: bounds(ui.titleText),
                        prompt: bounds(ui.titlePrompt),
                        controls: bounds(ui.titleControls),
                        gamepad: bounds(ui.titleGamepadStatus),
                    },
                };
            });
        const intro = await snapshot();
        assert.match(intro.name, /CHANGE NAME/);
        assert.equal(intro.leaderboard, 'LEADERBOARD');
        assert.match(intro.controls, /MOVE/);
        assert.match(intro.controls, /JUMP/);
        assert.match(intro.gamepad, /gamepad/i);
        assert.ok(
            intro.bounds.name.y + intro.bounds.name.height + 4 <= intro.bounds.title.y,
            `name overlaps title at ${viewport.width}×${viewport.height}: ${JSON.stringify(intro.bounds.name)} / ${JSON.stringify(intro.bounds.title)}`
        );
        for (const [label, rect] of Object.entries(intro.bounds)) {
            assert.ok(
                rect.x >= -1,
                `${label} starts off screen at ${viewport.width}×${viewport.height}`
            );
            assert.ok(
                rect.y >= -1,
                `${label} starts above screen at ${viewport.width}×${viewport.height}`
            );
            assert.ok(
                rect.x + rect.width <= viewport.width + 1,
                `${label} exceeds screen width at ${viewport.width}×${viewport.height}`
            );
            assert.ok(
                rect.y + rect.height <= viewport.height + 1,
                `${label} exceeds screen height at ${viewport.width}×${viewport.height}`
            );
        }
        await page.screenshot({ path: `/tmp/space-chicken-intro-${viewport.width}.png` });
        if (viewport.width === 1280) {
            page.on('dialog', (dialog) => dialog.accept('Test Pilot'));
            const name = intro.bounds.name;
            await page.mouse.click(name.x + name.width / 2, name.y + name.height / 2);
            await page.waitForFunction(() =>
                window.SPACE_CHICKEN_GAME.scene
                    .getScenes(true)[0]
                    .uiManager.playerNameText.text.includes('Test Pilot')
            );
            assert.equal((await snapshot()).awaitingStart, true);
            const leaderboard = intro.bounds.leaderboard;
            await page.mouse.click(
                leaderboard.x + leaderboard.width / 2,
                leaderboard.y + leaderboard.height / 2
            );
            await page.waitForFunction(() =>
                Boolean(
                    window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].uiManager.leaderboardVisible
                )
            );
            assert.equal((await snapshot()).awaitingStart, true);
            await page.mouse.click(
                leaderboard.x + leaderboard.width / 2,
                leaderboard.y + leaderboard.height / 2
            );
            await page.waitForFunction(
                () =>
                    !window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].uiManager.leaderboardVisible
            );
        }
        await page.evaluate(() => {
            Object.defineProperty(navigator, 'getGamepads', {
                configurable: true,
                value: () => [{ connected: true, buttons: [], axes: [] }],
            });
        });
        await page.waitForFunction(() =>
            window.SPACE_CHICKEN_GAME.scene
                .getScenes(true)[0]
                .uiManager.titleGamepadStatus.text.includes('GAMEPAD CONNECTED')
        );
        const connected = await snapshot();
        assert.ok(
            connected.bounds.gamepad.y + connected.bounds.gamepad.height <= viewport.height + 1,
            `connected status exceeds screen height at ${viewport.width}×${viewport.height}`
        );
        if (viewport.width === 1280) {
            await page.evaluate(() =>
                window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].beginPlay()
            );
            assert.equal(
                await page.evaluate(
                    () => window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].awaitingStart
                ),
                false
            );
            assert.equal(
                await page.evaluate(
                    () =>
                        window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].uiManager.playerNameText
                            .input.enabled
                ),
                false,
                'name editing must be disabled during a timed run'
            );
            await page.evaluate(() =>
                window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].collectGem()
            );
            try {
                await page.waitForFunction(
                    () => window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0]?.level === 2,
                    null,
                    { timeout: 20000 }
                );
            } catch (error) {
                const state = await page.evaluate(() => {
                    const scene = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0];
                    return {
                        level: scene?.level,
                        awaitingStart: scene?.awaitingStart,
                        isTransitioning: scene?.isTransitioning,
                        pendingSceneData: scene?.pendingSceneData,
                        pageErrors: [],
                    };
                });
                throw new Error(`Level transition failed: ${JSON.stringify(state)}`, {
                    cause: error,
                });
            }
        }
        assert.deepEqual(errors, []);
        console.log(`PASS intro ${viewport.width}×${viewport.height}`);
        await page.close();
    }
} finally {
    await browser.close();
}
