const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { Linter } = require('eslint');
const { rootFiles } = require('../config/runtime-assets.cjs');

const projectRoot = path.resolve(__dirname, '..');

global.Phaser = {
    Scene: class {},
    BlendModes: { ADD: 'ADD' },
    Math: {
        Clamp(value, min, max) {
            return Math.min(max, Math.max(min, value));
        },
        Between(min, _max) {
            return min;
        },
        FloatBetween(min) {
            return min;
        },
        Linear(start, end, t) {
            return start + (end - start) * t;
        },
        Angle: {
            Between() {
                return 0;
            },
        },
    },
    Input: {
        Keyboard: {
            KeyCodes: { M: 77, SPACE: 32 },
            JustDown: () => false,
            JustUp: () => false,
        },
    },
    Utils: {
        Array: {
            Remove(collection, item) {
                const index = collection.indexOf(item);
                if (index !== -1) collection.splice(index, 1);
            },
            GetRandom(items) {
                return items[0];
            },
        },
    },
};

function importModule(fileName) {
    return import(pathToFileURL(path.join(projectRoot, fileName)).href);
}

function createStorage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return {
        getItem(key) {
            return values.has(key) ? values.get(key) : null;
        },
        setItem(key, value) {
            values.set(key, String(value));
        },
        removeItem(key) {
            values.delete(key);
        },
        values,
    };
}

function request(server, requestPath, options = {}) {
    return new Promise((resolve) => {
        const headers = {};
        let statusCode = 200;
        const response = {
            setHeader(name, value) {
                headers[name.toLowerCase()] = value;
            },
            writeHead(status, responseHeaders = {}) {
                statusCode = status;
                Object.entries(responseHeaders).forEach(([name, value]) => {
                    headers[name.toLowerCase()] = value;
                });
            },
            end(data) {
                resolve({
                    statusCode,
                    headers,
                    body: data ? Buffer.from(data).toString('utf8') : '',
                });
            },
        };
        server.emit('request', { method: options.method || 'GET', url: requestPath }, response);
    });
}

test('all active JavaScript files pass the JavaScript parser', () => {
    const linter = new Linter();
    const files = [
        ...rootFiles.filter((file) => file.endsWith('.js')),
        'server.cjs',
        'config/runtime-assets.cjs',
        'scripts/build-cloudflare.cjs',
        'scripts/play-bot.mjs',
        'scripts/playtest-bot.mjs',
        'scripts/jev-playtest.mjs',
        'scripts/rl/watch-policy.mjs',
    ];
    files.forEach((file) => {
        const source = fs.readFileSync(path.join(projectRoot, file), 'utf8');
        const messages = linter.verify(source, {
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: file.endsWith('.cjs') ? 'script' : 'module',
            },
        });
        assert.deepEqual(messages, [], `${file} should parse without errors`);
    });
});

function assertAccentDecks(LevelConfig) {
    const accentDecks = {
        8: 'colonyGirder',
        9: 'hiveFang',
        10: 'spireGlass',
        11: 'bastionGrate',
        12: 'wombBone',
        13: 'harborPlank',
        14: 'foundryChain',
        15: 'skyhookPanel',
        16: 'vaultDeck',
    };
    for (const [level, key] of Object.entries(accentDecks)) {
        assert.ok(
            new LevelConfig(Number(level)).platforms.static.some(
                (platform) => platform.key === key
            ),
            `level ${level} marks its shelves with ${key}`
        );
    }
    assert.ok(new LevelConfig(9).props.some((prop) => prop.key === 'hiveSac'));
    assert.ok(new LevelConfig(10).props.some((prop) => prop.key === 'spireFin'));
    assert.ok(new LevelConfig(12).props.some((prop) => prop.key === 'wombEye'));
}

function assertArcTwoLevels(LevelConfig) {
    const harborBoarders = new LevelConfig(13).hazards.dynamic.filter(
        (hazard) => hazard.type === 'boarder'
    );
    assert.deepEqual(
        harborBoarders.map((hazard) => hazard.wave),
        [1, 1, 2, 2, 3, 3, 4, 4]
    );
    assert.ok(harborBoarders.every((hazard) => hazard.key === 'skitterling'));
    assert.ok(
        new LevelConfig(13).platforms.static.some((platform) => platform.key === 'harborDeck')
    );
    assert.ok(new LevelConfig(13).props.some((prop) => prop.key === 'harborLamp'));
    assert.ok(new LevelConfig(13).hazards.dynamic.some((hazard) => hazard.type === 'crusher'));
    assert.equal(new LevelConfig(13).crownShield, true);
    const foundryBoarders = new LevelConfig(14).hazards.dynamic.filter(
        (hazard) => hazard.type === 'boarder'
    );
    assert.deepEqual(
        foundryBoarders.map((hazard) => hazard.wave),
        [1, 1, 2, 2, 3, 3, 4, 4]
    );
    assert.ok(foundryBoarders.every((hazard) => hazard.key === 'gnawer'));
    assert.ok(
        new LevelConfig(14).platforms.static.some((platform) => platform.key === 'foundryDeck')
    );
    assert.ok(new LevelConfig(14).props.some((prop) => prop.key === 'foundryVent'));
    assert.ok(new LevelConfig(14).hazards.dynamic.some((hazard) => hazard.type === 'laser'));
    assert.ok(new LevelConfig(14).platforms.moving.length >= 1);
    assert.equal(new LevelConfig(14).crownShield, false);
    const skyhookBoarders = new LevelConfig(15).hazards.dynamic.filter(
        (hazard) => hazard.type === 'boarder'
    );
    assert.deepEqual(
        skyhookBoarders.map((hazard) => hazard.wave),
        [1, 1, 2, 2, 3, 3, 4, 4]
    );
    assert.ok(skyhookBoarders.every((hazard) => hazard.key === 'spireWarden'));
    assert.ok(
        new LevelConfig(15).platforms.static.some((platform) => platform.key === 'skyhookDeck')
    );
    assert.ok(new LevelConfig(15).props.some((prop) => prop.key === 'tetherClamp'));
    assert.ok(new LevelConfig(15).hazards.dynamic.some((hazard) => hazard.type === 'crusher'));
    assert.ok(new LevelConfig(15).hazards.dynamic.some((hazard) => hazard.type === 'laser'));
    assert.ok(new LevelConfig(15).platforms.moving.length >= 1);
    assert.equal(new LevelConfig(15).crownShield, true);
}

