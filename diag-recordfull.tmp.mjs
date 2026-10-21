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
await page.evaluate(() => window.__spaceChickenDebug.teleport(10900, 500));
// In-page recorder: 8ms cadence, full snap JSON on every tick where J is pressed while grounded.
await page.evaluate(() => {
    window.__jpress = [];
    window.__frames = [];
    let lastJc = 0;
    setInterval(() => {
        try {
            const snap = window.__spaceChickenPilotLastSnap;
            const inp = window.__spaceChickenPilotLastInput;
            if (!snap || !snap.player) return;
            window.__frames.push({
                x: Math.round(snap.player.x),
                y: Math.round(snap.player.y),
                g: snap.player.grounded ? 1 : 0,
                jc: snap.jumpCount,
                d: snap.deaths,
                j: inp && inp.jump ? 1 : 0,
            });
            if (window.__frames.length > 3000) window.__frames.shift();
            // Rising edge: J pressed now (grounded), or jumpCount incremented.
            if ((inp && inp.jump && snap.player.grounded) || snap.jumpCount > lastJc) {
                if (window.__jpress.length < 12) {
                    window.__jpress.push(
                        JSON.parse(
                            JSON.stringify({
                                snap,
                                input: {
                                    L: !!inp.left,
                                    R: !!inp.right,
                                    J: !!inp.jump,
                                    S: !!inp.shoot,
                                },
                            })
                        )
                    );
                }
            }
            lastJc = snap.jumpCount;
        } catch (e) {
            /* ignore */
        }
    }, 8);
});
await page.waitForTimeout(14000);
const out = await page.evaluate(() => ({
    jpress: window.__jpress,
    frames: window.__frames.slice(-120),
}));
writeFileSync('/tmp/jpress.json', JSON.stringify(out));
console.log(`jpress=${out.jpress.length} frames=${out.frames.length}`);
await browser.close();
