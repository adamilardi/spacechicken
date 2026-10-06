/**
 * Jev-driven browser playtest.
 *
 * The TypeSafe client runs in Node so TYPESAFE_API_KEY never enters the page.
 * The browser receives only constrained actions through __spaceChickenTest.
 *
 *   npm run jev:playtest
 *   LEVEL=2 SEED=42 JEV_DURATION_MS=90000 npm run jev:playtest
 *   JEV_RECORD_DEMOS=1 LEVEL=1 npm run jev:playtest  (raw full-obs JSONL for rl)
 *
 * The API key is read from TYPESAFE_API_KEY or typesafekey and stays in Node.
 */
import { choice, TypeSafeClient } from '@typesafe-ai/sdk';
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { LEVEL_IDS } from '../levels/index.js';
import { installInPageWatchdog } from './playtest-bot.mjs';
import { stepReward } from './rl/features.mjs';

const require = createRequire(import.meta.url);
const { createServer } = require('../server.cjs');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LEVEL = boundedNumber(
    process.env.LEVEL,
    LEVEL_IDS[0],
    LEVEL_IDS[0],
    LEVEL_IDS[LEVEL_IDS.length - 1]
);
const SEED = boundedNumber(process.env.SEED, 1, 0, 2_147_483_647);
const DURATION_MS = boundedNumber(process.env.JEV_DURATION_MS, 60_000, 2_000, 600_000);
const DECISION_MS = boundedNumber(process.env.JEV_DECISION_MS, 450, 100, 5_000);
const TIME_SCALE = boundedScale(process.env.JEV_TIME_SCALE, 0.25);
const HEADLESS = process.env.HEADLESS !== '0';
const OUT_DIR = process.env.JEV_OUT || path.join(__dirname, '..', '.jev-runs');
const RECORD_DEMOS = process.env.JEV_RECORD_DEMOS === '1';
const DEMO_OUT = process.env.JEV_DEMO_OUT || path.join(__dirname, '..', 'rl', 'demos-raw');
const CACHED_CHROME =
    process.env.PLAYWRIGHT_CHROME ||
    '/home/adam/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';

const ACTION_CRITERIA = Object.freeze({
    wait: 'Brake horizontal movement. Avoid while airborne over a gap; use only when movement is unsafe.',
    move_left: 'Run left without jumping.',
    move_right: 'Run right without jumping.',
    fire: 'Hold position and shoot the phaser. Only useful when `canShoot` is true and a boarder is roughly level with you.',
    fire_left: 'Run left while shooting the phaser at boarders ahead.',
    fire_right: 'Run right while shooting the phaser at boarders ahead.',
    jump: 'Jump vertically with no horizontal movement.',
    jump_left: 'Pulse jump while moving left.',
    jump_right: 'Pulse jump while moving right.',
    start: 'Start the game from its title screen.',
});

function boundedNumber(value, fallback, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(number)));
}

function boundedScale(value, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(0.1, Math.min(1, number));
}

function safeError(error) {
    return {
        name: error && error.name ? error.name : 'Error',
        message: error && error.message ? error.message : String(error),
        status: Number.isFinite(error && error.status) ? error.status : undefined,
        requestId: error && error.requestId ? error.requestId : undefined,
    };
}

export function readTypeSafeApiKey(env = process.env) {
    return String(env.TYPESAFE_API_KEY || env.typesafekey || '').trim();
}

// Boarders (type `boarder` in nearby.hazards, cyan chest ring) die to bolts;
// touching one fails the run. Bolts fly horizontally from your facing, range
// ~820px, so shoot when a boarder is ahead of you and roughly level (|dy| < 70).
const PHASER_RANGE = 820;
const PHASER_LANE = 70;

function shootableAhead(observation, direction) {
    if (observation.canShoot === false) return false;
    const hazards = observation.nearby?.hazards || [];
    const sign = direction === 'left' ? -1 : 1;
    return hazards.some(
        (item) =>
            item &&
            item.type === 'boarder' &&
            item.active !== false &&
            item.dx * sign > 0 &&
            item.dx * sign <= PHASER_RANGE &&
            Math.abs(item.dy) < PHASER_LANE
    );
}

