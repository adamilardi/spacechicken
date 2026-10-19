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

test('a shielded pilot hunts the pad guard instead of camping the pad', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Off-lane guard near the crown: the pilot steps back to engage it.
    const guard = {
        id: 'boarder-1',
        type: 'boarder',
        x: 700,
        y: 400,
        w: 40,
        h: 40,
        top: 380,
        active: true,
        enable: true,
    };
    const padSnap = {
        player: { x: 800, y: 700, vx: 0, vy: 0, grounded: true },
        phaser: true,
        crown: { x: 900, y: 690, shielded: true },
        hazards: [guard],
    };
    const hunt = decidePilotInput(makeSnap(padSnap), createPilotState());
    assert.equal(hunt.left, true);
    assert.equal(hunt.right, false);
    // An in-lane target still wins over the hunt: hold the gun on it.
    const lane = decidePilotInput(
        makeSnap({
            phaser: true,
            crown: { x: 900, y: 690, shielded: true },
            hazards: [{ ...guard, x: 400, y: 700 }],
        }),
        createPilotState()
    );
    assert.equal(lane.shoot, true);
    // Unshielded pilots ignore boarders behind and run for the crown.
    const crown = decidePilotInput(
        makeSnap({ phaser: true, hazards: [guard] }),
        createPilotState()
    );
    assert.equal(crown.right, true);
    assert.equal(crown.left, false);
    // Stragglers far from the pad are not the guard: shielded pilots run
    // past them crownward instead of U-turning into cleared packs.
    const straggler = decidePilotInput(
        makeSnap({
            player: { x: 800, y: 700, vx: 0, vy: 0, grounded: true },
            phaser: true,
            crown: { x: 900, y: 690, shielded: true },
            hazards: [{ ...guard, x: -200, y: 700 }],
        }),
        createPilotState()
    );
    assert.equal(straggler.right, true);
    assert.equal(straggler.left, false);
    // Far from the pad, shielded pilots still push to release the next
    // wave instead of dragging backward into cleared zones.
    const push = decidePilotInput(
        makeSnap({
            phaser: true,
            crown: { x: 5000, y: 690, shielded: true },
            hazards: [guard],
        }),
        createPilotState()
    );
    assert.equal(push.right, true);
    assert.equal(push.left, false);
    // Hunts commit by target id: once engaged, the pilot stays on the
    // guard past the zone boundary instead of flip-flopping.
    const committed = createPilotState();
    decidePilotInput(makeSnap(padSnap), committed);
    assert.equal(committed.huntId, 'boarder-1');
    const chase = decidePilotInput(
        makeSnap({
            player: { x: -800, y: 700, vx: 0, vy: 0, grounded: true },
            phaser: true,
            crown: { x: 900, y: 690, shielded: true },
            hazards: [guard],
        }),
        committed
    );
    assert.equal(chase.right, true);
    assert.equal(committed.huntId, 'boarder-1');
    // A target that leaves the pad area releases the commitment.
    const released = decidePilotInput(
        makeSnap({
            player: { x: -800, y: 700, vx: 0, vy: 0, grounded: true },
            phaser: true,
            crown: { x: 900, y: 690, shielded: true },
            hazards: [{ ...guard, x: -1100 }],
        }),
        committed
    );
    assert.equal(released.right, true);
    assert.equal(committed.huntId, null);
    // A dead target releases the commitment too.
    const deadCommitted = createPilotState();
    decidePilotInput(makeSnap(padSnap), deadCommitted);
    const dead = decidePilotInput(
        makeSnap({ ...padSnap, hazards: [{ ...guard, active: false }] }),
        deadCommitted
    );
    assert.equal(dead.right, true);
    assert.equal(deadCommitted.huntId, null);
});

test('hunting never burns jumps grabbing at a nearby guard', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const guard = {
        id: 'boarder-9',
        type: 'boarder',
        x: 1700,
        y: 400,
        w: 40,
        h: 40,
        top: 380,
        active: true,
        enable: true,
    };
    const base = {
        phaser: true,
        crown: { x: 1800, y: 690, shielded: true },
        hazards: [guard],
        platforms: [{ left: 1000, right: 2200, top: 762, x: 1600, w: 1200 }],
    };
    // Airborne beside the guard but 200px short of the crown: the double
    // jump stays holstered (a hunt-relative trigger would burn it).
    const air = decidePilotInput(
        makeSnap({
            ...base,
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 1600, y: 750, vx: 120, vy: 120, grounded: false },
        }),
        createPilotState()
    );
    assert.equal(air.jump, false);
    // Same on the ground: no close-push hop for a nearby guard.
    const ground = decidePilotInput(
        makeSnap({
            ...base,
            player: { x: 1600, y: 756, vx: 0, vy: 0, grounded: true },
        }),
        createPilotState()
    );
    assert.equal(ground.jump, false);
});

test('the pilot strafes instead of hopping under a hanging sentry', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Off the duel band (dy 35) but inside the firing lane: the reflex
    // still strafes the hop column instead of holding fire.
    const chaser = {
        type: 'boarder',
        x: 180,
        y: 735,
        w: 40,
        h: 40,
        top: 715,
        active: true,
        enable: true,
    };
    const sentry = {
        type: 'bonk',
        x: 110,
        y: 580,
        w: 30,
        h: 30,
        top: 565,
        active: true,
        enable: true,
        bonkable: true,
    };
    const dodge = decidePilotInput(
        makeSnap({ phaser: true, hazards: [chaser, sentry] }),
        createPilotState()
    );
    assert.equal(dodge.jump, false);
    assert.equal(dodge.left, true);
    assert.equal(dodge.shoot, true);
    // Without the sentry the same frame hops straight up.
    const hop = decidePilotInput(makeSnap({ phaser: true, hazards: [chaser] }), createPilotState());
    assert.equal(hop.jump, true);
    // Off-lane (dy 50, no contact possible): run past, never hop — the
    // hop starts a fuel-burning flight while chasers shadow it.
    const offLane = { ...chaser, y: 750, top: 730 };
    const run = decidePilotInput(
        makeSnap({ phaser: true, hazards: [offLane] }),
        createPilotState()
    );
    assert.equal(run.jump, false);
    assert.equal(run.right, true);
});

