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
await page.goto('http://127.0.0.1:3000/?bot=1&level=11&renderer=canvas', {
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
await page.evaluate(() => window.__spaceChickenDebug.teleport(7700, 500));
const t0 = Date.now();
let lastD = 0;
let lastX = 0;
while (Date.now() - t0 < 45000) {
    const s = await page.evaluate(() => {
        const snap = window.__spaceChickenPilotLastSnap;
        const inp = window.__spaceChickenPilotLastInput;
        if (!snap || !snap.player) return null;
        const hz = (snap.hazards || [])
            .filter((h) => h.active !== false && Math.abs(h.x - snap.player.x) < 300)
            .map(
                (h) =>
                    `${h.type}@${Math.round(h.x)},${Math.round(h.y)}${h.chasing ? 'C' : ''}${h.phase ? ':' + h.phase : ''}`
            );
        return {
            x: Math.round(snap.player.x),
            y: Math.round(snap.player.y),
            vy: Math.round(snap.player.vy || 0),
            d: snap.deaths,
            g: snap.player.grounded ? 1 : 0,
            jc: snap.jumpCount,
            i: `${inp && inp.left ? 'L' : ''}${inp && inp.right ? 'R' : ''}${inp && inp.jump ? 'J' : ''}${inp && inp.shoot ? 'S' : ''}`,
            hz: hz.join(' '),
        };
    });
    if (s) {
        if (s.d !== lastD) {
            console.log(`--- deaths=${s.d} lastX=${lastX} ---`);
            lastD = s.d;
            if (s.d >= 4) break;
        }
        lastX = s.x;
        console.log(
            `t=${((Date.now() - t0) / 1000).toFixed(1)} ${s.x},${s.y} vy=${s.vy} g=${s.g} jc=${s.jc} in=${s.i} | ${s.hz}`
        );
        if (s.x > 9500) {
            console.log('PAST-MID');
            break;
        }
    }
    await page.waitForTimeout(200);
}
await browser.close();
