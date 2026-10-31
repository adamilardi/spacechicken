const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');

test('reconnection: reachable decks, safe checkpoints, crown in range', async () => {
    const { level } = await import(pathToFileURL(path.join(root, 'levels/reconnection.js')).href);
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
        level.content.dynamic.filter((h) => h.type === 'bonk' && h.key === 'spriteBot').length >= 3,
        'reconnection sprite bonks present'
    );
    assert.strictEqual(
        level.content.dynamic.filter((h) => h.type === 'cosmicRay').length,
        2,
        'twin cosmic rays present'
    );
    assert.strictEqual(
        level.content.dynamic.filter((h) => h.type === 'drone').length,
        2,
        'twin drones present'
    );
    assert.ok(
        (level.content.props || []).some((p) => p.key === 'cuspArc'),
        'cusp arc prop placed'
    );
    const keys = new Set(decks.map((d) => d.key));
    assert.ok(keys.size >= 3, 'three platform reads');
});