test('the falling pilot spends its air jump over a gap', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const input = decidePilotInput(
        makeSnap({
            player: {
                x: 1300,
                y: 500,
                vx: 0,
                vy: 120,
                grounded: false,
                jumpsRemaining: 1,
                maxJumps: 2,
            },
        }),
        createPilotState()
    );
    assert.equal(input.jump, true);
    // No fuel, no jump: the pilot holds direction and braces.
    const spent = decidePilotInput(
        makeSnap({
            jumpCount: 2,
            maxJumps: 2,
            player: {
                x: 1300,
                y: 500,
                vx: 0,
                vy: 120,
                grounded: false,
                jumpsRemaining: 0,
                maxJumps: 2,
            },
        }),
        createPilotState()
    );
    assert.equal(spent.jump, false);
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
    // Pulse gap: pilotMain latches the output, so the held jump
    // releases for one tick, then the re-line fires again on fuel.
    state.lastJump = true;
    const again = decidePilotInput(snap, state);
    assert.equal(again.jump, false);
    state.lastJump = false;
    assert.equal(decidePilotInput(snap, state).jump, true);
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

test('airborne jumps pulse so the second air jump edge-fires', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const snap = () =>
        makeSnap({
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 100, y: 700, vx: 120, vy: 120, grounded: false },
            crown: { x: 1000, y: 690 },
            platforms: [],
        });
    const state = createPilotState();
    // First airborne tick fires with fuel left.
    const first = decidePilotInput(snap(), state);
    assert.equal(first.jump, true);
    // pilotMain latches the output; a held jump must release for one tick
    // so the next press edge-fires in the game.
    state.lastJump = Boolean(first.jump);
    const second = decidePilotInput(snap(), state);
    assert.equal(second.jump, false);
    state.lastJump = Boolean(second.jump);
    assert.equal(decidePilotInput(snap(), state).jump, true);
});

test('the pilot holds its air jump until the fall commits', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const snap = (y, vy) =>
        makeSnap({
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 100, y, vx: 120, vy, grounded: false },
            crown: { x: 1000, y: 690 },
            platforms: [],
        });
    // Fresh state (never grounded): old behavior, fire with fuel.
    assert.equal(decidePilotInput(snap(700, 120), createPilotState()).jump, true);
    // Above takeoff: hold, even while falling with fuel.
    const state = createPilotState();
    state.takeoffY = 700;
    assert.equal(decidePilotInput(snap(600, 120), state).jump, false);
    // Below takeoff: the fall is committed, spend the jump.
    assert.equal(decidePilotInput(snap(760, 120), state).jump, true);
    // Plummeting with height to spare: fire regardless of takeoff.
    assert.equal(decidePilotInput(snap(600, 400), state).jump, true);
    // Low over the kill plane: no room to wait, fire at once even above
    // takeoff (ground-level walk-offs must jump now, not at takeoff+40).
    const low = createPilotState();
    low.takeoffY = 588;
    const lowSnap = makeSnap({
        jumpCount: 0,
        maxJumps: 2,
        killZoneY: 640,
        player: { x: 4270, y: 590, vx: 160, vy: 30, grounded: false },
        crown: { x: 1000, y: 690 },
        platforms: [],
    });
    assert.equal(decidePilotInput(lowSnap, low).jump, true);
    // Grounded ticks record takeoff height for the next airtime.
    const ground = createPilotState();
    decidePilotInput(
        makeSnap({ player: { x: 100, y: 700, vx: 0, vy: 0, grounded: true } }),
        ground
    );
    assert.equal(ground.takeoffY, 700);
});

