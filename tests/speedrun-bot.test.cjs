const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const projectRoot = path.resolve(__dirname, '..');

async function loadBot() {
    return import(pathToFileURL(path.join(projectRoot, 'scripts/speedrun-bot.mjs')).href);
}

function fakeAttempt({
    level,
    seed,
    won,
    simulatedMs = 1000,
    wallTimeMs = 100,
    deaths = 0,
    pendingLevel = null,
    gameOver = false,
    playerScene = true,
}) {
    return {
        level,
        seed,
        won,
        ticks: 60,
        simulatedMs,
        wallTimeMs,
        deaths,
        elapsedMs: simulatedMs,
        pendingLevel,
        gameOver,
        playerScene,
    };
}

function scriptedPlay(script, calls = []) {
    return async (level, seed) => {
        calls.push([level, seed]);
        const row = script[calls.length - 1];
        if (!row) throw Error(`No scripted attempt for call ${calls.length} (L${level})`);
        return { ...row };
    };
}

test('a failed attempt followed by a win aggregates both attempts', async () => {
    const { runSpeedrun, buildSpeedrunReport } = await loadBot();
    const calls = [];
    const { splits, completed } = await runSpeedrun({
        chain: false,
        levels: [3],
        maxLevels: 40,
        retries: 2,
        seedBase: 1,
        playLevel: scriptedPlay(
            [
                fakeAttempt({ level: 3, seed: 2, won: false, simulatedMs: 420000, deaths: 5 }),
                fakeAttempt({ level: 3, seed: 3, won: true, simulatedMs: 120000, deaths: 2 }),
            ],
            calls
        ),
        onLog: () => {},
    });
    assert.equal(completed, true);
    assert.equal(splits.length, 1);
    const [split] = splits;
    assert.equal(split.won, true);
    assert.equal(split.firstAttemptClear, false);
    assert.deepEqual(calls, [
        [3, 2],
        [3, 3],
    ]);
    assert.deepEqual(
        split.attempts.map((row) => ({
            seed: row.seed,
            won: row.won,
            deaths: row.deaths,
            simulatedMs: row.simulatedMs,
        })),
        [
            { seed: 2, won: false, deaths: 5, simulatedMs: 420000 },
            { seed: 3, won: true, deaths: 2, simulatedMs: 120000 },
        ]
    );
    assert.equal(split.simulatedMs, 540000);
    assert.equal(split.deaths, 7);

    const report = buildSpeedrunReport({
        chain: false,
        seed: 1,
        splits,
        completed,
        totalWallMs: 1000,
    });
    assert.equal(report.levels, 1);
    assert.equal(report.wins, 1);
    assert.equal(report.firstAttemptWins, 0);
    assert.equal(report.totalAttempts, 2);
    assert.equal(report.totalDeaths, 7);
    assert.equal(report.totalSimMs, 540000);
});

test('an explicit finale followed by another level runs both before completing', async () => {
    const { runSpeedrun } = await loadBot();
    const calls = [];
    const { splits, completed } = await runSpeedrun({
        chain: false,
        levels: [15, 16],
        maxLevels: 40,
        retries: 0,
        seedBase: 1,
        playLevel: scriptedPlay(
            [
                fakeAttempt({ level: 15, seed: 2, won: true, gameOver: true }),
                fakeAttempt({ level: 16, seed: 3, won: true }),
            ],
            calls
        ),
        onLog: () => {},
    });
    assert.deepEqual(calls, [
        [15, 2],
        [16, 3],
    ]);
    assert.equal(splits.length, 2);
    assert.ok(splits.every((row) => row.won));
    assert.equal(completed, true);
});

test('an explicit queue with a later failure never reports completion', async () => {
    const { runSpeedrun } = await loadBot();
    const calls = [];
    const { splits, completed } = await runSpeedrun({
        chain: false,
        levels: [15, 16],
        maxLevels: 40,
        retries: 0,
        seedBase: 1,
        playLevel: scriptedPlay(
            [
                fakeAttempt({ level: 15, seed: 2, won: true, gameOver: true }),
                fakeAttempt({ level: 16, seed: 3, won: false }),
            ],
            calls
        ),
        onLog: () => {},
    });
    // The L15 finale must not end the queue early with a premature completed=true.
    assert.equal(calls.length, 2);
    assert.equal(splits.length, 2);
    assert.equal(completed, false);
});

test('a chained finale still ends the campaign run once won', async () => {
    const { runSpeedrun } = await loadBot();
    const calls = [];
    const { splits, completed } = await runSpeedrun({
        chain: true,
        levels: [15],
        maxLevels: 40,
        retries: 0,
        seedBase: 1,
        playLevel: scriptedPlay(
            [fakeAttempt({ level: 15, seed: 2, won: true, gameOver: true })],
            calls
        ),
        onLog: () => {},
    });
    assert.equal(calls.length, 1);
    assert.equal(splits.length, 1);
    assert.equal(completed, true);
});