test('level configuration exposes every playable level', async () => {
    const { LEVEL_IDS } = await importModule('levels/index.js');
    const { LevelConfig } = await importModule('LevelConfig.js');

    assert.deepEqual(LEVEL_IDS, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    LEVEL_IDS.forEach((level) => {
        const config = new LevelConfig(level);
        assert.ok(config.world.width > 0);
        assert.ok(config.world.height > 0);
        assert.ok(Number.isFinite(config.gravity));
    });
    assert.equal(new LevelConfig(3).nextLevel, 4);
    assert.equal(new LevelConfig(4).nextLevel, 5);
    assert.equal(new LevelConfig(5).nextLevel, 6);
    assert.equal(new LevelConfig(6).nextLevel, 7);
    assert.equal(new LevelConfig(7).nextLevel, 8);
    assert.equal(new LevelConfig(8).nextLevel, 9);
    assert.equal(new LevelConfig(9).nextLevel, 10);
    assert.equal(new LevelConfig(10).nextLevel, 11);
    assert.equal(new LevelConfig(11).nextLevel, 12);
    assert.equal(new LevelConfig(12).nextLevel, 13);
    assert.equal(new LevelConfig(13).nextLevel, 14);
    assert.equal(new LevelConfig(14).nextLevel, 15);
    assert.equal(new LevelConfig(15).nextLevel, null);
    assert.equal(new LevelConfig(16).nextLevel, 14);
    assert.equal(new LevelConfig(1).title, 'Dawn Run');
    assert.equal(new LevelConfig(2).title, 'Arcade Orbit');
    assert.equal(new LevelConfig(3).title, 'Orbital Gauntlet');
    assert.equal(new LevelConfig(4).title, 'Moonfall Citadel');
    assert.equal(new LevelConfig(5).title, 'Specimen Wing');
    assert.equal(new LevelConfig(6).title, 'Red Reach');
    assert.equal(new LevelConfig(7).title, 'Earthwatch');
    assert.equal(new LevelConfig(8).title, 'Colony Drop');
    assert.equal(new LevelConfig(9).title, 'Hive Warrens');
    assert.equal(new LevelConfig(10).title, 'Spire Crown');
    assert.equal(new LevelConfig(11).title, 'Bastion Relay');
    assert.equal(new LevelConfig(12).title, 'Crimson Womb');
    assert.equal(new LevelConfig(13).title, 'Rust Harbor');
    assert.equal(new LevelConfig(14).title, 'Ember Foundry');
    assert.equal(new LevelConfig(15).title, 'Skyhook Anchor');
    assert.equal(new LevelConfig(16).title, 'Iron Vault');
    assert.equal(new LevelConfig(5).background.type, 'facility');
    assert.equal(new LevelConfig(6).background.type, 'mars');
    assert.equal(new LevelConfig(7).background.type, 'iss');
    assert.equal(new LevelConfig(8).background.type, 'colony');
    assert.equal(new LevelConfig(9).background.type, 'hive');
    assert.equal(new LevelConfig(10).background.type, 'spire');
    assert.equal(new LevelConfig(11).background.type, 'bastion');
    assert.equal(new LevelConfig(12).background.type, 'womb');
    assert.equal(new LevelConfig(13).background.type, 'harbor');
    assert.equal(new LevelConfig(14).background.type, 'foundry');
    assert.equal(new LevelConfig(15).background.type, 'skyhook');
    assert.equal(new LevelConfig(16).background.type, 'bastion');
    assert.equal(new LevelConfig(16).background.style, 'vault');
    assert.equal(new LevelConfig(7).phaser, true);
    assert.equal(new LevelConfig(8).phaser, true);
    assert.equal(new LevelConfig(9).phaser, true);
    assert.equal(new LevelConfig(10).phaser, true);
    assert.equal(new LevelConfig(11).phaser, true);
    assert.equal(new LevelConfig(12).phaser, true);
    assert.equal(new LevelConfig(13).phaser, true);
    assert.equal(new LevelConfig(14).phaser, true);
    assert.equal(new LevelConfig(15).phaser, true);
    assert.equal(new LevelConfig(16).phaser, true);
    assert.equal(new LevelConfig(1).phaser, false);
    assert.ok(new LevelConfig(5).hazards.dynamic.some((hazard) => hazard.type === 'bonk'));
    assert.ok(new LevelConfig(5).props.some((prop) => prop.key === 'bonkSign'));
    assert.ok(new LevelConfig(6).hazards.dynamic.some((hazard) => hazard.type === 'dustDevil'));
    assert.ok(new LevelConfig(6).props.some((prop) => prop.key === 'bonkSign'));
    assert.ok(
        new LevelConfig(6).hazards.dynamic.some(
            (hazard) => hazard.type === 'bonk' && hazard.key === 'beetle'
        )
    );
    const boarders = new LevelConfig(7).hazards.dynamic.filter(
        (hazard) => hazard.type === 'boarder'
    );
    assert.deepEqual(
        boarders.map((hazard) => hazard.wave),
        [1, 1, 2, 2, 3, 3, 4, 4]
    );
    assert.ok(new LevelConfig(7).platforms.static.some((platform) => platform.key === 'issHull'));
    const colonyBoarders = new LevelConfig(8).hazards.dynamic.filter(
        (hazard) => hazard.type === 'boarder'
    );
    assert.deepEqual(
        colonyBoarders.map((hazard) => hazard.wave),
        [1, 1, 2, 2, 3, 3, 4, 4]
    );
    assert.ok(
        new LevelConfig(8).platforms.static.some((platform) => platform.key === 'colonyDeck')
    );
    assert.ok(new LevelConfig(8).props.some((prop) => prop.key === 'colonyBeacon'));
    const hiveBoarders = new LevelConfig(9).hazards.dynamic.filter(
        (hazard) => hazard.type === 'boarder'
    );
    assert.deepEqual(
        hiveBoarders.map((hazard) => hazard.wave),
        [1, 2, 2, 3, 3, 4]
    );
    assert.ok(hiveBoarders.every((hazard) => hazard.key === 'gnawer'));
    assert.ok(
        new LevelConfig(9).platforms.static.some((platform) => platform.key === 'hiveChitin')
    );
    assert.ok(
        new LevelConfig(9).hazards.dynamic.some(
            (hazard) => hazard.type === 'bonk' && hazard.key === 'hiveBrute'
        )
    );
    assert.ok(
        new LevelConfig(8).hazards.dynamic.some(
            (hazard) => hazard.type === 'boarder' && hazard.key === 'skitterling'
        )
    );
    const spireBoarders = new LevelConfig(10).hazards.dynamic.filter(
        (hazard) => hazard.type === 'boarder'
    );
    assert.deepEqual(
        spireBoarders.map((hazard) => hazard.wave),
        [1, 2, 2, 3, 3, 4]
    );
    assert.ok(spireBoarders.every((hazard) => hazard.key === 'spireWarden'));
    assert.ok(
        new LevelConfig(10).platforms.static.some((platform) => platform.key === 'spireAlloy')
    );
    assert.ok(
        new LevelConfig(10).hazards.dynamic.some(
            (hazard) => hazard.type === 'drone' && hazard.key === 'voltOrb'
        )
    );
    const bastionBoarders = new LevelConfig(11).hazards.dynamic.filter(
        (hazard) => hazard.type === 'boarder'
    );
    assert.deepEqual(
        bastionBoarders.map((hazard) => hazard.wave),
        [1, 1, 2, 2, 3, 3]
    );
    assert.ok(bastionBoarders.every((hazard) => hazard.key === 'spireWarden'));
    assert.ok(
        new LevelConfig(11).platforms.static.some((platform) => platform.key === 'bastionDeck')
    );
    assert.ok(new LevelConfig(11).props.some((prop) => prop.key === 'bastionPylon'));
    assert.ok(new LevelConfig(11).hazards.dynamic.some((hazard) => hazard.type === 'crusher'));
    const wombBoarders = new LevelConfig(12).hazards.dynamic.filter(
        (hazard) => hazard.type === 'boarder'
    );
    assert.deepEqual(
        wombBoarders.map((hazard) => hazard.wave),
        [1, 2, 2, 3, 3, 4]
    );
    assert.ok(wombBoarders.every((hazard) => hazard.key === 'gnawer'));
    assert.ok(
        new LevelConfig(12).platforms.static.some((platform) => platform.key === 'wombFlesh')
    );
    assert.ok(new LevelConfig(12).hazards.dynamic.some((hazard) => hazard.type === 'laser'));
    assert.equal(new LevelConfig(12).crownShield, true);
    assertArcTwoLevels(LevelConfig);
    assertAccentDecks(LevelConfig);
    const levelThree = new LevelConfig(3);
    assert.equal(levelThree.platforms, levelThree.platforms);
    assert.equal(levelThree.background.type, 'station');
    assert.throws(() => new LevelConfig(99), /configuration not found/);
});

test('a falling chicken bonks only the top of a bonkable enemy', async () => {
    const { canBonkFromAbove, boarderSteering, boarderYields, nextBoarderWave, boarderEntryY } =
        await importModule('GameUtils.js');
    const { GAME_CONSTANTS } = await importModule('Constants.js');
    const chicken = { x: 100, y: 80, body: { velocity: { y: 120 }, height: 32 } };
    const hazard = {
        x: 100,
        y: 110,
        bonkable: true,
        displayHeight: 40,
        body: { height: 40 },
    };
    assert.equal(canBonkFromAbove(chicken, hazard, GAME_CONSTANTS.BONK_MIN_FALL_SPEED), true);
    assert.equal(
        canBonkFromAbove(
            { ...chicken, body: { velocity: { y: 0 }, height: 32 } },
            hazard,
            GAME_CONSTANTS.BONK_MIN_FALL_SPEED
        ),
        false
    );
    assert.equal(
        canBonkFromAbove({ ...chicken, y: 110 }, hazard, GAME_CONSTANTS.BONK_MIN_FALL_SPEED),
        false
    );
    hazard.bonkLock = true;
    assert.equal(canBonkFromAbove(chicken, hazard, GAME_CONSTANTS.BONK_MIN_FALL_SPEED), false);

    const chase = boarderSteering(200, 100, 40, 100, true, {
        speed: GAME_CONSTANTS.BOARDER_SPEED,
        hopVelocity: GAME_CONSTANTS.BOARDER_HOP_VELOCITY_Y,
        hopRange: GAME_CONSTANTS.BOARDER_HOP_RANGE_X,
        hopClearance: GAME_CONSTANTS.BOARDER_HOP_CLEARANCE,
    });
    assert.equal(chase.velocityX, -GAME_CONSTANTS.BOARDER_SPEED);
    assert.equal(chase.velocityY, null);
    assert.equal(chase.flipX, true);
    const hop = boarderSteering(200, 200, 80, 80, true, {
        speed: 190,
        hopVelocity: -320,
        hopRange: 230,
        hopClearance: 28,
        targetGrounded: true,
    });
    assert.equal(hop.velocityY, -320);
    assert.equal(hop.flipX, true);
    const groundedPast = boarderSteering(200, 200, 80, 80, false, {
        speed: 190,
        hopVelocity: -320,
        hopRange: 230,
        hopClearance: 28,
    });
    assert.equal(groundedPast.velocityY, null);

    const leash = {
        speed: 190,
        hopVelocity: -320,
        hopRange: 230,
        hopClearance: 48,
        aggroX: 280,
        aggroY: 260,
        homeX: 700,
        homeY: 540,
        targetGrounded: false,
    };
    const jumped = boarderSteering(700, 540, 620, 360, true, leash);
    assert.equal(jumped.velocityY, null);
    assert.equal(jumped.velocityX, 0);
    assert.equal(jumped.flipX, null);
    const jumpedAirborne = boarderSteering(700, 500, 620, 360, false, leash);
    assert.equal(jumpedAirborne.velocityX, -190);
    const posted = boarderSteering(640, 540, 150, 560, true, {
        ...leash,
        targetGrounded: true,
    });
    assert.equal(posted.velocityX, 190);
    assert.equal(posted.goalX, 700);
    const onDeck = boarderSteering(3520, 540, 3600, 400, true, {
        ...leash,
        homeX: 3320,
        homeY: 540,
        targetGrounded: true,
    });
    assert.equal(onDeck.velocityY, -320);
    const homeHop = boarderSteering(3580, 540, 150, 560, true, {
        ...leash,
        homeX: 3600,
        homeY: 400,
        targetGrounded: true,
    });
    assert.equal(homeHop.velocityY, -320);
    assert.equal(homeHop.goalX, 3600);

    assert.equal(boarderYields(100, 540, 40, [{ x: 80, y: 540 }], 42), true);
    assert.equal(boarderYields(80, 540, 40, [{ x: 100, y: 540 }], 42), false);
    assert.equal(boarderYields(100, 540, 40, [{ x: 200, y: 540 }], 42), false);

    const waves = [
        { wave: 1, x: 0 },
        { wave: 2, x: 1300 },
        { wave: 3, x: 2200 },
        { wave: 4, x: 3000 },
    ];
    assert.equal(nextBoarderWave(1, 200, waves), 1);
    assert.equal(nextBoarderWave(1, 1300, waves), 2);
    assert.equal(nextBoarderWave(1, 3400, waves), 4);
    assert.equal(nextBoarderWave(3, 3400, waves), 4);
    assert.equal(boarderEntryY(700, 540), 400);
    assert.equal(boarderEntryY(3320, 540), 512);
    assert.equal(boarderEntryY(3600, 400), 260);
});

test('elapsed times use one stable display format', async () => {
    const { formatElapsedTime, valueOrDefault } = await importModule('GameUtils.js');
    assert.equal(formatElapsedTime(0), '00:00.00');
    assert.equal(formatElapsedTime(61_239), '01:01.23');
    assert.equal(formatElapsedTime(Number.NaN), '00:00.00');
    assert.equal(valueOrDefault(undefined, 4), 4);
    assert.equal(valueOrDefault(null, 4), 4);
    assert.equal(valueOrDefault(0, 4), 0);

    const { addLoopingTween } = await importModule('GameUtils.js');
    const added = [];
    addLoopingTween({ add: (config) => added.push(config) }, { id: 1 }, { x: 10 });
    assert.equal(added[0].yoyo, true);
    assert.equal(added[0].repeat, -1);
    assert.equal(added[0].ease, 'Sine.easeInOut');
    assert.equal(added[0].x, 10);
});

test('releasing jump cuts the rise but never a bonk boost', async () => {
    const { jumpCutVelocity } = await importModule('GameUtils.js');
    const { GAME_CONSTANTS } = await importModule('Constants.js');
    const full = GAME_CONSTANTS.JUMP_VELOCITY_Y;
    const mult = GAME_CONSTANTS.JUMP_CUT_MULTIPLIER;
    assert.equal(jumpCutVelocity(full, full, mult), full * mult);
    assert.equal(jumpCutVelocity(-100, full, mult), -100);
    assert.equal(jumpCutVelocity(50, full, mult), 50);
    assert.equal(jumpCutVelocity(-520, full, mult), -520);
    assert.equal(jumpCutVelocity(full * mult, full, mult), full * mult);

    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const scene = new SpaceChicken();
    const applied = [];
    scene.player = {
        body: { velocity: { y: full } },
        setVelocityY: (vy) => applied.push(vy),
    };
    scene.applyJumpCut({ jumpReleased: true });
    assert.deepEqual(applied, [full * mult]);
    scene.applyJumpCut({ jumpReleased: false });
    scene.player.body.velocity.y = 60;
    scene.applyJumpCut({ jumpReleased: true });
    assert.deepEqual(applied, [full * mult]);
});

test('checkpoints advance on grounded crossings and never downgrade', async () => {
    const { checkpointIndexAt } = await importModule('GameUtils.js');
    const points = [
        { x: 100, y: 200 },
        { x: 300, y: 200 },
    ];
    assert.equal(checkpointIndexAt(points, 50), -1);
    assert.equal(checkpointIndexAt(points, 100), 0);
    assert.equal(checkpointIndexAt(points, 350), 1);
    assert.equal(checkpointIndexAt(null, 350), -1);

    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const scene = new SpaceChicken();
    scene.levelConfig = {
        checkpoints: points,
        playerStart: { x: 10, y: 20 },
    };
    scene.checkpointIndex = -1;
    scene.checkpointIndex2 = -1;
    scene.respawnPoint = null;
    scene.respawnPoint2 = null;
    const banners = [];
    scene.uiManager = {
        showLevelBanner: (title, subtitle) => banners.push([title, subtitle]),
    };
    scene.updateCheckpointProgress({ x: 50 }, 1, true);
    assert.equal(scene.respawnPoint, null);
    scene.updateCheckpointProgress({ x: 150 }, 1, false);
    assert.equal(scene.respawnPoint, null);
    scene.updateCheckpointProgress({ x: 150 }, 1, true);
    assert.deepEqual(scene.respawnPoint, { x: 100, y: 200 });
    assert.deepEqual(banners, [['CHECKPOINT', 'Progress saved']]);
    scene.updateCheckpointProgress({ x: 350 }, 1, true);
    assert.deepEqual(scene.respawnPoint, { x: 300, y: 200 });
    scene.updateCheckpointProgress({ x: 120 }, 1, true);
    assert.deepEqual(scene.respawnPoint, { x: 300, y: 200 });
    assert.equal(banners.length, 2);
    scene.updateCheckpointProgress({ x: 150 }, 2, true);
    assert.deepEqual(scene.respawnPoint2, { x: 100, y: 200 });
    assert.deepEqual(scene.respawnPoint, { x: 300, y: 200 });
    assert.deepEqual(scene.currentRespawnStart(1), { x: 300, y: 200 });
    assert.deepEqual(scene.currentRespawnStart(2), { x: 100, y: 200 });
    scene.respawnPoint = null;
    scene.respawnPoint2 = null;
    assert.deepEqual(scene.currentRespawnStart(1), { x: 10, y: 20 });
    assert.deepEqual(scene.currentRespawnStart(2), { x: 52, y: 20 });
});

test('long contra levels expose two ordered checkpoints', async () => {
    const { LevelConfig } = await importModule('LevelConfig.js');
    for (const level of [9, 10, 11, 12, 13, 14, 15, 16]) {
        const config = new LevelConfig(level);
        assert.equal(config.checkpoints.length, 2);
        const [first, second] = config.checkpoints;
        assert.ok(first.x > 0 && first.x < second.x && second.x < config.world.width);
        assert.ok(first.y < config.killZoneY && second.y < config.killZoneY);
    }
    assert.deepEqual(new LevelConfig(1).checkpoints, []);
});

test('leaderboards keep level 4 separate and reject corrupt times', async () => {
    const storage = createStorage();
    global.window = { localStorage: storage };
    const { LeaderboardManager } = await importModule('LeaderboardManager.js');
    const manager = new LeaderboardManager({ storageAvailable: true });

    assert.equal(manager.saveTime(4, 1234, '  Luna  '), true);
    assert.deepEqual(manager.readLeaderboard(4), [{ time: 1234, name: 'Luna' }]);
    assert.deepEqual(manager.readLeaderboard(3), []);
    assert.equal(manager.saveTime(4, Number.NaN, 'Bad'), false);
    assert.equal(manager.saveTime(99, 100, 'Bad'), false);
    assert.match(manager.formatTimes([{ time: 100, name: 'Line\nBreak' }]), /Line Break$/);

    storage.setItem(
        'spaceChickenLevel1',
        JSON.stringify([
            { time: Number.POSITIVE_INFINITY, name: 'Invalid' },
            { time: -1, name: 'Invalid' },
            { time: 500, name: 'Five' },
            400,
            { time: 300, name: 'Three' },
            { time: 200, name: 'Two' },
            { time: 100, name: 'One' },
            { time: 50, name: 'Best' },
        ])
    );
    assert.deepEqual(
        manager.readLeaderboard(1).map((entry) => entry.time),
        [50, 100, 200, 300, 400]
    );
});

test('full runs submit with deaths and old entries still read', async () => {
    const { LeaderboardManager, normalizeLeaderboardEntry } =
        await importModule('LeaderboardManager.js');
    assert.deepEqual(normalizeLeaderboardEntry({ time: 100, name: 'A', deaths: 3 }), {
        time: 100,
        name: 'A',
        deaths: 3,
    });
    assert.deepEqual(normalizeLeaderboardEntry({ time: 100, name: 'A', deaths: 0 }), {
        time: 100,
        name: 'A',
    });
    assert.deepEqual(normalizeLeaderboardEntry({ time: 100, name: 'A', deaths: -2 }), {
        time: 100,
        name: 'A',
    });
    assert.deepEqual(normalizeLeaderboardEntry({ time: 100, name: 'A' }), {
        time: 100,
        name: 'A',
    });

    const storage = createStorage({
        spaceChickenPlayerId: '12345678-1234-1234-1234-1234567890ab',
    });
    global.window = {
        localStorage: storage,
        location: { href: 'https://example.test/space-chicken/' },
    };
    const bodies = [];
    global.fetch = async (url, options) => {
        bodies.push(JSON.parse(options.body));
        return { ok: true, json: async () => ({}) };
    };
    const manager = new LeaderboardManager({ storageAvailable: true });
    manager.runTokens.set(0, Promise.resolve('12345678-1234-1234-1234-1234567890ab'));
    assert.equal(manager.saveTime(0, 60000, 'Luna', 4), true);
    await manager.lastSubmission;
    assert.equal(bodies.length, 1);
    assert.equal(bodies[0].level, 0);
    assert.equal(bodies[0].deaths, 4);
    assert.match(manager.formatTimes([{ time: 60000, name: 'Luna', deaths: 4 }]), /4 deaths$/);
    assert.match(manager.formatTimes([{ time: 60000, name: 'Luna' }]), /Luna$/);
    delete global.fetch;
});

test('level unlocks persist, clamp, and survive corrupt storage', async () => {
    const { LeaderboardManager } = await importModule('LeaderboardManager.js');
    global.window = { localStorage: createStorage({}) };
    const fresh = new LeaderboardManager({ storageAvailable: true });
    assert.equal(fresh.getMaxUnlocked(), 1);
    assert.equal(fresh.unlockLevel(4), 4);
    assert.equal(fresh.getMaxUnlocked(), 4);
    assert.equal(fresh.unlockLevel(2), 4);
    assert.equal(fresh.unlockLevel(99), 16);
    assert.equal(fresh.getMaxUnlocked(), 16);

    global.window = { localStorage: createStorage({ spaceChickenUnlocked: 'junk' }) };
    const corrupt = new LeaderboardManager({ storageAvailable: true });
    assert.equal(corrupt.getMaxUnlocked(), 1);

    const noStorage = new LeaderboardManager({ storageAvailable: false });
    assert.equal(noStorage.getMaxUnlocked(), 16);
    assert.equal(noStorage.unlockLevel(5), 16);
});

test('title selection cycles within unlocked levels and starts them', async () => {
    const { cycleSelection } = await importModule('GameUtils.js');
    assert.equal(cycleSelection(1, -1, 12), 1);
    assert.equal(cycleSelection(1, 1, 12), 2);
    assert.equal(cycleSelection(12, 1, 12), 12);
    assert.equal(cycleSelection(5, 1, 5), 5);
    assert.equal(cycleSelection(null, 1, 12), 2);
    assert.equal(cycleSelection(3, 1, null), 1);

    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const scene = new SpaceChicken();
    scene.awaitingStart = true;
    scene.selectedLevel = 1;
    scene.leaderboardManager = {
        getMaxUnlocked: () => 5,
        getPersonalBest: () => null,
    };
    const labels = [];
    scene.uiManager = { showTitleLevelSelection: (text) => labels.push(text) };
    scene.cycleTitleSelection(1);
    assert.equal(scene.selectedLevel, 2);
    assert.deepEqual(labels, ['LEVEL 2 · Arcade Orbit\nBest none yet']);
    scene.cycleTitleSelection(-1);
    scene.cycleTitleSelection(-1);
    assert.equal(scene.selectedLevel, 1);
    assert.equal(labels.length, 2);
    scene.leaderboardManager.getPersonalBest = () => 12345;
    scene.cycleTitleSelection(1);
    assert.match(labels[2], /Best 00:12\.34/);
    scene.awaitingStart = false;
    scene.cycleTitleSelection(1);
    assert.equal(scene.selectedLevel, 2);
    assert.equal(labels.length, 3);

    scene.selectedLevel = 5;
    const restarts = [];
    scene.input = { off: () => {} };
    scene.scene = { restart: (data) => restarts.push(data) };
    scene.startSelectedLevel();
    assert.deepEqual(restarts, [{ level: 5, deathCount: 0, coopMode: scene.coopMode }]);
});

test('chevron taps cycle instead of starting', async () => {
    const { InputController } = await importModule('InputController.js');
    const chevron = {
        getBounds: () => ({ x: 100, y: 100, width: 40, height: 40 }),
    };
    const scene = {
        uiManager: { raceSetupDialog: null },
        pointerTapTimes: new Map(),
    };
    const controller = new InputController(scene);
    const targets = controller.fillPointerTargets(
        { x: 120, y: 120 },
        { selectPrevButton: chevron }
    );
    assert.equal(targets.selectPrev, true);
    assert.equal(controller.isOverUiControl(targets), true);
    assert.equal(
        controller.detectTitleStart([{ justDown: true, x: 120, y: 120 }], {
            selectPrevButton: chevron,
        }),
        false
    );
    assert.equal(controller.detectTitleStart([{ justDown: true, x: 10, y: 10 }], {}), true);
});

test('remote leaderboard requests include all configured levels', async () => {
    const calls = [];
    global.window = {
        localStorage: createStorage(),
        location: { href: 'https://example.test/space-chicken/' },
    };
    global.fetch = async (url) => {
        calls.push(url);
        return {
            ok: true,
            json: async () => ({ levels: { 1: [], 2: [], 3: [], 4: [] } }),
        };
    };
    const { LeaderboardManager } = await importModule('LeaderboardManager.js');
    const manager = new LeaderboardManager({ storageAvailable: true });

    const data = await manager.fetchFirebaseLeaderboards();
    assert.deepEqual(Object.keys(data), ['1', '2', '3', '4']);
    assert.ok(calls.some((url) => url === 'https://example.test/space-chicken/api/leaderboard'));
    delete global.fetch;
});

test('all levels have distinct, layered music arrangements', async () => {
    const { MUSIC_DEFINITIONS, midiToFrequency } = await importModule('MusicConfig.js');
    const identities = new Set();

    assert.equal(midiToFrequency(69), 440);
    for (let level = 1; level <= 16; level++) {
        const definition = MUSIC_DEFINITIONS[level];
        identities.add(definition.id);
        assert.ok(definition.pattern.length >= 40, `level ${level} should have a full arrangement`);
        assert.ok(definition.loopDuration > 5);
        assert.ok(definition.pattern.some((event) => event.kind === 'tone'));
        assert.ok(definition.pattern.some((event) => event.kind === 'kick'));
        assert.ok(definition.pattern.some((event) => event.kind === 'hat'));
        const lastOffset = Math.max(...definition.pattern.map((event) => event.offset));
        assert.ok(
            lastOffset > definition.loopDuration * 0.75,
            `${definition.id} should keep playing through the loop`
        );
    }
    assert.equal(identities.size, 16);
});

test('audio scheduling routes melodic and percussion events', async () => {
    const { AudioManager } = await importModule('AudioManager.js');
    const scene = {
        level: 4,
        sound: { context: { createOscillator() {} } },
        valueOrDefault(value, fallback) {
            return value ?? fallback;
        },
    };
    const manager = new AudioManager(scene);
    const scheduled = [];
    manager.music.backgroundPattern = [
        {
            offset: 0.5,
            duration: 1,
            freqStart: 440,
            filter: { type: 'lowpass', frequency: 900 },
        },
        { kind: 'kick', offset: 0.75, duration: 0.1, volume: 0.2 },
        { kind: 'hat', offset: 1, duration: 0.05, volume: 0.04 },
    ];
    manager.voice.musicGainNode = {};
    manager.voice.playTone = (options) => scheduled.push({ voice: 'tone', options });
    manager.voice.playKick = (options) => scheduled.push({ voice: 'kick', options });
    manager.voice.playHat = (options) => scheduled.push({ voice: 'hat', options });

    manager.scheduleBackgroundPattern(10);
    assert.deepEqual(
        scheduled.map((event) => event.voice),
        ['tone', 'kick', 'hat']
    );
    assert.equal(scheduled[0].options.startTime, 10.5);
    assert.deepEqual(scheduled[0].options.filter, { type: 'lowpass', frequency: 900 });
    assert.equal(manager.getMusicDefinitionForLevel(4).id, 'lunar-horizon');

    manager.music.audioUnlocked = true;
    manager.music.backgroundPatternDuration = 2;
    manager.music.nextMusicTime = 5;
    scene.sound.context.currentTime = 4.8;
    scene.sound.context.state = 'running';
    manager.pumpMusicScheduler();
    assert.equal(scheduled.length, 6);
    assert.equal(scheduled[3].options.startTime, 5.5);
    assert.equal(manager.music.nextMusicTime, 7);
    manager.pumpMusicScheduler();
    assert.equal(scheduled.length, 6);
});

test('sound effects use distinct layered voices', async () => {
    const { AudioManager } = await importModule('AudioManager.js');
    const manager = new AudioManager({
        sound: { context: { currentTime: 12, createOscillator() {} } },
    });
    const calls = [];
    manager.voice.playTone = (options) => calls.push({ voice: 'tone', options });
    manager.voice.playNoise = (options) => calls.push({ voice: 'noise', options });
    manager.voice.playKick = (options) => calls.push({ voice: 'kick', options });

    manager.playJumpSound();
    assert.deepEqual(
        calls.map((call) => call.voice),
        ['tone', 'tone', 'noise']
    );

    calls.length = 0;
    manager.playJetpackSound();
    assert.equal(calls.filter((call) => call.voice === 'tone').length, 4);
    assert.equal(calls.filter((call) => call.voice === 'noise').length, 1);

    calls.length = 0;
    manager.playCollectSound();
    assert.equal(calls.filter((call) => call.voice === 'tone').length, 4);
    assert.equal(calls.filter((call) => call.voice === 'noise').length, 1);

    calls.length = 0;
    manager.playHazardHitSound();
    assert.deepEqual(
        calls.map((call) => call.voice),
        ['kick', 'noise', 'tone', 'tone']
    );

    calls.length = 0;
    manager.playLandSound();
    assert.deepEqual(
        calls.map((call) => call.voice),
        ['noise', 'tone']
    );

    calls.length = 0;
    manager.playStartSound();
    assert.equal(calls.filter((call) => call.voice === 'tone').length, 4);

    calls.length = 0;
    manager.playBonkSound();
    assert.deepEqual(
        calls.map((call) => call.voice),
        ['tone', 'tone', 'noise']
    );
    assert.equal(calls[0].options.freqStart, 150);
    assert.notEqual(calls[0].options.freqStart, 285);

    calls.length = 0;
    manager.playFallDeathSound();
    assert.equal(calls[0].options.freqEnd, 36);
    assert.deepEqual(
        calls.map((call) => call.voice),
        ['tone', 'noise']
    );

    calls.length = 0;
    manager.playLaserDeathSound();
    assert.equal(calls[0].options.type, 'square');
    assert.equal(calls[0].options.freqStart, 1680);

    calls.length = 0;
    manager.playBoarderThud();
    assert.deepEqual(
        calls.map((call) => call.voice),
        ['noise', 'tone']
    );
    assert.ok(calls[1].options.freqStart < 120);

    const ramps = [];
    manager.music.musicMuted = false;
    manager.music.musicVolume = 0.18;
    manager.voice.musicGainNode = {
        gain: {
            cancelScheduledValues() {},
            setValueAtTime(value, time) {
                ramps.push(['set', value, time]);
            },
            linearRampToValueAtTime(value, time) {
                ramps.push(['ramp', value, time]);
            },
        },
    };
    manager.duckMusic(200);
    assert.equal(ramps[0][1], 0.18);
    assert.ok(ramps[1][1] < 0.18);
    assert.equal(ramps[ramps.length - 1][1], 0.18);
});

test('deaths use a different stinger for a fall, a laser, and an alien', async () => {
    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const scene = new SpaceChicken();
    const played = [];
    scene.awaitingStart = false;
    scene.audioManager = {
        playFallDeathSound() {
            played.push('fall');
        },
        playLaserDeathSound() {
            played.push('laser');
        },
        playBoarderThud() {
            played.push('boarder');
        },
        playHazardHitSound() {
            played.push('hazard');
        },
        duckMusic() {
            played.push('duck');
        },
    };
    scene.restartLevel = () => {};
    scene.failFromHazard('fall');
    scene.failFromHazard('laser');
    scene.failFromHazard('boarder');
    scene.failFromHazard();
    scene.isTransitioning = false;
    scene.failFromHazard({ x: 1 });
    assert.deepEqual(played, [
        'fall',
        'duck',
        'laser',
        'duck',
        'boarder',
        'duck',
        'hazard',
        'duck',
        'hazard',
        'duck',
    ]);
});

test('bonk hit-stop is left out of the speedrun clock', async () => {
    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const { GAME_CONSTANTS } = await importModule('Constants.js');
    const scene = new SpaceChicken();
    scene.physics = { world: { isPaused: false } };
    scene.startTime = 5000;
    scene.time = {
        delayedCall(ms, callback) {
            scene.hitStopMs = ms;
            scene.releaseHitStop = callback;
            return { remove() {} };
        },
    };
    scene.holdBonkHitStop();
    assert.equal(scene.physics.world.isPaused, true);
    assert.equal(scene.hitStopMs, GAME_CONSTANTS.BONK_HITSTOP_MS);
    scene.releaseHitStop();
    assert.equal(scene.physics.world.isPaused, false);
    assert.ok(scene.startTime > 5000);
    assert.ok(scene.startTime - 5000 < 1000);
});

test('coach lines show once for the phaser and a gold cap', async () => {
    const { SpaceChicken } = await importModule('SpaceChicken.js');
    global.window = { localStorage: createStorage() };
    const scene = new SpaceChicken();
    const banners = [];
    scene.uiManager = {
        showLevelBanner(title, subtitle) {
            banners.push(`${title}:${subtitle}`);
            this.bannerTitle = { title };
        },
    };
    scene.levelConfig = { phaser: true };
    scene.maybeShowCoach();
    scene.uiManager.bannerTitle = null;
    scene.maybeShowCoach();
    scene.levelConfig = {};
    scene.dynamicHazardsGroup = {
        getChildren() {
            return [{ bonkable: true, x: 20, y: 30, visible: true }];
        },
    };
    scene.cameras = { main: { worldView: { contains: () => false } } };
    scene.maybeShowCoach();
    scene.cameras.main.worldView.contains = () => true;
    scene.maybeShowCoach();
    scene.uiManager.bannerTitle = null;
    scene.maybeShowCoach();
    assert.deepEqual(banners, ['PHASER:F, J, or the bolt button', 'BONK:Drop on the gold cap']);
});

test('vertical laser visuals and hitboxes have the same orientation', async () => {
    const { WorldBuilder } = await importModule('WorldBuilder.js');
    const scene = {};
    const body = {
        allowGravity: true,
        enable: true,
        setSize(width, height) {
            this.width = width;
            this.height = height;
        },
    };
    const beam = {
        body,
        width: 16,
        height: 16,
        scaleX: 1,
        scaleY: 1,
        setImmovable() {},
        setBlendMode() {},
        setDepth() {},
        setActive() {},
        setVisible() {},
        setDisplaySize(width, height) {
            this.displayWidth = width;
            this.displayHeight = height;
            this.scaleX = width / this.width;
            this.scaleY = height / this.height;
        },
    };
    let textureKey;
    const group = {
        create(_x, _y, key) {
            textureKey = key;
            return beam;
        },
    };
    scene.dynamicHazardEvents = [];
    scene.time = {
        delayedCall() {
            return { remove() {} };
        },
    };
    scene.add = { image: () => ({ setAngle() {}, setDepth() {} }) };

    new WorldBuilder(scene).createLaserHazard(group, {
        type: 'laser',
        x: 10,
        y: 20,
        orientation: 'vertical',
        length: 220,
        width: 10,
        emitter: false,
    });

    assert.equal(textureKey, 'laserBeamVertical');
    assert.deepEqual([beam.displayWidth, beam.displayHeight], [10, 220]);
    assert.equal(Math.round(body.width * beam.scaleX), 6);
    assert.equal(Math.round(body.height * beam.scaleY), 220);
});

test('simultaneous input sources consume only one jump', async () => {
    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const scene = new SpaceChicken();
    let jumps = 0;
    scene.handleInput = () => ({
        spaceJustPressed: true,
        upJustPressed: true,
        wJustPressed: true,
        pointerJumpTriggered: true,
        doubleTapJumpTriggered: true,
    });
    scene.attemptJump = () => {
        jumps += 1;
    };
    scene.updateGroundedState = () => false;
    scene.updatePlayerMovement = () => {};
    scene.updatePlayerAnimation = () => {};
    scene.cleanupOffscreenBombs = () => {};
    scene.muteKey = null;
    scene.gameOver = false;
    scene.jumpRequested = true;
    scene.physics = { world: { isPaused: false } };
    scene.uiManager = { updateTimer() {} };
    scene.startTime = performance.now();
    scene.player = { y: 0 };
    scene.levelConfig = { killZoneY: 100, killZoneHeight: 20 };

    scene.update();
    assert.equal(jumps, 1);
    assert.equal(scene.jumpRequested, false);
});

test('a held bot jump is edge-triggered like human input', async () => {
    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const scene = new SpaceChicken();
    scene.inputController = { poll: () => ({}) };
    scene.awaitingStart = false;
    scene.debugMode = true;
    scene.botJumpWasDown = false;
    global.window = {
        __spaceChickenBotInput: { left: false, right: true, jump: true, start: false },
    };

    scene.handleInput();
    assert.equal(scene.jumpRequested, true);
    scene.jumpRequested = false;
    scene.handleInput();
    assert.equal(scene.jumpRequested, false);

    global.window.__spaceChickenBotInput.jump = false;
    scene.handleInput();
    global.window.__spaceChickenBotInput.jump = true;
    scene.handleInput();
    assert.equal(scene.jumpRequested, true);
});

test('bot input is ignored outside debug mode', async () => {
    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const scene = new SpaceChicken();
    scene.inputController = { poll: () => ({}) };
    scene.awaitingStart = false;
    scene.debugMode = false;
    scene.leftPressed = false;
    scene.rightPressed = false;
    global.window = {
        __spaceChickenBotInput: { left: true, right: false, jump: true, start: false },
    };
    scene.handleInput();
    assert.ok(!scene.jumpRequested);
    assert.equal(scene.leftPressed, false);
    assert.equal(scene.rightPressed, false);
    delete global.window.__spaceChickenBotInput;
});

test('run token URL stays under the leaderboard API path', async () => {
    const { LeaderboardManager } = await importModule('LeaderboardManager.js');
    const manager = new LeaderboardManager({ storageAvailable: false });
    manager.getLeaderboardApiUrl = () => 'https://example.test/api/leaderboard';
    assert.equal(manager.getRunApiUrl(), 'https://example.test/api/leaderboard/run');
});

test('bot debug APIs are only exposed in debug mode', async () => {
    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const prod = new SpaceChicken();
    prod.debugMode = false;
    global.window = {};
    prod.bindBotDebugApi();
    assert.equal(global.window.__spaceChickenDebug, undefined);
    assert.equal(global.window.__spaceChickenTest, undefined);
    const debugScene = new SpaceChicken();
    debugScene.debugMode = true;
    global.window = {};
    debugScene.bindBotDebugApi();
    assert.ok(global.window.__spaceChickenDebug);
    assert.ok(global.window.__spaceChickenTest);
    delete global.window.__spaceChickenDebug;
    delete global.window.__spaceChickenTest;
});

test('debug teleport repositions the player for warm starts only in debug mode', async () => {
    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const prod = new SpaceChicken();
    prod.debugMode = false;
    assert.equal(prod.debugTeleport(500, 400), false);

    const scene = new SpaceChicken();
    scene.debugMode = true;
    scene.isTransitioning = false;
    scene.gameOver = false;
    scene.jumpCount = 3;
    scene.getGameTime = () => 1000;
    scene.getMainCamera = () => ({
        centerOn(x, y) {
            scene.centered = [x, y];
        },
    });
    scene.player = {
        x: 100,
        y: 450,
        body: {
            enable: true,
            stop() {
                this.stopped = true;
            },
            reset(x, y) {
                this.x = x;
                this.y = y;
            },
        },
        clearTint() {},
        setAlpha() {},
    };
    scene.effectsManager = { keepPlayerBodyStable() {} };
    scene.uiManager = { lastTimerDisplay: 'x', updateTimer() {} };
    assert.equal(scene.debugTeleport(900, 300), true);
    assert.equal(scene.player.body.x, 900);
    assert.equal(scene.player.body.y, 300);
    assert.equal(scene.jumpCount, 0);
    assert.deepEqual(scene.centered, [900, 300]);
    assert.equal(scene.debugTeleport(Number.NaN, 300), false);
    scene.isTransitioning = true;
    assert.equal(scene.debugTeleport(900, 300), false);
});

test('the opening scene waits for a title start on a fresh run only', async () => {
    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const scene = new SpaceChicken();

    scene.init({});
    assert.equal(scene.level, 1);
    assert.equal(scene.deathCount, 0);
    assert.equal(scene.awaitingStart, true);

    scene.init({ level: 1, deathCount: 2 });
    assert.equal(scene.awaitingStart, false);

    scene.init({ level: 3, deathCount: 0 });
    assert.equal(scene.awaitingStart, false);

    scene.init({ level: 1, deathCount: 0 });
    assert.equal(scene.awaitingStart, true);
});

test('the chicken faces the direction it is moving', async () => {
    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const scene = new SpaceChicken();
    const flips = [];
    scene.cursors = { left: { isDown: true }, right: { isDown: false } };
    scene.wasd = { A: { isDown: false }, D: { isDown: false } };
    scene.leftPressed = false;
    scene.rightPressed = false;
    scene.worldWidth = 2000;
    scene.player = {
        displayWidth: 32,
        x: 100,
        setVelocityX() {},
        setFlipX(value) {
            flips.push(value);
            this.flipX = value;
        },
    };

    scene.updatePlayerMovement();
    assert.equal(scene.player.flipX, true);

    scene.cursors.left.isDown = false;
    scene.cursors.right.isDown = true;
    scene.updatePlayerMovement();
    assert.equal(scene.player.flipX, false);
    assert.deepEqual(flips, [true, false]);
});

test('baked backgrounds reuse generated parallax textures instead of redrawing', async () => {
    const { BackgroundRenderer } = await importModule('BackgroundRenderer.js');
    const { parallaxLayersForLevel } = await importModule('Constants.js');
    const images = [];
    let graphicsCreates = 0;
    const scene = {
        level: 1,
        levelConfig: { background: { type: 'space', style: 'dawn' } },
        textures: {
            exists(key) {
                return /^space-chicken-bg-1_background_space_dawn_200x100_(sky|far|mid|near)$/.test(
                    key
                );
            },
        },
        add: {
            image(x, y, key) {
                const sprite = {
                    key,
                    depth: 0,
                    scrollFactorX: 1,
                    scrollFactorY: 1,
                    setOrigin() {
                        return this;
                    },
                    setDepth(value) {
                        this.depth = value;
                        return this;
                    },
                    setScrollFactor(x, y) {
                        this.scrollFactorX = x;
                        this.scrollFactorY = y;
                        return this;
                    },
                    setDisplaySize() {
                        return this;
                    },
                    setSize() {
                        return this;
                    },
                };
                images.push(sprite);
                return sprite;
            },
            graphics() {
                graphicsCreates += 1;
                return {};
            },
        },
    };
    const renderer = new BackgroundRenderer(scene);
    renderer.createTwinkleStars = () => {};
    renderer.render(200, 100);
    const layers = parallaxLayersForLevel(scene.level);
    assert.equal(graphicsCreates, 0);
    assert.equal(images.length, layers.length);
    layers.forEach((layer, index) => {
        assert.equal(images[index].key.endsWith(`_${layer.id}`), true);
        assert.equal(images[index].scrollFactorX, layer.scrollX);
        assert.equal(images[index].scrollFactorY, layer.scrollY);
        assert.equal(images[index].depth, layer.depth);
        assert.ok(images[index].scrollFactorX < 1);
    });
    assert.ok(layers[0].scrollX > parallaxLayersForLevel(3)[0].scrollX);
});

test('wide worlds bake a smaller background texture and stretch it', async () => {
    const { BackgroundRenderer } = await importModule('BackgroundRenderer.js');
    const { GAME_CONSTANTS } = await importModule('Constants.js');
    const generated = [];
    const images = [];
    const scene = {
        level: 2,
        levelConfig: { background: { type: 'space', style: 'arcadeOrbit' } },
        textures: {
            exists(key) {
                return generated.some((entry) => entry.key === key);
            },
        },
        add: {
            image(x, y, key) {
                const sprite = {
                    key,
                    displayWidth: 0,
                    displayHeight: 0,
                    setOrigin() {
                        return this;
                    },
                    setDepth(value) {
                        this.depth = value;
                        return this;
                    },
                    setScrollFactor(x, y) {
                        this.scrollFactorX = x;
                        this.scrollFactorY = y;
                        return this;
                    },
                    setDisplaySize(width, height) {
                        this.displayWidth = width;
                        this.displayHeight = height;
                        return this;
                    },
                    setSize() {
                        return this;
                    },
                };
                images.push(sprite);
                return sprite;
            },
            graphics() {
                return {
                    constructor: {
                        TargetCamera: {
                            zoom: 1,
                            setZoom(value) {
                                this.zoom = value;
                            },
                        },
                    },
                    setDepth() {},
                    generateTexture(key, width, height) {
                        generated.push({ key, width, height });
                    },
                    destroy() {},
                };
            },
        },
    };
    const renderer = new BackgroundRenderer(scene);
    renderer.createTwinkleStars = () => {};
    renderer.drawLayer = () => {};
    renderer.render(3000, 700);

    const { parallaxLayersForLevel } = await importModule('Constants.js');
    const layers = parallaxLayersForLevel(scene.level);
    assert.equal(generated.length, layers.length);
    generated.forEach((entry) => {
        assert.ok(entry.width <= GAME_CONSTANTS.BACKGROUND_BAKE_MAX_WIDTH);
        assert.ok(entry.width < 3000);
        assert.equal(entry.height, 700);
        assert.equal(entry.width, generated[0].width);
        assert.equal(entry.height, generated[0].height);
    });
    assert.equal(images.length, layers.length);
    const expectedWidth = renderer.parallaxSpan(3000, 3000, layers[0].scrollX);
    const expectedHeight = 700;
    images.forEach((image, index) => {
        assert.equal(image.scrollFactorX, layers[index].scrollX);
        assert.equal(image.displayWidth, expectedWidth);
        assert.equal(image.displayHeight, expectedHeight);
    });
});

test('progressive backgrounds place cached layers now and bake the rest later', async () => {
    const { BackgroundRenderer } = await importModule('BackgroundRenderer.js');
    const { parallaxLayersForLevel } = await importModule('Constants.js');
    const generated = [];
    const images = [];
    const scheduled = [];
    const scene = {
        level: 2,
        viewportWidth: 900,
        viewportHeight: 400,
        levelConfig: { background: { type: 'space', style: 'arcadeOrbit' } },
        time: {
            delayedCall(_ms, fn) {
                scheduled.push(fn);
                return {};
            },
        },
        textures: {
            exists(key) {
                return generated.some((entry) => entry.key === key);
            },
            getTextureKeys() {
                return generated.map((entry) => entry.key);
            },
            remove(key) {
                const index = generated.findIndex((entry) => entry.key === key);
                if (index >= 0) {
                    generated.splice(index, 1);
                }
            },
        },
        add: {
            image(_x, _y, key) {
                const sprite = {
                    key,
                    setOrigin() {
                        return this;
                    },
                    setDepth() {
                        return this;
                    },
                    setScrollFactor() {
                        return this;
                    },
                    setDisplaySize() {
                        return this;
                    },
                    setSize() {
                        return this;
                    },
                    destroy() {},
                };
                images.push(sprite);
                return sprite;
            },
            graphics() {
                return {
                    scaleX: 1,
                    scaleY: 1,
                    setScale() {},
                    generateTexture(key, width, height) {
                        generated.push({ key, width, height });
                    },
                    destroy() {},
                };
            },
        },
    };
    const renderer = new BackgroundRenderer(scene);
    scene.backgroundRenderer = renderer;
    renderer.createTwinkleStars = () => {};
    renderer.drawLayer = () => {};
    const layers = parallaxLayersForLevel(scene.level);

    renderer.renderProgressive(3000, 700);
    assert.equal(images.length, 0);
    assert.equal(scheduled.length, 1);

    // A second render before the queue drains must orphan the first queue.
    renderer.renderProgressive(3000, 700);
    assert.equal(images.length, 0);
    assert.equal(scheduled.length, 2);
    while (scheduled.length) {
        scheduled.shift()();
    }
    assert.equal(images.length, layers.length);
    assert.equal(generated.length, layers.length);

    // Retries hit the texture cache, so every layer lands synchronously.
    images.length = 0;
    const queued = scheduled.length;
    renderer.renderProgressive(3000, 700);
    assert.equal(images.length, layers.length);
    assert.equal(scheduled.length, queued);

    // Without a scheduler it bakes synchronously like render().
    scene.time = undefined;
    generated.length = 0;
    images.length = 0;
    renderer.renderProgressive(3000, 700);
    assert.equal(images.length, layers.length);
    assert.equal(generated.length, layers.length);
    assert.equal(scheduled.length, queued);
});

test('zoomed cameras extend parallax layers past the right edge of the screen', async () => {
    const { BackgroundRenderer } = await importModule('BackgroundRenderer.js');
    const renderer = new BackgroundRenderer({});
    const width = 1280;
    const zoom = 1280 / 1244.4444444444446;
    const world = 2000;
    const visible = width / zoom;
    const edge = (width + visible) / 2;
    const scrollMax = world - edge;
    [0.05, 0.16, 0.4, 0.7].forEach((factor) => {
        const span = renderer.axisSpan(world, width, zoom, factor);
        const layerRight = span - scrollMax * factor;
        assert.ok(
            layerRight >= edge,
            `factor ${factor} ends at ${layerRight}, screen needs ${edge}`
        );
        assert.ok(span > renderer.parallaxSpan(world, visible, factor));
    });
});

test('parallax layers are narrower than the world so the full backdrop scrolls into view', async () => {
    const { BackgroundRenderer } = await importModule('BackgroundRenderer.js');
    const { parallaxLayersForLevel } = await importModule('Constants.js');
    const generated = [];
    const images = [];
    const scene = {
        level: 2,
        viewportWidth: 900,
        viewportHeight: 400,
        levelConfig: { background: { type: 'space', style: 'arcadeOrbit' } },
        textures: {
            exists(key) {
                return generated.some((entry) => entry.key === key);
            },
        },
        add: {
            image(_x, _y, key) {
                const sprite = {
                    key,
                    displayWidth: 0,
                    displayHeight: 0,
                    setOrigin() {
                        return this;
                    },
                    setDepth() {
                        return this;
                    },
                    setScrollFactor() {
                        return this;
                    },
                    setDisplaySize(width, height) {
                        this.displayWidth = width;
                        this.displayHeight = height;
                        return this;
                    },
                    setSize() {
                        return this;
                    },
                };
                images.push(sprite);
                return sprite;
            },
            graphics() {
                return {
                    generateTexture(key, width, height) {
                        generated.push({ key, width, height });
                    },
                    destroy() {},
                };
            },
        },
    };
    const renderer = new BackgroundRenderer(scene);
    renderer.createTwinkleStars = () => {};
    renderer.drawLayer = () => {};
    renderer.render(3000, 700);

    const layers = parallaxLayersForLevel(scene.level);
    assert.equal(images.length, layers.length);
    images.forEach((image, index) => {
        assert.equal(image.displayWidth, renderer.parallaxSpan(3000, 900, layers[index].scrollX));
        assert.ok(image.displayWidth < 3000);
    });
    assert.ok(images[0].displayWidth < images[images.length - 1].displayWidth);
    const bakedCount = generated.length;
    scene.viewportWidth = 600;
    renderer.syncToCamera();
    assert.equal(generated.length, bakedCount);
    assert.equal(images[0].displayWidth, renderer.parallaxSpan(3000, 600, layers[0].scrollX));
    assert.ok(images[0].displayWidth < renderer.parallaxSpan(3000, 900, layers[0].scrollX));
});

test('timer redraws at most 20 times per second and resets immediately', async () => {
    const { UIManager } = await importModule('UIManager.js');
    const texts = [];
    const manager = new UIManager({});
    manager.timerText = {
        setText(value) {
            texts.push(value);
        },
    };
    manager.updateTimer(1000);
    manager.updateTimer(1004);
    manager.updateTimer(1010);
    manager.updateTimer(1057);
    manager.updateTimer(0);
    assert.deepEqual(texts, ['Time: 00:01.00', 'Time: 00:01.05', 'Time: 00:00.00']);
});

test('effects burst particles and squash the player with a yoyo scale tween', async () => {
    const { EffectsManager } = await importModule('EffectsManager.js');
    const tweens = [];
    const images = [];
    const scene = {
        add: {
            image(x, y, key) {
                const sprite = {
                    x,
                    y,
                    key,
                    setDepth() {
                        return this;
                    },
                    setScale() {
                        return this;
                    },
                    setTint() {
                        return this;
                    },
                    setBlendMode() {
                        return this;
                    },
                    destroy() {
                        this.destroyed = true;
                    },
                };
                images.push(sprite);
                return sprite;
            },
        },
        tweens: {
            add(config) {
                tweens.push(config);
                return { stop() {} };
            },
        },
        textures: {
            exists() {
                return true;
            },
        },
        time: { now: 1000 },
    };
    const effects = new EffectsManager(scene);
    const particles = effects.burst({ x: 10, y: 20, count: 4, tint: 0xffee00 });
    assert.equal(particles.length, 4);
    assert.equal(images.length, 4);
    assert.equal(tweens.length, 0);
    assert.ok(particles[0]._fx);
    assert.equal(particles[0]._fx.startX, 10);
    effects.stepParticles(10_000);
    assert.equal(effects.live.size, 0);
    assert.equal(effects.pool.length, 4);

    const player = {
        scaleX: 1,
        scaleY: 1,
        setScale(value) {
            this.scaleX = value;
            this.scaleY = value;
        },
    };
    effects.squashPlayer(player);
    const squash = tweens[tweens.length - 1];
    assert.equal(squash.yoyo, true);
    assert.equal(squash.scaleX, 1.26);
    assert.equal(squash.scaleY, 0.72);
});

test('effects recycle particle sprites instead of destroying them', async () => {
    const { EffectsManager } = await importModule('EffectsManager.js');
    const images = [];
    const scene = {
        add: {
            image(x, y, key) {
                const sprite = {
                    x,
                    y,
                    key,
                    setDepth() {
                        return this;
                    },
                    setScale() {
                        return this;
                    },
                    setTint() {
                        return this;
                    },
                    setBlendMode() {
                        return this;
                    },
                    setTexture(nextKey) {
                        this.key = nextKey;
                        return this;
                    },
                    setPosition(nextX, nextY) {
                        this.x = nextX;
                        this.y = nextY;
                        return this;
                    },
                    setActive() {
                        return this;
                    },
                    setVisible() {
                        return this;
                    },
                    setAlpha() {
                        return this;
                    },
                    destroy() {
                        this.destroyed = true;
                    },
                };
                images.push(sprite);
                return sprite;
            },
        },
        tweens: { add() {} },
        textures: {
            exists() {
                return true;
            },
        },
        time: { now: 1000 },
    };
    const effects = new EffectsManager(scene);
    const [first] = effects.burst({ x: 10, y: 20, count: 1, tint: 0xffffff });
    assert.equal(images.length, 1);
    effects.release(first);
    assert.equal(effects.pool.length, 1);
    const [second] = effects.burst({ x: 30, y: 40, count: 1, tint: 0xffffff });
    assert.equal(second, first);
    assert.equal(images.length, 1);
    assert.equal(effects.pool.length, 0);
});

test('a one-frame ground flicker does not emit landing dust', async () => {
    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const scene = new SpaceChicken();
    scene.init({});
    let landings = 0;
    scene.onPlayerLanded = () => {
        landings += 1;
    };
    scene.time = { now: 1000 };
    scene.player = {
        body: {
            blocked: { down: true },
            touching: { down: false },
            velocity: { y: 0 },
        },
    };

    scene.updateGroundedState();
    scene.player.body.blocked.down = false;
    scene.time.now = 1016;
    scene.updateGroundedState();
    scene.player.body.blocked.down = true;
    scene.time.now = 1032;
    scene.updateGroundedState();
    assert.equal(landings, 0);

    scene.player.body.blocked.down = false;
    scene.player.body.velocity.y = 180;
    scene.time.now = 1100;
    scene.updateGroundedState();
    scene.time.now = 1300;
    scene.player.body.blocked.down = true;
    scene.updateGroundedState();
    assert.equal(landings, 1);
});

test('dying respawns in place without rebuilding the scene', async () => {
    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const { GAME_CONSTANTS } = await importModule('Constants.js');
    const scene = new SpaceChicken();
    scene.init({ level: 1, deathCount: 2 });
    let started = 0;
    const deathLabels = [];
    scene.scene = {
        key: 'SpaceChicken',
        start() {
            started += 1;
        },
    };
    scene.time = {
        delayedCall(ms, callback) {
            scene.queuedDelay = ms;
            scene.queuedCallback = callback;
            return { remove() {} };
        },
    };
    scene.levelConfig = { playerStart: { x: 100, y: 450 } };
    scene.player = {
        x: 880,
        y: 410,
        body: {
            enable: true,
            stop() {
                this.stopped = true;
            },
            reset(x, y) {
                this.x = x;
                this.y = y;
            },
        },
        enableBody(_reset, x, y) {
            this.x = x;
            this.y = y;
            this.body.enable = true;
        },
        setTint() {},
        setAlpha() {},
        setScale() {},
        clearTint() {
            this.tinted = false;
        },
        play(key) {
            this.anim = key;
        },
    };
    scene.audioManager = { playHazardHitSound() {} };
    scene.effectsManager = { deathBurst() {}, stopPlayerScaleTween() {} };
    scene.uiManager = {
        updateDeathCount(count) {
            deathLabels.push(count);
        },
        updateTimer() {},
    };
    scene.cameras = {
        main: {
            resetFX() {},
            centerOn(x, y) {
                scene.centered = [x, y];
            },
            flash() {},
            shake() {},
        },
    };
    scene.spawnBomb = () => {
        scene.bombRestarted = true;
    };
    scene.recycleAllBombs = () => {
        scene.bombsRecycled = true;
    };
    scene.alien = {
        active: true,
        defeated: false,
        x: 160,
        y: 450,
        homeX: 700,
        homeY: 540,
        body: {
            velocity: { x: -190, y: 0 },
            reset(x, y) {
                scene.alien.x = x;
                scene.alien.y = y;
                this.velocity.x = 0;
                this.velocity.y = 0;
            },
        },
        setVelocity(x, y) {
            this.body.velocity.x = x;
            this.body.velocity.y = y;
        },
    };
    scene.boardersGroup = {
        getChildren() {
            return [scene.alien];
        },
    };

    scene.failFromHazard();
    assert.equal(scene.isTransitioning, true);
    assert.equal(scene.deathCount, 3);
    assert.equal(started, 0);
    assert.equal(scene.queuedDelay, GAME_CONSTANTS.DEATH_TRANSITION_DELAY);
    assert.deepEqual(deathLabels, [3]);
    assert.equal(scene.bombsRecycled, true);
    assert.equal(scene.player.body.enable, false);

    assert.equal(scene.alien.body.velocity.x, 0);
    assert.equal(scene.alien.x, 700);
    assert.equal(scene.alien.y, 540);
    assert.equal(scene.alien.body.enable, false);

    scene.inputController = { poll: () => ({}) };
    scene.alien.x = 160;
    scene.alien.y = 450;
    scene.alien.body.enable = true;
    scene.update(0, 16);
    assert.equal(scene.alien.x, 700);
    assert.equal(scene.alien.y, 540);
    assert.equal(scene.alien.body.enable, false);

    scene.queuedCallback();
    assert.equal(started, 0);
    assert.equal(scene.isTransitioning, false);
    assert.equal(scene.player.x, 100);
    assert.equal(scene.player.y, 450);
    assert.equal(scene.player.body.enable, true);
    assert.equal(scene.bombRestarted, true);
    assert.deepEqual(scene.centered, [100, 450]);
    assert.equal(scene.alien.x, 700);
    assert.equal(scene.alien.y, 540);
    assert.ok(scene.boarderGraceUntil > scene.getGameTime());

    scene.player.x = 700;
    scene.player.y = 540;
    scene.updateBoarders();
    assert.equal(scene.alien.x, 700);
    assert.equal(scene.alien.body.enable, false);
    scene.touchBoarder();
    assert.equal(scene.deathCount, 3);

    scene.boarderGraceUntil = 0;
    scene.killZoneFallY = 1000;
    scene.updateBoarders();
    assert.equal(scene.alien.body.enable, true);
    scene.touchBoarder();
    assert.equal(scene.deathCount, 4);
});

test('floor tiles share one collider per contiguous run', async () => {
    const { WorldBuilder } = await importModule('WorldBuilder.js');
    const visuals = [];
    const colliders = [];
    const scene = {
        worldWidth: 2000,
        add: {
            image(x, y, key) {
                const sprite = {
                    x,
                    y,
                    key,
                    setDepth() {},
                    setScale(scaleX, scaleY) {
                        this.scaleX = scaleX;
                        this.scaleY = scaleY;
                    },
                };
                visuals.push(sprite);
                return sprite;
            },
        },
        platforms: {
            create(x, y, key) {
                const sprite = {
                    x,
                    y,
                    key,
                    setDepth() {},
                    setVisible(value) {
                        this.visible = value;
                    },
                    setDisplaySize(width, height) {
                        this.displayWidth = width;
                        this.displayHeight = height;
                    },
                    refreshBody() {
                        this.refreshed = true;
                    },
                };
                colliders.push(sprite);
                return sprite;
            },
        },
    };
    const builder = new WorldBuilder(scene);
    builder.buildFloorPlatforms({
        y: 580,
        step: 100,
        scaleX: 1.5,
        scaleY: 0.3,
        condition: (x) => x < 350 || (x > 450 && x < 650),
    });

    assert.ok(visuals.length > colliders.length);
    assert.equal(colliders.length, 2);
    assert.equal(
        colliders.every((sprite) => sprite.visible === false),
        true
    );
    assert.ok(colliders[0].displayWidth > 96);
});

test('hazards cannot kill the chicken during the title screen', async () => {
    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const scene = new SpaceChicken();
    let restarted = 0;
    scene.awaitingStart = true;
    scene.isTransitioning = false;
    scene.gameOver = false;
    scene.audioManager = { playHazardHitSound() {} };
    scene.restartLevel = () => {
        restarted += 1;
    };

    scene.hitHazard();
    scene.hitKillZone();
    scene.hitBomb();
    assert.equal(restarted, 0);
});

test('title start consumes the first press without jumping', async () => {
    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const scene = new SpaceChicken();
    let jumps = 0;
    let began = 0;
    scene.handleInput = () => ({
        spaceJustPressed: true,
        upJustPressed: false,
        wJustPressed: false,
        pointerJumpTriggered: false,
        doubleTapJumpTriggered: false,
        pointerStartTriggered: false,
    });
    scene.attemptJump = () => {
        jumps += 1;
    };
    scene.beginPlay = () => {
        began += 1;
        scene.awaitingStart = false;
    };
    scene.awaitingStart = true;
    scene.gameOver = false;
    scene.jumpRequested = false;
    scene.muteKey = null;
    scene.physics = { world: { isPaused: false } };

    scene.update();
    assert.equal(began, 1);
    assert.equal(jumps, 0);
});

test('scene cleanup is idempotent and removes both lifecycle listeners', async () => {
    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const scene = new SpaceChicken();
    const removedEvents = [];
    let uiCleanups = 0;
    let audioCleanups = 0;
    let effectCleanups = 0;
    scene.hasCleanedUp = false;
    scene.events = {
        off(eventName) {
            removedEvents.push(eventName);
        },
    };
    scene.uiManager = { cleanup: () => (uiCleanups += 1) };
    scene.audioManager = { cleanupAudio: () => (audioCleanups += 1) };
    scene.effectsManager = { cleanup: () => (effectCleanups += 1) };
    scene.bombSpawnEvent = null;
    scene.dynamicHazardEvents = [];
    scene.activeWarningGraphics = [];
    scene.pointerTapTimes = new Map([[1, 100]]);

    scene.cleanup();
    scene.cleanup();

    assert.equal(uiCleanups, 1);
    assert.equal(audioCleanups, 1);
    assert.equal(effectCleanups, 1);
    assert.ok(removedEvents.includes('shutdown'));
    assert.ok(removedEvents.includes('destroy'));
    assert.equal(scene.pointerTapTimes.size, 0);
});

test('the development server serves only game assets', async () => {
    const { createServer } = require('../server.cjs');
    const server = createServer();

    const index = await request(server, '/');
    assert.equal(index.statusCode, 200);
    assert.match(index.body, /Space Chicken Game/);
    assert.equal(index.headers['x-content-type-options'], 'nosniff');

    assert.equal((await request(server, '/SpaceChicken.js')).statusCode, 200);
    assert.equal((await request(server, '/EffectsManager.js')).statusCode, 200);
    assert.equal((await request(server, '/BackgroundRenderer.js')).statusCode, 200);
    assert.equal((await request(server, '/WorldBuilder.js')).statusCode, 200);
    assert.equal((await request(server, '/levels/index.js')).statusCode, 200);
    assert.equal((await request(server, '/enemies/laser.js')).statusCode, 200);
    assert.equal((await request(server, '/music/score.js')).statusCode, 200);
    assert.equal((await request(server, '/InputController.js')).statusCode, 200);
    assert.equal((await request(server, '/Viewport.js')).statusCode, 200);
    assert.equal((await request(server, '/GameTestInterface.js')).statusCode, 200);
    assert.equal((await request(server, '/GameUtils.js')).statusCode, 200);
    assert.equal(
        (await request(server, '/vendor/phaser-arcade-physics-3.70.0.min.js')).statusCode,
        200
    );
    assert.equal((await request(server, '/.git/config')).statusCode, 404);
    assert.equal((await request(server, '/package.json')).statusCode, 404);
    assert.equal((await request(server, '/', { method: 'POST' })).statusCode, 405);
    // On-device verification pages are served locally but never deployed.
    assert.equal((await request(server, '/performance.html')).statusCode, 200);
    assert.equal((await request(server, '/PerformanceTest.js')).statusCode, 200);
    assert.equal((await request(server, '/PerformanceMetrics.js')).statusCode, 200);
});

test('the Cloudflare build contains only deployable runtime assets', async () => {
    const {
        buildStaticSite,
        outputDirectory,
        runtimeFiles,
    } = require('../scripts/build-cloudflare.cjs');
    await buildStaticSite();

    const deployedFiles = await fs.promises.readdir(outputDirectory);
    assert.ok(deployedFiles.includes('index.html'));
    assert.ok(deployedFiles.includes('_headers'));
    assert.ok(deployedFiles.includes('vendor'));
    assert.equal(deployedFiles.includes('package.json'), false);
    assert.equal(deployedFiles.includes('tests'), false);
    assert.equal(deployedFiles.includes('performance.html'), false);
    assert.equal(deployedFiles.includes('PerformanceTest.js'), false);
    assert.equal(deployedFiles.includes('PerformanceMetrics.js'), false);
    for (const file of runtimeFiles) {
        await fs.promises.access(path.join(outputDirectory, file));
    }
    await fs.promises.access(
        path.join(outputDirectory, 'vendor', 'phaser-arcade-physics-3.70.0.min.js')
    );
});

test('viewport metrics shrink HUD and keep large controls on phones and tablets', async () => {
    const { Viewport } = await importModule('Viewport.js');
    const phone = new Viewport({ viewportWidth: 390, viewportHeight: 844 });
    const phoneMetrics = phone.getLayoutMetrics({ top: 47, right: 0, bottom: 34, left: 0 });
    assert.equal(phoneMetrics.isPortrait, true);
    assert.equal(phoneMetrics.isCompact, true);
    assert.ok(phoneMetrics.fonts.timer < 32);
    assert.ok(phoneMetrics.fonts.title < 56);
    assert.ok(phoneMetrics.controlSize >= 72);

    const landscapePhone = new Viewport({ viewportWidth: 844, viewportHeight: 390 });
    const landscapeMetrics = landscapePhone.getLayoutMetrics({
        top: 0,
        right: 47,
        bottom: 21,
        left: 47,
    });
    assert.equal(landscapeMetrics.isPortrait, false);
    assert.equal(landscapeMetrics.isCompact, true);
    assert.ok(landscapeMetrics.controlSize >= 72);

    const tablet = new Viewport({ viewportWidth: 1024, viewportHeight: 768 });
    const tabletMetrics = tablet.getLayoutMetrics({ top: 0, right: 0, bottom: 0, left: 0 });
    assert.equal(tabletMetrics.isCompact, false);
    assert.equal(tabletMetrics.fonts.timer, 32);
    assert.ok(tabletMetrics.controlSize <= 108);
    assert.ok(tabletMetrics.controlSize >= 64);

    assert.equal(phone.fitFontSize(56, 500, 300, 22), 33);
    assert.equal(phone.fitFontSize(56, 200, 300, 22), 56);
});

test('touch arrow buttons move the chicken and do not steal the jump pointer', async () => {
    const { InputController } = await importModule('InputController.js');
    const leftButton = {
        getBounds() {
            return { x: 10, y: 500, width: 80, height: 80 };
        },
    };
    const rightButton = {
        getBounds() {
            return { x: 110, y: 500, width: 80, height: 80 };
        },
    };
    const jumpButton = {
        getBounds() {
            return { x: 280, y: 500, width: 80, height: 80 };
        },
    };
    const scene = {
        space: {},
        cursors: { up: {} },
        wasd: { W: {} },
        jumpPointerId: null,
        leftPressed: false,
        rightPressed: false,
        pointerTapTimes: new Map(),
        getViewportWidth() {
            return 390;
        },
        uiManager: {
            touchControlsEnabled: true,
            touchMovementMidpoint: 195,
            jumpButton,
            leftButton,
            rightButton,
            musicToggleButton: null,
            leaderboardButton: null,
            playerNameText: null,
        },
        input: {
            pointers: [{ id: 1, isDown: true, justDown: false, justUp: false, x: 40, y: 540 }],
        },
    };
    const controller = new InputController(scene);

    controller.poll();
    assert.equal(scene.leftPressed, true);
    assert.equal(scene.rightPressed, false);

    scene.input.pointers = [
        { id: 2, isDown: true, justDown: false, justUp: false, x: 140, y: 540 },
    ];
    controller.poll();
    assert.equal(scene.leftPressed, false);
    assert.equal(scene.rightPressed, true);
    assert.equal(controller.state.jumpReleased, false);

    const justUp = global.Phaser.Input.Keyboard.JustUp;
    global.Phaser.Input.Keyboard.JustUp = (key) => key === scene.space;
    controller.poll();
    assert.equal(controller.state.jumpReleased, true);
    global.Phaser.Input.Keyboard.JustUp = justUp;

    scene.jumpPointerId = 3;
    scene.input.pointers = [
        { id: 3, isDown: true, justDown: false, justUp: false, x: 320, y: 540 },
    ];
    controller.poll();
    assert.equal(scene.leftPressed, false);
    assert.equal(scene.rightPressed, false);

    scene.jumpPointerId = null;
    scene.input.pointers = [
        { id: 4, isDown: true, justDown: false, justUp: false, x: 200, y: 180 },
    ];
    controller.poll();
    assert.equal(scene.leftPressed, false);
    assert.equal(scene.rightPressed, false);
});

test('releasing the touch jump button reports jumpReleased for the jump cut', async () => {
    const { InputController } = await importModule('InputController.js');
    const { UIManager } = await importModule('UIManager.js');
    const scene = {
        space: {},
        cursors: { up: {} },
        wasd: { W: {} },
        jumpPointerId: 7,
        touchJumpReleased: false,
        leftPressed: false,
        rightPressed: false,
        pointerTapTimes: new Map(),
        getViewportWidth() {
            return 390;
        },
        uiManager: null,
        input: {
            pointers: [{ id: 7, isDown: true, justDown: false, justUp: false, x: 320, y: 540 }],
        },
    };
    const ui = Object.create(UIManager.prototype);
    ui.scene = scene;
    ui.jumpButton = { clearTint() {} };
    const controller = new InputController(scene);

    controller.poll();
    assert.equal(controller.state.jumpReleased, false);

    ui.onJumpButtonUp({ id: 7 });
    assert.equal(scene.jumpPointerId, null);
    assert.equal(scene.touchJumpReleased, true);
    scene.input.pointers = [];
    assert.equal(controller.poll().jumpReleased, true);
    assert.equal(scene.touchJumpReleased, false);
    assert.equal(controller.poll().jumpReleased, false);

    // The poll backstop catches a lift the button handlers missed.
    scene.jumpPointerId = 9;
    scene.input.pointers = [];
    assert.equal(controller.poll().jumpReleased, true);
    assert.equal(controller.poll().jumpReleased, false);
});

test('standard gamepad maps stick, d-pad, and jump edges', async () => {
    const { InputController } = await importModule('InputController.js');
    const pad = {
        connected: true,
        axes: [0.8],
        buttons: Array.from({ length: 17 }, () => ({ pressed: false })),
    };
    const previousNavigator = global.navigator;
    Object.defineProperty(global, 'navigator', {
        configurable: true,
        value: { getGamepads: () => [pad] },
    });
    const scene = {
        space: {},
        cursors: { up: {} },
        wasd: { W: {} },
        jumpPointerId: null,
        pointerTapTimes: new Map(),
        leftPressed: false,
        rightPressed: false,
        getViewportWidth: () => 800,
        input: { pointers: [] },
        uiManager: null,
    };
    try {
        const controller = new InputController(scene);
        pad.buttons[0].pressed = true;
        const first = controller.poll();
        assert.equal(scene.rightPressed, true);
        assert.equal(first.gamepadJumpJustPressed, false, 'held button cannot start after restart');
        pad.buttons[0].pressed = false;
        controller.poll();
        pad.buttons[0].pressed = true;
        assert.equal(controller.poll().gamepadJumpJustPressed, true);
        assert.equal(controller.state.menu.confirm, true);
        const held = controller.poll();
        assert.equal(held.gamepadJumpJustPressed, false);
        pad.axes[0] = 0;
        pad.buttons[0].pressed = false;
        pad.buttons[14].pressed = true;
        controller.poll();
        assert.equal(scene.leftPressed, true);
        assert.equal(scene.rightPressed, false);
    } finally {
        Object.defineProperty(global, 'navigator', {
            configurable: true,
            value: previousNavigator,
        });
    }
});

test('Phaser manager retains movement while a second finger jumps', async () => {
    const { InputController } = await importModule('InputController.js');
    const move = { id: 1, isDown: true, x: 120, y: 520 };
    const jump = { id: 2, isDown: true, x: 320, y: 520 };
    const scene = {
        space: {},
        cursors: { up: {} },
        wasd: { W: {} },
        jumpPointerId: 2,
        pointerTapTimes: new Map(),
        getViewportWidth: () => 390,
        input: { manager: { pointers: [move, jump] }, activePointer: jump },
        uiManager: {
            touchControlsEnabled: true,
            rightButton: { getBounds: () => ({ x: 100, y: 480, width: 80, height: 80 }) },
            jumpButton: { getBounds: () => ({ x: 280, y: 480, width: 80, height: 80 }) },
        },
    };
    const controller = new InputController(scene);
    controller.poll();
    assert.equal(scene.rightPressed, true);
    assert.equal(scene.jumpPointerId, 2);
    assert.equal(controller.getActivePointers().length, 2);
    move.isDown = false;
    controller.poll();
    assert.equal(scene.rightPressed, false);
});

test('touch controls sit in the bottom corners on a phone-sized viewport', async () => {
    const { UIManager } = await importModule('UIManager.js');
    const { Viewport } = await importModule('Viewport.js');

    function fakeButton() {
        return {
            displayWidth: 80,
            displayHeight: 80,
            width: 128,
            height: 128,
            x: 0,
            y: 0,
            input: { hitArea: { setTo() {} } },
            setDisplaySize(width, height) {
                this.displayWidth = width;
                this.displayHeight = height;
            },
            setPosition(x, y) {
                this.x = x;
                this.y = y;
            },
        };
    }

    const scene = {
        viewportWidth: 390,
        viewportHeight: 844,
        getViewportWidth() {
            return this.viewportWidth;
        },
        getViewportHeight() {
            return this.viewportHeight;
        },
    };
    scene.viewport = new Viewport(scene);
    const ui = new UIManager(scene);
    ui.leftButton = fakeButton();
    ui.rightButton = fakeButton();
    ui.jumpButton = fakeButton();
    ui.cachedInsets = { top: 47, right: 0, bottom: 34, left: 0 };
    ui.layoutTouchControls();

    assert.ok(ui.leftButton.x < ui.rightButton.x);
    assert.ok(ui.rightButton.x < ui.jumpButton.x);
    assert.ok(ui.jumpButton.x > 390 / 2);
    assert.ok(ui.leftButton.x < 390 / 2);
    assert.equal(ui.leftButton.y, ui.jumpButton.y);
    assert.ok(ui.leftButton.y > 700);
    assert.ok(ui.leftButton.displayWidth >= 72);
    assert.ok(ui.jumpButton.x + ui.jumpButton.displayWidth / 2 <= 390);
});

test('fire sits left of jump on the same row with switch above', async () => {
    const { UIManager } = await importModule('UIManager.js');
    const { Viewport } = await importModule('Viewport.js');
    function fakeButton() {
        return {
            x: 0,
            y: 0,
            input: { hitArea: { setTo() {} } },
            setDisplaySize(width, height) {
                this.displayWidth = width;
                this.displayHeight = height;
            },
            setPosition(x, y) {
                this.x = x;
                this.y = y;
            },
        };
    }
    const scene = {
        viewportWidth: 390,
        viewportHeight: 844,
        getViewportWidth() {
            return this.viewportWidth;
        },
        getViewportHeight() {
            return this.viewportHeight;
        },
    };
    scene.viewport = new Viewport(scene);
    const ui = new UIManager(scene);
    ui.jumpButton = fakeButton();
    ui.phaserButton = fakeButton();
    ui.weaponButton = fakeButton();
    ui.cachedInsets = { top: 47, right: 0, bottom: 34, left: 0 };
    ui.layoutTouchControls();

    assert.ok(ui.phaserButton.x < ui.jumpButton.x);
    assert.equal(ui.phaserButton.y, ui.jumpButton.y);
    assert.equal(ui.weaponButton.x, ui.phaserButton.x);
    assert.ok(ui.weaponButton.y < ui.phaserButton.y);
    assert.ok(ui.phaserButton.x - ui.phaserButton.displayWidth / 2 > 390 / 2);
});

test('sliding between fire and jump holds both like an NES roll', async () => {
    const { UIManager } = await importModule('UIManager.js');
    function eventButton(x, y) {
        const handlers = {};
        return {
            x,
            y,
            displayWidth: 80,
            displayHeight: 80,
            handlers,
            on(event, fn) {
                (handlers[event] = handlers[event] || []).push(fn);
            },
            emit(event, pointer) {
                (this.handlers[event] || []).forEach((fn) => fn(pointer));
            },
            setTint() {},
            clearTint() {},
            setScrollFactor() {},
            setDepth() {},
            setAlpha() {},
            setInteractive() {},
            disableInteractive() {},
            setVisible() {},
        };
    }
    const jumpStub = eventButton(330, 780);
    const phaserStub = eventButton(230, 780);
    const scene = {
        jumpPointerId: null,
        jumpRequested: false,
        phaserPointerId: null,
        phaserHeld: false,
        add: { image: () => eventButton(0, 0) },
        input: { keyboard: { on() {} } },
    };
    const ui = new UIManager(scene);
    ui.jumpButton = jumpStub;
    ui.phaserButton = phaserStub;
    // Wire the real handlers onto the stubs.
    const wiredJump = ui.createJumpButton();
    const wiredPhaser = ui.createPhaserButton();
    ui.jumpButton = Object.assign(jumpStub, { handlers: wiredJump.handlers });
    ui.phaserButton = Object.assign(phaserStub, { handlers: wiredPhaser.handlers });

    const finger = { id: 7, isDown: true, x: 230, y: 780 };
    ui.phaserButton.emit('pointerdown', finger);
    assert.equal(scene.phaserHeld, true);
    // Slide onto jump: both stay held.
    finger.x = 330;
    ui.phaserButton.emit('pointerout', finger);
    ui.jumpButton.emit('pointerover', finger);
    assert.equal(scene.phaserHeld, true);
    assert.equal(scene.jumpPointerId, 7);
    assert.equal(scene.jumpRequested, true);
    // Lift: both release.
    finger.isDown = false;
    ui.jumpButton.emit('pointerup', finger);
    ui.phaserButton.emit('pointerupoutside', finger);
    assert.equal(scene.phaserHeld, false);
    assert.equal(scene.jumpPointerId, null);
    // Hover without touch never engages.
    scene.jumpRequested = false;
    ui.jumpButton.emit('pointerover', { id: 9, isDown: false, x: 330, y: 780 });
    assert.equal(scene.jumpPointerId, null);
    assert.equal(scene.jumpRequested, false);
    // Sliding off into space releases.
    const other = { id: 11, isDown: true, x: 230, y: 780 };
    ui.phaserButton.emit('pointerdown', other);
    other.x = 230;
    other.y = 500;
    ui.phaserButton.emit('pointerout', other);
    assert.equal(scene.phaserHeld, false);
});

test('resizing a touch session stores the viewport and offsets the camera', async () => {
    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const scene = new SpaceChicken();
    const follow = [];
    scene.worldWidth = 2000;
    scene.worldHeight = 700;
    scene.uiManager = {
        touchControlsEnabled: true,
        handleResize() {},
        getSafeAreaInsets() {
            return { top: 0, right: 0, bottom: 0, left: 0 };
        },
    };
    scene.cameras = {
        main: {
            setBounds() {},
            setFollowOffset(x, y) {
                follow.push([x, y]);
            },
        },
    };

    scene.handleResize({ width: 390, height: 844 });
    assert.equal(scene.viewportWidth, 390);
    assert.equal(scene.viewportHeight, 844);
    assert.equal(follow.length, 1);
    assert.equal(follow[0][0], 0);
    assert.ok(follow[0][1] < 0);
    assert.ok(scene.playCameraZoom >= 1);
});

test('split panes sit side by side on a wide screen and stack on a tall one', async () => {
    const { splitPanes, paneZoom, SPLIT_GAP } = await importModule('SplitScreen.js');
    const wide = splitPanes(1280, 720);
    assert.equal(wide.sideBySide, true);
    assert.equal(wide.panes[0].x, 0);
    assert.equal(wide.panes[1].x, wide.panes[0].width + SPLIT_GAP);
    assert.equal(wide.panes[0].width + SPLIT_GAP + wide.panes[1].width, 1280);
    assert.equal(wide.panes[0].height, 720);
    assert.equal(wide.panes[1].height, 720);

    const tall = splitPanes(390, 844);
    assert.equal(tall.sideBySide, false);
    assert.equal(tall.panes[0].y, 0);
    assert.equal(tall.panes[1].y, tall.panes[0].height + SPLIT_GAP);
    assert.equal(tall.panes[0].height + SPLIT_GAP + tall.panes[1].height, 844);
    assert.ok(paneZoom({ width: 640, height: 900 }, 700) > 1);
    assert.equal(paneZoom({ width: 390, height: 400 }, 700), 1);
});

test('the first chicken to the crown wins and the other is lined up for the bomb', async () => {
    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const scene = new SpaceChicken();
    const bombs = [];
    scene.awaitingStart = false;
    scene.isTransitioning = false;
    scene.gameOver = false;
    scene.raceFinale = false;
    scene.startTime = performance.now() - 2500;
    scene.worldWidth = 2000;
    scene.player = {
        x: 100,
        y: 400,
        setVelocity(x, y) {
            this.vx = x;
            this.vy = y;
        },
        setTint() {},
        setAngularVelocity() {},
        setBounce() {},
        body: { enable: true },
    };
    scene.player2 = {
        x: 800,
        y: 420,
        setVelocity(x, y) {
            this.vx = x;
            this.vy = y;
        },
        setTint() {},
    };
    scene.crown = { x: 1800, y: 300 };
    scene.coopMode = 'keyboard';
    scene.audioManager = { playCollectSound() {}, playHazardHitSound() {} };
    scene.uiManager = {
        showRaceBanner(winner) {
            scene.banner = winner;
        },
    };
    scene.effectsManager = { collectBurst() {}, deathBurst() {} };
    scene.clearBombSpawns = () => {};
    scene.cameraFor = () => ({ flash() {}, shake() {} });
    scene.add = {
        image(x, y, key) {
            const bomb = { x, y, key, setDepth() {}, setScale() {}, destroy() {} };
            bombs.push(bomb);
            return bomb;
        },
        text() {
            return { setOrigin() {}, setDepth() {}, destroy() {} };
        },
    };
    scene.tweens = {
        add(config) {
            scene.tween = config;
            return config;
        },
    };
    scene.time = {
        delayedCall() {
            return { remove() {} };
        },
    };
    scene.assignCameraFilter = () => {};

    scene.collectGem(scene.player2);
    assert.equal(scene.raceWinner, 2);
    assert.equal(scene.banner, 2);
    assert.equal(scene.isTransitioning, true);
    assert.equal(bombs.length, 1);
    assert.equal(bombs[0].key, 'bomb');
    assert.equal(bombs[0].x, 100);
    scene.tween.onComplete();
    assert.ok(scene.player.vy < -400);
    assert.equal(scene.player2.vy, -150);

    scene.raceFinale = false;
    scene.isTransitioning = false;
    scene.gameOver = false;
    scene.raceWinner = 0;
    let queued = false;
    scene.player2 = null;
    scene.queueSceneStart = () => {
        queued = true;
    };
    scene.leaderboardManager = {
        getPersonalBest() {
            return null;
        },
        ensurePlayerName() {
            return 'Ada';
        },
        saveTime() {},
        lastSubmission: null,
    };
    scene.uiManager.updatePlayerName = () => {};
    scene.uiManager.showLevelResult = () => {};
    scene.level = 1;
    scene.levelConfig = { nextLevel: 2 };
    scene.debugMode = true;
    scene.collectGem(scene.player);
    assert.equal(queued, true);
    assert.equal(scene.raceWinner, 0);
});

test('UI objects are removed from the world camera after being marked', async () => {
    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const scene = new SpaceChicken();
    scene.cameras = {
        main: { id: 1, ignore() {} },
    };
    scene.uiCamera = { id: 2, ignore() {} };
    const title = { cameraFilter: 0 };
    scene.assignCameraFilter(title);
    assert.equal(title.cameraFilter, 2);
    title.spaceChickenUi = true;
    scene.assignCameraFilter(title);
    assert.equal(title.cameraFilter, 1);

    scene.player2Camera = { id: 4, ignore() {} };
    const world = { cameraFilter: 0 };
    scene.assignCameraFilter(world);
    assert.equal(world.cameraFilter, 2);
    const splitUi = { cameraFilter: 0, spaceChickenUi: true };
    scene.assignCameraFilter(splitUi);
    assert.equal(splitUi.cameraFilter, 5);
});

test('instructions stay hidden until the level banner has finished', async () => {
    const { UIManager } = await importModule('UIManager.js');
    const { GAME_CONSTANTS } = await importModule('Constants.js');
    const delays = [];
    const manager = new UIManager({
        time: {
            delayedCall(ms) {
                delays.push(ms);
                return { remove() {} };
            },
        },
    });
    manager.text = {
        visible: true,
        setAlpha() {},
        setVisible(value) {
            this.visible = value;
        },
    };

    manager.scheduleInstructionFade();
    assert.equal(manager.text.visible, false);
    assert.equal(
        delays[0],
        GAME_CONSTANTS.LEVEL_BANNER_HOLD_MS + GAME_CONSTANTS.INSTRUCTION_FADE_MS
    );
});

test('touch instructions describe the on-screen arrow controls', async () => {
    const { LevelConfig } = await importModule('LevelConfig.js');
    const config = new LevelConfig(1);
    assert.match(config.touchInstructions, /arrow/i);
    assert.match(config.touchInstructions, /jump/i);
});

test('the Jev playtest keeps the API key in Node and walks toward the crown', async () => {
    const { fallbackAction, readTypeSafeApiKey } = await importModule('scripts/jev-playtest.mjs');
    const savedOfficial = process.env.TYPESAFE_API_KEY;
    const savedAlias = process.env.typesafekey;
    delete process.env.TYPESAFE_API_KEY;
    process.env.typesafekey = 'alias-key';
    assert.equal(readTypeSafeApiKey(), 'alias-key');
    process.env.TYPESAFE_API_KEY = 'official-key';
    assert.equal(readTypeSafeApiKey(), 'official-key');
    if (savedOfficial === undefined) delete process.env.TYPESAFE_API_KEY;
    else process.env.TYPESAFE_API_KEY = savedOfficial;
    if (savedAlias === undefined) delete process.env.typesafekey;
    else process.env.typesafekey = savedAlias;

    const action = fallbackAction({
        availableActions: ['wait', 'move_right', 'jump_right'],
        player: { grounded: true },
        objective: { dx: 420, dy: 8 },
        navigation: {},
        nearby: { hazards: [], bombs: [] },
    });
    assert.equal(action, 'move_right');
});

test('the Jev fallback fires at a level boarder instead of walking into it', async () => {
    const { fallbackAction } = await importModule('scripts/jev-playtest.mjs');
    const action = fallbackAction({
        availableActions: ['wait', 'move_right', 'fire', 'fire_right', 'jump_right'],
        canShoot: true,
        player: { grounded: true },
        objective: { dx: 420, dy: 8 },
        navigation: {},
        nearby: {
            hazards: [{ type: 'boarder', active: true, dx: 200, dy: 10 }],
            bombs: [],
        },
    });
    assert.equal(action, 'fire_right');
    const noGun = fallbackAction({
        availableActions: ['wait', 'move_right', 'fire', 'fire_right', 'jump_right'],
        canShoot: false,
        player: { grounded: true },
        objective: { dx: 420, dy: 8 },
        navigation: {},
        nearby: {
            hazards: [{ type: 'boarder', active: true, dx: 200, dy: 10 }],
            bombs: [],
        },
    });
    assert.equal(noGun, 'move_right');
});

test('the Jev validation offsets seeds per run and summarizes them', async () => {
    const { JEV_MAX_SEED, seedForRun, summarizeRuns } = await importModule(
        'scripts/jev-playtest.mjs'
    );
    assert.equal(seedForRun(7, 0), 7);
    assert.equal(seedForRun(7, 2), 9);
    assert.equal(seedForRun(JEV_MAX_SEED, 1), 0);

    const summary = summarizeRuns([
        {
            run: 1,
            seed: 7,
            ok: true,
            passed: true,
            failures: [],
            jevDecisions: 40,
            finalObservation: { deaths: 1 },
            durationMs: 10000,
            usage: { input_tokens: 100, output_tokens: 20 },
        },
        {
            run: 2,
            seed: 8,
            ok: false,
            passed: false,
            failures: [{ kind: 'objective_not_completed' }],
            jevDecisions: 30,
            finalObservation: { deaths: 3 },
            durationMs: 20000,
            usage: { input_tokens: 80, output_tokens: 10 },
        },
    ]);
    assert.equal(summary.runs, 2);
    assert.equal(summary.passedCount, 1);
    assert.equal(summary.okCount, 1);
    assert.equal(summary.passRate, 0.5);
    assert.equal(summary.ok, false);
    assert.equal(summary.totalJevDecisions, 70);
    assert.equal(summary.totalDeaths, 4);
    assert.equal(summary.meanDurationMs, 15000);
    assert.deepEqual(summary.usage, { input_tokens: 180, output_tokens: 30 });
    assert.deepEqual(summary.failures, [{ run: 2, seed: 8, kind: 'objective_not_completed' }]);

    const clean = summarizeRuns([
        {
            run: 1,
            seed: 7,
            ok: true,
            passed: true,
            failures: [],
            jevDecisions: 5,
            finalObservation: { deaths: 0 },
            durationMs: 5000,
            usage: { input_tokens: 10, output_tokens: 2 },
        },
    ]);
    assert.equal(clean.ok, true);
    assert.equal(clean.passRate, 1);
});

test('colony guns unlock by level and cycle past the phaser', async () => {
    const { WEAPON_DEFS, nextWeaponId, weaponsForLevel } = await importModule('GameUtils.js');
    assert.deepEqual(weaponsForLevel(7), ['phaser']);
    assert.deepEqual(weaponsForLevel(8), ['phaser', 'scatter']);
    assert.deepEqual(weaponsForLevel(9), ['phaser', 'scatter', 'piercer']);
    assert.deepEqual(weaponsForLevel(10), ['phaser', 'scatter', 'piercer', 'nova']);
    assert.deepEqual(weaponsForLevel(11), ['phaser', 'scatter', 'piercer', 'nova', 'tempest']);
    assert.deepEqual(weaponsForLevel(12), [
        'phaser',
        'scatter',
        'piercer',
        'nova',
        'tempest',
        'hail',
    ]);
    assert.deepEqual(weaponsForLevel(13), [
        'phaser',
        'scatter',
        'piercer',
        'nova',
        'tempest',
        'hail',
        'ripper',
    ]);
    assert.deepEqual(weaponsForLevel(14), [
        'phaser',
        'scatter',
        'piercer',
        'nova',
        'tempest',
        'hail',
        'ripper',
        'comet',
    ]);
    assert.deepEqual(weaponsForLevel(15), [
        'phaser',
        'scatter',
        'piercer',
        'nova',
        'tempest',
        'hail',
        'ripper',
        'comet',
        'halo',
    ]);
    assert.equal(nextWeaponId('phaser', 8), 'scatter');
    assert.equal(nextWeaponId('scatter', 8), 'phaser');
    assert.equal(nextWeaponId('nova', 10), 'phaser');
    assert.equal(nextWeaponId('nova', 8), 'phaser');
    assert.equal(nextWeaponId('nova', 11), 'tempest');
    assert.equal(nextWeaponId('hail', 12), 'phaser');
    assert.equal(nextWeaponId('hail', 13), 'ripper');
    assert.equal(nextWeaponId('ripper', 13), 'phaser');
    assert.equal(nextWeaponId('ripper', 14), 'comet');
    assert.equal(nextWeaponId('comet', 15), 'halo');
    assert.equal(nextWeaponId('halo', 15), 'phaser');
    assert.deepEqual(weaponsForLevel(16), weaponsForLevel(15));
    assert.equal(nextWeaponId('halo', 16), 'phaser');
    assert.equal(WEAPON_DEFS.scatter.spread > 0, true);
    assert.equal(WEAPON_DEFS.ripper.spread > WEAPON_DEFS.hail.spread, true);
    assert.equal(WEAPON_DEFS.comet.ways, 5);
    assert.equal(WEAPON_DEFS.halo.pierce, 99);
    assert.equal(WEAPON_DEFS.piercer.pierce > 0, true);
    assert.equal(WEAPON_DEFS.phaser.pierce, 0);
    assert.equal(WEAPON_DEFS.tempest.ways, 5);
    assert.equal(WEAPON_DEFS.tempest.spread > 0, true);
    assert.equal(WEAPON_DEFS.hail.spread > 0, true);
    assert.equal(WEAPON_DEFS.hail.pierce, 2);
});

test('rescue bonus and temp-gun helpers follow the arcade rules', async () => {
    const {
        POD_TINTS,
        WEAPON_DEFS,
        activeWeaponId,
        effectiveLevelTime,
        rescueBonusMs,
        tempGunMsLeft,
    } = await importModule('GameUtils.js');
    assert.equal(rescueBonusMs(0), 0);
    assert.equal(rescueBonusMs(3), 6000);
    assert.equal(rescueBonusMs(-2), 0);
    assert.equal(effectiveLevelTime(90000, 2), 86000);
    assert.equal(effectiveLevelTime(3000, 5), 1000);
    assert.equal(activeWeaponId('phaser', null, 1000), 'phaser');
    assert.equal(activeWeaponId('phaser', { id: 'hail', until: 5000 }, 1000), 'hail');
    assert.equal(activeWeaponId('phaser', { id: 'hail', until: 500 }, 1000), 'phaser');
    assert.equal(activeWeaponId('phaser', { id: null, until: 5000 }, 1000), 'phaser');
    assert.equal(tempGunMsLeft(null, 1000), 0);
    assert.equal(tempGunMsLeft({ id: 'hail', until: 5000 }, 1000), 4000);
    assert.equal(tempGunMsLeft({ id: 'hail', until: 500 }, 1000), 0);
    for (const id of Object.keys(WEAPON_DEFS)) {
        if (id === 'phaser') {
            continue;
        }
        assert.ok(Number.isInteger(POD_TINTS[id]), `pod tint for ${id}`);
    }
});

test('contra levels expose rescues, pods, and no branch by default', async () => {
    const { LevelConfig } = await importModule('LevelConfig.js');
    const eight = new LevelConfig(8);
    assert.equal(eight.rescues.length, 1);
    assert.equal(eight.pods.length, 1);
    assert.equal(eight.pods[0].gun, 'piercer');
    assert.equal(eight.branch, null);
    assert.equal(new LevelConfig(1).rescues.length, 0);
    assert.equal(new LevelConfig(1).pods.length, 0);
});

test('branch offers keep key 2 for the vault instead of coop', async () => {
    const { InputController } = await importModule('InputController.js');
    const keyboard = global.Phaser.Input.Keyboard;
    const realJustDown = keyboard.JustDown;
    const realJustUp = keyboard.JustUp;
    const coopKey = { _justDown: true };
    let coopPolls = 0;
    keyboard.JustDown = (key) => {
        if (key === coopKey) {
            coopPolls++;
            const hit = key._justDown === true;
            key._justDown = false;
            return hit;
        }
        return false;
    };
    keyboard.JustUp = () => false;
    try {
        const scene = {
            space: {},
            cursors: { up: {} },
            wasd: { W: {} },
            coopKeys: { keyboard: coopKey, keyboardController: {}, controllers: {} },
            input: { pointers: [] },
            uiManager: null,
            awaitingBranch: true,
            pointerTapTimes: new Map(),
            getViewportWidth() {
                return 1280;
            },
            getViewportHeight() {
                return 720;
            },
        };
        const controller = new InputController(scene);
        controller.poll();
        assert.equal(coopPolls, 0);
        assert.equal(coopKey._justDown, true);
        assert.equal(controller.state.coopMode, null);
        scene.awaitingBranch = false;
        controller.poll();
        assert.equal(coopPolls, 1);
        assert.equal(controller.state.coopMode, 'keyboard');
    } finally {
        keyboard.JustDown = realJustDown;
        keyboard.JustUp = realJustUp;
    }
});

test('iron vault branch leaves the womb and rejoins the foundry', async () => {
    const { LevelConfig } = await importModule('LevelConfig.js');
    const womb = new LevelConfig(12);
    assert.deepEqual(womb.branch, [13, 16]);
    assert.match(womb.branchInstructions, /IRON VAULT/);
    const vault = new LevelConfig(16);
    assert.equal(vault.rescues.length, 1);
    assert.equal(vault.pods.length, 1);
    assert.equal(vault.pods[0].gun, 'comet');
    assert.equal(vault.crownShield, true);
    assert.deepEqual(
        vault.hazards.dynamic
            .filter((hazard) => hazard.type === 'boarder')
            .map((hazard) => hazard.wave),
        [1, 1, 2, 2, 3, 3]
    );
    assert.ok(vault.hazards.dynamic.some((hazard) => hazard.type === 'crusher'));
    assert.ok(vault.hazards.dynamic.some((hazard) => hazard.type === 'laser'));
    assert.ok(vault.props.some((prop) => prop.key === 'vaultSeal'));
});

test('tempest fans five bolts and hail pierces through one fire path', async () => {
    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const { WEAPON_DEFS } = await importModule('GameUtils.js');
    const { GAME_CONSTANTS } = await importModule('Constants.js');
    function makeBoltGroup(created) {
        return {
            getFirstDead: () => null,
            getLength: () => created.length,
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
                    enableBody() {},
                    body: {
                        allowGravity: true,
                        setAllowGravity() {},
                        setSize() {},
                    },
                    setVelocity(vx, vy) {
                        bolt.vx = vx;
                        bolt.vy = vy;
                    },
                    setFlipX() {},
                };
                created.push(bolt);
                return bolt;
            },
        };
    }
    function fire(weapon, now = 1000) {
        const scene = new SpaceChicken();
        scene.level = 12;
        const created = [];
        scene.phaserBolts = makeBoltGroup(created);
        const chicken = { active: true, flipX: false, body: { enable: true }, x: 100, y: 100 };
        chicken.weapon = weapon;
        scene.tryFirePhaser(chicken, now);
        return { created, chicken };
    }
    const tempest = fire('tempest');
    assert.equal(tempest.created.length, 5);
    assert.deepEqual(
        tempest.created.map((bolt) => bolt.vy),
        [-150, -75, 0, 75, 150]
    );
    assert.ok(tempest.created.every((bolt) => bolt.texture === WEAPON_DEFS.tempest.bolt));
    assert.ok(tempest.created.every((bolt) => bolt.vx === GAME_CONSTANTS.PHASER_BOLT_SPEED));
    const scatter = fire('scatter');
    assert.deepEqual(
        scatter.created.map((bolt) => bolt.vy),
        [-140, 0, 140]
    );
    const phaser = fire('phaser');
    assert.equal(phaser.created.length, 1);
    assert.equal(phaser.created[0].vy, 0);
    const hail = fire('hail');
    assert.equal(hail.created.length, 3);
    assert.ok(hail.created.every((bolt) => bolt.pierceLeft === 2));
    const piercer = fire('piercer');
    assert.equal(piercer.created[0].pierceLeft, 99);
    const scene = new SpaceChicken();
    scene.level = 12;
    const created = [];
    scene.phaserBolts = makeBoltGroup(created);
    const chicken = {
        active: true,
        flipX: false,
        body: { enable: true },
        x: 100,
        y: 100,
        weapon: 'tempest',
        lastPhaserAt: 1000,
    };
    scene.tryFirePhaser(chicken, 1000 + GAME_CONSTANTS.PHASER_COOLDOWN_MS - 1);
    assert.equal(created.length, 0);
});

