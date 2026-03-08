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
        this.isTransitioning = false;
        this.pendingSceneData = null;
        this.maxJumps = GAME_CONSTANTS.MAX_JUMPS;
        this.jumpCount = 0;
        this.isJetpacking = false;
        this.restartDelayDone = true;
        this.bombSpawnEvent = null;

        // Input state
        this.leftPressed = false;
        this.rightPressed = false;
        this.jumpRequested = false;
        this.jumpPointerId = null;

        // Timers and events
        this.dynamicHazardEvents = [];

        // Pointer tracking
        this.pointerTapTimes = new Map();

        if (SpaceChicken.backgroundLayouts instanceof Map && SpaceChicken.backgroundLayouts.size > 12) {
            SpaceChicken.backgroundLayouts.clear();
        }
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
        this.physics.resume();

        // Set up timer
        this.startTime = performance.now();

        // Create UI
        this.uiManager.createUI(this.levelConfig, this.level, this.playerName);

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
        const background = this.levelConfig.background || {};

        // Cache background layouts by type
        const layoutKey = `${this.level}_background_${background.type || 'space'}_${background.style || 'default'}_${worldWidth}x${worldHeight}`;
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

        this.backgroundGraphics.clear();
        if (background.type === 'station') {
            this.renderStationBackground(background, backgroundLayout, worldWidth, worldHeight);
            return;
        }
        this.renderSpaceBackground(background, backgroundLayout, worldWidth, worldHeight);
    }

    renderSpaceBackground(background, layout, worldWidth, worldHeight) {
        const palette = Object.assign({
            top: 0x06101f,
            mid: 0x104b77,
            bottom: 0xffa466,
            haze: 0x84e7ff,
            glow: 0xffd48c,
            grid: 0x63d5ff,
            accent: 0xff845c,
            silhouetteFar: 0x0c1322,
            silhouetteNear: 0x07101a
        }, background.palette || {});

        this.renderVerticalGradient(0, 0, worldWidth, worldHeight, [palette.top, palette.mid, palette.bottom], 48);
        this.drawGlow(worldWidth * 0.58, worldHeight * 0.82, Math.max(worldWidth * 0.16, 180), palette.glow, 0.06, 5);
        this.renderPolygons(layout.ribbons);

        (layout.nebulas || []).forEach(nebula => {
            this.drawGlow(nebula.x, nebula.y, nebula.radius, nebula.color, nebula.alpha, 6);
        });

        this.renderStars(layout.stars);
        this.renderPlanets(layout.planets);
        this.renderPerspectiveGrid(layout.grid, worldWidth, worldHeight);

        if (layout.farRidge && layout.farRidge.length) {
            const farPoints = [{ x: -80, y: worldHeight }, ...layout.farRidge, { x: worldWidth + 80, y: worldHeight }];
            this.renderPolygon(farPoints, palette.silhouetteFar, 0.95);
        }

        if (layout.nearRidge && layout.nearRidge.length) {
            const nearPoints = [{ x: -80, y: worldHeight }, ...layout.nearRidge, { x: worldWidth + 80, y: worldHeight }];
            this.renderPolygon(nearPoints, palette.silhouetteNear, 0.98);
        }

        (layout.towers || []).forEach(tower => {
            (tower.shapes || []).forEach(shape => {
                this.renderPolygon(shape.points, shape.fill, this.valueOrDefault(shape.alpha, 1), shape.stroke);
            });
            if (tower.spine) {
                this.backgroundGraphics.fillStyle(tower.spine.fill, this.valueOrDefault(tower.spine.alpha, 1));
                this.backgroundGraphics.fillRect(tower.spine.x, tower.spine.y, tower.spine.width, tower.spine.height);
            }
            (tower.windows || []).forEach(windowPanel => {
                this.backgroundGraphics.fillStyle(windowPanel.color, this.valueOrDefault(windowPanel.alpha, 1));
                this.backgroundGraphics.fillRect(windowPanel.x, windowPanel.y, windowPanel.width, windowPanel.height);
            });
            if (tower.glow) {
                this.drawGlow(tower.glow.x, tower.glow.y, tower.glow.radius, tower.glow.color, tower.glow.alpha, 4);
            }
            (tower.crownLights || []).forEach(light => {
                this.drawGlow(light.x, light.y, light.radius * 3, light.color, light.alpha * 0.16, 3);
                this.backgroundGraphics.fillStyle(light.color, light.alpha).fillCircle(light.x, light.y, light.radius);
            });
        });

        (layout.beacons || []).forEach(beacon => {
            this.drawGlow(beacon.x, beacon.y, beacon.radius * 4, beacon.color, beacon.alpha * 0.22, 4);
            this.backgroundGraphics.fillStyle(beacon.color, beacon.alpha).fillCircle(beacon.x, beacon.y, beacon.radius);
        });

        this.renderScanlines(worldWidth, worldHeight, palette.haze, 0.05, 5, 1);
    }

    renderStationBackground(background, layout, worldWidth, worldHeight) {
        const palette = Object.assign({
            top: 0x040915,
            mid: 0x102544,
            bottom: 0x1f5d7a,
            haze: 0x86f0ff,
            glow: 0xffc87c,
            metal: 0x18253a,
            metalAlt: 0x243657,
            highlight: 0x9de4ff,
            accent: 0xff9642,
            shadow: 0x09111d
        }, background.palette || {});

        this.renderVerticalGradient(0, 0, worldWidth, worldHeight, [palette.top, palette.mid, palette.bottom], 52);
        this.drawGlow(worldWidth * 0.68, worldHeight * 0.18, Math.max(worldWidth * 0.12, 150), palette.haze, 0.05, 4);
        this.renderPolygons(layout.ribbons);

        (layout.nebulas || []).forEach(nebula => {
            this.drawGlow(nebula.x, nebula.y, nebula.radius, nebula.color, nebula.alpha, 6);
        });

        this.renderStars(layout.stars);
        this.renderPlanets(layout.planets);

        (layout.frames || []).forEach(frame => {
            this.backgroundGraphics.lineStyle(frame.lineWidth, frame.color, frame.alpha);
            this.backgroundGraphics.strokeEllipse(frame.x, frame.y, frame.width, frame.height);
        });

        (layout.modules || []).forEach(module => {
            this.backgroundGraphics.fillStyle(module.fill, this.valueOrDefault(module.alpha, 1));
            this.backgroundGraphics.fillRect(module.x, module.y, module.width, module.height);
            this.backgroundGraphics.fillStyle(module.insetFill, 0.95);
            this.backgroundGraphics.fillRect(module.x + 6, module.y + 6, Math.max(8, module.width - 12), Math.max(8, module.height - 12));
            this.backgroundGraphics.lineStyle(2, module.strokeColor, this.valueOrDefault(module.edgeAlpha, 0.75));
            this.backgroundGraphics.strokeRect(module.x, module.y, module.width, module.height);

            (module.braces || []).forEach(brace => {
                this.renderPolygon(brace.points, brace.fill, brace.alpha, brace.stroke);
            });

            (module.panels || []).forEach(panel => {
                this.backgroundGraphics.fillStyle(panel.fill, this.valueOrDefault(panel.alpha, 1));
                this.backgroundGraphics.fillRect(panel.x, panel.y, panel.width, panel.height);
                if (panel.strokeColor) {
                    this.backgroundGraphics.lineStyle(1, panel.strokeColor, this.valueOrDefault(panel.strokeAlpha, 0.4));
                    this.backgroundGraphics.strokeRect(panel.x, panel.y, panel.width, panel.height);
                }
            });

            (module.windows || []).forEach(windowPanel => {
                this.backgroundGraphics.fillStyle(windowPanel.color, this.valueOrDefault(windowPanel.alpha, 1));
                this.backgroundGraphics.fillRect(windowPanel.x, windowPanel.y, windowPanel.width, windowPanel.height);
                this.drawGlow(
                    windowPanel.x + windowPanel.width * 0.5,
                    windowPanel.y + windowPanel.height * 0.5,
                    Math.max(windowPanel.width, windowPanel.height) * 1.8,
                    windowPanel.color,
                    windowPanel.alpha * 0.18,
                    3
                );
            });

            if (module.antenna) {
                this.backgroundGraphics.lineStyle(2, module.antenna.color, module.antenna.alpha);
                this.backgroundGraphics.beginPath();
                this.backgroundGraphics.moveTo(module.antenna.x, module.antenna.baseY);
                this.backgroundGraphics.lineTo(module.antenna.x, module.antenna.tipY);
                this.backgroundGraphics.strokePath();
                this.drawGlow(module.antenna.x, module.antenna.tipY, 16, module.antenna.beaconColor, module.antenna.beaconAlpha * 0.18, 3);
                this.backgroundGraphics.fillStyle(module.antenna.beaconColor, module.antenna.beaconAlpha);
                this.backgroundGraphics.fillCircle(module.antenna.x, module.antenna.tipY, 2);
            }
        });

        (layout.catwalks || []).forEach(catwalk => {
            this.backgroundGraphics.fillStyle(catwalk.fill, catwalk.alpha).fillRect(catwalk.x, catwalk.y, catwalk.width, catwalk.height);
            this.backgroundGraphics.lineStyle(2, catwalk.strokeColor, 0.55).strokeRect(catwalk.x, catwalk.y, catwalk.width, catwalk.height);
            (catwalk.lights || []).forEach(light => {
                this.backgroundGraphics.fillStyle(light.color, light.alpha).fillRect(light.x, light.y, light.width, light.height);
            });
        });

        (layout.struts || []).forEach(strut => {
            this.renderPolygon(strut.points, strut.fill, strut.alpha, strut.stroke);
        });

        (layout.floorBands || []).forEach(band => {
            this.renderPolygon(band.points, band.fill, band.alpha, band.stroke);
        });

        (layout.deckLights || []).forEach(light => {
            this.drawGlow(light.x + light.width * 0.5, light.y + light.height * 0.5, light.width * 1.6, light.color, light.alpha * 0.18, 3);
            this.backgroundGraphics.fillStyle(light.color, light.alpha).fillRect(light.x, light.y, light.width, light.height);
        });

        (layout.beacons || []).forEach(beacon => {
            this.drawGlow(beacon.x, beacon.y, beacon.radius * 4, beacon.color, beacon.alpha * 0.2, 4);
            this.backgroundGraphics.fillStyle(beacon.color, beacon.alpha).fillCircle(beacon.x, beacon.y, beacon.radius);
        });

        this.renderScanlines(
            worldWidth,
            worldHeight,
            palette.highlight,
            this.valueOrDefault(background.scanlineAlpha, 0.04),
            6,
            1
        );
    }

    renderVerticalGradient(x, y, width, height, colors, steps = 32) {
        if (!Array.isArray(colors) || colors.length === 0) {
            return;
        }
        if (colors.length === 1) {
            this.backgroundGraphics.fillStyle(colors[0], 1).fillRect(x, y, width, height);
            return;
        }

        const safeSteps = Math.max(1, steps);
        const segments = colors.length - 1;
        for (let i = 0; i < safeSteps; i++) {
            const t = i / safeSteps;
            const segmentPosition = t * segments;
            const segmentIndex = Math.min(segments - 1, Math.floor(segmentPosition));
            const localT = segmentPosition - segmentIndex;
            const color = this.blendColor(colors[segmentIndex], colors[segmentIndex + 1], localT);
            const rectY = y + Math.floor((i / safeSteps) * height);
            const nextY = y + Math.ceil(((i + 1) / safeSteps) * height);
            this.backgroundGraphics.fillStyle(color, 1).fillRect(x, rectY, width, Math.max(1, nextY - rectY));
        }
    }

    renderPolygons(polygons) {
        (polygons || []).forEach(polygon => {
            this.renderPolygon(polygon.points, polygon.fill, polygon.alpha, polygon.stroke);
        });
    }

    renderPolygon(points, fill, alpha = 1, stroke = null) {
        if (!points || points.length < 3) {
            return;
        }

        this.backgroundGraphics.fillStyle(fill, alpha);
        this.backgroundGraphics.beginPath();
        this.backgroundGraphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.backgroundGraphics.lineTo(points[i].x, points[i].y);
        }
        this.backgroundGraphics.closePath();
        this.backgroundGraphics.fillPath();

        if (!stroke) {
            return;
        }

        this.backgroundGraphics.lineStyle(
            this.valueOrDefault(stroke.width, 1),
            this.valueOrDefault(stroke.color, 0xffffff),
            this.valueOrDefault(stroke.alpha, 1)
        );
        this.backgroundGraphics.beginPath();
        this.backgroundGraphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.backgroundGraphics.lineTo(points[i].x, points[i].y);
        }
        this.backgroundGraphics.closePath();
        this.backgroundGraphics.strokePath();
    }

    renderStars(stars) {
        (stars || []).forEach(star => {
            const alpha = this.valueOrDefault(star.alpha, 1);
            const size = this.valueOrDefault(star.size, 1);
            this.backgroundGraphics.fillStyle(star.color, alpha).fillCircle(star.x, star.y, size);
            if (star.flare) {
                this.backgroundGraphics.fillStyle(star.color, alpha * 0.7);
                this.backgroundGraphics.fillRect(star.x - star.flare, star.y, star.flare * 2 + 1, 1);
                this.backgroundGraphics.fillRect(star.x, star.y - star.flare, 1, star.flare * 2 + 1);
            }
        });
    }

    renderPlanets(planets) {
        (planets || []).forEach(planet => {
            this.renderPlanet(planet);
        });
    }

    renderPlanet(planet) {
        const alpha = this.valueOrDefault(planet.alpha, 1);
        const size = this.valueOrDefault(planet.size, 40);
        const glowColor = this.valueOrDefault(planet.glowColor, planet.color);

        this.drawGlow(planet.x, planet.y, size * 1.8, glowColor, 0.16 * alpha, 6);

        if (planet.ringWidth && planet.ringHeight) {
            this.backgroundGraphics.lineStyle(2, this.valueOrDefault(planet.ringColor, glowColor), this.valueOrDefault(planet.ringAlpha, 0.4));
            this.backgroundGraphics.strokeEllipse(planet.x, planet.y, planet.ringWidth, planet.ringHeight);
        }

        this.backgroundGraphics.fillStyle(this.valueOrDefault(planet.shadowColor, this.adjustColor(planet.color, -70)), 0.35 * alpha);
        this.backgroundGraphics.fillCircle(planet.x + size * 0.16, planet.y + size * 0.05, size * 0.96);
        this.backgroundGraphics.fillStyle(planet.color, alpha).fillCircle(planet.x, planet.y, size);
        this.backgroundGraphics.fillStyle(this.valueOrDefault(planet.highlightColor, this.adjustColor(planet.color, 50)), 0.24 * alpha);
        this.backgroundGraphics.fillCircle(planet.x - size * 0.3, planet.y - size * 0.28, size * 0.42);
        this.backgroundGraphics.fillStyle(this.valueOrDefault(planet.detailColor, this.adjustColor(planet.color, -28)), 0.15 * alpha);
        this.backgroundGraphics.fillCircle(planet.x - size * 0.08, planet.y + size * 0.14, size * 0.18);
        this.backgroundGraphics.fillCircle(planet.x + size * 0.3, planet.y - size * 0.2, size * 0.12);
        this.backgroundGraphics.lineStyle(2, this.valueOrDefault(planet.atmosphereColor, glowColor), 0.5 * alpha);
        this.backgroundGraphics.strokeCircle(planet.x, planet.y, size + 4);
    }

    renderPerspectiveGrid(grid, worldWidth, worldHeight) {
        if (!grid) {
            return;
        }

        const horizonY = this.valueOrDefault(grid.horizonY, Math.round(worldHeight * 0.72));
        const vanishingX = this.valueOrDefault(grid.vanishingX, Math.round(worldWidth * 0.5));
        const rows = this.valueOrDefault(grid.rows, 8);
        const colStep = Math.max(48, this.valueOrDefault(grid.colStep, 120));
        const color = this.valueOrDefault(grid.color, 0x63d5ff);

        this.drawGlow(vanishingX, horizonY + 36, Math.max(worldWidth * 0.18, 180), color, 0.08, 4);

        for (let row = 1; row <= rows; row++) {
            const t = row / rows;
            const y = Phaser.Math.Linear(horizonY, worldHeight, t * t);
            this.backgroundGraphics.lineStyle(1, color, 0.06 + t * 0.16);
            this.backgroundGraphics.beginPath();
            this.backgroundGraphics.moveTo(0, y);
            this.backgroundGraphics.lineTo(worldWidth, y);
            this.backgroundGraphics.strokePath();
        }

        for (let x = -colStep; x <= worldWidth + colStep; x += colStep) {
            const distance = Math.abs(x - vanishingX) / Math.max(1, worldWidth);
            this.backgroundGraphics.lineStyle(1, color, 0.08 + distance * 0.08);
            this.backgroundGraphics.beginPath();
            this.backgroundGraphics.moveTo(vanishingX, horizonY);
            this.backgroundGraphics.lineTo(x, worldHeight);
            this.backgroundGraphics.strokePath();
        }
    }

    renderScanlines(worldWidth, worldHeight, color, alpha, step = 6, thickness = 1) {
        const safeStep = Math.max(2, step);
        for (let y = 0; y < worldHeight; y += safeStep) {
            const lineAlpha = (Math.floor(y / safeStep) % 2 === 0) ? alpha : alpha * 0.55;
            this.backgroundGraphics.fillStyle(color, lineAlpha).fillRect(0, y, worldWidth, thickness);
        }
    }

    drawGlow(x, y, radius, color, alpha = 0.15, rings = 5) {
        const safeRings = Math.max(1, rings);
        for (let i = safeRings; i >= 1; i--) {
            const ratio = i / safeRings;
            this.backgroundGraphics.fillStyle(color, alpha * ratio * ratio);
            this.backgroundGraphics.fillCircle(x, y, Math.max(1, radius * ratio));
        }
    }

    blendColor(colorA, colorB, t) {
        const clamped = Phaser.Math.Clamp(t, 0, 1);
        const rA = (colorA >> 16) & 0xff;
        const gA = (colorA >> 8) & 0xff;
        const bA = colorA & 0xff;
        const rB = (colorB >> 16) & 0xff;
        const gB = (colorB >> 8) & 0xff;
        const bB = colorB & 0xff;
        const r = Math.round(Phaser.Math.Linear(rA, rB, clamped));
        const g = Math.round(Phaser.Math.Linear(gA, gB, clamped));
        const b = Math.round(Phaser.Math.Linear(bA, bB, clamped));
        return (r << 16) | (g << 8) | b;
    }

    adjustColor(color, amount) {
        const clampChannel = (value) => Math.max(0, Math.min(255, value));
        const r = clampChannel(((color >> 16) & 0xff) + amount);
        const g = clampChannel(((color >> 8) & 0xff) + amount);
        const b = clampChannel((color & 0xff) + amount);
        return (r << 16) | (g << 8) | b;
    }

    getRangeValue(range, fallbackMin, fallbackMax) {
        if (Array.isArray(range) && range.length >= 2) {
            const min = Math.min(range[0], range[1]);
            const max = Math.max(range[0], range[1]);
            return Phaser.Math.Between(min, max);
        }
        if (typeof range === 'number' && Number.isFinite(range)) {
            return range;
        }
        return Phaser.Math.Between(fallbackMin, fallbackMax);
    }

    createRidgePoints(worldWidth, baseY, amplitudeMin, amplitudeMax, segmentMin, segmentMax) {
        const points = [];
        let x = -120;
        while (x <= worldWidth + 120) {
            points.push({
                x,
                y: baseY - Phaser.Math.Between(amplitudeMin, amplitudeMax)
            });
            x += Phaser.Math.Between(segmentMin, segmentMax);
        }
        return points;
    }

    sampleRidgeY(points, x, fallback) {
        if (!points || points.length === 0) {
            return fallback;
        }
        if (x <= points[0].x) {
            return points[0].y;
        }
        for (let i = 0; i < points.length - 1; i++) {
            const current = points[i];
            const next = points[i + 1];
            if (x >= current.x && x <= next.x) {
                const t = (x - current.x) / Math.max(1, next.x - current.x);
                return Phaser.Math.Linear(current.y, next.y, t);
            }
        }
        return points[points.length - 1].y;
    }

    createSpaceTower(x, groundY, width, height, palette) {
        const halfWidth = width * 0.5;
        const topY = groundY - height;
        const bodyColor = this.adjustColor(palette.silhouetteNear, Phaser.Math.Between(10, 26));
        const shadowColor = this.adjustColor(bodyColor, -12);
        const edgeColor = this.adjustColor(palette.haze, -30);
        const shoulderWidth = halfWidth * Phaser.Math.FloatBetween(0.72, 0.9);
        const waistWidth = halfWidth * Phaser.Math.FloatBetween(0.42, 0.62);
        const neckWidth = halfWidth * Phaser.Math.FloatBetween(0.18, 0.36);
        const crownHeight = Phaser.Math.Between(16, 34);
        const profile = Phaser.Math.Between(0, 2);
        const bodyTopY = topY + crownHeight;
        const shapes = [];

        if (profile === 0) {
            shapes.push({
                points: [
                    { x: x - halfWidth, y: groundY },
                    { x: x - shoulderWidth, y: groundY - height * 0.22 },
                    { x: x - waistWidth, y: groundY - height * 0.56 },
                    { x: x - neckWidth, y: bodyTopY },
                    { x: x + neckWidth, y: bodyTopY },
                    { x: x + waistWidth, y: groundY - height * 0.56 },
                    { x: x + shoulderWidth, y: groundY - height * 0.22 },
                    { x: x + halfWidth, y: groundY }
                ],
                fill: bodyColor,
                alpha: 0.96
            });
            shapes.push({
                points: [
                    { x: x - neckWidth * 0.8, y: bodyTopY },
                    { x: x, y: topY - crownHeight * 0.2 },
                    { x: x + neckWidth * 0.8, y: bodyTopY }
                ],
                fill: this.adjustColor(bodyColor, 10),
                alpha: 0.98,
                stroke: { width: 1, color: edgeColor, alpha: 0.16 }
            });
        } else if (profile === 1) {
            const finReach = halfWidth * Phaser.Math.FloatBetween(0.22, 0.38);
            shapes.push({
                points: [
                    { x: x - halfWidth, y: groundY },
                    { x: x - halfWidth * 0.82, y: groundY - height * 0.18 },
                    { x: x - shoulderWidth, y: groundY - height * 0.52 },
                    { x: x - neckWidth, y: bodyTopY },
                    { x: x + neckWidth, y: bodyTopY },
                    { x: x + shoulderWidth, y: groundY - height * 0.52 },
                    { x: x + halfWidth * 0.82, y: groundY - height * 0.18 },
                    { x: x + halfWidth, y: groundY }
                ],
                fill: bodyColor,
                alpha: 0.96
            });
            shapes.push({
                points: [
                    { x: x - shoulderWidth, y: groundY - height * 0.34 },
                    { x: x - shoulderWidth - finReach, y: groundY - height * 0.2 },
                    { x: x - shoulderWidth * 0.68, y: groundY - height * 0.1 }
                ],
                fill: shadowColor,
                alpha: 0.92
            });
            shapes.push({
                points: [
                    { x: x + shoulderWidth, y: groundY - height * 0.34 },
                    { x: x + shoulderWidth + finReach, y: groundY - height * 0.2 },
                    { x: x + shoulderWidth * 0.68, y: groundY - height * 0.1 }
                ],
                fill: shadowColor,
                alpha: 0.92
            });
            shapes.push({
                points: [
                    { x: x - neckWidth * 0.9, y: bodyTopY },
                    { x: x - neckWidth * 0.42, y: topY + crownHeight * 0.15 },
                    { x: x, y: topY - crownHeight * 0.35 },
                    { x: x + neckWidth * 0.42, y: topY + crownHeight * 0.15 },
                    { x: x + neckWidth * 0.9, y: bodyTopY }
                ],
                fill: this.adjustColor(bodyColor, 12),
                alpha: 0.98,
                stroke: { width: 1, color: edgeColor, alpha: 0.14 }
            });
        } else {
            const ledgeWidth = halfWidth * Phaser.Math.FloatBetween(0.22, 0.36);
            shapes.push({
                points: [
                    { x: x - halfWidth, y: groundY },
                    { x: x - halfWidth * 0.94, y: groundY - height * 0.14 },
                    { x: x - shoulderWidth, y: groundY - height * 0.36 },
                    { x: x - waistWidth, y: groundY - height * 0.62 },
                    { x: x - ledgeWidth, y: groundY - height * 0.62 },
                    { x: x - neckWidth, y: bodyTopY },
                    { x: x + neckWidth, y: bodyTopY },
                    { x: x + ledgeWidth, y: groundY - height * 0.62 },
                    { x: x + waistWidth, y: groundY - height * 0.62 },
                    { x: x + shoulderWidth, y: groundY - height * 0.36 },
                    { x: x + halfWidth * 0.94, y: groundY - height * 0.14 },
                    { x: x + halfWidth, y: groundY }
                ],
                fill: bodyColor,
                alpha: 0.96
            });
            shapes.push({
                points: [
                    { x: x - neckWidth, y: bodyTopY },
                    { x: x - neckWidth * 0.5, y: topY + crownHeight * 0.22 },
                    { x: x + neckWidth * 0.5, y: topY + crownHeight * 0.22 },
                    { x: x + neckWidth, y: bodyTopY }
                ],
                fill: this.adjustColor(bodyColor, 14),
                alpha: 0.98
            });
            shapes.push({
                points: [
                    { x: x - neckWidth * 0.45, y: topY + crownHeight * 0.22 },
                    { x: x, y: topY - crownHeight * 0.28 },
                    { x: x + neckWidth * 0.45, y: topY + crownHeight * 0.22 }
                ],
                fill: this.adjustColor(bodyColor, 22),
                alpha: 0.98,
                stroke: { width: 1, color: edgeColor, alpha: 0.14 }
            });
        }

        const spineWidth = Math.max(4, Math.round(width * Phaser.Math.FloatBetween(0.12, 0.2)));
        const spineHeight = Math.max(18, Math.round(height * Phaser.Math.FloatBetween(0.2, 0.32)));
        const spineY = groundY - Math.round(height * 0.52) - spineHeight * 0.5;
        const windows = [];
        const slitCount = Phaser.Math.Between(4, 8);
        for (let i = 0; i < slitCount; i++) {
            const windowWidth = Phaser.Math.Between(3, Math.max(5, Math.floor(width * 0.16)));
            const windowHeight = Phaser.Math.Between(3, 6);
            const lateralOffset = Phaser.Math.Between(-Math.floor(width * 0.14), Math.floor(width * 0.14));
            windows.push({
                x: x + lateralOffset - Math.floor(windowWidth * 0.5),
                y: groundY - Math.round(height * Phaser.Math.FloatBetween(0.2, 0.78)),
                width: windowWidth,
                height: windowHeight,
                color: Phaser.Utils.Array.GetRandom([palette.haze, palette.glow, palette.accent]),
                alpha: Phaser.Math.FloatBetween(0.45, 0.82)
            });
        }

        const crownLights = [];
        if (Phaser.Math.Between(0, 1) === 1) {
            crownLights.push({
                x,
                y: topY - crownHeight * 0.28,
                radius: 2,
                color: palette.accent,
                alpha: 0.88
            });
        }

        return {
            shapes,
            spine: {
                x: x - Math.floor(spineWidth * 0.5),
                y: spineY,
                width: spineWidth,
                height: spineHeight,
                fill: this.adjustColor(bodyColor, 8),
                alpha: 0.85
            },
            windows,
            crownLights,
            glow: {
                x,
                y: topY + crownHeight * 0.25,
                radius: Math.max(20, width),
                color: palette.accent,
                alpha: 0.08
            }
        };
    }

    createSpaceBackgroundLayout(background, worldWidth, worldHeight) {
        const palette = Object.assign({
            haze: 0x84e7ff,
            glow: 0xffd48c,
            accent: 0xff845c,
            grid: 0x63d5ff,
            silhouetteNear: 0x07101a
        }, background.palette || {});
        const starCount = this.valueOrDefault(background.starCount, GAME_CONSTANTS.BACKGROUND_STAR_COUNT_DEFAULT);
        const stars = [];
        const starColors = [
            0xffffff,
            palette.haze,
            palette.glow,
            this.adjustColor(palette.accent, 18)
        ];
        for (let i = 0; i < starCount; i++) {
            stars.push({
                x: Phaser.Math.Between(0, worldWidth),
                y: Phaser.Math.Between(0, Math.round(worldHeight * 0.72)),
                size: Phaser.Math.Between(1, 3),
                color: Phaser.Utils.Array.GetRandom(starColors),
                alpha: Phaser.Math.FloatBetween(0.35, 1),
                flare: Phaser.Math.Between(0, 10) === 0 ? Phaser.Math.Between(2, 5) : 0
            });
        }

        const ribbons = [];
        const ribbonColors = [palette.haze, palette.accent, palette.glow];
        for (let i = 0; i < 3; i++) {
            const startY = Phaser.Math.Between(40, Math.round(worldHeight * 0.48));
            const thickness = Phaser.Math.Between(70, 140);
            const endY = startY + Phaser.Math.Between(-120, 120);
            ribbons.push({
                points: [
                    { x: -140, y: startY },
                    { x: worldWidth + 140, y: endY },
                    { x: worldWidth + 140, y: endY + thickness },
                    { x: -140, y: startY + thickness }
                ],
                fill: Phaser.Utils.Array.GetRandom(ribbonColors),
                alpha: Phaser.Math.FloatBetween(0.05, 0.11)
            });
        }

        const nebulas = [];
        for (let i = 0; i < 5; i++) {
            nebulas.push({
                x: Phaser.Math.Between(0, worldWidth),
                y: Phaser.Math.Between(40, Math.round(worldHeight * 0.58)),
                radius: Phaser.Math.Between(120, 280),
                color: Phaser.Utils.Array.GetRandom(ribbonColors),
                alpha: Phaser.Math.FloatBetween(0.05, 0.13)
            });
        }

        const defaultPlanets = [
            { color: 0x2d5f9c, size: 54 },
            { color: 0xe17b52, size: 40 },
            { color: 0x6b59b6, size: 34 },
            { color: 0x3a9877, size: 46 },
            { color: 0xb8b054, size: 38 },
            { color: 0xd05572, size: 44 }
        ];
        const planetTemplates = background.planetTemplates || defaultPlanets;
        const planetCount = Math.max(1, this.valueOrDefault(background.planetCount, GAME_CONSTANTS.BACKGROUND_PLANET_COUNT_DEFAULT));
        const planets = [];
        const heroTemplate = planetTemplates[0];
        const heroSize = Phaser.Math.Between(Math.round(worldHeight * 0.12), Math.round(worldHeight * 0.2));
        planets.push({
            x: Phaser.Math.Between(Math.round(worldWidth * 0.18), Math.round(worldWidth * 0.82)),
            y: Phaser.Math.Between(90, Math.round(worldHeight * 0.28)),
            color: heroTemplate.color,
            size: heroSize,
            alpha: 0.95,
            glowColor: palette.glow,
            atmosphereColor: palette.haze,
            ringColor: this.blendColor(palette.haze, palette.glow, 0.5),
            ringAlpha: 0.5,
            ringWidth: Math.round(heroSize * 2.3),
            ringHeight: Math.max(32, Math.round(heroSize * 0.7)),
            shadowColor: this.adjustColor(heroTemplate.color, -70),
            highlightColor: this.adjustColor(heroTemplate.color, 55)
        });

        for (let i = 1; i < planetCount; i++) {
            const template = planetTemplates[i % planetTemplates.length];
            planets.push({
                x: Phaser.Math.Between(120, Math.max(120, worldWidth - 120)),
                y: Phaser.Math.Between(50, Math.max(80, Math.round(worldHeight * 0.45))),
                color: template.color,
                size: Phaser.Math.Between(Math.max(18, template.size - 10), template.size + 14),
                alpha: Phaser.Math.FloatBetween(0.75, 0.92),
                glowColor: Phaser.Utils.Array.GetRandom([palette.haze, palette.accent]),
                atmosphereColor: palette.haze,
                shadowColor: this.adjustColor(template.color, -60),
                highlightColor: this.adjustColor(template.color, 45)
            });
        }

        const horizonY = Math.round(worldHeight * 0.72);
        const farRidge = this.createRidgePoints(worldWidth, horizonY + 12, 36, 110, 120, 220);
        const nearRidge = this.createRidgePoints(worldWidth, horizonY + 92, 70, 180, 90, 160);

        const towers = [];
        const beacons = [];
        for (let x = Phaser.Math.Between(60, 140); x < worldWidth - 40; x += Phaser.Math.Between(180, 320)) {
            const groundY = this.sampleRidgeY(nearRidge, x, worldHeight - 90);
            const width = Phaser.Math.Between(22, 48);
            const height = Phaser.Math.Between(60, 170);
            const tower = this.createSpaceTower(x, groundY, width, height, palette);
            towers.push(tower);
            if (Phaser.Math.Between(0, 1) === 1) {
                beacons.push({
                    x,
                    y: groundY - height - Phaser.Math.Between(8, 18),
                    radius: 2,
                    color: palette.accent,
                    alpha: 0.74
                });
            }
        }

        const grid = {
            horizonY,
            vanishingX: Math.round(worldWidth * Phaser.Math.FloatBetween(0.42, 0.58)),
            color: palette.grid,
            rows: 8,
            colStep: Phaser.Math.Between(100, 150)
        };

        return { stars, ribbons, nebulas, planets, farRidge, nearRidge, towers, beacons, grid };
    }

    createStationModule(x, y, width, height, palette, options = {}) {
        const padding = Phaser.Math.Between(10, 16);
        const insetWidth = Math.max(32, width - padding * 2);
        const insetHeight = Math.max(32, height - padding * 2);
        const panels = [];
        const windows = [];
        const braces = [];
        const panelRows = this.getRangeValue(options.panelRows, 2, 4);
        const panelCols = this.getRangeValue(options.panelCols, 2, 4);
        const gap = 8;
        const panelWidth = Math.max(24, Math.floor((insetWidth - (panelCols - 1) * gap) / panelCols));
        const panelHeight = Math.max(20, Math.floor((insetHeight - (panelRows - 1) * gap) / panelRows));

        for (let row = 0; row < panelRows; row++) {
            for (let col = 0; col < panelCols; col++) {
                const panelX = x + padding + col * (panelWidth + gap);
                const panelY = y + padding + row * (panelHeight + gap);
                panels.push({
                    x: panelX,
                    y: panelY,
                    width: panelWidth,
                    height: panelHeight,
                    fill: (row + col) % 2 === 0 ? palette.metalAlt : this.adjustColor(palette.metal, -8),
                    alpha: 0.85,
                    strokeColor: palette.highlight,
                    strokeAlpha: 0.16
                });
            }
        }

        const windowCount = this.getRangeValue(options.windowCount, 8, 18);
        for (let i = 0; i < windowCount; i++) {
            const windowWidth = Phaser.Math.Between(8, 18);
            const windowHeight = Phaser.Math.Between(3, 6);
            windows.push({
                x: Phaser.Math.Between(x + 14, x + Math.max(14, width - windowWidth - 14)),
                y: Phaser.Math.Between(y + 14, y + Math.max(14, height - windowHeight - 14)),
                width: windowWidth,
                height: windowHeight,
                color: Phaser.Utils.Array.GetRandom([palette.haze, palette.highlight, palette.accent]),
                alpha: Phaser.Math.FloatBetween(0.55, 0.95)
            });
        }

        braces.push({
            points: [
                { x: x + 8, y: y + height * 0.2 },
                { x: x + width * 0.5, y: y + height * 0.08 },
                { x: x + width - 8, y: y + height * 0.2 },
                { x: x + width - 20, y: y + height * 0.34 },
                { x: x + 20, y: y + height * 0.34 }
            ],
            fill: palette.shadow,
            alpha: 0.4,
            stroke: { width: 1, color: palette.highlight, alpha: 0.12 }
        });

        const antennaHeight = this.getRangeValue(options.antennaHeight, 20, 56);
        return {
            x,
            y,
            width,
            height,
            fill: palette.metal,
            insetFill: this.adjustColor(palette.metalAlt, -6),
            strokeColor: palette.highlight,
            edgeAlpha: 0.72,
            alpha: 0.92,
            panels,
            windows,
            braces,
            antenna: {
                x: x + width - Phaser.Math.Between(18, 30),
                baseY: y,
                tipY: y - antennaHeight,
                color: palette.highlight,
                alpha: 0.7,
                beaconColor: palette.accent,
                beaconAlpha: 0.85
            }
        };
    }

    createStationBackgroundLayout(background, worldWidth, worldHeight) {
        const palette = Object.assign({
            haze: 0x86f0ff,
            glow: 0xffc87c,
            metal: 0x18253a,
            metalAlt: 0x243657,
            highlight: 0x9de4ff,
            accent: 0xff9642,
            shadow: 0x09111d
        }, background.palette || {});
        const stars = [];
        const starCount = this.valueOrDefault(background.starCount, 80);
        const ribbonCount = this.valueOrDefault(background.ribbonCount, 2);
        const nebulaCount = this.valueOrDefault(background.nebulaCount, 3);
        const frameCount = this.valueOrDefault(background.frameCount, 2);
        const moduleStride = this.valueOrDefault(background.moduleStride, 260);
        const catwalkStep = this.valueOrDefault(background.catwalkStep, 220);
        const deckLightStep = this.valueOrDefault(background.deckLightStep, 130);
        const beaconChance = this.valueOrDefault(background.moduleBeaconChance, 0.5);
        const starColors = [0xffffff, palette.haze, palette.highlight];
        for (let i = 0; i < starCount; i++) {
            stars.push({
                x: Phaser.Math.Between(0, worldWidth),
                y: Phaser.Math.Between(0, Math.round(worldHeight * 0.7)),
                size: Phaser.Math.Between(1, 2),
                color: Phaser.Utils.Array.GetRandom(starColors),
                alpha: Phaser.Math.FloatBetween(0.35, 0.95),
                flare: Phaser.Math.Between(0, 12) === 0 ? Phaser.Math.Between(2, 4) : 0
            });
        }

        const ribbons = [];
        for (let i = 0; i < ribbonCount; i++) {
            const startY = Phaser.Math.Between(30, Math.round(worldHeight * 0.42));
            const thickness = Phaser.Math.Between(50, 120);
            const endY = startY + Phaser.Math.Between(-80, 80);
            ribbons.push({
                points: [
                    { x: -120, y: startY },
                    { x: worldWidth + 120, y: endY },
                    { x: worldWidth + 120, y: endY + thickness },
                    { x: -120, y: startY + thickness }
                ],
                fill: Phaser.Utils.Array.GetRandom([palette.haze, palette.highlight, palette.accent]),
                alpha: Phaser.Math.FloatBetween(0.04, 0.09)
            });
        }

        const nebulas = [];
        for (let i = 0; i < nebulaCount; i++) {
            nebulas.push({
                x: Phaser.Math.Between(0, worldWidth),
                y: Phaser.Math.Between(50, Math.round(worldHeight * 0.45)),
                radius: Phaser.Math.Between(120, 260),
                color: Phaser.Utils.Array.GetRandom([palette.haze, palette.highlight]),
                alpha: Phaser.Math.FloatBetween(0.04, 0.1)
            });
        }

        const frameTemplates = [
            {
                x: Math.round(worldWidth * 0.26),
                y: Math.round(worldHeight * 0.22),
                width: 300,
                height: 128,
                color: palette.highlight,
                alpha: 0.18,
                lineWidth: 2
            },
            {
                x: Math.round(worldWidth * 0.76),
                y: Math.round(worldHeight * 0.18),
                width: 420,
                height: 164,
                color: palette.haze,
                alpha: 0.12,
                lineWidth: 3
            }
        ];
        const frames = frameTemplates.slice(0, Math.max(0, frameCount));

        const modules = [];
        const beacons = [];
        const moduleCount = Math.ceil(worldWidth / moduleStride) + 1;
        for (let i = 0; i < moduleCount; i++) {
            const width = Phaser.Math.Between(180, 260);
            const height = Phaser.Math.Between(140, 220);
            const x = i * moduleStride + Phaser.Math.Between(-20, 40);
            const y = Phaser.Math.Between(80, Math.max(120, worldHeight - height - 160));
            const module = this.createStationModule(x, y, width, height, palette, background.moduleDetail || {});
            modules.push(module);
            if (module.antenna && Math.random() < beaconChance) {
                beacons.push({
                    x: module.antenna.x,
                    y: module.antenna.tipY,
                    radius: 2,
                    color: palette.accent,
                    alpha: 0.82
                });
            }
        }

        const catwalks = [];
        const struts = [];
        for (let x = -40; x < worldWidth + 40; x += catwalkStep) {
            const width = Phaser.Math.Between(120, 240);
            const y = Phaser.Math.Between(Math.round(worldHeight * 0.58), Math.round(worldHeight * 0.76));
            const lights = [];
            const catwalkLightStep = this.valueOrDefault(background.catwalkLightStep, 28);
            for (let lightX = x + 18; lightX < x + width - 18; lightX += catwalkLightStep) {
                lights.push({
                    x: lightX,
                    y: y + 7,
                    width: 12,
                    height: 3,
                    color: Phaser.Utils.Array.GetRandom([palette.haze, palette.accent]),
                    alpha: Phaser.Math.FloatBetween(0.55, 0.9)
                });
            }
            catwalks.push({
                x,
                y,
                width,
                height: 18,
                fill: palette.metalAlt,
                strokeColor: palette.highlight,
                alpha: 0.8,
                lights
            });

            const supportHeight = Phaser.Math.Between(60, 140);
            struts.push({
                points: [
                    { x: x + 22, y: y + 18 },
                    { x: x + 10, y: y + 18 + supportHeight },
                    { x: x + 34, y: y + 18 + supportHeight },
                    { x: x + 44, y: y + 18 }
                ],
                fill: palette.shadow,
                alpha: 0.42,
                stroke: { width: 1, color: palette.highlight, alpha: 0.08 }
            });
            struts.push({
                points: [
                    { x: x + width - 22, y: y + 18 },
                    { x: x + width - 34, y: y + 18 + supportHeight },
                    { x: x + width - 10, y: y + 18 + supportHeight },
                    { x: x + width, y: y + 18 }
                ],
                fill: palette.shadow,
                alpha: 0.42,
                stroke: { width: 1, color: palette.highlight, alpha: 0.08 }
            });
        }

        const floorBands = [
            {
                points: [
                    { x: -100, y: worldHeight },
                    { x: -100, y: Math.round(worldHeight * 0.84) },
                    { x: Math.round(worldWidth * 0.3), y: Math.round(worldHeight * 0.77) },
                    { x: Math.round(worldWidth * 0.68), y: Math.round(worldHeight * 0.8) },
                    { x: worldWidth + 100, y: Math.round(worldHeight * 0.78) },
                    { x: worldWidth + 100, y: worldHeight }
                ],
                fill: palette.shadow,
                alpha: 0.94
            },
            {
                points: [
                    { x: -100, y: worldHeight },
                    { x: -100, y: Math.round(worldHeight * 0.91) },
                    { x: Math.round(worldWidth * 0.42), y: Math.round(worldHeight * 0.87) },
                    { x: worldWidth + 100, y: Math.round(worldHeight * 0.89) },
                    { x: worldWidth + 100, y: worldHeight }
                ],
                fill: palette.metal,
                alpha: 0.76,
                stroke: { width: 2, color: palette.highlight, alpha: 0.08 }
            }
        ];

        const deckLights = [];
        for (let x = -20; x < worldWidth + 40; x += deckLightStep) {
            deckLights.push({
                x,
                y: Math.round(worldHeight * 0.9),
                width: 42,
                height: 4,
                color: Phaser.Utils.Array.GetRandom([palette.haze, palette.accent, palette.highlight]),
                alpha: Phaser.Math.FloatBetween(0.55, 0.9)
            });
        }

        const planets = background.disablePlanet ? [] : [
            {
                x: worldWidth - 190,
                y: 150,
                color: 0x1d4f76,
                size: Math.round(worldHeight * 0.12),
                alpha: 0.92,
                glowColor: palette.haze,
                atmosphereColor: palette.haze,
                shadowColor: 0x0a1a2e,
                highlightColor: 0x5db5ff
            },
            {
                x: worldWidth - 78,
                y: 102,
                color: 0x67789f,
                size: 24,
                alpha: 0.84,
                glowColor: palette.highlight,
                atmosphereColor: palette.highlight,
                shadowColor: 0x25334d,
                highlightColor: 0xbfd4ff
            }
        ];

        return {
            stars,
            ribbons,
            nebulas,
            planets,
            frames,
            modules,
            catwalks: background.showCatwalks === false ? [] : catwalks,
            struts: background.showCatwalks === false ? [] : struts,
            floorBands,
            deckLights: background.showDeckLights === false ? [] : deckLights,
            beacons
        };
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
        if (this.isTransitioning || this.gameOver) {
            return;
        }
        const levelTime = performance.now() - this.startTime;
        const playerName = this.leaderboardManager.ensurePlayerName(false);
        this.playerName = playerName;
        if (this.uiManager) {
            this.uiManager.updatePlayerName(playerName);
        }
        this.leaderboardManager.saveTime(this.level, levelTime, playerName);
        this.audioManager.playCollectSound();

        if (this.levelConfig.nextLevel) {
            this.crown.disableBody(true, true);
            this.queueSceneStart({ level: this.levelConfig.nextLevel, deathCount: this.deathCount });
            return;
        }

        this.finalTime = levelTime;
        this.gameOver = true;
        this.isTransitioning = true;
        this.restartDelayDone = false;
        this.time.delayedCall(GAME_CONSTANTS.RESTART_DELAY, () => { this.restartDelayDone = true; });
        this.stopActiveGameplay();
        this.player.setTint(0x00ff00);
        this.cameras.main.stopFollow();
        this.cameras.main.scrollX = 0;
        this.uiManager.showGameOver(this.finalTime);
    }

    hitHazard() {
        this.audioManager.playHazardHitSound();
        this.restartLevel();
    }

    hitKillZone() {
        this.audioManager.playHazardHitSound();
        this.restartLevel();
    }

    restartLevel() {
        if (this.isTransitioning || this.gameOver) {
            return;
        }
        this.queueSceneStart({ level: this.level, deathCount: this.deathCount + 1 });
    }

    queueSceneStart(data) {
        if (this.isTransitioning) {
            return;
        }
        this.isTransitioning = true;
        this.pendingSceneData = data;
        if (this.player && this.player.body) {
            this.player.body.enable = false;
        }
        this.stopActiveGameplay({ pausePhysics: false });
        this.time.delayedCall(0, () => {
            const nextSceneData = this.pendingSceneData;
            this.pendingSceneData = null;
            this.scene.start(this.scene.key, nextSceneData);
        });
    }

    stopActiveGameplay(options = {}) {
        const pausePhysics = options.pausePhysics !== false;
        if (this.bombSpawnEvent) {
            this.bombSpawnEvent.remove(false);
            this.bombSpawnEvent = null;
        }
        if (this.bombs) {
            this.bombs.clear(true, true);
        }
        if (pausePhysics && this.physics && this.physics.world) {
            this.physics.pause();
        }
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
        if (this.bombSpawnEvent) {
            this.bombSpawnEvent.remove(false);
        }
        this.bombSpawnEvent = this.time.delayedCall(delay, () => this.spawnBomb(), [], this);
    }

    update() {
        const inputState = this.handleInput();
        const {
            spaceJustPressed,
            upJustPressed,
            wJustPressed,
            doubleTapJumpTriggered,
            pointerJumpTriggered
        } = inputState;

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

        // Skip gameplay updates if physics is paused for non-game-over states
        if (this.physics.world.isPaused) {
            this.jumpRequested = false;
            return;
        }

        // Update timer in UI
        this.uiManager.updateTimer(performance.now() - this.startTime);

        // Jump handling
        const isGrounded = this.player.body.blocked.down || this.player.body.touching.down;
        if (isGrounded) {
            this.jumpCount = 0;
            this.isJetpacking = false;
        }

        const keyboardJumpTriggered = upJustPressed || spaceJustPressed || wJustPressed;

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
        this.restartLevel();
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

        if (this.bombSpawnEvent) {
            this.bombSpawnEvent.remove(false);
            this.bombSpawnEvent = null;
        }

        // Clean up dynamic hazard events
        if (this.dynamicHazardEvents) {
            this.dynamicHazardEvents.forEach(event => event.remove());
            this.dynamicHazardEvents = [];
        }

        // Phaser destroys physics groups during scene shutdown. Clearing them again here
        // can throw because the group internals have already been disposed.
        this.dynamicHazardsGroup = null;
        this.bombs = null;

        // Clean up pointer tracking
        if (this.pointerTapTimes) {
            this.pointerTapTimes.clear();
        }
    }

    handleInput() {
        const spaceJustPressed = Phaser.Input.Keyboard.JustDown(this.space);
        const upJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up);
        const wJustPressed = Phaser.Input.Keyboard.JustDown(this.wasd.W);

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

        const pointerJumpTriggered = !jumpButton && activePointers.some(pointer => {
            if (this.jumpPointerId !== null && pointer.id === this.jumpPointerId) {
                return false;
            }
            if (!pointer.justUp) {
                return false;
            }
            const pointerX = (typeof pointer.x === 'number') ? pointer.x : pointer.worldX;
            const pointerY = (typeof pointer.y === 'number') ? pointer.y : pointer.worldY;
            const hasCoordinates = typeof pointerX === 'number' && typeof pointerY === 'number';
            if (hasCoordinates) {
                const isOnMusicToggle = this.isPointerOverGameObject(pointerX, pointerY, musicToggleButton);
                const isOnLeaderboardButton = this.isPointerOverGameObject(pointerX, pointerY, leaderboardButton);
                if (isOnMusicToggle || isOnLeaderboardButton) {
                    return false;
                }
            }
            const downTime = (typeof pointer.downTime === 'number') ? pointer.downTime : 0;
            const upTime = (typeof pointer.upTime === 'number') ? pointer.upTime : downTime + 201;
            return (upTime - downTime) < GAME_CONSTANTS.JUMP_BUTTON_TOUCH_TOLERANCE;
        });

        return {
            spaceJustPressed,
            upJustPressed,
            wJustPressed,
            doubleTapJumpTriggered,
            pointerJumpTriggered
        };
    }
}

// Static cache for background layouts
SpaceChicken.backgroundLayouts = new Map();

export { SpaceChicken };
