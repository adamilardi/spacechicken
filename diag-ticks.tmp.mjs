import { chromium } from 'playwright';
import { buildPilotSource } from './scripts/pilot-brain.mjs';
import { writeFileSync } from 'node:fs';
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
await page.evaluate(() => window.__spaceChickenDebug.teleport(8300, 520));
await page.evaluate(() => {
    window.__ticks = [];
    const orig = window.requestAnimationFrame.bind(window);
    // sample every animation frame: pilot ticks on rAF
    const hook = () => {
        try {
            const snap = window.__spaceChickenPilotLastSnap;
            const inp = window.__spaceChickenPilotLastInput;
            if (snap && snap.player && window.__ticks.length < 1200) {
                window.__ticks.push({
                    x: snap.player.x,
                    y: snap.player.y,
                    vy: snap.player.vy,
                    g: snap.player.grounded,
                    jc: snap.jumpCount,
                    i: inp
                        ? [
                              inp.left ? 1 : 0,
                              inp.right ? 1 : 0,
                              inp.jump ? 1 : 0,
                              inp.shoot ? 1 : 0,
                          ].join('')
                        : '----',
                });
            }
        } catch (e) {
            /* ignore */
        }
        orig(hook);
    };
    orig(hook);
});
await page.waitForTimeout(12000);
const out = await page.evaluate(() => window.__ticks);
writeFileSync('/tmp/ticks.json', JSON.stringify(out));
console.log(`ticks=${out.length}`);
// find R+J rising edges while grounded with jc=0
let prevJ = 0;
out.forEach((t, i) => {
    const j = t.i[2] === '1';
    if (j && !prevJ && t.g && t.jc === 0 && t.x > 8300 && t.x < 8500) {
        console.log(
            `RJ@${i} x=${t.x.toFixed(0)} y=${t.y.toFixed(0)} vy=${t.vy.toFixed(0)} in=${t.i}`
        );
    }
    prevJ = j;
});
await browser.close();
