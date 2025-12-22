import { GAME_CONSTANTS, KEY_CODES } from './Constants.js';
import { AudioManager } from './AudioManager.js';
import { LevelConfig } from './LevelConfig.js';
import { UIManager } from './UIManager.js';
import { LeaderboardManager } from './LeaderboardManager.js';
import { SpriteFactory } from './SpriteFactory.js';

class SpaceChicken extends Phaser.Scene {
    constructor() {
        super();
    }

    init(data = {}) {
        this.level = data.level || 1;
        this.deathCount = data.deathCount || 0;
        this.startTime = 0;
        this.gameOver = false;
        this.maxJumps = GAME_CONSTANTS.MAX_JUMPS;
        this.jumpCount = 0;
        this.isJetpacking = false;
        this.restartDelayDone = true;

        // Input state
        this.leftPressed = false;
        this.rightPressed = false;
        this.jumpRequested = false;
        this.jumpPointerId = null;

        // Timers and events
        this.dynamicHazardEvents = [];

        // Pointer tracking
        this.pointerTapTimes = new Map();
    }

    getScaleDimension(dimension) {
        const scale = this.scale;
        if (!scale) {
            return null;
        }
        const gameSize = scale.gameSize;
        if (gameSize && typeof gameSize[dimension] === 'number') {
            return gameSize[dimension];
        }
        if (typeof scale[dimension] === 'number') {
            return scale[dimension];
        }
        return null;
    }

    getBaseDimension(dimension) {
        const scaleValue = this.getScaleDimension(dimension);
        if (typeof scaleValue === 'number' && scaleValue > 0) {
            return scaleValue;
        }
        const configValue = this.getConfigDimension(dimension);
        if (typeof configValue === 'number' && configValue > 0) {
            return configValue;
        }
        if (typeof window !== 'undefined') {
            if (dimension === 'width') {
                return window.innerWidth;
            }
            if (dimension === 'height') {
                return window.innerHeight;
            }
        }
        return dimension === 'width' ? 800 : 600;
    }

    getConfigDimension(dimension) {
        const sys = this.sys;
        if (!sys || !sys.game || !sys.game.config) {
            return null;
        }
        const value = sys.game.config[dimension];
        return (typeof value === 'number') ? value : null;
    }

    getBaseWidth() {
        return this.getBaseDimension('width');
    }

    getBaseHeight() {
        return this.getBaseDimension('height');
    }

    getViewportWidth() {
        if (typeof this.viewportWidth === 'number' && this.viewportWidth > 0) {
            return this.viewportWidth;
        }
        return this.getBaseWidth();
    }

    getViewportHeight() {
        if (typeof this.viewportHeight === 'number' && this.viewportHeight > 0) {
            return this.viewportHeight;
        }
        return this.getBaseHeight();
    }

    preload() {
        // Create all game sprites using SpriteFactory
        this.spriteFactory = new SpriteFactory(this);
        this.spriteFactory.createChickenFrames();
        this.spriteFactory.createCrown();
        this.spriteFactory.createCliff();
        this.spriteFactory.createRock();
        this.spriteFactory.createBomb();
        this.spriteFactory.createStationPanel();
        this.spriteFactory.createLiftPlatform();
        this.spriteFactory.createLaserBeam();
        this.spriteFactory.createLaserEmitter();
        this.spriteFactory.createDrone();
        this.spriteFactory.createVirtualButtons();
    }

