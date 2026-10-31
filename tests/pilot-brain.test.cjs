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

test('the pilot backs up a runway instead of pogoing on a tall head', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const sentry = {
        id: 'sentry-1',
        type: 'bonk',
        x: 11100,
        y: 491,
        w: 30,
        h: 30,
        top: 476,
        active: true,
        enable: true,
        bonkable: true,
    };
    const base = {
        player: { x: 11028, y: 512, vx: 0, vy: 0, grounded: true },
        crown: { x: 11660, y: 400 },
        platforms: [{ left: 10800, right: 11300, top: 534, x: 11050, w: 500 }],
        hazards: [sentry],
    };
    // 72px out (past the 70px hop range): the spring still holds, so
    // back up for the runway instead of advancing into a pogo.
    const back = decidePilotInput(makeSnap(base), createPilotState());
    assert.equal(back.left, true);
    assert.equal(back.right, false);
    assert.equal(back.jump, false);
    // 150px out: runway enough, run at it and take off for the bonk.
    const run = decidePilotInput(
        makeSnap({ ...base, player: { x: 10950, y: 512, vx: 0, vy: 0, grounded: true } }),
        createPilotState()
    );
    assert.equal(run.right, true);
    assert.equal(run.jump, true);
});

test('the pilot flies on past a spring when a deck waits below', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Bounced high over the head with the deck still below: the canyon
    // hop must not re-engage (the gap is height, not a pit), so drift
    // goalward instead of centering back for an infinite re-bonk.
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 11081, y: 332, vx: 160, vy: 210, grounded: false },
            crown: { x: 11660, y: 400 },
            platforms: [{ left: 10800, right: 11300, top: 534, x: 11050, w: 500 }],
            hazards: [
                {
                    id: 'sentry-1',
                    type: 'sentry',
                    x: 11100,
                    y: 482,
                    w: 30,
                    h: 30,
                    top: 456,
                    active: true,
                    enable: true,
                    bonkable: true,
                },
            ],
        }),
        createPilotState()
    );
    assert.equal(input.right, true);
    assert.equal(input.left, false);
    assert.equal(input.jump, false);
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

test('threat suppression expires but deliberate holds never do', async () => {
    const { applyStuckRecovery, createPilotState } = await importModule('scripts/pilot-brain.mjs');
    const snap = makeSnap();
    const idle = { left: false, right: false, jump: false, shoot: false, start: false };
    const state = createPilotState();
    applyStuckRecovery(snap, { ...idle }, state, false, 1000, true);
    const blocked = { ...idle };
    applyStuckRecovery(snap, blocked, state, false, 4000, true);
    assert.deepEqual(blocked, idle);
    const freed = { ...idle };
    applyStuckRecovery(snap, freed, state, false, 11500, true);
    assert.equal(freed.left, true);
    assert.equal(freed.jump, true);
    const holdState = createPilotState();
    applyStuckRecovery(snap, { ...idle }, holdState, true, 1000, false);
    const held = { ...idle };
    applyStuckRecovery(snap, held, holdState, true, 30000, false);
    assert.deepEqual(held, idle);
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

test('the pilot dodges an aimed dive instead of dueling it', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const boarder = (x, y, overrides = {}) => ({
        id: `boarder-${x}`,
        type: 'boarder',
        x,
        y,
        w: 22,
        h: 36,
        top: y - 18,
        active: true,
        enable: true,
        chasing: true,
        ...overrides,
    });
    const base = {
        phaser: true,
        player: { x: 100, y: 628, vx: 0, vy: 0, grounded: true },
        crown: { x: 5000, y: 690 },
        platforms: [{ left: -100, right: 1200, top: 634, x: 550, w: 1300 }],
    };
    // Steep aimed dive off the bolt line: keep running, the committed
    // leap lands where the pilot stood. Real hop dives keep sideways
    // hop speed (|vx| >= 133); still air (vx 0) is a wave drop instead.
    const dodge = decidePilotInput(
        makeSnap({ ...base, hazards: [boarder(400, 500, { vx: -190, vy: 220 })] }),
        createPilotState()
    );
    assert.equal(dodge.right, true);
    assert.equal(dodge.jump, false);
    // Near-line tracker: hold and gun it down as before.
    const duel = decidePilotInput(
        makeSnap({ ...base, hazards: [boarder(400, 608, { vy: 10 })] }),
        createPilotState()
    );
    assert.equal(duel.shoot, true);
    assert.equal(duel.right, false);
});

test('the pilot pre-fires a wave drop instead of leaping over it', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const boarder = (x, y, overrides = {}) => ({
        id: `boarder-${x}`,
        type: 'boarder',
        x,
        y,
        w: 22,
        h: 36,
        top: y - 18,
        active: true,
        enable: true,
        chasing: true,
        vx: 0,
        ...overrides,
    });
    const base = {
        phaser: true,
        player: { x: 1490, y: 586, vx: 160, vy: 0, grounded: true },
        crown: { x: 3640, y: 400 },
        platforms: [{ left: 1015, right: 2540, top: 602, x: 1777, w: 1525 }],
    };
    // L7 wave-2 drop falling straight into the lane: hold and pre-fire,
    // it lands in the bolts (the old close reflex leapt over it into
    // the next chaser and died at x 2147).
    const drop = decidePilotInput(
        makeSnap({
            ...base,
            player: { x: 1310, y: 586, vx: 160, vy: 0, grounded: true },
            hazards: [boarder(1560, 450, { vy: 150 })],
        }),
        createPilotState()
    );
    assert.equal(drop.shoot, true);
    assert.equal(drop.jump, false);
    assert.equal(drop.left, false);
    assert.equal(drop.right, false);
    // Same drop inside the old reflex band (dy -35, dist 70): still no leap.
    const close = decidePilotInput(
        makeSnap({
            ...base,
            player: { x: 1490, y: 586, vx: 160, vy: 0, grounded: true },
            hazards: [boarder(1560, 551, { vy: 253 })],
        }),
        createPilotState()
    );
    assert.equal(close.shoot, true);
    assert.equal(close.jump, false);
});

function bossHaz(x, y, overrides = {}) {
    return {
        id: 'boss-1',
        type: 'boss',
        x,
        y,
        w: 108,
        h: 66,
        top: y - 33,
        active: true,
        enable: true,
        phase: 'pace',
        hp: 14,
        maxHp: 14,
        ...overrides,
    };
}

function bossBase() {
    return {
        phaser: true,
        player: { x: 11400, y: 442, vx: 160, vy: 0, grounded: true },
        crown: { x: 11700, y: 400 },
        platforms: [{ left: 11427, right: 11773, top: 458, x: 11600, w: 346 }],
    };
}

test('the pilot jumps a boss telegraph and fires on the lane', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const boss = bossHaz;
    const base = bossBase();
    // Telegraph ahead inside 300px: jump away, keep firing.
    const evade = decidePilotInput(
        makeSnap({ ...base, hazards: [boss(11600, 427, { phase: 'telegraph' })] }),
        createPilotState()
    );
    assert.equal(evade.jump, true);
    assert.equal(evade.right, false);
    assert.equal(evade.left, true);
    assert.equal(evade.shoot, true);
    // Charging boss: same answer, never stand to duel it.
    const charge = decidePilotInput(
        makeSnap({ ...base, hazards: [boss(11600, 427, { phase: 'charge', vx: -420 })] }),
        createPilotState()
    );
    assert.equal(charge.jump, true);
    assert.equal(charge.left, true);
    // Pacing close: kite grounded for level bolts, no panic jump.
    const kite = decidePilotInput(
        makeSnap({ ...base, hazards: [boss(11500, 427, { phase: 'pace', vx: -60 })] }),
        createPilotState()
    );
    assert.equal(kite.jump, false);
    assert.equal(kite.left, true);
    assert.equal(kite.shoot, true);
    // Cornered at the pad edge by a closing pacer: go over the top.
    const cornered = decidePilotInput(
        makeSnap({
            ...base,
            player: { x: 11480, y: 442, vx: 0, vy: 0, grounded: true },
            hazards: [boss(11600, 427, { phase: 'pace', vx: -60 })],
        }),
        createPilotState()
    );
    assert.equal(cornered.jump, true);
    assert.equal(cornered.right, true);
    assert.equal(cornered.left, false);
    // Cornered by a nesting boss with nothing incoming: plant and fire.
    const nest = decidePilotInput(
        makeSnap({
            ...base,
            player: { x: 11480, y: 442, vx: 0, vy: 0, grounded: true },
            hazards: [boss(11600, 427, { phase: 'pace', vx: 0 })],
        }),
        createPilotState()
    );
    assert.equal(nest.jump, false);
    assert.equal(nest.right, false);
    assert.equal(nest.left, false);
    assert.equal(nest.shoot, true);
    // Fresh telegraph: strafe for separation and fire, jump goes late.
    const fresh = decidePilotInput(
        makeSnap({
            ...base,
            hazards: [boss(11600, 427, { phase: 'telegraph', timeUntilPhaseChangeMs: 700 })],
        }),
        createPilotState()
    );
    assert.equal(fresh.jump, false);
    assert.equal(fresh.left, true);
    assert.equal(fresh.shoot, true);
    // Late telegraph: jump now.
    const late = decidePilotInput(
        makeSnap({
            ...base,
            hazards: [boss(11600, 427, { phase: 'telegraph', timeUntilPhaseChangeMs: 200 })],
        }),
        createPilotState()
    );
    assert.equal(late.jump, true);
    // SummonTell close: plant and fire, never walk in mid-tell.
    const tell = decidePilotInput(
        makeSnap({
            ...base,
            player: { x: 11550, y: 442, vx: 0, vy: 0, grounded: true },
            hazards: [boss(11600, 427, { phase: 'summonTell' })],
        }),
        createPilotState()
    );
    assert.equal(tell.jump, false);
    assert.equal(tell.right, false);
    assert.equal(tell.left, false);
    assert.equal(tell.shoot, true);
    // Recover close: plant and fire through the breather.
    const breather = decidePilotInput(
        makeSnap({
            ...base,
            player: { x: 11550, y: 442, vx: 0, vy: 0, grounded: true },
            hazards: [boss(11600, 427, { phase: 'recover', vx: 0 })],
        }),
        createPilotState()
    );
    assert.equal(breather.jump, false);
    assert.equal(breather.right, false);
    assert.equal(breather.left, false);
    assert.equal(breather.shoot, true);
    // Far telegraph: hold ground, jump the incoming charge.
    const hold = decidePilotInput(
        makeSnap({
            ...base,
            player: { x: 11200, y: 442, vx: 0, vy: 0, grounded: true },
            hazards: [boss(11600, 427, { phase: 'telegraph' })],
        }),
        createPilotState()
    );
    assert.equal(hold.jump, true);
    assert.equal(hold.right, false);
    assert.equal(hold.left, false);
    assert.equal(hold.shoot, true);
    // Short-charge telegraph past its reach: hold fire, no jump.
    const past = decidePilotInput(
        makeSnap({
            ...base,
            platforms: [{ left: 11000, right: 11773, top: 458, x: 11386, w: 773 }],
            player: { x: 11200, y: 442, vx: 0, vy: 0, grounded: true },
            hazards: [boss(11600, 427, { phase: 'telegraph', chargeRange: 266 })],
        }),
        createPilotState()
    );
    assert.equal(past.jump, false);
    assert.equal(past.right, true);
    assert.equal(past.shoot, true);
    // Pacing far: run the lane and hold fire, no panic jump.
    const lane = decidePilotInput(
        makeSnap({ ...base, hazards: [boss(11700, 427, { phase: 'pace' })] }),
        createPilotState()
    );
    assert.equal(lane.jump, false);
    assert.equal(lane.shoot, true);
    // Dormant: walk the trigger up normally.
    const calm = decidePilotInput(
        makeSnap({ ...base, hazards: [boss(11600, 427, { phase: 'dormant' })] }),
        createPilotState()
    );
    assert.equal(calm.jump, false);
    assert.equal(calm.right, true);
});

test('airborne drift holds short of an active boss under a shielded crown', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const boss = bossHaz;
    const deck = [{ left: 11302, right: 11878, top: 528, x: 11590, w: 576 }];
    const crown = { x: 11660, y: 470, shielded: true };
    // Landing graze toward a telling boss: hold x and fire, never drift
    // the touchdown into contact (L11 trace: the crown goal walked the
    // landing into her).
    const graze = decidePilotInput(
        makeSnap({
            phaser: true,
            physics: { gravityY: 300 },
            jumpCount: 0,
            platforms: deck,
            crown,
            player: { x: 11433, y: 508, vx: 0, vy: 5, grounded: false, facing: 'left' },
            hazards: [boss(11530, 495, { phase: 'summonTell', hp: 5, maxHp: 12 })],
        }),
        createPilotState()
    );
    assert.equal(graze.left, false);
    assert.equal(graze.right, false);
    assert.equal(graze.shoot, true);
    // Dormant boss: contact is safe, the approach runs on through.
    const approach = decidePilotInput(
        makeSnap({
            phaser: true,
            physics: { gravityY: 300 },
            jumpCount: 0,
            platforms: deck,
            crown,
            player: { x: 11433, y: 508, vx: 0, vy: 5, grounded: false, facing: 'left' },
            hazards: [boss(11530, 495, { phase: 'dormant', hp: 12, maxHp: 12 })],
        }),
        createPilotState()
    );
    assert.equal(approach.right, true);
    // Committed cross-over that clears her: the drift flies on.
    const cross = decidePilotInput(
        makeSnap({
            phaser: true,
            physics: { gravityY: 300 },
            jumpCount: 1,
            platforms: [{ left: 11427, right: 11773, top: 458, x: 11600, w: 346 }],
            crown,
            player: { x: 11590, y: 240, vx: 160, vy: 200, grounded: false, facing: 'right' },
            hazards: [boss(11610, 427, { phase: 'pace' })],
        }),
        createPilotState()
    );
    assert.equal(cross.right, true);
    assert.equal(cross.left, false);
    // Over the pit with no deck below: never hold — the flight must
    // steer or jump to safety (L8 trace: holding stranded her).
    const pit = decidePilotInput(
        makeSnap({
            phaser: true,
            physics: { gravityY: 300 },
            jumpCount: 0,
            platforms: [
                { left: 10749, right: 11191, top: 548, x: 10970, w: 442 },
                { left: 11427, right: 11773, top: 458, x: 11600, w: 346 },
            ],
            crown: { x: 11700, y: 400, shielded: true },
            player: { x: 11300, y: 429, vx: 0, vy: 185, grounded: false, facing: 'right' },
            hazards: [boss(11450, 429, { phase: 'pace' })],
        }),
        createPilotState()
    );
    assert.equal(pit.right, true);
    assert.equal(pit.left, false);
    // Drift away from her keeps flying: only toward-drift holds (L14
    // trace: zeroing escape drift landed the pilot inside the charge).
    const flee = decidePilotInput(
        makeSnap({
            phaser: true,
            physics: { gravityY: 300 },
            jumpCount: 0,
            platforms: [{ left: 12208, right: 12592, top: 314, x: 12400, w: 384 }],
            crown: { x: 12600, y: 470, shielded: true },
            player: { x: 12436, y: 150, vx: 0, vy: 185, grounded: false, facing: 'right' },
            hazards: [boss(12325, 287, { phase: 'telegraph' })],
        }),
        createPilotState()
    );
    assert.equal(flee.right, true);
    assert.equal(flee.left, false);
    // Crown on her side during a telegraph: flee for separation,
    // never hold into the charge (L14 trace: holding landed at dx 111
    // as the charge left).
    const incoming = decidePilotInput(
        makeSnap({
            phaser: true,
            physics: { gravityY: 300 },
            jumpCount: 0,
            platforms: [{ left: 12208, right: 12592, top: 314, x: 12400, w: 384 }],
            crown: { x: 12400, y: 470, shielded: true },
            player: { x: 12436, y: 150, vx: 0, vy: 185, grounded: false, facing: 'right' },
            hazards: [boss(12325, 287, { phase: 'telegraph' })],
        }),
        createPilotState()
    );
    assert.equal(incoming.right, true);
    assert.equal(incoming.left, false);
});

