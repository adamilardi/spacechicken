/**
 * Record a pilot+JEV baseline for behavior cloning.
 *
 * The coded pilot (scripts/pilot-brain.mjs) flies every 150ms, the same
 * game-time hold the policy uses. JEV is asked only when stuck recovery
 * changes the input, or the pilot has been holding still for 1.5s. The
 * request does not block the game: the pilot keeps acting until the answer
 * arrives, then that answer is reused for about a second.
 *
 *   npm run rl:baseline
 *   LEVELS="1 2" DURATION_MS=90000 SEED=11 npm run rl:baseline
 *
 * Writes rl/demos-baseline/jev-raw-L{n}-s{seed}-{ts}.jsonl in the
 * spacechicken-raw-obs format. The in-page rAF pilot is not installed;
 * it would overwrite test.act().
 */
import { chromium } from 'playwright';
import { TypeSafeClient } from '@typesafe-ai/sdk';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { LEVEL_IDS } from '../../levels/index.js';
import { applyStuckRecovery, createPilotState, decidePilotInput } from '../pilot-brain.mjs';
import { chooseJevAction, readTypeSafeApiKey } from '../jev-playtest.mjs';
import { ACTION_NAMES, OBS_VERSION, stepReward, terminalBonus } from './features.mjs';
import { launchBrowser } from './chrome.mjs';

const require = createRequire(import.meta.url);
const { createServer } = require('../../server.cjs');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

const SEED = Number(process.env.SEED || 1);
const TIMESCALE = Math.min(4, Math.max(1, Number(process.env.TIMESCALE || 1)));
const DURATION_MS = Number(process.env.DURATION_MS || 90000);
const DECISION_MS = Number(process.env.DECISION_MS || 150);
const OUT_DIR = process.env.DEMO_OUT || path.join(ROOT, 'rl', 'demos-baseline');
const HEADLESS = process.env.HEADLESS !== '0';

export const JEV_HOLD_MS = 1500;
export const JEV_CACHE_MS = 1000;

const flights = new Set();
let activeBrowser = null;
let activeServer = null;

function firstAllowed(allowed, names) {
    for (let i = 0; i < names.length; i += 1) {
        if (allowed.has(names[i])) return names[i];
    }
    return 'wait';
}

function horizontalDirection(input) {
    if (input.right && !input.left) return 'right';
    if (input.left && !input.right) return 'left';
    return '';
}

export function pilotInputToAction(input, availableActions) {
    const listed = Array.isArray(availableActions) && availableActions.length > 0;
    const allowed = new Set(listed ? availableActions : ACTION_NAMES);
    if (!input) return 'wait';
    if (input.start) return firstAllowed(allowed, ['start', 'wait']);
    const dir = horizontalDirection(input);
    // Shoot-and-move wins over jump-and-move: the gun is the coded answer
    // to a boarder. Jump with no direction is the close-range hop, which
    // the discrete set cannot combine with a shot.
    if (input.shoot && dir) {
        return firstAllowed(allowed, [`fire_${dir}`, 'fire', `move_${dir}`, 'wait']);
    }
    if (input.jump && dir) {
        return firstAllowed(allowed, [`jump_${dir}`, 'jump', `move_${dir}`, 'wait']);
    }
    if (input.shoot && input.jump) return firstAllowed(allowed, ['jump', 'fire', 'wait']);
    if (input.shoot) return firstAllowed(allowed, ['fire', 'wait']);
    if (input.jump) return firstAllowed(allowed, ['jump', 'wait']);
    if (dir) return firstAllowed(allowed, [`move_${dir}`, 'wait']);
    return 'wait';
}

export function isFullHold(input) {
    return !input || (!input.left && !input.right && !input.jump && !input.shoot && !input.start);
}

export function recoveryChangedInput(before, after) {
    if (!before || !after) return false;
    return before.left !== after.left || before.right !== after.right || before.jump !== after.jump;
}

export function shouldAskJev({
    recoveryChanged = false,
    holding = false,
    holdMs = 0,
    phase = 'playing',
} = {}) {
    if (phase !== 'playing') return false;
    if (recoveryChanged) return true;
    return Boolean(holding) && Number(holdMs) >= JEV_HOLD_MS;
}

