const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const projectRoot = path.resolve(__dirname, '..');

global.Phaser = {
    Scene: class {},
    Math: {
        Clamp(value, min, max) {
            return Math.min(max, Math.max(min, value));
        },
    },
    Input: {
        Keyboard: {
            KeyCodes: { M: 77, SPACE: 32 },
            JustDown: () => false,
            JustUp: () => false,
        },
    },
};

function importModule(fileName) {
    return import(pathToFileURL(path.join(projectRoot, fileName)).href);
}

const DIAG = Math.SQRT1_2;

function close(actual, expected) {
    assert.ok(
        Math.abs(actual - expected) < 0.001,
        `expected ${actual} to be within 0.001 of ${expected}`
    );
}

test('aimVector resolves the contra directions without crouch', async () => {
    const { aimVector } = await importModule('GameUtils.js');
    assert.deepEqual(aimVector({}), { x: 1, y: 0 });
    assert.deepEqual(aimVector({ facing: -1 }), { x: -1, y: 0 });
    assert.deepEqual(aimVector({ aimUp: true }), { x: 0, y: -1 });
    const diagUp = aimVector({ aimUp: true, moveX: 160 });
    close(diagUp.x, DIAG);
    close(diagUp.y, -DIAG);
    const diagUpLeft = aimVector({ facing: 1, aimUp: true, moveX: -160 });
    close(diagUpLeft.x, -DIAG);
    close(diagUpLeft.y, -DIAG);
    // No crouch: aiming down on the ground still fires forward.
    assert.deepEqual(aimVector({ aimDown: true, grounded: true }), { x: 1, y: 0 });
    assert.deepEqual(aimVector({ aimDown: true, grounded: false }), { x: 0, y: 1 });
    const diagDown = aimVector({ aimDown: true, grounded: false, moveX: -160 });
    close(diagDown.x, -DIAG);
    close(diagDown.y, DIAG);
    // Opposing aims cancel to forward fire.
    assert.deepEqual(aimVector({ aimUp: true, aimDown: true, grounded: false }), { x: 1, y: 0 });
});

function makeBoltGroup(created) {
    return {
        getFirstDead: () => null,
        getLength: () => created.length,
        getChildren: () => created,
        killAndHide: (bolt) => {
            bolt.active = false;
        },
        create: (x, y, key) => {
            const bolt = {
                x,
                y,
                texture: key,
                active: true,
                setTexture(next) {
                    bolt.texture = next;
                },
                setActive(value) {
                    bolt.active = value;
                },
                setVisible() {},
                setDepth() {},
                setRotation(value) {
                    bolt.rotation = value;
                },
                setFlipX(value) {
                    bolt.flipX = value;
                },
                enableBody(_enable, nextX, nextY) {
                    bolt.x = nextX;
                    bolt.y = nextY;
                },
                body: {
                    enable: true,
                    allowGravity: true,
                    setAllowGravity() {},
                    setSize(width, height) {
                        bolt.bodyWidth = width;
                        bolt.bodyHeight = height;
                    },
                },
                setVelocity(vx, vy) {
                    bolt.vx = vx;
                    bolt.vy = vy;
                },
            };
            created.push(bolt);
            return bolt;
        },
    };
}

async function makeCombat() {
    const { CombatSystem } = await importModule('CombatSystem.js');
    const created = [];
    const scene = {
        level: 12,
        levelConfig: { phaser: true },
        worldWidth: 4000,
        worldHeight: 760,
        getGameTime: () => 1000,
        phaserBolts: makeBoltGroup(created),
    };
    return { combat: new CombatSystem(scene), scene, created };
}

function makeChicken(overrides = {}) {
    return {
        active: true,
        x: 100,
        y: 100,
        flipX: false,
        weapon: 'phaser',
        body: {
            enable: true,
            blocked: { down: true },
            touching: {},
            velocity: { x: 0, y: 0 },
        },
        ...overrides,
    };
}