test('the pilot faces rear boss threats and holds the shielded crown', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const boss = bossHaz;
    const base = bossBase();
    // Threat from behind, mis-faced at range: step to face it.
    const rear = decidePilotInput(
        makeSnap({
            ...base,
            player: { x: 11700, y: 442, vx: 0, vy: 0, grounded: true },
            hazards: [boss(11580, 427, { phase: 'pace' })],
        }),
        createPilotState()
    );
    assert.equal(rear.jump, false);
    assert.equal(rear.right, false);
    assert.equal(rear.left, true);
    assert.equal(rear.shoot, true);
    // Threat behind, faced at range: plant and fire, never advance.
    const plant = decidePilotInput(
        makeSnap({
            ...base,
            player: { x: 11700, y: 442, vx: 0, vy: 0, grounded: true, facing: 'left' },
            hazards: [boss(11580, 427, { phase: 'pace' })],
        }),
        createPilotState()
    );
    assert.equal(plant.jump, false);
    assert.equal(plant.right, false);
    assert.equal(plant.left, false);
    assert.equal(plant.shoot, true);
    // Threat behind, faced and on top: cross over, never stand in it.
    const cross = decidePilotInput(
        makeSnap({
            ...base,
            player: { x: 11640, y: 442, vx: 0, vy: 0, grounded: true, facing: 'left' },
            hazards: [boss(11580, 427, { phase: 'pace' })],
        }),
        createPilotState()
    );
    assert.equal(cross.jump, true);
    assert.equal(cross.right, false);
    assert.equal(cross.left, true);
    // Threat behind, faced, pacer closing at 90: cross before it arrives.
    const closing = decidePilotInput(
        makeSnap({
            ...base,
            player: { x: 11670, y: 442, vx: 0, vy: 0, grounded: true, facing: 'left' },
            hazards: [boss(11580, 427, { phase: 'pace', vx: 70 })],
        }),
        createPilotState()
    );
    assert.equal(closing.jump, true);
    assert.equal(closing.right, false);
    assert.equal(closing.left, true);
    // Threat behind, mis-faced and on top: cross over, never step in.
    const turn = decidePilotInput(
        makeSnap({
            ...base,
            player: { x: 11640, y: 442, vx: 0, vy: 0, grounded: true },
            hazards: [boss(11580, 427, { phase: 'pace' })],
        }),
        createPilotState()
    );
    assert.equal(turn.jump, true);
    assert.equal(turn.right, false);
    assert.equal(turn.left, true);
    // Threat behind telegraphing: jump it, turning mid-air.
    const rearTele = decidePilotInput(
        makeSnap({
            ...base,
            player: { x: 11700, y: 442, vx: 0, vy: 0, grounded: true },
            hazards: [boss(11580, 427, { phase: 'telegraph' })],
        }),
        createPilotState()
    );
    assert.equal(rearTele.jump, true);
    assert.equal(rearTele.left, true);
    // Shielded crown with a live boss: hold the grab, hunt her instead.
    const trap = decidePilotInput(
        makeSnap({
            ...base,
            crown: { x: 11700, y: 400, shielded: true },
            player: { x: 11700, y: 442, vx: 0, vy: 0, grounded: true },
            hazards: [boss(11500, 427, { phase: 'pace', hp: 10 })],
        }),
        createPilotState()
    );
    assert.equal(trap.jump, false);
    assert.equal(trap.left, true);
    // Same spot, open crown: grab it.
    const grab = decidePilotInput(
        makeSnap({
            ...base,
            crown: { x: 11700, y: 400, shielded: false },
            player: { x: 11700, y: 442, vx: 0, vy: 0, grounded: true },
            hazards: [],
        }),
        createPilotState()
    );
    assert.equal(grab.jump, true);
});

test('the pilot steers boss-column descents and holds its crossings', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const boss = bossHaz;
    const base = bossBase();
    // Falling from high above the boss column: steer the whole way down.
    const high = decidePilotInput(
        makeSnap({
            ...base,
            jumpCount: 2,
            player: { x: 11600, y: 100, vx: 0, vy: 200, grounded: false },
            hazards: [boss(11610, 427, { phase: 'pace' })],
        }),
        createPilotState()
    );
    assert.equal(high.left, true);
    assert.equal(high.jump, false);
    // Falling onto the boss column: steer away early and land fast.
    const steer = decidePilotInput(
        makeSnap({
            ...base,
            jumpCount: 1,
            player: { x: 11600, y: 277, vx: 0, vy: 200, grounded: false },
            hazards: [boss(11610, 427, { phase: 'pace' })],
        }),
        createPilotState()
    );
    assert.equal(steer.left, true);
    assert.equal(steer.jump, false);
    const hop = decidePilotInput(
        makeSnap({
            ...base,
            jumpCount: 1,
            player: { x: 11600, y: 327, vx: 0, vy: 200, grounded: false },
            hazards: [boss(11610, 427, { phase: 'pace' })],
        }),
        createPilotState()
    );
    assert.equal(hop.left, true);
    assert.equal(hop.jump, false);
    // Committed cross whose touchdown clears the far edge: hold course,
    // never reverse the arc (reversing drops onto the near half).
    const crossArc = decidePilotInput(
        makeSnap({
            ...base,
            jumpCount: 1,
            player: { x: 11590, y: 240, vx: 160, vy: 200, grounded: false },
            hazards: [boss(11610, 427, { phase: 'pace' })],
        }),
        createPilotState()
    );
    assert.equal(crossArc.right, true);
    assert.equal(crossArc.left, false);
    assert.equal(crossArc.jump, false);
    // Low cross short of the far edge with steering that leaves the
    // deck: neither touchdown lands safe, so hop out (L11 trace:
    // holding this shape falls onto her head).
    const shortCross = decidePilotInput(
        makeSnap({
            ...base,
            jumpCount: 1,
            player: { x: 11560, y: 300, vx: 160, vy: 200, grounded: false },
            hazards: [boss(11610, 427, { phase: 'pace' })],
        }),
        createPilotState()
    );
    assert.equal(shortCross.left, true);
    assert.equal(shortCross.right, false);
    assert.equal(shortCross.jump, true);
    // Falling at 100px off a boss column: steer early, still no hop yet.
    const wide = decidePilotInput(
        makeSnap({
            ...base,
            jumpCount: 1,
            player: { x: 11510, y: 200, vx: 0, vy: 200, grounded: false },
            hazards: [boss(11610, 427, { phase: 'pace' })],
        }),
        createPilotState()
    );
    assert.equal(wide.left, true);
    assert.equal(wide.jump, false);
    // Low with the touchdown inside the body: hop is the only out.
    const low = decidePilotInput(
        makeSnap({
            ...base,
            jumpCount: 1,
            player: { x: 11600, y: 420, vx: 0, vy: 200, grounded: false },
            hazards: [boss(11610, 427, { phase: 'pace' })],
        }),
        createPilotState()
    );
    assert.equal(low.left, true);
    assert.equal(low.jump, true);
    // Low with the touchdown clear of the body: steer and land fast.
    const lowClear = decidePilotInput(
        makeSnap({
            ...base,
            jumpCount: 1,
            player: { x: 11510, y: 420, vx: 0, vy: 200, grounded: false },
            hazards: [boss(11610, 427, { phase: 'pace' })],
        }),
        createPilotState()
    );
    assert.equal(lowClear.left, true);
    assert.equal(lowClear.jump, false);
    // Low with outward momentum past the edge: brake back over the deck.
    const brake = decidePilotInput(
        makeSnap({
            ...base,
            jumpCount: 1,
            player: { x: 11740, y: 300, vx: 200, vy: 200, grounded: false },
            hazards: [boss(11640, 427, { phase: 'pace' })],
        }),
        createPilotState()
    );
    assert.equal(brake.left, true);
    assert.equal(brake.right, false);
    assert.equal(brake.jump, false);
    // Low with a safe drift when steering would leave: hold the drift.
    const hold = decidePilotInput(
        makeSnap({
            ...base,
            jumpCount: 1,
            player: { x: 11740, y: 300, vx: 0, vy: 200, grounded: false },
            hazards: [boss(11640, 427, { phase: 'pace' })],
        }),
        createPilotState()
    );
    assert.equal(hold.left, false);
    assert.equal(hold.right, false);
    assert.equal(hold.jump, false);
    // No deck below at all: brake and hop for time.
    const voidHop = decidePilotInput(
        makeSnap({
            ...base,
            platforms: [],
            jumpCount: 1,
            player: { x: 11600, y: 300, vx: 0, vy: 200, grounded: false },
            hazards: [boss(11610, 427, { phase: 'pace' })],
        }),
        createPilotState()
    );
    assert.equal(voidHop.right, true);
    assert.equal(voidHop.jump, true);
    // Airborne with the hunt inside the boss column: hold the arc, never chase in.
    const holdArc = decidePilotInput(
        makeSnap({
            ...base,
            jumpCount: 1,
            player: { x: 11480, y: 300, vx: 0, vy: 100, grounded: false },
            crown: { x: 11700, y: 400, shielded: true },
            hazards: [
                {
                    id: 'boarder-1',
                    type: 'boarder',
                    x: 11650,
                    y: 427,
                    w: 40,
                    h: 48,
                    active: true,
                    enable: true,
                },
                boss(11690, 427, { phase: 'pace', hp: 8 }),
            ],
        }),
        createPilotState()
    );
    assert.equal(holdArc.left, false);
    assert.equal(holdArc.right, false);
    assert.equal(holdArc.jump, false);
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
    // Too-close gap beam, cooling, short window: the takeoff arc enters
    // the span still below the crown, and 500ms does not cover the
    // 725ms low transit — hold for the next dark instead of leaping
    // into the phase flip (L14 death 2).
    const pit = (timeUntilPhaseChangeMs) =>
        makeSnap({
            physics: { gravityY: 260 },
            player: { x: 540, y: 628, vx: 0, vy: 0, grounded: true },
            crown: { x: 5000, y: 690 },
            platforms: [{ left: 440, right: 560, top: 634, x: 500, w: 120 }],
            hazards: [
                beam({
                    x: 580,
                    left: 572,
                    right: 588,
                    w: 16,
                    phase: 'cooldown',
                    active: true,
                    enable: true,
                    timeUntilPhaseChangeMs,
                }),
            ],
        });
    const holdPit = decidePilotInput(pit(500), createPilotState());
    assert.equal(holdPit.right, false);
    assert.equal(holdPit.jump, false);
    // Same takeoff with a covering window: the low arc transits on the
    // dark, so leap — the hold above always releases on the next dark.
    const transit = decidePilotInput(pit(900), createPilotState());
    assert.equal(transit.right, true);
    assert.equal(transit.jump, true);
    // Leapable span, active: wait at the edge for the cold takeoff.
    const cold = decidePilotInput(
        makeSnap({
            ...base,
            physics: { gravityY: 260 },
            player: { x: 560, y: 628, vx: 0, vy: 0, grounded: true },
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
        player: { x: 460, y: 628, vx: 0, vy: 0, grounded: true },
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
                    active: true,
                    enable: true,
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
                    active: true,
                    enable: true,
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
                    active: true,
                    enable: true,
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
    assert.equal(airRush.jump, true);
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

test('the pilot ignores dormant and distant beams', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const beam = (overrides = {}) => ({
        id: 'laser-9',
        type: 'laser',
        x: 5300,
        y: 560,
        w: 16,
        h: 90,
        left: 5292,
        right: 5308,
        top: 515,
        active: true,
        enable: true,
        phase: 'active',
        timeUntilPhaseChangeMs: 500,
        orientation: 'vertical',
        ...overrides,
    });
    const base = {
        physics: { gravityY: 300 },
        player: { x: 6106, y: 582, vx: 160, vy: 0, grounded: true },
        crown: { x: 11660, y: 400 },
        platforms: [
            { left: 5762, right: 6338, top: 598, x: 6050, w: 576 },
            { left: 5858, right: 6242, top: 458, x: 6050, w: 384 },
        ],
    };
    // Dormant beams rest in cooldown: far ones do not exist yet.
    const dormant = decidePilotInput(
        makeSnap({
            ...base,
            hazards: [beam({ active: false, phase: 'cooldown', timeUntilPhaseChangeMs: 763 })],
        }),
        createPilotState()
    );
    assert.equal(dormant.right, true);
    assert.equal(dormant.jump, false);
    // Near ones arm on proximity: leap over instead of strolling in.
    const dormantNear = decidePilotInput(
        makeSnap({
            ...base,
            player: { x: 5252, y: 582, vx: 160, vy: 0, grounded: true },
            platforms: [{ left: 5100, right: 5600, top: 604, x: 5350, w: 500 }],
            hazards: [
                beam({
                    active: false,
                    enable: false,
                    phase: 'cooldown',
                    timeUntilPhaseChangeMs: 763,
                }),
            ],
        }),
        createPilotState()
    );
    assert.equal(dormantNear.right, true);
    assert.equal(dormantNear.jump, true);
    // A firing beam 800px ahead must not phantom-hold either.
    const far = decidePilotInput(
        makeSnap({ ...base, hazards: [beam({ x: 6900, left: 6892, right: 6908 })] }),
        createPilotState()
    );
    assert.equal(far.right, true);
    assert.equal(far.left, false);
    assert.equal(far.jump, false);
    // A firing beam 100px out: run to its edge (safe outside the span),
    // pinning only at the edge instead of freezing mid-approach.
    const flat = [{ left: 5100, right: 5600, top: 604, x: 5350, w: 500 }];
    const position = decidePilotInput(
        makeSnap({
            ...base,
            player: { x: 5192, y: 582, vx: 160, vy: 0, grounded: true },
            platforms: flat,
            hazards: [beam({})],
        }),
        createPilotState()
    );
    assert.equal(position.right, true);
    assert.equal(position.jump, false);
    const pin = decidePilotInput(
        makeSnap({
            ...base,
            player: { x: 5252, y: 582, vx: 160, vy: 0, grounded: true },
            platforms: flat,
            hazards: [beam({})],
        }),
        createPilotState()
    );
    assert.equal(pin.right, false);
    assert.equal(pin.jump, false);
    // A dormant beam over the deck below must not poison the landing:
    // falling toward it holds the drop instead of escaping. (Beam sits
    // over the deck center, pilot past the behind-gate, so the laser
    // gate stays out and only the landing check sees the beam.)
    const drop = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 6300, y: 500, vx: 120, vy: 150, grounded: false },
            crown: { x: 11660, y: 400 },
            platforms: [{ left: 6000, right: 6330, top: 598, x: 6165, w: 330 }],
            hazards: [
                beam({
                    x: 6165,
                    left: 6157,
                    right: 6173,
                    y: 540,
                    top: 480,
                    h: 120,
                    active: false,
                    phase: 'cooldown',
                    timeUntilPhaseChangeMs: 300,
                }),
            ],
        }),
        createPilotState()
    );
    assert.equal(drop.right, true);
    assert.equal(drop.jump, false);
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

test('the pilot commits across crusher lanes mid-air with fuel', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const piston = (overrides = {}) => ({
        id: 'crusher-1',
        type: 'crusher',
        x: 700,
        y: 380,
        w: 64,
        h: 22,
        left: 668,
        right: 732,
        top: 369,
        active: true,
        enable: true,
        origin: { x: 700, y: 360 },
        target: { x: 700, y: 490 },
        ...overrides,
    });
    const base = {
        player: { x: 520, y: 440, vx: 160, vy: 50, grounded: false },
        crown: { x: 5000, y: 690 },
        platforms: [{ left: -100, right: 1200, top: 498, x: 550, w: 1300 }],
    };
    // Descending piston over open gap, fuel left: commit to the
    // crossing and spend the double (no deck to land short on).
    const gapBase = {
        ...base,
        platforms: [{ left: -100, right: 400, top: 498, x: 150, w: 500 }],
    };
    const commitState = createPilotState();
    decidePilotInput(
        makeSnap({ ...gapBase, jumpCount: 1, elapsedMs: 1000, hazards: [piston({ y: 380 })] }),
        commitState
    );
    const commit = decidePilotInput(
        makeSnap({ ...gapBase, jumpCount: 1, elapsedMs: 1100, hazards: [piston({ y: 400 })] }),
        commitState
    );
    assert.equal(commit.left, false);
    assert.equal(commit.right, true);
    assert.equal(commit.jump, true);
    // Same piston with a deck underfoot: veer off to land short even
    // with fuel left — landing short saves the double for real gaps.
    const veerState = createPilotState();
    decidePilotInput(
        makeSnap({ ...base, jumpCount: 1, elapsedMs: 1000, hazards: [piston({ y: 380 })] }),
        veerState
    );
    const veer = decidePilotInput(
        makeSnap({ ...base, jumpCount: 1, elapsedMs: 1100, hazards: [piston({ y: 400 })] }),
        veerState
    );
    assert.equal(veer.left, true);
    assert.equal(veer.right, false);
    assert.equal(veer.jump, false);
});