export function threatNear(snap, radius = 150) {
    const player = snap && snap.player;
    if (!player || !Number.isFinite(player.x) || !Number.isFinite(player.y)) return false;
    const items = [].concat(snap.hazards || [], snap.bombs || []);
    for (const item of items) {
        if (!item || item.active === false || item.enable === false) continue;
        if (!Number.isFinite(item.x) || !Number.isFinite(item.y)) continue;
        if (Math.hypot(item.x - player.x, item.y - player.y) < radius) return true;
    }
    return false;
}

export function phaseFrom(snap, observation) {
    if (observation && observation.phase) return observation.phase;
    if (!snap || !snap.ready) return 'loading';
    if (snap.gameOver || snap.pendingLevel != null) return 'complete';
    if (snap.dying || snap.transitioning) return 'transitioning';
    if (snap.awaitingStart) return 'awaiting_start';
    return 'playing';
}

export function noteHold(pilotState, holding, now) {
    if (!holding) {
        pilotState.baselineHoldSince = null;
        return 0;
    }
    if (pilotState.baselineHoldSince == null || now < pilotState.baselineHoldSince) {
        pilotState.baselineHoldSince = now;
        return 0;
    }
    return now - pilotState.baselineHoldSince;
}

export function decideBaseline(snap, observation, pilotState, clock) {
    const input = decidePilotInput(snap, pilotState);
    const before = { left: input.left, right: input.right, jump: input.jump };
    const now = Number.isFinite(clock) ? clock : Number(snap && snap.elapsedMs) || 0;
    if (Number.isFinite(pilotState.stuckFromT) && now < pilotState.stuckFromT) {
        pilotState.stuckFromT = now;
    }
    applyStuckRecovery(snap, input, pilotState, threatNear(snap, 150), now);
    const changed = recoveryChangedInput(before, input);
    const holding = isFullHold(input);
    const holdMs = noteHold(pilotState, holding, now);
    const ask = shouldAskJev({
        recoveryChanged: changed,
        holding,
        holdMs,
        phase: phaseFrom(snap, observation),
    });
    return {
        action: pilotInputToAction(input, observation && observation.availableActions),
        source: 'pilot',
        confidence: 1,
        ask,
        holdMs,
        recoveryChanged: changed,
        input,
    };
}

export function takeCachedJev(cache, now, available, ask) {
    if (!ask || !cache || !cache.action) return null;
    if (!Array.isArray(available) || !available.includes(cache.action)) return null;
    if (cache.at != null && now - cache.at >= JEV_CACHE_MS) return null;
    if (cache.at == null || now < cache.at) cache.at = now;
    return {
        action: cache.action,
        source: cache.source || 'jev',
        confidence: Number.isFinite(cache.confidence) ? cache.confidence : 1,
        model: cache.model || null,
    };
}

function parseLevels() {
    const listed = (process.env.LEVELS || '')
        .split(/\s+/)
        .map(Number)
        .filter((n) => LEVEL_IDS.includes(n));
    if (listed.length) return listed;
    const one = Number(process.env.LEVEL);
    if (LEVEL_IDS.includes(one)) return [one];
    return [...LEVEL_IDS];
}

async function closeActive() {
    if (activeBrowser) {
        try {
            await activeBrowser.close();
        } catch {
            // Already disconnected.
        }
        activeBrowser = null;
    }
    if (activeServer) {
        try {
            await new Promise((resolve) => activeServer.close(resolve));
        } catch {
            // Already closed.
        }
        activeServer = null;
    }
}

async function waitForReady(page) {
    await page.waitForFunction(
        () => window.__spaceChickenTest && window.__spaceChickenDebug?.ready(),
        null,
        { timeout: 25000 }
    );
}

