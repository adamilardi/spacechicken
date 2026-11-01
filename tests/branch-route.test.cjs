const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const projectRoot = path.join(__dirname, '..');

async function importModule(relativePath) {
    return import(pathToFileURL(path.join(projectRoot, relativePath)).href);
}

test('the L12 branch ties on level count so the main path wins', async () => {
    const { shortestBranchIndex, levelsToFinale } = await importModule('scripts/branch-route.mjs');
    const { LEVEL_DEFINITIONS } = await importModule('levels/index.js');
    assert.equal(LEVEL_DEFINITIONS[12].BRANCH.join(','), '13,16');
    // Both options rejoin at 14: equal length, so index 0 (rust harbor).
    assert.equal(levelsToFinale(13, LEVEL_DEFINITIONS), levelsToFinale(16, LEVEL_DEFINITIONS));
    assert.equal(shortestBranchIndex([13, 16], LEVEL_DEFINITIONS), 0);
});

test('shorter chains and ties resolve without per-level logic', async () => {
    const { shortestBranchIndex, levelsToFinale } = await importModule('scripts/branch-route.mjs');
    const defs = {
        1: { NEXT_LEVEL: 2 },
        2: { NEXT_LEVEL: null },
        3: { NEXT_LEVEL: 4 },
        4: { NEXT_LEVEL: 5 },
        5: { NEXT_LEVEL: null },
    };
    assert.equal(levelsToFinale(1, defs), 2);
    assert.equal(levelsToFinale(3, defs), 3);
    assert.equal(shortestBranchIndex([3, 1], defs), 1);
    assert.equal(shortestBranchIndex([1, 3], defs), 0);
});

test('nested branches, unknown levels, and cycles never win a pick', async () => {
    const { shortestBranchIndex, levelsToFinale } = await importModule('scripts/branch-route.mjs');
    const defs = {
        1: { NEXT_LEVEL: 2, BRANCH: [2, 9] },
        2: { NEXT_LEVEL: null },
        6: { NEXT_LEVEL: 7 },
        7: { NEXT_LEVEL: 6 },
    };
    assert.equal(levelsToFinale(1, defs), 2);
    assert.equal(levelsToFinale(6, defs), Number.POSITIVE_INFINITY);
    assert.equal(levelsToFinale(99, defs), Number.POSITIVE_INFINITY);
    assert.equal(shortestBranchIndex([99, 1], defs), 1);
    assert.equal(shortestBranchIndex([6, 1], defs), 1);
    assert.equal(shortestBranchIndex([], defs), 0);
    assert.equal(shortestBranchIndex([null, 1], defs), 1);
});
