const test = require('node:test');
const assert = require('node:assert/strict');

test('playtest requires every shipped level to finish within two minutes', async () => {
    const { SCENARIOS } = await import('../scripts/playtest-bot.mjs');
    const { LEVEL_IDS } = await import('../levels/index.js');
    assert.deepEqual(
        Object.values(SCENARIOS)
            .filter((s) => !s.chaos)
            .map((s) => s.level),
        [...LEVEL_IDS]
    );
    for (const level of LEVEL_IDS) {
        assert.equal(SCENARIOS[`l${level}-play`].requireWin, true);
        assert.equal(SCENARIOS[`l${level}-play`].finishBudgetMs, 120000);
    }
});

test('a clean unfinished run and a slow clear both fail the playtest', async () => {
    const { SCENARIOS, scenarioResult } = await import('../scripts/playtest-bot.mjs');
    const result = (outcome, elapsedMs) => ({
        outcome,
        elapsedMs,
        bugs: [],
        snap: { level: 1, deaths: 0, player: { x: 100, y: 200 } },
    });
    const unfinished = scenarioResult('l1-play', SCENARIOS['l1-play'], result(null, 120000), null);
    assert.equal(unfinished.ok, false);
    assert.ok(unfinished.kinds.includes('did_not_finish'));
    const slow = scenarioResult('l1-play', SCENARIOS['l1-play'], result('win', 120001), null);
    assert.equal(slow.ok, false);
    assert.ok(slow.kinds.includes('slow_finish'));
    assert.equal(
        scenarioResult('l1-play', SCENARIOS['l1-play'], result('win', 15000), null).ok,
        true
    );
});
