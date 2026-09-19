import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

const cachedChrome = join(homedir(), '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome');
const browser = await chromium.launch({
    executablePath:
        process.env.PLAYWRIGHT_CHROME || (existsSync(cachedChrome) ? cachedChrome : undefined),
    headless: true,
    args: ['--no-sandbox'],
});
try {
    for (const viewport of [
        { width: 1280, height: 720 },
        { width: 390, height: 844 },
    ]) {
        const page = await browser.newPage({ viewport });
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(process.env.SPACE_CHICKEN_URL || 'http://127.0.0.1:3000');
        await page.waitForFunction(
            () => window.SPACE_CHICKEN_GAME?.scene.getScenes(true)[0]?.awaitingStart
        );
        await page.keyboard.press('Space');
        await page.waitForTimeout(300);
        await page.click('#pause-button');
        const snapshot = () =>
            page.evaluate(() => {
                const scene = window.SPACE_CHICKEN_GAME.scene.getScenes(false)[0];
                return {
                    paused: scene.scene.isPaused(),
                    x: scene.player.x,
                    y: scene.player.y,
                    startTime: scene.startTime,
                    open: document.querySelector('dialog').open,
                };
            });
        const before = await snapshot();
        assert.equal(before.paused, true);
        assert.equal(before.open, true);
        await page.waitForTimeout(1100);
        const after = await snapshot();
        assert.equal(after.x, before.x);
        assert.equal(after.y, before.y);
        await page.click('#resume-button');
        const resumed = await snapshot();
        assert.equal(resumed.paused, false);
        assert.equal(resumed.open, false);
        assert.ok(resumed.startTime - before.startTime >= 1100);
        await page.evaluate(() => window.dispatchEvent(new Event('blur')));
        assert.equal((await snapshot()).paused, true);
        await page.keyboard.press('Escape');
        assert.equal((await snapshot()).paused, false);
        assert.deepEqual(errors, []);
        console.log(
            `PASS ${viewport.width}×${viewport.height}: pause, frozen physics, timer, resume, blur, Escape`
        );
        await page.close();
    }
} finally {
    await browser.close();
}
