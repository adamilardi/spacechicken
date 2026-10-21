const test = require('node:test');
const assert = require('node:assert/strict');

test('every contra reinforcement gives at least 300px of approach and arrives before the crown', async () => {
    const { LevelConfig } = await import('../LevelConfig.js');
    for (let id = 8; id <= 16; id++) {
        const config = new LevelConfig(id);
        let previous = -1;
        for (const trigger of config.boarderWaves) {
            assert.ok(
                trigger.x > previous && trigger.x < config.crown.x,
                `level ${id} ordered trigger`
            );
            previous = trigger.x;
            const enemies = config.hazards.dynamic.filter(
                (h) => h.type === 'boarder' && h.wave === trigger.wave
            );
            assert.ok(enemies.length, `level ${id} wave ${trigger.wave} has enemies`);
            if (trigger.wave > 1) {
                assert.ok(
                    Math.min(...enemies.map((h) => h.x)) - trigger.x >= 300,
                    `level ${id} fair approach`
                );
            }
        }
    }
});

test('crown shield waits for its unreleased guard, not enemies on other routes', async () => {
    const { BoarderDirector, crownGuardsDefeated } = await import('../BoarderDirector.js');
    const first = { active: true, arrived: true };
    const later = { active: false, arrived: false, crownGuard: true };
    const bypassed = { active: true, arrived: true };
    let opened = 0;
    const scene = {
        crownShielded: true,
        levelConfig: { crownShield: true },
        boardersGroup: { getChildren: () => [first, later, bypassed] },
        bossesGroup: null,
        breakCrownShield: () => opened++,
        releaseCrownShieldIfCleared: () => {
            if (crownGuardsDefeated(scene.boardersGroup, scene.bossesGroup)) {
                scene.breakCrownShield();
            }
        },
    };
    const director = new BoarderDirector(scene);
    director.defeatBoarder(first);
    assert.equal(opened, 0);
    later.active = true;
    later.arrived = true;
    director.defeatBoarder(later);
    assert.equal(opened, 1);
    // A live boss guard holds the shield after the last boarder falls.
    opened = 0;
    const bossGuard = { active: true, bossCrownGuard: true, bossDefeated: false };
    scene.bossesGroup = { getChildren: () => [bossGuard] };
    director.defeatBoarder(bypassed);
    assert.equal(opened, 0);
    bossGuard.bossDefeated = true;
    director.defeatBoarder({ active: true, arrived: true });
    assert.equal(opened, 1);
});

test('checkpoint recovery keeps earned kills through repeated resets and wave release', async () => {
    const { BoarderDirector } = await import('../BoarderDirector.js');
    const alien = {
        active: false,
        defeated: true,
        arrived: true,
        homeX: 1600,
        homeY: 500,
        wave: 2,
    };
    const scene = {
        level: 8,
        respawnPoint: { x: 1900, y: 588 },
        boarderWave: 1,
        boardersGroup: { getChildren: () => [alien] },
    };
    const director = new BoarderDirector(scene);
    director.resetBoarders();
    director.resetBoarders();
    assert.equal(director.releaseBoarderWave(2), 0);
    assert.equal(alien.defeated, true);
    // A fresh attempt without a checkpoint still resets the encounter.
    scene.respawnPoint = null;
    director.resetBoarders();
    assert.equal(alien.defeated, false);
});

test('reinforcements drop below overlapping catwalks into their intended lane', async () => {
    const { BoarderDirector } = await import('../BoarderDirector.js');
    const alien = { homeX: 1900, homeY: 500, wave: 2, body: {} };
    const scene = {
        boardersGroup: { getChildren: () => [alien] },
        platforms: { getChildren: () => [{ body: { left: 1658, right: 2042, bottom: 412 } }] },
    };
    const director = new BoarderDirector(scene);
    assert.equal(director.releaseBoarderWave(2), 1);
    assert.equal(alien.y, 432);
    assert.ok(alien.y - 18 > 412);
});

test('director uses level encounter triggers instead of the legacy global schedule', async () => {
    const { BoarderDirector } = await import('../BoarderDirector.js');
    const scene = {
        boarderWave: 1,
        player: { active: true, x: 1500 },
        levelConfig: {
            boarderWaves: [
                { wave: 1, x: 0 },
                { wave: 2, x: 1800 },
            ],
        },
    };
    const director = new BoarderDirector(scene);
    director.updateBoarderWaves();
    assert.equal(scene.boarderWave, 1);
    scene.player.x = 1800;
    director.updateBoarderWaves();
    assert.equal(scene.boarderWave, 2);
});