test('the pilot doubles over a piston lane when it sits low', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const snap = makeSnap({
        player: { x: 6300, y: 400, vx: 160, vy: 50, grounded: false },
        jumpCount: 1,
        crown: { x: 8000, y: 690 },
        platforms: [{ left: 6510, right: 7000, top: 570, x: 6755, w: 490 }],
        hazards: [
            {
                id: 'crusher-low',
                type: 'crusher',
                x: 6450,
                y: 560,
                w: 64,
                h: 22,
                left: 6418,
                right: 6482,
                top: 549,
                active: true,
                enable: true,
                origin: { x: 6450, y: 420 },
                target: { x: 6450, y: 560 },
            },
        ],
    });
    const input = decidePilotInput(snap, createPilotState());
    assert.equal(input.right, true);
    assert.equal(input.jump, true);
    // Same piston 190px out: hold the arc for the late window instead
    // of doubling early into the next lane. (Takeoff set: a fresh
    // mid-air spawn would rightly double for the gap below.)
    const earlyState = createPilotState();
    earlyState.takeoffY = 582;
    const early = decidePilotInput(
        makeSnap({
            player: { x: 6260, y: 400, vx: 160, vy: 50, grounded: false },
            jumpCount: 1,
            crown: { x: 8000, y: 690 },
            platforms: [{ left: 6510, right: 7000, top: 570, x: 6755, w: 490 }],
            hazards: [
                {
                    id: 'crusher-low',
                    type: 'crusher',
                    x: 6450,
                    y: 560,
                    w: 64,
                    h: 22,
                    left: 6418,
                    right: 6482,
                    top: 549,
                    active: true,
                    enable: true,
                    origin: { x: 6450, y: 420 },
                    target: { x: 6450, y: 560 },
                },
            ],
        }),
        earlyState
    );
    assert.equal(early.right, true);
    assert.equal(early.jump, false);
});

test('the pilot never veers off a piston lane over open gap', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const piston = (overrides = {}) => ({
        id: 'crusher-1',
        type: 'crusher',
        x: 6650,
        y: 420,
        w: 64,
        h: 22,
        left: 6618,
        right: 6682,
        top: 409,
        active: true,
        enable: true,
        origin: { x: 6650, y: 420 },
        target: { x: 6650, y: 560 },
        ...overrides,
    });
    const base = {
        jumpCount: 2,
        maxJumps: 2,
        player: { x: 6490, y: 410, vx: 160, vy: 75, grounded: false },
        crown: { x: 11660, y: 400 },
        platforms: [
            { left: 5762, right: 6338, top: 598, x: 6050, w: 576 },
            { left: 6510, right: 6990, top: 568, x: 6750, w: 480 },
        ],
    };
    // Spent fuel over the gap short of a slamming piston: the veer-off
    // would drive back into the pit, so commit to the crossing.
    const state = createPilotState();
    decidePilotInput(makeSnap({ ...base, elapsedMs: 1000, hazards: [piston({ y: 420 })] }), state);
    const commit = decidePilotInput(
        makeSnap({ ...base, elapsedMs: 1100, hazards: [piston({ y: 424 })] }),
        state
    );
    assert.equal(commit.left, false);
    assert.equal(commit.right, true);
});

test('the pilot ignores grounded flicker under a higher deck', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const platforms = [
        { left: 5762, right: 6338, top: 598, x: 6050, w: 576 },
        { left: 6000, right: 6450, top: 500, x: 6225, w: 450 },
        { left: 5858, right: 6242, top: 458, x: 6050, w: 384 },
        { left: 6510, right: 6990, top: 568, x: 6750, w: 480 },
    ];
    const state = createPilotState();
    // A grounded stride sets takeoffY to deck level.
    decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            player: { x: 6090, y: 582, vx: 160, vy: 0, grounded: true },
            crown: { x: 11660, y: 400 },
            platforms,
        }),
        state
    );
    // Segmented-deck flicker: ungrounded for a tick at deck level with
    // the shelf overhead. Climbing would burn the jump into the lid.
    const out = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            player: { x: 6106, y: 582, vx: 160, vy: 30, grounded: false },
            crown: { x: 11660, y: 400 },
            platforms,
        }),
        state
    );
    assert.equal(out.jump, false);
    assert.equal(out.right, true);
});

test('the pilot never climbs a deck it already passed', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const platforms = [
        { left: 6510, right: 6990, top: 568, x: 6750, w: 480 },
        { left: 5858, right: 6242, top: 458, x: 6050, w: 384 },
    ];
    const state = createPilotState();
    decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            player: { x: 6500, y: 546, vx: 160, vy: 0, grounded: true },
            crown: { x: 11660, y: 400 },
            platforms,
        }),
        state
    );
    // The shelf behind is landable on the backward arc, but the double
    // flies goalward — firing wastes the fuel, so hold the arc.
    const out = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            jumpCount: 1,
            player: { x: 6538, y: 440, vx: 160, vy: 100, grounded: false },
            crown: { x: 11660, y: 400 },
            platforms,
        }),
        state
    );
    assert.equal(out.jump, false);
    assert.equal(out.right, true);
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
    // Synchronized shadow (matched velocity) with a hop that sails
    // past the deck edge: descend track-facing it instead of hopping
    // into the pit — the bolts kill it at bolt level.
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
    assert.equal(shadow.jump, false);
    assert.equal(shadow.left, true);
    assert.equal(shadow.right, false);
    assert.equal(shadow.shoot, true);
    // Chaser stopped underfoot mid-turn (vx 0, unknown heading): the
    // touchdown projects crowded and the hop sails past the deck, so
    // descend track-facing it — the kill lands at bolt level.
    const turn = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            phaser: true,
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 4065, y: 371, vx: 160, vy: 375, grounded: false, facing: 'right' },
            crown: { x: 12050, y: 236 },
            platforms: [{ left: 4008, right: 4392, top: 468, x: 4200, w: 384 }],
            hazards: [
                {
                    id: 'boarder-4',
                    type: 'boarder',
                    x: 4059,
                    y: 450,
                    w: 40,
                    h: 48,
                    active: true,
                    enable: true,
                    chasing: true,
                    vx: 0,
                    vy: 0,
                },
            ],
            bombs: [],
            columns: [],
        }),
        createPilotState()
    );
    assert.equal(turn.jump, false);
    assert.equal(turn.left, true);
    assert.equal(turn.shoot, true);
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

test('the spent double-back flies for the deck behind, then drops on', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const platforms = [
        { left: 4008, right: 4392, top: 468, x: 4200, w: 384 },
        { left: 3763, right: 3897, top: 328, x: 3830, w: 134 },
    ];
    // Crowded touchdown, forward hop overshoots, deck behind in range:
    // arm the window and spend the double back toward it.
    const trigger = createPilotState();
    const back = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            phaser: true,
            jumpCount: 1,
            maxJumps: 2,
            elapsedMs: 50000,
            player: { x: 4065, y: 371, vx: 160, vy: 375, grounded: false, facing: 'right' },
            crown: { x: 12050, y: 236 },
            platforms,
            hazards: [
                {
                    id: 'boarder-4',
                    type: 'boarder',
                    x: 4059,
                    y: 450,
                    w: 40,
                    h: 48,
                    active: true,
                    enable: true,
                    chasing: true,
                    vx: 0,
                    vy: 0,
                },
            ],
            bombs: [],
            columns: [],
        }),
        trigger
    );
    assert.equal(back.jump, true);
    assert.equal(back.left, true);
    assert.equal(back.right, false);
    assert.equal(trigger.doubledBackUntil, 52500);
    // Armed window, fuel spent, off the entry edge: fly back for it.
    const armed = createPilotState();
    armed.doubledBackUntil = 99999;
    const fly = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            phaser: true,
            jumpCount: 2,
            maxJumps: 2,
            elapsedMs: 51000,
            player: { x: 4100, y: 300, vx: -160, vy: 60, grounded: false, facing: 'left' },
            crown: { x: 12050, y: 236 },
            platforms,
            hazards: [],
        }),
        armed
    );
    assert.equal(fly.left, true);
    assert.equal(fly.right, false);
    assert.equal(fly.jump, false);
    // Still rising on the spent double: steer back already, so the
    // rise carries toward the deck instead of past it.
    const rise = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            phaser: true,
            jumpCount: 2,
            maxJumps: 2,
            elapsedMs: 50200,
            player: { x: 4060, y: 340, vx: -160, vy: -200, grounded: false, facing: 'left' },
            crown: { x: 12050, y: 236 },
            platforms,
            hazards: [],
        }),
        armed
    );
    assert.equal(rise.left, true);
    assert.equal(rise.right, false);
    assert.equal(rise.jump, false);
    // Over the entry edge: hold and drop onto the deck.
    const hold = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            phaser: true,
            jumpCount: 2,
            maxJumps: 2,
            elapsedMs: 51500,
            player: { x: 3870, y: 280, vx: 0, vy: 200, grounded: false, facing: 'left' },
            crown: { x: 12050, y: 236 },
            platforms,
            hazards: [],
        }),
        armed
    );
    assert.equal(hold.left, false);
    assert.equal(hold.right, false);
    assert.equal(hold.jump, false);
    // Touchdown disarms the window so later gap doubles fly free.
    const landed = createPilotState();
    landed.doubledBackUntil = 99999;
    decidePilotInput(
        makeSnap({
            player: { x: 3870, y: 306, vx: 0, vy: 0, grounded: true, facing: 'left' },
            crown: { x: 12050, y: 236 },
            platforms,
        }),
        landed
    );
    assert.equal(landed.doubledBackUntil, 0);
});

test('a column threat preempts the double-back flight, and the hop flees it', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const platforms = [
        { left: 4008, right: 4392, top: 468, x: 4200, w: 384 },
        { left: 3763, right: 3897, top: 328, x: 3830, w: 134 },
    ];
    const wideDeck = [{ left: 3700, right: 4392, top: 468, x: 4046, w: 692 }];
    const chaser = (x, y, overrides = {}) => ({
        id: 'boarder-9',
        type: 'boarder',
        x,
        y,
        w: 40,
        h: 48,
        active: true,
        enable: true,
        chasing: true,
        vx: 0,
        vy: 0,
        ...overrides,
    });
    // Control: no threat, armed window, fuel spent — the flight steers
    // back for the deck behind (left).
    const armed = createPilotState();
    armed.doubledBackUntil = 99999;
    const fly = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            phaser: true,
            jumpCount: 2,
            maxJumps: 2,
            elapsedMs: 51000,
            player: { x: 4100, y: 300, vx: -160, vy: 200, grounded: false, facing: 'left' },
            crown: { x: 12050, y: 236 },
            platforms,
            hazards: [],
        }),
        armed
    );
    assert.equal(fly.left, true);
    assert.equal(fly.right, false);
    // Same flight with a chaser in the column: steer away from the
    // threat (right) instead of riding the flight into it.
    const dodge = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            phaser: true,
            jumpCount: 2,
            maxJumps: 2,
            elapsedMs: 51000,
            player: { x: 4100, y: 300, vx: -160, vy: 200, grounded: false, facing: 'left' },
            crown: { x: 12050, y: 236 },
            platforms,
            hazards: [chaser(4080, 450)],
        }),
        armed
    );
    assert.equal(dodge.left, false);
    assert.equal(dodge.right, true);
    assert.equal(dodge.jump, false);
    // Crowded touchdown with fuel: hop away from the chaser (left),
    // not along the goal (right) into the pit past the edge.
    const hop = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            phaser: true,
            jumpCount: 1,
            maxJumps: 2,
            elapsedMs: 51000,
            player: { x: 4100, y: 400, vx: 0, vy: 200, grounded: false, facing: 'right' },
            crown: { x: 12050, y: 236 },
            platforms: wideDeck,
            hazards: [chaser(4130, 470)],
        }),
        createPilotState()
    );
    assert.equal(hop.left, true);
    assert.equal(hop.right, false);
    assert.equal(hop.jump, true);
    // Spent fuel falling past a boss column at the deck edge: brake
    // toward the middle instead of riding away into the pit (L14 trace).
    const spent = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            phaser: true,
            jumpCount: 2,
            maxJumps: 2,
            elapsedMs: 51000,
            player: { x: 12580, y: -99, vx: 160, vy: 125, grounded: false, facing: 'right' },
            crown: { x: 12400, y: 254, shielded: true },
            platforms: [{ left: 12208, right: 12592, top: 314, x: 12400, w: 384 }],
            hazards: [
                {
                    id: 'boss-1',
                    type: 'boss',
                    x: 12570,
                    y: 283,
                    w: 130,
                    h: 90,
                    active: true,
                    enable: true,
                    phase: 'pace',
                    hp: 11,
                    maxHp: 14,
                },
            ],
        }),
        createPilotState()
    );
    assert.equal(spent.left, true);
    assert.equal(spent.right, false);
    assert.equal(spent.jump, false);
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
    // Drone 58px behind the takeoff: still wait — the mount rises
    // forward straight into its patrol right-end.
    const behind = decidePilotInput(
        makeSnap({ ...base, hazards: [drone(3119)] }),
        createPilotState()
    );
    assert.equal(behind.right, true);
    assert.equal(behind.jump, false);
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