    create() {
        // Initialize managers
        this.levelConfig = new LevelConfig(this.level);
        this.audioManager = new AudioManager(this);
        this.uiManager = new UIManager(this);
        this.leaderboardManager = new LeaderboardManager(this);

        // Initialize storage availability
        this.storageAvailable = this.checkStorageAvailability();

        // Load player name
        this.playerName = this.leaderboardManager.loadPlayerName();

        // Setup audio
        this.musicMuted = this.audioManager.loadMusicPreference();
        this.audioManager.musicMuted = this.musicMuted;
        this.audioManager.configureLevelMusic();

        // Setup physics
        this.physics.world.gravity.y = this.levelConfig.gravity;

        // Set up timer
        this.startTime = performance.now();

        // Create UI
        this.uiManager.createUI(this.levelConfig, this.level);

        // Setup world
        this.worldWidth = this.levelConfig.world.width;
        this.worldHeight = this.levelConfig.world.height;

        // Create background
        this.backgroundGraphics = this.add.graphics();
        this.backgroundGraphics.setDepth(-10);
        this.renderBackground(this.worldWidth, this.worldHeight);

        // Create player
        this.player = this.physics.add.sprite(this.levelConfig.playerStart.x, this.levelConfig.playerStart.y, 'chicken1');
        this.player.setBounce(0.2);
        this.player.setCollideWorldBounds(false);

        // Setup camera
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

        // Setup physics world bounds
        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

        // Create platforms
        this.platforms = this.physics.add.staticGroup();
        this.buildStaticPlatforms(this.levelConfig.platforms.static);
        this.buildFloorPlatforms(this.levelConfig.platforms.floor);

        // Create moving platforms
        this.movingPlatforms = this.setupMovingPlatforms(this.levelConfig.platforms.moving);

        // Create hazards
        this.hazards = this.physics.add.staticGroup();
        this.buildStaticHazards(this.levelConfig.hazards.rocks);
        this.dynamicHazardsGroup = this.setupDynamicHazards(this.levelConfig.hazards.dynamic);

        // Create crown
        this.crown = this.physics.add.staticSprite(this.levelConfig.crown.x, this.levelConfig.crown.y, 'crown');

        // Create audio unlock handler
        if (this.shouldEnableTouchControls()) {
            this.uiManager.enableTouchControls();
        }

        // Create kill zone
        const killZoneY = this.levelConfig.killZoneY + (this.levelConfig.killZoneHeight || GAME_CONSTANTS.LEVEL_KILLZONE_HEIGHT);
        const killZone = this.add.zone(0, killZoneY, this.worldWidth, this.levelConfig.killZoneHeight || GAME_CONSTANTS.LEVEL_KILLZONE_HEIGHT).setOrigin(0);
        this.physics.world.enable(killZone);
        killZone.body.setImmovable(true);
        killZone.body.setAllowGravity(false);
        killZone.body.moves = false;
        this.killZone = killZone;

        // Setup collisions
        this.physics.add.collider(this.player, this.platforms);
        if (this.movingPlatforms) {
            this.physics.add.collider(this.player, this.movingPlatforms);
        }
        this.physics.add.overlap(this.player, this.hazards, () => this.hitHazard(), null, this);
        if (this.dynamicHazardsGroup) {
            this.physics.add.overlap(this.player, this.dynamicHazardsGroup, () => this.hitHazard(), null, this);
        }
        this.physics.add.overlap(this.player, this.crown, () => this.collectGem(), null, this);
        this.physics.add.overlap(this.player, killZone, () => this.hitKillZone(), null, this);

        // Create bombs
        this.bombs = this.physics.add.group();
        this.physics.add.overlap(this.player, this.bombs, this.hitBomb, null, this);
        this.spawnBomb();

        // Setup animations
        this.createAnimations();

        // Setup input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,S,A,D');
        this.space = this.input.keyboard.addKey(KEY_CODES.SPACE);
        this.muteKey = this.input.keyboard.addKey(KEY_CODES.M);

        // Setup audio pipeline
        this.audioManager.setupAudioPipeline();
        this.audioManager.setMusicMuted(this.musicMuted, { skipSave: true });

        // Setup resize handling
        const initialWidth = this.game.config.width || 800;
        const initialHeight = this.game.config.height || 600;
        this.handleResize({ width: initialWidth, height: initialHeight });

        this.events.once('shutdown', this.cleanup, this);
        this.events.once('destroy', this.cleanup, this);
    }

    checkStorageAvailability() {
        if (typeof window === 'undefined' || !window.localStorage) {
            return false;
        }
        const testKey = '__space_chicken_storage_test__';
        try {
            window.localStorage.setItem(testKey, '1');
            window.localStorage.removeItem(testKey);
            return true;
        } catch (err) {
            return false;
        }
    }

    shouldEnableTouchControls() {
        if (this.sys && this.sys.game && this.sys.game.device && this.sys.game.device.input && this.sys.game.device.input.touch) {
            return true;
        }
        if (typeof navigator !== 'undefined') {
            if ((typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0) ||
                (typeof navigator.msMaxTouchPoints === 'number' && navigator.msMaxTouchPoints > 0)) {
                return true;
            }
            const userAgent = navigator.userAgent || '';
            if (userAgent.indexOf('Macintosh') !== -1 && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0) {
                return true;
            }
        }
        if (typeof window !== 'undefined') {
            if ('ontouchstart' in window) {
                return true;
            }
            if (typeof window.matchMedia === 'function') {
                try {
                    if (window.matchMedia('(any-pointer: coarse)').matches) {
                        return true;
                    }
                } catch (error) {
                    // Ignore matchMedia errors (some browsers throw when the query is unsupported)
                }
            }
        }
        if (typeof window !== 'undefined' && typeof document !== 'undefined' && window.DocumentTouch && document instanceof window.DocumentTouch) {
            return true;
        }
        return false;
    }

    buildStaticPlatforms(platformConfigs) {
        if (!platformConfigs || platformConfigs.length === 0) {
            return;
        }
        platformConfigs.forEach(config => {
            const key = config.key || 'cliff';
            const platform = this.platforms.create(config.x, config.y, key);
            const scaleX = this.valueOrDefault(config.scaleX, 1);
            const scaleY = this.valueOrDefault(config.scaleY, 1);
            if (scaleX !== 1 || scaleY !== 1) {
                platform.setScale(scaleX, scaleY);
                platform.refreshBody();
            }
            if (config.angle !== undefined && config.angle !== null) {
                platform.setAngle(config.angle);
                platform.refreshBody();
            }
        });
    }

