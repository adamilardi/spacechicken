/**
 * Collect on-policy rollout episodes for rl/train_rl.py.
 *
 * Runs the exported policy with temperature sampling (exploration), shapes
 * rewards (progress + step cost + win bonus), and writes JSONL with
 * behavior log-probs and next observations. One process collects one
 * episode; scripts/rl/loop.sh fans out WORKERS of these.
 *
 *   POLICY=rl/weights/bc-policy.json POLICY_ID=iter0 LEVEL=1 SEED=11 \
 *     ROLLOUT_OUT=rl/rollouts node scripts/rl/rollout.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { ACTION_NAMES, OBS_SIZE, encodeObservation, stepReward } from './features.mjs';
import { forwardPolicy } from './policy-infer.mjs';

const require = createRequire(import.meta.url);
const { createServer } = require('../../server.cjs');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

const POLICY_PATH = process.env.POLICY || path.join(ROOT, 'rl', 'weights', 'bc-policy.json');
const POLICY_ID = process.env.POLICY_ID || 'manual';
const LEVEL = Number(process.env.LEVEL || 1);
const SEED = Number(process.env.SEED || 1);
const DURATION_MS = Number(process.env.DURATION_MS || 75000);
const DECISION_MS = Number(process.env.DECISION_MS || 150);
const TEMPERATURE = Number(process.env.TEMPERATURE || 1);
const STEP_COST = Number(process.env.STEP_COST || -0.01);
const WIN_BONUS = Number(process.env.WIN_BONUS || 2);
const OUT_DIR = process.env.ROLLOUT_OUT || path.join(ROOT, 'rl', 'rollouts');
const HEADLESS = process.env.HEADLESS !== '0';
const CACHED_CHROME =
    process.env.PLAYWRIGHT_CHROME ||
    '/home/adam/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';

function sampleAction(weights, obs, temperature) {
    const probs = forwardPolicy(weights, obs);
    const scaled = probs.map((p) => Math.pow(Math.max(p, 1e-9), 1 / Math.max(temperature, 1e-3)));
    const total = scaled.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < scaled.length; i++) {
        roll -= scaled[i];
        if (roll <= 0) return { index: i, logProb: Math.log(probs[i]) };
    }
    return { index: scaled.length - 1, logProb: Math.log(probs[scaled.length - 1]) };
}

async function main() {
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
    }
    const baseURL = useExternal
        ? process.env.SPACE_CHICKEN_URL
        : `http://127.0.0.1:${server.address().port}/`;
    const launchOptions = {
        headless: HEADLESS,
        args: [
            '--use-gl=swiftshader',
            '--ignore-gpu-blocklist',
            '--no-sandbox',
            '--autoplay-policy=no-user-gesture-required',
        ],
    };
    if (fs.existsSync(CACHED_CHROME)) launchOptions.executablePath = CACHED_CHROME;
    const browser = await chromium.launch(launchOptions);
    const page = await (
        await browser.newContext({ viewport: { width: 800, height: 450 } })
    ).newPage();
    const url = new URL(baseURL);
    url.searchParams.set('bot', `rollout-${POLICY_ID}`);
    url.searchParams.set('debug', '1');
    url.searchParams.set('level', String(LEVEL));
    url.searchParams.set('seed', String(SEED));
    await page.goto(url.toString(), { waitUntil: 'load', timeout: 45000 });
    await page.waitForFunction(
        () => window.__spaceChickenTest && window.__spaceChickenDebug?.ready(),
        null,
        { timeout: 25000 }
    );

    const started = Date.now();
    const steps = [];
    let pending = null;
    let result = null;
    while (Date.now() - started < DURATION_MS) {
        const state = await page.evaluate(() => ({
            observation: window.__spaceChickenTest.observe(),
            objective: window.__spaceChickenTest.checkObjectives(),
        }));
        result = state.objective;
        if (result.passed) break;
        if (pending) {
            pending.reward += stepReward(pending.rawObs, state.observation) + STEP_COST;
            pending.nextObs = state.observation;
            delete pending.rawObs;
            steps.push(pending);
        }
        const available = state.observation.availableActions || [];
        const obs = encodeObservation(state.observation);
        const { index, logProb } = sampleAction(weights, obs, TEMPERATURE);
        const name = ACTION_NAMES[index];
        const action = available.includes(name) ? name : 'wait';
        await page.evaluate((selected) => window.__spaceChickenTest.act(selected), action);
        pending = {
            type: 'step',
            obs,
            rawObs: state.observation,
            action: ACTION_NAMES.indexOf(action),
            actionName: action,
            behaviorLogProb: action === name ? logProb : null,
            reward: 0,
            nextObs: null,
            terminated: false,
            meta: { atMs: Date.now() - started },
        };
        await page.waitForTimeout(DECISION_MS);
        await page.evaluate(() => window.__spaceChickenTest.act('wait'));
    }
    const report = await page.evaluate(() => window.__spaceChickenTest.captureReport());
    const won = Boolean(result?.passed);
    if (pending) {
        pending.reward +=
            stepReward(pending.rawObs, report.observation) + STEP_COST + (won ? WIN_BONUS : 0);
        pending.nextObs = report.observation;
        pending.terminated = won;
        delete pending.rawObs;
        steps.push(pending);
    }
    const header = {
        type: 'header',
        format: 'spacechicken-rollout',
        obsVersion: 2,
        policyId: POLICY_ID,
        temperature: TEMPERATURE,
        level: LEVEL,
        seed: SEED,
        won,
        timeMs: Date.now() - started,
        deaths: report.observation?.deaths ?? null,
        steps: steps.length,
        createdAt: new Date().toISOString(),
    };
    const outPath = path.join(
        OUT_DIR,
        `rollout-L${LEVEL}-s${SEED}-${POLICY_ID}-${Date.now()}.jsonl`
    );
    fs.writeFileSync(
        outPath,
        [header, ...steps].map((row) => JSON.stringify(row)).join('\n') + '\n'
    );
    console.log(
        `${won ? 'WIN' : 'FAIL'} L${LEVEL} steps=${steps.length} deaths=${header.deaths} -> ${outPath}`
    );
    await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
