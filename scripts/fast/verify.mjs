/** Compare recorded inputs at 60 Hz with and without rendering on every level. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FastSession } from './session.mjs';
import { LEVEL_IDS } from '../../levels/index.js';
import { encodeObservation } from '../rl/features.mjs';

const levels = process.env.LEVELS ? process.env.LEVELS.split(/\s+/).map(Number) : LEVEL_IDS;
const count = Number(process.env.VERIFY_FRAMES || 1800);
const seed = Number(process.env.SEED || 42);
if (!Number.isInteger(count) || count < 1) throw Error('VERIFY_FRAMES must be a positive integer');
const session = await new FastSession().open();
const report = [];
try {
    for (const level of levels) {
        await session.reset(level, seed, { draw: true, pilot: true });
        // Keep large snapshots in the page rather than transferring megabytes
        // over CDP. Compare the entire snapshot, not just a position checksum.
        await session.page.evaluate((count) => {
            window.__fastReference = window.__spaceChickenFast.pilotBatch({ count, record: true });
        }, count);
        await session.reset(level, seed);
        const result = await session.page.evaluate(() => {
            const reference = window.__fastReference;
            const replay = window.__spaceChickenFast.pilotBatch({
                count: reference.actions.length,
                record: true,
                inputs: reference.actions,
            });
            let mismatch = null;
            for (let frame = 0; frame < reference.states.length; frame++) {
                if (
                    JSON.stringify(replay.states[frame]) !== JSON.stringify(reference.states[frame])
                ) {
                    mismatch = {
                        frame,
                        actual: replay.states[frame],
                        expected: reference.states[frame],
                    };
                    break;
                }
            }
            delete window.__fastReference;
            return {
                frames: replay.states.length,
                referenceFrames: reference.states.length,
                deaths: replay.observation.deaths,
                won: replay.won,
                mismatch,
            };
        });
        if (result.mismatch) {
            fs.writeFileSync(
                '/tmp/space-chicken-fast-mismatch.json',
                JSON.stringify(result.mismatch, null, 2)
            );
            throw Error(
                `L${level} frame ${result.mismatch.frame}: mismatch; see /tmp/space-chicken-fast-mismatch.json`
            );
        }
        assert.equal(result.frames, result.referenceFrames, `L${level}: terminal frame`);
        session.checkErrors();
        const row = {
            level,
            frames: result.frames,
            deaths: result.deaths,
            won: result.won,
            matched: true,
        };
        report.push(row);
        console.log(JSON.stringify(row));
    }
    // Exercise policy inference, action masking, rewards, timeout/truncation,
    // and seeded reset determinism independently of the heuristic pilot.
    const weights = JSON.parse(fs.readFileSync('rl/weights/bc-policy.json', 'utf8'));
    for (const policyLevel of [3, 7]) {
        const policyRuns = [];
        for (const draw of [true, false]) {
            await session.reset(policyLevel, 123, { draw });
            await session.configurePolicy({
                weights,
                decisionMs: 150,
                temperature: 1,
                stepCost: -0.002,
                rng: 123,
            });
            const first = await session.page.evaluate(() =>
                window.__spaceChickenFast.policyBatch({ decisions: 5, maxTicks: 90 })
            );
            const second = await session.page.evaluate(() =>
                window.__spaceChickenFast.policyBatch({ decisions: 5, maxTicks: 90 })
            );
            policyRuns.push({ ...second, steps: [...first.steps, ...second.steps] });
        }
        assert.deepEqual(
            policyRuns[0].steps,
            policyRuns[1].steps,
            'Policy transition/reward parity'
        );
        assert.equal(policyRuns[1].ticks, 90);
        assert.equal(policyRuns[1].steps.length, 10);
        assert.equal(policyRuns[1].steps.at(-1).truncated, true);
        const steps = policyRuns[1].steps;
        for (let index = 0; index < steps.length; index++) {
            const step = steps[index];
            assert.equal(step.mask[step.action], 1, 'Sampled action must be legal');
            assert.ok(Number.isFinite(step.reward));
            assert.ok(Number.isFinite(step.behaviorLogProb));
            if (index + 1 < steps.length)
                assert.deepEqual(
                    encodeObservation(step.nextObs),
                    steps[index + 1].obs,
                    'Observation continuity, including moving platforms and batch boundaries'
                );
        }
    }
    session.checkErrors();
    console.log(
        'Policy transitions match: 150 ms cadence, legal masks, rewards, and horizon truncation.'
    );
    fs.writeFileSync(
        process.env.VERIFY_OUT || '/tmp/space-chicken-fast-parity.json',
        JSON.stringify(report, null, 2) + '\n'
    );
    console.log(
        `${report.length} levels matched: player, hazards, platforms, clocks, HUD, objectives, camera, and death transitions.`
    );
} finally {
    await session.close();
}