    buildFloorPlatforms(floorConfig) {
        if (!floorConfig) {
            return;
        }
        const step = this.valueOrDefault(floorConfig.step, 100);
        const key = floorConfig.key || 'cliff';
        const scaleX = this.valueOrDefault(floorConfig.scaleX, 1);
        const scaleY = this.valueOrDefault(floorConfig.scaleY, 1);
        if (Array.isArray(floorConfig.segments) && floorConfig.segments.length) {
            floorConfig.segments.forEach(segment => {
                const startX = segment[0];
                const endX = segment[1];
                for (let x = startX; x <= endX; x += step) {
                    const platform = this.platforms.create(x, floorConfig.y, key);
                    if (scaleX !== 1 || scaleY !== 1) {
                        platform.setScale(scaleX, scaleY);
                        platform.refreshBody();
                    }
                }
            });
            return;
        }
        const startX = this.valueOrDefault(floorConfig.start, 0);
        for (let x = startX; x < this.worldWidth; x += step) {
            const shouldPlace = typeof floorConfig.condition === 'function' ? floorConfig.condition(x, this.worldWidth) : true;
            if (!shouldPlace) {
                continue;
            }
            const platform = this.platforms.create(x, floorConfig.y, key);
            if (scaleX !== 1 || scaleY !== 1) {
                platform.setScale(scaleX, scaleY);
                platform.refreshBody();
            }
        }
    }

    setupMovingPlatforms(movingConfigs) {
        if (!movingConfigs || movingConfigs.length === 0) {
            return null;
        }
        const group = this.physics.add.group({ allowGravity: false });
        movingConfigs.forEach(config => {
            const platform = group.create(config.x, config.y, config.key || 'cliff');
            platform.setImmovable(true);
            platform.body.allowGravity = false;
            platform.setPushable(false);

            if (config.origin) {
                const originX = this.valueOrDefault(config.origin.x, 0.5);
                const originY = this.valueOrDefault(config.origin.y, 0.5);
                platform.setOrigin(originX, originY);
            }

            if (config.flipX) {
                platform.setFlipX(true);
            }

            const scaleX = this.valueOrDefault(config.scaleX, 1);
            const scaleY = this.valueOrDefault(config.scaleY, 1);
            if (scaleX !== 1 || scaleY !== 1) {
                platform.setScale(scaleX, scaleY);
            }

            const bodySize = config.bodySize || {};
            const bodyWidth = this.valueOrDefault(bodySize.width, platform.displayWidth);
            const bodyHeight = this.valueOrDefault(bodySize.height, platform.displayHeight);
            platform.body.setSize(bodyWidth, bodyHeight, true);

            if (config.bodyOffset) {
                const offsetX = this.valueOrDefault(config.bodyOffset.x, platform.body.offset.x);
                const offsetY = this.valueOrDefault(config.bodyOffset.y, platform.body.offset.y);
                platform.body.setOffset(offsetX, offsetY);
            }

            if (config.tween) {
                const tweenConfig = Object.assign({ targets: platform }, config.tween);
                if (!Object.prototype.hasOwnProperty.call(tweenConfig, 'yoyo')) {
                    tweenConfig.yoyo = true;
                }
                if (!Object.prototype.hasOwnProperty.call(tweenConfig, 'repeat')) {
                    tweenConfig.repeat = -1;
                }
                if (!Object.prototype.hasOwnProperty.call(tweenConfig, 'ease')) {
                    tweenConfig.ease = 'Sine.easeInOut';
                }
                this.tweens.add(tweenConfig);
            }

            if (config.pathVelocity) {
                const velocityX = this.valueOrDefault(config.pathVelocity.x, 0);
                const velocityY = this.valueOrDefault(config.pathVelocity.y, 0);
                platform.body.setVelocity(velocityX, velocityY);
            }
        });
        return group;
    }

    buildStaticHazards(rockConfigs) {
        if (!rockConfigs || rockConfigs.length === 0) {
            return;
        }
        rockConfigs.forEach(config => {
            const hazard = this.hazards.create(config.x, config.y, config.key || 'rock');
            const scaleX = this.valueOrDefault(config.scaleX, 1);
            const scaleY = this.valueOrDefault(config.scaleY, 1);
            if (scaleX !== 1 || scaleY !== 1) {
                hazard.setScale(scaleX, scaleY);
                hazard.refreshBody();
            }
        });
    }

