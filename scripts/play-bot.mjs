/**
 * Space Chicken play-test bot — Playwright pilot, same shape as NovaWing.
 *
 * The decision brain runs inside the page (rAF) so jump/gap timing is one
 * frame, not a Playwright round-trip. Node only logs and waits for outcome.
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

/** In-page heuristic pilot. Serialized into the browser; no Node closures. */
export function installInPagePilot() {
    if (window.__spaceChickenPilotInstalled) {
        return true;
    }

    function supportAt(x, y, platforms) {
        for (let i = 0; i < platforms.length; i++) {
            const plat = platforms[i];
            if (x >= plat.left && x <= plat.right && y <= plat.top + 55 && y >= plat.top - 100) {
                return true;
            }
        }
        return false;
    }

    function threatAhead(px, py, dir, hazards, bombs) {
        const items = hazards.concat(bombs);
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.active || item.enable === false) {
                continue;
            }
            const dx = item.x - px;
            if (dx * dir < -12) {
                continue;
            }
            if (Math.abs(dx) < 58 && Math.abs(item.y - py) < 72) {
                return true;
            }
        }
        return false;
    }

    function decide(snap) {
        const input = { left: false, right: false, jump: false, start: false };
        if (!snap || !snap.ready || !snap.player) {
            return input;
        }
        if (snap.awaitingStart) {
            input.start = true;
            input.jump = true;
            return input;
        }
        if (snap.transitioning || snap.gameOver) {
            return input;
        }
        const player = snap.player;
        const crown = snap.crown || { x: player.x + 200, y: player.y };
        const dx = crown.x - player.x;
        const dir = dx === 0 ? 1 : Math.sign(dx);
        const ahead = player.x + dir * 70;
        const hasSupport = supportAt(ahead, player.y + 6, snap.platforms || []);
        const hazard = threatAhead(player.x, player.y, dir, snap.hazards || [], snap.bombs || []);
        const needHeight = player.y > crown.y + 28;
        const falling = player.vy > 28;

        input.right = dx > 10;
        input.left = dx < -10;
        if (hazard && Math.abs(dx) > 40 && player.grounded) {
            input.right = dir > 0 ? false : input.right;
            input.left = dir < 0 ? false : input.left;
        }
        const shouldJump = !hasSupport || hazard || needHeight;
        const canDouble = !player.grounded && falling && snap.jumpCount < snap.maxJumps;
        input.jump = shouldJump && (player.grounded || canDouble);
        return input;
    }

    function tick() {
        try {
            const debug = window.__spaceChickenDebug;
            if (!debug || !debug.getBotSnapshot) {
                return;
            }
            const snap = debug.getBotSnapshot();
            window.__spaceChickenPilotLastSnap = snap;
            if (!snap || !snap.ready) {
                return;
            }
            if (snap.gameOver) {
                window.__spaceChickenPilotOutcome = 'win';
                debug.setBotInput({ left: false, right: false, jump: false, start: false });
                return;
            }
            if (snap.transitioning && snap.nextLevel && snap.nextLevel !== snap.level) {
                window.__spaceChickenPilotOutcome = processLevelLock() != null ? 'win' : 'advance';
            }
            const input = decide(snap);
            window.__spaceChickenPilotLastInput = input;
            debug.setBotInput(input);
        } catch (err) {
            window.__spaceChickenPilotError = String(err && err.message ? err.message : err);
        }
    }

    function processLevelLock() {
        try {
            const query = new URLSearchParams(location.search || '');
            const locked = Number(query.get('level'));
            return Number.isFinite(locked) && locked > 0 ? locked : null;
        } catch (err) {
            return null;
        }
    }

    function loop() {
        tick();
        window.__spaceChickenPilotRaf = requestAnimationFrame(loop);
    }

    window.__spaceChickenPilotOutcome = null;
    window.__spaceChickenPilotError = null;
    window.__spaceChickenPilotLastSnap = null;
    window.__spaceChickenPilotLastInput = null;
    window.__spaceChickenPilotInstalled = true;
    window.__spaceChickenPilotStop = function () {
        if (window.__spaceChickenPilotRaf) {
            cancelAnimationFrame(window.__spaceChickenPilotRaf);
        }
        window.__spaceChickenPilotRaf = null;
        if (window.__spaceChickenDebug && window.__spaceChickenDebug.clearBotInput) {
            window.__spaceChickenDebug.clearBotInput();
        }
    };
    window.__spaceChickenPilotRaf = requestAnimationFrame(loop);
    return true;
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

    const installed = await page.evaluate(installInPagePilot);
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
                        `${input.right ? '>' : ''}${input.left ? '<' : ''}${input.jump ? '^' : ''}`
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
