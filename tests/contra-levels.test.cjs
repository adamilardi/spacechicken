const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const projectRoot = path.resolve(__dirname, '..');

function importModule(fileName) {
    return import(pathToFileURL(path.join(projectRoot, fileName)).href);
}

// Painted deck sizes from SpriteFactory (createExpeditionSprites registration
// for the trilogy decks, createLiftPlatform for the Spire Crown finale lift).
const DECK_SIZE = {
    colonyDeck: { width: 96, height: 24 },
    hiveChitin: { width: 96, height: 24 },
    spireAlloy: { width: 128, height: 28 },
    liftPlatform: { width: 96, height: 24 },
    bastionDeck: { width: 96, height: 24 },
    wombFlesh: { width: 96, height: 24 },
    harborDeck: { width: 96, height: 24 },
    foundryDeck: { width: 96, height: 24 },
    skyhookDeck: { width: 96, height: 24 },
    vaultDeck: { width: 96, height: 24 },
    colonyGirder: { width: 96, height: 24 },
    hiveFang: { width: 96, height: 24 },
    spireGlass: { width: 96, height: 24 },
    bastionGrate: { width: 96, height: 24 },
    wombBone: { width: 96, height: 24 },
    harborPlank: { width: 96, height: 24 },
    foundryChain: { width: 96, height: 24 },
    skyhookPanel: { width: 96, height: 24 },
};

// Horizontal edge gap any chicken can clear: the single-jump range is ~352px
// (160px/s over the 2.2s airtime of a -330 jump at gravity 300).
const MAX_EDGE_GAP = 260;
// Contra boss arenas give dodge room; the crown pad must be this wide or wider.
const CROWN_PAD_MIN_SCALE_X = 2.8;
const CONTRA_LEVELS = [8, 9, 10, 11, 12, 13, 14, 15, 16];
// Level 8 predates the on-deck boarder rule (two of its homes hang over gaps)
// and its verified build stays untouched, so it is exempt here.
const ON_DECK_LEVELS = [9, 10, 11, 12, 13, 14, 15, 16];
const BOARDER_HALF_WIDTH = 11;

function deckSpan(entry) {
    const size = DECK_SIZE[entry.key];
    assert.ok(size, `test knows the deck size for ${entry.key}`);
    const width = size.width * (entry.scaleX ?? 1);
    const height = size.height * (entry.scaleY ?? 1);
    return {
        left: entry.x - width / 2,
        right: entry.x + width / 2,
        top: entry.y - height / 2,
    };
}

function deckChain(content) {
    return [...content.staticPlatforms, ...(content.moving || [])]
        .map((entry) => ({ entry, span: deckSpan(entry) }))
        .sort((left, right) => left.span.left - right.span.left);
}

function hopReachable(from, to, maxRise) {
    const rise = from.top - to.top;
    if (rise > maxRise) {
        return false;
    }
    const overlap = Math.min(from.right, to.right) - Math.max(from.left, to.left);
    return overlap >= 0 || -overlap <= MAX_EDGE_GAP;
}

test('contra decks form one reachable run with stacked lines', async () => {
    const { LEVEL_CONTENT, LEVEL_DEFINITIONS } = await importModule('levels/index.js');
    const { GAME_CONSTANTS } = await importModule('Constants.js');
    const jumpSpeed = Math.abs(GAME_CONSTANTS.JUMP_VELOCITY_Y);
    for (const id of CONTRA_LEVELS) {
        const def = LEVEL_DEFINITIONS[id];
        const content = LEVEL_CONTENT[id];
        const maxRise = Math.floor(jumpSpeed ** 2 / (2 * def.GRAVITY)) - 5;
        const nodes = deckChain(content);
        const opener = nodes.find(
            (node) => node.span.left <= def.PLAYER_START_X && def.PLAYER_START_X <= node.span.right
        );
        assert.ok(opener, `level ${id} opens on a deck under the spawn`);
        const seen = new Set([opener]);
        const queue = [opener];
        while (queue.length > 0) {
            const from = queue.pop();
            for (const to of nodes) {
                if (!seen.has(to) && hopReachable(from.span, to.span, maxRise)) {
                    seen.add(to);
                    queue.push(to);
                }
            }
        }
        const missing = nodes
            .filter((node) => !seen.has(node))
            .map((node) => `x=${node.entry.x},y=${node.entry.y}`);
        assert.equal(seen.size, nodes.length, `level ${id} strands decks: ${missing.join('; ')}`);
        let stacked = false;
        for (let i = 0; i < nodes.length && !stacked; i++) {
            for (let j = i + 1; j < nodes.length && !stacked; j++) {
                const left = nodes[i].span;
                const right = nodes[j].span;
                const overlap = Math.min(left.right, right.right) - Math.max(left.left, right.left);
                const separation = Math.abs(left.top - right.top);
                stacked = overlap >= 32 && separation >= 56 && separation <= 200;
            }
        }
        assert.ok(stacked, `level ${id} stacks a second run line`);
    }
});