test('the pilot holds duels instead of running past live boarders', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const boarder = (x, y) => ({
        id: `boarder-${x}`,
        type: 'boarder',
        x,
        y,
        w: 22,
        h: 36,
        top: y - 18,
        active: true,
        enable: true,
    });
    // In-lane duel inside 450px: hold and gun it down.
    const hold = decidePilotInput(
        makeSnap({
            phaser: true,
            player: { x: 100, y: 628, vx: 0, vy: 0, grounded: true },
            crown: { x: 5000, y: 690 },
            platforms: [{ left: -100, right: 1200, top: 634, x: 550, w: 1300 }],
            hazards: [boarder(400, 628)],
        }),
        createPilotState()
    );
    assert.equal(hold.shoot, true);
    assert.equal(hold.left, false);
    assert.equal(hold.right, false);
    assert.equal(hold.jump, false);
    // Beyond 450px: keep advancing while softening it up.
    const far = decidePilotInput(
        makeSnap({
            phaser: true,
            player: { x: 100, y: 628, vx: 0, vy: 0, grounded: true },
            crown: { x: 5000, y: 690 },
            platforms: [{ left: -100, right: 1200, top: 634, x: 550, w: 1300 }],
            hazards: [boarder(600, 628)],
        }),
        createPilotState()
    );
    assert.equal(far.right, true);
    // Off-deck (bolts would miss flat): no hold, keep moving.
    const deck = decidePilotInput(
        makeSnap({
            phaser: true,
            player: { x: 100, y: 628, vx: 0, vy: 0, grounded: true },
            crown: { x: 5000, y: 690 },
            platforms: [{ left: -100, right: 1200, top: 634, x: 550, w: 1300 }],
            hazards: [boarder(400, 678)],
        }),
        createPilotState()
    );
    assert.equal(deck.right, true);
    // Point blank with a duel: hold fire, never hop over it (the hop
    // lets it pass behind into a rear chase).
    const blank = decidePilotInput(
        makeSnap({
            phaser: true,
            player: { x: 100, y: 628, vx: 0, vy: 0, grounded: true },
            crown: { x: 5000, y: 690 },
            platforms: [{ left: -100, right: 1200, top: 634, x: 550, w: 1300 }],
            hazards: [boarder(180, 628)],
        }),
        createPilotState()
    );
    assert.equal(blank.shoot, true);
    assert.equal(blank.jump, false);
    assert.equal(blank.left, false);
    assert.equal(blank.right, false);
    // Dropping into the lane: hold and pre-fire, it lands in the bolts.
    const drop = decidePilotInput(
        makeSnap({
            phaser: true,
            player: { x: 100, y: 628, vx: 0, vy: 0, grounded: true },
            crown: { x: 5000, y: 690 },
            platforms: [{ left: -100, right: 1200, top: 634, x: 550, w: 1300 }],
            hazards: [{ ...boarder(400, 500), vy: 220 }],
        }),
        createPilotState()
    );
    assert.equal(drop.shoot, true);
    assert.equal(drop.left, false);
    assert.equal(drop.right, false);
    // Parked body after a reset: hold, it arms on a timer.
    const parked = decidePilotInput(
        makeSnap({
            phaser: true,
            player: { x: 100, y: 628, vx: 0, vy: 0, grounded: true },
            crown: { x: 5000, y: 690 },
            platforms: [{ left: -100, right: 1200, top: 634, x: 550, w: 1300 }],
            hazards: [{ ...boarder(400, 628), enable: false }],
        }),
        createPilotState()
    );
    assert.equal(parked.shoot, true);
    assert.equal(parked.right, false);
    // Unreleased wave ahead: advance, holding would stall the trigger.
    const waiting = decidePilotInput(
        makeSnap({
            phaser: true,
            player: { x: 100, y: 628, vx: 0, vy: 0, grounded: true },
            crown: { x: 5000, y: 690 },
            platforms: [{ left: -100, right: 1200, top: 634, x: 550, w: 1300 }],
            hazards: [{ ...boarder(400, 628), active: false }],
        }),
        createPilotState()
    );
    assert.equal(waiting.right, true);
});

test('the pilot hops over lethal hazards instead of landing on them', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Descending onto a live boarder with fuel: hop over on course.
    const hop = decidePilotInput(
        makeSnap({
            phaser: true,
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 900, y: 500, vx: 120, vy: 200, grounded: false },
            crown: { x: 5000, y: 690 },
            platforms: [],
            hazards: [
                {
                    id: 'boarder-1',
                    type: 'boarder',
                    x: 920,
                    y: 596,
                    w: 22,
                    h: 36,
                    top: 578,
                    active: true,
                    enable: true,
                },
            ],
        }),
        createPilotState()
    );
    assert.equal(hop.jump, true);
    assert.equal(hop.right, true);
    // No fuel: steer off its column.
    const dodge = decidePilotInput(
        makeSnap({
            phaser: true,
            jumpCount: 2,
            maxJumps: 2,
            player: { x: 900, y: 500, vx: 120, vy: 200, grounded: false },
            crown: { x: 5000, y: 690 },
            platforms: [],
            hazards: [
                {
                    id: 'boarder-1',
                    type: 'boarder',
                    x: 920,
                    y: 596,
                    w: 22,
                    h: 36,
                    top: 578,
                    active: true,
                    enable: true,
                },
            ],
        }),
        createPilotState()
    );
    assert.equal(dodge.jump, false);
    assert.equal(dodge.left, true);
    assert.equal(dodge.right, false);
    // Airborne over a rock in the jump path: drift and hop, not splat.
    const rock = decidePilotInput(
        makeSnap({
            jumpCount: 0,
            maxJumps: 2,
            player: { x: 530, y: 560, vx: 160, vy: 150, grounded: false },
            crown: { x: 5000, y: 690 },
            platforms: [],
            hazards: [
                {
                    id: 'rock-1',
                    type: 'rock',
                    x: 590,
                    y: 568,
                    w: 32,
                    h: 32,
                    top: 552,
                    active: true,
                    enable: true,
                },
            ],
        }),
        createPilotState()
    );
    assert.equal(rock.jump, true);
    assert.equal(rock.right, true);
});

test('the pilot descends onto a deck below instead of overshooting it', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const deck = { left: 1600, right: 2100, top: 581, x: 1850, w: 500 };
    // Deck within one jump's rise below: hold the double and land.
    const land = decidePilotInput(
        makeSnap({
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 1800, y: 448, vx: 160, vy: 200, grounded: false },
            crown: { x: 5000, y: 690 },
            platforms: [deck],
        }),
        createPilotState()
    );
    assert.equal(land.jump, false);
    // Deck out of reach below: the recovery jump still fires.
    const far = decidePilotInput(
        makeSnap({
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 1800, y: 300, vx: 160, vy: 200, grounded: false },
            crown: { x: 5000, y: 690 },
            platforms: [deck],
        }),
        createPilotState()
    );
    assert.equal(far.jump, true);
});