test('buildPilotSource stitches every brain function the page can call', async () => {
    const { buildPilotSource } = await importModule('scripts/pilot-brain.mjs');
    const fs = require('node:fs');
    const moduleSource = fs.readFileSync(path.join(projectRoot, 'scripts/pilot-brain.mjs'), 'utf8');
    const defined = new Set();
    for (const match of moduleSource.matchAll(/^(?:export )?function ([A-Za-z0-9_]+)\(/gm)) {
        if (match[1] !== 'buildPilotSource') {
            defined.add(match[1]);
        }
    }
    assert.ok(defined.size > 50, `expected dozens of brain functions, saw ${defined.size}`);
    const stitched = buildPilotSource();
    const missing = [...defined].filter((name) => !stitched.includes(`function ${name}(`));
    assert.deepEqual(missing, []);
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
    // A falling snap with a boarder below exercises the descent escape
    // (bolt projection, double-back flight): it must tick without error.
    // A missing BRAIN_PARTS entry throws here, not silently in the page.
    sandbox.window.__spaceChickenDebug = {
        getBotSnapshot: () => ({
            ready: true,
            phaser: true,
            jumpCount: 1,
            maxJumps: 2,
            elapsedMs: 51000,
            killZoneY: 740,
            physics: { gravityY: 300 },
            player: { x: 4065, y: 371, vx: 160, vy: 375, grounded: false, facing: 'right' },
            crown: { x: 12050, y: 236 },
            platforms: [
                { left: 4008, right: 4392, top: 468, x: 4200, w: 384 },
                { left: 3763, right: 3897, top: 328, x: 3830, w: 134 },
            ],
            hazards: [
                {
                    id: 'boarder-4',
                    type: 'boarder',
                    x: 4059,
                    y: 450,
                    w: 40,
                    h: 48,
                    active: true,
                    enable: true,
                    chasing: true,
                    vx: 0,
                    vy: 0,
                },
            ],
            bombs: [],
            columns: [],
        }),
        setBotInput: (input) => {
            lastInput = input;
        },
    };
    callbacks[0]();
    assert.equal(sandbox.window.__spaceChickenPilotError, null);
    assert.equal(JSON.parse(JSON.stringify(lastInput)).jump, true);
});

test('the pilot jumps early when an edge takeoff would overshoot a narrow landing', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // L1 gap pattern at gravity 300 (range 352): from x=192 the jump lands
    // mid-run (544), but an edge takeoff (348) sails to 644+ past the run.
    const snap = makeSnap({
        physics: { gravityY: 300 },
        player: { x: 192, y: 548, vx: 160, vy: 0, grounded: true },
        crown: { x: 1800, y: 350 },
        platforms: [
            { left: -48, right: 348, top: 570, x: 150, w: 396 },
            { left: 452, right: 648, top: 570, x: 550, w: 196 },
        ],
    });
    const input = decidePilotInput(snap, createPilotState());
    assert.equal(input.jump, true);
    assert.equal(input.right, true);
});

test('the pilot runs to the edge when the edge takeoff lands fine', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Wide landing: the edge takeoff lands on it, so no early jump.
    const snap = makeSnap({
        physics: { gravityY: 300 },
        player: { x: 192, y: 548, vx: 160, vy: 0, grounded: true },
        crown: { x: 1800, y: 350 },
        platforms: [
            { left: -48, right: 348, top: 570, x: 150, w: 396 },
            { left: 452, right: 1200, top: 570, x: 826, w: 748 },
        ],
    });
    const input = decidePilotInput(snap, createPilotState());
    assert.equal(input.jump, false);
    assert.equal(input.right, true);
});

test('the pilot holds its double when the arc sails past the high deck', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // L1 waste case: falling at (583,447) with a deck at 768-832/468. The
    // old near-miss check fired; the double apexes 180px above the deck
    // and touches down at ~934, past the far edge — so hold it.
    const state = createPilotState();
    state.takeoffY = 554;
    const snap = makeSnap({
        physics: { gravityY: 300 },
        jumpCount: 1,
        maxJumps: 2,
        player: { x: 583, y: 447, vx: 160, vy: 205, grounded: false },
        crown: { x: 1800, y: 350 },
        platforms: [
            { left: -48, right: 1200, top: 570, x: 576, w: 1248 },
            { left: 768, right: 832, top: 468, x: 800, w: 64 },
        ],
    });
    const input = decidePilotInput(snap, state);
    assert.equal(input.jump, false);
});

test('the pilot still doubles onto a high deck it can actually land on', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const state = createPilotState();
    state.takeoffY = 540;
    const snap = makeSnap({
        physics: { gravityY: 400 },
        jumpCount: 1,
        maxJumps: 2,
        player: { x: 640, y: 500, vx: 160, vy: 50, grounded: false },
        crown: { x: 1800, y: 350 },
        platforms: [
            { left: -48, right: 700, top: 570, x: 326, w: 748 },
            { left: 760, right: 860, top: 400, x: 810, w: 100 },
        ],
    });
    const input = decidePilotInput(snap, state);
    assert.equal(input.jump, true);
});

test('the pilot skips a max-range climb that grazes the deck corner', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const state = createPilotState();
    state.takeoffY = 577;
    // 292px out, verified landing 58px inside the near edge: airtime
    // shortfall eats the margin, so hold the arc for the safe landing
    // instead of sliding off the deck side.
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 11175, y: 440, vx: 160, vy: 250, grounded: false },
            crown: { x: 11660, y: 400 },
            platforms: [{ left: 11467, right: 11813, top: 458, x: 11640, w: 346 }],
        }),
        state
    );
    assert.equal(input.jump, false);
    assert.equal(input.right, true);
});

test('the pilot lands instead of doubling off the touchdown', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Boots at deck level with the edge just ahead: the deck counts as
    // a landing (touchdown zone), so hold the drop instead of doubling
    // back up into a hover loop.
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            jumpCount: 1,
            maxJumps: 2,
            killZoneY: 756,
            player: { x: 8391, y: 546, vx: 160, vy: 320, grounded: false },
            crown: { x: 11660, y: 400 },
            platforms: [{ left: 8291, right: 8440, top: 568, x: 8365, w: 149 }],
        }),
        createPilotState()
    );
    assert.equal(input.jump, false);
    assert.equal(input.right, true);
});

test('the pilot runs flat ground instead of holding for a high platform', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // L2 stall: flat floor continues (same level) with a high platform
    // nearby. The old hold pinned the pilot forever; now it runs.
    const snap = makeSnap({
        physics: { gravityY: 400 },
        player: { x: 1856, y: 548, vx: 0, vy: 0, grounded: true },
        crown: { x: 2800, y: 350 },
        platforms: [
            { left: 1752, right: 1948, top: 570, x: 1850, w: 196 },
            { left: 2052, right: 3000, top: 570, x: 2526, w: 948 },
            { left: 1968, right: 2032, top: 190, x: 2000, w: 64 },
        ],
    });
    const input = decidePilotInput(snap, createPilotState());
    assert.equal(input.right, true);
    assert.equal(input.left, false);
});

test('the pilot still holds at a pit when the only way is high above', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Near the deck edge with no level continuation and a high landing:
    // stay put instead of running off into the pit.
    const snap = makeSnap({
        physics: { gravityY: 330 },
        player: { x: 350, y: 720, vx: 0, vy: 0, grounded: true },
        crown: { x: 2580, y: 130 },
        platforms: [
            { left: 96, right: 404, top: 742, x: 250, w: 308 },
            { left: 410, right: 576, top: 288, x: 493, w: 166 },
        ],
    });
    assert.deepEqual(decidePilotInput(snap, createPilotState()), {
        left: false,
        right: false,
        jump: false,
        shoot: false,
        start: false,
    });
});

test('the pilot jumps to apex over a lift it cannot reach by landing', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // L3 crossing: full jumps overshoot the lift, so board by apexing
    // over it (the descent drops on). Takeoff 100 apexes at 303 over the
    // lift; the lift top sits below the apex with no upward rush.
    const snap = makeSnap({
        physics: { gravityY: 260 },
        player: { x: 110, y: 753, vx: 0, vy: 0, grounded: true },
        crown: { x: 2050, y: 220 },
        platforms: [
            { left: 105, right: 335, top: 775, x: 220, w: 230, type: 'static_platform' },
            {
                left: 262,
                right: 378,
                top: 700,
                x: 320,
                w: 116,
                h: 10,
                type: 'moving_platform',
                origin: { x: 320, y: 780 },
                target: { x: 320, y: 640 },
            },
        ],
    });
    const input = decidePilotInput(snap, createPilotState());
    assert.equal(input.jump, true);
    assert.equal(input.right, true);
});

test('the pilot waits when the lift is rushing up past the apex', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Same window, but the lift rushes upward: hold the takeoff.
    const state = createPilotState();
    state.liftPrev['moving_platform-2'] = { x: 320, y: 700, t: 0 };
    const snap = makeSnap({
        physics: { gravityY: 260 },
        elapsedMs: 100,
        player: { x: 110, y: 753, vx: 0, vy: 0, grounded: true },
        crown: { x: 2050, y: 220 },
        platforms: [
            { left: 105, right: 335, top: 775, x: 220, w: 230, type: 'static_platform' },
            {
                id: 'moving_platform-2',
                left: 262,
                right: 378,
                top: 690,
                x: 320,
                y: 695,
                w: 116,
                h: 10,
                type: 'moving_platform',
                origin: { x: 320, y: 780 },
                target: { x: 320, y: 640 },
            },
        ],
    });
    const input = decidePilotInput(snap, state);
    assert.equal(input.jump, false);
    assert.equal(input.right, false);
    assert.equal(state.holdStill, true);
});

test('the pilot walks onto a level lift instead of jumping over it', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const snap = makeSnap({
        physics: { gravityY: 260 },
        player: { x: 300, y: 753, vx: 0, vy: 0, grounded: true },
        crown: { x: 2050, y: 220 },
        platforms: [
            { left: 105, right: 335, top: 775, x: 220, w: 230, type: 'static_platform' },
            {
                left: 340,
                right: 456,
                top: 770,
                x: 398,
                w: 116,
                h: 10,
                type: 'moving_platform',
                origin: { x: 398, y: 780 },
                target: { x: 398, y: 640 },
            },
        ],
    });
    const input = decidePilotInput(snap, createPilotState());
    assert.equal(input.jump, false);
    assert.equal(input.right, true);
});

test('the falling pilot steers its drop onto a lift below', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const snap = makeSnap({
        physics: { gravityY: 260 },
        jumpCount: 1,
        maxJumps: 2,
        player: { x: 700, y: 400, vx: 160, vy: 100, grounded: false },
        crown: { x: 2050, y: 220 },
        platforms: [
            {
                left: 702,
                right: 818,
                top: 500,
                x: 760,
                w: 116,
                h: 10,
                type: 'moving_platform',
                origin: { x: 760, y: 640 },
                target: { x: 760, y: 500 },
            },
        ],
    });
    const input = decidePilotInput(snap, createPilotState());
    assert.equal(input.right, true);
    assert.equal(input.jump, false);
});

test('the pilot rides a lift until a dismount opens', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Lift far below the only static deck: stay aboard, no leap.
    const ride = makeSnap({
        physics: { gravityY: 260 },
        player: { x: 760, y: 613, vx: 0, vy: 0, grounded: true },
        crown: { x: 2050, y: 220 },
        platforms: [
            {
                left: 702,
                right: 818,
                top: 635,
                x: 760,
                w: 116,
                h: 10,
                type: 'moving_platform',
                origin: { x: 760, y: 640 },
                target: { x: 760, y: 500 },
            },
            { left: 883, right: 1037, top: 550, x: 960, w: 154, type: 'static_platform' },
        ],
    });
    const state = createPilotState();
    const held = decidePilotInput(ride, state);
    assert.equal(held.right, false);
    assert.equal(held.jump, false);
    assert.equal(state.holdStill, true);
    // Lift risen near the deck below: run off toward it (a leap would
    // overshoot the close deck).
    const leave = makeSnap({
        physics: { gravityY: 260 },
        player: { x: 760, y: 478, vx: 0, vy: 0, grounded: true },
        crown: { x: 2050, y: 220 },
        platforms: [
            {
                left: 702,
                right: 818,
                top: 500,
                x: 760,
                w: 116,
                h: 10,
                type: 'moving_platform',
                origin: { x: 760, y: 640 },
                target: { x: 760, y: 500 },
            },
            { left: 883, right: 1037, top: 550, x: 960, w: 154, type: 'static_platform' },
        ],
    });
    const jumped = decidePilotInput(leave, createPilotState());
    assert.equal(jumped.jump, false);
    assert.equal(jumped.right, true);
    // Deck above the lift: the dismount needs a leap for the height.
    const leap = makeSnap({
        physics: { gravityY: 260 },
        player: { x: 760, y: 613, vx: 0, vy: 0, grounded: true },
        crown: { x: 2050, y: 220 },
        platforms: [
            {
                left: 702,
                right: 818,
                top: 635,
                x: 760,
                w: 116,
                h: 10,
                type: 'moving_platform',
                origin: { x: 760, y: 640 },
                target: { x: 760, y: 500 },
            },
            { left: 883, right: 1037, top: 580, x: 960, w: 154, type: 'static_platform' },
        ],
    });
    const leapt = decidePilotInput(leap, createPilotState());
    assert.equal(leapt.jump, true);
    assert.equal(leapt.right, true);
});

test('the pilot steps away from a ray column on top of it', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Warning 33px ahead: freezing touches the strike edge, so evacuate.
    const snap = makeSnap({
        physics: { gravityY: 180 },
        player: { x: 1227, y: 457, vx: 0, vy: 0, grounded: true },
        crown: { x: 2550, y: 222 },
        platforms: [{ left: -100, right: 2000, top: 479, x: 950, w: 2100 }],
        columns: [{ x: 1260, y: 400, w: 36, h: 700, warning: true }],
    });
    const input = decidePilotInput(snap, createPilotState());
    assert.equal(input.left, true);
    assert.equal(input.right, false);
});

test('the pilot holds its dismount when a drone holds the deck', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const snap = makeSnap({
        physics: { gravityY: 260 },
        player: { x: 760, y: 478, vx: 0, vy: 0, grounded: true },
        crown: { x: 2050, y: 220 },
        platforms: [
            {
                left: 702,
                right: 818,
                top: 500,
                x: 760,
                w: 116,
                h: 10,
                type: 'moving_platform',
                origin: { x: 760, y: 640 },
                target: { x: 760, y: 500 },
            },
            { left: 883, right: 1037, top: 550, x: 960, w: 154, type: 'static_platform' },
        ],
        hazards: [
            {
                id: 'drone-1',
                type: 'drone',
                x: 960,
                y: 500,
                w: 40,
                h: 40,
                top: 480,
                active: true,
                enable: true,
            },
        ],
    });
    const input = decidePilotInput(snap, createPilotState());
    assert.equal(input.jump, false);
    assert.equal(input.right, false);
});

test('the pilot times its dismount to a patrol moving away', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const base = {
        physics: { gravityY: 260 },
        elapsedMs: 100,
        player: { x: 760, y: 478, vx: 0, vy: 0, grounded: true },
        crown: { x: 2050, y: 220 },
        platforms: [
            {
                left: 702,
                right: 818,
                top: 500,
                x: 760,
                w: 116,
                h: 10,
                type: 'moving_platform',
                origin: { x: 760, y: 640 },
                target: { x: 760, y: 500 },
            },
            { left: 883, right: 1037, top: 550, x: 960, w: 154, type: 'static_platform' },
        ],
    };
    const droneAt = (x) => ({
        id: 'drone-9',
        type: 'drone',
        x,
        y: 500,
        w: 40,
        h: 40,
        top: 480,
        active: true,
        enable: true,
    });
    // Drone 87px past the touchdown, moving away: release the dismount.
    const away = createPilotState();
    away.threatPrev['drone-9'] = { x: 1000, t: 0 };
    const released = decidePilotInput(makeSnap({ ...base, hazards: [droneAt(1020)] }), away);
    assert.equal(released.right, true);
    // Same spot, closing on the touchdown: hold aboard.
    const closing = createPilotState();
    closing.threatPrev['drone-9'] = { x: 1040, t: 0 };
    const held = decidePilotInput(makeSnap({ ...base, hazards: [droneAt(1020)] }), closing);
    assert.equal(held.right, false);
    assert.equal(held.jump, false);
});

test('the pilot holds its hop while a patrol closes, then leaps the opening', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const base = {
        physics: { gravityY: 180 },
        elapsedMs: 100,
        player: { x: 500, y: 548, vx: 0, vy: 0, grounded: true },
        crown: { x: 2550, y: 222 },
        platforms: [{ left: -100, right: 2000, top: 570, x: 950, w: 2100 }],
    };
    const roverAt = (x) => ({
        id: 'rover-3',
        type: 'rover',
        x,
        y: 548,
        w: 36,
        h: 36,
        top: 530,
        active: true,
        enable: true,
    });
    // Rover 70px out and closing: hold the hop for the opening.
    const closing = createPilotState();
    closing.threatPrev['rover-3'] = { x: 580, t: 0 };
    const held = decidePilotInput(makeSnap({ ...base, hazards: [roverAt(560)] }), closing);
    assert.equal(held.jump, false);
    assert.equal(held.right, false);
    // Same spot, opening away: take the leap.
    const opening = createPilotState();
    opening.threatPrev['rover-3'] = { x: 540, t: 0 };
    const leapt = decidePilotInput(makeSnap({ ...base, hazards: [roverAt(560)] }), opening);
    assert.equal(leapt.jump, true);
    assert.equal(leapt.right, true);
});