export function fallbackAction(observation) {
    const actions = observation.availableActions || [];
    if (actions.length === 1) return actions[0];
    const player = observation.player;
    const objective = observation.objective;
    if (!player || !objective || !Number.isFinite(objective.dx)) return 'wait';

    const direction = objective.dx < 0 ? 'left' : 'right';
    if (shootableAhead(observation, direction)) {
        const firing = `fire_${direction}`;
        if (actions.includes(firing)) return firing;
    }
    const navigation = observation.navigation || {};
    const forwardHazard = (observation.nearby?.hazards || [])
        .concat(observation.nearby?.bombs || [])
        .some(
            (item) =>
                item.active &&
                item.dx * Math.sign(objective.dx || 1) > 0 &&
                item.dx * Math.sign(objective.dx || 1) < 100 &&
                Math.abs(item.dy) < 80
        );
    const shouldJump =
        player.grounded &&
        (forwardHazard ||
            navigation.immediateThreat ||
            navigation.gapAhead ||
            objective.dy < -35 ||
            Math.abs(objective.dx) < 150);
    const action = shouldJump ? `jump_${direction}` : `move_${direction}`;
    return actions.includes(action) ? action : 'wait';
}

function criteriaFor(availableActions) {
    return Object.fromEntries(
        availableActions.map((action) => [action, ACTION_CRITERIA[action] || null])
    );
}

export async function chooseJevAction(client, observation, recentActions = []) {
    const availableActions = observation.availableActions || [];
    if (availableActions.length === 1) {
        return { action: availableActions[0], source: 'game_rule', confidence: 1 };
    }
    const response = await client.systemOne(
        {
            state: {
                objective:
                    'Collect the crown using normal player movement while avoiding hazards and falls.',
                observation,
                recentActions,
            },
            questions: {
                nextAction: choice(
                    {
                        task: 'Choose the single best next action from `observation.availableActions`.',
                        guidance: [
                            'Use relative geometry: positive dx is right; negative dx is left.',
                            'Use `observation.navigation` for the landing window, gap, support platform, and immediate threat.',
                            'Use velocity, direction, and path endpoints for moving platforms, drones, and rovers.',
                            'For lasers and cosmic rays, cooldown is safe, warning means leave the column, and active means do not cross; use timeUntilPhaseChangeMs.',
                            'Jump to cross a gap, reach a higher landing window, or avoid an immediate threat.',
                            'A hazard with bonkable true grants a boost jump when stomped from above. Touching its side still fails the run.',
                            'A hazard with type boarder (cyan chest ring) dies to phaser bolts; touching one fails the run. Bolts fly horizontally ~820px, so use a fire action when canShoot is true and a boarder is ahead of you and roughly level.',
                            'Gold-capped bonk enemies cannot be shot. Stomp them from above.',
                            'Do not invent actions or assume hidden game state.',
                        ],
                    },
                    criteriaFor(availableActions)
                ),
            },
        },
        { timeout: 10_000, retry: { maxRetries: 1 } }
    );
    const answer = response.answers.nextAction;
    let action = answer.choice;
    let source = 'jev';
    if (!availableActions.includes(action)) {
        action = fallbackAction(observation);
        source = 'fallback_invalid_answer';
    } else if (action === 'wait' && answer.confidence < 0.35 && observation.phase === 'playing') {
        action = fallbackAction(observation);
        source = 'policy_low_confidence_wait';
    }
    return {
        action,
        source,
        rawAction: answer.choice,
        confidence: answer.confidence,
        probabilities: answer.probabilities,
        model: response.model,
        usage: response.usage,
    };
}

async function startGameServer() {
    if (process.env.SPACE_CHICKEN_URL) {
        return { baseURL: process.env.SPACE_CHICKEN_URL, close: async () => {} };
    }
    const server = createServer();
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    return {
        baseURL: `http://127.0.0.1:${address.port}/`,
        close: () => new Promise((resolve) => server.close(resolve)),
    };
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
    if (fs.existsSync(CACHED_CHROME)) options.executablePath = CACHED_CHROME;
    return chromium.launch(options);
}