test('scatter fires a three-bolt volley through the single fire path', async () => {
    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const { GAME_CONSTANTS } = await importModule('Constants.js');
    const scene = new SpaceChicken();
    scene.level = 8;
    scene.levelConfig = { phaser: true };
    const created = [];
    const group = {
        getFirstDead: () => null,
        getLength: () => created.length,
        create(x, y, _key) {
            const bolt = {
                x,
                y,
                active: false,
                velocities: [],
                setActive(v) {
                    this.active = v;
                },
                setVisible() {},
                setDepth() {},
                setTexture() {},
                body: {
                    enable: false,
                    allowGravity: true,
                    setAllowGravity(v) {
                        this.allowGravity = v;
                    },
                    setSize() {},
                },
                setVelocity(vx, vy) {
                    this.velocities.push([vx, vy]);
                    this.vx = vx;
                    this.vy = vy;
                },
                setFlipX() {},
            };
            created.push(bolt);
            return bolt;
        },
    };
    scene.phaserBolts = group;
    const chicken = {
        active: true,
        body: { enable: true },
        flipX: false,
        x: 100,
        y: 200,
        weapon: 'scatter',
    };
    scene.tryFirePhaser(chicken, 1000);
    assert.equal(created.length, 3);
    assert.deepEqual(
        created.map((bolt) => bolt.vy),
        [-140, 0, 140]
    );
    assert.ok(created.every((bolt) => bolt.vx === GAME_CONSTANTS.PHASER_BOLT_SPEED));
    assert.equal(chicken.lastPhaserAt, 1000);
    scene.tryFirePhaser(chicken, 1000 + GAME_CONSTANTS.PHASER_COOLDOWN_MS - 1);
    assert.equal(created.length, 3);
});

