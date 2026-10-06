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

    // Contra aim distilled from the L7 JEV traces: bolts fly horizontally
    // from your facing with ~820px range, so hold fire while a live boarder
    // (cyan chest ring) is ahead of you and roughly level. Gated on the
    // level flag so non-phaser levels behave exactly as before. Returns the
    // nearest in-lane boarder distance ahead, or -1 when the lane is clear.
    function boarderAhead(player, dir, snap) {
        if (!snap || snap.phaser !== true) {
            return -1;
        }
        let nearest = -1;
        const hazards = snap.hazards || [];
        for (let i = 0; i < hazards.length; i++) {
            const item = hazards[i];
            if (!item || item.type !== 'boarder' || !item.active || item.enable === false) {
                continue;
            }
            const ahead = (item.x - player.x) * dir;
            if (ahead > 0 && ahead <= 820 && Math.abs(item.y - player.y) < 70) {
                nearest = nearest < 0 ? ahead : Math.min(nearest, ahead);
            }
        }
        return nearest;
    }

    function shouldShoot(player, dir, snap) {
        return boarderAhead(player, dir, snap) >= 0;
    }

    // One-shot air jump: a held jump only edge-fires, so re-arm on landing
    // and spend exactly one airborne jump per airtime (double-jump saves).
    let jumpArmed = true;
    let suppressRecovery = false;

    // Closest live hazard or bomb in any direction within radius, or null.
    function nearestThreat(px, py, snap, radius) {
        let best = null;
        let bestDist = radius;
        const lists = [snap.hazards || [], snap.bombs || []];
        for (let l = 0; l < lists.length; l++) {
            const items = lists[l];
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (!item || !item.active || item.enable === false) {
                    continue;
                }
                const dist = Math.hypot(item.x - px, item.y - py);
                if (dist < bestDist) {
                    bestDist = dist;
                    best = item;
                }
            }
        }
        return best;
    }

    // A bomb falling onto our head: which way to sidestep (-1/0/1).
    // Grounded only; never dodge blind.
    function bombDodge(player, snap) {
        if (!player.grounded) {
            return 0;
        }
        const bombs = snap.bombs || [];
        for (let i = 0; i < bombs.length; i++) {
            const bomb = bombs[i];
            if (!bomb || !bomb.active || bomb.enable === false) {
                continue;
            }
            if ((bomb.vy || 0) <= 0) {
                continue;
            }
            const dx = bomb.x - player.x;
            const above = player.y - bomb.y;
            if (Math.abs(dx) < 55 && above > 0 && above < 280) {
                return dx >= 0 ? -1 : 1;
            }
        }
        return 0;
    }

    // Lethal, non-stompable hazard squatting on the landing spot.
    function landingThreat(landing, snap) {
        if (!landing) {
            return null;
        }
        const hazards = snap.hazards || [];
        for (let i = 0; i < hazards.length; i++) {
            const item = hazards[i];
            if (!item || !item.active || item.enable === false || item.bonkable) {
                continue;
            }
            if (Math.abs(item.x - landing.x) < 90 && Math.abs(item.y - landing.top) < 130) {
                return item;
            }
        }
        return null;
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
        const input = { left: false, right: false, jump: false, shoot: false, start: false };
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
        if (player.grounded) {
            jumpArmed = true;
        }
        const platforms = snap.platforms || [];
        const crown = snap.crown || { x: player.x + 200, y: player.y };
        const dx = crown.x - player.x;
        const dir = dx === 0 ? 1 : Math.sign(dx);
        const shooting = shouldShoot(player, dir, snap);
        input.shoot = shooting;
        if (nearestThreat(player.x, player.y, snap, 150)) {
            suppressRecovery = true;
        }
        // Bombs rain from above: sidestep on solid ground, never into a gap.
        const dodge = bombDodge(player, snap);
        if (dodge !== 0) {
            if (supportAt(player.x + dodge * 56, player.y + 6, platforms)) {
                input.left = dodge < 0;
                input.right = dodge > 0;
                return input;
            }
        }
        if (columnAhead(player.x, player.y, dir, snap)) {
            return input;
        }
        // Close boarder in the firing lane: stop, hop straight up over its
        // leap, keep the gun on it. Standing still preserves facing.
        const laneDist = boarderAhead(player, dir, snap);
        if (shooting && laneDist >= 0 && laneDist < 110 && player.grounded) {
            input.jump = true;
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
            if (blocker.bonkable) {
                // Stomp it: only hop when positioned to land on top.
                input.right = dx > 10 && (dist > 44 || !player.grounded);
                input.left = dx < -10 && (dist > 44 || !player.grounded);
                input.jump = player.grounded;
                return input;
            }
            const engaging = shooting && blocker.type === 'boarder';
            if (engaging) {
                // Gun it down first; jumping in just trades.
                input.right = dx > 10;
                input.left = dx < -10;
                return input;
            }
            if (dist > 45) {
                // Leap over drones, rollers, rovers: take off early, keep running.
                input.right = dx > 10;
                input.left = dx < -10;
                input.jump = player.grounded;
                return input;
            }
            // Too close to clear: hold and let patrols pass.
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
        // Final-approach hops only: when the crown is close, hop toward it
        // instead of running underneath. (An unrestricted climb-above rule
        // turned the pilot into a pogo stick: airborne bolts fly over
        // boarder heads while bombs and chasers connect. Ascents are
        // covered by stepUp/grabCrown.)
        const closePush = player.grounded && Math.abs(dx) < 150;
        // Don't leap into a landing occupied by something lethal. A boarder
        // already under fire may still die first, so only wait those out.
        if (gap && player.grounded) {
            const squatter = landingThreat(landing, snap);
            if (squatter && !(squatter.type === 'boarder' && shooting && laneDist < 400)) {
                return input;
            }
        }
        const shouldJump = gap || stepUp || grabCrown || closePush;
        const canDouble =
            !player.grounded &&
            falling &&
            (gap || stepUp || grabCrown) &&
            snap.jumpCount < snap.maxJumps;
        if (player.grounded) {
            input.jump = shouldJump;
        } else if (canDouble && jumpArmed) {
            input.jump = true;
            jumpArmed = false;
        }
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
                debug.setBotInput({
                    left: false,
                    right: false,
                    jump: false,
                    shoot: false,
                    start: false,
                });
                return;
            }
            const input = decide(snap);
            applyStuckRecovery(snap, input, suppressRecovery);
            window.__spaceChickenPilotLastInput = input;
            debug.setBotInput(input);
        } catch (err) {
            window.__spaceChickenPilotError = String(err && err.message ? err.message : err);
        }
    }

    // Distilled from fresh JEV traces (.jev-runs/level-2, ~21 move_left
    // backtracks when stalled): if the pilot makes no horizontal progress
    // for a while, hop away from the goal briefly instead of stalling.
    let stuckFromX = null;
    let stuckFromT = 0;
    let recoverUntil = 0;

    function applyStuckRecovery(snap, input, suppressed) {
        const now = Date.now();
        const px = snap.player ? snap.player.x : null;
        if (
            px == null ||
            snap.awaitingStart ||
            snap.gameOver ||
            snap.pendingLevel != null ||
            snap.dying
        ) {
            return;
        }
        if (stuckFromX == null || Math.abs(px - stuckFromX) > 24) {
            stuckFromX = px;
            stuckFromT = now;
        } else if (now - stuckFromT > 2500) {
            recoverUntil = now + 900;
            stuckFromX = px;
            stuckFromT = now;
        }
        if (now < recoverUntil && !suppressed) {
            const away = snap.crown && snap.player && snap.crown.x < snap.player.x ? 1 : -1;
            input.left = away < 0;
            input.right = away > 0;
            input.jump = Boolean(snap.player && snap.player.grounded);
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