async function ensurePage(browser, active, baseURL, level, seed) {
    if (active && active.level === level) {
        const res = await active.page
            .evaluate((s) => window.__spaceChickenTest.reset(s), seed)
            .catch(() => null);
        if (res?.ok) {
            await active.page.waitForFunction(
                () => {
                    const t = window.__spaceChickenTest;
                    if (!t || !window.__spaceChickenDebug?.ready()) return false;
                    try {
                        return Number(t.observe()?.elapsedMs) < 5000;
                    } catch {
                        return false;
                    }
                },
                null,
                { timeout: 25000 }
            );
            return active;
        }
    }
    if (active) await active.context.close().catch(() => {});
    const context = await browser.newContext({ viewport: { width: 800, height: 450 } });
    const page = await context.newPage();
    const url = new URL(baseURL);
    url.searchParams.set('bot', 'baseline');
    url.searchParams.set('debug', '1');
    url.searchParams.set('level', String(level));
    url.searchParams.set('seed', String(seed));
    url.searchParams.set('timeScale', String(TIMESCALE));
    await page.goto(url.toString(), { waitUntil: 'load', timeout: 45000 });
    await waitForReady(page);
    return { page, context, level };
}

function armJev(client, observation, recent, cache) {
    const flight = chooseJevAction(client, observation, recent)
        .then((decision) => {
            cache.action = decision.action;
            cache.at = null;
            cache.confidence = Number.isFinite(decision.confidence) ? decision.confidence : 1;
            cache.model = decision.model || null;
            cache.source = decision.source || 'jev';
            return decision;
        })
        .catch((error) => {
            const message = error && error.message ? error.message : String(error);
            console.log(`jev error: ${message}`);
            return null;
        });
    flights.add(flight);
    flight.finally(() => flights.delete(flight));
    return flight;
}

function scoreStep(step, nextObs, action) {
    step.reward = stepReward(step.obs, nextObs, { action });
}

function progressOf(firstDist, dist) {
    if (!Number.isFinite(firstDist) || firstDist <= 0 || !Number.isFinite(dist)) return 0;
    return Math.max(0, Math.min(1, 1 - dist / firstDist));
}

function writeDemo(level, seed, when, won, deaths, model, steps) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const rawPath = path.join(OUT_DIR, `jev-raw-L${level}-s${seed}-${Date.now()}.jsonl`);
    const header = {
        type: 'header',
        format: 'spacechicken-raw-obs',
        obsVersion: OBS_VERSION,
        expert: 'pilot+jev',
        model,
        level,
        seed,
        when,
        won,
        deaths,
        steps: steps.length,
    };
    fs.writeFileSync(
        rawPath,
        [header, ...steps].map((row) => JSON.stringify(row)).join('\n') + '\n'
    );
    return rawPath;
}

async function readFrame(page) {
    return page.evaluate(() => {
        window.__spaceChickenTest.act('wait');
        return {
            observation: window.__spaceChickenTest.observe(),
            snap: window.__spaceChickenDebug.getBotSnapshot(),
            objective: window.__spaceChickenTest.checkObjectives(),
        };
    });
}

function chooseStep(frame, pilotState, cache) {
    const now = Number(frame.snap?.elapsedMs) || 0;
    if (cache.at != null && now < cache.at) cache.at = null;
    const decision = decideBaseline(frame.snap, frame.observation, pilotState, now);
    const available = frame.observation?.availableActions || [];
    const cached = takeCachedJev(cache, now, available, decision.ask);
    return { decision, chosen: cached || decision };
}

function maybeArmJev(client, frame, recent, cache, slot, decision, chosen) {
    // One JEV call at a time, and never more than once a second. The pilot
    // keeps the controls until an answer is cached.
    if (!decision.ask || chosen.source !== 'pilot' || slot.flight) return false;
    if (cache.armedAt && Date.now() - cache.armedAt < 1000) return false;
    cache.armedAt = Date.now();
    const flight = armJev(client, frame.observation, recent.slice(-8), cache);
    slot.flight = flight;
    flight.finally(() => {
        if (slot.flight === flight) slot.flight = null;
    });
    return true;
}

