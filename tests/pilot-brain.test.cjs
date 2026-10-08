const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');

const projectRoot = path.resolve(__dirname, '..');

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
        player: { x: 100, y: 700, vx: 0, vy: 0, grounded: true },
        crown: { x: 900, y: 690 },
        platforms: [{ left: -100, right: 1200, top: 706, x: 550, w: 1300 }],
        hazards: [],
        bombs: [],
        columns: [],
        ...overrides,
    };
}

function tech(x, y = 702) {
    return { x, y, w: 30, h: 56, top: y - 28, active: true, enable: true, bonkable: true };
}

test('the pilot starts the game from the title state', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const input = decidePilotInput(makeSnap({ awaitingStart: true }), createPilotState());
    assert.equal(input.start, true);
    assert.equal(input.jump, true);
});

test('the pilot holds still through terminal states', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    for (const snap of [
        makeSnap({ gameOver: true }),
        makeSnap({ pendingLevel: 2 }),
        makeSnap({ dying: true }),
        makeSnap({ ready: false }),
        null,
    ]) {
        assert.deepEqual(decidePilotInput(snap, createPilotState()), {
            left: false,
            right: false,
            jump: false,
            shoot: false,
            start: false,
        });
    }
});

test('the pilot runs toward the crown on flat ground', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const input = decidePilotInput(makeSnap(), createPilotState());
    assert.equal(input.right, true);
    assert.equal(input.left, false);
    assert.equal(input.jump, false);
});

test('the pilot jumps at a gap', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const snap = makeSnap({
        platforms: [{ left: -100, right: 120, top: 706, x: 10, w: 220 }],
    });
    const input = decidePilotInput(snap, createPilotState());
    assert.equal(input.jump, true);
});

test('the pilot backs off a tall blocker to open the runway', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Jumping from inside rises straight into the head; back off first.
    const snap = makeSnap({ hazards: [tech(150)] });
    const input = decidePilotInput(snap, createPilotState());
    assert.equal(input.left, true);
    assert.equal(input.right, false);
    assert.equal(input.jump, false);
});

test('the pilot leaps over a low bonkable with no height purpose', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const low = tech(150);
    low.y = 740;
    low.top = 712;
    const snap = makeSnap({ hazards: [low] });
    const input = decidePilotInput(snap, createPilotState());
    assert.equal(input.right, true);
    assert.equal(input.jump, true);
});

test('the pilot takes off down the runway toward its spring', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const snap = makeSnap({
        player: { x: 300, y: 700, vx: 0, vy: 0, grounded: true },
        crown: { x: 900, y: 130 },
        platforms: [
            { left: 200, right: 400, top: 706, x: 300, w: 200 },
            { left: 240, right: 540, top: 310, x: 390, w: 300 },
        ],
        hazards: [tech(450)],
    });
    const input = decidePilotInput(snap, createPilotState());
    assert.equal(input.right, true);
    assert.equal(input.jump, true);
});

test('the pilot holds when crowded with no backing room', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const snap = makeSnap({
        player: { x: 300, y: 700, vx: 0, vy: 0, grounded: true },
        crown: { x: 900, y: 130 },
        platforms: [
            { left: 280, right: 420, top: 706, x: 350, w: 140 },
            { left: 240, right: 540, top: 310, x: 390, w: 300 },
        ],
        hazards: [tech(308)],
    });
    assert.deepEqual(decidePilotInput(snap, createPilotState()), {
        left: false,
        right: false,
        jump: false,
        shoot: false,
        start: false,
    });
});

test('the pilot centers over the head while falling onto it', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const snap = makeSnap({
        player: { x: 340, y: 600, vx: 0, vy: 100, grounded: false },
        crown: { x: 900, y: 130 },
        platforms: [
            { left: 200, right: 500, top: 706, x: 350, w: 300 },
            { left: 240, right: 540, top: 310, x: 390, w: 300 },
        ],
        hazards: [tech(350)],
    });
    const input = decidePilotInput(snap, createPilotState());
    // Already centered: hold the drop, save the air jump.
    assert.equal(input.left, false);
    assert.equal(input.right, false);
    assert.equal(input.jump, false);
});