    setupDynamicHazards(dynamicConfigs) {
        // Clean up any existing dynamic hazard events
        if (this.dynamicHazardEvents) {
            this.dynamicHazardEvents.forEach(event => event.remove());
        }
        this.dynamicHazardEvents = [];

        if (!dynamicConfigs || dynamicConfigs.length === 0) {
            return null;
        }

        const group = this.physics.add.group({ allowGravity: false });
        dynamicConfigs.forEach(config => {
            switch (config.type) {
                case 'laser':
                    this.createLaserHazard(group, config);
                    break;
                case 'drone':
                    this.createDroneHazard(group, config);
                    break;
                default:
                    const hazard = group.create(config.x, config.y, config.key || 'rock');
                    hazard.body.allowGravity = false;
                    hazard.setImmovable(true);
                    const scaleX = this.valueOrDefault(config.scaleX, 1);
                    const scaleY = this.valueOrDefault(config.scaleY, 1);
                    if (scaleX !== 1 || scaleY !== 1) {
                        hazard.setScale(scaleX, scaleY);
                    }
                    if (config.tween) {
                        const tweenConfig = Object.assign({ targets: hazard }, config.tween);
                        if (!Object.prototype.hasOwnProperty.call(tweenConfig, 'yoyo')) {
                            tweenConfig.yoyo = true;
                        }
                        if (!Object.prototype.hasOwnProperty.call(tweenConfig, 'repeat')) {
                            tweenConfig.repeat = -1;
                        }
                        if (!Object.prototype.hasOwnProperty.call(tweenConfig, 'ease')) {
                            tweenConfig.ease = 'Sine.easeInOut';
                        }
                        this.tweens.add(tweenConfig);
                    }
                    if (config.velocity) {
                        const velocityX = this.valueOrDefault(config.velocity.x, 0);
                        const velocityY = this.valueOrDefault(config.velocity.y, 0);
                        hazard.setVelocity(velocityX, velocityY);
                    }
                    break;
            }
        });
        return group;
    }

    createLaserHazard(group, config) {
        const orientation = config.orientation || 'horizontal';
        const length = this.valueOrDefault(config.length, 200);
        const width = this.valueOrDefault(config.width, 10);
        const beamTexture = config.key || 'laserBeam';
        const beam = group.create(config.x, config.y, beamTexture);
        beam.body.allowGravity = false;
        beam.setImmovable(true);
        beam.setBlendMode(Phaser.BlendModes.ADD);
        beam.setDepth(this.valueOrDefault(config.depth, 6));

        if (orientation === 'horizontal') {
            beam.setDisplaySize(length, width);
            beam.setAngle(0);
        } else {
            beam.setDisplaySize(width, length);
            beam.setAngle(90);
        }
        const hitHeight = Math.max(2, Math.round(width * 0.6));
        beam.body.setSize(beam.displayWidth, hitHeight, true);
        const verticalOffset = orientation === 'horizontal' ? (width - hitHeight) * 0.5 : 0;
        beam.body.setOffset(0, verticalOffset);

        const startActive = this.valueOrDefault(config.initiallyActive, true);
        const setState = (state) => {
            beam.body.enable = state;
            beam.setActive(state);
            beam.setVisible(state);
        };
        setState(startActive);

        if (config.emitter !== false) {
            const emitterKey = config.emitterKey || 'laserEmitter';
            const halfLength = length * 0.5;
            const offsetX = orientation === 'horizontal' ? halfLength : 0;
            const offsetY = orientation === 'horizontal' ? 0 : halfLength;
            const emitterStart = this.add.image(config.x - offsetX, config.y - offsetY, emitterKey);
            const emitterEnd = this.add.image(config.x + offsetX, config.y + offsetY, emitterKey);
            if (orientation === 'vertical') {
                emitterStart.setAngle(90);
                emitterEnd.setAngle(90);
            }
            const emitterDepth = this.valueOrDefault(config.depth, 6) - 1;
            emitterStart.setDepth(emitterDepth);
            emitterEnd.setDepth(emitterDepth);
        }

        const onDuration = this.valueOrDefault(config.onDuration, GAME_CONSTANTS.LASER_DEFAULT_ON_DURATION);
        const offDuration = this.valueOrDefault(config.offDuration, GAME_CONSTANTS.LASER_DEFAULT_OFF_DURATION);
        const startDelay = this.valueOrDefault(config.startDelay, GAME_CONSTANTS.LASER_DEFAULT_START_DELAY);

        const scheduleCycle = (state, delay) => {
            const event = this.time.delayedCall(delay, () => {
                Phaser.Utils.Array.Remove(this.dynamicHazardEvents, event);
                const nextState = !state;
                setState(nextState);
                scheduleCycle(nextState, nextState ? onDuration : offDuration);
            });
            this.dynamicHazardEvents.push(event);
        };

        const starter = this.time.delayedCall(startDelay, () => {
            Phaser.Utils.Array.Remove(this.dynamicHazardEvents, starter);
            scheduleCycle(startActive, startActive ? onDuration : offDuration);
        });
        this.dynamicHazardEvents.push(starter);
    }

