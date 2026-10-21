const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const projectRoot = path.resolve(__dirname, '..');

function importModule(fileName) {
    return import(pathToFileURL(path.join(projectRoot, fileName)).href);
}

const CONFIG = {
    triggerX: 11200,
    minX: 11560,
    maxX: 11720,
    paceSpeed: 60,
    telegraphMs: 700,
    chargeSpeed: 420,
    chargeMs: 900,
    recoverMs: 800,
    cooldownMs: 2600,
    enrageCooldownMs: 1600,
    enrageChargeMult: 1.2,
};

function state(overrides = {}) {
    return {
        phase: 'dormant',
        phaseAt: 0,
        nextAttackAt: 0,
        dir: -1,
        enraged: false,
        ...overrides,
    };
}

test('the boss sleeps until the lead chicken crosses the trigger', async () => {
    const { bossUpdate } = await importModule('BossDirector.js');
    const sleepy = bossUpdate(state(), 5000, 11600, 9000, 11199, CONFIG, false);
    assert.equal(sleepy.phase, 'dormant');
    assert.equal(sleepy.velocityX, 0);
    assert.deepEqual(sleepy.events, []);
    const awake = bossUpdate(state(), 5000, 11600, 9000, 11200, CONFIG, false);
    assert.equal(awake.phase, 'pace');
    assert.deepEqual(awake.events, ['trigger']);
    assert.ok(awake.nextAttackAt <= 5000 + 1200);
});

test('a summoner defers its first attack past the fight', async () => {
    const { bossUpdate } = await importModule('BossDirector.js');
    const config = { ...CONFIG, initialAttackMs: 999999, cooldownMs: 999999 };
    const awake = bossUpdate(state(), 5000, 11600, 9000, 11200, config, false);
    assert.equal(awake.phase, 'pace');
    assert.equal(awake.nextAttackAt, 5000 + 999999);
});

test('the boss paces toward its target and turns at the arena bounds', async () => {
    const { bossUpdate } = await importModule('BossDirector.js');
    const pacing = state({ phase: 'pace', phaseAt: 0, nextAttackAt: 99999, dir: -1 });
    const left = bossUpdate(pacing, 1000, 11680, 11600, 11200, CONFIG, false);
    assert.equal(left.velocityX, -60);
    const right = bossUpdate(pacing, 1000, 11600, 11680, 11200, CONFIG, false);
    assert.equal(right.velocityX, 60);
    const turn = bossUpdate(pacing, 1000, 11560, 11510, 11200, CONFIG, false);
    assert.equal(turn.dir, 1);
    assert.equal(turn.velocityX, 60);
});

test('the boss holds center for off-pad challengers', async () => {
    const { bossUpdate } = await importModule('BossDirector.js');
    const pacing = state({ phase: 'pace', phaseAt: 0, nextAttackAt: 99999, dir: -1 });
    // Center is (11560 + 11720) / 2 = 11640: no camping the landing.
    const left = bossUpdate(pacing, 1000, 11600, 9000, 11200, CONFIG, false);
    assert.equal(left.velocityX, 60);
    const right = bossUpdate(pacing, 1000, 11700, 9000, 11200, CONFIG, false);
    assert.equal(right.velocityX, -60);
});

