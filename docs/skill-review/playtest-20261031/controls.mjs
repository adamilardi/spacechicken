import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
const require = createRequire(import.meta.url);
const server = require('../../../server.cjs').createServer();
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const results = [];
try {
    for (const id of [1, 17, 18, 19, 20, 21, 22, 23]) {
        const ctx = await browser.newContext({
            viewport: { width: 844, height: 390 },
            isMobile: true,
            hasTouch: true,
        });
        const page = await ctx.newPage();
        const r = { id, errors: [], pause: [] };
        page.on('pageerror', (e) => r.errors.push(e.message));
        await page.goto(`http://127.0.0.1:${server.address().port}/?debug=1&level=${id}`);
        await page.waitForFunction(() => window.__spaceChickenDebug?.ready());
        await page.keyboard.press('Space');
        await page.waitForTimeout(2300);
        await page.keyboard.down('ArrowRight');
        await page.waitForTimeout(200);
        await page.keyboard.up('ArrowRight');
        r.keyboard = await page.evaluate(() => ({
            x: window.__spaceChickenDebug.getBotSnapshot().player.x,
            started: window.__spaceChickenDebug.getBotSnapshot().hasStartedPlay,
        }));
        for (const key of ['Escape', 'p', 'button']) {
            if (key === 'button') await page.locator('#pause-button').tap();
            else await page.keyboard.press(key);
            const before = await page.evaluate(
                () => window.__spaceChickenDebug.getBotSnapshot().player
            );
            await page.waitForTimeout(300);
            const after = await page.evaluate(
                () => window.__spaceChickenDebug.getBotSnapshot().player
            );
            r.pause.push({
                key,
                open: await page.locator('#pause-dialog').evaluate((d) => d.open),
                frozen: before.x === after.x && before.y === after.y,
            });
            await page.locator('#resume-button').tap();
        }
        const points = await page.evaluate(() => {
            const s = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0];
            return ['rightButton', 'jumpButton'].map((n, i) => {
                const b = s.uiManager[n].getBounds();
                return { x: b.centerX, y: b.centerY, id: i + 1 };
            });
        });
        const cdp = await ctx.newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [points[0]],
        });
        await page.waitForTimeout(80);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
        await page.waitForTimeout(120);
        r.touch = await page.evaluate(() => {
            const s = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0];
            return {
                right: s.rightPressed,
                jumping: s.jumpCount > 0,
                vx: s.player.body.velocity.x,
            };
        });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        r.layout = await page.evaluate(() => ({
            overflow: document.documentElement.scrollWidth > innerWidth,
            touch: window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].uiManager
                .touchControlsEnabled,
        }));
        await page.screenshot({
            path: new URL(`./evidence/level-${id}-touch.jpg`, import.meta.url).pathname,
            type: 'jpeg',
            quality: 80,
        });
        results.push(r);
        console.log(JSON.stringify(r));
        await ctx.close();
    }
} finally {
    writeFileSync(
        new URL('./evidence/controls.json', import.meta.url),
        JSON.stringify(results, null, 2)
    );
    await browser.close();
    await new Promise((r) => server.close(r));
}