    createDroneHazard(group, config) {
        const drone = group.create(config.x, config.y, config.key || 'drone');
        drone.body.allowGravity = false;
        drone.setImmovable(true);
        const scale = this.valueOrDefault(config.scale, 1);
        if (scale !== 1) {
            drone.setScale(scale);
        }
        const radius = config.radius !== undefined ? config.radius : Math.max(8, Math.round(drone.displayWidth * 0.25));
        drone.body.setCircle(radius, drone.displayWidth * 0.5 - radius, drone.displayHeight * 0.5 - radius);
        drone.setDepth(this.valueOrDefault(config.depth, 7));

        if (config.patrol) {
            const patrolConfig = Object.assign({ targets: drone }, config.patrol);
            if (!Object.prototype.hasOwnProperty.call(patrolConfig, 'yoyo')) {
                patrolConfig.yoyo = true;
            }
            if (!Object.prototype.hasOwnProperty.call(patrolConfig, 'repeat')) {
                patrolConfig.repeat = -1;
            }
            if (!Object.prototype.hasOwnProperty.call(patrolConfig, 'ease')) {
                patrolConfig.ease = 'Sine.easeInOut';
            }
            this.tweens.add(patrolConfig);
        }

        if (config.bobAmplitude !== undefined && config.bobAmplitude !== null) {
            this.tweens.add({
                targets: drone,
                y: drone.y - config.bobAmplitude,
                duration: this.valueOrDefault(config.bobDuration, GAME_CONSTANTS.BOB_DEFAULT_DURATION),
                yoyo: true,
                repeat: -1,
                ease: GAME_CONSTANTS.BOB_DEFAULT_EASE,
                delay: this.valueOrDefault(config.bobDelay, 0)
            });
        }

        if (config.spin) {
            const spinConfig = typeof config.spin === 'object' ? Object.assign({}, config.spin) : { angle: config.spin };
            if (typeof spinConfig.angle === 'number') {
                const angle = spinConfig.angle;
                this.tweens.add({
                    targets: drone,
                    angle: { from: -angle, to: angle },
                    duration: this.valueOrDefault(spinConfig.duration, GAME_CONSTANTS.SPIN_DEFAULT_DURATION),
                    yoyo: true,
                    repeat: -1,
                    ease: GAME_CONSTANTS.SPIN_DEFAULT_EASE
                });
            } else {
                this.tweens.add({
                    targets: drone,
                    angle: spinConfig.angle || { from: -10, to: 10 },
                    duration: this.valueOrDefault(spinConfig.duration, GAME_CONSTANTS.SPIN_DEFAULT_DURATION),
                    yoyo: true,
                    repeat: -1,
                    ease: GAME_CONSTANTS.SPIN_DEFAULT_EASE
                });
            }
        }
    }

    renderBackground(worldWidth, worldHeight) {
        const background = this.levelConfig.background;
        const baseColor = this.valueOrDefault(background.color, 0x000000);
        this.backgroundGraphics.fillStyle(baseColor).fillRect(0, 0, worldWidth, worldHeight);

        // Cache background layouts by type
        const layoutKey = `${this.level}_background_${background.type || 'space'}`;
        let layoutCache = SpaceChicken.backgroundLayouts;
        if (!layoutCache) {
            layoutCache = SpaceChicken.backgroundLayouts = new Map();
        }

        let backgroundLayout = layoutCache.get(layoutKey);
        if (!backgroundLayout) {
            if (background.type === 'station') {
                backgroundLayout = this.createStationBackgroundLayout(background, worldWidth, worldHeight);
            } else {
                backgroundLayout = this.createSpaceBackgroundLayout(background, worldWidth, worldHeight);
            }
            layoutCache.set(layoutKey, backgroundLayout);
        }

        // Render stars
        (backgroundLayout.stars || []).forEach(star => {
            this.backgroundGraphics.fillStyle(star.color).fillCircle(star.x, star.y, star.size);
        });

        // Render planets
        (backgroundLayout.planets || []).forEach(planet => {
            this.backgroundGraphics.fillStyle(planet.color).fillCircle(planet.x, planet.y, planet.size);
        });

        // Render structures (for station backgrounds)
        (backgroundLayout.structures || []).forEach(structure => {
            this.backgroundGraphics.fillStyle(structure.fill).fillRect(structure.x, structure.y, structure.width, structure.height);
            if (structure.stroke) {
                const strokeWidth = this.valueOrDefault(structure.stroke.width, 1);
                const strokeColor = this.valueOrDefault(structure.stroke.color, 0xffffff);
                const strokeAlpha = this.valueOrDefault(structure.stroke.alpha, 1);
                this.backgroundGraphics.lineStyle(strokeWidth, strokeColor, strokeAlpha);
                this.backgroundGraphics.strokeRect(structure.x, structure.y, structure.width, structure.height);
            }
        });
    }

    createSpaceBackgroundLayout(background, worldWidth, worldHeight) {
        const starCount = this.valueOrDefault(background.starCount, GAME_CONSTANTS.BACKGROUND_STAR_COUNT_DEFAULT);
        const stars = [];
        for (let i = 0; i < starCount; i++) {
            stars.push({
                x: Phaser.Math.Between(0, worldWidth),
                y: Phaser.Math.Between(0, worldHeight),
                size: Phaser.Math.Between(1, 3),
                color: 0xffffff
            });
        }

        const defaultPlanets = [
            { color: 0x004488, size: 50 },
            { color: 0x884400, size: 40 },
            { color: 0x440088, size: 30 },
            { color: 0x448800, size: 60 },
            { color: 0x888844, size: 45 },
            { color: 0x880044, size: 55 },
            { color: 0x008844, size: 35 },
            { color: 0x444488, size: 70 }
        ];
        const planetTemplates = background.planetTemplates || defaultPlanets;
        const planetCount = this.valueOrDefault(background.planetCount, GAME_CONSTANTS.BACKGROUND_PLANET_COUNT_DEFAULT);
        const planets = [];
        for (let i = 0; i < planetCount; i++) {
            const template = planetTemplates[i % planetTemplates.length];
            const x = Phaser.Math.Between(300, Math.max(300, worldWidth - 300));
            const y = Phaser.Math.Between(50, Math.max(50, worldHeight - 200));
            planets.push({ x, y, color: template.color, size: template.size });
        }

        return { stars, planets };
    }

