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
            mode TEXT NOT NULL DEFAULT 'normal',
            name TEXT NOT NULL,
            time_ms INTEGER NOT NULL,
            deaths INTEGER NOT NULL DEFAULT 0,
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
        batch: async (statements) => Promise.all(statements.map((statement) => statement.all())),
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
    for (const level of [0, 1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]) {
        assert.equal((await start(level)).status, 200, `level ${level}`);
    }
    assert.equal((await start(17)).status, 400);
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
    // Instant min-time submit must fail: token is brand new (elapsed ~0) so a
    // 1000ms claim is implausible (elapsed < time - 750).
    assert.equal((await submit(1_000)).status, 400);
    // Backdate the token so elapsed covers the claimed time, then it is accepted.
    DB.sqlite
        .prepare('UPDATE leaderboard_entries SET created_at = ? WHERE id = ?')
        .run(new Date(Date.now() - 5000).toISOString(), token);
    const accepted = await submit(1_000);
    assert.equal(accepted.status, 201);
    assert.equal((await accepted.json()).rank, 1);
    assert.equal((await submit(1_000)).status, 400);
});

test('hard and normal leaderboards stay in separate scopes', async () => {
    const [{ onRequest: startRun }, { onRequest: leaderboard }] = await apiPromise;
    const DB = d1Database();
    const env = { DB };
    const playerId = '123e4567-e89b-42d3-a456-426614174000';
    const mint = (mode) =>
        startRun({
            request: new Request('https://example.test/api/run', {
                method: 'POST',
                body: JSON.stringify({ level: 2, playerId, mode }),
            }),
            env,
        });
    const hardToken = await (await mint('hard')).json().then((payload) => payload.token);
    DB.sqlite
        .prepare('UPDATE leaderboard_entries SET created_at = ? WHERE id = ?')
        .run(new Date(Date.now() - 5000).toISOString(), hardToken);
    const accepted = await leaderboard({
        request: new Request('https://example.test/api/leaderboard', {
            method: 'POST',
            body: JSON.stringify({
                level: 2,
                name: 'Hex',
                time: 2000,
                runToken: hardToken,
                playerId,
                mode: 'hard',
            }),
        }),
        env,
    });
    assert.equal(accepted.status, 201);
    assert.equal((await accepted.json()).mode, 'hard');

    const normalView = await leaderboard({
        request: new Request('https://example.test/api/leaderboard?level=2'),
        env,
    });
    const normalData = await normalView.json();
    assert.equal(normalData.mode, 'normal');
    assert.deepEqual(normalData.levels[2], []);

    const hardView = await leaderboard({
        request: new Request('https://example.test/api/leaderboard?level=2&mode=hard'),
        env,
    });
    const hardData = await hardView.json();
    assert.equal(hardData.mode, 'hard');
    assert.equal(hardData.levels[2][0].name, 'Hex');

    // A hard token cannot submit a normal time.
    const otherToken = await (await mint('hard')).json().then((payload) => payload.token);
    DB.sqlite
        .prepare('UPDATE leaderboard_entries SET created_at = ? WHERE id = ?')
        .run(new Date(Date.now() - 5000).toISOString(), otherToken);
    const crossed = await leaderboard({
        request: new Request('https://example.test/api/leaderboard', {
            method: 'POST',
            body: JSON.stringify({
                level: 2,
                name: 'Hex',
                time: 2000,
                runToken: otherToken,
                playerId,
            }),
        }),
        env,
    });
    assert.equal(crossed.status, 400);
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
    assert.deepEqual(Object.keys(data.levels), [
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '10',
        '11',
        '12',
        '13',
        '14',
        '15',
        '16',
    ]);
    assert.equal(data.levels[1][0].name, 'Old champion');
    assert.equal(data.weekly[1][0].name, 'New challenger');
    assert.equal(data.weekly[1].length, 2);
    assert.equal(data.hallOfFame[1][0].name, 'Old champion');
    assert.equal(data.levels[0][0].name, 'Full run');
});

