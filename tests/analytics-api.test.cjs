const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const projectRoot = path.resolve(__dirname, '..');

function importModule(fileName) {
    return import(pathToFileURL(path.join(projectRoot, fileName)).href);
}

const SESSION = '12345678-1234-1234-1234-1234567890ab';

// Minimal D1 stub: routes on the SQL shape the handler sends and records writes.
function mockDb(overrides = {}) {
    const writes = [];
    const db = {
        writes,
        prepare(sql) {
            const statement = {
                sql,
                bind: (...values) => ({
                    sql,
                    values,
                    first: async () => {
                        if (sql.includes('COUNT(DISTINCT session_id)')) {
                            return { sessions: 5 };
                        }
                        return null;
                    },
                    all: async () => {
                        if (overrides.results?.[sql]) {
                            return { results: overrides.results[sql] };
                        }
                        if (sql.includes('GROUP BY session_id')) {
                            return {
                                results: [
                                    { session_id: 'a', play_ms: 120000, levels: 3 },
                                    { session_id: 'b', play_ms: 60000, levels: 1 },
                                ],
                            };
                        }
                        if (sql.includes('GROUP BY level')) {
                            return {
                                results: [
                                    {
                                        level: 1,
                                        starts: 4,
                                        completions: 3,
                                        avg_ms: 45000,
                                        avg_deaths: 2,
                                        deaths: 8,
                                    },
                                ],
                            };
                        }
                        if (sql.includes("type = 'death'")) {
                            return { results: [{ kind: 'fall', deaths: 5 }] };
                        }
                        if (sql.includes('GROUP BY day')) {
                            return { results: [{ day: '2026-11-20', sessions: 2 }] };
                        }
                        if (sql.includes("type = 'session_start'")) {
                            return { results: [{ kind: 'desktop', sessions: 4 }] };
                        }
                        if (sql.includes('COUNT(DISTINCT session_id)')) {
                            return { results: [{ sessions: 5 }] };
                        }
                        return { results: [] };
                    },
                    run: async () => {
                        writes.push({ sql, values });
                        return { meta: { changes: 1 } };
                    },
                }),
            };
            return statement;
        },
        batch: async (statements) =>
            Promise.all(
                statements.map((statement) =>
                    /^\s*(INSERT|DELETE)/i.test(statement.sql) ? statement.run() : statement.all()
                )
            ),
    };
    return db;
}

function postRequest(body) {
    return new Request('https://space-chicken.ailardi.com/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

function validEvents() {
    return [
        { type: 'session_start', kind: 'desktop' },
        { type: 'level_start', level: 1, mode: 'normal' },
        { type: 'level_complete', level: 1, mode: 'normal', value: 45000, count: 2 },
        { type: 'death', level: 2, kind: 'fall', value: 12000, count: 1 },
        { type: 'session_ping', value: 180000, count: 3 },
        { type: 'session_end', value: 200000, count: 3 },
    ];
}

test('analytics api stores a valid batch', async () => {
    const { onRequest } = await importModule('functions/api/analytics.js');
    const env = { DB: mockDb() };
    const response = await onRequest({
        request: postRequest({ session: SESSION, events: validEvents() }),
        env,
    });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { ok: true, stored: 6 });
    const inserts = env.DB.writes.filter((write) => /^INSERT/i.test(write.sql.trim()));
    assert.equal(inserts.length, 6);
    assert.deepEqual(inserts[0].values.slice(0, 7), [
        SESSION,
        'session_start',
        null,
        'normal',
        0,
        0,
        'desktop',
    ]);
    const cleanup = env.DB.writes.filter((write) => /^DELETE/i.test(write.sql.trim()));
    assert.equal(cleanup.length, 1);
});

test('analytics api rejects invalid batches', async () => {
    const { onRequest } = await importModule('functions/api/analytics.js');
    const env = { DB: mockDb() };
    const cases = [
        [{ session: 'short', events: validEvents() }, 'Invalid session'],
        [{ session: SESSION, events: [] }, 'Invalid events batch'],
        [
            { session: SESSION, events: new Array(51).fill({ type: 'session_ping' }) },
            'Invalid events batch',
        ],
        [{ session: SESSION, events: [{ type: 'bogus' }] }, 'Invalid event'],
        [{ session: SESSION, events: [{ type: 'death', level: 999 }] }, 'Invalid event'],
        [{ session: SESSION, events: [{ type: 'death', kind: 'evil";--' }] }, 'Invalid event'],
        [{ session: SESSION, events: [{ type: 'session_ping', value: -5 }] }, 'Invalid event'],
    ];
    for (const [body, error] of cases) {
        const response = await onRequest({ request: postRequest(body), env });
        assert.equal(response.status, 400);
        assert.equal((await response.json()).error, error);
    }
    assert.equal(env.DB.writes.length, 0);
});

test('analytics api aggregates stats for the dashboard', async () => {
    const { onRequest } = await importModule('functions/api/analytics.js');
    const response = await onRequest({
        request: new Request('https://space-chicken.ailardi.com/api/analytics?days=7'),
        env: { DB: mockDb() },
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.days, 7);
    assert.equal(payload.sessions, 5);
    assert.equal(payload.sessionsWithPlay, 2);
    assert.equal(payload.totalPlayMs, 180000);
    assert.equal(payload.avgSessionMs, 90000);
    assert.equal(payload.medianSessionMs, 120000);
    assert.deepEqual(payload.levels, {
        1: { starts: 4, completions: 3, avgMs: 45000, avgDeaths: 2, deaths: 8 },
    });
    assert.deepEqual(payload.deathsByKind, { fall: 5 });
    assert.deepEqual(payload.daily, [{ day: '2026-11-20', sessions: 2 }]);
    assert.deepEqual(payload.inputs, { desktop: 4 });
});

test('analytics api clamps the days window and handles preflight', async () => {
    const { onRequest } = await importModule('functions/api/analytics.js');
    const env = { DB: mockDb() };
    const clamped = await onRequest({
        request: new Request('https://space-chicken.ailardi.com/api/analytics?days=500'),
        env,
    });
    assert.equal((await clamped.json()).days, 90);
    const deflt = await onRequest({
        request: new Request('https://space-chicken.ailardi.com/api/analytics'),
        env,
    });
    assert.equal((await deflt.json()).days, 30);
    const preflight = await onRequest({
        request: new Request('https://example.test/api/analytics', { method: 'OPTIONS' }),
        env,
    });
    assert.equal(preflight.status, 204);
});

test('analytics api returns a JSON error when the database fails', async () => {
    const { onRequest } = await importModule('functions/api/analytics.js');
    const failingDb = {
        prepare() {
            throw new Error('boom');
        },
        batch() {
            throw new Error('boom');
        },
    };
    const response = await onRequest({
        request: new Request('https://space-chicken.ailardi.com/api/analytics'),
        env: { DB: failingDb },
    });
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'Analytics request failed' });
});
