/**
 * Hop-assist bot run: the in-page pilot plus scheduled rescue teleports
 * for sections the pilot cannot traverse yet (e.g. climbs it never
 * learned). A hop only fires when the pilot is still behind the rescue
 * point, so assisted runs stay honest about what the pilot cleared alone.
 *
 *   node scripts/pilot-hop.mjs <level> <outdir> <durationSec> "t:x,y;..."
 *   LEVEL=5 HOPS="20:700,600" HOP_DURATION_SEC=120 node scripts/pilot-hop.mjs
 *
 * Requires the game server (npm start) on SPACE_CHICKEN_URL.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { buildPilotSource } from './pilot-brain.mjs';
import { resolveChromeExecutable } from './chrome-path.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const level = process.argv[2] || process.env.LEVEL;
const outdir = process.argv[3] || process.env.HOP_OUT || '.bot-runs/hop';
const durationSec = Number(process.argv[4] || process.env.HOP_DURATION_SEC || 180);
const scheduleRaw = process.argv[5] || process.env.HOPS || '';
if (!level) {
    console.error('usage: node scripts/pilot-hop.mjs <level> <outdir> <durationSec> "t:x,y;..."');
    process.exit(2);
}
mkdirSync(outdir, { recursive: true });
const hops = scheduleRaw
    .split(';')
    .filter(Boolean)
    .map((entry) => {
        const [t, x, y] = entry.split(/[:,]/).map(Number);
        return { t, x, y, done: false };
    });

const executablePath = resolveChromeExecutable();
if (!executablePath) {
    throw new Error('No cached Playwright chromium found; set PLAYWRIGHT_CHROME.');
}
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', (err) => console.error('[pageerror]', err.message || err));
    const url = new URL(process.env.SPACE_CHICKEN_URL || 'http://127.0.0.1:3000/');
    url.searchParams.set('bot', String(Date.now()));
    url.searchParams.set('level', String(level));
    await page.goto(url.toString(), { waitUntil: 'load', timeout: 45000 });
    await page.waitForFunction(
        () =>
            window.__spaceChickenDebug &&
            typeof window.__spaceChickenDebug.getBotSnapshot === 'function' &&
            window.__spaceChickenDebug.ready()
    );
    await page
        .locator('#phaser-game canvas')
        .click({ position: { x: 640, y: 360 } })
        .catch(() => {});
    await page.waitForTimeout(300);
    if (!(await page.evaluate(buildPilotSource()))) {
        throw new Error('pilot install failed');
    }
    console.log('pilot installed');
    const started = Date.now();
    let lastLog = 0;
    let won = false;
    while (Date.now() - started < durationSec * 1000) {
        const status = await page.evaluate(() => ({
            snap: window.__spaceChickenPilotLastSnap,
            outcome: window.__spaceChickenPilotOutcome,
            error: window.__spaceChickenPilotError,
        }));
        if (status.error) {
            console.error('[pilot]', status.error);
            break;
        }
        const elapsed = (Date.now() - started) / 1000;
        for (const hop of hops) {
            if (!hop.done && elapsed >= hop.t) {
                hop.done = true;
                const px = status.snap?.player?.x ?? 0;
                if (px < hop.x - 200) {
                    await page.evaluate(
                        ([hx, hy]) => {
                            window.SPACE_CHICKEN_GAME.scene
                                .getScenes(true)[0]
                                .debugTeleport(hx, hy);
                        },
                        [hop.x, hop.y]
                    );
                    await page.screenshot({ path: join(outdir, `hop-${hop.t}s.png`) });
                    console.log(`hop at t=${elapsed.toFixed(0)}s -> (${hop.x},${hop.y})`);
                } else {
                    console.log(`hop at t=${elapsed.toFixed(0)}s skipped (x=${px.toFixed(0)})`);
                }
            }
        }
        if (process.env.REPORT_CHECKPOINT && elapsed - lastLog > 8) {
            const checkpoint = await page.evaluate(() => {
                const scene = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0];
                return { cpIndex: scene.checkpointIndex, respawn: scene.respawnPoint || null };
            });
            console.log(`checkpoint: ${JSON.stringify(checkpoint)}`);
        }
        if (status.outcome === 'win' || status.outcome === 'advance') {
            won = true;
            break;
        }
        if (elapsed - lastLog > 8) {
            lastLog = elapsed;
            const snap = status.snap;
            console.log(
                `t=${elapsed.toFixed(0)}s L${level} deaths=${snap?.deaths ?? '?'} ` +
                    `x=${snap?.player?.x?.toFixed(0) ?? '-'} y=${snap?.player?.y?.toFixed(0) ?? '-'}`
            );
        }
        await page.waitForTimeout(500);
    }
    await page.screenshot({ path: join(outdir, 'hop-final.png') });
    console.log(won ? 'HOP RESULT: won' : 'HOP RESULT: not won');
    if (!won) {
        process.exitCode = 1;
    }
} finally {
    await browser.close();
}