test('the pilot crosses timed beams only with a safe window', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const beam = (overrides = {}) => ({
        id: 'laser-1',
        type: 'laser',
        x: 700,
        y: 620,
        w: 200,
        h: 10,
        left: 600,
        right: 800,
        top: 615,
        active: true,
        enable: true,
        phase: 'active',
        timeUntilPhaseChangeMs: 500,
        orientation: 'horizontal',
        ...overrides,
    });
    const physics = { gravityY: 400 };
    const base = {
        physics,
        player: { x: 500, y: 628, vx: 0, vy: 0, grounded: true },
        crown: { x: 5000, y: 690 },
        platforms: [{ left: -100, right: 1200, top: 634, x: 550, w: 1300 }],
    };
    const wide = { w: 400, left: 500, right: 900 };
    // Leapable span, cooling: jump clean over it.
    const leap = decidePilotInput(
        makeSnap({
            ...base,
            physics: { gravityY: 260 },
            hazards: [
                beam({
                    phase: 'cooldown',
                    active: false,
                    enable: false,
                    timeUntilPhaseChangeMs: 500,
                }),
            ],
        }),
        createPilotState()
    );
    assert.equal(leap.right, true);
    assert.equal(leap.jump, true);
    // Leapable span, active: wait outside for the cold takeoff.
    const cold = decidePilotInput(
        makeSnap({
            ...base,
            physics: { gravityY: 260 },
            hazards: [beam()],
        }),
        createPilotState()
    );
    assert.equal(cold.right, false);
    assert.equal(cold.jump, false);
    // Leapable span, active, caught inside: leap out anyway.
    const out = decidePilotInput(
        makeSnap({
            ...base,
            physics: { gravityY: 260 },
            player: { x: 700, y: 628, vx: 0, vy: 0, grounded: true },
            hazards: [beam()],
        }),
        createPilotState()
    );
    assert.equal(out.right, true);
    assert.equal(out.jump, true);
    // Span too wide to leap: hold outside it while active.
    const wideBase = {
        ...base,
        player: { x: 400, y: 628, vx: 0, vy: 0, grounded: true },
    };
    const hold = decidePilotInput(
        makeSnap({ ...wideBase, hazards: [beam(wide)] }),
        createPilotState()
    );
    assert.equal(hold.left, false);
    assert.equal(hold.right, false);
    assert.equal(hold.jump, false);
    // Too wide with a short window: hold, the span outlasts it.
    const short = decidePilotInput(
        makeSnap({
            ...wideBase,
            hazards: [
                beam({
                    ...wide,
                    phase: 'cooldown',
                    active: false,
                    enable: false,
                    timeUntilPhaseChangeMs: 800,
                }),
            ],
        }),
        createPilotState()
    );
    assert.equal(short.right, false);
    // Too wide with margin: walk through, no leap needed.
    const cross = decidePilotInput(
        makeSnap({
            ...wideBase,
            hazards: [
                beam({
                    ...wide,
                    phase: 'cooldown',
                    active: false,
                    enable: false,
                    timeUntilPhaseChangeMs: 5000,
                }),
            ],
        }),
        createPilotState()
    );
    assert.equal(cross.right, true);
    assert.equal(cross.jump, false);
    // Caught inside a closing span too wide to leap: rush the edge.
    const rush = decidePilotInput(
        makeSnap({
            ...wideBase,
            player: { x: 700, y: 628, vx: 0, vy: 0, grounded: true },
            hazards: [
                beam({
                    ...wide,
                    phase: 'cooldown',
                    active: false,
                    enable: false,
                    timeUntilPhaseChangeMs: 300,
                }),
            ],
        }),
        createPilotState()
    );
    assert.equal(rush.right, true);
    assert.equal(rush.left, false);
    // Beam above the path: ignored.
    const above = decidePilotInput(
        makeSnap({ ...base, hazards: [beam({ y: 400, top: 395 })] }),
        createPilotState()
    );
    assert.equal(above.right, true);
    // Airborne over an active span too wide to clear: rush the edge.
    const airRush = decidePilotInput(
        makeSnap({
            ...base,
            player: { x: 700, y: 500, vx: 120, vy: 150, grounded: false },
            hazards: [beam(wide)],
        }),
        createPilotState()
    );
    assert.equal(airRush.right, true);
    assert.equal(airRush.left, false);
    // Airborne short of an unleapable active span: veer to land outside.
    const airVeer = decidePilotInput(
        makeSnap({
            ...base,
            player: { x: 300, y: 500, vx: 120, vy: 150, grounded: false },
            hazards: [beam(wide)],
        }),
        createPilotState()
    );
    assert.equal(airVeer.left, true);
    assert.equal(airVeer.right, false);
    // Airborne over a leapable span: hold the arc, never veer back.
    const airArc = decidePilotInput(
        makeSnap({
            ...base,
            physics: { gravityY: 260 },
            player: { x: 700, y: 500, vx: 120, vy: 150, grounded: false },
            hazards: [beam()],
        }),
        createPilotState()
    );
    assert.equal(airArc.right, true);
    assert.equal(airArc.left, false);
    // Falling toward a deck inside a live span: extend the flight
    // instead of touching down in the beam.
    const extend = decidePilotInput(
        makeSnap({
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 700, y: 500, vx: 120, vy: 200, grounded: false },
            crown: { x: 5000, y: 690 },
            platforms: [{ left: 640, right: 760, top: 640, x: 700, w: 120 }],
            hazards: [beam()],
        }),
        createPilotState()
    );
    assert.equal(extend.jump, true);
    assert.equal(extend.right, true);
});

test('the pilot ignores overhead bonkables when crossing a pit', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Sentry head 146px above the boots: engaging it would veer away
    // and kill the crossing momentum. Fly on instead.
    const cross = decidePilotInput(
        makeSnap({
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 1190, y: 525, vx: 160, vy: 125, grounded: false },
            crown: { x: 5000, y: 690 },
            platforms: [
                { left: 858, right: 1242, top: 594, x: 1050, w: 384 },
                { left: 1458, right: 1842, top: 564, x: 1650, w: 384 },
            ],
            hazards: [
                {
                    id: 'sentry-1',
                    type: 'sentry',
                    x: 1250,
                    y: 416,
                    w: 30,
                    h: 30,
                    top: 401,
                    active: true,
                    enable: true,
                    bonkable: true,
                },
            ],
        }),
        createPilotState()
    );
    assert.equal(cross.right, true);
    assert.equal(cross.left, false);
});

