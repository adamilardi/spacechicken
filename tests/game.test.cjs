const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { Linter } = require('eslint');

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
        'Constants.js',
        'GameUtils.js',
        'MusicConfig.js',
        'AudioManager.js',
        'LevelConfig.js',
        'UIManager.js',
        'LeaderboardManager.js',
        'SpriteFactory.js',
        'EffectsManager.js',
        'BackgroundRenderer.js',
        'WorldBuilder.js',
        'InputController.js',
        'Viewport.js',
        'GameTestInterface.js',
        'SpaceChicken.js',
        'SplitScreen.js',
        'server.cjs',
        'config/runtime-assets.cjs',
        'scripts/build-cloudflare.cjs',
        'scripts/play-bot.mjs',
        'scripts/playtest-bot.mjs',
        'scripts/jev-playtest.mjs',
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

test('level configuration exposes every playable level', async () => {
    const { LEVEL_IDS } = await importModule('Constants.js');
    const { LevelConfig } = await importModule('LevelConfig.js');

    assert.deepEqual(LEVEL_IDS, [1, 2, 3, 4, 5, 6, 7]);
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
    assert.equal(new LevelConfig(7).nextLevel, null);
    assert.equal(new LevelConfig(1).title, 'Dawn Run');
    assert.equal(new LevelConfig(2).title, 'Arcade Orbit');
    assert.equal(new LevelConfig(3).title, 'Orbital Gauntlet');
    assert.equal(new LevelConfig(4).title, 'Moonfall Citadel');
    assert.equal(new LevelConfig(5).title, 'Specimen Wing');
    assert.equal(new LevelConfig(6).title, 'Red Reach');
    assert.equal(new LevelConfig(7).title, 'Earthwatch');
    assert.equal(new LevelConfig(5).background.type, 'facility');
    assert.equal(new LevelConfig(6).background.type, 'mars');
    assert.equal(new LevelConfig(7).background.type, 'iss');
    assert.equal(new LevelConfig(7).phaser, true);
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
    assert.equal(jumped.velocityX, -190);
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
    for (let level = 1; level <= 7; level++) {
        const definition = MUSIC_DEFINITIONS[level];
        identities.add(definition.id);
        assert.ok(definition.pattern.length >= 40, `level ${level} should have a full arrangement`);
        assert.ok(definition.loopDuration > 5);
        assert.ok(definition.pattern.some((event) => event.kind === 'tone'));
        assert.ok(definition.pattern.some((event) => event.kind === 'kick'));
        assert.ok(definition.pattern.some((event) => event.kind === 'hat'));
    }
    assert.equal(identities.size, 7);
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
    manager.backgroundPattern = [
        {
            offset: 0.5,
            duration: 1,
            freqStart: 440,
            filter: { type: 'lowpass', frequency: 900 },
        },
        { kind: 'kick', offset: 0.75, duration: 0.1, volume: 0.2 },
        { kind: 'hat', offset: 1, duration: 0.05, volume: 0.04 },
    ];
    manager.musicGainNode = {};
    manager.playTone = (options) => scheduled.push({ voice: 'tone', options });
    manager.playKick = (options) => scheduled.push({ voice: 'kick', options });
    manager.playHat = (options) => scheduled.push({ voice: 'hat', options });

    manager.scheduleBackgroundPattern(10);
    assert.deepEqual(
        scheduled.map((event) => event.voice),
        ['tone', 'kick', 'hat']
    );
    assert.equal(scheduled[0].options.startTime, 10.5);
    assert.deepEqual(scheduled[0].options.filter, { type: 'lowpass', frequency: 900 });
    assert.equal(manager.getMusicDefinitionForLevel(4).id, 'lunar-horizon');
});

test('sound effects use distinct layered voices', async () => {
    const { AudioManager } = await importModule('AudioManager.js');
    const manager = new AudioManager({
        sound: { context: { currentTime: 12, createOscillator() {} } },
    });
    const calls = [];
    manager.playTone = (options) => calls.push({ voice: 'tone', options });
    manager.playNoise = (options) => calls.push({ voice: 'noise', options });
    manager.playKick = (options) => calls.push({ voice: 'kick', options });

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

test('the play-bot exports an in-page pilot installer', async () => {
    const { installInPagePilot, outcomeFromSnapshot } = await importModule('scripts/play-bot.mjs');
    assert.equal(typeof installInPagePilot, 'function');
    assert.equal(outcomeFromSnapshot({ gameOver: true }), 'win');
    assert.equal(outcomeFromSnapshot({ pendingLevel: 2 }, null), 'advance');
    assert.equal(outcomeFromSnapshot({ pendingLevel: 2 }, 1), 'win');
    assert.equal(
        outcomeFromSnapshot({ dying: true, transitioning: true, nextLevel: 2, gameOver: false }),
        null
    );
    const source = installInPagePilot.toString();
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
    assert.equal(observation.nearby.movingPlatforms[0].vx, 30);
    assert.equal(observation.nearby.timedHazards[0].phase, 'warning');
    assert.equal(observation.navigation.supportPlatformId, 'floor-1');
    assert.equal(observation.navigation.landingWindow.platformId, 'moving-1');
    assert.deepEqual(observation.availableActions, GAME_TEST_ACTIONS.slice(1));
    const spentJumps = createTestObservation({ ...snapshot, jumpCount: 2 }, 42);
    assert.deepEqual(spentJumps.availableActions, ['wait', 'move_left', 'move_right']);
    assert.equal(checkTestObjectives(snapshot).passed, false);
    assert.equal(checkTestObjectives({ ...snapshot, pendingLevel: 2 }).passed, true);
    assert.equal(normalizeTestAction({ name: 'jump_right' }), 'jump_right');
    assert.equal(normalizeTestAction('teleport'), null);
    assert.equal(normalizeTestSeed('17'), 17);
    assert.equal(normalizeTestSeed(null, null), null);
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