test('the pilot backs out of a closing patrol instead of standing in it', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const state = createPilotState();
    state.threatPrev['rover-3'] = { x: 590, t: 0 };
    const snap = makeSnap({
        physics: { gravityY: 180 },
        elapsedMs: 100,
        player: { x: 540, y: 548, vx: 0, vy: 0, grounded: true },
        crown: { x: 2550, y: 222 },
        platforms: [{ left: -100, right: 2000, top: 570, x: 950, w: 2100 }],
        hazards: [
            {
                id: 'rover-3',
                type: 'rover',
                x: 570,
                y: 548,
                w: 36,
                h: 36,
                top: 530,
                active: true,
                enable: true,
            },
        ],
    });
    const input = decidePilotInput(snap, state);
    assert.equal(input.left, true);
    assert.equal(input.right, false);
    assert.equal(input.jump, false);
});

test('the pilot backs up to board instead of hopping a patrol mid-boarding', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Past the apex window with no walk-on: back up for the takeoff even
    // with a drone in hop range (the hop would spend the jump over the pit).
    const snap = makeSnap({
        physics: { gravityY: 180 },
        player: { x: 1015, y: 515, vx: 0, vy: 0, grounded: true },
        crown: { x: 2550, y: 222 },
        platforms: [
            { left: 930, right: 1070, top: 537, x: 1000, w: 140, type: 'static_platform' },
            {
                left: 1140,
                right: 1260,
                top: 515,
                x: 1200,
                w: 120,
                h: 10,
                type: 'moving_platform',
                origin: { x: 1200, y: 520 },
                target: { x: 1200, y: 415 },
            },
        ],
        hazards: [
            {
                id: 'drone-1',
                type: 'drone',
                x: 1060,
                y: 500,
                w: 40,
                h: 40,
                top: 480,
                active: true,
                enable: true,
            },
        ],
    });
    const input = decidePilotInput(snap, createPilotState());
    assert.equal(input.left, true);
    assert.equal(input.jump, false);
});

test('the pilot holds its double under a deck instead of bonking', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Falling beside a lift with the deck crossing the rise column: the
    // double would bonk, so drift out with fuel saved.
    const state = createPilotState();
    state.takeoffY = 515;
    const snap = makeSnap({
        physics: { gravityY: 180 },
        jumpCount: 1,
        maxJumps: 2,
        player: { x: 1593, y: 478, vx: 160, vy: 340, grounded: false },
        crown: { x: 2550, y: 222 },
        platforms: [
            {
                left: 1578,
                right: 1702,
                top: 450,
                x: 1640,
                w: 124,
                h: 10,
                type: 'moving_platform',
                origin: { x: 1640, y: 455 },
                target: { x: 1740, y: 375 },
            },
        ],
    });
    const input = decidePilotInput(snap, state);
    assert.equal(input.jump, false);
    assert.equal(input.right, true);
});

test('the pilot rides a lift it stands on the edge of', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Center 4px past the lift edge with the body overlapping: the ride
    // holds instead of running off into the pit (center-only support
    // missed the stand and ran).
    const snap = makeSnap({
        physics: { gravityY: 180 },
        player: { x: 469, y: 548, vx: 0, vy: 0, grounded: true },
        crown: { x: 2550, y: 222 },
        platforms: [
            {
                left: 345,
                right: 465,
                top: 570,
                x: 405,
                w: 120,
                h: 10,
                type: 'moving_platform',
                origin: { x: 405, y: 650 },
                target: { x: 405, y: 570 },
            },
        ],
    });
    const input = decidePilotInput(snap, createPilotState());
    assert.equal(input.right, false);
    assert.equal(input.jump, false);
});

test('the pilot holds a double that drifts into a deck underside', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Beside a deck, drifting under it: the rise column 40px along the
    // drift crosses the deck, so the double holds instead of bonking.
    const state = createPilotState();
    state.takeoffY = 515;
    const snap = makeSnap({
        physics: { gravityY: 180 },
        jumpCount: 1,
        maxJumps: 2,
        player: { x: 494, y: 636, vx: 160, vy: 340, grounded: false },
        crown: { x: 2550, y: 222 },
        platforms: [{ left: 510, right: 670, top: 612, x: 590, w: 160, type: 'static_platform' }],
    });
    const input = decidePilotInput(snap, state);
    assert.equal(input.jump, false);
    assert.equal(input.right, true);
});

test('the airborne pilot veers off a bomb instead of steering into it', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Falling past a bomb ahead: veer away with fuel saved (the old
    // toward-steer abandoned lift drops into the pit).
    const bomb = { id: 'bomb-1', x: 510, y: 421, vx: -100, vy: 60, w: 20, h: 20, active: true };
    const snap = makeSnap({
        physics: { gravityY: 180 },
        jumpCount: 1,
        maxJumps: 2,
        player: { x: 459, y: 421, vx: 160, vy: 156, grounded: false },
        crown: { x: 2550, y: 222 },
        platforms: [
            {
                left: 345,
                right: 465,
                top: 617,
                x: 405,
                w: 120,
                h: 10,
                type: 'moving_platform',
                origin: { x: 405, y: 650 },
                target: { x: 405, y: 570 },
            },
        ],
        hazards: [],
        bombs: [bomb],
    });
    const input = decidePilotInput(snap, createPilotState());
    assert.equal(input.left, true);
    assert.equal(input.right, false);
    assert.equal(input.jump, false);
});

test('the pilot runs a cooling beam it can cross instead of leaping it', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Leapable narrow beam, cooling, window covering the crossing: run
    // through grounded (the leap used to fly over L11's wardens).
    const beam = {
        id: 'laser-1',
        type: 'laser',
        x: 1960,
        y: 540,
        w: 16,
        h: 90,
        left: 1952,
        right: 1968,
        top: 495,
        active: true,
        enable: true,
        phase: 'cooldown',
        timeUntilPhaseChangeMs: 5000,
    };
    const snap = makeSnap({
        physics: { gravityY: 300 },
        player: { x: 1893, y: 588, vx: 160, vy: 0, grounded: true },
        crown: { x: 5000, y: 690 },
        platforms: [{ left: 1753, right: 2367, top: 610, x: 2060, w: 614 }],
        hazards: [beam],
    });
    const input = decidePilotInput(snap, createPilotState());
    assert.equal(input.right, true);
    assert.equal(input.jump, false);
});

test('the pilot hops past a tracking chaser onto the next deck', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Falling toward a chaser shadowing underneath: the coast projection
    // claims the touchdown is clear, but trackers follow — hop forward
    // onto the deck catching the arc instead of descending onto it.
    const snap = makeSnap({
        physics: { gravityY: 300 },
        phaser: true,
        jumpCount: 1,
        maxJumps: 2,
        player: { x: 2064, y: 520, vx: 160, vy: 200, grounded: false, facing: 'right' },
        crown: { x: 5000, y: 690 },
        platforms: [
            { left: 1753, right: 2367, top: 610, x: 2060, w: 614 },
            { left: 2413, right: 3213, top: 576, x: 2813, w: 800 },
        ],
        hazards: [
            {
                id: 'boarder-2',
                type: 'boarder',
                x: 2063,
                y: 586,
                w: 40,
                h: 48,
                active: true,
                enable: true,
                chasing: true,
                vx: 0,
                vy: 0,
            },
        ],
    });
    const input = decidePilotInput(snap, createPilotState());
    assert.equal(input.jump, true);
    assert.equal(input.right, true);
});
test('the pilot steps out of a shallow beam instead of doubling', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Airborne 5px inside a firing span with fuel: step out and land,
    // never double — doubling here bounces off every touchdown.
    const shallow = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 8391, y: 549, vx: 160, vy: 320, grounded: false },
            crown: { x: 11660, y: 400 },
            platforms: [{ left: 8291, right: 8829, top: 568, x: 8560, w: 538 }],
            hazards: [
                {
                    id: 'laser-8500',
                    type: 'laser',
                    x: 8500,
                    y: 504,
                    w: 16,
                    h: 90,
                    left: 8492,
                    right: 8508,
                    top: 459,
                    active: true,
                    enable: true,
                    phase: 'active',
                    timeUntilPhaseChangeMs: 500,
                    orientation: 'vertical',
                },
            ],
        }),
        createPilotState()
    );
    assert.equal(shallow.left, true);
    assert.equal(shallow.right, false);
    assert.equal(shallow.jump, false);
});

test('the pilot commits to a beam leap instead of veering back', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Takeoff beside a dormant beam records the leap; the mid-arc
    // tick (beam now live, veer pulling back) holds its line
    // instead of dragging the flight back to the span edge.
    const beam = (active) => ({
        id: 'laser-8500',
        type: 'laser',
        x: 8500,
        y: 504,
        w: 16,
        h: 90,
        left: 8492,
        right: 8508,
        top: 459,
        active,
        enable: active,
        phase: active ? 'active' : 'cooldown',
        timeUntilPhaseChangeMs: active ? 500 : 900,
        orientation: 'vertical',
    });
    const deck = { left: 8291, right: 8829, top: 568, x: 8560, w: 538 };
    const state = createPilotState();
    const takeoff = decidePilotInput(
        makeSnap({
            elapsedMs: 5000,
            physics: { gravityY: 300 },
            jumpCount: 0,
            maxJumps: 2,
            player: { x: 8438, y: 552, vx: 160, vy: 0, grounded: true },
            crown: { x: 11660, y: 400 },
            platforms: [deck],
            hazards: [beam(false)],
        }),
        state
    );
    assert.equal(takeoff.right, true);
    assert.equal(takeoff.jump, true);
    assert.equal(state.beamLeap != null, true);
    const midarc = decidePilotInput(
        makeSnap({
            elapsedMs: 5100,
            physics: { gravityY: 300 },
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 8450, y: 480, vx: 160, vy: -100, grounded: false },
            crown: { x: 11660, y: 400 },
            platforms: [deck],
            hazards: [beam(true)],
        }),
        state
    );
    assert.equal(midarc.right, true);
    assert.equal(midarc.left, false);
    assert.equal(midarc.jump, false);
    decidePilotInput(
        makeSnap({
            elapsedMs: 5600,
            physics: { gravityY: 300 },
            jumpCount: 0,
            maxJumps: 2,
            player: { x: 8600, y: 552, vx: 160, vy: 0, grounded: true },
            crown: { x: 11660, y: 400 },
            platforms: [deck],
            hazards: [beam(true)],
        }),
        state
    );
    assert.equal(state.beamLeap, null);
});

test('the pilot brakes onto a rescue deck when its descent overshoots', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Falling with spent fuel over nothing landable: steer back onto
    // the deck below-left instead of sailing past at full run speed —
    // and hold the double, since the aim lands the flight itself.
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 180 },
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 1000, y: 400, vx: 160, vy: 200, grounded: false },
            crown: { x: 2000, y: 400 },
            platforms: [{ left: 800, right: 950, top: 550, x: 875, w: 150 }],
            hazards: [],
        }),
        createPilotState()
    );
    assert.equal(input.left, true);
    assert.equal(input.right, false);
    assert.equal(input.jump, false);
});

test('the pilot keeps goal steering when a deck waits below', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Touchdown lands mid-deck: routine crossings aim themselves, so
    // the rescue aim stays out.
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 180 },
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 830, y: 400, vx: 160, vy: 200, grounded: false },
            crown: { x: 2000, y: 400 },
            platforms: [{ left: 800, right: 950, top: 550, x: 875, w: 150 }],
            hazards: [],
        }),
        createPilotState()
    );
    assert.equal(input.right, true);
    assert.equal(input.left, false);
    assert.equal(input.jump, false);
});

test('the pilot never rescue-aims into a crusher lane', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // The only deck in reach sits under a live crusher: skip it and
    // keep goal steering instead of braking into the lane.
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 180 },
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 1000, y: 400, vx: 160, vy: 200, grounded: false },
            crown: { x: 2000, y: 400 },
            platforms: [{ left: 800, right: 950, top: 550, x: 875, w: 150 }],
            hazards: [
                {
                    id: 'crusher-1',
                    type: 'crusher',
                    x: 875,
                    y: 300,
                    w: 60,
                    h: 80,
                    active: true,
                    enable: true,
                },
            ],
        }),
        createPilotState()
    );
    assert.equal(input.right, true);
    assert.equal(input.left, false);
});

test('the pilot still rescue-aims when a mover holds the deck', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // A rover on the rescue deck shifts the touchdown to a clear end
    // instead of vetoing the deck: patrols clear, gaps do not.
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 180 },
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 1100, y: 400, vx: 160, vy: 200, grounded: false },
            crown: { x: 2000, y: 400 },
            platforms: [{ left: 700, right: 1050, top: 550, x: 875, w: 350 }],
            hazards: [
                {
                    id: 'rover-1',
                    type: 'rover',
                    x: 870,
                    y: 525,
                    w: 40,
                    h: 30,
                    active: true,
                    enable: true,
                },
            ],
        }),
        createPilotState()
    );
    assert.equal(input.left, true);
    assert.equal(input.right, false);
});

test('the pilot skips a rescue deck with no clear touchdown', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Mover and rock cover every touchdown candidate: skip the trap
    // deck and keep goal steering instead of landing beside them.
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 180 },
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 1000, y: 400, vx: 160, vy: 200, grounded: false },
            crown: { x: 2000, y: 400 },
            platforms: [{ left: 800, right: 950, top: 550, x: 875, w: 150 }],
            hazards: [
                {
                    id: 'rover-1',
                    type: 'rover',
                    x: 870,
                    y: 525,
                    w: 40,
                    h: 30,
                    active: true,
                    enable: true,
                },
                {
                    id: 'rock-1',
                    type: 'rock',
                    x: 920,
                    y: 530,
                    w: 40,
                    h: 40,
                    active: true,
                    enable: true,
                },
            ],
        }),
        createPilotState()
    );
    assert.equal(input.right, true);
    assert.equal(input.left, false);
});

test('the pilot latches its rescue aim instead of flapping', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Engaged steering left reverses vx, which flips the touchdown
    // projection safe — the latch holds the aim (hover-brake onto it)
    // instead of flapping back to goal steering.
    const deck = [{ left: 800, right: 950, top: 550, x: 875, w: 150 }];
    const state = createPilotState();
    const first = decidePilotInput(
        makeSnap({
            physics: { gravityY: 180 },
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 1000, y: 400, vx: 160, vy: 200, grounded: false },
            crown: { x: 2000, y: 400 },
            platforms: deck,
            hazards: [],
        }),
        state
    );
    assert.equal(first.left, true);
    const second = decidePilotInput(
        makeSnap({
            physics: { gravityY: 180 },
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 900, y: 420, vx: -160, vy: 220, grounded: false },
            crown: { x: 2000, y: 400 },
            platforms: deck,
            hazards: [],
        }),
        state
    );
    assert.equal(second.left, false);
    assert.equal(second.right, false);
});