test('the boss telegraphs, charges, recovers, and re-arms', async () => {
    const { bossUpdate } = await importModule('BossDirector.js');
    const pacing = state({ phase: 'pace', phaseAt: 0, nextAttackAt: 1000, dir: -1 });
    const tell = bossUpdate(pacing, 1000, 11600, 9000, 11000, CONFIG, false);
    assert.equal(tell.phase, 'telegraph');
    assert.equal(tell.velocityX, 0);
    assert.deepEqual(tell.events, ['telegraph']);
    const held = bossUpdate(
        state({ phase: 'telegraph', phaseAt: 1000, dir: -1 }),
        1500,
        11600,
        9000,
        11000,
        CONFIG,
        false
    );
    assert.equal(held.phase, 'telegraph');
    const charge = bossUpdate(
        state({ phase: 'telegraph', phaseAt: 1000, dir: -1 }),
        1700,
        11600,
        9000,
        11000,
        CONFIG,
        false
    );
    assert.equal(charge.phase, 'charge');
    assert.equal(charge.velocityX, -420);
    assert.deepEqual(charge.events, ['charge']);
    const flying = bossUpdate(
        state({ phase: 'charge', phaseAt: 1700, dir: -1 }),
        2000,
        11600,
        9000,
        11200,
        CONFIG,
        false
    );
    assert.equal(flying.phase, 'charge');
    assert.equal(flying.velocityX, -420);
    const done = bossUpdate(
        state({ phase: 'charge', phaseAt: 1700, dir: -1 }),
        2600,
        11200,
        9000,
        11000,
        CONFIG,
        false
    );
    assert.equal(done.phase, 'recover');
    assert.deepEqual(done.events, ['recover']);
    const back = bossUpdate(
        state({ phase: 'recover', phaseAt: 2600, dir: -1 }),
        3400,
        11200,
        9000,
        11000,
        CONFIG,
        false
    );
    assert.equal(back.phase, 'pace');
    assert.equal(back.nextAttackAt, 3400 + 2600);
});

test('a summon-recover keeps a due charge on the clock', async () => {
    const { bossUpdate } = await importModule('BossDirector.js');
    const back = bossUpdate(
        state({ phase: 'recover', phaseAt: 2600, nextAttackAt: 6000, dir: -1 }),
        3400,
        11200,
        9000,
        11000,
        CONFIG,
        false
    );
    assert.equal(back.phase, 'pace');
    assert.equal(back.nextAttackAt, 6000);
});

test('a charge ends early past the arena bounds', async () => {
    const { bossUpdate } = await importModule('BossDirector.js');
    const out = bossUpdate(
        state({ phase: 'charge', phaseAt: 1700, dir: -1 }),
        1800,
        11300,
        9000,
        11000,
        CONFIG,
        false
    );
    assert.equal(out.phase, 'recover');
});

test('hard mode quickens the boss and enrage presses harder', async () => {
    const { bossUpdate } = await importModule('BossDirector.js');
    const pacing = state({ phase: 'pace', phaseAt: 0, nextAttackAt: 99999, dir: -1 });
    const hard = bossUpdate(pacing, 1000, 11680, 11600, 11200, CONFIG, true);
    assert.equal(hard.velocityX, -60 * 1.15);
    const calm = bossUpdate(
        state({ phase: 'telegraph', phaseAt: 1000, dir: -1 }),
        1700,
        11600,
        9000,
        11000,
        CONFIG,
        false
    );
    assert.equal(calm.velocityX, -420);
    const mad = bossUpdate(
        state({ phase: 'telegraph', phaseAt: 1000, dir: -1, enraged: true }),
        1700,
        11600,
        9000,
        11000,
        CONFIG,
        false
    );
    assert.equal(mad.velocityX, -420 * 1.2);
    const back = bossUpdate(
        state({ phase: 'recover', phaseAt: 2600, dir: -1, enraged: true }),
        3400,
        11200,
        9000,
        11000,
        CONFIG,
        false
    );
    assert.equal(back.nextAttackAt, 3400 + 1600);
});

function stubBoss(overrides = {}) {
    return {
        active: true,
        x: 11600,
        y: 420,
        displayWidth: 120,
        displayHeight: 84,
        body: { enable: true },
        bossHp: 14,
        bossMaxHp: 14,
        bossName: 'Broodmother',
        bossCrownGuard: true,
        bossHomeX: 11600,
        bossHomeY: 420,
        bossDefeated: false,
        bossState: { phase: 'pace', phaseAt: 0, nextAttackAt: 99999, dir: -1, enraged: false },
        bossConfig: { ...CONFIG },
        testMeta: { kind: 'hazard', type: 'boss', phase: 'pace' },
        setVelocityX() {},
        setVelocity() {},
        setFlipX() {},
        setTint() {},
        setTintFill() {},
        clearTint() {},
        setAlpha() {},
        setScale() {},
        setActive() {},
        setVisible() {},
        ...overrides,
    };
}