test('the pilot holds off while rising toward a head above the boots', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const head = tech(440);
    head.y = 653;
    head.top = 625;
    const snap = makeSnap({
        player: { x: 360, y: 640, vx: 0, vy: -200, grounded: false },
        crown: { x: 900, y: 130 },
        platforms: [
            { left: 200, right: 600, top: 706, x: 400, w: 400 },
            { left: 240, right: 540, top: 310, x: 390, w: 300 },
        ],
        hazards: [head],
    });
    assert.deepEqual(decidePilotInput(snap, createPilotState()), {
        left: false,
        right: false,
        jump: false,
        shoot: false,
        start: false,
    });
});

test('the pilot veers off when airborne below head level', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const snap = makeSnap({
        player: { x: 340, y: 760, vx: 0, vy: 100, grounded: false },
        crown: { x: 900, y: 130 },
        platforms: [
            { left: 200, right: 600, top: 806, x: 400, w: 400 },
            { left: 240, right: 540, top: 310, x: 390, w: 300 },
        ],
        hazards: [tech(420, 752)],
    });
    const input = decidePilotInput(snap, createPilotState());
    assert.equal(input.left, true);
    assert.equal(input.right, false);
    assert.equal(input.jump, false);
});

test('the pilot takes off with a runway toward a canyon spring', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const snap = makeSnap({
        player: { x: 340, y: 582, vx: 0, vy: 0, grounded: true },
        crown: { x: 3000, y: 168 },
        platforms: [{ left: 27, right: 373, top: 604, x: 200, w: 346 }],
        hazards: [tech(500, 657)],
    });
    const input = decidePilotInput(snap, createPilotState());
    assert.equal(input.right, true);
    assert.equal(input.jump, true);
});

test('bonk-seeking overrides the high-landing hold', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Pinned at the support center with a much higher landing ahead: with
    // no spring the pilot holds, but a usable bonkable routes up — here by
    // backing off to open the takeoff runway.
    const snap = makeSnap({
        player: { x: 250, y: 708, vx: 0, vy: 0, grounded: true },
        crown: { x: 2580, y: 130 },
        platforms: [
            { left: 20, right: 480, top: 730, x: 250, w: 460 },
            { left: 265, right: 515, top: 308, x: 390, w: 250 },
        ],
        hazards: [tech(340)],
    });
    const input = decidePilotInput(snap, createPilotState());
    assert.equal(input.left, true);
    assert.equal(input.right, false);
    assert.equal(input.jump, false);
});

test('the pilot burns its air jump to line up a canyon drop', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const snap = makeSnap({
        player: { x: 560, y: 600, vx: 0, vy: 120, grounded: false },
        crown: { x: 3000, y: 168 },
        platforms: [],
        hazards: [tech(640, 657)],
    });
    const state = createPilotState();
    const input = decidePilotInput(snap, state);
    assert.equal(input.right, true);
    assert.equal(input.left, false);
    assert.equal(input.jump, true);
    // One air jump per airtime: the re-line is spent.
    const again = decidePilotInput(snap, state);
    assert.equal(again.jump, false);
});

test('the pilot hops a pothole instead of detouring to a grounded beetle', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const beetle = tech(60);
    beetle.enable = true;
    const snap = makeSnap({
        player: { x: 100, y: 700, vx: 0, vy: 0, grounded: true },
        crown: { x: 900, y: 690 },
        platforms: [{ left: -100, right: 120, top: 706, x: 10, w: 220 }],
        hazards: [beetle],
    });
    const input = decidePilotInput(snap, createPilotState());
    assert.equal(input.jump, true);
});

test('the pilot steers a bonk bounce for the high landing, not the crown', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const base = {
        player: { x: 393, y: 500, vx: 0, vy: -450, grounded: false },
        crown: { x: 900, y: 130 },
        // Narrow rail just ahead: the landing edge registers while its
        // center sits inside the steering deadband.
        platforms: [{ left: 401, right: 403, top: 400, x: 402, w: 2 }],
    };
    const riding = decidePilotInput(makeSnap(base), createPilotState());
    assert.equal(riding.left, false);
    assert.equal(riding.right, false);
    assert.equal(riding.jump, false);
    // Same frame at normal fall speed steers crown-ward instead.
    const normal = decidePilotInput(
        makeSnap({ ...base, player: { ...base.player, vy: 100 } }),
        createPilotState()
    );
    assert.equal(normal.right, true);
});