test('piercer bolts pass through boarders until range recycles them', async () => {
    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const scene = new SpaceChicken();
    scene.level = 9;
    scene.levelConfig = { phaser: true };
    scene.phaserBolts = { killAndHide: (bolt) => ({ ...bolt, active: false }) };
    const kills = [];
    scene.defeatBoarder = (alien) => {
        kills.push(alien.id);
        alien.defeated = true;
    };
    const bolt = { x: 100, y: 200, active: true, pierceLeft: 99 };
    const first = { id: 'a', x: 120, y: 200, defeated: false };
    const second = { id: 'b', x: 160, y: 200, defeated: false };
    scene.phaserHitsBoarder(bolt, first);
    assert.deepEqual(kills, ['a']);
    assert.equal(bolt.active, true);
    scene.phaserHitsBoarder(bolt, second);
    assert.deepEqual(kills, ['a', 'b']);
    assert.equal(bolt.active, true);
});

test('switching cycles one gun per press and names it in the HUD', async () => {
    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const scene = new SpaceChicken();
    scene.level = 8;
    scene.levelConfig = { phaser: true };
    scene.awaitingStart = false;
    scene.gameOver = false;
    const labels = [];
    const textures = [];
    scene.player = {
        active: true,
        phaserSprite: {
            setTexture: (key) => textures.push(key),
        },
    };
    scene.uiManager = {
        updateWeaponLabel: (name) => labels.push(name),
    };
    assert.equal(scene.switchPlayerWeapon(0), true);
    assert.equal(scene.player.weapon, 'scatter');
    assert.deepEqual(textures, ['scatterGun']);
    assert.deepEqual(labels, ['Scatter']);
    assert.equal(scene.switchPlayerWeapon(0), true);
    assert.equal(scene.player.weapon, 'phaser');
    scene.level = 7;
    assert.equal(scene.switchPlayerWeapon(0), false);
    scene.levelConfig = {};
    assert.equal(scene.switchPlayerWeapon(0), false);
    scene.level = 9;
    scene.levelConfig = { phaser: true };
    scene.player2 = {
        active: true,
        phaserSprite: {
            setTexture: (key) => textures.push(`p2:${key}`),
        },
    };
    assert.equal(scene.switchPlayerWeapon(1), true);
    assert.equal(scene.player2.weapon, 'scatter');
    assert.equal(scene.player.weapon, 'phaser');
    assert.deepEqual(textures.slice(-1), ['p2:scatterGun']);
    assert.equal(scene.switchPlayerWeapon(1), true);
    assert.equal(scene.player2.weapon, 'piercer');
});

