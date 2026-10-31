const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');

test('robot dance sync: reachable decks, safe checkpoints, crown in range', async () => {
    const { level } = await import(
        pathToFileURL(path.join(root, 'levels/robot-dance-sync.js')).href
    );
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
        level.content.dynamic.some((h) => h.key === 'dancerBot'),
        'generated drone spawns'
    );
    for (const h of level.content.dynamic.filter((entry) => entry.key === 'dancerBot')) {
        assert.ok(
            (h.scale ?? 1) >= 0.08,
            'signature dancer reads at gameplay size (scale >= 0.08)'
        );
    }
    assert.ok(
        level.content.dynamic.filter((h) => h.type === 'bonk').length >= 2,
        'calibration-stage bonks restored from the brief'
    );
    assert.ok(
        (level.content.props || []).some((p) => p.key === 'countdownBoard'),
        'countdown numerals board placed'
    );
    assert.ok(
        level.content.dynamic.some(
            (h) => h.type === 'laser' && level.definition.CROWN_X - h.x <= 900
        ),
        'finale laser stands within 900px of the crown'
    );
    const keys = new Set(decks.map((d) => d.key));
    assert.ok(keys.size >= 3, 'three platform reads');
});
