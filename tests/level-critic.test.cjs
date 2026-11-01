const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
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
    assert.equal(panelPassed(reports, [], undefined), false);
    assert.equal(panelPassed(reports, [], 1), false);
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

test('planBeats never slices the finale off a full sheet', async () => {
    const { planBeats, analyseLevel } = await loadCritic();
    const { content, definition } = fakeLevel({
        keys: ['aDeck', 'bDeck', 'cDeck'],
        hazards: ['laser', 'drone', 'roller', 'bonk'],
    });
    content.dynamic = [
        { type: 'bonk', x: 1500, y: 400 },
        { type: 'laser', x: 2000, y: 400 },
        { type: 'drone', x: 2500, y: 400 },
        { type: 'roller', x: 3100, y: 400 },
    ];
    content.props = [{ x: 620, y: 400, key: 'rocketProp' }];
    const beats = planBeats(analyseLevel(content, definition), content);
    assert.ok(beats.length <= 6);
    assert.match(beats.at(-1).proves, /crown approach/);
    assert.match(beats.at(-1).id, /finale$/);
});

test('concept gate requires the three artefacts, rows, inventory, and themed enemy', async () => {
    const { assessConcept } = await loadCritic();
    const good = assessConcept(
        [
            '# Level 99 — Flood Market',
            '',
            'Element inventory: rising water, sandbag stacks, rescue boats',
            'Signature elements: rising water',
            'Boss theme: none — a flood rescue has no dominant adversary.',
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
            'differs from every shipped level: no sibling teaches a rising-water clock',
            '',
            '## Signature Mechanic Canvas',
            '',
            'verb: carry — the rising water forces the player to carry crews upward',
            '',
            '## Topology Fingerprint',
            '',
            'sink-and-rise: decks descend into the flood then climb to the crown',
        ].join('\n')
    );
    assert.equal(good.passed, true);
    const thin = assessConcept(
        ['# Level 99 — Flood Market', '', 'Element inventory: rising water', ''].join('\n')
    );
    assert.equal(thin.passed, false);
    assert.ok(thin.missing.includes('novelty-ledger'));
    assert.ok(thin.missing.includes('themed-enemy'));
    assert.ok(thin.missing.includes('boss-theme-decision'));
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

test('panel shot selection never drops a beat to fit a request cap', async () => {
    const { selectPanelShots, panelShotCoverage } = await loadCritic();
    const shots = [1, 2, 3, 4, 5, 6, 7].map((n) => ({
        id: `0${n}-beat`,
        file: `0${n}.jpg`,
        proves: `beat ${n}`,
    }));
    const picked = selectPanelShots(shots, 4);
    assert.equal(picked.length, 7);
    assert.equal(picked[0].id, '01-beat');
    assert.equal(picked.at(-1).id, '07-beat');
    const partial = panelShotCoverage(shots, [{ evidenceSeen: ['01-beat', '02-beat'] }], null);
    assert.equal(partial.complete, false);
    assert.deepEqual(partial.missing, ['03-beat', '04-beat', '05-beat', '06-beat', '07-beat']);
    const full = panelShotCoverage(shots, [{ evidenceSeen: shots.map((s) => s.id) }], {
        evidenceSeen: [],
    });
    assert.equal(full.complete, true);
});

test('agent confirmations never count as human confirmation', async () => {
    const { confirmationReview } = await loadCritic();
    const agent = confirmationReview({
        confirmed: ['element:x'],
        reviewer: 'agent human-review (screenshots opened)',
        reasoning: 'saw it',
    });
    assert.deepEqual(agent.confirmed, []);
    assert.deepEqual(agent.agentConfirmed, ['element:x']);
    assert.equal(agent.reviewerType, 'agent');
    const human = confirmationReview({
        confirmed: ['element:x'],
        reviewer: 'Ada',
        reviewerType: 'human',
        reasoning: 'opened 06-finale.jpg; crown deck visible',
    });
    assert.deepEqual(human.confirmed, ['element:x']);
    assert.deepEqual(human.issues, []);
});

test('planBeats spends slots on signature beats before generic hazards', async () => {
    const { planBeats, analyseLevel } = await loadCritic();
    const { content, definition } = fakeLevel({
        keys: ['aDeck', 'bDeck', 'cDeck'],
        hazards: ['laser'],
    });
    content.dynamic = [
        { type: 'laser', x: 1000, y: 400 },
        { type: 'drip', x: 1600, y: 400 },
        { type: 'roller', x: 2200, y: 400 },
        { type: 'cosmicRay', x: 2800, y: 400 },
        { type: 'drone', key: 'themedBot', x: 3400, y: 400 },
    ];
    content.props = [];
    const beats = planBeats(analyseLevel(content, definition), content);
    assert.ok(
        beats.some((beat) => /drone/.test(beat.proves)),
        'themed drone beat survives the cap'
    );
    assert.match(beats.at(-1).proves, /crown approach/);
});

test('unmatched human confirmations are reported for warning', async () => {
    const { unmatchedConfirmations } = await loadCritic();
    const brief = {
        elements: ['rising water', 'sandbag stacks'],
        mappings: [{ fact: 'River rises hourly' }, { fact: 'Boats rescue crews' }],
    };
    assert.deepEqual(unmatchedConfirmations([], brief), []);
    assert.deepEqual(
        unmatchedConfirmations(
            ['element:rising water', 'row:River rises hourly', 'universe:space-chicken'],
            brief
        ),
        []
    );
    assert.deepEqual(
        unmatchedConfirmations(
            ['element:rising water ', 'row:river rises hourly', 'row:Boats rescue crews'],
            brief
        ),
        ['element:rising water ', 'row:river rises hourly']
    );
    assert.deepEqual(unmatchedConfirmations(['row:anything'], null), ['row:anything']);
});

test('structural flaws are all real flaw enum options', async () => {
    const { FLAW_OPTIONS, STRUCTURAL_FLAWS } = await loadCritic();
    for (const flaw of STRUCTURAL_FLAWS) {
        assert.ok(flaw in FLAW_OPTIONS, `${flaw} is not a judge option`);
    }
});

test('copied deck x-lists rhyme even under new paints', async () => {
    const { analyseLevel, layoutSimilarity, mechanicalFlags } = await loadCritic();
    const xs = [300, 900, 1500, 2100, 2700, 3300, 3900, 4500, 5100, 5600];
    const make = (keys, width = 6000) => ({
        content: {
            background: { type: 'space' },
            staticPlatforms: xs.map((x, i) => ({ x, y: 400 + (i % 3) * 40, key: keys[i % 3] })),
            dynamic: [
                { type: 'laser', x: 2000, y: 400 },
                { type: 'drone', x: 3000, y: 400 },
            ],
            checkpoints: [{ x: 2500, y: 400 }],
            moving: [],
            props: [],
        },
        definition: { TITLE: 'Fake', GRAVITY: 300, WORLD_WIDTH: width, CROWN_X: 5650 },
    });
    const a = analyseLevel(...Object.values(make(['aDeck', 'bDeck', 'cDeck'])));
    const copy = analyseLevel(...Object.values(make(['xDeck', 'yDeck', 'zDeck'])));
    const shifted = analyseLevel(...Object.values(make(['aDeck', 'bDeck', 'cDeck'], 4400)));
    assert.equal(layoutSimilarity(a, copy), 1);
    assert.equal(layoutSimilarity(a, shifted), 0);
    const flags = mechanicalFlags(copy, { 1: a, 2: copy }, 2);
    assert.equal(flags.filter((flag) => flag.id === 'skeleton-rhyme').length, 1);
});

test('finale pressure must be visible in a frozen still', async () => {
    const { analyseLevel, mechanicalFlags } = await loadCritic();
    const make = (dynamic) => ({
        content: {
            background: { type: 'space' },
            staticPlatforms: [
                { x: 300, y: 500, key: 'aDeck' },
                { x: 2000, y: 500, key: 'bDeck' },
                { x: 4000, y: 500, key: 'cDeck' },
                { x: 5600, y: 500, key: 'aDeck' },
            ],
            dynamic,
            checkpoints: [],
            moving: [],
            props: [],
        },
        definition: { TITLE: 'Fake', GRAVITY: 300, WORLD_WIDTH: 6000, CROWN_X: 5650 },
    });
    const loneBeam = analyseLevel(
        ...Object.values(
            make([
                {
                    type: 'laser',
                    x: 5400,
                    y: 400,
                    orientation: 'vertical',
                    onDuration: 800,
                    offDuration: 1200,
                },
            ])
        )
    );
    assert.equal(loneBeam.finaleHazardCount, 1);
    assert.equal(loneBeam.finaleVisible, false);
    assert.ok(
        mechanicalFlags(loneBeam, { 9: loneBeam }, 9).some((flag) => flag.id === 'finale-invisible')
    );
    const crownRoller = analyseLevel(
        ...Object.values(
            make([{ type: 'roller', x: 5200, y: 460, patrol: { x: 5450, duration: 1200 } }])
        )
    );
    assert.equal(crownRoller.finaleVisible, true);
    assert.ok(
        !mechanicalFlags(crownRoller, { 9: crownRoller }, 9).some(
            (flag) => flag.id === 'finale-invisible'
        )
    );
    const staggeredBeams = analyseLevel(
        ...Object.values(
            make([
                {
                    type: 'laser',
                    x: 5100,
                    y: 400,
                    orientation: 'vertical',
                    onDuration: 900,
                    offDuration: 900,
                },
                {
                    type: 'laser',
                    x: 5450,
                    y: 400,
                    orientation: 'vertical',
                    onDuration: 900,
                    offDuration: 900,
                },
            ])
        )
    );
    assert.equal(staggeredBeams.finaleVisible, true);
});

test('news status comes from the content marker, not brief availability', async () => {
    const { isNewsLevelFor } = await loadCritic();
    assert.equal(isNewsLevelFor({ news: { outlet: 'X' } }, null), true);
    assert.equal(isNewsLevelFor({ news: { outlet: 'X' } }, { elements: [], mappings: [] }), true);
    assert.equal(isNewsLevelFor({}, { elements: ['a'], mappings: [] }), true);
    assert.equal(isNewsLevelFor({}, null), false);
    assert.equal(isNewsLevelFor({}, { elements: [], mappings: [] }), false);
    assert.equal(isNewsLevelFor(null, null), false);
});

test('L2/L7: rework verdicts without a clone vote never invent a clone finding', async () => {
    const { buildFixContract } = await loadCritic();
    const reports = ['reviewer', 'veteran', 'casual', 'speedrunner'].map((persona) => ({
        persona,
        fun: 2.2,
        fairness: 1.9,
        flaw: 'flat',
        verdict: persona === 'reviewer' ? 'rework' : 'iterate',
    }));
    const fixes = buildFixContract({
        reports,
        flags: [],
        telemetry: { outcome: 'crown-collected', deaths: 0, deathSpots: [], maxX: 5500 },
        analysis: { crownX: 5500 },
        shots: [{ id: '01-opener', file: '01-opener.jpg', proves: 'spawn read' }],
    });
    assert.ok(
        fixes.every((fix) => fix.flaw !== 'clone'),
        `no clone finding without a comparator, got: ${fixes.map((f) => f.flaw).join(', ')}`
    );
});

test('L3: an uncorroborated blind vote routes to investigation, not a level edit', async () => {
    const { buildFixContract, isCorroboratedFlaw } = await loadCritic();
    const reports = ['reviewer', 'veteran', 'casual', 'speedrunner'].map((persona, index) => ({
        persona,
        fun: 1.6,
        fairness: 1.7,
        flaw: index === 0 ? 'blind' : 'none',
        verdict: 'iterate',
    }));
    const telemetry = { outcome: 'timeout', deaths: 1, deathSpots: [141], maxX: 301 };
    assert.equal(
        isCorroboratedFlaw('blind', { voteCount: 1, repeatedFlaws: [], telemetry, flags: [] }),
        false
    );
    const fixes = buildFixContract({
        reports,
        flags: [],
        telemetry,
        analysis: { crownX: 2050 },
        shots: [{ id: '01-opener', file: '01-opener.jpg', proves: 'spawn read' }],
        repeatedFlaws: [],
    });
    assert.equal(fixes[0].flaw, 'blind');
    assert.equal(fixes[0].source, 'investigation');
    assert.match(fixes[0].smallestFix, /Investigate before editing/);
    assert.ok(fixes[0].alternativeCause.length > 0);
    assert.ok(fixes[0].recheck.length > 10);
    assert.ok(fixes.every((fix) => !(fix.flaw === 'blind' && fix.source === 'quality')));
});

test('L18: the fix cites the dominant death cluster, not the first death', async () => {
    const { dominantDeathCluster, buildFixContract } = await loadCritic();
    const cluster = dominantDeathCluster([1369, 5305, 5320, 5330, 5340]);
    assert.equal(cluster.count, 4);
    assert.ok(cluster.center >= 5300 && cluster.center <= 5345, `center ${cluster.center}`);
    assert.equal(dominantDeathCluster([141]).count, 1);
    assert.equal(dominantDeathCluster([]), null);
    const reports = ['reviewer', 'veteran', 'casual', 'speedrunner'].map((persona, index) => ({
        persona,
        fun: 2.0,
        fairness: 1.6,
        flaw: index < 2 ? 'cheap' : 'none',
        verdict: 'iterate',
    }));
    const fixes = buildFixContract({
        reports,
        flags: [],
        telemetry: {
            outcome: 'timeout',
            deaths: 5,
            deathSpots: [1369, 5305, 5320, 5330, 5340],
            maxX: 5340,
        },
        analysis: { crownX: 5600 },
        shots: [
            { id: '01-opener', file: '01-opener.jpg', x: 150, proves: 'spawn read' },
            { id: '05-hotspot', file: '05-hotspot.jpg', x: 5300, proves: 'hazard beat' },
        ],
    });
    assert.match(fixes[0].evidence, /4 deaths cluster near x=53\d\d/);
    assert.match(fixes[0].evidence, /05-hotspot\.jpg/);
});

test('L18: panel unavailability is infrastructure, ranked first, never a human task', async () => {
    const { buildFixContract, isInfrastructureKey, recommendNextAction } = await loadCritic();
    assert.equal(isInfrastructureKey('fidelity-panel-unavailable'), true);
    assert.equal(isInfrastructureKey('panel-unavailable'), true);
    assert.equal(isInfrastructureKey('no-screenshots'), true);
    assert.equal(isInfrastructureKey('row:some fact'), false);
    const fixes = buildFixContract({
        reports: [],
        flags: [{ id: 'flat-deck', kind: 'visual-variety', detail: '1 deck key' }],
        fidelity: {
            gate: { passed: false, needsHuman: ['fidelity-panel-unavailable'] },
            elements: [],
            rows: [],
        },
    });
    assert.equal(fixes[0].flaw, 'fidelity-panel-unavailable');
    assert.equal(fixes[0].source, 'infrastructure');
    assert.match(fixes[0].owner, /infrastructure/);
    assert.ok(fixes.every((fix) => fix.flaw !== 'needs-human'));
    const next = recommendNextAction(fixes);
    assert.equal(next.flaw, 'fidelity-panel-unavailable');
    assert.match(next.justification, /infrastructure/);
});

test('full beat sheets and inventories batch without dropping evidence', async () => {
    const { batchPanelShots, batchInventory, mergeFidelityBatches, mergePersonaBatches } =
        await loadCritic();
    const beats = [1, 2, 3, 4, 5, 6].map((n) => ({ id: `0${n}-beat`, file: `0${n}.jpg` }));
    const shotBatches = batchPanelShots(beats, 4);
    assert.equal(shotBatches.length, 2);
    assert.deepEqual(
        shotBatches.flat().map((shot) => shot.id),
        beats.map((shot) => shot.id)
    );
    const inventory = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const chunks = batchInventory(inventory, 6);
    assert.equal(chunks.length, 2);
    assert.deepEqual(chunks.flat(), inventory);
    // Non-positive batch sizes must throw instead of hanging the loop.
    assert.throws(() => batchPanelShots(beats, 0), /positive/);
    assert.throws(() => batchPanelShots(beats, -2), /positive/);
    assert.throws(() => batchInventory(inventory, 0), /positive/);
    assert.throws(() => batchInventory(inventory, -2), /positive/);
    // Visibility is existential: shown in any batch counts as shown.
    const merged = mergeFidelityBatches([
        {
            elements: [{ element: 'dish', noul: 0.2 }],
            rows: [{ fact: 'f', choice: 'unsupported', confidence: 0.5 }],
            mechanicFidelity: 2,
            visualFidelity: 2,
            fidelityFlaw: 'none',
            universeFit: 0.9,
            shotIds: ['01-opener'],
        },
        {
            elements: [{ element: 'dish', noul: 0.85 }],
            rows: [{ fact: 'f', choice: 'supports', confidence: 0.9 }],
            mechanicFidelity: 3,
            visualFidelity: 3,
            fidelityFlaw: 'none',
            universeFit: 0.95,
            shotIds: ['05-finale'],
        },
    ]);
    assert.equal(merged.elements[0].verdict, 'shown');
    assert.equal(merged.rows[0].choice, 'supports');
    assert.deepEqual(merged.evidenceSeen, ['01-opener', '05-finale']);
    const persona = mergePersonaBatches([
        { persona: 'reviewer', name: 'M', fun: 2, flaw: 'none', verdict: 'ship', shotIds: ['a'] },
        {
            persona: 'reviewer',
            name: 'M',
            fun: 4,
            flaw: 'flat',
            verdict: 'iterate',
            shotIds: ['b'],
        },
    ]);
    assert.equal(persona.fun, 3);
    assert.equal(persona.flaw, 'flat');
    assert.equal(persona.verdict, 'iterate');
    assert.deepEqual(persona.evidenceSeen, ['a', 'b']);
});

test('failed and successful runs both survive; repeats need two runs', async () => {
    const { appendRun, repeatedFlawsAcrossRuns } = await loadCritic();
    const first = appendRun([], { runId: 'run-1', flaws: ['cheap', 'flat'] });
    const both = appendRun(first, { runId: 'run-2', flaws: ['flat'] });
    assert.equal(first.length, 1);
    assert.equal(both.length, 2);
    assert.equal(both[0].runId, 'run-1');
    assert.equal(both[1].runId, 'run-2');
    assert.deepEqual(repeatedFlawsAcrossRuns(both), ['flat']);
    assert.deepEqual(repeatedFlawsAcrossRuns([both[0]]), []);
});

test('L22: agent confirmations never yield a human-confirmed PASS', async () => {
    const { confirmationReview, validateStoredPass } = await loadCritic();
    const agentHuman = {
        confirmed: ['row:a', 'row:b'],
        reviewer: 'agent human-review (screenshots opened)',
        reviewerType: 'agent',
        date: '2026-10-31',
        reasoning: 'opened shots',
    };
    assert.deepEqual(confirmationReview(agentHuman).confirmed, []);
    const storedPass = {
        passed: true,
        loop: 7,
        telemetry: { outcome: 'crown-collected' },
        fidelity: {
            humanConfirmed: ['row:a', 'row:b'],
            elements: [],
            rows: [{ fact: 'a' }, { fact: 'b' }],
        },
    };
    const stale = validateStoredPass(storedPass, agentHuman);
    assert.equal(stale.consistent, false);
    assert.ok(stale.issues.some((issue) => /reviewerType "agent"/.test(issue)));
    const humanHuman = { ...agentHuman, reviewer: 'Ada', reviewerType: 'human' };
    const fresh = validateStoredPass(
        { ...storedPass, loop: 1, handoff: null },
        { ...humanHuman, confirmed: [] }
    );
    assert.equal(fresh.consistent, true);
});

test('gate-open never counts as a completed crown route', async () => {
    const { isCompletedCrownRoute, assessEvidenceValidity } = await loadCritic();
    assert.equal(isCompletedCrownRoute('crown-collected'), true);
    assert.equal(isCompletedCrownRoute('gate-open'), false);
    assert.equal(isCompletedCrownRoute('reached-crown-area'), false);
    assert.equal(isCompletedCrownRoute('timeout'), false);
    const gateOpen = assessEvidenceValidity({
        telemetry: { outcome: 'gate-open', deaths: 2, deathSpots: [5000, 5100], maxX: 6020 },
        runs: [{ runId: 'r1' }],
        analysis: { crownX: 6550 },
        flags: [],
        reports: [],
        fidelity: null,
        screenshotsSent: true,
        isNewsLevel: false,
    });
    assert.equal(gateOpen.routeCoverage.status, 'partial');
    assert.ok(gateOpen.routeCoverage.unverified.length > 0);
    assert.equal(gateOpen.releaseEligibility.eligible, false);
    assert.ok(
        gateOpen.releaseEligibility.blockers.some((blocker) =>
            /no completed crown route/.test(blocker)
        )
    );
});

test('report separates the quality gate from release eligibility', async () => {
    const { renderReport, assessEvidenceValidity } = await loadCritic();
    const good = ['reviewer', 'veteran', 'casual', 'speedrunner'].map((persona) => ({
        persona,
        name: persona,
        fun: 2.4,
        fairness: 1.8,
        readability: 2.3,
        novelty: 1.9,
        pacing: 2.2,
        theme: 2.4,
        flaw: 'none',
        verdict: 'ship',
    }));
    const statuses = assessEvidenceValidity({
        telemetry: { outcome: 'timeout', deaths: 0, deathSpots: [], maxX: 4612 },
        runs: [{ runId: 'r1' }],
        analysis: { crownX: 6000, title: 'Fake' },
        flags: [],
        reports: good,
        fidelity: null,
        screenshotsSent: true,
        isNewsLevel: false,
    });
    assert.equal(statuses.quality.status, 'pass');
    assert.equal(statuses.releaseEligibility.eligible, false);
    const md = renderReport({
        level: 13,
        run: 'full',
        analysis: { title: 'Fake' },
        flags: [],
        telemetry: { outcome: 'timeout', maxX: 4612 },
        screenshotsSent: true,
        reports: good,
        passed: true,
        statuses,
        loop: 1,
        fixes: [],
    });
    assert.match(md, /Quality gate: PASS/);
    assert.match(md, /Route coverage: partial/);
    assert.match(md, /Release eligibility: NOT ELIGIBLE/);
});

test('revision loops hold on calibration reruns and advance on design change', async () => {
    const { nextRevisionLoop, analysisHash } = await loadCritic();
    const prior = { passed: false, loop: 1, fixes: [{ flaw: 'flat' }] };
    const calibration = nextRevisionLoop(prior, { designChanged: false });
    assert.equal(calibration.loop, 1);
    assert.equal(calibration.calibrationRuns, 1);
    assert.equal(calibration.priorFlaw, 'flat');
    const revised = nextRevisionLoop(prior, { designChanged: true });
    assert.equal(revised.loop, 2);
    assert.equal(revised.calibrationRuns, 0);
    assert.deepEqual(nextRevisionLoop(null, {}), { loop: 1, priorFlaw: null, calibrationRuns: 0 });
    const stale = nextRevisionLoop({ passed: true, loop: 2, stalePass: true }, {});
    assert.equal(stale.loop, 2);
    const a = { worldWidth: 6000, crownX: 5500, platformKeys: ['a'], platformCount: 8 };
    assert.equal(analysisHash(a), analysisHash({ ...a }));
    assert.notEqual(analysisHash(a), analysisHash({ ...a, crownX: 5600 }));
});

test('fix contract keeps every blocker, dedupes causes, and justifies the next action', async () => {
    const { buildFixContract, recommendNextAction } = await loadCritic();
    const fixes = buildFixContract({
        reports: [],
        flags: [
            { id: 'flat-deck', kind: 'visual-variety', detail: 'visual' },
            { id: 'checkpoint-desert', kind: 'route', detail: 'gap' },
            { id: 'low-hazard-variety', kind: 'gameplay', detail: 'one type' },
        ],
        fidelity: {
            gate: { passed: false, needsHuman: [] },
            elements: [
                { element: 'a', verdict: 'missing', noul: 0.1 },
                { element: 'b', verdict: 'missing', noul: 0.2 },
            ],
            rows: [],
            fidelityFlaw: 'none',
        },
    });
    // Every blocker survives (no truncation), repeated missing-elements merge.
    assert.ok(fixes.length >= 4, `kept ${fixes.length} blockers`);
    assert.equal(fixes.filter((fix) => fix.flaw === 'missing-elements').length, 1);
    assert.match(
        fixes.find((fix) => fix.flaw === 'missing-elements').evidence,
        /"a".*"b"|"b".*"a"/
    );
    const ranks = fixes.map((fix) => fix.rank);
    assert.deepEqual(
        ranks,
        [...ranks].sort((a, b) => a - b)
    );
    const next = recommendNextAction(fixes);
    assert.equal(next.flaw, fixes[0].flaw);
    assert.ok(next.justification.length > 10);
    assert.equal(recommendNextAction([]), null);
});

test('news novelty floor separates clones from genuine departures', async () => {
    const { panelPassed, NEWS_FLOORS } = await loadCritic();
    assert.equal(NEWS_FLOORS.novelty, 1.5);
    const report = (persona, novelty) => ({
        persona,
        fun: 2.2,
        fairness: 1.9,
        readability: 2.3,
        novelty,
        pacing: 2.1,
        theme: 2.3,
        flaw: 'none',
        verdict: 'iterate',
    });
    const personas = ['reviewer', 'veteran', 'casual', 'speedrunner'];
    assert.equal(
        panelPassed(
            personas.map((p) => report(p, 1.6)),
            [],
            true,
            { news: true }
        ),
        true
    );
    assert.equal(
        panelPassed(
            personas.map((p) => report(p, 1.3)),
            [],
            true,
            { news: true }
        ),
        false
    );
});

test('committed reviews keep ranks, priorities, and fix sources consistent', async () => {
    const knownSources = new Set([
        'quality',
        'investigation',
        'mechanical',
        'concept',
        'fidelity',
        'infrastructure',
    ]);
    for (let level = 1; level <= 24; level++) {
        const file = path.join(projectRoot, 'docs/level-reviews', `level-${level}.json`);
        assert.ok(fs.existsSync(file), `level-${level}.json is committed`);
        const { fixes } = JSON.parse(fs.readFileSync(file, 'utf8'));
        assert.ok(Array.isArray(fixes) && fixes.length > 0, `L${level} has a fix contract`);
        fixes.forEach((fix, index) => {
            assert.equal(fix.rank, index + 1, `L${level} ranks run sequentially`);
            assert.ok(
                knownSources.has(fix.source),
                `L${level} rank ${fix.rank} uses a generator source, got ${fix.source}`
            );
            if (index > 0) {
                assert.ok(
                    fix.priority >= fixes[index - 1].priority,
                    `L${level} rank order follows priority order`
                );
            }
        });
    }
});

test('concept gate rejects placeholder artefacts and orphan signatures', async () => {
    const { assessConcept } = await loadCritic();
    const placeholder = assessConcept(
        [
            '# Level 99 — Placeholder',
            '',
            'Element inventory: a, b, c',
            'Signature elements: not-in-inventory',
            'Themed enemy:',
            'Boss theme:',
            '',
            '| Story fact | Gameplay it becomes | Why |',
            '| --- | --- | --- |',
            '| F1 | gravity | w |',
            '| F2 | hazard | w |',
            '| F3 | objective | w |',
            '',
            '## Novelty Ledger',
            '',
            '## Signature Mechanic Canvas',
            '',
            '## Topology Fingerprint',
            '',
        ].join('\n')
    );
    assert.equal(placeholder.passed, false);
    assert.ok(placeholder.missing.includes('novelty-ledger'));
    assert.ok(placeholder.missing.includes('themed-enemy'));
    assert.ok(placeholder.missing.includes('boss-theme-decision'));
    assert.ok(placeholder.missing.includes('signature-not-in-inventory'));
});

test('mechanic refs must name systems the level actually spawns', async () => {
    const { fidelityCodeChecks, unbackedSignatureMechanics } = await loadCritic();
    const brief = {
        elements: ['ticker tape'],
        mappings: [
            { fact: 'Cargo must reach crown', mechanic: 'carry cargo to crown', signature: true },
            { fact: 'Drones patrol', mechanic: 'drone patrols', signature: false },
        ],
    };
    const checks = fidelityCodeChecks(brief, '{"dynamic":[{"type":"drone"}]}');
    assert.deepEqual(checks.unbackedMechanics, ['Cargo must reach crown']);
    assert.deepEqual(unbackedSignatureMechanics(brief, '{"dynamic":[{"type":"drone"}]}'), [
        'Cargo must reach crown',
    ]);
    assert.deepEqual(unbackedSignatureMechanics(brief, ''), []);
});

test('malformed human confirmations are rejected, stale bindings drop', async () => {
    const { confirmationReview } = await loadCritic();
    const malformed = confirmationReview({
        confirmed: ['row:rescue'],
        reviewerType: 'human',
    });
    assert.deepEqual(malformed.confirmed, []);
    assert.equal(malformed.malformed, true);
    const bound = confirmationReview(
        {
            confirmed: [{ key: 'row:rescue', shot: '03-finale.jpg', hash: 'old-hash' }],
            reviewer: 'Ada',
            reviewerType: 'human',
            reasoning: 'opened the finale shot',
        },
        { shotHashes: { '03-finale.jpg': 'new-hash' } }
    );
    assert.deepEqual(bound.confirmed, []);
    assert.deepEqual(bound.stale, ['row:rescue']);
    const fresh = confirmationReview(
        {
            confirmed: [{ key: 'row:rescue', shot: '03-finale.jpg', hash: 'new-hash' }],
            reviewer: 'Ada',
            reviewerType: 'human',
            reasoning: 'opened the finale shot',
        },
        { shotHashes: { '03-finale.jpg': 'new-hash' } }
    );
    assert.deepEqual(fresh.confirmed, ['row:rescue']);
});

test('ship verdict requires completion, boss pass, and loop respect', async () => {
    const { assessShipVerdict } = await loadCritic();
    const base = {
        passed: true,
        telemetry: { outcome: 'crown-collected' },
        bossRequired: false,
        bossPassed: null,
        loop: 1,
    };
    assert.equal(assessShipVerdict(base).ship, true);
    assert.equal(assessShipVerdict({ ...base, telemetry: { outcome: 'timeout' } }).ship, false);
    assert.equal(
        assessShipVerdict({ ...base, telemetry: { outcome: 'timeout' }, humanPlay: true }).ship,
        true
    );
    assert.equal(assessShipVerdict({ ...base, bossRequired: true, bossPassed: false }).ship, false);
    assert.equal(assessShipVerdict({ ...base, bossRequired: true, bossPassed: true }).ship, true);
    assert.equal(assessShipVerdict({ ...base, loop: 4 }).ship, false);
    assert.equal(assessShipVerdict({ ...base, loop: 4, loopReopened: true }).ship, true);
});

test('news brief resolves through the art selection fallback', async () => {
    const { resolveBriefFromSelection } = await loadCritic();
    const os = require('node:os');
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'brief-fallback-'));
    fs.mkdirSync(path.join(root, 'art-selections/99'), { recursive: true });
    fs.mkdirSync(path.join(root, 'art-candidates/story-x'), { recursive: true });
    fs.writeFileSync(
        path.join(root, 'art-candidates/story-x/brief.md'),
        [
            '# Level 99 — Story X',
            '',
            'Element inventory: rising water, sandbag stacks, rescue boats',
            '',
            '| Story fact | Gameplay it becomes | Why |',
            '| --- | --- | --- |',
            '| River rises | drip hazards | clock |',
        ].join('\n')
    );
    fs.writeFileSync(
        path.join(root, 'art-selections/99/selection.json'),
        JSON.stringify({ level_id: 99, brief_path: '../../art-candidates/story-x/brief.md' })
    );
    const resolved = resolveBriefFromSelection(99, root);
    assert.ok(resolved, 'selection fallback finds the selected brief');
    assert.deepEqual(resolved.brief.elements, ['rising water', 'sandbag stacks', 'rescue boats']);
    assert.equal(resolveBriefFromSelection(18, root), null);
});