test('the pilot enters crusher lanes only on the rise', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const piston = (overrides = {}) => ({
        id: 'crusher-1',
        type: 'crusher',
        x: 700,
        y: 360,
        w: 64,
        h: 22,
        left: 668,
        right: 732,
        top: 349,
        active: true,
        enable: true,
        origin: { x: 700, y: 360 },
        target: { x: 700, y: 490 },
        ...overrides,
    });
    const base = {
        player: { x: 520, y: 492, vx: 0, vy: 0, grounded: true },
        crown: { x: 5000, y: 690 },
        platforms: [{ left: -100, right: 1200, top: 498, x: 550, w: 1300 }],
    };
    // Descending piston: hold outside the lane.
    const holdState = createPilotState();
    decidePilotInput(
        makeSnap({ ...base, elapsedMs: 1000, hazards: [piston({ y: 380 })] }),
        holdState
    );
    const hold = decidePilotInput(
        makeSnap({ ...base, elapsedMs: 1100, hazards: [piston({ y: 400 })] }),
        holdState
    );
    assert.equal(hold.left, false);
    assert.equal(hold.right, false);
    assert.equal(hold.jump, false);
    // Rising piston: walk through, the full cycle stays open.
    const riseState = createPilotState();
    decidePilotInput(
        makeSnap({ ...base, elapsedMs: 1000, hazards: [piston({ y: 460 })] }),
        riseState
    );
    const rise = decidePilotInput(
        makeSnap({ ...base, elapsedMs: 1100, hazards: [piston({ y: 440 })] }),
        riseState
    );
    assert.equal(rise.right, true);
    assert.equal(rise.jump, false);
    // First sight dwelling at rest: proceed, no slam history yet.
    const rest = decidePilotInput(makeSnap({ ...base, hazards: [piston()] }), createPilotState());
    assert.equal(rest.right, true);
    // Caught under a slamming piston: rush the nearest edge, never jump.
    const inState = createPilotState();
    const inside = { ...base, player: { x: 680, y: 492, vx: 0, vy: 0, grounded: true } };
    decidePilotInput(
        makeSnap({ ...inside, elapsedMs: 1000, hazards: [piston({ y: 380 })] }),
        inState
    );
    const rush = decidePilotInput(
        makeSnap({ ...inside, elapsedMs: 1100, hazards: [piston({ y: 400 })] }),
        inState
    );
    assert.equal(rush.left, true);
    assert.equal(rush.right, false);
    assert.equal(rush.jump, false);
    // Piston that slams above the head: free pass.
    const high = decidePilotInput(
        makeSnap({
            ...base,
            hazards: [piston({ y: 200, origin: { x: 700, y: 200 }, target: { x: 700, y: 300 } })],
        }),
        createPilotState()
    );
    assert.equal(high.right, true);
});

test('the pilot leaps dust devils with runway and backs up without it', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const devil = (x) => ({
        id: 'devil-1',
        type: 'dust_devil',
        x,
        y: 490,
        w: 36,
        h: 100,
        left: x - 18,
        right: x + 18,
        top: 440,
        active: true,
        enable: true,
        origin: { x: 2550, y: 490 },
        target: { x: 2630, y: 490 },
    });
    const base = {
        physics: { gravityY: 300 },
        phaser: true,
        player: { x: 2400, y: 538, vx: 0, vy: 0, grounded: true, facing: 'right' },
        crown: { x: 5000, y: 690 },
        platforms: [{ left: 2000, right: 3000, top: 544, x: 2500, w: 1000 }],
    };
    // Devil 130 out: take off now, the arc apexes past the band.
    const leap = decidePilotInput(
        makeSnap({ ...base, hazards: [devil(2530)] }),
        createPilotState()
    );
    assert.equal(leap.right, true);
    assert.equal(leap.jump, true);
    // Devil 60 out: back up for runway, shooting to cover the rear.
    const back = decidePilotInput(
        makeSnap({ ...base, hazards: [devil(2460)] }),
        createPilotState()
    );
    assert.equal(back.left, true);
    assert.equal(back.right, false);
    assert.equal(back.jump, false);
    assert.equal(back.shoot, true);
});

test('the pilot retreats to mount the bridge over a lidded devil', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const devil = {
        id: 'devil-1',
        type: 'dust_devil',
        x: 2530,
        y: 490,
        w: 36,
        h: 100,
        left: 2512,
        right: 2548,
        top: 440,
        active: true,
        enable: true,
        origin: { x: 2550, y: 490 },
        target: { x: 2630, y: 490 },
    };
    const flesh = { left: 2310, right: 2790, top: 554, x: 2550, w: 480, h: 24 };
    const bone = { left: 2358, right: 2742, top: 408, x: 2550, w: 384, h: 24 };
    const base = {
        physics: { gravityY: 300 },
        phaser: true,
        crown: { x: 5000, y: 690 },
        platforms: [flesh, bone],
        hazards: [devil],
    };
    // Under the lid with the devil ahead: the arc would bonk, so give
    // ground west until the mount engages.
    const retreat = decidePilotInput(
        makeSnap({
            ...base,
            player: { x: 2400, y: 538, vx: 0, vy: 0, grounded: true, facing: 'right' },
        }),
        createPilotState()
    );
    assert.equal(retreat.left, true);
    assert.equal(retreat.right, false);
    assert.equal(retreat.jump, false);
    assert.equal(retreat.shoot, true);
    // Mount in reach (bridge edge ahead): climb, never retreat.
    const mount = decidePilotInput(
        makeSnap({
            ...base,
            player: { x: 2280, y: 538, vx: 0, vy: 0, grounded: true, facing: 'right' },
        }),
        createPilotState()
    );
    assert.equal(mount.right, true);
    assert.equal(mount.jump, true);
    // Mount too short (lid edge within 70px): the takeoff would carry
    // under the deck and bonk, so keep retreating to the clean spot.
    const short = decidePilotInput(
        makeSnap({
            ...base,
            player: { x: 2345, y: 538, vx: 0, vy: 0, grounded: true, facing: 'right' },
        }),
        createPilotState()
    );
    assert.equal(short.left, true);
    assert.equal(short.jump, false);
    assert.equal(short.shoot, true);
    // Near the deck edge a full stride would miss: keep retreating on
    // the near footing instead of vibrating in place.
    const edge = decidePilotInput(
        makeSnap({
            ...base,
            platforms: [
                { left: 2310, right: 2790, top: 554, x: 2550, w: 480, h: 24 },
                { left: 2358, right: 2742, top: 408, x: 2550, w: 384, h: 24 },
            ],
            player: { x: 2365, y: 538, vx: 0, vy: 0, grounded: true, facing: 'left' },
        }),
        createPilotState()
    );
    assert.equal(edge.left, true);
    assert.equal(edge.shoot, true);
    // Airborne over the devil: hold the arc, never freeze mid-flight.
    const arc = decidePilotInput(
        makeSnap({
            ...base,
            player: { x: 2500, y: 460, vx: 160, vy: 150, grounded: false, facing: 'right' },
        }),
        createPilotState()
    );
    assert.equal(arc.right, true);
    assert.equal(arc.left, false);
});

