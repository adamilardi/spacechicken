import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { FastSession } from './session.mjs';
import { LEVEL_IDS } from '../../levels/index.js';
import { OBS_VERSION } from '../rl/features.mjs';

function positive(name, fallback) {
    const value = Number(process.env[name] ?? fallback);
    if (!Number.isFinite(value) || value <= 0) throw Error(`${name} must be positive`);
    return value;
}

function readOptions(policy) {
    if (process.env.RECORD_VIDEO === '1') throw Error('Use the normal runner to record video');
    if (Number(process.env.WARM_START || 0) > 0)
        throw Error('Fast mode currently requires WARM_START=0');
    if (process.env.SPACE_CHICKEN_URL)
        throw Error('Fast mode runs the local checkout; unset SPACE_CHICKEN_URL');
    const durationMs = positive('DURATION_MS', policy ? 75000 : 180000);
    const maxTicks = Math.ceil((durationMs * 60) / 1000);
    const repeats = Math.floor(positive(policy ? 'EPISODE_COUNT' : 'TRIALS', 1));
    const levels = (process.env.LEVELS || process.env.LEVEL || '1').split(/\s+/).map(Number);
    if (levels.some((level) => !LEVEL_IDS.includes(level))) throw Error('Invalid level');
    const baseSeed = Number(process.env.SEED || 1);
    if (!Number.isInteger(baseSeed)) throw Error('SEED must be an integer');
    const out =
        process.env[policy ? 'ROLLOUT_OUT' : 'BOT_SCREENSHOT_DIR'] ||
        (policy ? 'rl/rollouts' : '.bot-runs');
    fs.mkdirSync(out, { recursive: true });
    const weights = policy
        ? JSON.parse(fs.readFileSync(process.env.POLICY || 'rl/weights/bc-policy.json', 'utf8'))
        : null;
    const policyId = process.env.POLICY_ID || 'manual';
    const plan = Array.from({ length: repeats }, (_, index) => ({
        level: levels[
            process.env.LEVEL_SWEEP === '1' || !policy
                ? index % levels.length
                : Math.floor(Math.random() * levels.length)
        ],
        seed: baseSeed + index,
    })).sort((a, b) => a.level - b.level);
    return { maxTicks, out, weights, policyId, plan };
}

export async function runFast({ policy = false } = {}) {
    const { maxTicks, out, weights, policyId, plan } = readOptions(policy);
    const session = await new FastSession().open();
    const summaries = [];
    const runStarted = performance.now();
    try {
        for (const { level, seed } of plan) {
            const started = performance.now();
            await session.reset(level, seed, { pilot: !policy });
            if (policy) {
                const best = JSON.parse(process.env.BEST_JSON || '{}');
                await session.configurePolicy({
                    weights,
                    decisionMs: positive('DECISION_MS', 150),
                    temperature: positive('TEMPERATURE', 1),
                    stepCost: Number(process.env.STEP_COST || -0.002),
                    bestMs: Number(best[level] ?? process.env.BEST_MS ?? NaN),
                    rng: seed >>> 0,
                });
            }
            let result;
            let computeMs = 0;
            const steps = [];
            do {
                if (performance.now() - started > 120000)
                    throw Error('Episode exceeded 120s wall-clock watchdog');
                const batch = await session.page.evaluate(
                    ({ policy, maxTicks }) => {
                        const fast = window.__spaceChickenFast;
                        const result = policy
                            ? fast.policyBatch({ maxTicks })
                            : fast.pilotBatch({
                                  count: Math.min(600, maxTicks - fast.status().ticks),
                              });
                        return JSON.stringify(result);
                    },
                    { policy, maxTicks }
                );
                result = JSON.parse(batch);
                computeMs += result.computeMs;
                if (policy) steps.push(...result.steps);
                session.checkErrors();
            } while (!result.won && !result.stopped && result.ticks < maxTicks);
            const wallTimeMs = performance.now() - started;
            const summary = {
                type: 'header',
                format: policy ? 'spacechicken-rollout' : 'spacechicken-fast-pilot',
                obsVersion: OBS_VERSION,
                policyId,
                fast: true,
                timescale: 1,
                temperature: policy ? positive('TEMPERATURE', 1) : null,
                level,
                seed,
                won: result.won,
                warmStart: null,
                aborted: Boolean(!result.won && result.stopped && result.ticks < maxTicks),
                timeMs: result.simulatedMs,
                elapsedMs: result.observation.elapsedMs,
                simulatedMs: result.simulatedMs,
                wallTimeMs,
                computeMs,
                speed: result.simulatedMs / wallTimeMs,
                simulationSpeed: result.simulatedMs / computeMs,
                deaths: result.observation.deaths,
                steps: steps.length,
                ticks: result.ticks,
                createdAt: new Date().toISOString(),
            };
            summaries.push(summary);
            if (policy) {
                // Keep rollout-* names so the existing trainer/loop picks them up.
                const name = `rollout-L${level}-s${seed}-${policyId}-${Date.now()}.jsonl`;
                fs.writeFileSync(
                    path.join(out, name),
                    [summary, ...steps].map((row) => JSON.stringify(row)).join('\n') + '\n'
                );
            }
            console.log(JSON.stringify(summary));
        }
        if (!policy)
            fs.writeFileSync(
                path.join(out, 'fast-report.json'),
                JSON.stringify(summaries, null, 2) + '\n'
            );
        const simulated = summaries.reduce((sum, row) => sum + row.simulatedMs, 0);
        console.log(
            `Fast ${policy ? 'rollouts' : 'pilot'}: ${summaries.filter((row) => row.won).length}/${summaries.length} wins; ${(simulated / (performance.now() - runStarted)).toFixed(1)}x including resets and output (browser launch excluded)`
        );
        if (!policy && !summaries.some((row) => row.won)) process.exitCode = 1;
        return summaries;
    } finally {
        await session.close();
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    runFast({ policy: process.env.FAST_POLICY === '1' }).catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
