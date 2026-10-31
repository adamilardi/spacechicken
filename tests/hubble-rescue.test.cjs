const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');

test('hubble rescue: reachable decks, safe checkpoints, crown in range', async () => {
    const { level } = await import(pathToFileURL(path.join(root, 'levels/hubble-rescue.js')).href);
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
        level.content.dynamic.some((h) => h.key === 'servicerTug'),
        'generated drone spawns'
    );
    assert.ok(
        level.content.dynamic.filter((h) => h.type === 'drip').length >= 2,
        'solar-particle drips restored from the brief'
    );
    assert.ok(
        (level.content.props || []).some((p) => p.key === 'rfiEnvelope'),
        'RFI envelope prop placed'
    );
    assert.ok(
        (level.content.rescues || []).length >= 3,
        'servicing tasks cover teach, press, and tower-top twist'
    );
    const keys = new Set(decks.map((d) => d.key));
    assert.ok(keys.size >= 3, 'three platform reads');
});