test('the pilot doubles at the apex for a high landing the arc misses', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const bone = { left: 2358, right: 2742, top: 408, x: 2550, w: 384, h: 24 };
    const base = {
        physics: { gravityY: 300 },
        phaser: true,
        jumpCount: 1,
        maxJumps: 2,
        crown: { x: 5000, y: 690 },
        platforms: [
            { left: 1610, right: 2090, top: 570, x: 1850, w: 480, h: 24 },
            { left: 2310, right: 2790, top: 554, x: 2550, w: 480, h: 24 },
            bone,
        ],
        hazards: [],
    };
    // At the apex over the gap, boots 2px short of the bridge: double now.
    const climbState = createPilotState();
    climbState.takeoffY = 570;
    const climb = decidePilotInput(
        makeSnap({
            ...base,
            player: { x: 2210, y: 388, vx: 160, vy: 10, grounded: false, facing: 'right' },
        }),
        climbState
    );
    assert.equal(climb.jump, true);
    assert.equal(climb.right, true);
    // Same-level landing far below the arc: hold the double for the fall.
    const holdState = createPilotState();
    holdState.takeoffY = 570;
    const hold = decidePilotInput(
        makeSnap({
            ...base,
            platforms: [
                { left: 1610, right: 2090, top: 570, x: 1850, w: 480, h: 24 },
                { left: 2310, right: 2790, top: 560, x: 2550, w: 480, h: 24 },
            ],
            player: { x: 2210, y: 388, vx: 160, vy: 10, grounded: false, facing: 'right' },
        }),
        holdState
    );
    assert.equal(hold.jump, false);
});

test('the pilot abandons a duel it cannot finish', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const target = {
        id: 'boarder-7',
        type: 'boarder',
        x: 600,
        y: 628,
        w: 40,
        h: 48,
        active: true,
        enable: true,
        chasing: true,
    };
    const base = {
        phaser: true,
        player: { x: 400, y: 568, vx: 0, vy: 0, grounded: true, facing: 'right' },
        crown: { x: 5000, y: 690 },
        platforms: [{ left: -100, right: 1200, top: 574, x: 550, w: 1300 }],
        hazards: [target],
    };
    const state = createPilotState();
    // Fresh duel: hold and shoot.
    const duel = decidePilotInput(makeSnap({ ...base, elapsedMs: 1000 }), state);
    assert.equal(duel.shoot, true);
    assert.equal(duel.right, false);
    // Same target 2.1s later, still alive: abandon and run.
    const abandon = decidePilotInput(makeSnap({ ...base, elapsedMs: 3100 }), state);
    assert.equal(abandon.right, true);
    // Skip window: still runs past it 3s after that.
    const skip = decidePilotInput(makeSnap({ ...base, elapsedMs: 6000 }), state);
    assert.equal(skip.right, true);
    // Converged level inside the skip: duel through it (touchdown kill).
    const kill = decidePilotInput(
        makeSnap({
            ...base,
            elapsedMs: 6500,
            hazards: [{ ...target, y: 572 }],
        }),
        state
    );
    assert.equal(kill.shoot, true);
    assert.equal(kill.right, false);
});

test('the pilot holds for falling drips and rushes out from under them', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const drip = (x, y, vy = 300) => ({
        id: `drip-${x}`,
        type: 'acid_drip',
        x,
        y,
        w: 12,
        h: 16,
        active: true,
        enable: true,
        vx: 0,
        vy,
    });
    const base = {
        phaser: true,
        player: { x: 500, y: 606, vx: 0, vy: 0, grounded: true, facing: 'right' },
        crown: { x: 5000, y: 690 },
        platforms: [{ left: -100, right: 1200, top: 634, x: 550, w: 1300 }],
    };
    // Drip falling into the lane ahead: hold, never leap into it.
    const hold = decidePilotInput(
        makeSnap({ ...base, hazards: [drip(570, 560)] }),
        createPilotState()
    );
    assert.equal(hold.right, false);
    assert.equal(hold.jump, false);
    // Drip directly overhead: rush out, no jump.
    const rush = decidePilotInput(
        makeSnap({ ...base, hazards: [drip(510, 560)] }),
        createPilotState()
    );
    assert.equal(rush.left, true);
    assert.equal(rush.jump, false);
    // Drip past the boots: ignore, keep running.
    const pass = decidePilotInput(
        makeSnap({ ...base, hazards: [drip(570, 680)] }),
        createPilotState()
    );
    assert.equal(pass.right, true);
});