function stubScene() {
    const calls = { banners: [], bar: [], sounds: [], deaths: [] };
    const scene = {
        calls,
        difficulty: 'normal',
        isTransitioning: false,
        gameOver: false,
        crownShielded: true,
        levelConfig: { crownShield: true },
        player: { active: true, x: 11000, y: 440, body: { enable: true } },
        player2: null,
        killZoneFallY: 720,
        bossesGroup: { getChildren: () => scene.bossList },
        bossList: [],
        getGameTime: () => scene.now,
        now: 5000,
        failFromHazard(reason = 'hazard') {
            calls.deaths.push(reason);
        },
        uiManager: {
            showBossBar: (name, hp, max) => calls.bar.push(['show', name, hp, max]),
            updateBossBar: (hp, max) => calls.bar.push(['update', hp, max]),
            hideBossBar: () => calls.bar.push(['hide']),
            showLevelBanner: (title, sub) => calls.banners.push([title, sub]),
        },
        audioManager: {
            playWaveSound: () => calls.sounds.push('wave'),
            playBoarderThud: () => calls.sounds.push('thud'),
            playBoarderPop: () => calls.sounds.push('pop'),
        },
        effectsManager: { emitJumpPuff: () => {}, collectBurst: () => {} },
        tweens: { add: () => {}, killTweensOf: () => {} },
        time: { delayedCall: () => {} },
        armCrownShield() {
            scene.crownShielded = true;
        },
        releaseCrownShieldIfCleared() {
            const guards = scene.bossList.some((boss) => boss.bossCrownGuard && !boss.bossDefeated);
            if (!guards) {
                scene.crownShielded = false;
            }
        },
    };
    return scene;
}

test('bolts damage an awake boss and the kill opens the crown', async () => {
    const { BossDirector } = await importModule('BossDirector.js');
    const scene = stubScene();
    const director = new BossDirector(scene);
    const boss = stubBoss();
    scene.bossList.push(boss);
    director.damageBoss(boss);
    assert.equal(boss.bossHp, 13);
    assert.deepEqual(scene.calls.bar.at(-1), ['update', 13, 14]);
    boss.bossHp = 8;
    director.damageBoss(boss);
    assert.equal(boss.bossState.enraged, true);
    assert.deepEqual(scene.calls.banners.at(-1), ['ENRAGED', 'Faster charges — keep moving']);
    boss.bossHp = 1;
    director.damageBoss(boss);
    assert.equal(boss.bossDefeated, true);
    assert.equal(boss.body.enable, false);
    assert.equal(scene.crownShielded, false);
    assert.ok(scene.calls.bar.some((call) => call[0] === 'hide'));
});

test('a dormant boss ignores bolts', async () => {
    const { BossDirector } = await importModule('BossDirector.js');
    const scene = stubScene();
    const director = new BossDirector(scene);
    const boss = stubBoss({
        bossState: { phase: 'dormant', phaseAt: 0, nextAttackAt: 0, dir: -1 },
    });
    director.damageBoss(boss);
    assert.equal(boss.bossHp, 14);
});

test('death resets the boss position but wounds stay and the shield re-arms', async () => {
    const { BossDirector } = await importModule('BossDirector.js');
    const scene = stubScene();
    const director = new BossDirector(scene);
    const boss = stubBoss({
        x: 11500,
        bossHp: 3,
        bossDefeated: false,
        bossState: { phase: 'charge', phaseAt: 1000, nextAttackAt: 0, dir: -1, enraged: true },
    });
    scene.bossList.push(boss);
    scene.crownShielded = false;
    director.resetBosses();
    assert.equal(boss.bossHp, 3);
    assert.equal(boss.bossState.phase, 'dormant');
    assert.equal(boss.bossState.enraged, true);
    assert.equal(boss.x, 11600);
    assert.equal(boss.y, 420);
    assert.equal(scene.crownShielded, true);
    assert.ok(scene.calls.bar.some((call) => call[0] === 'hide'));
});