test('the pilot never rescue-aims while rising', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Rising with spent fuel: hold goal steering (aiming mid-rise
    // anchors the flight onto the takeoff deck into a vertical pogo),
    // even centered over the deck.
    const deck = [{ left: 650, right: 800, top: 550, x: 725, w: 150 }];
    const rising = decidePilotInput(
        makeSnap({
            physics: { gravityY: 180 },
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 500, y: 400, vx: 160, vy: -100, grounded: false },
            crown: { x: 2000, y: 400 },
            platforms: deck,
            hazards: [],
        }),
        createPilotState()
    );
    assert.equal(rising.right, true);
    assert.equal(rising.left, false);
    assert.equal(rising.jump, false);
    const centered = decidePilotInput(
        makeSnap({
            physics: { gravityY: 180 },
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 730, y: 400, vx: 160, vy: -100, grounded: false },
            crown: { x: 2000, y: 400 },
            platforms: deck,
            hazards: [],
        }),
        createPilotState()
    );
    assert.equal(centered.right, true);
    assert.equal(centered.left, false);
});

test('the pilot brakes when its touchdown sails past the deck edge', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Over the deck edge but the touchdown lands past it: brake (full
    // speed either way overshoots the aim) instead of trusting the
    // straight-below column.
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 180 },
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 940, y: 400, vx: 160, vy: 200, grounded: false },
            crown: { x: 2000, y: 400 },
            platforms: [{ left: 800, right: 950, top: 550, x: 875, w: 150 }],
            hazards: [],
        }),
        createPilotState()
    );
    assert.equal(input.left, false);
    assert.equal(input.right, false);
    assert.equal(input.jump, false);
});

test('the pilot offsets its touchdown off a rock on the deck', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Touchdown lands mid-deck but on a rock: shift to the far end
    // (close enough to hover) instead of landing on it.
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 180 },
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 830, y: 400, vx: 160, vy: 200, grounded: false },
            crown: { x: 2000, y: 400 },
            platforms: [{ left: 800, right: 950, top: 550, x: 875, w: 150 }],
            hazards: [
                {
                    id: 'rock-1',
                    type: 'rock',
                    x: 910,
                    y: 540,
                    w: 40,
                    h: 40,
                    active: true,
                    enable: true,
                },
            ],
        }),
        createPilotState()
    );
    assert.equal(input.left, false);
    assert.equal(input.right, false);
    assert.equal(input.jump, false);
});

test('the pilot holds a fresh mover veto, then leaps over a stale one', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // A rover holding the dismount touchdown: wait for the opening at
    // first (patrol timing), but leap over after 2.5s of veto — a
    // patrol fully inside the threat radius never clears.
    const lift = { left: 365, right: 445, top: 622, x: 405, w: 80, type: 'moving_platform' };
    const deck = { left: 510, right: 670, top: 610, x: 590, w: 160 };
    const rover = {
        id: 'rover-1',
        type: 'rover',
        x: 560,
        y: 585,
        w: 40,
        h: 30,
        active: true,
        enable: true,
    };
    const snapAt = (elapsedMs) =>
        makeSnap({
            elapsedMs,
            physics: { gravityY: 180 },
            jumpCount: 0,
            maxJumps: 2,
            player: { x: 405, y: 600, vx: 0, vy: 0, grounded: true },
            crown: { x: 2550, y: 222 },
            platforms: [lift, deck],
            hazards: [rover],
        });
    const held = decidePilotInput(snapAt(5000), createPilotState());
    assert.equal(held.jump, false);
    assert.equal(held.right, false);
    const stale = createPilotState();
    stale.dismountVetoId = 'rover-1';
    stale.dismountVetoSince = 2000;
    const leapt = decidePilotInput(snapAt(5000), stale);
    assert.equal(leapt.jump, true);
    assert.equal(leapt.right, true);
    // A different threat restarts the wait instead of inheriting it.
    const switched = createPilotState();
    switched.dismountVetoId = 'other';
    switched.dismountVetoSince = 1000;
    const waited = decidePilotInput(snapAt(5000), switched);
    assert.equal(waited.jump, false);
    assert.equal(switched.dismountVetoId, 'rover-1');
});

test('the pilot aims at the deck center instead of anchoring over its end', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Rising over the takeoff deck: hold goal steering instead of
    // anchoring onto it (a vertical pogo that never translates).
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 180 },
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 160, y: 602, vx: 0, vy: -303, grounded: false },
            crown: { x: 2550, y: 222 },
            platforms: [{ left: 120, right: 320, top: 665, x: 220, w: 200 }],
            hazards: [],
        }),
        createPilotState()
    );
    assert.equal(input.right, true);
    assert.equal(input.left, false);
});

test('the airborne pilot dodges a bomb raining onto its head', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Falling with a live bomb 100px overhead and closing: sidestep
    // away instead of holding the flight into it.
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 180 },
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 500, y: 400, vx: 160, vy: 100, grounded: false },
            crown: { x: 2000, y: 400 },
            platforms: [{ left: -100, right: 2000, top: 700, x: 950, w: 2100 }],
            hazards: [],
            bombs: [{ id: 'bomb-1', x: 510, y: 300, vx: 0, vy: 180, w: 20, h: 20, active: true }],
        }),
        createPilotState()
    );
    assert.equal(input.left, true);
    assert.equal(input.right, false);
});

test('the airborne pilot ignores a distant bomb overhead', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Same flight with the bomb 100px to the side: hold course (the
    // emergency box stays tight so crossings never divert).
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 180 },
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 500, y: 400, vx: 160, vy: 100, grounded: false },
            crown: { x: 2000, y: 400 },
            platforms: [{ left: -100, right: 2000, top: 700, x: 950, w: 2100 }],
            hazards: [],
            bombs: [{ id: 'bomb-1', x: 600, y: 300, vx: 0, vy: 180, w: 20, h: 20, active: true }],
        }),
        createPilotState()
    );
    assert.equal(input.right, true);
    assert.equal(input.left, false);
});

test('the pilot centers on a lift instead of walking off its edge', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Riding a lift near its edge with the dismount rock-vetoed: step
    // toward the middle instead of holding into a walk-off.
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 180 },
            jumpCount: 0,
            maxJumps: 2,
            player: { x: 435, y: 600, vx: 0, vy: 0, grounded: true },
            crown: { x: 2550, y: 222 },
            platforms: [
                { left: 365, right: 445, top: 622, x: 405, w: 80, type: 'moving_platform' },
                { left: 510, right: 670, top: 610, x: 590, w: 160 },
            ],
            hazards: [
                {
                    id: 'rock-1',
                    type: 'rock',
                    x: 560,
                    y: 590,
                    w: 40,
                    h: 40,
                    active: true,
                    enable: true,
                },
            ],
        }),
        createPilotState()
    );
    assert.equal(input.left, true);
    assert.equal(input.right, false);
    assert.equal(input.jump, false);
});

test('the pilot doubles through a bonk veto when the killzone nears', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Falling past a deck edge with the killzone 124px below: the
    // drift would clip the deck corner, but a bonk beats dying.
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 180 },
            jumpCount: 0,
            maxJumps: 2,
            killZoneY: 760,
            player: { x: 494, y: 636, vx: 160, vy: 177, grounded: false },
            crown: { x: 2550, y: 222 },
            platforms: [{ left: 510, right: 670, top: 610, x: 590, w: 160 }],
            hazards: [],
        }),
        createPilotState()
    );
    assert.equal(input.jump, true);
});

test('the pilot doubles under a low ceiling only when dying', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Falling past a pit with a bonkable lid overhead: hold the double
    // when the floor is far, spend it when the killzone nears.
    const deck = [{ left: 510, right: 560, top: 500, x: 535, w: 50 }];
    const snapFor = (killZoneY) =>
        makeSnap({
            physics: { gravityY: 180 },
            jumpCount: 1,
            maxJumps: 2,
            killZoneY,
            player: { x: 494, y: 636, vx: 160, vy: 177, grounded: false },
            crown: { x: 2550, y: 222 },
            platforms: deck,
            hazards: [],
        });
    const dying = decidePilotInput(snapFor(760), createPilotState());
    assert.equal(dying.jump, true);
    const safe = decidePilotInput(snapFor(2000), createPilotState());
    assert.equal(safe.jump, false);
});

test('the pilot doubles a walk-off at once instead of waiting out the fall', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Just stepped off an edge (nowhere near 40px past takeoff, floor
    // far): double now — a walk-off never planned an arc, and waiting
    // drops it past the support it left.
    const state = createPilotState();
    state.takeoffY = 640;
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 180 },
            jumpCount: 0,
            maxJumps: 2,
            killZoneY: 2000,
            player: { x: 330, y: 640, vx: 160, vy: 50, grounded: false },
            crown: { x: 2550, y: 222 },
            platforms: [{ left: 118, right: 322, top: 666, x: 220, w: 204 }],
            hazards: [],
        }),
        state
    );
    assert.equal(input.jump, true);
    assert.equal(input.right, true);
});

test('the pilot holds outside a warning column instead of walking in', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Grounded with a warning column 70px ahead: hold position (the
    // strike lands within the second) instead of running into it.
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 180 },
            jumpCount: 0,
            maxJumps: 2,
            player: { x: 330, y: 650, vx: 0, vy: 0, grounded: true },
            crown: { x: 2550, y: 222 },
            platforms: [{ left: 118, right: 2000, top: 672, x: 1059, w: 1882 }],
            hazards: [],
            columns: [{ x: 400 }],
        }),
        createPilotState()
    );
    assert.equal(input.left, false);
    assert.equal(input.right, false);
    assert.equal(input.jump, false);
});

test('the airborne pilot retreats from a warning column instead of holding', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Falling toward a warning column 70px ahead with fuel and no
    // landing: double back out instead of holding into the killzone.
    // With fuel spent, hover-drop outside it instead.
    const snapFor = (jumpCount) =>
        makeSnap({
            physics: { gravityY: 180 },
            jumpCount,
            maxJumps: 2,
            player: { x: 330, y: 400, vx: 160, vy: 100, grounded: false },
            crown: { x: 2550, y: 222 },
            platforms: [],
            hazards: [],
            columns: [{ x: 400 }],
        });
    const retreat = decidePilotInput(snapFor(1), createPilotState());
    assert.equal(retreat.left, true);
    assert.equal(retreat.right, false);
    assert.equal(retreat.jump, true);
    const hover = decidePilotInput(snapFor(2), createPilotState());
    assert.equal(hover.left, false);
    assert.equal(hover.right, false);
});

test('the pilot dismounts at once when a column hangs over the lift', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Riding with a fresh mover veto but a warning column over the
    // lift: leap now instead of timing the veto out (the strike does
    // not wait for patrol timing). Early warning leaps toward the
    // target (exits before the strike); a live strike flees away from
    // the plane (crossing it dies mid-leap).
    const platforms = [
        { left: 345, right: 465, top: 622, x: 405, w: 120, type: 'moving_platform' },
        { left: 510, right: 670, top: 610, x: 590, w: 160 },
    ];
    const rover = {
        id: 'rover-1',
        type: 'rover',
        x: 560,
        y: 585,
        w: 40,
        h: 30,
        active: true,
        enable: true,
    };
    const snapFor = (extra) =>
        makeSnap({
            elapsedMs: 5000,
            physics: { gravityY: 180 },
            jumpCount: 0,
            maxJumps: 2,
            player: { x: 405, y: 600, vx: 0, vy: 0, grounded: true },
            crown: { x: 2550, y: 222 },
            platforms,
            hazards: [rover],
            ...extra,
        });
    const scheduleFor = (phase, timeUntilPhaseChangeMs) => [
        {
            id: 'cosmic_ray-22',
            kind: 'hazard_schedule',
            type: 'cosmic_ray',
            x: 420,
            y: 90,
            phase,
            intervalMs: 3600,
            warningDurationMs: 1100,
            activeDurationMs: 220,
            timeUntilPhaseChangeMs,
        },
    ];
    const early = decidePilotInput(
        snapFor({ hazardSchedules: scheduleFor('warning', 750) }),
        createPilotState()
    );
    assert.equal(early.jump, true);
    assert.equal(early.right, true);
    const live = decidePilotInput(
        snapFor({ hazardSchedules: scheduleFor('active', 100) }),
        createPilotState()
    );
    assert.equal(live.jump, true);
    assert.equal(live.left, true);
    assert.equal(live.right, false);
    const late = decidePilotInput(
        snapFor({ hazardSchedules: scheduleFor('warning', 100) }),
        createPilotState()
    );
    assert.equal(late.jump, true);
    assert.equal(late.left, true);
    const fallback = decidePilotInput(snapFor({ columns: [{ x: 420 }] }), createPilotState());
    assert.equal(fallback.jump, true);
    assert.equal(fallback.right, true);
});

test('the pilot doubles over a trap deck instead of landing on it', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Falling onto a deck whose every touchdown a rover covers: spend
    // the double to fly over it (the rescue aim already refused it).
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 180 },
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 600, y: 500, vx: 160, vy: 150, grounded: false },
            crown: { x: 2550, y: 222 },
            platforms: [{ left: 510, right: 670, top: 610, x: 590, w: 160 }],
            hazards: [
                {
                    id: 'rover-1',
                    type: 'rover',
                    x: 590,
                    y: 585,
                    w: 40,
                    h: 30,
                    active: true,
                    enable: true,
                },
                {
                    id: 'rock-1',
                    type: 'rock',
                    x: 655,
                    y: 590,
                    w: 40,
                    h: 40,
                    active: true,
                    enable: true,
                },
            ],
        }),
        createPilotState()
    );
    assert.equal(input.jump, true);
    assert.equal(input.right, true);
});

test('the pilot holds before a column when a landing waits below', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Falling toward a warning column with a deck under the arc: hold
    // and land instead of burning the double on a retreat.
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 180 },
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 1620, y: 400, vx: 160, vy: 200, grounded: false },
            crown: { x: 2550, y: 222 },
            platforms: [{ left: 1500, right: 1750, top: 650, x: 1625, w: 250 }],
            hazards: [],
            columns: [{ x: 1690 }],
        }),
        createPilotState()
    );
    assert.equal(input.left, false);
    assert.equal(input.right, false);
    assert.equal(input.jump, false);
});

test('the rising pilot backs out of a column without doubling', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Rising toward a warning column with fuel and no landing: steer
    // out laterally (the rise already exits vertically).
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 180 },
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 1620, y: 400, vx: 160, vy: -100, grounded: false },
            crown: { x: 2550, y: 222 },
            platforms: [],
            hazards: [],
            columns: [{ x: 1690 }],
        }),
        createPilotState()
    );
    assert.equal(input.left, true);
    assert.equal(input.right, false);
    assert.equal(input.jump, false);
});

test('the pilot doubles out of a column evacuation without a landing', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Falling inside a warning column with fuel and nothing below:
    // double along the escape instead of dropping through the plane.
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 180 },
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 1680, y: 500, vx: 0, vy: 200, grounded: false },
            crown: { x: 2550, y: 222 },
            platforms: [],
            hazards: [],
            columns: [{ x: 1690 }],
        }),
        createPilotState()
    );
    assert.equal(input.left, true);
    assert.equal(input.jump, true);
});

test('the pilot brakes onto a mandatory deck with no fuel left', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Falling over a safe deck with the double spent: brake to its
    // center instead of sailing past (no fuel recovers a miss).
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 180 },
            jumpCount: 2,
            maxJumps: 2,
            player: { x: 2600, y: 200, vx: 160, vy: 100, grounded: false },
            crown: { x: 3000, y: 222 },
            platforms: [{ left: 2523, right: 2677, top: 254, x: 2600, w: 154 }],
            hazards: [],
        }),
        createPilotState()
    );
    assert.equal(input.left, false);
    assert.equal(input.right, false);
    assert.equal(input.jump, false);
});

test('the airborne pilot dodges a bomb early instead of weaving under it', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Bomb 80px aside and 200px up, falling: the wide airborne box
    // engages (the old 35px box released at its edge and wove back
    // into the bomb lane every tick).
    const bomb = { id: 'bomb-9', x: 580, y: 200, vx: 0, vy: 300, w: 20, h: 20, active: true };
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 180 },
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 500, y: 400, vx: 160, vy: 100, grounded: false },
            crown: { x: 3000, y: 222 },
            platforms: [],
            hazards: [],
            bombs: [bomb],
        }),
        createPilotState()
    );
    assert.equal(input.left, true);
    assert.equal(input.right, false);
    assert.equal(input.jump, false);
});