test('the pilot runs off small step-downs and jumps real pits', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const base = {
        phaser: true,
        player: { x: 1500, y: 448, vx: 0, vy: 0, grounded: true, facing: 'right' },
        crown: { x: 5000, y: 690 },
        hazards: [],
    };
    // Low edge with a wide deck below: run off, save the fuel.
    const step = decidePilotInput(
        makeSnap({
            ...base,
            platforms: [
                { left: 1000, right: 1540, top: 470, x: 1270, w: 540 },
                { left: 1610, right: 2090, top: 570, x: 1850, w: 480 },
            ],
        }),
        createPilotState()
    );
    assert.equal(step.right, true);
    assert.equal(step.jump, false);
    // No landing in reach: full jump.
    const pit = decidePilotInput(
        makeSnap({
            ...base,
            platforms: [{ left: 1000, right: 1540, top: 470, x: 1270, w: 540 }],
        }),
        createPilotState()
    );
    assert.equal(pit.right, true);
    assert.equal(pit.jump, true);
});

test('the pilot lands beside a duelable boarder instead of burning fuel', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const deck = { left: 1610, right: 2090, top: 570, x: 1850, w: 480 };
    const base = {
        phaser: true,
        jumpCount: 1,
        maxJumps: 2,
        player: { x: 1800, y: 505, vx: 160, vy: 200, grounded: false, facing: 'right' },
        crown: { x: 5000, y: 690 },
        platforms: [deck],
    };
    // Same-deck chaser off to the side: brake and land short of it
    // (the touchdown duel kills it) instead of burning the double.
    const land = decidePilotInput(
        makeSnap({
            ...base,
            hazards: [
                {
                    id: 'boarder-1',
                    type: 'boarder',
                    x: 1843,
                    y: 544,
                    w: 40,
                    h: 48,
                    active: true,
                    enable: true,
                    chasing: true,
                },
            ],
        }),
        createPilotState()
    );
    assert.equal(land.jump, false);
    assert.equal(land.left, false);
    assert.equal(land.right, false);
    assert.equal(land.shoot, true);
    // Same deck directly underfoot: still hop, landing is contact.
    const hop = decidePilotInput(
        makeSnap({
            ...base,
            hazards: [
                {
                    id: 'boarder-1',
                    type: 'boarder',
                    x: 1810,
                    y: 525,
                    w: 40,
                    h: 48,
                    active: true,
                    enable: true,
                    chasing: true,
                },
            ],
        }),
        createPilotState()
    );
    assert.equal(hop.jump, true);
    // Head-on pass underfoot now but clear at touchdown: land (the
    // grounded duel kills it) instead of burning the double.
    const pass = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            phaser: true,
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 4062, y: 371, vx: 160, vy: 375, grounded: false, facing: 'right' },
            crown: { x: 12050, y: 236 },
            platforms: [{ left: 4008, right: 4392, top: 468, x: 4200, w: 384 }],
            hazards: [
                {
                    id: 'boarder-4',
                    type: 'boarder',
                    x: 4061,
                    y: 450,
                    w: 40,
                    h: 48,
                    active: true,
                    enable: true,
                    chasing: true,
                    vx: -190,
                    vy: 0,
                },
            ],
            bombs: [],
            columns: [],
        }),
        createPilotState()
    );
    assert.equal(pass.jump, false);
    assert.equal(pass.right, true);
    // Synchronized shadow (matched velocity): still hop, it lands with us.
    const shadow = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            phaser: true,
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 4092, y: 371, vx: 160, vy: 375, grounded: false, facing: 'right' },
            crown: { x: 12050, y: 236 },
            platforms: [{ left: 4008, right: 4392, top: 468, x: 4200, w: 384 }],
            hazards: [
                {
                    id: 'boarder-4',
                    type: 'boarder',
                    x: 4079,
                    y: 450,
                    w: 40,
                    h: 48,
                    active: true,
                    enable: true,
                    chasing: true,
                    vx: 160,
                    vy: 0,
                },
            ],
            bombs: [],
            columns: [],
        }),
        createPilotState()
    );
    assert.equal(shadow.jump, true);
    // Another deck far below: land free, nothing to dodge.
    const free = decidePilotInput(
        makeSnap({
            ...base,
            hazards: [
                {
                    id: 'boarder-1',
                    type: 'boarder',
                    x: 1810,
                    y: 660,
                    w: 40,
                    h: 48,
                    active: true,
                    enable: true,
                    chasing: true,
                },
            ],
        }),
        createPilotState()
    );
    assert.equal(free.jump, false);
    assert.equal(free.right, true);
});

test('the pilot brakes over deck for a head-on chaser, flies over pits', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const chaser = {
        id: 'boarder-1',
        type: 'boarder',
        x: 1880,
        y: 566,
        w: 40,
        h: 48,
        active: true,
        enable: true,
        chasing: true,
        vx: -190,
        vy: 0,
    };
    const base = {
        phaser: true,
        jumpCount: 1,
        maxJumps: 2,
        player: { x: 1830, y: 510, vx: 160, vy: 300, grounded: false, facing: 'right' },
        crown: { x: 5000, y: 690 },
        hazards: [chaser],
    };
    // Deck below: brake (no direction) and land short — the grounded
    // duel kills it. Flying on collides at touchdown.
    const brake = decidePilotInput(
        makeSnap({
            ...base,
            platforms: [{ left: 1610, right: 2090, top: 570, x: 1850, w: 480 }],
        }),
        createPilotState()
    );
    assert.equal(brake.left, false);
    assert.equal(brake.right, false);
    assert.equal(brake.jump, false);
    assert.equal(brake.shoot, true);
    // Pit below: keep flying, there is nothing to land short on.
    const fly = decidePilotInput(makeSnap({ ...base, platforms: [] }), createPilotState());
    assert.equal(fly.right, true);
    assert.equal(fly.jump, false);
    // Chaser whose body flickers off but flag stays up: still brake —
    // it switches on for the touchdown.
    const flicker = decidePilotInput(
        makeSnap({
            player: { x: 4030, y: 312, vx: 160, vy: 325, grounded: false, facing: 'right' },
            crown: { x: 12050, y: 236 },
            platforms: [{ left: 4008, right: 4392, top: 468, x: 4200, w: 384 }],
            hazards: [
                {
                    id: 'boarder-4',
                    type: 'boarder',
                    x: 4090,
                    y: 450,
                    w: 40,
                    h: 48,
                    active: true,
                    enable: false,
                    chasing: true,
                    vx: -190,
                    vy: 0,
                },
            ],
        }),
        createPilotState()
    );
    assert.equal(flicker.left, false);
    assert.equal(flicker.right, false);
    assert.equal(flicker.jump, false);
});

