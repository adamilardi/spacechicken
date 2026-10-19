const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const projectRoot = path.resolve(__dirname, '..');
const ACTIONS = [
    'start',
    'wait',
    'move_left',
    'move_right',
    'fire',
    'fire_left',
    'fire_right',
    'jump',
    'jump_left',
    'jump_right',
];

function importModule(fileName) {
    return import(pathToFileURL(path.join(projectRoot, fileName)).href);
}

function makeSnap(overrides = {}) {
    return {
        ready: true,
        awaitingStart: false,
        gameOver: false,
        pendingLevel: null,
        dying: false,
        jumpCount: 0,
        maxJumps: 2,
        phaser: false,
        elapsedMs: 0,
        player: { x: 100, y: 700, vx: 0, vy: 0, grounded: true },
        crown: { x: 900, y: 690 },
        platforms: [{ left: -100, right: 1200, top: 706, x: 550, w: 1300 }],
        hazards: [],
        bombs: [],
        columns: [],
        ...overrides,
    };
}

const playing = { phase: 'playing', availableActions: ACTIONS };

test('pilot input maps onto the discrete action set', async () => {
    const { pilotInputToAction } = await importModule('scripts/rl/record-baseline.mjs');
    assert.equal(pilotInputToAction({ shoot: true, right: true }, ACTIONS), 'fire_right');
    assert.equal(pilotInputToAction({ shoot: true, left: true }, ACTIONS), 'fire_left');
    assert.equal(pilotInputToAction({ shoot: true }, ACTIONS), 'fire');
    assert.equal(pilotInputToAction({ jump: true, right: true }, ACTIONS), 'jump_right');
    assert.equal(pilotInputToAction({ jump: true, left: true }, ACTIONS), 'jump_left');
    assert.equal(pilotInputToAction({ jump: true }, ACTIONS), 'jump');
    assert.equal(pilotInputToAction({ right: true }, ACTIONS), 'move_right');
    assert.equal(pilotInputToAction({ left: true }, ACTIONS), 'move_left');
    assert.equal(pilotInputToAction({ start: true, jump: true }, ACTIONS), 'start');
    assert.equal(
        pilotInputToAction(
            { left: false, right: false, jump: false, shoot: false, start: false },
            ACTIONS
        ),
        'wait'
    );
    assert.equal(
        pilotInputToAction({ shoot: true, jump: true, right: true }, ACTIONS),
        'fire_right'
    );
    assert.equal(pilotInputToAction({ shoot: true, jump: true }, ACTIONS), 'jump');
    assert.equal(
        pilotInputToAction({ shoot: true, right: true }, ['wait', 'move_right', 'fire']),
        'fire'
    );
    assert.equal(
        pilotInputToAction({ jump: true, right: true }, ['wait', 'move_right']),
        'move_right'
    );
});

test('JEV is asked only when recovery changes the input or a hold lasts 1.5s', async () => {
    const { shouldAskJev, JEV_HOLD_MS } = await importModule('scripts/rl/record-baseline.mjs');
    assert.equal(shouldAskJev({}), false);
    assert.equal(shouldAskJev({ holding: true, holdMs: JEV_HOLD_MS - 1 }), false);
    assert.equal(shouldAskJev({ holding: true, holdMs: JEV_HOLD_MS }), true);
    assert.equal(shouldAskJev({ recoveryChanged: true }), true);
    assert.equal(shouldAskJev({ recoveryChanged: true, phase: 'complete' }), false);
    assert.equal(shouldAskJev({ holding: true, holdMs: 5000, phase: 'transitioning' }), false);
});

test('a cruise stays with the pilot and a stall recovery asks JEV', async () => {
    const { decideBaseline } = await importModule('scripts/rl/record-baseline.mjs');
    const { createPilotState } = await importModule('scripts/pilot-brain.mjs');
    const state = createPilotState();
    const cruise = decideBaseline(makeSnap(), playing, state, 0);
    assert.equal(cruise.action, 'move_right');
    assert.equal(cruise.source, 'pilot');
    assert.equal(cruise.confidence, 1);
    assert.equal(cruise.ask, false);
    const stalled = decideBaseline(makeSnap(), playing, state, 3600);
    assert.equal(stalled.recoveryChanged, true);
    assert.equal(stalled.ask, true);
    assert.equal(stalled.action, 'jump_left');
    const done = decideBaseline(makeSnap({ gameOver: true }), null, createPilotState(), 5000);
    assert.equal(done.ask, false);
    assert.equal(done.action, 'wait');
});

test('a nearby live hazard counts, a far or inactive one does not', async () => {
    const { threatNear } = await importModule('scripts/rl/record-baseline.mjs');
    const close = makeSnap({ hazards: [{ x: 180, y: 700, active: true }] });
    const far = makeSnap({ hazards: [{ x: 400, y: 700, active: true }] });
    const inactive = makeSnap({ hazards: [{ x: 120, y: 700, active: false }] });
    const bomb = makeSnap({ bombs: [{ x: 140, y: 760, active: true }] });
    assert.equal(threatNear(close, 150), true);
    assert.equal(threatNear(far, 150), false);
    assert.equal(threatNear(inactive, 150), false);
    assert.equal(threatNear(bomb, 150), true);
});

test('a cached JEV action is reused only while the pilot still wants help', async () => {
    const { takeCachedJev, JEV_CACHE_MS } = await importModule('scripts/rl/record-baseline.mjs');
    const cache = { action: 'jump_right', at: null, confidence: 0.8, source: 'jev', model: 'jev' };
    assert.equal(takeCachedJev(cache, 1000, ACTIONS, false), null);
    const used = takeCachedJev(cache, 1000, ACTIONS, true);
    assert.equal(used.action, 'jump_right');
    assert.equal(used.confidence, 0.8);
    assert.equal(cache.at, 1000);
    assert.equal(takeCachedJev(cache, 1000 + JEV_CACHE_MS - 1, ACTIONS, true).action, 'jump_right');
    assert.equal(takeCachedJev(cache, 1000 + JEV_CACHE_MS, ACTIONS, true), null);
    assert.equal(takeCachedJev({ action: 'fire' }, 0, ['wait', 'move_right'], true), null);
});