async function readGameState(page) {
    return page.evaluate(() => ({
        observation: window.__spaceChickenTest.observe(),
        objective: window.__spaceChickenTest.checkObjectives(),
    }));
}

async function applyAction(page, action) {
    const result = await page.evaluate(
        (selectedAction) => window.__spaceChickenTest.act(selectedAction),
        action
    );
    if (!result || !result.ok) {
        throw new Error(`Game rejected action ${action}: ${result && result.error}`);
    }
    return result;
}

async function preparePage(page, baseURL) {
    const url = new URL(baseURL);
    url.searchParams.set('bot', 'jev');
    url.searchParams.set('debug', '1');
    url.searchParams.set('level', String(LEVEL));
    url.searchParams.set('seed', String(SEED));
    url.searchParams.set('timeScale', String(TIME_SCALE));
    const response = await page.goto(url.toString(), { waitUntil: 'load', timeout: 45_000 });
    if (!response || !response.ok()) {
        throw new Error(`Failed to load game: ${response && response.status()}`);
    }
    await page.waitForFunction(
        () =>
            window.__spaceChickenTest &&
            window.__spaceChickenDebug &&
            window.__spaceChickenDebug.ready(),
        null,
        { timeout: 25_000 }
    );
    const reset = await page.evaluate((seed) => window.__spaceChickenTest.reset(seed), SEED);
    if (!reset || !reset.ok) throw new Error('The game test interface could not reset the scene');
    await page.waitForFunction(
        () => window.__spaceChickenTest && window.__spaceChickenDebug?.ready(),
        null,
        { timeout: 25_000 }
    );
    await page.evaluate(installInPageWatchdog);
}

// eslint-disable-next-line complexity
async function runPlaytest(client, page) {
    const actions = [];
    const jevErrors = [];
    const usage = { input_tokens: 0, output_tokens: 0 };
    const startedAt = Date.now();
    let objective = null;
    let finalObservation = null;
    let jevDecisions = 0;
    const rawSteps = [];
    let pendingRaw = null;

    while (Date.now() - startedAt < DURATION_MS) {
        const state = await readGameState(page);
        finalObservation = state.observation;
        objective = state.objective;
        if (objective.passed) break;

        let decision;
        try {
            decision = await chooseJevAction(
                client,
                state.observation,
                actions.slice(-6).map(({ action, source }) => ({ action, source }))
            );
            if (decision.model) jevDecisions += 1;
            usage.input_tokens += decision.usage?.input_tokens || 0;
            usage.output_tokens += decision.usage?.output_tokens || 0;
        } catch (error) {
            const detail = safeError(error);
            jevErrors.push({ atMs: Date.now() - startedAt, ...detail });
            decision = {
                action: fallbackAction(state.observation),
                source: 'fallback_api_error',
                error: detail,
            };
        }

        await applyAction(page, decision.action);
        const record = {
            atMs: Date.now() - startedAt,
            level: state.observation.level,
            deaths: state.observation.deaths,
            player: state.observation.player,
            objective: state.observation.objective,
            ...decision,
        };
        actions.push(record);
        if (RECORD_DEMOS) {
            if (pendingRaw) {
                pendingRaw.reward = stepReward(pendingRaw.obs, state.observation);
                rawSteps.push(pendingRaw);
            }
            pendingRaw = {
                type: 'step',
                obs: state.observation,
                action: decision.action,
                reward: 0,
                meta: {
                    atMs: record.atMs,
                    source: decision.source,
                    confidence: decision.confidence ?? null,
                },
            };
        }
        console.log(
            `[${record.atMs}ms] L${record.level} ${record.source} -> ${record.action}` +
                (Number.isFinite(record.confidence)
                    ? ` (${Math.round(record.confidence * 100)}%)`
                    : '')
        );

        await page.waitForTimeout(decision.action === 'start' ? 120 : DECISION_MS);
        await applyAction(page, 'wait');
    }

    const state = await page.evaluate(() => {
        window.__spaceChickenWatchdogStop?.();
        return window.__spaceChickenTest.captureReport();
    });
    finalObservation = state.observation;
    objective = state.objective;
    const watchdogBugs = await page.evaluate(() =>
        (window.__spaceChickenWatchdogBugs || []).slice()
    );
    if (pendingRaw) {
        pendingRaw.reward =
            stepReward(pendingRaw.obs, finalObservation) + (objective?.passed ? 1 : 0);
        rawSteps.push(pendingRaw);
    }
    return {
        passed: Boolean(objective && objective.passed),
        objective,
        finalObservation,
        actions,
        rawSteps,
        watchdogBugs,
        jevErrors,
        jevDecisions,
        usage,
        durationMs: Date.now() - startedAt,
    };
}