test('death dissolves the boss summons but keeps wave boarders', async () => {
    const { BossDirector } = await importModule('BossDirector.js');
    const scene = stubScene();
    const director = new BossDirector(scene);
    const boss = stubBoss({ bossHp: 3, bossDefeated: false });
    scene.bossList.push(boss);
    const summoned = {
        summonedBy: boss,
        gone: false,
        destroy() {
            this.gone = true;
        },
    };
    const waveBoarder = {
        summonedBy: null,
        gone: false,
        destroy() {
            this.gone = true;
        },
    };
    const kept = [waveBoarder];
    scene.boardersGroup = {
        getChildren: () => [summoned, ...kept],
        remove(alien) {
            const at = kept.indexOf(alien);
            if (at >= 0) {
                kept.splice(at, 1);
            }
        },
    };
    director.resetBosses();
    assert.equal(summoned.gone, true);
    assert.equal(waveBoarder.gone, false);
});

test('a summoner births minions on its own timer with a tell', async () => {
    const { bossUpdate, bossInitialState } = await importModule('BossDirector.js');
    const config = {
        ...CONFIG,
        summon: {
            intervalMs: 7000,
            initialDelayMs: 2500,
            count: 1,
            key: 'gnawer',
            maxAlive: 2,
            tellMs: 600,
        },
    };
    const woken = bossUpdate({ ...bossInitialState() }, 5000, 11600, 9000, 11200, config, false);
    assert.equal(woken.phase, 'pace');
    assert.equal(woken.nextSummonAt, 7500);
    const pacing = {
        phase: 'pace',
        phaseAt: 5000,
        nextAttackAt: 99999,
        nextSummonAt: 7500,
        dir: -1,
    };
    const tell = bossUpdate(pacing, 7500, 11600, 9000, 11200, config, false, 0);
    assert.equal(tell.phase, 'summonTell');
    assert.deepEqual(tell.events, ['summonTell']);
    const held = bossUpdate(
        { ...pacing, phase: 'summonTell', phaseAt: 7500 },
        7900,
        11600,
        9000,
        11200,
        config,
        false,
        0
    );
    assert.equal(held.phase, 'summonTell');
    const birth = bossUpdate(
        { ...pacing, phase: 'summonTell', phaseAt: 7500 },
        8100,
        11600,
        9000,
        11200,
        config,
        false,
        0
    );
    assert.equal(birth.phase, 'recover');
    assert.equal(birth.nextSummonAt, 8100 + 7000);
    assert.deepEqual(birth.events, ['summon', 'recover']);
    // A full brood holds the tell: no summon past the cap.
    const capped = bossUpdate(pacing, 7500, 11600, 9000, 11200, config, false, 2);
    assert.equal(capped.phase, 'pace');
    // No summon config, no tell: plain chargers never birth.
    const plain = bossUpdate(pacing, 7500, 11600, 9000, 11200, CONFIG, false, 0);
    assert.equal(plain.phase, 'pace');
});

test('a boss past the pad edge leashes home instead of falling', async () => {
    const { BossDirector } = await importModule('BossDirector.js');
    const scene = stubScene();
    const director = new BossDirector(scene);
    const boss = stubBoss({
        x: 11300,
        y: 700,
        bossState: { phase: 'charge', phaseAt: 1000, nextAttackAt: 0, dir: -1, enraged: false },
    });
    scene.bossList.push(boss);
    director.updateBosses();
    assert.equal(boss.x, 11600);
    assert.equal(boss.y, 420);
    assert.equal(boss.bossState.phase, 'pace');
    assert.equal(boss.bossHp, 14);
});

test('a kill stays a kill through death', async () => {
    const { BossDirector } = await importModule('BossDirector.js');
    const scene = stubScene();
    const director = new BossDirector(scene);
    const boss = stubBoss({ bossHp: 0, bossDefeated: true });
    scene.bossList.push(boss);
    scene.crownShielded = false;
    director.resetBosses();
    assert.equal(boss.bossDefeated, true);
    assert.equal(scene.crownShielded, false);
});

