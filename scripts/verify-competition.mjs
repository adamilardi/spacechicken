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
const records = Object.fromEntries(
    [0, 1, 2, 3, 4].map((level) => [
        level,
        Array.from({ length: 5 }, (_, index) => ({
            name: `Pilot ${index + 1}`,
            time: (level === 0 ? 60000 : 20000) + index * 1000,
        })),
    ])
);

try {
    for (const viewport of [
        { width: 1280, height: 720 },
        { width: 390, height: 844 },
        { width: 844, height: 390 },
    ]) {
        const page = await browser.newPage({ viewport });
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.route('**/api/leaderboard', (route) => {
            if (route.request().method() === 'POST') {
                return route.fulfill({
                    contentType: 'application/json',
                    body: JSON.stringify({
                        rank: 3,
                        weeklyRank: 1,
                        personalBest: { time: 22000 },
                        next: { name: 'Pilot 2', time: 21000 },
                    }),
                });
            }
            return route.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({
                    levels: records,
                    weekly: records,
                    hallOfFame: Object.fromEntries(
                        [0, 1, 2, 3, 4].map((level) => [
                            level,
                            [{ week: '2026-09-14', name: 'Pilot 1', time: records[level][0].time }],
                        ])
                    ),
                    week: '2026-09-21',
                }),
            });
        });
        await page.route('**/api/run', (route) =>
            route.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({ token: '123e4567-e89b-42d3-a456-426614174000' }),
            })
        );
        await page.goto(process.env.SPACE_CHICKEN_URL || 'http://127.0.0.1:3000');
        await page.waitForFunction(() =>
            window.SPACE_CHICKEN_GAME?.scene
                .getScenes(true)[0]
                ?.uiManager?.titleSubtitle?.text.includes('Run #1 01:00.00')
        );
        await page.evaluate(() =>
            window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].uiManager.displayLeaderboard()
        );
        await page.waitForFunction(() =>
            window.SPACE_CHICKEN_GAME.scene
                .getScenes(true)[0]
                .uiManager.leaderboardTextContent.includes('PAST WINNERS')
        );
        const snapshot = await page.evaluate(() => {
            const ui = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].uiManager;
            const { x, y, width, height } = ui.leaderboardTextObject.getBounds();
            return { x, y, width, height, text: ui.leaderboardTextContent };
        });
        assert.ok(snapshot.x >= -1 && snapshot.x + snapshot.width <= viewport.width + 1);
        assert.ok(
            snapshot.y >= -1 && snapshot.y + snapshot.height <= viewport.height + 1,
            `board overflows ${viewport.width}×${viewport.height}: ${JSON.stringify(snapshot)}`
        );
        assert.deepEqual(errors, []);
        await page.screenshot({ path: `/tmp/space-chicken-competition-${viewport.width}.png` });
        if (viewport.width !== 1280) {
            await page.evaluate(() => {
                const scene = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0];
                scene.gameOver = true;
                scene.restartDelayDone = true;
                scene.uiManager.completionSummary =
                    'NEW PERSONAL BEST · 00:42.31\nAll-time #2 · Weekly #1\n0.12 behind Pilot 1';
                scene.uiManager.fullRunSummary =
                    'FULL RUN · 03:00.00 · ZERO DEATHS\nAll-time #3 · Weekly #1';
                scene.uiManager.displayLeaderboard();
            });
            await page.waitForFunction(() =>
                window.SPACE_CHICKEN_GAME.scene
                    .getScenes(true)[0]
                    .uiManager.leaderboardTextContent.includes('FULL RUN · 03:00.00')
            );
            const finishBounds = await page.evaluate(() => {
                const ui = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].uiManager;
                const { x, y, width, height } = ui.leaderboardTextObject.getBounds();
                return { x, y, width, height };
            });
            assert.ok(
                finishBounds.x >= -1 &&
                    finishBounds.x + finishBounds.width <= viewport.width + 1 &&
                    finishBounds.y >= -1 &&
                    finishBounds.y + finishBounds.height <= viewport.height + 1,
                `finish board overflows ${viewport.width}×${viewport.height}: ${JSON.stringify(finishBounds)}`
            );
            await page.screenshot({
                path: `/tmp/space-chicken-competition-finish-${viewport.width}.png`,
            });
            await page.evaluate(() => {
                const scene = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0];
                scene.level = 4;
                const ui = scene.uiManager;
                ui.leaderboardPage = 4;
                ui.displayLeaderboard();
            });
            await page.waitForFunction(() =>
                window.SPACE_CHICKEN_GAME.scene
                    .getScenes(true)[0]
                    .uiManager.leaderboardTextContent.includes('NEW PERSONAL BEST')
            );
            const levelFinish = await page.evaluate(() => {
                const ui = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].uiManager;
                const { x, y, width, height } = ui.leaderboardTextObject.getBounds();
                return { x, y, width, height };
            });
            assert.ok(
                levelFinish.x >= -1 &&
                    levelFinish.x + levelFinish.width <= viewport.width + 1 &&
                    levelFinish.y >= -1 &&
                    levelFinish.y + levelFinish.height <= viewport.height + 1,
                `level finish board overflows ${viewport.width}×${viewport.height}: ${JSON.stringify(levelFinish)}`
            );
        }
        if (viewport.width === 1280) {
            await page.evaluate(() => {
                const scene = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0];
                scene.uiManager.hideLeaderboard();
                scene.beginPlay();
            });
            for (let level = 1; level <= 4; level++) {
                await page.evaluate(() =>
                    window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].collectGem()
                );
                if (level < 4) {
                    await page.waitForFunction(
                        (next) =>
                            window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0]?.level === next,
                        level + 1
                    );
                }
            }
            await page.waitForFunction(() => {
                const ui = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].uiManager;
                return (
                    ui.leaderboardTextContent.includes('FULL RUN') &&
                    ui.leaderboardTextContent.includes('All-time #3')
                );
            });
            await page.screenshot({ path: '/tmp/space-chicken-competition-finish.png' });
            await page.waitForFunction(
                () => window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].restartDelayDone
            );
            const retry = await page.evaluate(() => {
                const ui = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].uiManager;
                const bounds = ui.leaderboardTextObject.getBounds();
                return { x: bounds.centerX, y: bounds.bottom - 8 };
            });
            await page.mouse.click(retry.x, retry.y);
            await page.waitForFunction(() => {
                const scene = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0];
                return scene?.level === 4 && !scene.gameOver;
            });
            assert.deepEqual(errors, []);
        }
        console.log(`PASS competition ${viewport.width}×${viewport.height}`);
        await page.close();
    }
} finally {
    await browser.close();
}