test('the colony crown shield gates the clear on dead boarders', async () => {
    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const { LevelConfig } = await importModule('LevelConfig.js');
    assert.equal(new LevelConfig(8).crownShield, true);
    assert.equal(new LevelConfig(12).crownShield, true);
    assert.equal(new LevelConfig(1).crownShield, false);

    const scene = new SpaceChicken();
    scene.level = 8;
    scene.levelConfig = { crownShield: true };
    scene.awaitingStart = false;
    scene.isTransitioning = false;
    scene.gameOver = false;
    scene.raceFinale = false;
    scene.crownShielded = true;
    const shaken = [];
    const banners = [];
    scene.cameraFor = () => ({ shake: (ms, i) => shaken.push([ms, i]) });
    scene.audioManager = { playBonkSound: () => shaken.push('bonk') };
    scene.uiManager = { showLevelBanner: (t, s) => banners.push([t, s]) };
    scene.crown = { x: 3900, y: 400, clearTint: () => {} };
    const live = { active: true, arrived: true, defeated: false };
    const dead = { active: true, arrived: true, defeated: true };
    const stowed = { active: false, arrived: false, defeated: false };
    scene.boardersGroup = { getChildren: () => [live, dead, stowed] };
    assert.equal(scene.liveBoarderCount(), 1);

    scene.collectGem(scene.player);
    assert.deepEqual(shaken[0], [90, 0.005]);
    assert.equal(banners.length, 0);

    const victim = {
        active: true,
        arrived: true,
        defeated: false,
        aggro: true,
        clearTint: () => {},
        body: { enable: true },
        setVelocity: () => {},
    };
    scene.boardersGroup = { getChildren: () => [victim] };
    scene.defeatBoarder(victim);
    assert.equal(victim.defeated, true);
    assert.equal(scene.crownShielded, false);
    assert.deepEqual(banners, [['CROWN OPEN', 'Pad clear — take it']]);
});

