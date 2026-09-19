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

/** In-page heuristic pilot. Serialized into the browser; no Node closures. */
// eslint-disable-next-line max-lines-per-function
export function installInPagePilot() {
    if (window.__spaceChickenPilotInstalled) {
        return true;
    }

    function supportAt(x, y, platforms) {
        for (let i = 0; i < platforms.length; i++) {
            const plat = platforms[i];
            if (x >= plat.left && x <= plat.right && y <= plat.top + 55 && y >= plat.top - 100) {
                return plat;
            }
        }
        return null;
    }

    function lockedLevel() {
        try {
            const locked = Number(new URLSearchParams(location.search || '').get('level'));
            return Number.isFinite(locked) && locked > 0 ? locked : null;
        } catch (err) {
            return null;
        }
    }

    function yOverlaps(py, item, pad) {
        const height = item.h || 0;
        const top = item.top != null ? item.top : item.y - height / 2;
        return py + 22 > top - pad && py - 22 < top + height + pad;
    }

    function columnAhead(px, py, dir, snap) {
        const reach = 82;
        const columns = snap.columns || [];
        for (let i = 0; i < columns.length; i++) {
            const dx = columns[i].x - px;
            if (dx * dir > 6 && dx * dir < reach) {
                return true;
            }
        }
        const hazards = snap.hazards || [];
        for (let i = 0; i < hazards.length; i++) {
            const item = hazards[i];
            if (!item.active || item.enable === false || (item.h || 0) < 160) {
                continue;
            }
            const dx = item.x - px;
            if (dx * dir > 6 && dx * dir < reach && yOverlaps(py, item, 8)) {
                return true;
            }
        }
        return false;
    }

    function hazardInPath(px, py, dir, hazards, bombs, reach) {
        const items = hazards.concat(bombs);
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.active || item.enable === false) {
                continue;
            }
            const dx = item.x - px;
            if (dx * dir <= 8 || dx * dir >= reach) {
                continue;
            }
            if (yOverlaps(py, item, 18)) {
                return item;
            }
        }
        return null;
    }

    function isHopable(item) {
        return (item.w || 0) < 80 && (item.h || 0) < 60;
    }

    function nextPlatform(px, py, dir, platforms) {
        let bestHigh = null;
        let bestHighDist = Infinity;
        let best = null;
        let bestDist = Infinity;
        for (let i = 0; i < platforms.length; i++) {
            const plat = platforms[i];
            const edge = dir > 0 ? plat.left : plat.right;
            const dist = (edge - px) * dir;
            if (dist < 8 || dist > 260) {
                continue;
            }
            if (dist < bestDist) {
                best = plat;
                bestDist = dist;
            }
            if ((plat.w || 0) > 400) {
                continue;
            }
            if (plat.top < py - 20 && dist < bestHighDist) {
                bestHigh = plat;
                bestHighDist = dist;
            }
        }
        return bestHigh || best;
    }

    // eslint-disable-next-line complexity
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
        if (snap.gameOver || snap.pendingLevel != null || snap.dying) {
            return input;
        }
        const player = snap.player;
        const platforms = snap.platforms || [];
        const crown = snap.crown || { x: player.x + 200, y: player.y };
        const dx = crown.x - player.x;
        const dir = dx === 0 ? 1 : Math.sign(dx);
        if (columnAhead(player.x, player.y, dir, snap)) {
            return input;
        }
        const blocker = hazardInPath(
            player.x,
            player.y,
            dir,
            snap.hazards || [],
            snap.bombs || [],
            70
        );
        if (blocker && !isHopable(blocker)) {
            return input;
        }
        const under = supportAt(player.x, player.y + 6, platforms);
        const ahead = supportAt(player.x + dir * 56, player.y + 6, platforms);
        const landing = nextPlatform(player.x, player.y, dir, platforms);
        if (under && landing && under.top - landing.top > 200 && player.grounded) {
            if (player.x > under.x + 10) {
                input.left = true;
            } else if (player.x < under.x - 10) {
                input.right = true;
            }
            return input;
        }
        const falling = player.vy > 28;
        if (blocker && isHopable(blocker)) {
            const dist = Math.abs(blocker.x - player.x);
            input.right = dx > 10 && (dist > 44 || !player.grounded);
            input.left = dx < -10 && (dist > 44 || !player.grounded);
            input.jump = player.grounded;
            return input;
        }
        input.right = dx > 10;
        input.left = dx < -10;
        const stepUp = Boolean(
            landing &&
            player.grounded &&
            landing.top < player.y - 28 &&
            landing.top > player.y - 230
        );
        const grabCrown = Math.abs(dx) < 180 && player.y > crown.y + 18 && player.y < crown.y + 240;
        const gap = !ahead;
        const shouldJump = gap || stepUp || grabCrown;
        const canDouble =
            !player.grounded && falling && grabCrown && snap.jumpCount < snap.maxJumps;
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
            let outcome = null;
            if (snap.gameOver) {
                outcome = 'win';
            } else if (snap.pendingLevel != null) {
                outcome = lockedLevel() != null ? 'win' : 'advance';
            }
            if (outcome) {
                window.__spaceChickenPilotOutcome = outcome;
                debug.setBotInput({ left: false, right: false, jump: false, start: false });
                return;
            }
            const input = decide(snap);
            window.__spaceChickenPilotLastInput = input;
            debug.setBotInput(input);
        } catch (err) {
            window.__spaceChickenPilotError = String(err && err.message ? err.message : err);
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
