const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const projectRoot = path.resolve(__dirname, '..');

function importModule(fileName) {
    return import(pathToFileURL(path.join(projectRoot, fileName)).href);
}

function makeScene(overrides = {}) {
    return { debugMode: false, launchBot: false, difficulty: 'normal', ...overrides };
}

test('analytics manager queues gameplay events and flushes them', async () => {
    const { AnalyticsManager, __resetAnalyticsSessionForTests } =
        await importModule('AnalyticsManager.js');
    __resetAnalyticsSessionForTests();
    const sent = [];
    const manager = new AnalyticsManager(makeScene()).setTransport((payload) => {
        sent.push(JSON.parse(payload));
    });
    manager.trackSessionStart();
    manager.trackLevelStart(1);
    manager.trackDeath(1, 'fall');
    manager.trackLevelComplete(1, 45000, 2);
    await manager.flush();
    assert.equal(sent.length >= 1, true);
    const events = sent.flatMap((batch) => batch.events);
    assert.deepEqual(
        events.map((event) => event.type),
        ['session_start', 'level_start', 'death', 'level_complete']
    );
    assert.equal(events[0].kind, 'unknown');
    assert.equal(events[1].level, 1);
    assert.equal(events[2].kind, 'fall');
    assert.equal(events[3].value, 45000);
    assert.equal(events[3].count, 2);
    assert.ok(sent.every((batch) => batch.session === manager.sessionId));
    manager.cleanup();
    __resetAnalyticsSessionForTests();
});

test('analytics session survives scene recreations but starts once', async () => {
    const { AnalyticsManager, __resetAnalyticsSessionForTests } =
        await importModule('AnalyticsManager.js');
    __resetAnalyticsSessionForTests();
    const sent = [];
    const first = new AnalyticsManager(makeScene()).setTransport((payload) => {
        sent.push(JSON.parse(payload));
    });
    first.trackSessionStart();
    first.cleanup();
    // A level transition builds a fresh manager for the same page load.
    const second = new AnalyticsManager(makeScene()).setTransport((payload) => {
        sent.push(JSON.parse(payload));
    });
    second.trackSessionStart();
    second.trackLevelStart(2);
    await second.flush();
    assert.equal(second.sessionId, first.sessionId);
    const starts = sent
        .flatMap((batch) => batch.events)
        .filter((event) => event.type === 'session_start');
    assert.equal(starts.length, 1);
    second.cleanup();
    __resetAnalyticsSessionForTests();
});

test('analytics manager stays silent in debug and bot sessions', async () => {
    const { AnalyticsManager, __resetAnalyticsSessionForTests } =
        await importModule('AnalyticsManager.js');
    __resetAnalyticsSessionForTests();
    for (const scene of [makeScene({ debugMode: true }), makeScene({ launchBot: true })]) {
        let calls = 0;
        const manager = new AnalyticsManager(scene).setTransport(() => {
            calls += 1;
        });
        manager.trackSessionStart();
        manager.trackLevelStart(1);
        manager.trackDeath(1, 'fall');
        manager.trackLevelComplete(1, 1000, 0);
        manager.sendHeartbeat();
        await manager.sendSessionEnd();
        await manager.flush();
        assert.equal(calls, 0);
        assert.equal(manager.queue.length, 0);
        manager.cleanup();
    }
    __resetAnalyticsSessionForTests();
});

test('analytics session end reports playtime once', async () => {
    const { AnalyticsManager, __resetAnalyticsSessionForTests } =
        await importModule('AnalyticsManager.js');
    __resetAnalyticsSessionForTests();
    const sent = [];
    const manager = new AnalyticsManager(makeScene()).setTransport((payload) => {
        sent.push(JSON.parse(payload));
    });
    manager.trackSessionStart();
    manager.trackLevelStart(1);
    await manager.sendSessionEnd();
    await manager.sendSessionEnd();
    const ends = sent
        .flatMap((batch) => batch.events)
        .filter((event) => event.type === 'session_end');
    assert.equal(ends.length, 1);
    assert.equal(typeof ends[0].value, 'number');
    manager.cleanup();
    __resetAnalyticsSessionForTests();
});