test('an up aim fires a bolt straight up from above the chicken', async () => {
    const { combat, created } = await makeCombat();
    const { GAME_CONSTANTS } = await importModule('Constants.js');
    const chicken = makeChicken({ aim: { x: 0, y: -1 } });
    combat.tryFirePhaser(chicken, 1000);
    assert.equal(created.length, 1);
    assert.equal(created[0].vx, 0);
    assert.equal(created[0].vy, -GAME_CONSTANTS.PHASER_BOLT_SPEED);
    assert.equal(created[0].x, 100);
    assert.ok(created[0].y < 100, 'bolt spawns above the chicken');
    close(created[0].rotation, -Math.PI / 2);
});

test('a diagonal fan rotates around the aim direction', async () => {
    const { combat, created } = await makeCombat();
    const { GAME_CONSTANTS } = await importModule('Constants.js');
    const chicken = makeChicken({
        weapon: 'scatter',
        aim: { x: DIAG, y: -DIAG },
    });
    combat.tryFirePhaser(chicken, 1000);
    assert.equal(created.length, 3);
    const speed = GAME_CONSTANTS.PHASER_BOLT_SPEED;
    close(created[1].vx, speed * DIAG);
    close(created[1].vy, -speed * DIAG);
    // Fan bolts keep the legacy fan magnitude and spread perpendicular to aim.
    for (const bolt of created) {
        close(Math.hypot(bolt.vx, bolt.vy), Math.hypot(speed, bolt === created[1] ? 0 : 140));
    }
    assert.ok(created[0].vy < created[1].vy && created[1].vy < created[2].vy);
});

test('horizontal aim keeps the exact legacy bolt velocities', async () => {
    const { combat, created } = await makeCombat();
    const { GAME_CONSTANTS } = await importModule('Constants.js');
    const chicken = makeChicken({ weapon: 'scatter', aim: { x: 1, y: 0 } });
    combat.tryFirePhaser(chicken, 1000);
    assert.deepEqual(
        created.map((bolt) => bolt.vy),
        [-140, 0, 140]
    );
    assert.ok(created.every((bolt) => bolt.vx === GAME_CONSTANTS.PHASER_BOLT_SPEED));
});

test('updateCombat syncs player aim from the input state before firing', async () => {
    const { combat, scene, created } = await makeCombat();
    scene.player = makeChicken();
    combat.updateCombat({ phaserHeld: true, aimUpHeld: true, aimDownHeld: false });
    assert.deepEqual(scene.player.aim, { x: 0, y: -1 });
    assert.equal(created.length, 1);
    assert.ok(created[0].vy < 0 && created[0].vx === 0);
});

test('vertical bolts expire by distance traveled, not only by x', async () => {
    const { combat, scene, created } = await makeCombat();
    const bolt = {
        x: 100,
        y: -900,
        bornX: 100,
        bornY: 100,
        active: true,
        body: { stop() {}, enable: true },
    };
    created.push(bolt);
    scene.phaserBolts.getChildren = () => [bolt];
    combat.stepPhaserBolts();
    assert.equal(bolt.active, false);
});

test('holding fire turns the jump keys into aim-up instead of a jump', async () => {
    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const scene = new SpaceChicken();
    const base = {
        upJustPressed: true,
        wJustPressed: false,
        spaceJustPressed: false,
        kJustPressed: false,
        gamepadJumpJustPressed: false,
        pointerJumpTriggered: false,
        doubleTapJumpTriggered: false,
    };
    assert.equal(scene.isJumpInput({ ...base, aimUpHeld: true }), false);
    assert.equal(scene.isJumpInput({ ...base, aimUpHeld: false }), true);
    // Space always jumps, even while aiming.
    assert.equal(
        scene.isJumpInput({
            ...base,
            upJustPressed: false,
            spaceJustPressed: true,
            aimUpHeld: true,
        }),
        true
    );
});
