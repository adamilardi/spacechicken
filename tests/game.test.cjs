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
        'SpaceChicken.js',
        'server.cjs',
        'config/runtime-assets.cjs',
        'scripts/build-cloudflare.cjs',
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

    assert.deepEqual(LEVEL_IDS, [1, 2, 3, 4]);
    LEVEL_IDS.forEach((level) => {
        const config = new LevelConfig(level);
        assert.ok(config.world.width > 0);
        assert.ok(config.world.height > 0);
        assert.ok(Number.isFinite(config.gravity));
    });
    assert.equal(new LevelConfig(3).nextLevel, 4);
    assert.equal(new LevelConfig(4).nextLevel, null);
    assert.equal(new LevelConfig(1).title, 'Dawn Run');
    assert.equal(new LevelConfig(2).title, 'Arcade Orbit');
    assert.equal(new LevelConfig(3).title, 'Orbital Gauntlet');
    assert.equal(new LevelConfig(4).title, 'Lunar Gauntlet');
    const levelThree = new LevelConfig(3);
    assert.equal(levelThree.platforms, levelThree.platforms);
    assert.equal(levelThree.background.type, 'station');
    assert.throws(() => new LevelConfig(99), /configuration not found/);
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
        SPACE_CHICKEN_CONFIG: { firebaseEndpoint: 'https://example.test/' },
    };
    global.fetch = async (url) => {
        calls.push(url);
        return { ok: true, json: async () => null };
    };
    const { LeaderboardManager } = await importModule('LeaderboardManager.js');
    const manager = new LeaderboardManager({ storageAvailable: true });

    const data = await manager.fetchFirebaseLeaderboards();
    assert.deepEqual(Object.keys(data), ['1', '2', '3', '4']);
    assert.ok(calls.some((url) => url.endsWith('/leaderboard/level4.json')));
    delete global.fetch;
});

test('all levels have distinct, layered music arrangements', async () => {
    const { MUSIC_DEFINITIONS, midiToFrequency } = await importModule('MusicConfig.js');
    const identities = new Set();

    assert.equal(midiToFrequency(69), 440);
    for (let level = 1; level <= 4; level++) {
        const definition = MUSIC_DEFINITIONS[level];
        identities.add(definition.id);
        assert.ok(definition.pattern.length >= 40, `level ${level} should have a full arrangement`);
        assert.ok(definition.loopDuration > 5);
        assert.ok(definition.pattern.some((event) => event.kind === 'tone'));
        assert.ok(definition.pattern.some((event) => event.kind === 'kick'));
        assert.ok(definition.pattern.some((event) => event.kind === 'hat'));
    }
    assert.equal(identities.size, 4);
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
    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const scene = new SpaceChicken();
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

    scene.createLaserHazard(group, {
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

test('baked backgrounds reuse a generated texture instead of redrawing', async () => {
    const { BackgroundRenderer } = await importModule('BackgroundRenderer.js');
    const images = [];
    const scene = {
        level: 1,
        levelConfig: { background: { type: 'space', style: 'dawn' } },
        textures: {
            exists(key) {
                return key === 'space-chicken-bg-1_background_space_dawn_200x100';
            },
        },
        add: {
            image(x, y, key) {
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
                };
                images.push(sprite);
                return sprite;
            },
        },
    };
    const renderer = new BackgroundRenderer(scene);
    renderer.createTwinkleStars = () => {};
    renderer.render(200, 100);
    assert.equal(images.length, 1);
    assert.equal(images[0].key, 'space-chicken-bg-1_background_space_dawn_200x100');
});

test('timer text only updates when the displayed centiseconds change', async () => {
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
    assert.deepEqual(texts, ['Time: 00:01.00', 'Time: 00:01.01']);
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
    assert.equal(tweens.length, 4);
    assert.equal(tweens[0].alpha, 0);

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
    assert.deepEqual(removedEvents, ['shutdown', 'destroy']);
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
