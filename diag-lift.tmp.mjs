import { chromium } from 'playwright';
import { buildPilotSource } from './scripts/pilot-brain.mjs';
const browser = await chromium.launch({
    headless: true,
    args: [
        '--use-gl=swiftshader',
        '--ignore-gpu-blocklist',
        '--no-sandbox',
        '--autoplay-policy=no-user-gesture-required',
    ],
});
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
await page.goto('http://127.0.0.1:3000/?bot=1&level=4&renderer=canvas', {
    waitUntil: 'load',
    timeout: 45000,
});
await page.waitForFunction(
    () => window.__spaceChickenDebug && window.__spaceChickenDebug.ready(),
    null,
    { timeout: 25000 }
);
await page.evaluate(buildPilotSource());
await page.waitForTimeout(500);
await page.evaluate(() => {
    window.__liftoffs = [];
    window.__wasG = null;
    setInterval(() => {
        const s = window.__spaceChickenPilotLastSnap;
        if (!s || !s.player) return;
        const g = !!s.player.grounded;
        if (window.__wasG === true && g === false) {
            window.__liftoffs.push({
                x: Math.round(s.player.x),
                y: Math.round(s.player.y),
                jc: s.jumpCount,
                t: Math.round(s.elapsedMs),
            });
        }
        window.__wasG = g;
    }, 30);
});
await page.waitForTimeout(55000);
const offs = await page.evaluate(() => window.__liftoffs);
console.log(JSON.stringify(offs));
await browser.close();
