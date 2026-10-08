const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const projectRoot = path.resolve(__dirname, '..');

function importModule(fileName) {
    return import(pathToFileURL(path.join(projectRoot, fileName)).href);
}

const PLAYER_ID = '12345678-1234-1234-1234-1234567890ab';
const TOKEN = '87654321-4321-4321-4321-abcdefabcdef';

// Minimal D1 stub: routes on the SQL shape the handlers send.
function mockDb({ session = null, changes = 1 } = {}) {
    return {
        prepare(sql) {
            return {
                bind: () => ({
                    first: async () => {
                        if (sql.includes('level = -1')) return session;
                        if (sql.includes('COUNT(*)')) return { ahead: 0 };
                        if (sql.includes('ORDER BY time_ms DESC')) return null;
                        if (sql.includes('ORDER BY time_ms ASC')) {
                            return {
                                id: `${PLAYER_ID}:entry`,
                                time_ms: 60000,
                                created_at: new Date().toISOString(),
                            };
                        }
                        return null;
                    },
                    run: async () => ({ meta: { changes } }),
                    all: async () => ({ results: [] }),
                }),
            };
        },
    };
}

function postRequest(body) {
    return new Request('https://space-chicken.ailardi.com/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

test('leaderboard api ranks every campaign level including 8-16', async () => {
    const { onRequest } = await importModule('functions/api/leaderboard.js');
    const minuteAgo = new Date(Date.now() - 60000).toISOString();
    const env = {
        DB: mockDb({ session: { name: `run:15:${PLAYER_ID}`, created_at: minuteAgo } }),
    };
    const created = await onRequest({
        request: postRequest({
            level: 15,
            time: 60000,
            name: 'Luna',
            deaths: 4,
            runToken: TOKEN,
            playerId: PLAYER_ID,
        }),
        env,
    });
    assert.equal(created.status, 201);
    const payload = await created.json();
    assert.equal(payload.entry.level, 15);

    const rejected = await onRequest({
        request: postRequest({
            level: 17,
            time: 60000,
            name: 'Luna',
            runToken: TOKEN,
            playerId: PLAYER_ID,
        }),
        env,
    });
    assert.equal(rejected.status, 400);

    const tooFast = await onRequest({
        request: postRequest({
            level: 15,
            time: 100,
            name: 'Luna',
            runToken: TOKEN,
            playerId: PLAYER_ID,
        }),
        env,
    });
    assert.equal(tooFast.status, 400);
});

test('leaderboard api lists all campaign levels', async () => {
    const { onRequest } = await importModule('functions/api/leaderboard.js');
    const response = await onRequest({
        request: new Request('https://space-chicken.ailardi.com/api/leaderboard'),
        env: { DB: mockDb() },
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.deepEqual(
        Object.keys(payload.levels)
            .map(Number)
            .sort((a, b) => a - b),
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
    );
});

test('run api mints tokens for every campaign level', async () => {
    const { onRequest } = await importModule('functions/api/run.js');
    const env = { DB: mockDb() };
    const minted = await onRequest({
        request: postRequest({ level: 15, playerId: PLAYER_ID }),
        env,
    });
    assert.equal(minted.status, 200);
    const payload = await minted.json();
    assert.match(payload.token, /^[0-9a-f-]{36}$/i);

    const rejected = await onRequest({
        request: postRequest({ level: 17, playerId: PLAYER_ID }),
        env,
    });
    assert.equal(rejected.status, 400);
});
