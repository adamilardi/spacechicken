const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');

test('booster homecoming: reachable decks, safe checkpoints, crown in range', async () => {
    const { level } = await import(
        pathToFileURL(path.join(root, 'levels/booster-homecoming.js')).href
    );
    const decks = [...level.content.staticPlatforms].sort((a, b) => a.x - b.x);
    const span = (d) => [d.x - 48 * (d.scaleX || 1), d.x + 48 * (d.scaleX || 1)];
    for (let i = 1; i < decks.length; i += 1) {
        const deck = decks[i];
        const reachable = decks.some((other, j) => {
            if (j === i) return false;
            const [a0, a1] = span(deck);
            const [b0, b1] = span(other);
            const gap = Math.max(0, Math.max(b0 - a1, a0 - b1));
            return gap <= 260 && deck.y - other.y >= -200;
        });
        assert.ok(reachable, `deck at x=${deck.x} has a reachable neighbour`);
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
        level.content.dynamic.some((h) => h.type === 'drone' && h.key === 'starlinkSprite'),
        'starlink sprite drone spawns'
    );
    assert.ok(
        level.content.dynamic.filter((h) => h.type === 'drip').length >= 2,
        'exhaust drips present'
    );
    assert.ok(
        level.content.dynamic.some(
            (h) => h.type === 'roller' && Math.abs(h.x - level.definition.CROWN_X) <= 900
        ),
        'roller guard near crown'
    );
    assert.ok(
        (level.content.props || []).some((p) => p.key === 'boosterProp'),
        'booster prop placed'
    );
    const keys = new Set(decks.map((d) => d.key));
    assert.ok(keys.size >= 3, 'three platform reads');
});
