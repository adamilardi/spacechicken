const assert = require('node:assert/strict');
const { test } = require('node:test');

test('frame reports use full sample intervals, correct percentiles, and stall counts', async () => {
    const { summarizeFrames } = await import('../PerformanceMetrics.js');
    const stats = summarizeFrames([16, 16, 16, 16, 16, 16, 16, 16, 16, 100]);
    assert.equal(stats.count, 10);
    assert.equal(stats.meanMs, 24.4);
    assert.equal(stats.p50Ms, 16);
    assert.equal(stats.p95Ms, 100);
    assert.equal(stats.averageFps, 40.98);
    assert.equal(stats.over50Ms, 1);
    assert.equal(stats.over100Ms, 0);
});

test('missing samples remain unavailable instead of reporting perfect performance', async () => {
    const { summarizeFrames } = await import('../PerformanceMetrics.js');
    const stats = summarizeFrames([NaN, Infinity, -1]);
    assert.equal(stats.count, 0);
    assert.equal(stats.p95Ms, null);
    assert.equal(stats.averageFps, null);
});
