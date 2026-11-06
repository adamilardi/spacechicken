const test = require('node:test');
const assert = require('node:assert/strict');

test('blocked browser storage preserves leaderboard fallbacks and online submissions', async (t) => {
    const { LeaderboardManager } = await import('../LeaderboardManager.js');
    const { LEVEL_IDS } = await import('../levels/index.js');
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    t.after(() => {
        if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
        else delete globalThis.window;
    });
    Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: {
            get localStorage() {
                throw new DOMException('Storage access denied', 'SecurityError');
            },
        },
    });

    const manager = new LeaderboardManager({ storageAvailable: true, playerId: 'session-player' });
    const submissions = [];
    manager.saveTimeToFirebase = async (...args) => {
        submissions.push(args);
        return { saved: true };
    };

    assert.deepEqual(manager.readLeaderboard(1), []);
    assert.doesNotThrow(() => manager.writeLeaderboard(1, [{ time: 5000, name: 'Luna' }]));
    assert.equal(manager.getPersonalBest(1), null);
    assert.equal(manager.savePersonalBest(1, 5000), false);
    assert.equal(manager.getPlayerId(), 'session-player');
    assert.equal(manager.loadPlayerName(), null);
    assert.doesNotThrow(() => manager.savePlayerName('Luna'));
    assert.equal(manager.getMaxUnlocked(), LEVEL_IDS.length);
    assert.equal(manager.unlockLevel(2), LEVEL_IDS.length);
    assert.equal(manager.saveTime(1, 5000, '  Luna  ', 2), true);
    assert.deepEqual(await manager.lastSubmission, { saved: true });
    assert.deepEqual(submissions, [[1, 5000, 'Luna', 2]]);
});