    createStationBackgroundLayout(background, worldWidth, worldHeight) {
        const stars = [];
        const starCount = this.valueOrDefault(background.starCount, 80);
        for (let i = 0; i < starCount; i++) {
            stars.push({
                x: Phaser.Math.Between(0, worldWidth),
                y: Phaser.Math.Between(0, worldHeight),
                size: Phaser.Math.Between(1, 2),
                color: 0x9fb7ff
            });
        }

        const structures = [];
        const moduleStride = 260;
        const moduleCount = Math.ceil(worldWidth / moduleStride) + 1;
        for (let i = 0; i < moduleCount; i++) {
            const width = Phaser.Math.Between(180, 260);
            const height = Phaser.Math.Between(140, 220);
            const x = i * moduleStride + Phaser.Math.Between(-20, 40);
            const y = Phaser.Math.Between(80, Math.max(120, worldHeight - height - 160));
            structures.push({
                x,
                y,
                width,
                height,
                fill: 0x1d2333,
                stroke: { width: 2, color: 0x3b455d, alpha: 0.9 }
            });

            const windowRows = Phaser.Math.Between(2, 3);
            const windowsPerRow = Math.max(3, Math.floor(width / 40));
            for (let row = 0; row < windowRows; row++) {
                const windowY = y + 20 + row * 50;
                for (let col = 0; col < windowsPerRow; col++) {
                    const windowX = x + 16 + col * 32;
                    const lightColor = Phaser.Math.Between(0, 1) ? 0x78c0ff : 0xffe066;
                    structures.push({
                        x: windowX,
                        y: windowY,
                        width: 20,
                        height: 10,
                        fill: lightColor
                    });
                }
            }
        }

        const planets = background.disablePlanet ? [] : [{
            x: worldWidth - 160,
            y: 140,
            color: 0x142441,
            size: 80
        }];

        return { stars, planets, structures };
    }

    createAnimations() {
        if (!this.anims.exists('chicken-walk')) {
            this.anims.create({
                key: 'chicken-walk',
                frames: [
                    { key: 'chicken1' },
                    { key: 'chicken2' },
                    { key: 'chicken3' },
                    { key: 'chicken4' }
                ],
                frameRate: GAME_CONSTANTS.WALK_FRAME_RATE,
                repeat: -1
            });
        }
        if (!this.anims.exists('chicken-jump')) {
            this.anims.create({
                key: 'chicken-jump',
                frames: [{ key: 'chicken_jump' }],
                frameRate: 1,
                repeat: 0
            });
        }
        if (!this.anims.exists('chicken-jetpack')) {
            this.anims.create({
                key: 'chicken-jetpack',
                frames: [
                    { key: 'chicken_jetpack1' },
                    { key: 'chicken_jetpack2' }
                ],
                frameRate: GAME_CONSTANTS.JETPACK_FRAME_RATE,
                repeat: -1
            });
        }
    }

    valueOrDefault(value, fallback) {
        return (value === undefined || value === null) ? fallback : value;
    }

    attemptJump() {
        if (this.gameOver || this.jumpCount >= this.maxJumps) {
            return;
        }
        this.player.setVelocityY(GAME_CONSTANTS.JUMP_VELOCITY_Y);
        this.jumpCount += 1;
        if (this.jumpCount === 2) {
            this.isJetpacking = true;
            this.player.play('chicken-jetpack', true);
            this.audioManager.playJetpackSound();
        } else {
            this.isJetpacking = false;
            this.player.play('chicken-jump', true);
            this.audioManager.playJumpSound();
        }
    }

    collectGem() {
        const levelTime = performance.now() - this.startTime;
        const playerName = this.leaderboardManager.ensurePlayerName(true);
        this.leaderboardManager.saveTime(this.level, levelTime, playerName);
        this.audioManager.playCollectSound();

        if (this.levelConfig.nextLevel) {
            this.scene.restart({ level: this.levelConfig.nextLevel, deathCount: this.deathCount });
            return;
        }

        this.finalTime = levelTime;
        this.gameOver = true;
        this.restartDelayDone = false;
        this.time.delayedCall(GAME_CONSTANTS.RESTART_DELAY, () => { this.restartDelayDone = true; });
        this.physics.pause();
        this.player.setTint(0x00ff00);
        this.crown.disableBody(true, true);
        this.cameras.main.stopFollow();
        this.cameras.main.scrollX = 0;
        this.uiManager.showGameOver(this.finalTime);
    }

    hitHazard() {
        this.audioManager.playHazardHitSound();
        this.scene.restart({ level: this.level, deathCount: this.deathCount + 1 });
    }

