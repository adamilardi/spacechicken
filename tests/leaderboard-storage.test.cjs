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

test('new players receive a persistent funny name and can choose their own', async (t) => {
    const { LeaderboardManager, generatePlayerName } = await import('../LeaderboardManager.js');
    const { AUDIO_SETTINGS, GAME_CONSTANTS } = await import('../Constants.js');
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
    t.after(() => {
        if (descriptor) Object.defineProperty(globalThis, 'window', descriptor);
        else delete globalThis.window;
    });
    const stored = new Map();
    let response = null;
    Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: {
            localStorage: {
                getItem: (key) => stored.get(key) ?? null,
                setItem: (key, value) => stored.set(key, value),
            },
            prompt: () => response,
        },
    });
    const manager = new LeaderboardManager({ storageAvailable: true, playerId: 'new-player' });
    const name = manager.ensurePlayerName();
    assert.notEqual(name, 'Anonymous');
    assert.equal(name, generatePlayerName('new-player'));
    assert.equal(stored.get(AUDIO_SETTINGS.PLAYER_NAME_KEY), name);
    const returning = new LeaderboardManager({ storageAvailable: true });
    assert.equal(returning.ensurePlayerName(), name);
    assert.equal(manager.ensurePlayerName(true), name, 'cancel keeps the assigned name');
    response = '   ';
    assert.equal(manager.ensurePlayerName(true), name, 'blank input keeps the assigned name');
    response = '  Captain   Cluck  ';
    assert.equal(manager.ensurePlayerName(true), 'Captain Cluck');
    assert.equal(returning.ensurePlayerName(), 'Captain Cluck');
    assert.equal(manager.shouldPromptForName(null), false);
    for (let id = 0; id < 1000; id++) {
        const generated = generatePlayerName(`player-${id}`);
        assert.ok(generated.length <= GAME_CONSTANTS.PLAYER_NAME_MAX_LENGTH);
        assert.match(generated, /^[A-Za-z]+ [A-Za-z]+ \d{2}$/);
    }
});

test('generated names survive scene changes when storage is blocked', async () => {
    const { LeaderboardManager } = await import('../LeaderboardManager.js');
    const first = new LeaderboardManager({ storageAvailable: false, playerId: 'same-session' });
    const next = new LeaderboardManager({ storageAvailable: false, playerId: 'same-session' });
    assert.equal(first.ensurePlayerName(), next.ensurePlayerName());
    assert.notEqual(first.ensurePlayerName(), 'Anonymous');
});