test('the pilot veers off accidental bonkables and lines up real springs', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const deck = { left: 3400, right: 3800, top: 386, x: 3600, w: 400 };
    // Rising past an accidental sentry side: veer away, never drift in.
    const veer = decidePilotInput(
        makeSnap({
            player: { x: 3720, y: 340, vx: 160, vy: -200, grounded: false, facing: 'right' },
            crown: { x: 5000, y: 690 },
            platforms: [deck],
            hazards: [
                {
                    id: 'sentry-1',
                    type: 'sentry',
                    x: 3760,
                    y: 390,
                    w: 30,
                    h: 30,
                    top: 375,
                    active: true,
                    enable: true,
                    bonkable: true,
                },
            ],
        }),
        createPilotState()
    );
    assert.equal(veer.left, true);
    assert.equal(veer.right, false);
    assert.equal(veer.jump, false);
    // Falling centered onto the head: drift on for the drop.
    const drop = decidePilotInput(
        makeSnap({
            player: { x: 3725, y: 260, vx: 160, vy: 200, grounded: false, facing: 'right' },
            crown: { x: 5000, y: 690 },
            platforms: [deck],
            hazards: [
                {
                    id: 'sentry-1',
                    type: 'sentry',
                    x: 3760,
                    y: 340,
                    w: 30,
                    h: 30,
                    top: 325,
                    active: true,
                    enable: true,
                    bonkable: true,
                },
            ],
        }),
        createPilotState()
    );
    assert.equal(drop.right, true);
    assert.equal(drop.jump, false);
});

test('the pilot delays a mount jump while a drone patrols the arc', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const drone = (x) => ({
        id: 'drone-1',
        type: 'drone',
        x,
        y: 380,
        w: 30,
        h: 30,
        active: true,
        enable: true,
    });
    const base = {
        physics: { gravityY: 300 },
        player: { x: 3177, y: 448, vx: 0, vy: 0, grounded: true, facing: 'right' },
        crown: { x: 5000, y: 690 },
        platforms: [
            { left: 2858, right: 3242, top: 464, x: 3050, w: 384 },
            { left: 3437, right: 3763, top: 386, x: 3600, w: 326 },
        ],
    };
    // Drone in the arc: run under it, do not jump into it.
    const wait = decidePilotInput(
        makeSnap({ ...base, hazards: [drone(3190)] }),
        createPilotState()
    );
    assert.equal(wait.right, true);
    assert.equal(wait.jump, false);
    // Drone patrolled clear: take the mount.
    const mount = decidePilotInput(
        makeSnap({ ...base, hazards: [drone(3100)] }),
        createPilotState()
    );
    assert.equal(mount.right, true);
    assert.equal(mount.jump, true);
});

test('the pilot jumps early when a floater hangs over the edge arc', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const sentry = (x) => ({
        id: 'sentry-1',
        type: 'sentry',
        x,
        y: 262,
        w: 30,
        h: 30,
        top: 247,
        active: true,
        enable: true,
        bonkable: true,
    });
    const base = {
        player: { x: 3700, y: 364, vx: 0, vy: 0, grounded: true, facing: 'right' },
        crown: { x: 5000, y: 690 },
        platforms: [{ left: 3437, right: 3763, top: 386, x: 3600, w: 326 }],
    };
    // Sentry over the edge arc: jump early so the arc apexes over it.
    const early = decidePilotInput(
        makeSnap({ ...base, hazards: [sentry(3830)] }),
        createPilotState()
    );
    assert.equal(early.right, true);
    assert.equal(early.jump, true);
    // Sentry too far to matter: run, do not hop.
    const run = decidePilotInput(
        makeSnap({ ...base, hazards: [sentry(4000)] }),
        createPilotState()
    );
    assert.equal(run.right, true);
    assert.equal(run.jump, false);
});

test('the pilot turns and duels a chaser on its heels', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const chaser = {
        id: 'boarder-9',
        type: 'boarder',
        x: 2200,
        y: 538,
        w: 40,
        h: 48,
        active: true,
        enable: true,
        chasing: true,
    };
    const base = {
        phaser: true,
        player: { x: 2400, y: 538, vx: 0, vy: 0, grounded: true, facing: 'left' },
        crown: { x: 5000, y: 690 },
        platforms: [{ left: 2000, right: 3000, top: 544, x: 2500, w: 1000 }],
        hazards: [chaser],
    };
    // Already facing the chaser: hold and kill it.
    const hold = decidePilotInput(makeSnap(base), createPilotState());
    assert.equal(hold.left, false);
    assert.equal(hold.right, false);
    assert.equal(hold.shoot, true);
    // Facing away: step until turned, still shooting.
    const turn = decidePilotInput(
        makeSnap({
            ...base,
            player: { ...base.player, facing: 'right' },
        }),
        createPilotState()
    );
    assert.equal(turn.left, true);
    assert.equal(turn.shoot, true);
    // Imminent devil: dodge first, duel after.
    const dodge = decidePilotInput(
        makeSnap({
            ...base,
            physics: { gravityY: 300 },
            player: { ...base.player, facing: 'right' },
            hazards: [
                chaser,
                {
                    id: 'devil-1',
                    type: 'dust_devil',
                    x: 2480,
                    y: 490,
                    w: 36,
                    h: 100,
                    top: 440,
                    active: true,
                    enable: true,
                    target: { x: 2560, y: 490 },
                },
            ],
        }),
        createPilotState()
    );
    assert.equal(dodge.left, true);
    assert.equal(dodge.jump, false);
    assert.equal(dodge.shoot, true);
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