async function main() {
    const apiKey = readTypeSafeApiKey();
    if (!apiKey) {
        throw new Error(
            'Set TYPESAFE_API_KEY or typesafekey in the environment. The key stays in Node and is not sent to the page.'
        );
    }
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const client = new TypeSafeClient({ apiKey, logLevel: 'off' });
    const gameServer = await startGameServer();
    const browser = await launchBrowser();
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(String(error.message || error)));

    console.log('Space Chicken Jev playtest');
    console.log(
        `URL=${gameServer.baseURL} level=${LEVEL} seed=${SEED} duration=${DURATION_MS}ms ` +
            `timeScale=${TIME_SCALE}`
    );
    let result;
    try {
        await preparePage(page, gameServer.baseURL);
        result = await runPlaytest(client, page);
        await page.screenshot({
            path: path.join(OUT_DIR, 'jev-playtest-final.png'),
            fullPage: true,
        });
    } finally {
        await context.close();
        await browser.close();
        await gameServer.close();
    }

    const failures = [];
    if (!result.passed) failures.push({ kind: 'objective_not_completed' });
    if (!result.jevDecisions) failures.push({ kind: 'no_successful_jev_decisions' });
    failures.push(
        ...result.watchdogBugs,
        ...pageErrors.map((detail) => ({ kind: 'pageerror', detail }))
    );
    const { rawSteps, ...resultRest } = result;
    const report = {
        when: new Date().toISOString(),
        level: LEVEL,
        seed: SEED,
        simulationTimeScale: TIME_SCALE,
        ok: failures.length === 0,
        failures,
        pageErrors,
        ...resultRest,
    };
    const reportPath = path.join(OUT_DIR, 'jev-playtest-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    if (RECORD_DEMOS && rawSteps?.length) {
        fs.mkdirSync(DEMO_OUT, { recursive: true });
        const rawPath = path.join(DEMO_OUT, `jev-raw-L${LEVEL}-s${SEED}-${Date.now()}.jsonl`);
        const lines = [
            JSON.stringify({
                type: 'header',
                format: 'spacechicken-raw-obs',
                obsVersion: 2,
                expert: 'jev',
                model: resultRest.actions.find((a) => a.model)?.model ?? null,
                level: LEVEL,
                seed: SEED,
                when: report.when,
                won: resultRest.passed,
                deaths: resultRest.finalObservation?.deaths ?? null,
                steps: rawSteps.length,
            }),
            ...rawSteps.map((step) => JSON.stringify(step)),
        ];
        fs.writeFileSync(rawPath, lines.join('\n') + '\n');
        console.log(`Raw demo: ${rawPath} (${rawSteps.length} steps)`);
    }
    console.log(
        `${report.ok ? 'PASS' : 'FAIL'} objective=${report.objective?.status} ` +
            `jevDecisions=${report.jevDecisions} deaths=${report.finalObservation?.deaths}`
    );
    console.log(`Report: ${reportPath}`);
    if (!report.ok) process.exitCode = 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    main().catch((error) => {
        console.error(safeError(error));
        process.exit(1);
    });
}