test('boarder wave banners only fire when aliens actually drop in', async () => {
    const { SpaceChicken } = await importModule('SpaceChicken.js');

    const empty = new SpaceChicken();
    empty.boarderWave = 1;
    empty.player = { active: true, x: 1400, body: { enable: true } };
    empty.boardersGroup = { getChildren: () => [] };
    const quietBanners = [];
    const quietSounds = [];
    empty.uiManager = { showLevelBanner: (t, s) => quietBanners.push([t, s]) };
    empty.audioManager = {
        playWaveSound: () => quietSounds.push('wave'),
        duckMusic: () => quietSounds.push('duck'),
    };
    empty.updateBoarderWaves();
    assert.equal(empty.boarderWave, 2);
    assert.deepEqual(quietBanners, []);
    assert.deepEqual(quietSounds, []);

    const scene = new SpaceChicken();
    scene.boarderWave = 1;
    scene.player = { active: true, x: 1400, body: { enable: true } };
    const alien = {
        arrived: false,
        wave: 2,
        homeX: 1560,
        homeY: 540,
        clearTint: () => {},
        setActive: () => {},
        setVisible: () => {},
        setAlpha: () => {},
        setVelocity: () => {},
        body: { enable: false, reset: () => {} },
    };
    scene.boardersGroup = { getChildren: () => [alien] };
    const banners = [];
    const sounds = [];
    scene.uiManager = { showLevelBanner: (t, s) => banners.push([t, s]) };
    scene.audioManager = {
        playWaveSound: () => sounds.push('wave'),
        duckMusic: () => sounds.push('duck'),
    };
    scene.updateBoarderWaves();
    assert.equal(scene.boarderWave, 2);
    assert.equal(alien.arrived, true);
    assert.deepEqual(banners, [['WAVE 2', 'Aliens dropping in']]);
    assert.deepEqual(sounds, ['wave', 'duck']);
});