test('the pilot dodges a drifting bomb by its aim point, not its body', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Bomb right of the pilot but drifting left onto an aim point left
    // of it: keep running right, away from where it lands (the old
    // body-x dodge reversed into its path).
    const bomb = { id: 'bomb-11', x: 526, y: 375, vx: -150, vy: 600, w: 20, h: 20, active: true };
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            player: { x: 505, y: 628, vx: 160, vy: 0, grounded: true },
            crown: { x: 900, y: 690 },
            platforms: [{ left: -100, right: 1200, top: 634, x: 550, w: 1300 }],
            hazards: [],
            bombs: [bomb],
        }),
        createPilotState()
    );
    assert.equal(input.left, false);
    assert.equal(input.right, true);
});

test('the pilot dodges aside instead of doubling into an overhead bomb', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Falling toward the killzone with fuel and a bomb 150px overhead:
    // the dodge sidesteps (holding the double) instead of rising into it.
    const bomb = { id: 'bomb-10', x: 510, y: 450, vx: 0, vy: 300, w: 20, h: 20, active: true };
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 180 },
            killZoneY: 800,
            jumpCount: 0,
            maxJumps: 2,
            player: { x: 500, y: 600, vx: 160, vy: 100, grounded: false },
            crown: { x: 3000, y: 222 },
            platforms: [],
            hazards: [],
            bombs: [bomb],
        }),
        createPilotState()
    );
    assert.equal(input.left, true);
    assert.equal(input.right, false);
    assert.equal(input.jump, false);
});

test('the pilot evacuates a live ray plane even with an emitter-only snapshot', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Active ray 20px right with a 40px emitter snapshot: the beam
    // spans down from the emitter, so the pilot steps left instead
    // of falling through the invisible strike.
    const ray = {
        id: 'ray-2440',
        type: 'cosmic_ray',
        x: 2440,
        y: 55,
        w: 16,
        h: 40,
        active: true,
        enable: true,
    };
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 180 },
            jumpCount: 2,
            maxJumps: 2,
            player: { x: 2420, y: 300, vx: 0, vy: 200, grounded: false },
            crown: { x: 3000, y: 222 },
            platforms: [],
            hazards: [ray],
            columns: [],
        }),
        createPilotState()
    );
    assert.equal(input.left, true);
    assert.equal(input.right, false);
});

test('the pilot holds outside a live ray plane ahead', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Grounded with an active ray 50px ahead: the column hold pins
    // the move instead of running into the strike.
    const ray = {
        id: 'ray-835',
        type: 'cosmic_ray',
        x: 150,
        y: 70,
        w: 16,
        h: 40,
        active: true,
        enable: true,
    };
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 180 },
            player: { x: 100, y: 700, vx: 0, vy: 0, grounded: true },
            crown: { x: 900, y: 690 },
            platforms: [{ left: -100, right: 1200, top: 706, x: 550, w: 1300 }],
            hazards: [ray],
            columns: [],
        }),
        createPilotState()
    );
    assert.equal(input.left, false);
    assert.equal(input.right, false);
    assert.equal(input.jump, false);
});

test('the pilot doubles a doomed arc early instead of waiting out the fall', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Past the apex and falling with the touchdown short of the far
    // deck: double now (the old committed-fall gate waited until the
    // flight was too low to climb back to deck level).
    const state = createPilotState();
    state.takeoffY = 388;
    const snap = makeSnap({
        physics: { gravityY: 300 },
        killZoneY: 800,
        jumpCount: 1,
        maxJumps: 2,
        player: { x: 3900, y: 363, vx: 160, vy: 115, grounded: false },
        crown: { x: 5000, y: 420 },
        platforms: [{ left: 4090, right: 4410, top: 470, x: 4250, w: 320 }],
        hazards: [],
    });
    const input = decidePilotInput(snap, state);
    assert.equal(input.jump, true);
});

test('the spent-fuel pilot brakes onto a deep deck at normal gravity', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Falling from a double apex with no fuel and the touchdown past
    // the deck edge: hover-brake over the deck instead of sailing past
    // it at full run speed (normal gravity strands high flights too).
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            jumpCount: 2,
            maxJumps: 2,
            player: { x: 700, y: 200, vx: 160, vy: 200, grounded: false },
            crown: { x: 3000, y: 420 },
            platforms: [{ left: 700, right: 810, top: 500, x: 755, w: 110 }],
            hazards: [],
        }),
        createPilotState()
    );
    assert.equal(input.left, false);
    assert.equal(input.right, false);
    assert.equal(input.jump, false);
});

test('the pilot runs off instead of jumping into a ceiling deck', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Gap jump with a panel crossing the rise column: the jump would
    // bonk (wasting fuel), so run off — the walk-off air jumps fire
    // past the panel with clear sky.
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            player: { x: 3825, y: 382, vx: 160, vy: 0, grounded: true },
            crown: { x: 5000, y: 420 },
            platforms: [
                { left: 3537, right: 3863, top: 404, x: 3700, w: 326 },
                { left: 3706, right: 3994, top: 298, x: 3850, w: 288 },
                { left: 4010, right: 4490, top: 488, x: 4250, w: 480 },
            ],
            hazards: [],
        }),
        createPilotState()
    );
    assert.equal(input.jump, false);
    assert.equal(input.right, true);
});

test('the pilot holds its double when the only lower deck is past reach', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Falling with no touchdown and a lower deck 2700px ahead: out of
    // double range, so hold (the old unreach-bounded check burned the
    // double at a deck no arc could reach).
    const state = createPilotState();
    state.takeoffY = 282;
    const snap = makeSnap({
        physics: { gravityY: 300 },
        killZoneY: 776,
        jumpCount: 1,
        maxJumps: 2,
        player: { x: 4175, y: 122, vx: 160, vy: 105, grounded: false },
        crown: { x: 12000, y: 400 },
        platforms: [{ left: 6887, right: 7213, top: 348, x: 7050, w: 326 }],
        hazards: [],
    });
    const input = decidePilotInput(snap, state);
    assert.equal(input.jump, false);
    assert.equal(input.right, true);
});

test('the walk-off pilot holds its double under a drone in the rise arc', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Walked off the deck edge with a drone 100px ahead in the rise
    // column: drift clear first instead of doubling straight up into it.
    const drone = {
        id: 'drone-3',
        type: 'drone',
        x: 8670,
        y: 350,
        w: 40,
        h: 32,
        active: true,
        enable: true,
    };
    const state = createPilotState();
    state.takeoffY = 429;
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            jumpCount: 0,
            maxJumps: 2,
            player: { x: 8570, y: 435, vx: 160, vy: 35, grounded: false },
            crown: { x: 12000, y: 400 },
            platforms: [{ left: 7970, right: 8530, top: 460, x: 8250, w: 560 }],
            hazards: [drone],
        }),
        state
    );
    assert.equal(input.jump, false);
    assert.equal(input.right, true);
});

test('the doomed-arc pilot holds its double under a drone in the rise arc', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Falling past the apex toward a lower deck with a drone in the
    // rise column: hold the extension double instead of rising into it.
    const drone = {
        id: 'drone-4',
        type: 'drone',
        x: 4000,
        y: 280,
        w: 40,
        h: 32,
        active: true,
        enable: true,
    };
    const state = createPilotState();
    state.takeoffY = 388;
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            killZoneY: 800,
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 3900, y: 363, vx: 160, vy: 115, grounded: false },
            crown: { x: 5000, y: 420 },
            platforms: [{ left: 4090, right: 4410, top: 470, x: 4250, w: 320 }],
            hazards: [drone],
        }),
        state
    );
    assert.equal(input.jump, false);
});

test('the doomed-arc pilot holds its double when a beam crosses the arc', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Falling toward a lower deck with a laser core in the double's
    // flight corridor: hold for the low late double that skims under
    // instead of the early high one that falls back through the beam.
    const laser = {
        id: 'laser-4900',
        type: 'laser',
        x: 4900,
        y: 450,
        w: 14,
        h: 200,
        left: 4893,
        right: 4907,
        top: 350,
        active: false,
        enable: false,
        phase: 'cooldown',
        timeUntilPhaseChangeMs: 900,
    };
    const state = createPilotState();
    state.takeoffY = 466;
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            killZoneY: 776,
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 4480, y: 310, vx: 160, vy: 110, grounded: false },
            crown: { x: 12000, y: 400 },
            platforms: [{ left: 4710, right: 5190, top: 518, x: 4950, w: 480 }],
            hazards: [laser],
        }),
        state
    );
    assert.equal(input.jump, false);
});

test('the rising pilot holds its line past a drone instead of veering', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Takeoff rise with a drone 30px aside (inside the dodge box but
    // under the veer's 45px floor): the arc is committed, so hold
    // toward the landing instead of veering into the gap.
    const drone = {
        id: 'drone-5',
        type: 'drone',
        x: 530,
        y: 370,
        w: 40,
        h: 48,
        active: true,
        enable: true,
    };
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 500, y: 400, vx: 160, vy: -150, grounded: false },
            crown: { x: 3000, y: 420 },
            platforms: [{ left: 400, right: 700, top: 500, x: 550, w: 300 }],
            hazards: [drone],
        }),
        createPilotState()
    );
    assert.equal(input.left, false);
    assert.equal(input.right, true);
    assert.equal(input.jump, false);
});

test('the falling pilot holds its arc past a distant drone', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Falling with a drone 75px aside: outside the tight contact box,
    // so hold the landing arc instead of dodging away from the deck.
    const drone = {
        id: 'drone-6',
        type: 'drone',
        x: 575,
        y: 410,
        w: 40,
        h: 48,
        active: true,
        enable: true,
    };
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 500, y: 400, vx: 160, vy: 200, grounded: false },
            crown: { x: 3000, y: 420 },
            platforms: [{ left: 400, right: 900, top: 550, x: 650, w: 500 }],
            hazards: [drone],
        }),
        createPilotState()
    );
    assert.equal(input.left, false);
    assert.equal(input.right, true);
    assert.equal(input.jump, false);
});

test('the pilot backs up for runway while a drone crosses overhead', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Grounded at a standstill with a drone 58px ahead and 52px up: a
    // standing hop rises straight into it, so back up for a running
    // hop-over instead of leaping (or holding forever).
    const drone = {
        id: 'drone-7',
        type: 'drone',
        x: 5572,
        y: 340,
        w: 40,
        h: 48,
        active: true,
        enable: true,
    };
    const state = createPilotState();
    state.threatPrev['drone-7'] = { x: 5560, t: 0 };
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            elapsedMs: 100,
            player: { x: 5514, y: 392, vx: 0, vy: 0, grounded: true, facing: 'right' },
            crown: { x: 12000, y: 400 },
            platforms: [{ left: 5300, right: 5850, top: 420, x: 5575, w: 550 }],
            hazards: [drone],
        }),
        state
    );
    assert.equal(input.left, true);
    assert.equal(input.right, false);
    assert.equal(input.jump, false);
});

test('the running pilot hops over a drone crossing overhead', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Grounded at full run with a drone 65px ahead and 52px up: hop
    // now — the running arc clears over the top and lands past it.
    const drone = {
        id: 'drone-8',
        type: 'drone',
        x: 5579,
        y: 340,
        w: 40,
        h: 48,
        active: true,
        enable: true,
    };
    const state = createPilotState();
    state.threatPrev['drone-8'] = { x: 5570, t: 0 };
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            elapsedMs: 100,
            player: { x: 5514, y: 392, vx: 160, vy: 0, grounded: true, facing: 'right' },
            crown: { x: 12000, y: 400 },
            platforms: [{ left: 5300, right: 5850, top: 420, x: 5575, w: 550 }],
            hazards: [drone],
        }),
        state
    );
    assert.equal(input.left, false);
    assert.equal(input.right, true);
    assert.equal(input.jump, true);
});

test('the running pilot stops instead of hopping into an overhead drone', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Full run with a drone 40px ahead and 52px up: the arc cannot
    // rise over its crown before the crossing, so stop and let the
    // patrol pass rather than hopping into its body.
    const drone = {
        id: 'drone-14',
        type: 'drone',
        x: 5554,
        y: 340,
        w: 40,
        h: 48,
        active: true,
        enable: true,
    };
    const state = createPilotState();
    state.threatPrev['drone-14'] = { x: 5545, t: 0 };
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            elapsedMs: 100,
            player: { x: 5514, y: 392, vx: 160, vy: 0, grounded: true, facing: 'right' },
            crown: { x: 12000, y: 400 },
            platforms: [{ left: 5300, right: 5850, top: 420, x: 5575, w: 550 }],
            hazards: [drone],
        }),
        state
    );
    assert.equal(input.left, false);
    assert.equal(input.right, false);
    assert.equal(input.jump, false);
});

test('the rising pilot brakes and holds fire under a misaligned chaser', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Rising toward a chasing boarder 33px above bolt level: brake
    // (hold position, keep facing it) and hold fire — bolts fly flat,
    // so firing wastes the cooldown; the aligned crossing kills it.
    const chaser = {
        id: 'boarder-9',
        type: 'boarder',
        x: 6700,
        y: 315,
        w: 40,
        h: 56,
        active: true,
        enable: true,
        chasing: true,
        vx: 0,
        vy: 0,
    };
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            phaser: true,
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 6647, y: 348, vx: 160, vy: -125, grounded: false, facing: 'right' },
            crown: { x: 12000, y: 400 },
            platforms: [
                { left: 6190, right: 6510, top: 530, x: 6350, w: 320 },
                { left: 6890, right: 7210, top: 500, x: 7050, w: 320 },
            ],
            hazards: [chaser],
        }),
        createPilotState()
    );
    assert.equal(input.left, false);
    assert.equal(input.right, false);
    assert.equal(input.jump, false);
    assert.equal(input.shoot, false);
});

test('the rising pilot brakes and fires on an aligned chaser', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Rising toward a chasing boarder 10px above bolt level: brake and
    // fire — aligned bolts kill it outright before contact.
    const chaser = {
        id: 'boarder-10',
        type: 'boarder',
        x: 6700,
        y: 338,
        w: 40,
        h: 56,
        active: true,
        enable: true,
        chasing: true,
        vx: 0,
        vy: 0,
    };
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            phaser: true,
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 6647, y: 348, vx: 160, vy: -125, grounded: false, facing: 'right' },
            crown: { x: 12000, y: 400 },
            platforms: [
                { left: 6190, right: 6510, top: 530, x: 6350, w: 320 },
                { left: 6890, right: 7210, top: 500, x: 7050, w: 320 },
            ],
            hazards: [chaser],
        }),
        createPilotState()
    );
    assert.equal(input.left, false);
    assert.equal(input.right, false);
    assert.equal(input.jump, false);
    assert.equal(input.shoot, true);
});

test('the falling pilot steers off a drone instead of braking onto it', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Falling with a drone 50px right on the descent line: dodge it
    // (the old brake held still and landed on the patrol).
    const drone = {
        id: 'drone-2',
        type: 'drone',
        x: 550,
        y: 410,
        w: 40,
        h: 32,
        active: true,
        enable: true,
    };
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 180 },
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 500, y: 400, vx: 160, vy: 200, grounded: false },
            crown: { x: 3000, y: 222 },
            platforms: [{ left: 400, right: 700, top: 500, x: 550, w: 300 }],
            hazards: [drone],
        }),
        createPilotState()
    );
    assert.equal(input.left, true);
    assert.equal(input.right, false);
});