    hitKillZone() {
        this.audioManager.playHazardHitSound();
        this.scene.restart({ level: this.level, deathCount: this.deathCount + 1 });
    }

    spawnBomb() {
        const bombSettings = this.levelConfig.bombs;
        const x = Phaser.Math.Between(-50, this.worldWidth + 50);
        const bomb = this.bombs.create(x, bombSettings.spawnHeight, 'bomb');
        bomb.setGravityY(bombSettings.gravityY);

        const targetY = this.player.y;
        let angle = Phaser.Math.Angle.Between(x, bombSettings.spawnHeight, this.player.x, targetY);
        const randomOffset = Phaser.Math.FloatBetween(-bombSettings.spread, bombSettings.spread);
        angle += randomOffset;

        const speed = bombSettings.speed;
        bomb.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

        const delay = Phaser.Math.Between(bombSettings.delayMin, bombSettings.delayMax);
        this.time.delayedCall(delay, () => this.spawnBomb(), [], this);
    }

    update() {
        // Skip updates if game is paused
        if (this.physics.world.isPaused) {
            return;
        }

        // Update timer in UI
        this.uiManager.updateTimer(performance.now() - this.startTime);

        // Handle input
        const spaceJustPressed = Phaser.Input.Keyboard.JustDown(this.space);
        const upJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up);
        const wJustPressed = Phaser.Input.Keyboard.JustDown(this.wasd.W);

        // Music mute toggle
        if (this.muteKey && Phaser.Input.Keyboard.JustDown(this.muteKey)) {
            this.audioManager.toggleMusicMute();
        }

        // Game over state handling
        if (this.gameOver) {
            if (this.restartDelayDone && (spaceJustPressed || this.jumpRequested)) {
                this.jumpRequested = false;
                this.scene.restart({ level: 1, deathCount: 0 });
            } else {
                this.jumpRequested = false;
            }
            return;
        }

        // Handle touch controls
        const activePointers = this.getActivePointers();

        if (this.jumpPointerId !== null) {
            const jumpPointer = activePointers.find(pointer => pointer.id === this.jumpPointerId);
            if (!jumpPointer || !jumpPointer.isDown) {
                this.jumpPointerId = null;
            }
        }

        this.leftPressed = false;
        this.rightPressed = false;
        let doubleTapJumpTriggered = false;

        const jumpButton = this.uiManager ? this.uiManager.jumpButton : null;
        const musicToggleButton = this.uiManager ? this.uiManager.musicToggleButton : null;
        const leaderboardButton = this.uiManager ? this.uiManager.leaderboardButton : null;

        const movementMidpoint = this.uiManager && this.uiManager.touchMovementMidpoint
            ? this.uiManager.touchMovementMidpoint
            : this.getViewportWidth() / 2;
        activePointers.forEach(pointer => {
            const pointerX = (typeof pointer.x === 'number') ? pointer.x : pointer.worldX;
            const pointerY = (typeof pointer.y === 'number') ? pointer.y : pointer.worldY;
            const hasCoordinates = typeof pointerX === 'number' && typeof pointerY === 'number';
            const isOnJumpButton = hasCoordinates && this.isPointerOverGameObject(pointerX, pointerY, jumpButton);
            const isOnMusicToggle = hasCoordinates && this.isPointerOverGameObject(pointerX, pointerY, musicToggleButton);
            const isOnLeaderboardButton = hasCoordinates && this.isPointerOverGameObject(pointerX, pointerY, leaderboardButton);
            const pointerEligibleForDoubleTap = !isOnJumpButton && !isOnMusicToggle && !isOnLeaderboardButton;

            if (pointer.justUp) {
                const upTime = (typeof pointer.upTime === 'number' && pointer.upTime > 0) ? pointer.upTime : performance.now();
                if (this.uiManager.touchControlsEnabled && hasCoordinates && pointerEligibleForDoubleTap) {
                    const lastTapTime = this.pointerTapTimes.has(pointer.id) ? this.pointerTapTimes.get(pointer.id) : 0;
                    if (lastTapTime > 0 && (upTime - lastTapTime) <= GAME_CONSTANTS.DOUBLE_TAP_THRESHOLD) {
                        doubleTapJumpTriggered = true;
                    }
                }
                if (this.pointerTapTimes) {
                    if (pointerEligibleForDoubleTap) {
                        this.pointerTapTimes.set(pointer.id, upTime);
                    } else {
                        this.pointerTapTimes.delete(pointer.id);
                    }
                }
            }

            if (!pointer.isDown) {
                return;
            }

            if (this.jumpPointerId !== null && pointer.id === this.jumpPointerId) {
                return;
            }

            if (!hasCoordinates) {
                return;
            }

            if (pointerX < movementMidpoint) {
                this.leftPressed = true;
            } else {
                this.rightPressed = true;
            }
        });

        // Jump handling
        const isGrounded = this.player.body.blocked.down || this.player.body.touching.down;
        if (isGrounded) {
            this.jumpCount = 0;
            this.isJetpacking = false;
        }

