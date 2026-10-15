const test = require('node:test');
const assert = require('node:assert/strict');
const options = { speed: 190, hopVelocity: -320, gravity: 300 };
const deck = (left, right, top) => ({ left, right, top, bottom: top + 24 });
const body = (x, foot = 600) => ({
    left: x - 11,
    right: x + 11,
    bottom: foot,
    width: 22,
    height: 36,
});

test('boarders pursue an airborne target without jumping at empty sky', async () => {
    const { boarderGroundMove } = await import('../BoarderNavigation.js');
    const move = boarderGroundMove(body(200), { x: 350, y: 400 }, [deck(0, 500, 600)], options);
    assert.equal(move.velocityX, 190);
    assert.equal(move.velocityY, null);
});

test('boarders stop at an unlandable gap and jump across a reachable one', async () => {
    const { boarderGroundMove, boarderLanding } = await import('../BoarderNavigation.js');
    const start = body(180);
    const ledge = deck(0, 210, 600);
    assert.equal(boarderGroundMove(start, { x: 700, y: 582 }, [ledge], options).velocityX, 0);
    const decks = [ledge, deck(350, 700, 570)];
    const move = boarderGroundMove(start, { x: 550, y: 552 }, decks, options);
    assert.equal(move.velocityY, -320);
    const landing = boarderLanding(start, move.velocityX, move.velocityY, decks, 300);
    assert.equal(landing.deck, decks[1]);
});

test('boarders reject leaps through ceilings and cannot jump onto unreachable shelves', async () => {
    const { boarderGroundMove } = await import('../BoarderNavigation.js');
    const decks = [deck(0, 210, 600), deck(350, 700, 570), deck(140, 300, 500)];
    const move = boarderGroundMove(body(180), { x: 550, y: 552 }, decks, options);
    assert.equal(move.velocityX, 0);
    assert.equal(move.velocityY, null);
    assert.equal(
        boarderGroundMove(body(180), { x: 400, y: 250 }, [decks[0], deck(300, 600, 300)], options)
            .velocityX,
        0
    );
});

test('crown guards hold the pad instead of chasing off its edge', async () => {
    const { boarderGroundMove } = await import('../BoarderNavigation.js');
    const move = boarderGroundMove(
        body(180),
        { x: 600, y: 582 },
        [deck(0, 210, 600), deck(350, 700, 600)],
        { ...options, stayOnDeck: true }
    );
    assert.equal(move.velocityX, 0);
    assert.equal(move.velocityY, null);
});

test('every shield has a guard on the crown pad, and bypassed enemies are not guards', async () => {
    const { LEVEL_CONTENT, LEVEL_DEFINITIONS } = await import('../levels/index.js');
    for (const id of [8, 12, 13, 15, 16]) {
        const c = LEVEL_CONTENT[id];
        const pad = c.staticPlatforms.at(-1);
        const guards = c.dynamic.filter((h) => h.crownGuard);
        assert.ok(guards.length > 0);
        for (const guard of guards) {
            assert.ok(
                Math.abs(guard.x - pad.x) < (96 * pad.scaleX) / 2 - 11,
                `level ${id} guard fits pad`
            );
            assert.ok(guard.y < pad.y - 12 && guard.y > pad.y - 90);
            assert.ok(guard.x < LEVEL_DEFINITIONS[id].CROWN_X);
        }
        assert.ok(c.dynamic.some((h) => h.type === 'boarder' && !h.crownGuard));
    }
});

test('grounded pursuit follows a moving fight away from the original spawn', async () => {
    const { BoarderDirector } = await import('../BoarderDirector.js');
    let now = 1000;
    const scene = { getGameTime: () => now, levelConfig: { gravity: 300 } };
    const director = new BoarderDirector(scene);
    const alien = {
        active: true,
        x: 900,
        y: 582,
        homeX: 100,
        homeY: 582,
        aggro: true,
        body: { ...body(900), blocked: { down: true } },
        setVelocityX(v) {
            this.vx = v;
        },
        setVelocityY(v) {
            this.vy = v;
        },
    };
    director.boarderDecks.push(deck(0, 1600, 600));
    const target = { x: 1200, y: 500, body: { blocked: { down: false } } };
    director.stepBoarder(alien, [target], [alien], director.boarderOptions);
    assert.equal(alien.vx, 190);
    assert.equal(alien.aggro, true);
    now += 500;
    alien.body.blocked.down = false;
    target.x = 800;
    director.stepBoarder(alien, [target], [alien], director.boarderOptions);
    assert.equal(alien.vx, 190, 'no homing reversal in midair');
});

test('each pickup texture maps to the exact weapon granted', async () => {
    const { GUN_SPRITES } = await import('../sprites/guns.js');
    const { WEAPON_DEFS } = await import('../GameUtils.js');
    const { WorldBuilder } = await import('../WorldBuilder.js');
    const created = [];
    const group = {
        create(x, y, texture) {
            const shell = { x, y, texture, setDepth() {}, body: { setSize() {} } };
            created.push(shell);
            return shell;
        },
    };
    const builder = new WorldBuilder({ physics: { add: { staticGroup: () => group } } });
    builder.tagTestEntity = () => {};
    builder.buildPods(Object.keys(WEAPON_DEFS).map((gun) => ({ x: 100, y: 100, gun })));
    for (const shell of created) {
        assert.equal(shell.texture, `weaponPod-${shell.podGun}`);
        assert.ok(GUN_SPRITES.some(([key]) => key === shell.texture));
    }
});

test('boarders can take a safe step down under a low ceiling without jumping', async () => {
    const { boarderGroundMove } = await import('../BoarderNavigation.js');
    const decks = [deck(0, 210, 600), deck(220, 600, 660), deck(100, 500, 510)];
    const move = boarderGroundMove(body(180), { x: 450, y: 642 }, decks, options);
    assert.equal(move.velocityX, 190);
    assert.equal(move.velocityY, null);
});

test('checkpoint retries restore waves on their decks instead of dropping them onto the runner', async () => {
    const { BoarderDirector } = await import('../BoarderDirector.js');
    const alien = { homeX: 2000, homeY: 540, wave: 2, body: {} };
    const scene = {
        level: 12,
        boarderWave: 1,
        respawnPoint: { x: 1850, y: 568 },
        levelConfig: {
            boarderWaves: [
                { wave: 1, x: 0 },
                { wave: 2, x: 1000 },
            ],
        },
        boardersGroup: { getChildren: () => [alien] },
        platforms: { getChildren: () => [{ body: deck(1700, 2200, 600) }] },
    };
    const director = new BoarderDirector(scene);
    director.resetBoarders();
    assert.equal(scene.boarderWave, 2);
    assert.equal(alien.arrived, true);
    assert.equal(alien.y, 582);
    assert.equal(alien.body.enable, false, 'held safely during recovery grace');
    assert.equal(director.releaseBoarderWave(2), 0, 'no second drop after recovery');
});
