/**
 * Persistent headed viewer for the RL policy.
 *
 * Keeps ONE visible browser window open and plays episodes back-to-back,
 * re-reading the weights file before every episode so it always shows the
 * latest policy. Kill with Ctrl-C.
 *
 *   POLICY=rl/weights/rl-policy.json LEVEL=1 node scripts/rl/watch-policy.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { ACTION_NAMES, OBS_SIZE, encodeObservation } from './features.mjs';
import { forwardPolicy } from './policy-infer.mjs';
import { LEVEL_IDS } from '../../levels/index.js';

const require = createRequire(import.meta.url);
const { createServer } = require('../../server.cjs');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

const POLICY_PATH = process.env.POLICY || path.join(ROOT, 'rl', 'weights', 'rl-policy.json');
const LEVEL_RAW = String(process.env.LEVEL || '1');
const RANDOM_LEVEL = LEVEL_RAW === 'random' || process.env.RANDOM_LEVEL === '1';
const DURATION_MS = Number(process.env.DURATION_MS || 90000);
const DECISION_MS = Number(process.env.DECISION_MS || 250);
const HEADLESS = process.env.HEADLESS === '1';
const CACHED_CHROME =
    process.env.PLAYWRIGHT_CHROME ||
    '/home/adam/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';

function decide(weights, observation) {
    const available = observation.availableActions || [];
    const obs = encodeObservation(observation);
    const probs = forwardPolicy(weights, obs);
    const ranked = probs
        .map((p, i) => [p, ACTION_NAMES[i]])
        .sort((a, b) => b[0] - a[0])
        .map(([, name]) => name);
    return ranked.find((name) => available.includes(name)) || 'wait';
}

async function playEpisode(page, baseURL, weights, episode, level) {
    const url = new URL(baseURL);
    url.searchParams.set('bot', 'watch');
    url.searchParams.set('debug', '1');
    url.searchParams.set('level', String(level));
    url.searchParams.set('seed', String((Date.now() % 100000) + episode));
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
    return { passed: Boolean(result?.passed), steps, deaths: report.observation?.deaths ?? null };
}

async function main() {
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
    // Note: no SwiftShader override here (unlike the headless rollout
    // workers). The watch window should use the real GPU when present so
    // game speed matches the wall clock; Chromium falls back to software
    // GL on its own when there is no GPU.
    const launchOptions = {
        headless: HEADLESS,
        args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--start-maximized'],
    };
    if (fs.existsSync(CACHED_CHROME)) launchOptions.executablePath = CACHED_CHROME;
    const browser = await chromium.launch(launchOptions);
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    page.on('pageerror', (err) => console.error('[pageerror]', err.message || err));
    console.log(
        `watching ${POLICY_PATH} (${RANDOM_LEVEL ? 'random level' : `L${LEVEL_RAW}`} each episode, Ctrl-C to stop)`
    );

    let lastMtime = 0;
    let episode = 0;
    for (;;) {
        episode += 1;
        const level = RANDOM_LEVEL
            ? LEVEL_IDS[Math.floor(Math.random() * LEVEL_IDS.length)]
            : Number(LEVEL_RAW);
        let weights;
        try {
            const stat = fs.statSync(POLICY_PATH);
            if (stat.mtimeMs !== lastMtime) {
                lastMtime = stat.mtimeMs;
                console.log(`[ep ${episode}] reloaded weights (${stat.mtime.toISOString()})`);
            }
            weights = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
        } catch (err) {
            console.error(`[ep ${episode}] cannot read weights, retrying: ${err.message}`);
            await new Promise((resolve) => setTimeout(resolve, 5000));
            continue;
        }
        if (weights.obsSize !== OBS_SIZE || weights.actionSize !== ACTION_NAMES.length) {
            console.error(`[ep ${episode}] policy contract mismatch, retrying`);
            await new Promise((resolve) => setTimeout(resolve, 5000));
            continue;
        }
        try {
            const res = await playEpisode(page, baseURL, weights, episode, level);
            console.log(
                `[ep ${episode} L${level}] ${res.passed ? 'PASS' : 'FAIL'} steps=${res.steps} deaths=${res.deaths}`
            );
        } catch (err) {
            console.error(`[ep ${episode} L${level}] error: ${err.message}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
