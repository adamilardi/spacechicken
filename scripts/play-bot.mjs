/**
 * Space Chicken play-test bot — Playwright pilot, same shape as NovaWing.
 *
 * The decision brain (scripts/pilot-brain.mjs) runs inside the page (rAF)
 * so jump/gap timing is one frame, not a Playwright round-trip. Node only
 * logs and waits for outcome.
 *
 *   npm run bot
 *   npm run bot:headed
 *   LEVEL=2 npm run bot
 *   TRIALS=5 npm run bot
 *   HEADLESS=0 RECORD_VIDEO=1 npm run bot
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildPilotSource } from './pilot-brain.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.SPACE_CHICKEN_URL || 'http://127.0.0.1:3000/';
const HAS_DISPLAY = Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
const HEADLESS =
    process.env.HEADLESS === '0' ? false : process.env.HEADLESS === '1' ? true : !HAS_DISPLAY;
const DURATION_MS = Number(process.env.DURATION_MS || 180000);
const LOG_MS = Number(process.env.LOG_MS || 2000);
const TRIALS = Math.max(1, Number(process.env.TRIALS || 1));
const CACHED_CHROME =
    process.env.PLAYWRIGHT_CHROME ||
    '/home/adam/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const SCREENSHOT_DIR = process.env.BOT_SCREENSHOT_DIR || path.join(__dirname, '..', '.bot-runs');
const RECORD_VIDEO = process.env.RECORD_VIDEO === '1';

export function outcomeFromSnapshot(snap, lockedLevel) {
    if (!snap) {
        return null;
    }
    if (snap.gameOver) {
        return 'win';
    }
    if (snap.pendingLevel != null) {
        return lockedLevel != null ? 'win' : 'advance';
    }
    return null;
}

async function waitForGame(page, timeout = 25000) {
    await page.waitForFunction(
        () =>
            window.__spaceChickenDebug &&
            typeof window.__spaceChickenDebug.getBotSnapshot === 'function' &&
            window.__spaceChickenDebug.ready(),
        null,
        { timeout }
    );
}

// eslint-disable-next-line complexity
async function runOnce(browser, trialIndex) {
    const url = new URL(BASE);
    url.searchParams.set('bot', String(Date.now()));
    url.searchParams.set('trial', String(trialIndex));
    if (process.env.LEVEL) {
        url.searchParams.set('level', String(process.env.LEVEL));
    }

    const videoDir = path.join(SCREENSHOT_DIR, 'video');
    if (RECORD_VIDEO) {
        fs.mkdirSync(videoDir, { recursive: true });
    }
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
        recordVideo: RECORD_VIDEO
            ? { dir: videoDir, size: { width: 1280, height: 720 } }
            : undefined,
    });
    const page = await context.newPage();
    page.on('pageerror', (err) => console.error('[pageerror]', err.message || err));

    const resp = await page.goto(url.toString(), { waitUntil: 'load', timeout: 45000 });
    if (!resp || !resp.ok()) {
        throw new Error(`Failed to load game: ${resp && resp.status()}`);
    }

    await waitForGame(page);
    await page
        .locator('#phaser-game canvas')
        .click({ position: { x: 640, y: 360 } })
        .catch(() => {});
    await page.waitForTimeout(120);

    const installed = await page.evaluate(buildPilotSource());
    if (!installed) {
        throw new Error('Failed to install in-page pilot');
    }
    console.log(`[trial ${trialIndex}] in-page pilot installed`);

    const started = Date.now();
    let lastLog = 0;
    let finalSnap = null;
    let won = false;
    let maxLevel = 1;
    let ticks = 0;

    try {
        while (Date.now() - started < DURATION_MS) {
            const status = await page.evaluate(() => ({
                snap: window.__spaceChickenPilotLastSnap,
                outcome: window.__spaceChickenPilotOutcome,
                error: window.__spaceChickenPilotError,
                input: window.__spaceChickenPilotLastInput,
            }));
            ticks += 1;
            if (status.error) {
                console.error('[pilot]', status.error);
            }
            const snap = status.snap;
            finalSnap = snap;
            if (snap && snap.level > maxLevel) {
                maxLevel = snap.level;
                console.log(`[bot t${trialIndex}] reached level ${snap.level}`);
            }
            const isolatedWin =
                status.outcome === 'win' ||
                (snap && snap.gameOver) ||
                (status.outcome === 'advance' && process.env.LEVEL);
            if (isolatedWin) {
                won = true;
                await page.waitForTimeout(500);
                break;
            }

            const now = Date.now();
            if (snap && now - lastLog > LOG_MS) {
                const el = ((snap.elapsedMs || 0) / 1000).toFixed(1);
                const input = status.input || {};
                console.log(
                    `[bot t${trialIndex}] t=${el}s L${snap.level} deaths=${snap.deaths} ` +
                        `x=${snap.player ? Math.round(snap.player.x) : '-'} ` +
                        `y=${snap.player ? Math.round(snap.player.y) : '-'} ` +
                        `${input.right ? '>' : ''}${input.left ? '<' : ''}${input.jump ? '^' : ''}${input.shoot ? '*' : ''}`
                );
                lastLog = now;
            }
            await page.waitForTimeout(100);
        }
    } finally {
        await page
            .evaluate(() => {
                if (window.__spaceChickenPilotStop) {
                    window.__spaceChickenPilotStop();
                }
            })
            .catch(() => {});
        await page
            .screenshot({
                path: path.join(SCREENSHOT_DIR, won ? 'win-final.png' : 'final.png'),
                fullPage: true,
            })
            .catch(() => {});
        await context.close();
    }

    const elapsedMs = finalSnap && finalSnap.elapsedMs ? finalSnap.elapsedMs : Date.now() - started;
    return {
        trial: trialIndex,
        won,
        level: finalSnap ? finalSnap.level : null,
        maxLevel,
        deaths: finalSnap ? finalSnap.deaths : null,
        gameOver: finalSnap ? finalSnap.gameOver : null,
        elapsedMs: Math.round(elapsedMs),
        elapsedSec: Number((elapsedMs / 1000).toFixed(2)),
        durationSec: Number(((Date.now() - started) / 1000).toFixed(1)),
        ticks,
    };
}

async function main() {
    console.log('Space Chicken play-test bot (in-page pilot)');
    console.log(`URL: ${BASE}`);
    console.log(
        `headless=${HEADLESS} trials=${TRIALS} duration=${DURATION_MS}ms video=${RECORD_VIDEO}`
    );
    if (process.env.LEVEL) {
        console.log(`start level=${process.env.LEVEL}`);
    }

    const launchOptions = {
        headless: HEADLESS,
        args: [
            '--use-gl=swiftshader',
            '--ignore-gpu-blocklist',
            '--no-sandbox',
            '--autoplay-policy=no-user-gesture-required',
        ],
    };
    if (fs.existsSync(CACHED_CHROME)) {
        launchOptions.executablePath = CACHED_CHROME;
    }

    const browser = await chromium.launch(launchOptions);
    const results = [];
    try {
        for (let i = 1; i <= TRIALS; i++) {
            console.log(`\n=== trial ${i}/${TRIALS} ===`);
            const result = await runOnce(browser, i);
            results.push(result);
            console.log(JSON.stringify(result));
        }
    } finally {
        await browser.close();
    }

    const wins = results.filter((result) => result.won).length;
    console.log(`\n${wins}/${results.length} trials won`);
    if (!wins) {
        process.exitCode = 1;
    }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    main().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
