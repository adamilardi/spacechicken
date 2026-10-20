const test = require('node:test');
const assert = require('node:assert/strict');

async function clock() {
    const { createSimulationClock } = await import('../scripts/fast/clock.mjs');
    const host = {
        Date,
        performance: { now: () => 0 },
        clearTimeout() {},
        clearInterval() {},
    };
    return { host, sim: createSimulationClock(host) };
}

test('simulation advances Date, performance and timers without sleeping', async () => {
    const { host, sim } = await clock();
    const events = [];
    const interval = host.setInterval(() => events.push('interval'), 10);
    host.setTimeout((value) => events.push(value), 20, 'timeout');
    sim.advance(10);
    assert.deepEqual(events, ['interval']);
    sim.advance(10);
    assert.deepEqual(events, ['interval', 'interval', 'timeout']);
    assert.equal(host.Date.now(), 1700000001020);
    assert.equal(new host.Date().getTime(), host.Date.now());
    assert.equal(new host.Date(123).getTime(), 123);
    assert.equal(host.performance.now(), 1020);
    host.clearTimeout(interval); // Browser timer IDs share a namespace.
    sim.advance(10);
    assert.equal(events.length, 3);
});

test('rAF callbacks run once per tick, respect cancellation and reset', async () => {
    const { host, sim } = await clock();
    const events = [];
    host.requestAnimationFrame(() => {
        events.push('first');
        host.requestAnimationFrame(() => events.push('next'));
    });
    const canceled = host.requestAnimationFrame(() => events.push('canceled'));
    host.cancelAnimationFrame(canceled);
    sim.advance(16);
    assert.deepEqual(events, ['first']);
    sim.advance(16);
    assert.deepEqual(events, ['first', 'next']);
    host.setTimeout(() => events.push('leak'), 1);
    host.requestAnimationFrame(() => events.push('leak'));
    sim.reset();
    sim.advance(16);
    assert.deepEqual(events, ['first', 'next']);
    assert.equal(host.performance.now(), 1016);
});

test('timer callbacks can cancel other callbacks in the same tick', async () => {
    const { host, sim } = await clock();
    let calls = 0;
    host.setTimeout(() => host.clearTimeout(second), 10);
    const second = host.setTimeout(() => calls++, 10);
    sim.advance(20);
    assert.equal(calls, 0);
});

test('browser features and inference retain the Node training contract', async () => {
    const { browserPolicySources } = await import('../scripts/fast/session.mjs');
    const nodeFeatures = await import('../scripts/rl/features.mjs');
    const nodeInference = await import('../scripts/rl/policy-infer.mjs');
    const sources = browserPolicySources();
    const browserFeatures = await import(
        `data:text/javascript;base64,${Buffer.from(sources.features).toString('base64')}`
    );
    const browserInference = await import(
        `data:text/javascript;base64,${Buffer.from(sources.inference).toString('base64')}`
    );
    const obs = {
        level: 7,
        elapsedMs: 3000,
        deaths: 2,
        player: { x: 150, y: 600, vx: 150, grounded: true },
        objective: { distance: 1000 },
    };
    assert.deepEqual(browserFeatures.encodeObservation(obs), nodeFeatures.encodeObservation(obs));
    assert.equal(browserFeatures.OBS_SIZE, nodeFeatures.OBS_SIZE);
    assert.equal(browserFeatures.OBS_VERSION, nodeFeatures.OBS_VERSION);
    assert.deepEqual(browserFeatures.ACTION_NAMES, nodeFeatures.ACTION_NAMES);
    assert.equal(
        browserFeatures.stepReward(obs, { ...obs, deaths: 3 }),
        nodeFeatures.stepReward(obs, { ...obs, deaths: 3 })
    );
    const weights = {
        layers: [
            {
                w: [
                    [1, 2],
                    [-2, 1],
                ],
                b: [0, 1],
            },
        ],
    };
    assert.deepEqual(
        browserInference.forwardPolicy(weights, [2, 3]),
        nodeInference.forwardPolicy(weights, [2, 3])
    );
});
