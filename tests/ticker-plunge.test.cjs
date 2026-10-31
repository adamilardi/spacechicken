const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');

test('ticker plunge: reachable decks, safe checkpoints, crown in range', async () => {
    const { level } = await import(pathToFileURL(path.join(root, 'levels/ticker-plunge.js')).href);
    const decks = [...level.content.staticPlatforms].sort((a, b) => a.x - b.x);
    for (let i = 1; i < decks.length; i += 1) {
        assert.ok(Math.abs(decks[i].y - decks[i - 1].y) <= 200, 'rise within double-jump');
    }
    const cps = level.content.checkpoints;
    const lastCp = cps[cps.length - 1];
    assert.ok(level.definition.CROWN_X - lastCp.x <= 2400, 'crown within reach of last checkpoint');
    for (const cp of cps) {
        for (const h of level.content.dynamic) {
            assert.ok(
                Math.abs(h.x - cp.x) > 150 || Math.abs(h.y - cp.y) > 100,
                'checkpoint clear of hazards'
            );
        }
    }
    assert.ok(
        level.content.dynamic.some((h) => h.key === 'tickerBot'),
        'generated drone spawns'
    );
});