test('the airborne pilot holds a leap-over arc instead of pad-retreating', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // L14 chain-deck loop: mid-hop inside the padded span of a FIRING
    // beam, but the arc clears the crown by 60px — hold the line (R),
    // never rush back out the near edge (L), in any phase.
    const beam = {
        id: 'laser-1560',
        type: 'laser',
        x: 1560,
        y: 500,
        w: 14,
        h: 110,
        left: 1553,
        right: 1567,
        top: 445,
        active: true,
        enable: true,
        phase: 'active',
        timeUntilPhaseChangeMs: 500,
        orientation: 'vertical',
    };
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 1450, y: 300, vx: 160, vy: -50, grounded: false },
            crown: { x: 5000, y: 690 },
            platforms: [{ left: 1070, right: 1530, top: 470, x: 1300, w: 460 }],
            hazards: [beam],
        }),
        createPilotState()
    );
    assert.equal(input.left, false);
    assert.equal(input.right, true);
});

test('the airborne pilot still rushes out of a piercing beam arc', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Same beam, but falling fast toward the span: the arc enters the
    // band, so the pad rush-out (L) still fires — the clearance gate
    // must not neuter genuine escapes.
    const beam = {
        id: 'laser-1560',
        type: 'laser',
        x: 1560,
        y: 500,
        w: 14,
        h: 110,
        left: 1553,
        right: 1567,
        top: 445,
        active: true,
        enable: true,
        phase: 'active',
        timeUntilPhaseChangeMs: 500,
        orientation: 'vertical',
    };
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            jumpCount: 1,
            maxJumps: 2,
            player: { x: 1500, y: 400, vx: 160, vy: 200, grounded: false },
            crown: { x: 5000, y: 690 },
            platforms: [{ left: 1070, right: 1530, top: 470, x: 1300, w: 460 }],
            hazards: [beam],
        }),
        createPilotState()
    );
    assert.equal(input.left, true);
});

test('the rear duel timer survives ticks with no ahead target', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // L14 stall: the front duel's empty tick used to reset the shared
    // duel timer through duelGate(null), so the 2s unhittable skip
    // never tripped and the rear hold ran 200s. The same chaser held
    // past 2s must release into a run.
    const chaser = {
        id: 'boarder-54',
        type: 'boarder',
        x: 3252,
        y: 412,
        w: 40,
        h: 48,
        active: true,
        enable: true,
        chasing: true,
        vx: -160,
        vy: 0,
    };
    const snapAt = (elapsedMs) =>
        makeSnap({
            elapsedMs,
            physics: { gravityY: 300 },
            phaser: true,
            player: { x: 3366, y: 412, vx: 0, vy: 0, grounded: true, facing: 'left' },
            crown: { x: 5000, y: 690 },
            platforms: [{ left: 3000, right: 4200, top: 434, x: 3600, w: 1200 }],
            hazards: [chaser],
        });
    const state = createPilotState();
    const hold = decidePilotInput(snapAt(0), state);
    assert.equal(hold.shoot, true);
    assert.equal(hold.left, false);
    assert.equal(hold.right, false);
    const release = decidePilotInput(snapAt(2500), state);
    assert.equal(release.right, true);
});

test('the rear duel runs from an off-line chaser instead of standing', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Chaser 62px above the bolt line (leaping over, pacing another
    // deck): held fire flies under it forever, so run — standing
    // stalls (L14 x=3366) or dies (L14 death 3).
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            phaser: true,
            player: { x: 3366, y: 412, vx: 0, vy: 0, grounded: true, facing: 'left' },
            crown: { x: 5000, y: 690 },
            platforms: [{ left: 3000, right: 4200, top: 434, x: 3600, w: 1200 }],
            hazards: [
                {
                    id: 'boarder-55',
                    type: 'boarder',
                    x: 3330,
                    y: 350,
                    w: 40,
                    h: 48,
                    active: true,
                    enable: true,
                    chasing: true,
                    vx: 0,
                    vy: 0,
                },
            ],
        }),
        createPilotState()
    );
    assert.equal(input.right, true);
    assert.equal(input.left, false);
});

test('the front duel yields to a nearer chaser behind', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Far lane target ahead (283px) with a chaser on the heels
    // (114px): turning to kill the nearer threat beats standing for
    // the far one while the heels close in (L14 death 2).
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            phaser: true,
            player: { x: 4407, y: 472, vx: 0, vy: 0, grounded: true, facing: 'right' },
            crown: { x: 5000, y: 690 },
            platforms: [{ left: 4000, right: 5200, top: 494, x: 4600, w: 1200 }],
            hazards: [
                {
                    id: 'boarder-60',
                    type: 'boarder',
                    x: 4690,
                    y: 472,
                    w: 40,
                    h: 48,
                    active: true,
                    enable: true,
                    chasing: false,
                    vx: 0,
                    vy: 0,
                },
                {
                    id: 'boarder-61',
                    type: 'boarder',
                    x: 4293,
                    y: 470,
                    w: 40,
                    h: 48,
                    active: true,
                    enable: true,
                    chasing: true,
                    vx: 160,
                    vy: 0,
                },
            ],
        }),
        createPilotState()
    );
    assert.equal(input.shoot, true);
    assert.equal(input.left, true);
    assert.equal(input.right, false);
});

test('the pilot holds a gap takeoff while a chase-dive converges', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // L14 x=6500 wave-6 loop: jumping the gap into a diving chaser
    // trades mid-air where bolts never reach — hold the takeoff for
    // it to land or pass instead.
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            phaser: true,
            player: { x: 6499, y: 492, vx: 160, vy: 0, grounded: true, facing: 'right' },
            crown: { x: 12000, y: 400 },
            platforms: [
                { left: 6050, right: 6550, top: 514, x: 6300, w: 500 },
                { left: 6750, right: 7250, top: 484, x: 7000, w: 500 },
            ],
            hazards: [
                {
                    id: 'boarder-70',
                    type: 'boarder',
                    x: 6764,
                    y: 432,
                    w: 40,
                    h: 48,
                    active: true,
                    enable: true,
                    chasing: true,
                    vx: -220,
                    vy: 200,
                },
            ],
        }),
        createPilotState()
    );
    assert.equal(input.left, false);
    assert.equal(input.right, false);
    assert.equal(input.jump, false);
});

test('the pilot holds a takeoff while a drone sits in the rise column', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // L14 x=9120 chain kills: a gap jump with a drone 2px ahead and
    // 64px up rises straight into its body (just outside the blocker
    // y-band, so the hop path never sees it) — hold for the patrol
    // to pass instead.
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            phaser: true,
            player: { x: 9120, y: 278, vx: 160, vy: 0, grounded: true, facing: 'right' },
            crown: { x: 12000, y: 400 },
            platforms: [
                { left: 8870, right: 9170, top: 300, x: 9020, w: 300 },
                { left: 9200, right: 9760, top: 452, x: 9480, w: 560 },
            ],
            hazards: [
                {
                    id: 'drone-90',
                    type: 'drone',
                    x: 9118,
                    y: 214,
                    w: 40,
                    h: 48,
                    active: true,
                    enable: true,
                },
            ],
        }),
        createPilotState()
    );
    assert.equal(input.left, false);
    assert.equal(input.right, false);
    assert.equal(input.jump, false);
});

test('the pilot holds a gap takeoff for a drone 50px ahead and high', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // L14 x=1950 drone kill: outside the blocker's y-band, so the hop
    // path never sees it, but the running arc rises into its body —
    // hold the takeoff for the patrol to pass.
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            phaser: true,
            player: { x: 2050, y: 557, vx: 160, vy: 0, grounded: true, facing: 'right' },
            crown: { x: 12000, y: 400 },
            platforms: [
                { left: 1600, right: 2100, top: 579, x: 1850, w: 500 },
                { left: 2150, right: 2650, top: 549, x: 2400, w: 500 },
            ],
            hazards: [
                {
                    id: 'drone-19',
                    type: 'drone',
                    x: 2100,
                    y: 436,
                    w: 40,
                    h: 30,
                    active: true,
                    enable: true,
                },
            ],
        }),
        createPilotState()
    );
    assert.equal(input.left, false);
    assert.equal(input.right, false);
    assert.equal(input.jump, false);
});

test('the pilot still jumps the gap past a settling chaser', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    // Same gap, chaser barely moving vertically (|vy| at the 80
    // threshold): not a committed dive, so the takeoff proceeds.
    const input = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            phaser: true,
            player: { x: 6499, y: 492, vx: 160, vy: 0, grounded: true, facing: 'right' },
            crown: { x: 12000, y: 400 },
            platforms: [
                { left: 6050, right: 6550, top: 514, x: 6300, w: 500 },
                { left: 6750, right: 7250, top: 484, x: 7000, w: 500 },
            ],
            hazards: [
                {
                    id: 'boarder-71',
                    type: 'boarder',
                    x: 6650,
                    y: 422,
                    w: 40,
                    h: 48,
                    active: true,
                    enable: true,
                    chasing: true,
                    vx: -60,
                    vy: 80,
                },
            ],
        }),
        createPilotState()
    );
    assert.equal(input.jump, true);
});

test('the shield hold keeps flying when the arc lands short of the deck edge', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const deck = { left: 12208, right: 12592, top: 314, x: 12400, w: 384 };
    const boss = {
        type: 'boss',
        x: 12434,
        y: 283,
        vx: 60,
        vy: 0,
        w: 96,
        h: 90,
        top: 238,
        active: true,
        enable: true,
        hp: 12,
        phase: 'pace',
        chargeRange: 380,
    };
    // 25px short of the edge: inside landingBelow's stride margin
    // but off the span — hold would strand the flight (L14 trace).
    const short = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            phaser: true,
            jumpCount: 1,
            player: { x: 12183, y: 223, vx: 160, vy: -110, grounded: false, facing: 'right' },
            crown: { x: 12400, y: 290, shielded: true },
            platforms: [deck],
            hazards: [boss],
        }),
        createPilotState()
    );
    assert.equal(short.right, true);
    assert.equal(short.left, false);
    // Boots over the span: the hold parks the arc as before.
    const over = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            phaser: true,
            jumpCount: 1,
            player: { x: 12300, y: 223, vx: 160, vy: -110, grounded: false, facing: 'right' },
            crown: { x: 12400, y: 290, shielded: true },
            platforms: [deck],
            hazards: [boss],
        }),
        createPilotState()
    );
    assert.equal(over.right, false);
    assert.equal(over.left, false);
});

test('the evade abstains off-deck so the hunt closes onto the boss deck', async () => {
    const { createPilotState, decidePilotInput, footingDeck, bossSharesDeck } =
        await importModule('scripts/pilot-brain.mjs');
    const decks = [
        { left: 11758, right: 12142, top: 398, x: 11950, w: 384 },
        { left: 12248, right: 12632, top: 314, x: 12440, w: 384 },
    ];
    const boss = {
        type: 'boss',
        x: 12307,
        y: 270,
        vx: -60,
        vy: 0,
        w: 130,
        h: 90,
        top: 225,
        active: true,
        enable: true,
        hp: 16,
        phase: 'pace',
        chargeRange: 380,
    };
    // On the lift past the approach deck: no static footing, so the
    // evade abstains and the hunt/dismount closes east instead of
    // holding and sniping air (L15 trace).
    const lift = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            phaser: true,
            player: { x: 12159, y: 406, vx: 0, vy: 0, grounded: true, facing: 'right' },
            crown: { x: 12400, y: 290, shielded: true },
            platforms: decks,
            hazards: [boss],
        }),
        createPilotState()
    );
    assert.equal(lift.right, true);
    assert.equal(lift.left, false);
    // The mechanism: no static footing on the lift, shared footing
    // on her deck.
    const liftPlayer = { x: 12159, y: 406 };
    const deckPlayer = { x: 12300, y: 292 };
    assert.equal(footingDeck(liftPlayer, decks), null);
    assert.equal(bossSharesDeck(liftPlayer, boss, { platforms: decks }), false);
    assert.equal(bossSharesDeck(deckPlayer, { ...boss, x: 12440 }, { platforms: decks }), true);
    // On her deck at plant spacing (a 140px pacer still counts as a
    // threat): the plant holds as before.
    const deck = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            phaser: true,
            player: { x: 12300, y: 292, vx: 0, vy: 0, grounded: true, facing: 'right' },
            crown: { x: 12400, y: 290, shielded: true },
            platforms: decks,
            hazards: [{ ...boss, x: 12440 }],
        }),
        createPilotState()
    );
    assert.equal(deck.right, false);
    assert.equal(deck.left, false);
});

test('a boss on the landing does not veto the gap jump or the dismount', async () => {
    const { createPilotState, decidePilotInput } = await importModule('scripts/pilot-brain.mjs');
    const decks = [
        { left: 11758, right: 12142, top: 398, x: 11950, w: 384 },
        { left: 12248, right: 12632, top: 398, x: 12440, w: 384 },
    ];
    const boss = {
        type: 'boss',
        x: 12300,
        y: 354,
        vx: 60,
        vy: 0,
        w: 130,
        h: 90,
        top: 309,
        active: true,
        enable: true,
        hp: 16,
        phase: 'pace',
        chargeRange: 380,
    };
    // Grounded at the approach edge with the boss pacing the landing
    // deck: jump the gap instead of waiting her out (L15 trace).
    const cross = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            phaser: true,
            player: { x: 12130, y: 376, vx: 0, vy: 0, grounded: true, facing: 'right' },
            crown: { x: 12400, y: 338, shielded: true },
            platforms: decks,
            hazards: [boss],
        }),
        createPilotState()
    );
    assert.equal(cross.right, true);
    // A live boarder squatting the same landing still holds the leap.
    const wait = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            phaser: true,
            player: { x: 12140, y: 376, vx: 0, vy: 0, grounded: true, facing: 'right' },
            crown: { x: 12400, y: 338, shielded: true },
            platforms: decks,
            hazards: [
                {
                    type: 'boarder',
                    x: 12300,
                    y: 370,
                    vx: 0,
                    vy: 0,
                    w: 40,
                    h: 56,
                    active: true,
                    enable: true,
                    chasing: false,
                },
            ],
        }),
        createPilotState()
    );
    assert.equal(wait.right, false);
    assert.equal(wait.left, false);
    // An in-lane chasing squatter is dueled, not waited and not
    // marched into: plant and fire.
    const duel = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            phaser: true,
            player: { x: 12140, y: 376, vx: 0, vy: 0, grounded: true, facing: 'right' },
            crown: { x: 12400, y: 338, shielded: true },
            platforms: decks,
            hazards: [
                {
                    type: 'boarder',
                    x: 12300,
                    y: 370,
                    vx: -80,
                    vy: 0,
                    w: 40,
                    h: 56,
                    active: true,
                    enable: true,
                    chasing: true,
                },
            ],
        }),
        createPilotState()
    );
    assert.equal(duel.right, false);
    assert.equal(duel.shoot, true);
    // Riding the lift with a chaser on the target deck: the dismount
    // veto never waits chasers — leap onto the deck instead of
    // holding until contact (L15 trace).
    const ride = decidePilotInput(
        makeSnap({
            physics: { gravityY: 300 },
            phaser: true,
            player: { x: 12160, y: 356, vx: 0, vy: 0, grounded: true, facing: 'right' },
            crown: { x: 12400, y: 338, shielded: true },
            platforms: [
                { left: 11758, right: 12142, top: 398, x: 11950, w: 384 },
                {
                    type: 'moving_platform',
                    x: 12150,
                    y: 390,
                    left: 12094,
                    right: 12206,
                    top: 378,
                    w: 112,
                    h: 24,
                    origin: { x: 12150, y: 480 },
                    target: { x: 12150, y: 390 },
                },
                { left: 12248, right: 12632, top: 314, x: 12440, w: 384 },
            ],
            hazards: [
                {
                    type: 'boarder',
                    x: 12300,
                    y: 290,
                    vx: -80,
                    vy: 0,
                    w: 40,
                    h: 56,
                    active: true,
                    enable: true,
                    chasing: true,
                },
            ],
        }),
        createPilotState()
    );
    assert.equal(ride.right, true);
    assert.equal(ride.jump, true);
});