test('boarder updates reuse their target and ally scratch lists', async () => {
    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const scene = new SpaceChicken();
    scene.killZoneFallY = 10000;
    scene.getGameTime = () => 1000;
    scene.boarderGraceUntil = 0;
    scene.boarderWave = 1;
    scene.player = { active: true, x: 100, y: 100, body: { enable: true } };
    scene.player2 = { active: false, x: 0, y: 0, body: { enable: true } };
    const velocities = [];
    const alien = {
        active: true,
        arrived: true,
        defeated: false,
        aggro: false,
        x: 500,
        y: 100,
        homeX: 500,
        homeY: 100,
        body: { enable: true },
        setVelocityX(value) {
            velocities.push(value);
        },
        setVelocityY() {},
        setFlipX() {},
    };
    scene.boardersGroup = { getChildren: () => [alien] };
    scene.updateBoarders();
    assert.deepEqual(scene.boarders.boarderTargets, [scene.player]);
    assert.deepEqual(scene.boarders.boarderAllies, [alien]);
    assert.equal(velocities.length, 1);
    const targets = scene.boarders.boarderTargets;
    const allies = scene.boarders.boarderAllies;
    const options = scene.boarders.boarderOptions;
    scene.updateBoarders();
    assert.equal(scene.boarders.boarderTargets, targets);
    assert.equal(scene.boarders.boarderAllies, allies);
    assert.equal(scene.boarders.boarderOptions, options);
    assert.deepEqual(targets, [scene.player]);
    assert.equal(velocities.length, 2);
});

