const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');

test('cold chain down: reachable decks, safe checkpoints, crown in range', async () => {
    const { level } = await import(pathToFileURL(path.join(root, 'levels/freezer-breach.js')).href);
    const decks = [...level.content.staticPlatforms].sort((a, b) => a.x - b.x);
    const span = (d) => [d.x - 48 * (d.scaleX || 1), d.x + 48 * (d.scaleX || 1)];
    for (let i = 1; i < decks.length; i += 1) {
        const deck = decks[i];
        const reachable = decks.some((other, j) => {
            if (j === i) return false;
            const [a0, a1] = span(deck);
            const [b0, b1] = span(other);
            const gap = Math.max(0, Math.max(b0 - a1, a0 - b1));
            // Rise budget is the double jump (MAX_JUMPS 2, roughly 2x the
            // 204px single-jump rise at gravity 260): gate covers are
            // ceilings plus double-jump perches, not single-jump route decks.
            return gap <= 260 && deck.y - other.y >= -380;
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
    const gates = level.content.dynamic.filter((h) => h.type === 'laser');
    assert.equal(gates.length, 3, 'two gap beams plus one tunnel band, beamless finale');
    assert.ok(
        gates.some((h) => h.orientation === 'horizontal'),
        'heat-band tunnel present'
    );
    for (const gate of gates) {
        assert.equal(gate.onDuration, 1400, 'all coils share the hot phase');
        assert.equal(gate.offDuration, 1400, 'all coils share the cold phase');
        assert.ok(gate.offDuration >= 800, 'cold window fits the pilot gate');
    }
    assert.ok(
        level.content.dynamic.every((h) => h.type !== 'laser' || h.x < 4400),
        'no beams in the guard vault'
    );
    assert.ok(
        level.content.dynamic.filter((h) => h.type === 'drone' && h.key === 'defrosterDrone')
            .length >= 3,
        'defroster drones present'
    );
    for (const key of ['thermoProp', 'freezerCaseProp', 'shelfProp', 'crateProp']) {
        assert.ok(
            (level.content.props || []).some((p) => p.key === key),
            `${key} prop placed`
        );
    }
    const keys = new Set(decks.map((d) => d.key));
    assert.ok(keys.size >= 3, 'three platform reads');
});
