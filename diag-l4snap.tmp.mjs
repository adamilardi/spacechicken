import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
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
const t0 = Date.now();
const snaps = [];
while (Date.now() - t0 < 60000 && snaps.length < 300) {
    const s = await page.evaluate(() => {
        const snap = window.__spaceChickenPilotLastSnap;
        const inp = window.__spaceChickenPilotLastInput;
        if (!snap || !snap.player) return null;
        return { snap, inp };
    });
    if (s) snaps.push(s);
    await page.waitForTimeout(200);
}
writeFileSync('/tmp/l4-snaps.json', JSON.stringify(snaps));
console.log('saved', snaps.length);
await browser.close();
