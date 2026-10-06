/**
 * Play a trained BC policy against the live game (node-side inference).
 *
 * Observation comes from window.__spaceChickenTest.observe(), features from
 * scripts/rl/features.mjs, argmax over the 10 test actions. Set EXPLORE=1
 * for epsilon-greedy rollouts (future PPO demos).
 *
 *   npm run rl:play
 *   POLICY=rl/weights/bc-policy.json LEVEL=1 EXPLORE=1 npm run rl:play
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { ACTION_NAMES, OBS_SIZE, encodeObservation } from './features.mjs';
import { forwardPolicy } from './policy-infer.mjs';

const require = createRequire(import.meta.url);
const { createServer } = require('../../server.cjs');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

const POLICY_PATH = process.env.POLICY || path.join(ROOT, 'rl', 'weights', 'bc-policy.json');
const LEVEL = process.env.LEVEL ? Number(process.env.LEVEL) : null;
const DURATION_MS = Number(process.env.DURATION_MS || 120000);
const DECISION_MS = Number(process.env.DECISION_MS || 250);
const EXPLORE = process.env.EXPLORE === '1';
const EPSILON = Number(process.env.EPSILON || 0.1);
const HEADLESS = process.env.HEADLESS !== '0';
const EVAL_OUT = process.env.EVAL_OUT || path.join(ROOT, 'rl', 'weights', 'last-eval.json');
const CACHED_CHROME =
    process.env.PLAYWRIGHT_CHROME ||
    '/home/adam/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';

function decide(weights, observation) {
    const available = observation.availableActions || [];
    const obs = encodeObservation(observation);
    if (EXPLORE && Math.random() < EPSILON && available.length > 0) {
        return available[Math.floor(Math.random() * available.length)];
    }
    const probs = forwardPolicy(weights, obs);
    const ranked = probs
        .map((p, i) => [p, ACTION_NAMES[i]])
        .sort((a, b) => b[0] - a[0])
        .map(([, name]) => name);
    return ranked.find((name) => available.includes(name)) || 'wait';
}

async function main() {
    const weights = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
    if (weights.obsSize !== OBS_SIZE || weights.actionSize !== ACTION_NAMES.length) {
        throw new Error(`Policy contract mismatch in ${POLICY_PATH}`);
    }
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
        await browser.newContext({ viewport: { width: 1280, height: 720 } })
    ).newPage();
    const url = new URL(baseURL);
    url.searchParams.set('bot', 'policy');
    url.searchParams.set('debug', '1');
    if (LEVEL) url.searchParams.set('level', String(LEVEL));
    await page.goto(url.toString(), { waitUntil: 'load', timeout: 45000 });
    await page.waitForFunction(
        () => window.__spaceChickenTest && window.__spaceChickenDebug?.ready(),
        null,
        { timeout: 25000 }
    );

    const started = Date.now();
    let steps = 0;
    let result = null;
    while (Date.now() - started < DURATION_MS) {
        const state = await page.evaluate(() => ({
            observation: window.__spaceChickenTest.observe(),
            objective: window.__spaceChickenTest.checkObjectives(),
        }));
        result = state.objective;
        if (result.passed) break;
        await page.evaluate(
            (action) => window.__spaceChickenTest.act(action),
            decide(weights, state.observation)
        );
        steps += 1;
        await page.waitForTimeout(DECISION_MS);
        await page.evaluate(() => window.__spaceChickenTest.act('wait'));
    }
    const report = await page.evaluate(() => window.__spaceChickenTest.captureReport());
    const evalResult = {
        when: new Date().toISOString(),
        policy: POLICY_PATH,
        level: LEVEL,
        steps,
        passed: Boolean(result?.passed),
        objective: result,
        deaths: report.observation?.deaths ?? null,
    };
    fs.writeFileSync(EVAL_OUT, JSON.stringify(evalResult, null, 2));
    console.log(
        `${evalResult.passed ? 'PASS' : 'FAIL'} steps=${steps} deaths=${evalResult.deaths}`
    );
    console.log(`Eval: ${EVAL_OUT}`);
    await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
    if (!evalResult.passed) process.exitCode = 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
