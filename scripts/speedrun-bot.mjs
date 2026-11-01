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

async function main() {
    const { chain, levels } = startPlan();
    const session = await new FastSession().open();
    const splits = [];
    const runStarted = performance.now();
    let completed = false;
    const queue = [...levels];
    try {
        let seedCounter = 0;
        while (queue.length > 0 && splits.length < MAX_LEVELS) {
            const level = queue.shift();
            let split = null;
            for (let attempt = 0; attempt <= RETRIES; attempt++) {
                seedCounter += 1;
                split = await playLevel(session, level, SEED + seedCounter);
                split.attempt = attempt + 1;
                if (split.won) break;
                console.log(`L${level} attempt ${attempt + 1} failed, retrying`);
            }
            splits.push(split);
            console.log(
                `L${split.level} ${split.won ? 'clear' : 'STUCK'} ` +
                    `sim=${(split.simulatedMs / 1000).toFixed(1)}s ` +
                    `wall=${(split.wallTimeMs / 1000).toFixed(1)}s ` +
                    `deaths=${split.deaths} next=${split.pendingLevel ?? (split.gameOver ? 'game-over' : '-')}`
            );
            if (!split.won && chain) break;
            if (chain && split.pendingLevel != null && !levels.includes(split.pendingLevel)) {
                queue.push(split.pendingLevel);
            }
            if (split.gameOver || !split.playerScene) {
                completed = chain ? split.won : splits.every((row) => row.won);
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
        const totalSimMs = splits.reduce((sum, row) => sum + row.simulatedMs, 0);
        const totalWallMs = performance.now() - runStarted;
        const report = {
            type: 'speedrun-report',
            chain,
            seed: SEED,
            completed,
            levels: splits.length,
            wins: splits.filter((row) => row.won).length,
            totalSimMs: Math.round(totalSimMs),
            totalWallMs: Math.round(totalWallMs),
            speed: totalSimMs / totalWallMs,
            splits,
            createdAt: new Date().toISOString(),
        };
        fs.writeFileSync(
            path.join(OUT, 'speedrun-report.json'),
            JSON.stringify(report, null, 2) + '\n'
        );
        console.log(
            `Speedrun: ${report.wins}/${report.levels} clears in ${(totalSimMs / 1000).toFixed(1)}s sim / ${(totalWallMs / 1000).toFixed(1)}s wall (${report.speed.toFixed(1)}x); completed=${completed}`
        );
        if (!completed) process.exitCode = 1;
        return report;
    } finally {
        await session.close();
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