test('leaderboard GET rejects an invalid level instead of returning everything', async () => {
    const [, { onRequest: leaderboard }] = await apiPromise;
    const response = await leaderboard({
        request: new Request('https://example.test/api/leaderboard?level=99'),
        env: { DB: d1Database() },
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'Invalid level' });
});

test('leaderboard keeps unicode names and records deaths', async () => {
    const [{ onRequest: startRun }, { onRequest: leaderboard }] = await apiPromise;
    const DB = d1Database();
    const env = { DB };
    const playerId = '123e4567-e89b-42d3-a456-426614174000';
    const otherId = '223e4567-e89b-42d3-a456-426614174000';
    const mint = async (minterId) => {
        const runResponse = await startRun({
            request: new Request('https://example.test/api/run', {
                method: 'POST',
                body: JSON.stringify({ level: 3, playerId: minterId }),
            }),
            env,
        });
        const { token } = await runResponse.json();
        DB.sqlite
            .prepare('UPDATE leaderboard_entries SET created_at = ? WHERE id = ?')
            .run(new Date(Date.now() - 5000).toISOString(), token);
        return token;
    };
    const submit = (name, time, deaths, runToken, submitterId) =>
        leaderboard({
            request: new Request('https://example.test/api/leaderboard', {
                method: 'POST',
                body: JSON.stringify({
                    level: 3,
                    name,
                    time,
                    deaths,
                    runToken,
                    playerId: submitterId,
                }),
            }),
            env,
        });
    const accepted = await submit('Zoë-Åsa_田中', 2000, 4, await mint(playerId), playerId);
    assert.equal(accepted.status, 201);
    const payload = await accepted.json();
    assert.equal(payload.entry.name, 'Zoë-Åsa_田中');
    assert.equal(payload.entry.deaths, 4);
    const hostile = await submit('A<script>/b', 2500, -3, await mint(otherId), otherId);
    assert.equal(hostile.status, 201);
    const hostilePayload = await hostile.json();
    assert.equal(hostilePayload.entry.name, 'Ascriptb');
    assert.equal(hostilePayload.entry.deaths, 0);
    const board = await (
        await leaderboard({
            request: new Request('https://example.test/api/leaderboard?level=3'),
            env,
        })
    ).json();
    assert.equal(board.levels[3][0].name, 'Zoë-Åsa_田中');
    assert.equal(board.levels[3][0].deaths, 4);
    assert.equal('deaths' in board.levels[3][1], false);
});

test('submits survive long pauses between mint and submit', async () => {
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
    const { token } = await runResponse.json();
    DB.sqlite
        .prepare('UPDATE leaderboard_entries SET created_at = ? WHERE id = ?')
        .run(new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), token);
    const accepted = await leaderboard({
        request: new Request('https://example.test/api/leaderboard', {
            method: 'POST',
            body: JSON.stringify({
                level: 1,
                name: 'Pausey',
                time: 5000,
                runToken: token,
                playerId,
            }),
        }),
        env,
    });
    assert.equal(accepted.status, 201);
});

test('run minting throttles runaway clients', async () => {
    const [{ onRequest: startRun }] = await apiPromise;
    const env = { DB: d1Database() };
    const playerId = '123e4567-e89b-42d3-a456-426614174000';
    const mint = () =>
        startRun({
            request: new Request('https://example.test/api/run', {
                method: 'POST',
                body: JSON.stringify({ level: 1, playerId }),
            }),
            env,
        });
    let lastStatus = 0;
    for (let i = 0; i < 120; i++) {
        lastStatus = (await mint()).status;
    }
    assert.equal(lastStatus, 200);
    const limited = await mint();
    assert.equal(limited.status, 429);
    assert.equal((await limited.json()).error, 'Too many run starts, try again later');
});