        const keyboardJumpTriggered = upJustPressed || spaceJustPressed || wJustPressed;
        const pointerJumpTriggered = !this.uiManager.jumpButton && activePointers.some(pointer => {
            if (this.jumpPointerId !== null && pointer.id === this.jumpPointerId) {
                return false;
            }
            if (!pointer.justUp) {
                return false;
            }
            const downTime = (typeof pointer.downTime === 'number') ? pointer.downTime : 0;
            const upTime = (typeof pointer.upTime === 'number') ? pointer.upTime : downTime + 201;
            return (upTime - downTime) < GAME_CONSTANTS.JUMP_BUTTON_TOUCH_TOLERANCE;
        });

        if (keyboardJumpTriggered) {
            this.attemptJump();
        }

        if (pointerJumpTriggered) {
            this.attemptJump();
        }

        if (doubleTapJumpTriggered) {
            this.attemptJump();
        }

        if (this.jumpRequested) {
            this.attemptJump();
            this.jumpRequested = false;
        }

        // Movement
        let velocityX = 0;
        if (this.cursors.left.isDown || this.wasd.A.isDown || this.leftPressed) {
            velocityX -= GAME_CONSTANTS.PLAYER_VELOCITY_X;
        }
        if (this.cursors.right.isDown || this.wasd.D.isDown || this.rightPressed) {
            velocityX += GAME_CONSTANTS.PLAYER_VELOCITY_X;
        }
        this.player.setVelocityX(velocityX);

        // Clamp player position
        const halfWidth = this.player.displayWidth * GAME_CONSTANTS.PLAYER_CLAMP_OFFSET;
        const minX = halfWidth;
        const maxX = this.worldWidth - halfWidth;
        const clampedX = Phaser.Math.Clamp(this.player.x, minX, maxX);
        if (clampedX !== this.player.x) {
            this.player.x = clampedX;
            this.player.setVelocityX(0);
        }

        // Animation state
        const currentAnimKey = this.player.anims.currentAnim ? this.player.anims.currentAnim.key : null;
        if (isGrounded && this.jumpCount === 0) {
            if (currentAnimKey !== 'chicken-walk') {
                this.player.play('chicken-walk');
            }
        } else if (this.isJetpacking) {
            if (currentAnimKey !== 'chicken-jetpack') {
                this.player.play('chicken-jetpack');
            }
        } else if (currentAnimKey !== 'chicken-jump') {
            this.player.play('chicken-jump');
        }

        // Check for kill zone
        const killThreshold = this.levelConfig.killZoneY + 10;
        if (this.player.y > killThreshold) {
            this.hitKillZone();
        }

        // Clean up off-screen bombs
        const bombCleanupY = this.worldHeight + GAME_CONSTANTS.BOMB_CLEANUP_THRESHOLD_Y;
        this.bombs.children.entries.forEach(bomb => {
            if (bomb.x < -100 || bomb.x > this.worldWidth + 100 || bomb.y > bombCleanupY) {
                bomb.destroy();
            }
        });
    }

    getActivePointers() {
        if (!this.input) {
            return [];
        }
        const pointers = [];
        if (Array.isArray(this.input.pointers)) {
            pointers.push(...this.input.pointers);
        }
        if (this.input.activePointer) {
            pointers.push(this.input.activePointer);
        }
        const uniquePointers = [];
        const seen = new Set();
        pointers.forEach(pointer => {
            if (!pointer || seen.has(pointer)) {
                return;
            }
            seen.add(pointer);
            uniquePointers.push(pointer);
        });
        return uniquePointers;
    }

    isPointerOverGameObject(pointerX, pointerY, gameObject) {
        if (!gameObject || typeof pointerX !== 'number' || typeof pointerY !== 'number' || typeof gameObject.getBounds !== 'function') {
            return false;
        }
        const bounds = gameObject.getBounds();
        if (bounds && typeof bounds.contains === 'function') {
            return bounds.contains(pointerX, pointerY);
        }
        if (!bounds) {
            return false;
        }
        return pointerX >= bounds.x && pointerX <= bounds.x + bounds.width &&
            pointerY >= bounds.y && pointerY <= bounds.y + bounds.height;
    }

    hitBomb(bomb, player) {
        this.audioManager.playHazardHitSound();
        this.scene.restart({ level: this.level, deathCount: this.deathCount + 1 });
    }

    handleResize(gameSize) {
        this.uiManager.handleResize(gameSize);
    }

    cleanup() {
        // Clean up managers
        if (this.uiManager) {
            this.uiManager.cleanup();
        }
        if (this.audioManager) {
            this.audioManager.cleanupAudio();
        }

        // Clean up dynamic hazard events
        if (this.dynamicHazardEvents) {
            this.dynamicHazardEvents.forEach(event => event.remove());
            this.dynamicHazardEvents = [];
        }

        // Clean up pointer tracking
        if (this.pointerTapTimes) {
            this.pointerTapTimes.clear();
        }
    }
}

// Static cache for background layouts
SpaceChicken.backgroundLayouts = new Map();

export { SpaceChicken };
