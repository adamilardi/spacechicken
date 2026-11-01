/**
 * Generic campaign speedrun bot — no per-level logic.
 *
 * Reuses the shared in-page pilot (scripts/pilot-brain.mjs) and the fast
 * headless stepper (scripts/fast/*) to play the game start to finish as
 * fast as the machine allows, following the game's own level advances.
 *
 *   npm run bot:speedrun
 *   START_LEVEL=8 npm run bot:speedrun
 *   SPEEDRUN_LEVELS="8 9 10" npm run bot:speedrun
 *   DURATION_MS=120000 SEED=7 SPEEDRUN_RETRIES=0 npm run bot:speedrun
 *
 * Per-level splits go to the console and to
 * .bot-runs/speedrun-report.json (or BOT_SCREENSHOT_DIR). Exits non-zero
 * unless the run completes the chain.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { FastSession } from './fast/session.mjs';
import { LEVEL_DEFINITIONS, LEVEL_IDS } from '../levels/index.js';
import { shortestBranchIndex } from './branch-route.mjs';

function positive(name, fallback) {
    const value = Number(process.env[name] ?? fallback);
    if (!Number.isFinite(value) || value <= 0) throw Error(`${name} must be positive`);
    return value;
}

const MAX_TICKS = Math.ceil((positive('DURATION_MS', 420000) * 60) / 1000);
const SEED = Number(process.env.SEED || 1);
if (!Number.isInteger(SEED)) throw Error('SEED must be an integer');
const RETRIES = Math.max(0, Math.floor(Number(process.env.SPEEDRUN_RETRIES ?? 2)));
const MAX_LEVELS = Math.floor(positive('MAX_LEVELS', 40));
const OUT = process.env.BOT_SCREENSHOT_DIR || '.bot-runs';
fs.mkdirSync(OUT, { recursive: true });

function startPlan() {
    if (process.env.SPEEDRUN_LEVELS) {
        const levels = process.env.SPEEDRUN_LEVELS.split(/\s+/).map(Number);
        if (levels.some((level) => !LEVEL_IDS.includes(level))) throw Error('Invalid level');
        return { chain: false, levels };
    }
    const start = Number(process.env.START_LEVEL || 1);
    if (!LEVEL_IDS.includes(start)) throw Error('Invalid START_LEVEL');
    return { chain: true, levels: [start] };
}

async function readState(session) {
    const raw = await session.page.evaluate(() => {
        const game = window.SPACE_CHICKEN_GAME;
        const scene = game.scene.getScenes(true).find((item) => item.player);
        if (!scene) return JSON.stringify({ playerScene: false });
        const snap = window.__spaceChickenDebug.getBotSnapshot();
        return JSON.stringify({
            playerScene: true,
            level: snap.level,
            deaths: snap.deaths,
            elapsedMs: snap.elapsedMs,
            gameOver: Boolean(snap.gameOver),
            pendingLevel: snap.pendingLevel ?? null,
        });
    });
    return JSON.parse(raw);
}

async function playLevel(session, level, seed) {
    await session.reset(level, seed, { pilot: true });
    const started = performance.now();
    let result = null;
    for (;;) {
        if (performance.now() - started > 120000)
            throw Error(`Level ${level} exceeded 120s wall watchdog`);
        const batch = await session.page.evaluate(
            ({ maxTicks }) => {
                const fast = window.__spaceChickenFast;
                const result = fast.pilotBatch({
                    count: Math.min(600, maxTicks - fast.status().ticks),
                });
                const snap = window.__spaceChickenDebug.getBotSnapshot();
                return JSON.stringify({
                    result,
                    awaitingBranch: Boolean(snap.awaitingBranch),
                    branchOptions: snap.branchOptions ?? null,
                });
            },
            { maxTicks: MAX_TICKS }
        );
        const observed = JSON.parse(batch);
        result = observed.result;
        session.checkErrors();
        if (observed.awaitingBranch && !result.won) {
            // A branch level (L12) ends in a UI choice the gameplay pilot
            // cannot answer: pick the shortest route to the finale.
            const pick = shortestBranchIndex(observed.branchOptions, LEVEL_DEFINITIONS);
            const picked = await session.page.evaluate((index) => {
                const game = window.SPACE_CHICKEN_GAME;
                const scene = game.scene.getScenes(true).find((item) => item.player);
                if (!scene || !scene.awaitingBranch) return JSON.stringify({ picked: false });
                scene.uiManager.pickBranch(index);
                return JSON.stringify({ picked: true });
            }, pick);
            session.checkErrors();
            if (!JSON.parse(picked).picked) throw Error(`Level ${level} branch pick rejected`);
            console.log(
                `L${level} branch ${JSON.stringify(observed.branchOptions)} -> ${observed.branchOptions?.[pick]}`
            );
        }
        if (result.won || result.ticks >= MAX_TICKS) break;
    }
    const wallTimeMs = performance.now() - started;
    const state = result.won ? await readState(session) : null;
    return {
        level,
        seed,
        won: result.won,
        ticks: result.ticks,
        simulatedMs: result.simulatedMs,
        wallTimeMs: Math.round(wallTimeMs),
        speed: result.simulatedMs / wallTimeMs,
        deaths: result.observation.deaths,
        elapsedMs: result.observation.elapsedMs,
        pendingLevel: state && state.playerScene ? state.pendingLevel : null,
        gameOver: state && state.playerScene ? state.gameOver : false,
        playerScene: state ? state.playerScene : true,
    };
}

export function buildSplit(level, attempts) {
    if (attempts.length === 0) throw Error(`Level ${level} ran zero attempts`);
    const final = attempts[attempts.length - 1];
    const sum = (key) => attempts.reduce((total, row) => total + row[key], 0);
    return {
        level,
        won: final.won,
        firstAttemptClear: attempts[0].won,
        attempts,
        simulatedMs: sum('simulatedMs'),
        wallTimeMs: sum('wallTimeMs'),
        deaths: sum('deaths'),
        pendingLevel: final.pendingLevel,
        gameOver: final.gameOver,
        playerScene: final.playerScene,
    };
}

export async function runSpeedrun({
    chain,
    levels,
    maxLevels,
    retries,
    seedBase,
    playLevel: playLevelFn,
    onLog = () => {},
}) {
    const splits = [];
    let completed = false;
    const queue = [...levels];
    let seedCounter = 0;
    while (queue.length > 0 && splits.length < maxLevels) {
        const level = queue.shift();
        const attempts = [];
        for (let attempt = 0; attempt <= retries; attempt++) {
            seedCounter += 1;
            const row = await playLevelFn(level, seedBase + seedCounter);
            row.attempt = attempt + 1;
            attempts.push(row);
            if (row.won) break;
            onLog(`L${level} attempt ${attempt + 1} failed, retrying`);
        }
        const split = buildSplit(level, attempts);
        splits.push(split);
        onLog(
            `L${split.level} ${split.won ? 'clear' : 'STUCK'} ` +
                `sim=${(split.simulatedMs / 1000).toFixed(1)}s ` +
                `wall=${(split.wallTimeMs / 1000).toFixed(1)}s ` +
                `deaths=${split.deaths} attempts=${split.attempts.length} ` +
                `next=${split.pendingLevel ?? (split.gameOver ? 'game-over' : '-')}`
        );
        if (!split.won && chain) break;
        if (chain && split.pendingLevel != null && !levels.includes(split.pendingLevel)) {
            queue.push(split.pendingLevel);
        }
        // A finale gameOver ends a chained campaign run, but in explicit-list
        // mode it finishes only that split: the rest of the queue still runs.
        if (chain && (split.gameOver || !split.playerScene)) {
            completed = split.won;
            break;
        }
        if (!chain && queue.length === 0) {
            completed = splits.every((row) => row.won);
        }
    }
    if (
        chain &&
        !completed &&
        splits.length > 0 &&
        splits.every((row) => row.won) &&
        queue.length === 0
    ) {
        completed = true;
    }
    return { splits, completed };
}

export function buildSpeedrunReport({ chain, seed, splits, completed, totalWallMs }) {
    const attempts = splits.flatMap((split) => split.attempts);
    const totalSimMs = attempts.reduce((sum, row) => sum + row.simulatedMs, 0);
    const totalDeaths = attempts.reduce((sum, row) => sum + row.deaths, 0);
    return {
        type: 'speedrun-report',
        chain,
        seed,
        completed,
        levels: splits.length,
        wins: splits.filter((row) => row.won).length,
        firstAttemptWins: splits.filter((row) => row.firstAttemptClear).length,
        totalAttempts: attempts.length,
        totalDeaths,
        totalSimMs: Math.round(totalSimMs),
        totalWallMs: Math.round(totalWallMs),
        speed: totalSimMs / totalWallMs,
        splits,
        createdAt: new Date().toISOString(),
    };
}

async function main() {
    const { chain, levels } = startPlan();
    const session = await new FastSession().open();
    const runStarted = performance.now();
    try {
        const { splits, completed } = await runSpeedrun({
            chain,
            levels,
            maxLevels: MAX_LEVELS,
            retries: RETRIES,
            seedBase: SEED,
            playLevel: (level, seed) => playLevel(session, level, seed),
            onLog: (line) => console.log(line),
        });
        const totalWallMs = performance.now() - runStarted;
        const report = buildSpeedrunReport({
            chain,
            seed: SEED,
            splits,
            completed,
            totalWallMs,
        });
        fs.writeFileSync(
            path.join(OUT, 'speedrun-report.json'),
            JSON.stringify(report, null, 2) + '\n'
        );
        console.log(
            `Speedrun: ${report.wins}/${report.levels} clears ` +
                `(${report.firstAttemptWins} first-attempt) in ${(report.totalSimMs / 1000).toFixed(1)}s sim / ` +
                `${(report.totalWallMs / 1000).toFixed(1)}s wall (${report.speed.toFixed(1)}x); ` +
                `attempts=${report.totalAttempts} deaths=${report.totalDeaths} completed=${completed}`
        );
        if (!completed) process.exitCode = 1;
        return report;
    } finally {
        await session.close();
    }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