test('the pilot ignores bonkables it cannot reach or use', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const snap = makeSnap({
        player: { x: 300, y: 700, vx: 0, vy: 0, grounded: true },
        crown: { x: 900, y: 690 },
        platforms: [{ left: 200, right: 1200, top: 706, x: 700, w: 1000 }],
        // Behind the pilot and far below boot level: no seek, plain run.
        hazards: [{ x: 100, y: 702, w: 30, h: 56, top: 674, active: true, bonkable: true }],
    });
    const input = decidePilotInput(snap, createPilotState());
    assert.equal(input.right, true);
    assert.equal(input.jump, false);
});

test('stuck recovery hops away after a stall unless suppressed', async () => {
    const { applyStuckRecovery, createPilotState } = await importModule('scripts/pilot-brain.mjs');
    const snap = makeSnap();
    const state = createPilotState();
    const idle = { left: false, right: false, jump: false, shoot: false, start: false };
    applyStuckRecovery(snap, { ...idle }, state, false, 1000);
    applyStuckRecovery(snap, { ...idle }, state, false, 2000);
    const recovering = { ...idle };
    applyStuckRecovery(snap, recovering, state, false, 3600);
    assert.equal(recovering.left, true);
    assert.equal(recovering.jump, true);
    const held = { ...idle };
    applyStuckRecovery(snap, held, state, true, 3700);
    assert.deepEqual(held, idle);
    // No footing in the escape direction: hold instead of hopping off.
    const edge = makeSnap({
        player: { x: 100, y: 700, vx: 0, vy: 0, grounded: true },
        platforms: [{ left: 80, right: 1200, top: 706, x: 640, w: 1120 }],
    });
    const edgeState = createPilotState();
    applyStuckRecovery(edge, { ...idle }, edgeState, false, 1000);
    const edgeHeld = { ...idle };
    applyStuckRecovery(edge, edgeHeld, edgeState, false, 3600);
    assert.deepEqual(edgeHeld, idle);
    // Terminal states and the default clock never throw.
    applyStuckRecovery(makeSnap({ gameOver: true }), { ...idle }, createPilotState(), false, 5000);
    applyStuckRecovery(snap, { ...idle }, createPilotState(), false);
});

test('buildPilotSource ships a self-contained installer', async () => {
    const { buildPilotSource } = await importModule('scripts/pilot-brain.mjs');
    const source = buildPilotSource();
    assert.match(source, /decidePilotInput/);
    assert.match(source, /pendingLevel/);
    assert.match(source, /pilotMain/);
    assert.doesNotMatch(source, /require\(/);
    assert.doesNotMatch(source, /\bimport\b/);
    assert.doesNotMatch(source, /process\./);
    assert.doesNotMatch(source, /__dirname/);
});

test('the stitched pilot installs and ticks in a bare page sandbox', async () => {
    const { buildPilotSource } = await importModule('scripts/pilot-brain.mjs');
    const callbacks = [];
    const sandbox = {
        window: {},
        location: { search: '?level=5' },
        URLSearchParams,
        requestAnimationFrame: (callback) => {
            callbacks.push(callback);
            return callbacks.length;
        },
        cancelAnimationFrame: () => {},
    };
    vm.createContext(sandbox);
    assert.equal(vm.runInContext(buildPilotSource(), sandbox), true);
    assert.equal(sandbox.window.__spaceChickenPilotInstalled, true);
    assert.equal(vm.runInContext(buildPilotSource(), sandbox), true);
    assert.equal(callbacks.length, 1);
    // Ticks with no debug hook and with an unready snapshot never throw.
    callbacks[0]();
    sandbox.window.__spaceChickenDebug = { getBotSnapshot: () => ({ ready: false }) };
    callbacks[0]();
    // A pending level with a locked ?level= resolves to a win and holds still.
    let lastInput = null;
    sandbox.window.__spaceChickenDebug = {
        getBotSnapshot: () => ({ ready: true, pendingLevel: 2 }),
        setBotInput: (input) => {
            lastInput = input;
        },
    };
    callbacks[0]();
    assert.equal(sandbox.window.__spaceChickenPilotOutcome, 'win');
    // The input crosses the vm realm boundary; compare structurally.
    assert.deepEqual(JSON.parse(JSON.stringify(lastInput)), {
        left: false,
        right: false,
        jump: false,
        shoot: false,
        start: false,
    });
});