async function runEpisode(page, client, level, seed) {
    const started = Date.now();
    const when = new Date().toISOString();
    const pilotState = createPilotState();
    const cache = { action: null, at: null, confidence: 1, model: null, source: 'jev' };
    const recent = [];
    const steps = [];
    const slot = { flight: null };
    let pending = null;
    let jevCalls = 0;
    let model = null;
    let result = null;
    let firstDist = null;
    let maxProgress = 0;
    let deaths = null;
    try {
        while (Date.now() - started < DURATION_MS) {
            const frame = await readFrame(page);
            result = frame.objective;
            deaths = frame.observation?.deaths ?? deaths;
            if (pending) {
                scoreStep(pending, frame.observation, pending.action);
                steps.push(pending);
                pending = null;
            }
            if (result?.passed) break;
            const { decision, chosen } = chooseStep(frame, pilotState, cache);
            if (maybeArmJev(client, frame, recent, cache, slot, decision, chosen)) jevCalls += 1;
            const acted = await page.evaluate(
                (name) => window.__spaceChickenTest.act(name),
                chosen.action
            );
            const action = acted?.ok ? chosen.action : 'wait';
            recent.push(action);
            if (recent.length > 8) recent.shift();
            if (chosen.model) model = chosen.model;
            const dist = Number(frame.observation?.objective?.distance);
            if (Number.isFinite(dist)) {
                if (firstDist == null) firstDist = dist;
                maxProgress = Math.max(maxProgress, progressOf(firstDist, dist));
            }
            pending = {
                type: 'step',
                obs: frame.observation,
                action,
                reward: 0,
                meta: {
                    atMs: Number.isFinite(Number(frame.observation?.elapsedMs))
                        ? frame.observation.elapsedMs
                        : Number(frame.snap?.elapsedMs) || 0,
                    source: chosen.source,
                    confidence: chosen.confidence,
                },
            };
            await page.waitForTimeout(DECISION_MS);
        }
    } catch (error) {
        console.log(`episode error L${level}: ${error && error.message ? error.message : error}`);
    }
    const report = await page
        .evaluate(() => window.__spaceChickenTest.captureReport())
        .catch(() => null);
    const won = Boolean(result?.passed);
    if (pending && report?.observation) {
        scoreStep(pending, report.observation, pending.action);
        deaths = report.observation.deaths ?? deaths;
        steps.push(pending);
    }
    if (won && steps.length) {
        const gameMs = Number(steps[steps.length - 1]?.obs?.elapsedMs);
        const bonusMs = (Number.isFinite(gameMs) ? gameMs : Date.now() - started) * TIMESCALE;
        steps[steps.length - 1].reward += terminalBonus({ won: true, timeMs: bonusMs });
    }
    const rawPath = steps.length ? writeDemo(level, seed, when, won, deaths, model, steps) : null;
    console.log(
        `${won ? 'WIN' : 'FAIL'} L${level} seed=${seed} steps=${steps.length} ` +
            `deaths=${deaths} progress=${maxProgress.toFixed(2)} jev=${jevCalls}` +
            (rawPath ? ` -> ${rawPath}` : '')
    );
    return { won, steps: steps.length, deaths, maxProgress, jevCalls };
}

async function main() {
    const apiKey = readTypeSafeApiKey();
    if (!apiKey) {
        throw new Error(
            'Set TYPESAFE_API_KEY, JEV_API_KEY, typesafekey, or jev_api_key in the environment. The key stays in Node and is not sent to the page.'
        );
    }
    const levels = parseLevels();
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const client = new TypeSafeClient({ apiKey, logLevel: 'off' });
    const useExternal = Boolean(process.env.SPACE_CHICKEN_URL);
    const server = useExternal ? null : createServer();
    if (server) {
        await new Promise((resolve, reject) => {
            server.once('error', reject);
            server.listen(0, '127.0.0.1', resolve);
        });
        activeServer = server;
    }
    const baseURL = useExternal
        ? process.env.SPACE_CHICKEN_URL
        : `http://127.0.0.1:${server.address().port}/`;
    const browser = await launchBrowser(chromium, HEADLESS);
    activeBrowser = browser;
    console.log(
        `baseline levels=${levels.join(',')} seed=${SEED} duration=${DURATION_MS}ms ` +
            `decision=${DECISION_MS}ms timeScale=${TIMESCALE}`
    );
    let active = null;
    try {
        for (let i = 0; i < levels.length; i++) {
            const level = levels[i];
            const seed = SEED + i;
            active = await ensurePage(browser, active, baseURL, level, seed);
            await runEpisode(active.page, client, level, seed);
        }
    } finally {
        await closeActive();
        await Promise.race([
            Promise.allSettled([...flights]),
            new Promise((resolve) => setTimeout(resolve, 2000)),
        ]);
    }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    main().catch(async (error) => {
        console.error(error && error.message ? error.message : error);
        await closeActive();
        process.exit(1);
    });
}
