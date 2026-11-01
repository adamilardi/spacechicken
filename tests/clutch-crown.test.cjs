const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');

test('clutch crown: reachable decks, safe checkpoints, crown in range', async () => {
    const { level } = await import(pathToFileURL(path.join(root, 'levels/clutch-crown.js')).href);
    const decks = [...level.content.staticPlatforms].sort((a, b) => a.x - b.x);
    const span = (d) => [d.x - 48 * (d.scaleX || 1), d.x + 48 * (d.scaleX || 1)];
    for (let i = 0; i < decks.length; i += 1) {
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
    const keys = new Set(decks.map((d) => d.key));
    assert.ok(keys.size >= 3, 'at least 3 deck keys');
    assert.ok(
        level.content.dynamic.some(
            (h) =>
                h.key === 'championKing' &&
                h.crownGuard === true &&
                h.leap &&
                typeof h.leap.dx === 'number' &&
                typeof h.leap.ms === 'number' &&
                typeof h.leap.velocityY === 'number'
        ),
        'boss hazard with key championKing, crownGuard true, and leap dx/ms/velocityY'
    );
    assert.ok(level.definition.PHASER === true, 'definition PHASER true');
    assert.ok(level.definition.CROWN_SHIELD === true, 'definition CROWN_SHIELD true');
    assert.ok((level.content.pods || []).length >= 2, 'at least 2 pods');
    assert.ok((level.content.boarderWaves || []).length >= 2, 'at least 2 boarderWaves');
});

test('clutch crown: weapons ship with pawn boarders on every wave', async () => {
    const { level } = await import(pathToFileURL(path.join(root, 'levels/clutch-crown.js')).href);
    const waves = level.content.boarderWaves || [];
    const boarders = (level.content.dynamic || []).filter((h) => h.type === 'boarder');
    // PHASER bolts only damage boarders and bosses: a PHASER level with no
    // boarder homes gives the player a gun with nothing to shoot on the route.
    assert.ok(boarders.length >= 1, 'PHASER level spawns at least one boarder');
    for (const trigger of waves) {
        const homes = boarders.filter((h) => h.wave === trigger.wave);
        assert.ok(
            homes.length >= 1,
            `wave-${trigger.wave} has at least one boarder home (trigger x=${trigger.x})`
        );
        for (const home of homes) {
            assert.ok(
                home.x >= trigger.x,
                `wave-${home.wave} boarder at x=${home.x} releases ahead of the player`
            );
        }
    }
    const span = (d) => [d.x - 48 * (d.scaleX || 1), d.x + 48 * (d.scaleX || 1)];
    for (const home of boarders) {
        const deck = level.content.staticPlatforms.find((entry) => {
            const [left, right] = span(entry);
            return home.x >= left - 11 && home.x <= right + 11;
        });
        assert.ok(deck, `wave-${home.wave} boarder at x=${home.x} spawns over a deck`);
        assert.ok(home.y <= deck.y - 12, `wave-${home.wave} boarder drops onto its deck`);
    }
});
