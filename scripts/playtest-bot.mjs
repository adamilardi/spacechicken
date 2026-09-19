/**
 * Space Chicken playtester — coverage + bug hunting (not a speedrun).
 *
 * Plays each level with the in-page pilot and records anomalies:
 * NaN positions, stuck death transitions, falling through the world,
 * missing HUD, page exceptions, exploded scale, pause leaks.
 *
 *   npm run playtest
 *   SCENARIO=all npm run playtest
 *   SCENARIO=l1-play,death-gap HEADLESS=0 npm run playtest
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { installInPagePilot } from './play-bot.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.SPACE_CHICKEN_URL || 'http://127.0.0.1:3000/';
const HAS_DISPLAY = Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
const HEADLESS =
    process.env.HEADLESS === '0' ? false : process.env.HEADLESS === '1' ? true : !HAS_DISPLAY;
const CACHED_CHROME =
    process.env.PLAYWRIGHT_CHROME ||
    '/home/adam/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const OUT_DIR = process.env.PLAYTEST_OUT || path.join(__dirname, '..', '.bot-runs');

export const SCENARIOS = {
    'l1-play': { level: 1, durationMs: 25000, description: 'Play toward the level 1 crown' },
    'l2-play': { level: 2, durationMs: 30000, description: 'Play toward the level 2 crown' },
    'l3-play': { level: 3, durationMs: 30000, description: 'Ride lifts and dodge lasers' },
    'l4-play': { level: 4, durationMs: 30000, description: 'Moon platforms, rovers, rays' },
    'death-gap': {
        level: 1,
        durationMs: 12000,
        chaos: 'gap',
        description: 'Walk into a floor gap',
    },
    resize: {
        level: 1,
        durationMs: 10000,
        chaos: 'resize',
        description: 'Play, then resize the viewport',
    },
    chaos: {
        level: 3,
        durationMs: 16000,
        chaos: 'random',
        description: 'Random jumps and direction flips',
    },
};

function parseScenarioList() {
    const raw = String(process.env.SCENARIO || process.env.SCENARIOS || 'all');
    if (raw === 'all') {
        return Object.keys(SCENARIOS);
    }
    return raw
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name && SCENARIOS[name]);
}

export function installInPageWatchdog() {
    if (window.__spaceChickenWatchdogInstalled) {
        return true;
    }
    const bugs = [];
    let lastX = null;
    let stuckMs = 0;
    let transitionMs = 0;
    let lastDeaths = 0;
    let lastTick = performance.now();

    function note(kind, detail) {
        const now = performance.now();
        const recent = bugs[bugs.length - 1];
        if (recent && recent.kind === kind && now - recent.at < 1200) {
            return;
        }
        if (bugs.length > 40) {
            return;
        }
        bugs.push({ kind, detail: detail || null, at: Math.round(now) });
    }

    // eslint-disable-next-line complexity
    function inspectPlayer(snap, input, dt) {
        const player = snap.player;
        if (!player) {
            if (snap.hasStartedPlay && !snap.hasCleanedUp) {
                note('missing_player', { level: snap.level });
            }
            return;
        }
        if (!Number.isFinite(player.x) || !Number.isFinite(player.y)) {
            note('nan_position', { x: player.x, y: player.y, level: snap.level });
        }
        if (snap.worldWidth && (player.x < -120 || player.x > snap.worldWidth + 120)) {
            note('out_of_world', { x: player.x, y: player.y, level: snap.level });
        }
        const fallingDead =
            snap.killZoneY &&
            player.y > snap.killZoneY + 80 &&
            !snap.transitioning &&
            !snap.gameOver &&
            !snap.awaitingStart &&
            player.bodyEnable;
        if (fallingDead) {
            note('fell_through', { x: player.x, y: player.y, killZoneY: snap.killZoneY });
        }
        if (
            snap.hasStartedPlay &&
            !snap.transitioning &&
            !snap.awaitingStart &&
            (player.visible === false || player.alpha === 0)
        ) {
            note('invisible_player', { alpha: player.alpha, visible: player.visible });
        }
        if (Math.abs(player.scaleX) > 3 || Math.abs(player.scaleY) > 3) {
            note('exploded_scale', { scaleX: player.scaleX, scaleY: player.scaleY });
        }
        const pushing =
            input &&
            (input.right || input.left) &&
            player.grounded &&
            !snap.transitioning &&
            lastX != null &&
            Math.abs(player.x - lastX) < 0.4;
        stuckMs = pushing ? stuckMs + dt : 0;
        if (stuckMs > 2500) {
            note('stuck_on_geometry', { x: Math.round(player.x), y: Math.round(player.y) });
            stuckMs = 0;
        }
        lastX = player.x;
    }

    function inspect(snap, input) {
        const now = performance.now();
        const dt = Math.min(100, now - lastTick);
        lastTick = now;
        if (!snap || !snap.ready) {
            return;
        }
        inspectPlayer(snap, input, dt);
        transitionMs = snap.transitioning ? transitionMs + dt : 0;
        if (transitionMs > 2200) {
            note('stuck_transition', { deaths: snap.deaths, level: snap.level });
            transitionMs = 0;
        }
        if (snap.hasStartedPlay && (!snap.hud || !snap.hud.timer || !snap.hud.deaths)) {
            note('hud_missing', snap.hud);
        }
        if (snap.physicsPaused && !snap.gameOver && !snap.transitioning) {
            note('physics_paused', { level: snap.level });
        }
        if (snap.deaths < lastDeaths) {
            note('death_count_went_backwards', { from: lastDeaths, to: snap.deaths });
        }
        lastDeaths = snap.deaths || 0;
    }

    function tick() {
        try {
            const debug = window.__spaceChickenDebug;
            const snap =
                debug && debug.getBotSnapshot
                    ? debug.getBotSnapshot()
                    : window.__spaceChickenPilotLastSnap;
            const input = window.__spaceChickenPilotLastInput;
            inspect(snap, input);
        } catch (err) {
            note('watchdog_error', String(err && err.message ? err.message : err));
        }
        window.__spaceChickenWatchdogRaf = requestAnimationFrame(tick);
    }

    window.__spaceChickenWatchdogBugs = bugs;
    window.__spaceChickenWatchdogInstalled = true;
    window.__spaceChickenWatchdogStop = function () {
        if (window.__spaceChickenWatchdogRaf) {
            cancelAnimationFrame(window.__spaceChickenWatchdogRaf);
        }
        window.__spaceChickenWatchdogRaf = null;
    };
    window.__spaceChickenWatchdogRaf = requestAnimationFrame(tick);
    return true;
}

async function launchBrowser() {
    const options = {
        headless: HEADLESS,
        args: [
            '--use-gl=swiftshader',
            '--ignore-gpu-blocklist',
            '--no-sandbox',
            '--autoplay-policy=no-user-gesture-required',
        ],
    };
    if (fs.existsSync(CACHED_CHROME)) {
        options.executablePath = CACHED_CHROME;
    }
    return chromium.launch(options);
}

function applyChaos(page, scenario, started) {
    if (scenario.chaos === 'gap') {
        return page.evaluate(() => {
            if (window.__spaceChickenDebug && window.__spaceChickenDebug.setBotInput) {
                window.__spaceChickenDebug.setBotInput({
                    right: true,
                    left: false,
                    jump: false,
                    start: true,
                });
            }
        });
    }
    if (scenario.chaos === 'random' && Math.random() < 0.08) {
        return page.evaluate(() => {
            window.__spaceChickenDebug.setBotInput({
                right: Math.random() > 0.35,
                left: Math.random() > 0.8,
                jump: Math.random() > 0.45,
                start: true,
            });
        });
    }
    if (scenario.chaos === 'resize' && Date.now() - started > 4000) {
        scenario.chaos = null;
        return page.setViewportSize({ width: 390, height: 844 });
    }
    return Promise.resolve();
}

function scenarioResult(name, scenario, result, shot) {
    const unique = [...new Set(result.bugs.map((bug) => bug.kind))];
    const finished = result.outcome === 'win' || result.outcome === 'advance';
    if (scenario.requireWin && !finished) {
        result.bugs.push({
            kind: 'did_not_finish',
            detail: {
                outcome: result.outcome || null,
                x: result.snap && result.snap.player && Math.round(result.snap.player.x),
                y: result.snap && result.snap.player && Math.round(result.snap.player.y),
                deaths: result.snap && result.snap.deaths,
            },
        });
        unique.push('did_not_finish');
    }
    return {
        name,
        description: scenario.description,
        ok: unique.length === 0,
        bugs: result.bugs,
        kinds: unique,
        outcome: result.outcome,
        level: result.snap && result.snap.level,
        deaths: result.snap && result.snap.deaths,
        x: result.snap && result.snap.player && Math.round(result.snap.player.x),
        y: result.snap && result.snap.player && Math.round(result.snap.player.y),
        screenshot: shot,
    };
}

async function runScenario(browser, name, scenario) {
    const url = new URL(BASE);
    url.searchParams.set('bot', String(Date.now()));
    url.searchParams.set('debug', '1');
    url.searchParams.set('playtest', name);
    url.searchParams.set('level', String(scenario.level));
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(String(err && err.message ? err.message : err)));

    const response = await page.goto(url.toString(), { waitUntil: 'load', timeout: 45000 });
    if (!response || !response.ok()) {
        await context.close();
        return {
            name,
            ok: false,
            bugs: [{ kind: 'failed_to_load', detail: response && response.status() }],
        };
    }

    await page.waitForFunction(
        () => window.__spaceChickenDebug && window.__spaceChickenDebug.ready(),
        null,
        { timeout: 25000 }
    );
    await page
        .locator('#phaser-game canvas')
        .click({ position: { x: 640, y: 360 } })
        .catch(() => {});
    if (scenario.chaos !== 'gap') {
        await page.evaluate(installInPagePilot);
    }
    await page.evaluate(installInPageWatchdog);

    const started = Date.now();
    while (Date.now() - started < scenario.durationMs) {
        await applyChaos(page, scenario, started);
        const status = await page.evaluate(() => ({
            outcome: window.__spaceChickenPilotOutcome,
        }));
        if (status.outcome === 'win' || status.outcome === 'advance') {
            break;
        }
        await page.waitForTimeout(150);
    }

    const result = await page.evaluate(() => ({
        bugs: (window.__spaceChickenWatchdogBugs || []).slice(),
        snap: window.__spaceChickenPilotLastSnap,
        outcome: window.__spaceChickenPilotOutcome,
    }));
    result.pageErrors = pageErrors;
    if (pageErrors.length) {
        result.bugs.push({ kind: 'pageerror', detail: pageErrors[0] });
    }
    const shot = path.join(OUT_DIR, `playtest-${name}.png`);
    fs.mkdirSync(OUT_DIR, { recursive: true });
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    await context.close();
    return scenarioResult(name, scenario, result, shot);
}

async function main() {
    const names = parseScenarioList();
    console.log('Space Chicken playtester (bug hunt)');
    console.log(`URL: ${BASE}`);
    console.log(`scenarios=${names.join(',')}`);
    fs.mkdirSync(OUT_DIR, { recursive: true });

    const browser = await launchBrowser();
    const results = [];
    try {
        for (const name of names) {
            console.log(`\n=== ${name}: ${SCENARIOS[name].description} ===`);
            const result = await runScenario(browser, name, SCENARIOS[name]);
            results.push(result);
            if (result.ok) {
                console.log(`PASS  ${name}  deaths=${result.deaths} pos=${result.x},${result.y}`);
            } else {
                console.log(`FAIL  ${name}  bugs=${result.kinds.join(',')}`);
                result.bugs.slice(0, 6).forEach((bug) => {
                    console.log(`      - ${bug.kind}`, bug.detail || '');
                });
            }
        }
    } finally {
        await browser.close();
    }

    const report = { when: new Date().toISOString(), results };
    fs.writeFileSync(path.join(OUT_DIR, 'playtest-report.json'), JSON.stringify(report, null, 2));
    const failed = results.filter((result) => !result.ok);
    console.log(`\n${results.length - failed.length}/${results.length} scenarios clean`);
    if (failed.length) {
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
