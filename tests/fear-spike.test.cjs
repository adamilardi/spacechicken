const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');

// Single-jump budget at gravity 300: v=330 -> 181px rise, 260px side gap.
const MAX_RISE = 176;
const MAX_GAP = 260;

function span(deck) {
    const width = 96 * (deck.scaleX ?? 1);
    return { left: deck.x - width / 2, right: deck.x + width / 2, top: deck.y - 12 };
}

test('fear spike: route graph connects spawn to crown', async () => {
    const { level } = await import(pathToFileURL(path.join(root, 'levels/fear-spike.js')).href);
    const decks = level.content.staticPlatforms.map((entry) => ({ entry, ...span(entry) }));
    const reached = new Set([0]);
    let grew = true;
    while (grew) {
        grew = false;
        for (let i = 0; i < decks.length; i++) {
            if (reached.has(i)) continue;
            for (const j of reached) {
                const from = decks[j];
                const to = decks[i];
                const rise = from.top - to.top;
                const gap = Math.max(0, to.left - from.right, from.left - to.right);
                const overlaps = to.left <= from.right && to.right >= from.left;
                if (
                    (overlaps && (rise <= MAX_RISE || rise < 0)) ||
                    (gap <= MAX_GAP && rise <= MAX_RISE)
                ) {
                    reached.add(i);
                    grew = true;
                    break;
                }
            }
        }
    }
    assert.equal(reached.size, decks.length, 'every deck joins the route from the opener');
    const crownDeck = decks.find(
        (deck) =>
            level.definition.CROWN_X >= deck.left &&
            level.definition.CROWN_X <= deck.right &&
            level.definition.CROWN_Y < deck.top &&
            level.definition.CROWN_Y > deck.top - 120
    );
    assert.ok(crownDeck, 'crown floats above a reachable deck');
});

test('fear spike: three deck reads, ordered checkpoints, themed hazards', async () => {
    const { level } = await import(pathToFileURL(path.join(root, 'levels/fear-spike.js')).href);
    const keys = new Set(level.content.staticPlatforms.map((deck) => deck.key));
    assert.ok(keys.size >= 3, 'at least three platform reads');
    const counts = level.content.staticPlatforms.map((deck) => deck.key);
    const dominant = Math.max(...[...keys].map((key) => counts.filter((k) => k === key).length));
    assert.ok(dominant / counts.length <= 0.8, 'no deck key dominates');
    const cps = level.content.checkpoints;
    assert.ok(cps.length >= 3, 'checkpoint coverage for three acts');
    for (let i = 1; i < cps.length; i++) {
        assert.ok(cps[i - 1].x < cps[i].x, 'checkpoints run in order');
    }
    assert.ok(
        level.definition.CROWN_X - cps[cps.length - 1].x <= 2400,
        'crown in reach of last checkpoint'
    );
    for (const cp of cps) {
        for (const hazard of level.content.dynamic) {
            if (hazard.type === 'laser') {
                assert.ok(
                    Math.abs(hazard.x - cp.x) > 100,
                    'checkpoint stands clear of beam timing'
                );
            }
        }
    }
    const dynamic = level.content.dynamic;
    const bears = dynamic.filter((h) => h.type === 'bearRaider');
    assert.ok(bears.length >= 4, 'bear raiders in every act');
    assert.ok(
        bears.every((h) => h.dive !== false && Number.isFinite(h.diveY)),
        'every bear cycles (no static hoverers over the route)'
    );
    assert.ok(
        dynamic.some((h) => h.type === 'crusher' && h.key === 'candleSlam'),
        'candle crusher spawns'
    );
    const offs = dynamic.filter((h) => h.type === 'laser').map((h) => h.offDuration);
    assert.ok(Math.max(...offs) > Math.min(...offs), 'halt timing accelerates across acts');
    assert.ok(
        level.content.props.some((p) => p.key === 'craterPlate'),
        'crater plates placed'
    );
    assert.ok(
        level.content.props.some((p) => p.key === 'closingBell'),
        'closing bell placed'
    );
});

test('fear spike: registered everywhere it must be', async () => {
    const { LEVEL_IDS } = await import(pathToFileURL(path.join(root, 'levels/index.js')).href);
    assert.ok(LEVEL_IDS.includes(18), 'level registered');
    const { MUSIC_DEFINITIONS } = await import(
        pathToFileURL(path.join(root, 'music/index.js')).href
    );
    assert.equal(MUSIC_DEFINITIONS[18].id, 'fear-spike');
    const { spawners } = await import(pathToFileURL(path.join(root, 'enemies/index.js')).href);
    assert.equal(typeof spawners.bearRaider, 'function', 'bear spawner registered');
});
