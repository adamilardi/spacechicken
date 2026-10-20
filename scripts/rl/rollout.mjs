/**
 * Collect on-policy rollout episodes for rl/train_rl.py.
 *
 * Runs the exported policy with temperature sampling (exploration), shapes
 * rewards (progress + step cost + win bonus), and writes JSONL with
 * behavior log-probs and next observations. One process reuses a single
 * browser across EPISODE_COUNT episodes (one fresh page each); scripts/rl/loop.sh
 * fans out WORKERS of these.
 *
 *   POLICY=rl/weights/bc-policy.json POLICY_ID=iter0 LEVEL=1 SEED=11 \
 *     ROLLOUT_OUT=rl/rollouts node scripts/rl/rollout.mjs
 *   EPISODE_COUNT=2 LEVELS="1 2" BEST_JSON='{"1":12651}' node scripts/rl/rollout.mjs
 *   WARM_START=0.7 node scripts/rl/rollout.mjs  (reverse curriculum: teleport
 *     to a grounded late-demo state; warm-start wins train but never count
 *     as level clears)
 *   TIMESCALE=2 node scripts/rl/rollout.mjs  (2x game speed; the speed bonus
 *     is scaled back to 1x-equivalent ms so best times stay comparable)
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import {
    ACTION_NAMES,
    OBS_SIZE,
    OBS_VERSION,
    applyTemperature,
    availableMask,
    createProgressTracker,
    encodeObservation,
    maskedProbs,
    stepReward,
    terminalBonus,
} from './features.mjs';
import { forwardPolicy } from './policy-infer.mjs';
import { launchBrowser } from './chrome.mjs';

const require = createRequire(import.meta.url);
const { createServer } = require('../../server.cjs');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

const POLICY_PATH = process.env.POLICY || path.join(ROOT, 'rl', 'weights', 'bc-policy.json');
const POLICY_ID = process.env.POLICY_ID || 'manual';
const LEVEL = Number(process.env.LEVEL || 1);
const LEVELS = (process.env.LEVELS || '')
    .split(/\s+/)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0);
const SEED = Number(process.env.SEED || 1);
const EPISODE_COUNT = Math.max(1, Math.floor(Number(process.env.EPISODE_COUNT || 1)));
const TIMESCALE = Math.min(4, Math.max(1, Number(process.env.TIMESCALE || 1)));
const DURATION_MS = Number(process.env.DURATION_MS || 75000);
const DECISION_MS = Number(process.env.DECISION_MS || 150);
const TEMPERATURE = Number(process.env.TEMPERATURE || 1);
const STEP_COST = Number(process.env.STEP_COST || -0.002);
const BEST_MS = Number(process.env.BEST_MS || NaN);
const BEST_JSON = (() => {
    try {
        return JSON.parse(process.env.BEST_JSON || '{}');
    } catch {
        return {};
    }
})();
const WARM_START = Number(process.env.WARM_START || 0);
const DEMO_POOL = process.env.DEMO_POOL || path.join(ROOT, 'rl', 'demos-raw');
const OUT_DIR = process.env.ROLLOUT_OUT || path.join(ROOT, 'rl', 'rollouts');
const HEADLESS = process.env.HEADLESS !== '0';

let activeBrowser = null;
let activeServer = null;

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

function pickWarmStartPoint(poolDir, level, fraction) {
    // Reverse-curriculum start: a grounded mid/late-episode player position
    // from a recorded full-observation demo (OpenAI's "start from a demo
    // state" trick for Montezuma). Returns {x, y, file, stepIndex} or null.
    let files = [];
    try {
        files = fs
            .readdirSync(poolDir)
            .filter((name) => name.startsWith(`jev-raw-L${level}-`) && name.endsWith('.jsonl'))
            .map((name) => path.join(poolDir, name));
    } catch {
        return null;
    }
    if (!files.length) return null;
    const file = files[Math.floor(Math.random() * files.length)];
    let lines;
    try {
        lines = fs.readFileSync(file, 'utf8').trim().split('\n').slice(1);
    } catch {
        return null;
    }
    const candidates = [];
    lines.forEach((line, i) => {
        try {
            const row = JSON.parse(line);
            const p = row?.obs?.player;
            if (row?.obs && Number.isFinite(p?.x) && Number.isFinite(p?.y) && p.grounded === true) {
                candidates.push({ x: p.x, y: p.y, stepIndex: i });
            }
        } catch {
            // Skip malformed rows.
        }
    });
    if (!candidates.length) return null;
    const at = Math.min(
        candidates.length - 1,
        Math.max(0, Math.floor(candidates.length * Math.min(0.95, Math.max(0, fraction))))
    );
    return { ...candidates[at], file: path.basename(file) };
}

function sampleAction(weights, obs, available, temperature) {
    const probs = forwardPolicy(weights, obs);
    const normalized = applyTemperature(probs, temperature);
    // Sample within the legal set only, so the stored behavior log-prob
    // matches the executed action (previously illegal samples fell back to
    // `wait` with a null log-prob the trainer could not correct for).
    const { probs: legal } = maskedProbs(normalized, available);
    let roll = Math.random();
    for (let i = 0; i < legal.length; i++) {
        roll -= legal[i];
        if (roll <= 0) return { index: i, logProb: Math.log(Math.max(legal[i], 1e-9)) };
    }
    const last = legal.length - 1;
    return { index: last, logProb: Math.log(Math.max(legal[last], 1e-9)) };
}

function bestForLevel(level) {
    return Number(BEST_JSON[String(level)] ?? BEST_MS);
}

async function waitForReady(page) {
    await page.waitForFunction(
        () => window.__spaceChickenTest && window.__spaceChickenDebug?.ready(),
        null,
        { timeout: 25000 }
    );
}

async function ensurePage(browser, active, baseURL, level, seed) {
    // Same level as the previous episode: restart the scene in place instead
    // of reloading the page (~1s vs ~7s). The freshness gate below guards
    // against ready() staying true across the restart.
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
    if (active) {
        await active.context.close().catch(() => {});
    }
    const context = await browser.newContext({ viewport: { width: 800, height: 450 } });
    const page = await context.newPage();
    const url = new URL(baseURL);
    url.searchParams.set('bot', `rollout-${POLICY_ID}`);
    url.searchParams.set('debug', '1');
    url.searchParams.set('level', String(level));
    url.searchParams.set('seed', String(seed));
    url.searchParams.set('timeScale', String(TIMESCALE));
    await page.goto(url.toString(), { waitUntil: 'load', timeout: 45000 });
    await waitForReady(page);
    return { page, context, level };
}

async function runEpisode(page, weights, level, seed) {
    {
        const started = Date.now();
        const steps = [];
        let pending = null;
        let result = null;
        let pendingAction = 'wait';
        let warmStart = null;
        let aborted = false;
        const progress = createProgressTracker();
        if (WARM_START > 0) {
            const point = pickWarmStartPoint(DEMO_POOL, level, WARM_START);
            if (point) {
                const teleported = await page
                    .evaluate(({ x, y }) => window.__spaceChickenTest.teleport(x, y), point)
                    .catch(() => null);
                if (teleported?.ok) {
                    warmStart = point;
                    console.log(
                        `warm start L${level} from ${point.file}#${point.stepIndex} at ${Math.round(point.x)},${Math.round(point.y)}`
                    );
                }
            }
        }
        while (Date.now() - started < DURATION_MS) {
            // One CDP roundtrip per step: release the previous action and
            // observe. The release lands the same moment the old trailing
            // act('wait') did (right after the decision sleep).
            const state = await page.evaluate(() => {
                window.__spaceChickenTest.act('wait');
                return {
                    observation: window.__spaceChickenTest.observe(),
                    objective: window.__spaceChickenTest.checkObjectives(),
                };
            });
            result = state.objective;
            if (result.passed) break;
            if (pending) {
                const died = Number(state.observation?.deaths) > Number(pending.rawObs?.deaths);
                const track = progress.step({
                    dist: Number(state.observation?.objective?.distance),
                    died,
                });
                pending.reward +=
                    stepReward(pending.rawObs, state.observation, { action: pendingAction }) +
                    STEP_COST +
                    track.penalty;
                pending.nextObs = state.observation;
                delete pending.rawObs;
                steps.push(pending);
                if (track.abort) {
                    aborted = true;
                    break;
                }
            }
            const available = state.observation.availableActions || [];
            const obs = encodeObservation(state.observation);
            const { index, logProb } = sampleAction(weights, obs, available, TEMPERATURE);
            const name = ACTION_NAMES[index];
            const action = name;
            await page.evaluate((selected) => window.__spaceChickenTest.act(selected), action);
            pending = {
                type: 'step',
                obs,
                rawObs: state.observation,
                action: index,
                actionName: action,
                behaviorLogProb: logProb,
                mask: availableMask(available),
                reward: 0,
                nextObs: null,
                terminated: false,
                meta: { atMs: Date.now() - started },
            };
            pendingAction = action;
            await page.waitForTimeout(DECISION_MS);
        }
        const report = await page.evaluate(() => window.__spaceChickenTest.captureReport());
        const won = Boolean(result?.passed);
        const timeMs = Date.now() - started;
        // Prefer the in-game clock for the speed bonus; wall time includes
        // Playwright inference overhead and varies by machine. Scale back to
        // 1x-equivalent ms so best times stay comparable across time scales.
        const gameMs = Number(report.observation?.elapsedMs);
        const bonusMs = (Number.isFinite(gameMs) ? gameMs : timeMs) * TIMESCALE;
        if (pending) {
            const died = Number(report.observation?.deaths) > Number(pending.rawObs?.deaths);
            const track = progress.step({
                dist: Number(report.observation?.objective?.distance),
                died,
            });
            pending.reward +=
                stepReward(pending.rawObs, report.observation, { action: pendingAction }) +
                STEP_COST +
                track.penalty +
                terminalBonus({ won, timeMs: bonusMs, bestMs: bestForLevel(level) });
            pending.nextObs = report.observation;
            pending.terminated = won;
            delete pending.rawObs;
            steps.push(pending);
        }
        const header = {
            type: 'header',
            format: 'spacechicken-rollout',
            obsVersion: OBS_VERSION,
            policyId: POLICY_ID,
            temperature: TEMPERATURE,
            timescale: TIMESCALE,
            level,
            seed,
            won,
            timeMs,
            elapsedMs: Number.isFinite(gameMs) ? gameMs : null,
            warmStart,
            aborted,
            deaths: report.observation?.deaths ?? null,
            steps: steps.length,
            createdAt: new Date().toISOString(),
        };
        const outPath = path.join(
            OUT_DIR,
            `rollout-L${level}-s${seed}-${POLICY_ID}-${Date.now()}.jsonl`
        );
        fs.writeFileSync(
            outPath,
            [header, ...steps].map((row) => JSON.stringify(row)).join('\n') + '\n'
        );
        console.log(
            `${won ? 'WIN' : 'FAIL'} L${level} steps=${steps.length} deaths=${header.deaths} -> ${outPath}`
        );
    }
}

async function main() {
    if (process.env.FAST === '1') {
        const { runFast } = await import('../fast/run.mjs');
        return runFast({ policy: true });
    }
    const weights = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
    if (weights.obsSize !== OBS_SIZE || weights.actionSize !== ACTION_NAMES.length) {
        throw new Error(`Policy contract mismatch in ${POLICY_PATH}`);
    }
    fs.mkdirSync(OUT_DIR, { recursive: true });
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
    // Sample all levels up front and group equal levels so back-to-back
    // episodes reuse the page via reset() instead of reloading.
    const SWEEP = process.env.LEVEL_SWEEP === '1';
    const plan = [];
    for (let ep = 0; ep < EPISODE_COUNT; ep++) {
        if (!LEVELS.length) plan.push(LEVEL);
        else if (SWEEP) plan.push(LEVELS[ep % LEVELS.length]);
        else plan.push(LEVELS[Math.floor(Math.random() * LEVELS.length)]);
    }
    plan.sort((a, b) => a - b);
    let active = null;
    try {
        for (let ep = 0; ep < EPISODE_COUNT; ep++) {
            active = await ensurePage(browser, active, baseURL, plan[ep], SEED + ep);
            await runEpisode(active.page, weights, plan[ep], SEED + ep);
        }
    } finally {
        await closeActive();
    }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    main().catch(async (error) => {
        console.error(error);
        await closeActive();
        process.exit(1);
    });
}
