const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const projectRoot = path.resolve(__dirname, '..');

async function loadCritic() {
    return import(pathToFileURL(path.join(projectRoot, 'scripts/level-critic.mjs')).href);
}

function fakeLevel({ keys, hazards, background = 'space', width = 6000, crown = 5500 }) {
    return {
        content: {
            background: { type: background },
            staticPlatforms: keys.map((key, index) => ({ x: index * 500, y: 500, key })),
            dynamic: hazards.map((type, index) => ({ type, x: 1000 + index * 800 })),
            checkpoints: [{ x: 2000, y: 500 }],
            moving: [],
            props: [],
        },
        definition: {
            TITLE: 'Fake',
            GRAVITY: 300,
            WORLD_WIDTH: width,
            CROWN_X: crown,
        },
    };
}

test('identical skeletons score as clones, divergent kits do not', async () => {
    const { analyseLevel, skeletonSimilarity } = await loadCritic();
    const base = fakeLevel({ keys: ['aDeck', 'aDeck', 'bDeck'], hazards: ['laser', 'drone'] });
    const same = fakeLevel({ keys: ['aDeck', 'bDeck', 'aDeck'], hazards: ['drone', 'laser'] });
    const different = fakeLevel({
        keys: ['zDeck', 'yDeck', 'xDeck'],
        hazards: ['crusher', 'drip'],
        background: 'womb',
    });
    const a = analyseLevel(base.content, base.definition);
    assert.ok(skeletonSimilarity(a, analyseLevel(same.content, same.definition)) >= 0.75);
    assert.ok(skeletonSimilarity(a, analyseLevel(different.content, different.definition)) < 0.75);
});

test('flat single-key deck rows raise the flat-deck flag', async () => {
    const { analyseLevel, mechanicalFlags } = await loadCritic();
    const flat = fakeLevel({
        keys: Array(10).fill('soloDeck'),
        hazards: ['laser', 'drone', 'roller'],
    });
    const analysis = analyseLevel(flat.content, flat.definition);
    const flags = mechanicalFlags(analysis, { 99: analysis }, 99);
    assert.ok(flags.some((flag) => flag.id === 'flat-deck'));
    assert.equal(analysis.dominantKeyShare, 1);
});

test('news brief parsing extracts the table and inventory', async () => {
    const { parseNewsBrief } = await loadCritic();
    const brief = parseNewsBrief(
        [
            '# Level 99 — Flood Market',
            '',
            'Element inventory: rising water, sandbag stacks, rescue boats',
            '',
            '| Story fact | Gameplay it becomes | Why |',
            '| --- | --- | --- |',
            '| River rises hourly | rising-water drip hazards on a timing cycle | The rise is the clock |',
            '| Boats rescue crews | rescue cages on the upper decks | Objective mirrors the rescue |',
        ].join('\n')
    );
    assert.equal(brief.elements.length, 3);
    assert.equal(brief.mappings.length, 2);
    assert.match(brief.mappings[0].mechanic, /rising-water/);
});

test('news brief parsing ignores later tables and themed-enemy trailer', async () => {
    const { parseNewsBrief } = await loadCritic();
    const brief = parseNewsBrief(
        [
            '# Level 99 — Flood Market',
            '',
            'Element inventory: rising water, sandbag stacks. Themed enemy: Digger (enemies/digger.js).',
            '',
            '| Story fact | Gameplay it becomes | Why |',
            '| --- | --- | --- |',
            '| River rises hourly | rising-water drip hazards on a timing cycle | The rise is the clock |',
            '',
            '## Novelty Ledger',
            '',
            '| Row | New | Old |',
            '| --- | --- | --- |',
            '| Topology | tower | flat |',
        ].join('\n')
    );
    assert.deepEqual(brief.elements, ['rising water', 'sandbag stacks']);
    assert.equal(brief.mappings.length, 1);
    assert.match(brief.mappings[0].fact, /River rises/);
});

test('news brief parsing strips trailing periods from elements', async () => {
    const { parseNewsBrief } = await loadCritic();
    const brief = parseNewsBrief(
        ['# Level 99', '', 'Element inventory: red candles; closing bell.', ''].join('\n')
    );
    assert.deepEqual(brief.elements, ['red candles', 'closing bell']);
});

