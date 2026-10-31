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

test('news brief parsing extracts signature elements and facts', async () => {
    const { parseNewsBrief } = await loadCritic();
    const brief = parseNewsBrief(
        [
            '# Level 99 — Flood Market',
            '',
            'Element inventory: rising water, sandbag stacks, rescue boats',
            'Signature elements: rising water, rescue boats',
            '',
            '| Story fact | Gameplay it becomes | Why |',
            '| --- | --- | --- |',
            '| River rises hourly (signature) | rising-water drip hazards on a timing cycle | The rise is the clock |',
            '| Boats rescue crews | rescue cages on the upper decks | Objective mirrors the rescue |',
        ].join('\n')
    );
    assert.deepEqual(brief.signatureElements, ['rising water', 'rescue boats']);
    assert.deepEqual(brief.signatureFacts, ['River rises hourly']);
    assert.equal(brief.mappings[0].fact, 'River rises hourly');
});

test('fidelity gate protects signature elements and blocks unconfirmed needs-human', async () => {
    const { fidelityGate } = await loadCritic();
    const base = {
        elements: [
            { element: 'gauge', noul: 0.9, signature: true },
            { element: 'candles', noul: 0.85 },
            { element: 'plates', noul: 0.8 },
            { element: 'bell', noul: 0.95 },
        ],
        rows: [{ fact: 'f', choice: 'supports', confidence: 0.9 }],
        mechanicMean: 3.5,
        visualMean: 3.2,
        reviewerFlaw: 'none',
    };
    assert.equal(fidelityGate(base).passed, true);
    const missingSignature = fidelityGate({
        ...base,
        elements: base.elements.map((e) => (e.signature ? { ...e, noul: 0.1 } : e)),
    });
    assert.equal(missingSignature.passed, false);
    assert.equal(missingSignature.shown, 3);
    const faintSignature = fidelityGate({
        ...base,
        elements: base.elements.map((e) => (e.signature ? { ...e, noul: 0.55 } : e)),
    });
    assert.equal(faintSignature.passed, false);
    const confirmedFaint = fidelityGate({
        ...faintSignatureInput(base),
        confirmed: ['element:gauge'],
    });
    assert.equal(confirmedFaint.passed, true);
    function faintSignatureInput(input) {
        return {
            ...input,
            elements: input.elements.map((e) => (e.signature ? { ...e, noul: 0.55 } : e)),
        };
    }
    const lowConfidence = fidelityGate({
        ...base,
        rows: [{ fact: 'f', choice: 'supports', confidence: 0.5 }],
    });
    assert.equal(lowConfidence.passed, false);
    assert.deepEqual(lowConfidence.needsHuman, ['row:f']);
});

test('fidelity gate blocks a failed Space Chicken universe check', async () => {
    const { fidelityGate } = await loadCritic();
    const base = {
        elements: [
            { element: 'a', noul: 0.9 },
            { element: 'b', noul: 0.85 },
            { element: 'c', noul: 0.8 },
        ],
        rows: [{ fact: 'f', choice: 'supports', confidence: 0.95 }],
        mechanicMean: 3.4,
        visualMean: 3.1,
        reviewerFlaw: 'none',
    };
    assert.equal(fidelityGate({ ...base, universeNoul: 0.9 }).passed, true);
    assert.equal(fidelityGate({ ...base, universeNoul: 0.2 }).passed, false);
    const faintUniverse = fidelityGate({ ...base, universeNoul: 0.55 });
    assert.equal(faintUniverse.passed, false);
    assert.ok(faintUniverse.needsHuman.includes('universe:space-chicken'));
});

test('news quality floors are stricter than campaign floors', async () => {
    const { panelPassed } = await loadCritic();
    const report = (persona, overrides = {}) => ({
        persona,
        fun: 2.4,
        fairness: 1.8,
        readability: 2.3,
        novelty: 1.9,
        pacing: 2.2,
        theme: 2.4,
        flaw: 'none',
        verdict: 'iterate',
        ...overrides,
    });
    const good = ['reviewer', 'veteran', 'casual', 'speedrunner'].map((p) => report(p));
    assert.equal(panelPassed(good, [], true), true);
    assert.equal(panelPassed(good, [], true, { news: true }), true);
    const dullNovelty = good.map((r) => ({ ...r, novelty: 1.1 }));
    assert.equal(panelPassed(dullNovelty, [], true), true);
    assert.equal(panelPassed(dullNovelty, [], true, { news: true }), false);
    const offTheme = good.map((r) => ({ ...r, theme: 1.2 }));
    assert.equal(panelPassed(offTheme, [], true, { news: true }), false);
});

test('planBeats shoots hazards and set pieces from level data, finale last', async () => {
    const { planBeats, analyseLevel } = await loadCritic();
    const { content, definition } = fakeLevel({
        keys: ['aDeck', 'bDeck', 'cDeck'],
        hazards: ['laser', 'drone', 'laser', 'crusher'],
    });
    content.dynamic = [
        { type: 'laser', x: 1000, y: 420 },
        { type: 'drone', x: 2400, y: 300 },
        { type: 'laser', x: 3200, y: 420 },
        { type: 'crusher', x: 4300, y: 260 },
    ];
    content.props = [{ x: 2600, y: 380, key: 'craterPlate' }];
    const beats = planBeats(analyseLevel(content, definition), content);
    assert.equal(beats[0].id, '01-opener');
    assert.match(beats.at(-1).proves, /crown approach/);
    assert.ok(beats.some((beat) => /drone/.test(beat.proves)));
    assert.ok(beats.some((beat) => /crusher/.test(beat.proves)));
    assert.ok(beats.length <= 6);
    const xs = beats.map((beat) => beat.x);
    assert.deepEqual(
        xs,
        [...xs].sort((a, b) => a - b)
    );
});

