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
await page.evaluate(() => window.__spaceChickenDebug.teleport(6050, 540));
const t0 = Date.now();
const frames = [];
let jumped = false;
while (Date.now() - t0 < 12000) {
    const f = await page.evaluate(() => {
        const snap = window.__spaceChickenPilotLastSnap;
        const inp = window.__spaceChickenPilotLastInput;
        if (!snap || !snap.player) return null;
        return {
            t: performance.now(),
            player: {
                x: snap.player.x,
                y: snap.player.y,
                vx: snap.player.vx,
                vy: snap.player.vy,
                grounded: snap.player.grounded,
            },
            jc: snap.jumpCount,
            maxJ: snap.maxJumps,
            deaths: snap.deaths,
            input: inp ? { L: !!inp.left, R: !!inp.right, J: !!inp.jump, S: !!inp.shoot } : null,
            hazards: (snap.hazards || [])
                .filter((h) => Math.abs(h.x - snap.player.x) < 400)
                .map((h) => ({
                    type: h.type,
                    x: Math.round(h.x),
                    y: Math.round(h.y),
                    active: h.active,
                    chasing: !!h.chasing,
                    bonkable: !!h.bonkable,
                    phase: h.phase || null,
                })),
            bombs: (snap.bombs || []).map((b) => ({ x: Math.round(b.x), y: Math.round(b.y) })),
            columns: (snap.columns || []).map((c) => ({
                x: Math.round(c.x),
                phase: c.phase || null,
            })),
            plats: (snap.platforms || [])
                .filter((p) => p.right > snap.player.x - 200 && p.left < snap.player.x + 500)
                .map((p) => ({
                    l: Math.round(p.left),
                    r: Math.round(p.right),
                    t: Math.round(p.top),
                })),
            crown: snap.crown ? { x: Math.round(snap.crown.x), y: Math.round(snap.crown.y) } : null,
        };
    });
    if (f) {
        frames.push(f);
        if (f.input && f.input.J && f.player.grounded) jumped = true;
        if (jumped && f.player.grounded && frames.length > 10) break;
    }
    await page.waitForTimeout(50);
}
writeFileSync('/tmp/gauntlet-frames.json', JSON.stringify(frames));
console.log(`frames=${frames.length} jumped=${jumped}`);
await browser.close();
