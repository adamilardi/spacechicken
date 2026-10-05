const test = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');

const apiPromise = Promise.all([
    import('../functions/api/run.js'),
    import('../functions/api/leaderboard.js'),
]);

function d1Database() {
    const sqlite = new DatabaseSync(':memory:');
    sqlite.exec(`
        CREATE TABLE leaderboard_entries (
            id TEXT PRIMARY KEY,
            level INTEGER NOT NULL,
            name TEXT NOT NULL,
            time_ms INTEGER NOT NULL,
            created_at TEXT NOT NULL
        );
    `);
    return {
        sqlite,
        prepare(sql) {
            return {
                bind(...values) {
                    const statement = sqlite.prepare(sql);
                    return {
                        all: async () => ({ results: statement.all(...values) }),
                        first: async () => statement.get(...values),
                        run: async () => ({ meta: { changes: statement.run(...values).changes } }),
                    };
                },
            };
        },
    };
}

test('run tokens cover the full game and every campaign level', async () => {
    const [{ onRequest: startRun }] = await apiPromise;
    const playerId = '123e4567-e89b-42d3-a456-426614174000';
    const start = (level) =>
        startRun({
            request: new Request('https://example.test/api/run', {
                method: 'POST',
                body: JSON.stringify({ level, playerId }),
            }),
            env: { DB: d1Database() },
        });
    for (const level of [0, 1, 4, 5, 6, 7]) {
        assert.equal((await start(level)).status, 200, `level ${level}`);
    }
    assert.equal((await start(8)).status, 400);
    assert.equal((await start(-1)).status, 400);
});

test('run tokens are required, time checked, and single use', async () => {
    const [{ onRequest: startRun }, { onRequest: leaderboard }] = await apiPromise;
    const DB = d1Database();
    const env = { DB };
    const playerId = '123e4567-e89b-42d3-a456-426614174000';
    const runResponse = await startRun({
        request: new Request('https://example.test/api/run', {
            method: 'POST',
            body: JSON.stringify({ level: 1, playerId }),
        }),
        env,
    });
    assert.equal(runResponse.status, 200);
    const { token } = await runResponse.json();
    const submit = (time, runToken = token) =>
        leaderboard({
            request: new Request('https://example.test/api/leaderboard', {
                method: 'POST',
                body: JSON.stringify({ level: 1, name: 'Luna', time, runToken, playerId }),
            }),
            env,
        });
    assert.equal((await submit(10_000)).status, 400);
    assert.equal((await submit(1_000, '')).status, 400);
    const accepted = await submit(1_000);
    assert.equal(accepted.status, 201);
    assert.equal((await accepted.json()).rank, 1);
    assert.equal((await submit(1_000)).status, 400);
});

test('null submission returns a validation error', async () => {
    const [, { onRequest: leaderboard }] = await apiPromise;
    const response = await leaderboard({
        request: new Request('https://example.test/api/leaderboard', {
            method: 'POST',
            body: 'null',
        }),
        env: { DB: d1Database() },
    });
    assert.equal(response.status, 400);
});

test('weekly rank uses the player’s best time for the week', async () => {
    const [, { onRequest: leaderboard }] = await apiPromise;
    const DB = d1Database();
    const playerId = '123e4567-e89b-42d3-a456-426614174000';
    const token = '223e4567-e89b-42d3-a456-426614174000';
    const createdAt = new Date(Date.now() - 5000).toISOString();
    const insert = DB.sqlite.prepare(
        'INSERT INTO leaderboard_entries (id, level, name, time_ms, created_at) VALUES (?, ?, ?, ?, ?)'
    );
    insert.run(`${playerId}:first`, 1, 'Pilot', 1000, createdAt);
    insert.run('other', 1, 'Rival', 1100, createdAt);
    insert.run(token, -1, `run:1:${playerId}`, 0, createdAt);
    const response = await leaderboard({
        request: new Request('https://example.test/api/leaderboard', {
            method: 'POST',
            body: JSON.stringify({
                level: 1,
                name: 'Pilot',
                time: 1200,
                runToken: token,
                playerId,
            }),
        }),
        env: { DB },
    });
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.equal(result.rank, 1);
    assert.equal(result.weeklyRank, 1);
});

test('weekly standings reset while past winners and full run remain visible', async () => {
    const [, { onRequest: leaderboard }] = await apiPromise;
    const DB = d1Database();
    const today = new Date();
    const day = today.getUTCDay();
    const monday = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    );
    monday.setUTCDate(monday.getUTCDate() - ((day + 6) % 7));
    const lastMonday = new Date(monday.getTime() - 7 * 86400000);
    const insert = DB.sqlite.prepare(
        'INSERT INTO leaderboard_entries (id, level, name, time_ms, created_at) VALUES (?, ?, ?, ?, ?)'
    );
    insert.run('old', 1, 'Old champion', 900, lastMonday.toISOString());
    insert.run('new', 1, 'New challenger', 1200, monday.toISOString());
    insert.run(
        '123e4567-e89b-42d3-a456-426614174000:first',
        1,
        'Repeat player',
        1300,
        monday.toISOString()
    );
    insert.run(
        '123e4567-e89b-42d3-a456-426614174000:second',
        1,
        'Repeat player',
        1400,
        monday.toISOString()
    );
    insert.run('full', 0, 'Full run', 60000, monday.toISOString());
    const response = await leaderboard({
        request: new Request('https://example.test/api/leaderboard'),
        env: { DB },
    });
    const data = await response.json();
    assert.deepEqual(Object.keys(data.levels), ['0', '1', '2', '3', '4', '5', '6', '7']);
    assert.equal(data.levels[1][0].name, 'Old champion');
    assert.equal(data.weekly[1][0].name, 'New challenger');
    assert.equal(data.weekly[1].length, 2);
    assert.equal(data.hallOfFame[1][0].name, 'Old champion');
    assert.equal(data.levels[0][0].name, 'Full run');
});