test('concept gate requires the three artefacts, rows, inventory, and themed enemy', async () => {
    const { assessConcept } = await loadCritic();
    const good = assessConcept(
        [
            '# Level 99 — Flood Market',
            '',
            'Element inventory: rising water, sandbag stacks, rescue boats',
            'Signature elements: rising water',
            'Themed enemy: Digger Drone (enemies/digger.js).',
            '',
            '| Story fact | Gameplay it becomes | Why |',
            '| --- | --- | --- |',
            '| River rises hourly (signature) | rising-water drip hazards on a timing cycle | The rise is the clock |',
            '| Boats rescue crews | rescue cages on the upper decks | Objective mirrors the rescue |',
            '| Panic spreads | drone patrols tighten timing gates | Pressure spreads |',
            '',
            '## Novelty Ledger',
            '',
            'differs',
            '',
            '## Signature Mechanic Canvas',
            '',
            'verb: carry',
            '',
            '## Topology Fingerprint',
            '',
            'sink-and-rise',
        ].join('\n')
    );
    assert.equal(good.passed, true);
    const thin = assessConcept(
        ['# Level 99 — Flood Market', '', 'Element inventory: rising water', ''].join('\n')
    );
    assert.equal(thin.passed, false);
    assert.ok(thin.missing.includes('novelty-ledger'));
    assert.ok(thin.missing.includes('themed-enemy'));
});

test('fix contract ranks structural flaws first with owner and recheck', async () => {
    const { buildFixContract } = await loadCritic();
    const fixes = buildFixContract({
        reports: [
            { persona: 'reviewer', flaw: 'clone', verdict: 'rework' },
            { persona: 'veteran', flaw: 'blind', verdict: 'iterate' },
            { persona: 'casual', flaw: 'blind', verdict: 'iterate' },
            { persona: 'speedrunner', flaw: 'none', verdict: 'iterate' },
        ],
        flags: [{ id: 'flat-deck', detail: '1 deck key(s), dominant share 1.00 across 10 decks' }],
        telemetry: { deathSpots: [2400, 2450], maxX: 5000 },
        analysis: { crownX: 5500 },
        shots: [
            { id: '01-opener', file: '01-opener.jpg', proves: 'spawn read' },
            { id: '02-mid', file: '02-mid.jpg', proves: 'hazard beat: drone at x=2400' },
            { id: '03-finale', file: '03-finale.jpg', proves: 'crown approach' },
        ],
    });
    assert.ok(fixes.length >= 2);
    assert.equal(fixes[0].flaw, 'blind');
    assert.match(fixes[0].owner, /level-creator/);
    assert.ok(fixes[0].evidence.length > 0);
    assert.ok(fixes[0].smallestFix.length > 10);
    assert.ok(fixes[0].recheck.length > 10);
    assert.equal(buildFixContract({ reports: [], flags: [] }).length, 0);
});

test('loop state increments only after an unpassed run', async () => {
    const { nextLoopInfo } = await loadCritic();
    assert.deepEqual(nextLoopInfo(null), { loop: 1, priorFlaw: null });
    assert.deepEqual(nextLoopInfo({ passed: true, loop: 2 }), { loop: 1, priorFlaw: null });
    assert.deepEqual(nextLoopInfo({ passed: false, loop: 1, fixes: [{ flaw: 'blind' }] }), {
        loop: 2,
        priorFlaw: 'blind',
    });
});

test('report renders signature marks, static fidelity, and the fix contract', async () => {
    const { renderReport } = await loadCritic();
    const md = renderReport({
        level: 99,
        run: 'static',
        analysis: { title: 'Fake' },
        flags: [],
        telemetry: null,
        screenshotsSent: false,
        reports: [],
        passed: false,
        loop: 1,
        fidelity: {
            briefHeadline: 'H',
            gate: { passed: false, needsHuman: [] },
            elements: [{ element: 'gauge', signature: true, claimed: true, noul: null }],
            rows: [{ fact: 'f', signature: true, choice: 'not-judged', confidence: null }],
        },
        fixes: [
            {
                rank: 1,
                flaw: 'blind',
                source: 'quality',
                owner: 'skills/level-creator/SKILL.md',
                evidence: '02-hazard-laser.jpg',
                smallestFix: 'Move the hazard off the blind landing.',
                recheck: 'Re-run the full critic.',
            },
        ],
    });
    assert.match(md, /Element "gauge" \[signature\]: claimed-in-data \(not judged\)/);
    assert.match(md, /Row "f" \[signature\] -> not-judged/);
    assert.match(md, /## Fix contract/);
    assert.match(md, /1\. \[blind\] \(quality\) owner: skills\/level-creator\/SKILL\.md/);
});

test('panel shot selection keeps opener and finale within the request cap', async () => {
    const { selectPanelShots } = await loadCritic();
    const shots = [1, 2, 3, 4, 5, 6].map((n) => ({
        id: `0${n}-beat`,
        file: `0${n}.jpg`,
        proves: `beat ${n}`,
    }));
    const picked = selectPanelShots(shots, 4);
    assert.equal(picked.length, 4);
    assert.equal(picked[0].id, '01-beat');
    assert.equal(picked.at(-1).id, '06-beat');
});

test('structural flaws are all real flaw enum options', async () => {
    const { FLAW_OPTIONS, STRUCTURAL_FLAWS } = await loadCritic();
    for (const flaw of STRUCTURAL_FLAWS) {
        assert.ok(flaw in FLAW_OPTIONS, `${flaw} is not a judge option`);
    }
});