test('fidelity gate honors exact human confirmations', async () => {
    const { fidelityGate } = await loadCritic();
    const input = {
        elements: [{ element: 'shafts', noul: 0.5 }],
        rows: [
            { fact: 'VIX rose', choice: 'unsupported', confidence: 0.3 },
            { fact: 'Intel fell', choice: 'unsupported', confidence: 0.4 },
        ],
        mechanicMean: 3,
        visualMean: 3,
        reviewerFlaw: 'none',
    };
    assert.equal(fidelityGate(input).passed, false);
    const confirmed = fidelityGate({ ...input, confirmed: ['row:VIX rose', 'row:Intel fell'] });
    assert.equal(confirmed.unsupported, 0);
    assert.deepEqual(confirmed.needsHuman, ['element:shafts']);
    const typo = fidelityGate({ ...input, confirmed: ['row:vix rose'] });
    assert.equal(typo.unsupported, 2);
});

test('pilot budget scales with level size', async () => {
    const { pilotBudgetSec } = await loadCritic();
    assert.equal(pilotBudgetSec(0), 90);
    assert.equal(pilotBudgetSec(2000), 90);
    assert.equal(pilotBudgetSec(6000), 150);
    assert.equal(pilotBudgetSec(12800), 320);
});

test('fidelity code checks require claims in level data, not titles', async () => {
    const { fidelityCodeChecks } = await loadCritic();
    const brief = {
        elements: ['ticker tape', 'sandbag stacks'],
        mappings: [{ fact: 'River rises', mechanic: 'rising-water drip hazards' }],
    };
    const checks = fidelityCodeChecks(brief, 'instructions mention ticker drones and drip hazards');
    assert.equal(checks.elements.find((entry) => entry.element === 'ticker tape').claimed, true);
    assert.equal(
        checks.elements.find((entry) => entry.element === 'sandbag stacks').claimed,
        false
    );
    assert.equal(checks.sceneryOnlyFacts.length, 0);
});

test('fidelity gate needs three shown elements and clean rows', async () => {
    const { fidelityGate, elementVerdict } = await loadCritic();
    assert.equal(elementVerdict(0.9), 'shown');
    assert.equal(elementVerdict(0.5), 'faint');
    assert.equal(elementVerdict(0.1), 'missing');
    const passing = fidelityGate({
        elements: [
            { element: 'a', noul: 0.9 },
            { element: 'b', noul: 0.8 },
            { element: 'c', noul: 0.75 },
        ],
        rows: [{ fact: 'f', choice: 'supports', confidence: 0.9 }],
        mechanicMean: 3.5,
        visualMean: 3.2,
        reviewerFlaw: 'none',
    });
    assert.equal(passing.passed, true);
    const failing = fidelityGate({
        elements: [
            { element: 'a', noul: 0.9 },
            { element: 'b', noul: 0.5 },
            { element: 'c', noul: 0.2 },
        ],
        rows: [{ fact: 'f', choice: 'contradicts', confidence: 0.95 }],
        mechanicMean: 3.5,
        visualMean: 3.2,
        reviewerFlaw: 'none',
    });
    assert.equal(failing.passed, false);
    assert.ok(failing.needsHuman.includes('element:b'));
});

test('quality gate refuses unsent screenshots and clone flaws', async () => {
    const { panelPassed } = await loadCritic();
    const report = (persona, overrides = {}) => ({
        persona,
        fun: 2.4,
        fairness: 1.8,
        novelty: 1.8,
        flaw: 'none',
        verdict: 'iterate',
        ...overrides,
    });
    const reports = ['reviewer', 'veteran', 'casual', 'speedrunner'].map((persona) =>
        report(persona)
    );
    assert.equal(panelPassed(reports, [], true), true);
    assert.equal(panelPassed(reports, [], false), false);
    assert.equal(panelPassed(reports, [{ id: 'clone-suspect', detail: 'x' }], true), false);
    const rework = [...reports.slice(0, 3), report('speedrunner', { verdict: 'rework' })];
    assert.equal(panelPassed(rework, [], true), false);
    const structural = [...reports.slice(0, 3), report('speedrunner', { flaw: 'blind' })];
    assert.equal(panelPassed(structural, [], true), false);
    const named = [
        ...reports.slice(0, 2),
        report('casual', { flaw: 'flat' }),
        report('speedrunner', { flaw: 'flat' }),
    ];
    assert.equal(panelPassed(named, [], true), false);
    const dull = ['reviewer', 'veteran', 'casual', 'speedrunner'].map((persona) =>
        report(persona, { fun: 1.0 })
    );
    assert.equal(panelPassed(dull, [], true), false);
    const loneCosmetic = [...reports.slice(0, 3), report('speedrunner', { flaw: 'flat' })];
    assert.equal(panelPassed(loneCosmetic, [], true), true);
});

test('structural flaws are all real flaw enum options', async () => {
    const { FLAW_OPTIONS, STRUCTURAL_FLAWS } = await loadCritic();
    for (const flaw of STRUCTURAL_FLAWS) {
        assert.ok(flaw in FLAW_OPTIONS, `${flaw} is not a judge option`);
    }
});