test('keyboard race is blocked only on coarse-only devices', async () => {
    const { canRaceWithKeyboard } = await importModule('Overlays.js');
    const matchMedia = (matches) => () => ({ matches });
    assert.equal(
        canRaceWithKeyboard({ matchMedia: matchMedia(true) }),
        true,
        'fine pointer keeps keyboard race'
    );
    assert.equal(
        canRaceWithKeyboard({ matchMedia: matchMedia(false) }),
        false,
        'coarse-only device blocks keyboard race'
    );
    assert.equal(
        canRaceWithKeyboard({ matchMedia: matchMedia(false), keyboardApi: true }),
        true,
        'keyboard API keeps keyboard race'
    );
    assert.equal(canRaceWithKeyboard({}), true, 'unknown input fails open');
    assert.equal(
        canRaceWithKeyboard({
            matchMedia: () => {
                throw new Error('unsupported query');
            },
        }),
        true,
        'throwing matchMedia fails open'
    );
});

test('overlay cleanup destroys an open branch choice', async () => {
    const { Overlays } = await importModule('Overlays.js');
    const overlays = new Overlays({}, { setHudVisible() {} });
    const destroyed = [];
    overlays.branchOptions = [{ title: 'A', level: 13 }];
    overlays.branchCallback = () => {};
    overlays.branchObjects = [
        { destroy: () => destroyed.push('dim') },
        { destroy: () => destroyed.push('button') },
    ];
    overlays.cleanup();
    assert.deepEqual(destroyed, ['dim', 'button']);
    assert.deepEqual(overlays.branchObjects, []);
    assert.equal(overlays.branchOptions, null);
    assert.equal(overlays.branchCallback, null);
});

test('combat updates never drive the boarder director', async () => {
    const { CombatSystem } = await importModule('CombatSystem.js');
    const combat = new CombatSystem({
        getGameTime: () => 0,
        levelConfig: null,
        updateBoarders() {
            throw new Error('updateCombat must not drive boarders');
        },
    });
    assert.doesNotThrow(() => combat.updateCombat({}));
});

test('the test interface fire action holds the phaser trigger', async () => {
    const { GameTestInterface } = await importModule('GameTestInterface.js');
    const target = {};
    const face = new GameTestInterface({ debugMode: true }, target);
    const result = face.act('fire_right');
    assert.equal(result.ok, true);
    assert.deepEqual(target.__spaceChickenBotInput, {
        left: false,
        right: true,
        jump: false,
        shoot: true,
        start: false,
    });
    assert.equal(face.act('teleport').ok, false);
});

test('the play-bot ships a self-contained in-page pilot', async () => {
    const { outcomeFromSnapshot } = await importModule('scripts/play-bot.mjs');
    const { buildPilotSource } = await importModule('scripts/pilot-brain.mjs');
    assert.equal(typeof buildPilotSource, 'function');
    assert.equal(outcomeFromSnapshot({ gameOver: true }), 'win');
    assert.equal(outcomeFromSnapshot({ pendingLevel: 2 }, null), 'advance');
    assert.equal(outcomeFromSnapshot({ pendingLevel: 2 }, 1), 'win');
    assert.equal(
        outcomeFromSnapshot({ dying: true, transitioning: true, nextLevel: 2, gameOver: false }),
        null
    );
    const source = buildPilotSource();
    assert.match(source, /pendingLevel/);
    assert.doesNotMatch(
        source,
        /snap\.transitioning && snap\.nextLevel && snap\.nextLevel !== snap\.level/
    );
});

test('the game test interface exposes compact observations and game-rule objectives', async () => {
    const {
        GAME_TEST_ACTIONS,
        checkTestObjectives,
        createTestObservation,
        normalizeTestAction,
        normalizeTestSeed,
    } = await importModule('GameTestInterface.js');
    const snapshot = {
        ready: true,
        level: 1,
        deaths: 2,
        elapsedMs: 1234.5,
        simulationTimeScale: 0.25,
        awaitingStart: false,
        transitioning: false,
        gameOver: false,
        pendingLevel: null,
        physicsPaused: false,
        jumpCount: 1,
        maxJumps: 2,
        player: { x: 100, y: 200, vx: 120, vy: 0, grounded: true },
        crown: { x: 500, y: 150 },
        worldWidth: 1000,
        worldHeight: 700,
        killZoneY: 800,
        platforms: [
            {
                id: 'floor-1',
                type: 'floor',
                x: 120,
                y: 230,
                w: 80,
                h: 20,
                left: 80,
                right: 160,
                top: 220,
            },
            {
                id: 'moving-1',
                type: 'moving_platform',
                x: 300,
                y: 180,
                vx: 30,
                vy: 0,
                w: 100,
                h: 20,
                left: 250,
                right: 350,
                top: 170,
                origin: { x: 250, y: 180 },
                target: { x: 350, y: 180 },
                durationMs: 1000,
            },
        ],
        movingPlatforms: [
            {
                id: 'moving-1',
                type: 'moving_platform',
                x: 300,
                y: 180,
                vx: 30,
                vy: 0,
                w: 100,
                h: 20,
                left: 250,
                right: 350,
                top: 170,
            },
        ],
        hazards: [
            {
                id: 'rover-1',
                type: 'rover',
                phase: 'active',
                x: 160,
                y: 200,
                vx: -25,
                vy: 0,
                w: 32,
                h: 32,
                left: 144,
                right: 176,
                top: 184,
            },
            {
                id: 'boarder-1',
                type: 'boarder',
                wave: 2,
                chasing: true,
                x: 500,
                y: 200,
                vx: -190,
                vy: 0,
                w: 22,
                h: 36,
                left: 489,
                right: 511,
                top: 182,
            },
        ],
        hazardSchedules: [
            {
                id: 'ray-1',
                type: 'cosmic_ray',
                x: 420,
                y: 90,
                phase: 'warning',
                timeUntilPhaseChangeMs: 300,
                warningDurationMs: 1000,
                activeDurationMs: 220,
                intervalMs: 3600,
            },
        ],
        bombs: [],
        columns: [],
        combat: { ready: false, msUntilReady: 120, boltsInFlight: 2 },
        physics: { gravityY: 300, jumpVelocityY: -330, runSpeedX: 160, maxJumps: 2 },
    };

    const observation = createTestObservation(snapshot, 42);
    assert.equal(observation.schemaVersion, 2);
    assert.equal(observation.phase, 'playing');
    assert.equal(observation.seed, 42);
    assert.equal(observation.simulationTimeScale, 0.25);
    assert.equal(observation.objective.dx, 400);
    assert.equal(observation.player.jumpsRemaining, 1);
    assert.equal(observation.nearby.hazards[0].dx, 60);
    assert.equal(observation.nearby.hazards[0].left, 44);
    assert.equal(observation.nearby.hazards[0].type, 'rover');
    assert.equal(observation.nearby.hazards[0].direction, 'left');
    assert.equal(observation.nearby.hazards[1].wave, 2);
    assert.equal(observation.nearby.hazards[1].chasing, true);
    assert.equal(observation.nearby.hazards[1].direction, 'left');
    assert.equal(observation.navigation.nearestThreat.dx, 60);
    assert.equal(observation.navigation.nearestThreat.type, 'rover');
    assert.equal(observation.player.facing, 'right');
    assert.equal(observation.combat.ready, false);
    assert.equal(observation.combat.msUntilReady, 120);
    assert.equal(observation.combat.boltsInFlight, 2);
    assert.equal(observation.physics.gravityY, 300);
    assert.equal(observation.physics.maxJumps, 2);
    assert.equal(observation.nearby.movingPlatforms[0].vx, 30);
    assert.equal(observation.nearby.timedHazards[0].phase, 'warning');
    assert.equal(observation.navigation.supportPlatformId, 'floor-1');
    assert.equal(observation.navigation.landingWindow.platformId, 'moving-1');
    assert.deepEqual(observation.availableActions, GAME_TEST_ACTIONS.slice(1));
    const spentJumps = createTestObservation({ ...snapshot, jumpCount: 2 }, 42);
    assert.deepEqual(spentJumps.availableActions, [
        'wait',
        'move_left',
        'move_right',
        'fire',
        'fire_left',
        'fire_right',
    ]);
    assert.equal(checkTestObjectives(snapshot).passed, false);
    assert.equal(checkTestObjectives({ ...snapshot, pendingLevel: 2 }).passed, true);
    assert.equal(normalizeTestAction({ name: 'jump_right' }), 'jump_right');
    assert.equal(normalizeTestAction('teleport'), null);
    assert.equal(normalizeTestSeed('17'), 17);
    assert.equal(normalizeTestSeed(null, null), null);
});

test('stomp hints and facing-aware fallback read the combat context', async () => {
    const { createTestObservation } = await importModule('GameTestInterface.js');
    const { fallbackAction } = await importModule('scripts/jev-playtest.mjs');
    const brute = {
        id: 'brute-1',
        type: 'bonk',
        bonkable: true,
        x: 200,
        y: 300,
        vx: 0,
        vy: 0,
        w: 44,
        h: 34,
        left: 178,
        right: 222,
        top: 283,
    };
    const base = {
        ready: true,
        level: 9,
        deaths: 0,
        elapsedMs: 5000,
        awaitingStart: false,
        transitioning: false,
        gameOver: false,
        pendingLevel: null,
        physicsPaused: false,
        jumpCount: 0,
        maxJumps: 2,
        crown: { x: 900, y: 100 },
        worldWidth: 1000,
        worldHeight: 800,
        killZoneY: 820,
        platforms: [],
        movingPlatforms: [],
        hazards: [brute],
        hazardSchedules: [],
        bombs: [],
        columns: [],
    };
    const falling = createTestObservation(
        { ...base, player: { x: 200, y: 200, vx: 0, vy: 200, grounded: false } },
        7
    );
    assert.equal(falling.nearby.hazards[0].stompableNow, true);
    const grounded = createTestObservation(
        { ...base, player: { x: 200, y: 200, vx: 0, vy: 0, grounded: true } },
        7
    );
    assert.equal(grounded.nearby.hazards[0].stompableNow, false);

    const leftBoarder = {
        id: 'boarder-1',
        type: 'boarder',
        wave: 1,
        chasing: true,
        x: 100,
        y: 200,
        vx: 190,
        vy: 0,
        w: 22,
        h: 36,
        left: 89,
        right: 111,
        top: 182,
    };
    const facingLeft = createTestObservation(
        {
            ...base,
            phaser: true,
            player: { x: 300, y: 200, vx: 0, vy: 0, grounded: true, facing: 'left' },
            hazards: [leftBoarder],
            combat: { ready: true, msUntilReady: 0, boltsInFlight: 0 },
        },
        7
    );
    assert.equal(
        fallbackAction({
            ...facingLeft,
            availableActions: ['wait', 'move_left', 'fire_left', 'jump_left'],
        }),
        'fire_left'
    );
    const cooling = createTestObservation(
        {
            ...base,
            phaser: true,
            crown: { x: 100, y: 200 },
            player: { x: 300, y: 200, vx: 0, vy: 0, grounded: true, facing: 'left' },
            hazards: [leftBoarder],
            combat: { ready: false, msUntilReady: 150, boltsInFlight: 1 },
        },
        7
    );
    assert.equal(
        fallbackAction({
            ...cooling,
            availableActions: ['wait', 'move_left', 'fire_left', 'jump_left'],
        }),
        'move_left'
    );
});

test('bot snapshot distinguishes death from collecting the crown', async () => {
    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const scene = new SpaceChicken();
    scene.init({ level: 1 });
    scene.player = {
        x: 400,
        y: 400,
        alpha: 1,
        visible: true,
        scaleX: 1,
        scaleY: 1,
        body: {
            enable: true,
            velocity: { x: 0, y: 0 },
            blocked: { down: true },
            touching: { down: false },
        },
    };
    scene.levelConfig = { nextLevel: 2 };
    scene.isTransitioning = true;
    scene.gameOver = false;
    scene.pendingSceneData = null;
    scene.activeWarningGraphics = [{ rayX: 550 }];

    let snap = scene.getBotSnapshot();
    assert.equal(snap.dying, true);
    assert.equal(snap.pendingLevel, null);
    assert.equal(snap.player.facing, 'right');
    assert.equal(snap.combat.ready, false);
    assert.equal(snap.combat.boltsInFlight, 0);
    assert.equal(snap.physics.jumpVelocityY, -330);
    assert.equal(snap.physics.runSpeedX, 160);
    assert.equal(snap.columns[0].x, 550);
    assert.equal(snap.columns[0].type, 'cosmic_ray');
    assert.equal(snap.columns[0].phase, 'warning');

    scene.pendingSceneData = { level: 2, deathCount: 0 };
    snap = scene.getBotSnapshot();
    assert.equal(snap.dying, false);
    assert.equal(snap.pendingLevel, 2);
});

test('the game page opts into a mobile visual viewport', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    assert.match(html, /viewport-fit=cover/);
    assert.match(html, /user-scalable=no/);
    assert.match(html, /visualViewport/);
    assert.match(html, /100svh/);
    assert.match(html, /apple-mobile-web-app-capable/);
    const config = fs.readFileSync(path.join(projectRoot, 'GameConfig.js'), 'utf8');
    assert.match(config, /activePointers:\s*4/);
    assert.match(html, /createGameConfig/);
});