test('contra crowns sit on wide reachable pads', async () => {
    const { LEVEL_CONTENT, LEVEL_DEFINITIONS } = await importModule('levels/index.js');
    for (const id of CONTRA_LEVELS) {
        const def = LEVEL_DEFINITIONS[id];
        const content = LEVEL_CONTENT[id];
        const pad = content.staticPlatforms[content.staticPlatforms.length - 1];
        assert.ok(
            (pad.scaleX ?? 1) >= CROWN_PAD_MIN_SCALE_X,
            `level ${id} crown pad has dodge room`
        );
        const span = deckSpan(pad);
        assert.ok(
            span.left <= def.CROWN_X && def.CROWN_X <= span.right,
            `level ${id} crown floats over its pad`
        );
        const lift = span.top - def.CROWN_Y;
        assert.ok(lift >= 20 && lift <= 120, `level ${id} crown floats just above its pad`);
    }
});

test('contra boarder homes sit over decks, never over gaps', async () => {
    const { LEVEL_CONTENT } = await importModule('levels/index.js');
    for (const id of ON_DECK_LEVELS) {
        const decks = LEVEL_CONTENT[id].staticPlatforms.map((entry) => ({
            entry,
            span: deckSpan(entry),
        }));
        for (const hazard of LEVEL_CONTENT[id].dynamic || []) {
            if (hazard.type !== 'boarder') {
                continue;
            }
            const deck = decks.find(
                (candidate) =>
                    hazard.x >= candidate.span.left - BOARDER_HALF_WIDTH &&
                    hazard.x <= candidate.span.right + BOARDER_HALF_WIDTH
            );
            assert.ok(deck, `level ${id} wave-${hazard.wave} boarder spawns over a deck`);
            assert.ok(
                hazard.y <= deck.span.top,
                `level ${id} wave-${hazard.wave} boarder drops onto its deck`
            );
        }
    }
});

test('contra checkpoints sit on decks above the kill line', async () => {
    const { LEVEL_CONTENT, LEVEL_DEFINITIONS } = await importModule('levels/index.js');
    for (const id of [9, 10, 11, 12, 13, 14, 15, 16]) {
        const content = LEVEL_CONTENT[id];
        const def = LEVEL_DEFINITIONS[id];
        assert.ok(content.checkpoints.length >= 1);
        for (const point of content.checkpoints) {
            const deck = content.staticPlatforms
                .map((entry) => ({ entry, span: deckSpan(entry) }))
                .find(
                    (candidate) =>
                        point.x >= candidate.span.left - 10 && point.x <= candidate.span.right + 10
                );
            assert.ok(deck, `level ${id} checkpoint floats over a deck`);
            assert.ok(
                point.y <= deck.span.top + 10 && point.y >= deck.span.top - 40,
                `level ${id} checkpoint rests on its deck`
            );
            assert.ok(point.y < def.KILLZONE_Y, `level ${id} checkpoint clears the kill line`);
        }
    }
});

test('contra boarder waves sit at or past their release line', async () => {
    const { LEVEL_CONTENT } = await importModule('levels/index.js');
    const { GAME_CONSTANTS } = await importModule('Constants.js');
    const release = new Map(GAME_CONSTANTS.BOARDER_WAVES.map((entry) => [entry.wave, entry.x]));
    for (const id of CONTRA_LEVELS) {
        for (const hazard of LEVEL_CONTENT[id].dynamic || []) {
            if (hazard.type !== 'boarder') {
                continue;
            }
            assert.ok(
                hazard.x >= (release.get(hazard.wave) ?? 0),
                `level ${id} wave-${hazard.wave} boarder at x=${hazard.x} releases ahead of the player`
            );
        }
    }
});

test('rescues stand on decks and pods float within jump reach', async () => {
    const { LEVEL_CONTENT } = await importModule('levels/index.js');
    const { WEAPON_DEFS, POD_TINTS } = await importModule('GameUtils.js');
    for (const id of CONTRA_LEVELS) {
        const content = LEVEL_CONTENT[id];
        for (const rescue of content.rescues || []) {
            const decks = (content.staticPlatforms || [])
                .map((entry) => ({ entry, span: deckSpan(entry) }))
                .filter(
                    (candidate) =>
                        rescue.x >= candidate.span.left - 11 &&
                        rescue.x <= candidate.span.right + 11
                );
            assert.ok(decks.length > 0, `level ${id} rescue at x=${rescue.x} stands over a deck`);
            const deck = decks.reduce((best, candidate) =>
                Math.abs(candidate.span.top - (rescue.y + 24)) <
                Math.abs(best.span.top - (rescue.y + 24))
                    ? candidate
                    : best
            );
            assert.ok(
                rescue.y + 24 >= deck.span.top - 2 && rescue.y + 24 <= deck.span.top + 12,
                `level ${id} rescue base rests on the deck`
            );
        }
        for (const pod of content.pods || []) {
            assert.ok(WEAPON_DEFS[pod.gun], `level ${id} pod grants a real gun`);
            assert.ok(Number.isInteger(POD_TINTS[pod.gun]), `level ${id} pod core has a tint`);
            const decks = (content.staticPlatforms || [])
                .map((entry) => ({ entry, span: deckSpan(entry) }))
                .filter(
                    (candidate) =>
                        pod.x >= candidate.span.left - 40 &&
                        pod.x <= candidate.span.right + 40 &&
                        candidate.span.top > pod.y
                );
            assert.ok(decks.length > 0, `level ${id} pod at x=${pod.x} floats over a deck`);
            const deck = decks.reduce((best, candidate) =>
                candidate.span.top < best.span.top ? candidate : best
            );
            const height = deck.span.top - pod.y;
            assert.ok(height >= 20 && height <= 170, `level ${id} pod floats within jump reach`);
        }
    }
});