test('the spawner tags a shootable boss body', async () => {
    const { spawners } = await importModule('enemies/index.js');
    assert.equal(typeof spawners.boss, 'function');
    const added = [];
    const sprite = {
        x: 11600,
        y: 420,
        displayWidth: 120,
        displayHeight: 84,
        body: {
            allowGravity: false,
            setSize(w, h) {
                sprite.bodyW = w;
                sprite.bodyH = h;
            },
            setOffset() {},
        },
        setDepth() {},
        setFlipX() {},
    };
    const builder = {
        tagTestEntity: (target, meta) => {
            target.testMeta = meta;
        },
        scene: { bossesGroup: { add: (member) => added.push(member) } },
    };
    spawners.boss(
        builder,
        { create: () => sprite },
        { x: 11600, y: 420, hp: 14, initialAttackMs: 1200 }
    );
    assert.equal(sprite.testMeta.type, 'boss');
    assert.equal(sprite.bossConfig.initialAttackMs, 1200);
    assert.equal(sprite.bossHp, 14);
    assert.equal(sprite.bossState.phase, 'dormant');
    assert.equal(sprite.body.allowGravity, true);
    assert.equal(sprite.bodyW, 102);
    assert.equal(sprite.bodyH, 58.8);
    assert.deepEqual(added, [sprite]);
});

test('an awake boss is lethal to touch, a dormant or dead one is not', async () => {
    const { BossDirector } = await importModule('BossDirector.js');
    const scene = stubScene();
    const director = new BossDirector(scene);
    director.touchBoss({}, stubBoss());
    assert.deepEqual(scene.calls.deaths, ['boarder']);
    director.touchBoss(
        {},
        stubBoss({ bossState: { phase: 'dormant', phaseAt: 0, nextAttackAt: 0, dir: -1 } })
    );
    director.touchBoss({}, stubBoss({ bossDefeated: true }));
    director.touchBoss({}, stubBoss({ active: false }));
    assert.deepEqual(scene.calls.deaths, ['boarder']);
});

test('a runaway summon pins to the arena leash instead of roaming', async () => {
    const { clampSummonToArena } = await importModule('BoarderDirector.js');
    const cfg = { minX: 12320, maxX: 12560 };
    // 180px past the west leash with outward drift: pinned to the
    // leash edge with drift killed (L15 trace).
    let zeroed = 0;
    const west = {
        x: 12080,
        airVelocityX: -120,
        body: { velocity: { x: -120 } },
        setVelocityX: (v) => {
            zeroed = v;
        },
        summonedBy: { bossConfig: cfg },
    };
    clampSummonToArena(west);
    assert.equal(west.x, 12260);
    assert.equal(zeroed, 0);
    assert.equal(west.airVelocityX, 0);
    // Inside the leash: untouched, even mid-chase.
    const inside = {
        x: 12400,
        airVelocityX: -100,
        body: { velocity: { x: -100 } },
        setVelocityX: () => {
            throw new Error('must not touch velocity inside the leash');
        },
        summonedBy: { bossConfig: cfg },
    };
    clampSummonToArena(inside);
    assert.equal(inside.x, 12400);
    // Wave boarders (no summon tag) roam free.
    const wave = { x: 9000, summonedBy: null };
    clampSummonToArena(wave);
    assert.equal(wave.x, 9000);
});

test('the kill dissolves the boss summons but keeps wave boarders', async () => {
    const { BossDirector } = await importModule('BossDirector.js');
    const scene = stubScene();
    const director = new BossDirector(scene);
    const boss = stubBoss({ bossHp: 1, bossDefeated: false });
    scene.bossList.push(boss);
    const summoned = {
        summonedBy: boss,
        x: 12400,
        y: 300,
        gone: false,
        destroy() {
            this.gone = true;
        },
    };
    const waveBoarder = {
        summonedBy: null,
        gone: false,
        destroy() {
            this.gone = true;
        },
    };
    scene.boardersGroup = {
        getChildren: () => [summoned, waveBoarder],
        remove() {},
    };
    director.damageBoss(boss);
    assert.equal(boss.bossDefeated, true);
    assert.equal(summoned.gone, true);
    assert.equal(waveBoarder.gone, false);
});
