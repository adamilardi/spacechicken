import { chromium } from 'playwright';
import { buildPilotSource } from './scripts/pilot-brain.mjs';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader','--ignore-gpu-blocklist','--no-sandbox','--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
await page.goto('http://127.0.0.1:3000/?bot=1&level=4&renderer=canvas', { waitUntil: 'load', timeout: 45000 });
await page.waitForFunction(() => window.__spaceChickenDebug && window.__spaceChickenDebug.ready(), null, { timeout: 25000 });
await page.evaluate(buildPilotSource());
await page.waitForTimeout(500);
const t0 = Date.now();
let lastD = 0;
let lastX = 0;
let maxX = 0;
const hist = [];
while (Date.now() - t0 < 60000) {
  const s = await page.evaluate(() => {
    const snap = window.__spaceChickenPilotLastSnap; const inp = window.__spaceChickenPilotLastInput;
    if (!snap || !snap.player) return null;
    const hz = (snap.hazards||[]).filter(h=>h.active!==false&&Math.abs(h.x-snap.player.x)<300).map(h=>`${h.type}@${Math.round(h.x)},${Math.round(h.y)}${h.chasing?'C':''}${h.phase?':'+h.phase:''}`);
    const lifts = (snap.movingPlatforms||[]).filter(l=>Math.abs(l.x-snap.player.x)<300).map(l=>`lift@${Math.round(l.x)},${Math.round(l.y)}`);
    const bombs = (snap.bombs||[]).filter(b=>Math.abs(b.x-snap.player.x)<300).map(b=>`bomb@${Math.round(b.x)},${Math.round(b.y)}`);
    const cols = (snap.columns||[]).filter(c=>Math.abs(c.x-snap.player.x)<300).map(c=>`col@${Math.round(c.x)}:${c.state||c.phase||'?'}`);
    return { x: Math.round(snap.player.x), y: Math.round(snap.player.y), vy: Math.round(snap.player.vy||0),
      d: snap.deaths, g: snap.player.grounded?1:0, jc: snap.jumpCount,
      i: `${inp&&inp.left?'L':''}${inp&&inp.right?'R':''}${inp&&inp.jump?'J':''}${inp&&inp.shoot?'S':''}`, hz: hz.join(' '), lifts: lifts.join(' '), bombs: bombs.join(' '), cols: cols.join(' ') };
  });
  if (s) {
    if (s.x > maxX) maxX = s.x;
    if (s.d !== lastD) {
      console.log(`--- deaths=${s.d} lastX=${lastX} maxX=${maxX} ---`);
      for (const q of hist.slice(-4)) console.log('  pre: ' + q);
      lastD = s.d; if (s.d >= 4) break;
    }
    lastX = s.x;
    const line = `t=${((Date.now()-t0)/1000).toFixed(1)} ${s.x},${s.y} vy=${s.vy} g=${s.g} jc=${s.jc} in=${s.i} | ${s.hz} | ${s.lifts} | ${s.bombs} | ${s.cols}`;
    hist.push(line); if (hist.length > 8) hist.shift();
    console.log(line);
  }
  await page.waitForTimeout(150);
}
console.log('MAXX', maxX);
await browser.close();
