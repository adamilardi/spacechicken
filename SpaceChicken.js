import { GAME_CONSTANTS, KEY_CODES, LEVEL_IDS } from './Constants.js';
import { AudioManager } from './AudioManager.js';
import { LevelConfig } from './LevelConfig.js';
import { UIManager } from './UIManager.js';
import { LeaderboardManager } from './LeaderboardManager.js';
import { SpriteFactory } from './SpriteFactory.js';
import { EffectsManager } from './EffectsManager.js';
import { BackgroundRenderer } from './BackgroundRenderer.js';
import { WorldBuilder } from './WorldBuilder.js';
import { InputController } from './InputController.js';
import { Viewport } from './Viewport.js';
import { GameTestInterface, normalizeTestSeed } from './GameTestInterface.js';
import { boarderSteering, boarderYields, canBonkFromAbove } from './GameUtils.js';
import { paneZoom, SPLIT_GAP, splitPanes } from './SplitScreen.js';

function readLaunchQuery() {
    if (typeof location === 'undefined' || !location.search) {
        return { level: null, bot: false, debug: false, seed: null, timeScale: 1 };
    }
    const query = new URLSearchParams(location.search);
    const level = Number(query.get('level'));
    const requestedTimeScale = Number(query.get('timeScale'));
    return {
        level: Number.isFinite(level) ? level : null,
        bot: query.has('bot'),
        debug: query.has('debug'),
        coop: query.get('coop') || null,
        seed: query.get('seed'),
        timeScale:
            query.has('timeScale') && Number.isFinite(requestedTimeScale)
                ? Phaser.Math.Clamp(requestedTimeScale, 0.1, 1)
                : 1,
    };
}

function motionDirection(vx, vy) {
    const horizontal = vx > 5 ? 'right' : vx < -5 ? 'left' : '';
    const vertical = vy > 5 ? 'down' : vy < -5 ? 'up' : '';
    return [vertical, horizontal].filter(Boolean).join('_') || 'stationary';
}

// eslint-disable-next-line complexity
function listGroupBodies(group, now = 0, defaults = {}, timeScale = 1) {
    const entries = group && group.children && group.children.entries;
    if (!Array.isArray(entries)) {
        return [];
    }
    const out = [];
    for (let i = 0; i < entries.length; i++) {
        const sprite = entries[i];
        if (!sprite) {
            continue;
        }
        const width = sprite.displayWidth || sprite.width || 32;
        const height = sprite.displayHeight || sprite.height || 32;
        const meta = sprite.testMeta || {};
        const vx = sprite.body?.velocity?.x || 0;
        const vy = sprite.body?.velocity?.y || 0;
        out.push({
            id: meta.id || `${defaults.type || 'entity'}-${i + 1}`,
            kind: meta.kind || defaults.kind || null,
            type: meta.type || defaults.type || null,
            x: sprite.x,
            y: sprite.y,
            vx,
            vy,
            direction: motionDirection(vx, vy),
            w: width,
            h: height,
            left: sprite.x - width / 2,
            right: sprite.x + width / 2,
            top: sprite.y - height / 2,
            active: sprite.active !== false,
            enable: !sprite.body || sprite.body.enable !== false,
            phase: meta.phase || null,
            bonkable: Boolean(sprite.bonkable || meta.bonkable),
            timeUntilPhaseChangeMs: Number.isFinite(meta.nextChangeAt)
                ? Math.max(0, Math.round(meta.nextChangeAt - now))
                : null,
            origin: meta.origin || null,
            target: meta.target || null,
            durationMs: Number.isFinite(meta.durationMs) ? meta.durationMs / timeScale : null,
            delayMs: Number.isFinite(meta.delayMs) ? meta.delayMs / timeScale : null,
            orientation: meta.orientation || null,
            intervalMs: meta.intervalMs ?? null,
        });
    }
    return out;
}

function listHazardSchedules(scene, now, timeScale = 1) {
    const schedules = scene && scene.testHazardSchedules;
    if (!Array.isArray(schedules)) return [];
    return schedules.map((schedule) => ({
        id: schedule.id,
        kind: schedule.kind,
        type: schedule.type,
        x: schedule.x,
        y: schedule.y,
        phase: schedule.phase,
        intervalMs: schedule.intervalMs / timeScale,
        warningDurationMs: schedule.warningDurationMs / timeScale,
        activeDurationMs: schedule.activeDurationMs / timeScale,
        timeUntilPhaseChangeMs: Number.isFinite(schedule.nextChangeAt)
            ? Math.max(0, Math.round(schedule.nextChangeAt - now))
            : null,
    }));
}

function listRayColumns(scene) {
    const warnings = scene && scene.activeWarningGraphics;
    if (!Array.isArray(warnings) || warnings.length === 0) {
        return [];
    }
    const out = [];
    for (let i = 0; i < warnings.length; i++) {
        const graphic = warnings[i];
        if (graphic && Number.isFinite(graphic.rayX)) {
            out.push({
                id: `cosmic-ray-warning-${i + 1}`,
                kind: 'hazard_warning',
                type: 'cosmic_ray',
                x: graphic.rayX,
                y: (scene.worldHeight || 0) / 2,
                w: 36,
                h: Math.max(0, (scene.worldHeight || 0) - 100),
                warning: true,
                phase: 'warning',
                active: true,
                enable: true,
            });
        }
    }
    return out;
}

function pendingLevelOf(scene) {
    const data = scene && scene.pendingSceneData;
    if (!data || data.level == null) {
        return null;
    }
    return data.level;
}

function describePlayer(player) {
    if (!player) {
        return null;
    }
    const body = player.body;
    const velocity = body && body.velocity;
    return {
        x: player.x,
        y: player.y,
        vx: velocity ? velocity.x : 0,
        vy: velocity ? velocity.y : 0,
        grounded: Boolean(body && (body.blocked.down || body.touching.down)),
        alpha: player.alpha,
        visible: player.visible !== false,
        scaleX: player.scaleX,
        scaleY: player.scaleY,
        bodyEnable: body ? body.enable !== false : null,
    };
}

function hudField(manager, key) {
    return manager && manager[key] ? manager[key].text : null;
}

export class SpaceChicken extends Phaser.Scene {
    constructor() {
        super();
        this.viewport = new Viewport(this);
    }

    init(data = {}) {
        const launch = readLaunchQuery();
        const requestedLevel = Number(data.level != null ? data.level : launch.level);
        this.level = LEVEL_IDS.includes(requestedLevel) ? requestedLevel : LEVEL_IDS[0];
        const requestedDeathCount = Number(data.deathCount);
        this.deathCount =
            Number.isFinite(requestedDeathCount) && requestedDeathCount >= 0
                ? Math.floor(requestedDeathCount)
                : 0;
        this.runElapsedMs = Number.isFinite(data.runElapsedMs) ? data.runElapsedMs : 0;
        this.runEligible = data.runEligible === true;
        this.fullRunToken = data.fullRunToken || null;
        this.playerId = data.playerId || null;
        this.launchBot = Boolean(launch.bot);
        this.debugMode = Boolean(launch.debug || launch.bot);
        this.testTimeScale = this.debugMode ? launch.timeScale : 1;
        this.testSeed = normalizeTestSeed(
            data.testSeed != null ? data.testSeed : launch.seed,
            null
        );
        if (this.debugMode && this.testSeed != null && Phaser.Math.RND?.sow) {
            Phaser.Math.RND.sow([String(this.testSeed)]);
        }
        const requestedCoop = Object.prototype.hasOwnProperty.call(data, 'coopMode')
            ? data.coopMode
            : launch.coop;
        this.coopMode = ['keyboard', 'keyboard-controller', 'controllers'].includes(requestedCoop)
            ? requestedCoop
            : null;
        this.player2 = null;
        this.player2Camera = null;
        this.player2JumpCount = 0;
        this.player2WasGrounded = false;
        this.raceFinale = false;
        this.raceConcluded = false;
        this.raceWinner = 0;
        this.raceLevelTime = 0;
        this.raceFinaleEvent = null;
        this.splitDivider = null;
        this.splitLabels = null;
        this.levelCheckpoint = null;
        this.startTime = 0;
        this.gameOver = false;
        this.isTransitioning = false;
        this.pendingSceneData = null;
        this.maxJumps = GAME_CONSTANTS.MAX_JUMPS;
        this.jumpCount = 0;
        this.isJetpacking = false;
        this.restartDelayDone = true;
        this.bombSpawnEvent = null;
        this.bombTestCounter = 0;
        this.deathResetEvent = null;
        this.deathResetWall = null;
        this.boarderGraceUntil = 0;
        this.hasCleanedUp = false;
        this.awaitingStart =
            this.level === LEVEL_IDS[0] && this.deathCount === 0 && !this.launchBot;
        this.wasGrounded = false;
        this.airborneSince = 0;
        this.maxAirSpeedY = 0;
        this.crownGlow = null;
        this.killZoneFallY = 0;
        this.hasStartedPlay = false;
        this.uiCamera = null;
        this.playCameraZoom = 1;

        this.leftPressed = false;
        this.rightPressed = false;
        this.jumpRequested = false;
        this.botJumpWasDown = false;
        this.jumpPointerId = null;

        this.dynamicHazardEvents = [];
        this.activeWarningGraphics = [];
        this.pointerTapTimes = new Map();
    }

    getBaseWidth() {
        return this.viewport.getBaseWidth();
    }

    getBaseHeight() {
        return this.viewport.getBaseHeight();
    }

    getViewportWidth() {
        return this.viewport.getWidth();
    }

    getViewportHeight() {
        return this.viewport.getHeight();
    }

    preload() {
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
        this.spriteFactory.createRover();
        this.spriteFactory.createExpeditionSprites();
        this.spriteFactory.createVirtualButtons();
        this.spriteFactory.createParticleTextures();
    }

    create() {
        this.levelConfig = new LevelConfig(this.level);
        this.audioManager = new AudioManager(this);
        this.uiManager = new UIManager(this);
        this.leaderboardManager = new LeaderboardManager(this);
        this.playerId = this.leaderboardManager.getPlayerId();
        if (this.fullRunToken) this.leaderboardManager.runTokens.set(0, this.fullRunToken);
        this.effectsManager = new EffectsManager(this);
        this.backgroundRenderer = new BackgroundRenderer(this);
        this.worldBuilder = new WorldBuilder(this);
        this.inputController = new InputController(this);

        this.storageAvailable = this.checkStorageAvailability();
        this.playerName = this.leaderboardManager.loadPlayerName();
        this.musicMuted = this.audioManager.loadMusicPreference();
        if (this.launchBot) {
            this.musicMuted = true;
        }
        this.audioManager.musicMuted = this.musicMuted;
        this.audioManager.configureLevelMusic();
        this.bindBotDebugApi();

        this.physics.world.gravity.y = this.levelConfig.gravity;
        this.physics.resume();
        this.applyTestTimeScale();
        this.startTime = performance.now();

        this.viewportWidth = this.getBaseWidth();
        this.viewportHeight = this.getBaseHeight();
        this.uiManager.createUI(this.levelConfig, this.level, this.playerName);
        if (!this.debugMode && this.level !== 1) this.leaderboardManager.startRun(this.level);
        this.leaderboardManager.fetchCompetition().then((competition) => {
            if (!this.uiManager?.destroyed) {
                this.uiManager.updateCompetitionTarget(
                    competition?.levels?.[this.level]?.[0] || null,
                    competition?.levels?.[0]?.[0] || null
                );
            }
        });

        this.worldWidth = this.levelConfig.world.width;
        this.worldHeight = this.levelConfig.world.height;
        this.killZoneFallY = this.levelConfig.killZoneY + this.levelConfig.killZoneHeight;
        this.backgroundRenderer.render(this.worldWidth, this.worldHeight);

        this.player = this.physics.add.sprite(
            this.levelConfig.playerStart.x,
            this.levelConfig.playerStart.y,
            'chicken1'
        );
        this.player.setBounce(GAME_CONSTANTS.PLAYER_BOUNCE);
        this.player.setCollideWorldBounds(false);
        this.player.setDepth(5);

        this.setupCamera();
        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

        this.platforms = this.physics.add.staticGroup();
        this.hazards = this.physics.add.staticGroup();
        const builtWorld = this.worldBuilder.build(this.levelConfig);
        this.movingPlatforms = builtWorld.movingPlatforms;
        this.dynamicHazardsGroup = builtWorld.dynamicHazardsGroup;
        this.boardersGroup = builtWorld.boardersGroup;
        if (this.boardersGroup) {
            this.physics.add.collider(this.boardersGroup, this.platforms);
            if (this.movingPlatforms) {
                this.physics.add.collider(this.boardersGroup, this.movingPlatforms);
            }
        }

        this.crown = this.physics.add.staticSprite(
            this.levelConfig.crown.x,
            this.levelConfig.crown.y,
            'crown'
        );
        this.crown.setDepth(4);
        this.decorateCrown();

        const killZone = this.add
            .zone(0, this.levelConfig.killZoneY, this.worldWidth, this.levelConfig.killZoneHeight)
            .setOrigin(0);
        this.physics.world.enable(killZone);
        killZone.body.setImmovable(true);
        killZone.body.setAllowGravity(false);
        killZone.body.moves = false;
        this.killZone = killZone;

        this.physics.add.collider(this.player, this.platforms);
        if (this.movingPlatforms) {
            this.physics.add.collider(this.player, this.movingPlatforms);
        }
        this.physics.add.overlap(this.player, this.hazards, this.resolveHazardContact, null, this);
        if (this.dynamicHazardsGroup) {
            this.physics.add.overlap(
                this.player,
                this.dynamicHazardsGroup,
                this.resolveHazardContact,
                null,
                this
            );
        }
        this.physics.add.overlap(
            this.player,
            this.crown,
            (chicken) => this.collectGem(chicken),
            null,
            this
        );
        this.physics.add.overlap(this.player, killZone, () => this.failFromHazard(), null, this);

        this.bombs = this.physics.add.group({
            maxSize: GAME_CONSTANTS.BOMB_POOL_SIZE,
        });
        this.physics.add.overlap(this.player, this.bombs, this.failFromHazard, null, this);
        this.wireBoarders(this.player);
        this.setupPhaser();

        this.createAnimations();

        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,S,A,D');
        this.space = this.input.keyboard.addKey(KEY_CODES.SPACE);
        this.phaserKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
        this.phaserKeyAlt = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
        this.player2PhaserKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.NUMPAD_ONE
        );
        this.retryKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        this.muteKey = this.input.keyboard.addKey(KEY_CODES.M);
        this.debugSkipKey = this.debugMode
            ? this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N)
            : null;
        this.player2Keys = {
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
            jump: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_ZERO),
        };
        this.coopKeys = {
            keyboard: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
            keyboardController: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
            controllers: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
        };

        this.audioManager.setupAudioPipeline();
        this.audioManager.setMusicMuted(this.musicMuted, { skipSave: true });

        if (this.coopMode) {
            this.enableCoopMode();
        }

        const initialWidth = this.game.config.width || this.getBaseWidth();
        const initialHeight = this.game.config.height || this.getBaseHeight();
        this.handleResize({ width: initialWidth, height: initialHeight });
        if (this.scale?.on) {
            this.boundHandleResize = (gameSize) => this.handleResize(gameSize);
            this.scale.on('resize', this.boundHandleResize, this);
        }

        this.events.once('shutdown', this.cleanup, this);
        this.events.once('destroy', this.cleanup, this);

        this.startSession();
    }

    setupCamera() {
        const camera = this.getMainCamera();
        if (!camera) {
            return;
        }
        if (camera.startFollow) {
            camera.startFollow(
                this.player,
                true,
                GAME_CONSTANTS.CAMERA_LERP_X,
                GAME_CONSTANTS.CAMERA_LERP_Y
            );
        }
        if (camera.setBounds) {
            camera.setBounds(0, 0, this.worldWidth, this.worldHeight);
        }
        camera.roundPixels = true;
        this.setupUiCamera();
        this.updateCameraForViewport();
    }

    setupUiCamera() {
        if (!this.cameras?.add || this.uiCamera) {
            return;
        }
        this.uiCamera = this.cameras.add(0, 0, this.getViewportWidth(), this.getViewportHeight());
        if (this.uiCamera.setName) {
            this.uiCamera.setName('ui');
        }
        if (this.uiCamera.setScroll) {
            this.uiCamera.setScroll(0, 0);
        }
        this.uiCamera.roundPixels = true;
        this.uiCamera.transparent = true;
        if (this.uiCamera.setBackgroundColor) {
            this.uiCamera.setBackgroundColor({ r: 0, g: 0, b: 0, a: 0 });
        }
        this.addedToSceneHandler = (gameObject) => this.assignCameraFilter(gameObject);
        if (this.events?.on) {
            this.events.on('addedtoscene', this.addedToSceneHandler, this);
        }
        this.bindExistingCameraFilters();
    }

    bindExistingCameraFilters() {
        this.uiManager?.markAllUiObjects?.();
        const list = Array.isArray(this.children?.list) ? this.children.list : [];
        for (let i = 0; i < list.length; i++) {
            this.assignCameraFilter(list[i]);
        }
    }

    assignCameraFilter(gameObject) {
        if (!gameObject || !this.uiCamera || !this.cameras?.main) {
            return;
        }
        const main = this.cameras.main;
        const uiCamera = this.uiCamera;
        const worldCameras = [main, this.player2Camera].filter(Boolean);
        if (typeof gameObject.cameraFilter !== 'number') {
            if (gameObject.spaceChickenUi) {
                worldCameras.forEach((camera) => camera.ignore?.(gameObject));
            } else if (uiCamera.ignore) {
                uiCamera.ignore(gameObject);
            }
            return;
        }
        const uiId = typeof uiCamera.id === 'number' ? uiCamera.id : 2;
        let filter = gameObject.cameraFilter;
        if (gameObject.spaceChickenUi) {
            worldCameras.forEach((camera) => {
                if (typeof camera.id === 'number') {
                    filter |= camera.id;
                }
            });
            filter &= ~uiId;
        } else {
            filter |= uiId;
            worldCameras.forEach((camera) => {
                if (typeof camera.id === 'number') {
                    filter &= ~camera.id;
                }
            });
        }
        gameObject.cameraFilter = filter;
    }

    bringUiCameraToFront() {
        const list = this.cameras?.cameras;
        if (!Array.isArray(list) || !this.uiCamera) {
            return;
        }
        const index = list.indexOf(this.uiCamera);
        if (index >= 0 && index < list.length - 1) {
            list.splice(index, 1);
            list.push(this.uiCamera);
        }
    }

    layoutSplitCameras(width, height) {
        const layout = splitPanes(width, height);
        this.applyWorldPane(this.getMainCamera(), layout.panes[0]);
        this.applyWorldPane(this.player2Camera, layout.panes[1]);
        this.layoutSplitChrome(layout);
        this.uiManager?.setTouchControlsVisible?.(false);
    }

    applyWorldPane(camera, pane) {
        if (!camera || !pane) {
            return;
        }
        if (camera.setViewport) {
            camera.setViewport(pane.x, pane.y, pane.width, pane.height);
        }
        if (this.worldWidth && this.worldHeight && camera.setBounds) {
            camera.setBounds(0, 0, this.worldWidth, this.worldHeight);
        }
        camera.setZoom?.(paneZoom(pane, this.worldHeight));
        camera.setFollowOffset?.(0, 0);
        this.playCameraZoom = paneZoom(pane, this.worldHeight);
    }

    layoutSplitChrome(layout) {
        if (!this.add?.graphics || !layout) {
            return;
        }
        if (!this.splitDivider) {
            this.splitDivider = this.add.graphics();
            this.splitDivider.setScrollFactor?.(0);
            this.splitDivider.setDepth?.(GAME_CONSTANTS.OVERLAY_DEPTH - 3);
            this.uiManager?.markUi?.(this.splitDivider);
        }
        const width = this.getViewportWidth();
        const height = this.getViewportHeight();
        this.splitDivider.clear?.();
        this.splitDivider.fillStyle?.(0x07101c, 1);
        if (layout.sideBySide) {
            const x = layout.panes[0].width;
            this.splitDivider.fillRect?.(x, 0, SPLIT_GAP, height);
        } else {
            const y = layout.panes[0].height;
            this.splitDivider.fillRect?.(0, y, width, SPLIT_GAP);
        }
        this.layoutSplitLabels(layout);
    }

    layoutSplitLabels(layout) {
        if (!this.add?.text) {
            return;
        }
        if (!this.splitLabels) {
            this.splitLabels = [
                this.createSplitLabel('P1', '#ffe566'),
                this.createSplitLabel('P2', '#b7e4ff'),
            ];
        }
        this.splitLabels.forEach((label, index) => {
            const pane = layout.panes[index];
            if (!label || !pane) {
                return;
            }
            const labelWidth = label.displayWidth || 36;
            const labelHeight = label.displayHeight || 24;
            const x = layout.sideBySide
                ? index === 0
                    ? pane.x + pane.width - labelWidth - 12
                    : pane.x + 12
                : pane.x + 12;
            const y = layout.sideBySide ? pane.y + 10 : pane.y + pane.height - labelHeight - 14;
            label.setPosition?.(x, y);
        });
    }

    createSplitLabel(name, fill) {
        const label = this.add.text(0, 0, name, {
            fontFamily: 'Trebuchet MS, Courier New, monospace',
            fontSize: '16px',
            fill,
            backgroundColor: '#07101ccc',
            padding: { x: 8, y: 3 },
        });
        label.setScrollFactor?.(0);
        label.setDepth?.(GAME_CONSTANTS.OVERLAY_DEPTH);
        this.uiManager?.markUi?.(label);
        return label;
    }

    updateCameraForViewport() {
        const camera = this.getMainCamera();
        if (!camera) {
            return;
        }
        const insets = this.uiManager?.getSafeAreaInsets?.() || GAME_CONSTANTS.SAFE_AREA_FALLBACK;
        const metrics = this.viewport?.getLayoutMetrics?.(insets) || null;
        const width = metrics ? metrics.width : this.getViewportWidth();
        const height = metrics ? metrics.height : this.getViewportHeight();
        if (this.uiCamera) {
            if (this.uiCamera.setViewport) {
                this.uiCamera.setViewport(0, 0, width, height);
            } else if (this.uiCamera.setSize) {
                this.uiCamera.setSize(width, height);
            }
            if (this.uiCamera.setScroll) {
                this.uiCamera.setScroll(0, 0);
            }
        }
        if (this.player2Camera) {
            this.layoutSplitCameras(width, height);
            return;
        }
        if (this.worldWidth && this.worldHeight && camera.setBounds) {
            camera.setBounds(0, 0, this.worldWidth, this.worldHeight);
        }

        let zoom = 1;
        if (this.worldHeight > 0 && height > this.worldHeight) {
            zoom = height / this.worldHeight;
        }
        const minVisibleWidth = 360;
        if (zoom > 1 && width / zoom < minVisibleWidth) {
            zoom = width / minVisibleWidth;
        }
        zoom = Phaser.Math.Clamp(zoom, 1, 1.55);
        this.playCameraZoom = zoom;
        if (camera.setZoom) {
            camera.setZoom(zoom);
        }
        if (!camera.setFollowOffset) {
            return;
        }
        const touchEnabled = Boolean(this.uiManager?.touchControlsEnabled);
        if (touchEnabled && metrics) {
            const reserve = (metrics.controlSize + metrics.controlMargin * 2) / zoom;
            const ratio = metrics.isPortrait
                ? GAME_CONSTANTS.CAMERA_TOUCH_FOLLOW_OFFSET_RATIO
                : GAME_CONSTANTS.CAMERA_TOUCH_FOLLOW_OFFSET_LANDSCAPE_RATIO;
            camera.setFollowOffset(0, -reserve * ratio);
            return;
        }
        camera.setFollowOffset(0, 0);
    }

    decorateCrown() {
        if (!this.crown || !this.add?.image) {
            return;
        }
        this.crownGlow = this.add.image(this.crown.x, this.crown.y, 'particleSoft');
        this.crownGlow.setDepth(3);
        this.crownGlow.setScale(2.4);
        this.crownGlow.setTint(0xffe066);
        this.crownGlow.setAlpha(0.55);
        if (this.crownGlow.setBlendMode) {
            this.crownGlow.setBlendMode(Phaser.BlendModes.ADD);
        }
        if (this.tweens?.add) {
            this.tweens.add({
                targets: this.crownGlow,
                alpha: { from: 0.28, to: 0.8 },
                scale: { from: 1.9, to: 2.7 },
                duration: 900,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        }
        this.effectsManager?.startCrownIdle(this.crown);
    }

    startSession() {
        if (this.awaitingStart) {
            if (this.uiManager) {
                this.uiManager.showTitleScreen(this.levelConfig.title);
            }
            if (this.input?.on) {
                this.input.on('pointerup', this.onTitlePointerUp, this);
            }
            return;
        }
        this.beginPlay();
    }

    onTitlePointerUp(pointer) {
        if (
            this.uiManager?.raceSetupDialog?.open ||
            pointer?.event?.target?.closest?.('button, dialog')
        )
            return;
        if (!this.awaitingStart) {
            return;
        }
        if (this.inputController) {
            const controls = this.inputController.controls;
            const targets = this.inputController.fillPointerTargets(pointer, controls);
            if (
                targets.jump ||
                targets.left ||
                targets.right ||
                targets.music ||
                targets.leaderboard ||
                targets.name
            ) {
                return;
            }
        }
        this.beginPlay();
    }

    beginPlay() {
        if (this.hasStartedPlay) {
            return;
        }
        this.hasStartedPlay = true;
        const wasWaiting = this.awaitingStart;
        this.awaitingStart = false;
        this.input?.off?.('pointerup', this.onTitlePointerUp, this);
        this.startTime = performance.now();
        this.uiManager?.updatePlayerName?.(this.playerName);
        if (this.level === 1) {
            this.runElapsedMs = 0;
            this.runEligible = !this.debugMode && !this.coopMode;
            if (!this.debugMode) this.leaderboardManager.startRun(1);
            if (this.runEligible) this.fullRunToken = this.leaderboardManager.startRun(0);
        }
        if (this.uiManager) {
            this.uiManager.hideTitleScreen();
            this.uiManager.showLevelBanner(this.level, this.levelConfig.title);
            this.uiManager.scheduleInstructionFade();
        }
        if (!this.bombSpawnEvent) {
            this.spawnBomb();
        }
        if (wasWaiting) {
            this.audioManager?.playStartSound?.();
        }
        this.fadeCameraIn();
    }

    getMainCamera() {
        return this.cameras && this.cameras.main ? this.cameras.main : null;
    }

    forEachWorldCamera(apply) {
        const main = this.getMainCamera();
        if (main) {
            apply(main);
        }
        if (this.player2Camera) {
            apply(this.player2Camera);
        }
    }

    flashCamera(duration, red, green, blue) {
        this.forEachWorldCamera((camera) => camera.flash?.(duration, red, green, blue));
    }

    shakeCamera(duration, intensity) {
        this.forEachWorldCamera((camera) => camera.shake?.(duration, intensity));
    }

    fadeCameraIn() {
        this.forEachWorldCamera((camera) =>
            camera.fadeIn?.(GAME_CONSTANTS.CAMERA_FADE_IN, 0, 0, 0)
        );
    }

    fadeCameraOut(duration, red = 0, green = 0, blue = 0) {
        this.forEachWorldCamera((camera) => camera.fadeOut?.(duration, red, green, blue));
    }

    cameraFor(chicken) {
        if (chicken && chicken === this.player2) {
            return this.player2Camera || this.getMainCamera();
        }
        return this.getMainCamera();
    }

    playDeathJuice() {
        if (this.player) {
            this.player.setTint(0xff4a4a);
            if (this.effectsManager) {
                this.effectsManager.deathBurst(this.player.x, this.player.y);
            }
            this.player.setAlpha(0.35);
        }
        this.shakeCamera(
            GAME_CONSTANTS.CAMERA_SHAKE_DURATION,
            GAME_CONSTANTS.CAMERA_SHAKE_INTENSITY
        );
        this.flashCamera(GAME_CONSTANTS.CAMERA_FLASH_DEATH, 255, 48, 48);
    }

    playAdvanceJuice() {
        if (this.crown) {
            this.crown.disableBody?.(true, false);
            this.tweens?.add?.({
                targets: this.crown,
                y: this.crown.y - 70,
                alpha: 0,
                scale: 1.85,
                duration: 420,
                ease: 'Back.easeIn',
            });
        }
        if (this.crownGlow) {
            this.tweens?.add?.({
                targets: this.crownGlow,
                alpha: 0,
                scale: 4,
                duration: 360,
            });
        }
        if (this.effectsManager && this.crown) {
            this.effectsManager.collectBurst(this.crown.x, this.crown.y);
        }
        this.flashCamera(GAME_CONSTANTS.CAMERA_FLASH_COLLECT, 255, 220, 90);
        this.fadeCameraOut(GAME_CONSTANTS.LEVEL_TRANSITION_DELAY, 0, 0, 0);
    }

    playWinJuice() {
        const winner = this.raceWinner === 2 ? this.player2 : this.player;
        if (winner) {
            winner.setTint?.(0x7dff7d);
        }
        if (this.crown) {
            this.crown.disableBody?.(true, false);
            this.effectsManager?.collectBurst(this.crown.x, this.crown.y);
        }
        this.flashCamera(GAME_CONSTANTS.CAMERA_FLASH_COLLECT, 180, 255, 140);
        const camera = this.raceWinner === 2 ? this.cameraFor(this.player2) : this.getMainCamera();
        if (camera?.zoomTo) {
            camera.zoomTo(
                (this.playCameraZoom || 1) * GAME_CONSTANTS.CAMERA_WIN_ZOOM,
                GAME_CONSTANTS.CAMERA_WIN_ZOOM_DURATION
            );
        }
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
        if (this.sys?.game?.device?.input?.touch) {
            return true;
        }
        if (typeof navigator !== 'undefined') {
            if ((navigator.maxTouchPoints || navigator.msMaxTouchPoints || 0) > 0) {
                return true;
            }
        }
        if (typeof window === 'undefined') {
            return false;
        }
        if ('ontouchstart' in window) {
            return true;
        }
        try {
            if (window.matchMedia?.('(any-pointer: coarse)').matches) {
                return true;
            }
        } catch (_error) {
            // matchMedia throws in some browsers for unsupported queries
        }
        return Boolean(
            window.DocumentTouch &&
            typeof document !== 'undefined' &&
            document instanceof window.DocumentTouch
        );
    }

    createAnimations() {
        if (!this.anims.exists('chicken-idle')) {
            this.anims.create({
                key: 'chicken-idle',
                frames: [
                    { key: 'chicken_idle', duration: 600 },
                    { key: 'chicken_breathe', duration: 600 },
                    { key: 'chicken_idle', duration: 600 },
                    { key: 'chicken_breathe', duration: 600 },
                    { key: 'chicken_blink' },
                ],
                frameRate: 10,
                repeat: -1,
            });
        }
        if (!this.anims.exists('chicken-walk')) {
            this.anims.create({
                key: 'chicken-walk',
                frames: [
                    { key: 'chicken1' },
                    { key: 'chicken2' },
                    { key: 'chicken3' },
                    { key: 'chicken4' },
                ],
                frameRate: GAME_CONSTANTS.WALK_FRAME_RATE,
                repeat: -1,
            });
        }
        if (!this.anims.exists('chicken-jump')) {
            this.anims.create({
                key: 'chicken-jump',
                frames: [{ key: 'chicken_jump' }],
                frameRate: 1,
                repeat: 0,
            });
        }
        if (!this.anims.exists('chicken-fall')) {
            this.anims.create({
                key: 'chicken-fall',
                frames: [{ key: 'chicken_fall' }],
                frameRate: 1,
                repeat: 0,
            });
        }
        if (!this.anims.exists('chicken-jetpack')) {
            this.anims.create({
                key: 'chicken-jetpack',
                frames: [{ key: 'chicken_jetpack1' }, { key: 'chicken_jetpack2' }],
                frameRate: GAME_CONSTANTS.JETPACK_FRAME_RATE,
                repeat: -1,
            });
        }
    }

    attemptJump() {
        if (this.gameOver || this.jumpCount >= this.maxJumps) {
            return;
        }
        this.player.setVelocityY(GAME_CONSTANTS.JUMP_VELOCITY_Y);
        this.jumpCount += 1;
        if (this.effectsManager) {
            this.effectsManager.stretchPlayer(this.player);
        }
        if (this.jumpCount === 2) {
            this.isJetpacking = true;
            this.player.play('chicken-jetpack', true);
            this.audioManager.playJetpackSound();
        } else {
            this.isJetpacking = false;
            this.player.play('chicken-jump', true);
            this.audioManager.playJumpSound();
            if (this.effectsManager) {
                this.effectsManager.emitJumpPuff(this.player.x, this.player.y + 14);
            }
        }
    }

    collectGem(chicken) {
        if (this.awaitingStart || this.isTransitioning || this.gameOver || this.raceFinale) {
            return;
        }
        if (this.player2) {
            this.beginRaceFinale(chicken || this.player);
            return;
        }
        const levelTime = performance.now() - this.startTime;
        if (this.runEligible) this.runElapsedMs += levelTime;
        const previousBest = this.leaderboardManager.getPersonalBest(this.level);
        const playerName = this.leaderboardManager.ensurePlayerName(false);
        this.playerName = playerName;
        if (this.uiManager) {
            this.uiManager.updatePlayerName(playerName);
        }
        if (!this.debugMode) {
            this.leaderboardManager.saveTime(this.level, levelTime, playerName);
        }
        const resultTitle =
            !this.debugMode && (previousBest === null || levelTime < previousBest)
                ? 'NEW PERSONAL BEST'
                : `LEVEL ${this.level} COMPLETE`;
        this.audioManager.playCollectSound();

        if (this.levelConfig.nextLevel) {
            this.queueSceneStart({
                level: this.levelConfig.nextLevel,
                deathCount: this.deathCount,
                runElapsedMs: this.runElapsedMs,
                runEligible: this.runEligible,
                fullRunToken: this.fullRunToken,
                playerId: this.playerId,
            });
            this.uiManager?.showLevelResult?.(
                resultTitle,
                levelTime,
                this.leaderboardManager.lastSubmission
            );
            return;
        }

        this.uiManager?.showLevelResult?.(
            resultTitle,
            levelTime,
            this.leaderboardManager.lastSubmission
        );
        if (this.runEligible && this.deathCount === 0) {
            const fullRunTime = this.runElapsedMs;
            this.leaderboardManager.saveTime(0, fullRunTime, playerName);
            this.uiManager?.showFullRunResult?.(
                fullRunTime,
                this.leaderboardManager.lastSubmission
            );
        }
        this.completeRun(levelTime);
    }

    completeRun(finalTime) {
        this.finalTime = finalTime;
        this.gameOver = true;
        this.isTransitioning = true;
        this.restartDelayDone = false;
        this.time.delayedCall(GAME_CONSTANTS.RESTART_DELAY, () => {
            this.restartDelayDone = true;
        });
        this.stopActiveGameplay();
        this.playWinJuice();
        this.uiManager.showGameOver(this.finalTime);
    }

    resolveHazardContact(chicken, hazard) {
        if (this.awaitingStart || this.isTransitioning || this.gameOver || this.raceFinale) {
            return;
        }
        if (canBonkFromAbove(chicken, hazard, GAME_CONSTANTS.BONK_MIN_FALL_SPEED)) {
            this.boostFromBonk(chicken, hazard);
            return;
        }
        if (hazard?.bonkable && hazard.bonkLock) {
            return;
        }
        this.failFromHazard();
    }

    boostFromBonk(chicken, hazard) {
        if (!chicken || !hazard?.bonkable || hazard.bonkLock) {
            return;
        }
        hazard.bonkLock = true;
        chicken.setVelocityY?.(GAME_CONSTANTS.BONK_JUMP_VELOCITY_Y);
        if (chicken === this.player2) {
            this.player2JumpCount = 1;
        } else {
            this.jumpCount = 1;
            this.isJetpacking = false;
        }
        chicken.play?.('chicken-jump', true);
        this.effectsManager?.stretchPlayer?.(chicken);
        this.effectsManager?.emitJumpPuff?.(chicken.x, chicken.y + 14);
        this.audioManager?.playJumpSound?.();
        this.cameraFor(chicken)?.shake?.(90, 0.005);
        this.showBonk(hazard.x, hazard.y - 8, 28);
        this.squashBonkTarget(hazard);
    }

    squashBonkTarget(hazard) {
        const motion = this.tweens?.getTweensOf?.(hazard) || [];
        motion.forEach((tween) => tween.pause?.());
        const scaleX = hazard.bonkScaleX ?? hazard.scaleX ?? 1;
        const scaleY = hazard.bonkScaleY ?? hazard.scaleY ?? 1;
        this.tweens?.add?.({
            targets: hazard,
            scaleX: scaleX * 1.28,
            scaleY: scaleY * 0.62,
            duration: 80,
            yoyo: true,
            onComplete: () => hazard.setScale?.(scaleX, scaleY),
        });
        this.time?.delayedCall?.(GAME_CONSTANTS.BONK_STUN_MS, () => {
            hazard.bonkLock = false;
            motion.forEach((tween) => tween.resume?.());
        });
    }

    wireBoarders(chicken) {
        if (!chicken || !this.boardersGroup) {
            return;
        }
        this.physics.add.overlap(chicken, this.boardersGroup, this.touchBoarder, null, this);
    }

    setupPhaser() {
        if (!this.levelConfig?.phaser) {
            return;
        }
        this.phaserBolts = this.physics.add.group({
            allowGravity: false,
            maxSize: GAME_CONSTANTS.PHASER_POOL_SIZE,
        });
        this.attachPhaserSprite(this.player);
        if (this.boardersGroup) {
            this.physics.add.overlap(
                this.phaserBolts,
                this.boardersGroup,
                this.phaserHitsBoarder,
                null,
                this
            );
        }
    }

    attachPhaserSprite(chicken) {
        if (!this.levelConfig?.phaser || !chicken || chicken.phaserSprite) {
            return;
        }
        const gun = this.add.sprite(chicken.x, chicken.y, 'spacePhaser');
        gun.setDepth(6);
        chicken.phaserSprite = gun;
    }

    updatePhaserSprites() {
        const chickens = [this.player, this.player2];
        for (let i = 0; i < chickens.length; i++) {
            const chicken = chickens[i];
            const gun = chicken?.phaserSprite;
            if (!gun) {
                continue;
            }
            const dir = chicken.flipX ? -1 : 1;
            gun.setPosition(chicken.x + dir * 16, chicken.y + 2);
            gun.setFlipX(dir < 0);
            gun.setVisible(chicken.active !== false && chicken.visible !== false);
        }
    }

    updateCombat(inputState) {
        const now = this.getGameTime();
        if (this.levelConfig?.phaser) {
            if (inputState?.phaserHeld) {
                this.tryFirePhaser(this.player, now);
            }
            if (this.player2WantsPhaser()) {
                this.tryFirePhaser(this.player2, now);
            }
            this.stepPhaserBolts();
        }
        this.updateBoarders();
    }

    player2WantsPhaser() {
        if (!this.player2?.active) {
            return false;
        }
        const usePad = this.coopMode !== 'keyboard';
        if (!usePad) {
            return Boolean(this.player2PhaserKey?.isDown);
        }
        const pad = this.inputController.getGamepad?.(
            this.coopMode === 'keyboard-controller' ? 0 : 1
        );
        return Boolean(pad?.buttons?.[2]?.pressed);
    }

    tryFirePhaser(chicken, now) {
        if (!chicken?.active || chicken.body?.enable === false || !this.phaserBolts) {
            return;
        }
        if (now - (chicken.lastPhaserAt || 0) < GAME_CONSTANTS.PHASER_COOLDOWN_MS) {
            return;
        }
        const group = this.phaserBolts;
        let bolt = group.getFirstDead?.(false) || null;
        if (!bolt) {
            if ((group.getLength?.() || 0) >= GAME_CONSTANTS.PHASER_POOL_SIZE) {
                return;
            }
            bolt = group.create(chicken.x, chicken.y, 'phaserBolt');
        }
        if (!bolt) {
            return;
        }
        const dir = chicken.flipX ? -1 : 1;
        chicken.lastPhaserAt = now;
        bolt.setActive?.(true);
        bolt.setVisible?.(true);
        bolt.setDepth?.(8);
        if (bolt.enableBody) {
            bolt.enableBody(true, chicken.x + dir * 22, chicken.y + 2, true, true);
        } else if (bolt.body) {
            bolt.body.enable = true;
            bolt.body.reset?.(chicken.x + dir * 22, chicken.y + 2);
        }
        if (bolt.body) {
            bolt.body.allowGravity = false;
            bolt.body.setAllowGravity?.(false);
        }
        bolt.setVelocity?.(dir * GAME_CONSTANTS.PHASER_BOLT_SPEED, 0);
        bolt.bornX = bolt.x;
        bolt.setFlipX?.(dir < 0);
        this.audioManager?.playPhaserSound?.();
    }

    stepPhaserBolts() {
        const bolts = this.phaserBolts?.getChildren?.() || [];
        for (let i = 0; i < bolts.length; i++) {
            const bolt = bolts[i];
            if (!bolt?.active) {
                continue;
            }
            const traveled = Math.abs(bolt.x - (bolt.bornX ?? bolt.x));
            if (
                traveled > GAME_CONSTANTS.PHASER_RANGE ||
                bolt.x < -20 ||
                bolt.x > this.worldWidth + 20
            ) {
                this.recycleBolt(bolt);
            }
        }
    }

    recycleBolt(bolt) {
        if (!bolt) {
            return;
        }
        if (this.phaserBolts?.killAndHide) {
            this.phaserBolts.killAndHide(bolt);
        } else {
            bolt.setActive?.(false);
            bolt.setVisible?.(false);
        }
        if (bolt.body) {
            bolt.body.stop?.();
            bolt.body.enable = false;
        }
    }

    phaserHitsBoarder(bolt, alien) {
        this.recycleBolt(bolt);
        this.defeatBoarder(alien);
    }

    defeatBoarder(alien) {
        if (!alien?.active || alien.defeated) {
            return;
        }
        alien.defeated = true;
        if (alien.body) {
            alien.body.enable = false;
        }
        alien.setVelocity?.(0, 0);
        this.audioManager?.playBoarderPop?.();
        this.effectsManager?.emitJumpPuff?.(alien.x, alien.y);
        this.tweens?.add?.({
            targets: alien,
            alpha: 0,
            duration: 140,
            onComplete: () => {
                alien.setActive?.(false);
                alien.setVisible?.(false);
            },
        });
    }

    touchBoarder() {
        if (this.getGameTime() < (this.boarderGraceUntil || 0)) {
            return;
        }
        this.failFromHazard();
    }

    updateBoarders() {
        const aliens = this.boardersGroup?.getChildren?.() || [];
        if (!aliens.length) {
            return;
        }
        const targets = [this.player, this.player2].filter(
            (chicken) => chicken?.active && chicken.body?.enable !== false
        );
        const options = {
            speed: GAME_CONSTANTS.BOARDER_SPEED,
            hopVelocity: GAME_CONSTANTS.BOARDER_HOP_VELOCITY_Y,
            hopRange: GAME_CONSTANTS.BOARDER_HOP_RANGE_X,
            hopClearance: GAME_CONSTANTS.BOARDER_HOP_CLEARANCE,
            aggroX: GAME_CONSTANTS.BOARDER_AGGRO_X,
            aggroY: GAME_CONSTANTS.BOARDER_AGGRO_Y,
        };
        const allies = [];
        for (let i = 0; i < aliens.length; i++) {
            const alien = aliens[i];
            if (alien?.active && !alien.defeated) {
                allies.push(alien);
            }
        }
        for (let i = 0; i < aliens.length; i++) {
            const alien = aliens[i];
            if (!alien?.active || alien.defeated) {
                continue;
            }
            if (alien.y > this.killZoneFallY) {
                this.defeatBoarder(alien);
                continue;
            }
            const homeX = alien.homeX ?? alien.x;
            const homeY = alien.homeY ?? alien.y;
            let target = null;
            let best = Infinity;
            for (let t = 0; t < targets.length; t++) {
                const chicken = targets[t];
                const dist = Math.abs(chicken.x - homeX) + Math.abs(chicken.y - homeY);
                if (dist < best) {
                    best = dist;
                    target = chicken;
                }
            }
            const grounded = Boolean(alien.body?.blocked?.down || alien.body?.touching?.down);
            const targetGrounded = Boolean(
                target && (target.body?.blocked?.down || target.body?.touching?.down)
            );
            const steer = boarderSteering(
                alien.x,
                alien.y,
                target ? target.x : homeX,
                target ? target.y : homeY,
                grounded,
                {
                    ...options,
                    homeX,
                    homeY,
                    targetGrounded,
                }
            );
            const others = [];
            for (let a = 0; a < allies.length; a++) {
                if (allies[a] !== alien) {
                    others.push(allies[a]);
                }
            }
            const yields = boarderYields(
                alien.x,
                alien.y,
                steer.goalX,
                others,
                GAME_CONSTANTS.BOARDER_SEPARATION
            );
            alien.setVelocityX?.(yields ? 0 : steer.velocityX);
            if (!yields && steer.velocityY != null) {
                alien.setVelocityY?.(steer.velocityY);
            }
            if (steer.flipX != null) {
                alien.setFlipX?.(steer.flipX);
            }
        }
    }

    haltBoarders() {
        const aliens = this.boardersGroup?.getChildren?.() || [];
        for (let i = 0; i < aliens.length; i++) {
            const alien = aliens[i];
            if (!alien?.active || alien.defeated) {
                continue;
            }
            alien.setVelocity?.(0, 0);
        }
    }

    resetBoarders() {
        const aliens = this.boardersGroup?.getChildren?.() || [];
        for (let i = 0; i < aliens.length; i++) {
            const alien = aliens[i];
            if (!alien || alien.defeated) {
                continue;
            }
            const x = alien.homeX;
            const y = alien.homeY;
            if (x == null || y == null) {
                continue;
            }
            if (alien.body?.reset) {
                alien.body.reset(x, y);
            }
            alien.x = x;
            alien.y = y;
            alien.setVelocity?.(0, 0);
        }
    }

    failFromHazard() {
        if (this.awaitingStart || this.isTransitioning || this.gameOver) {
            return;
        }
        this.audioManager.playHazardHitSound();
        this.restartLevel();
    }

    hitHazard() {
        this.failFromHazard();
    }

    hitKillZone() {
        this.failFromHazard();
    }

    hitBomb(_bomb, _player) {
        this.failFromHazard();
    }

    restartLevel() {
        if (this.isTransitioning || this.gameOver) {
            return;
        }
        this.beginDeathReset();
    }

    beginDeathReset() {
        this.isTransitioning = true;
        this.deathCount += 1;
        this.runEligible = false;
        this.haltBoarders();
        if (this.player?.body) {
            this.player.body.enable = false;
        }
        this.clearBombSpawns();
        this.effectsManager?.stopPlayerScaleTween?.();
        this.playDeathJuice();
        this.uiManager?.updateDeathCount?.(this.deathCount);
        if (this.deathResetEvent?.remove) {
            this.deathResetEvent.remove(false);
        }
        this.deathResetEvent = null;
        if (this.deathResetWall) {
            window.clearTimeout(this.deathResetWall);
            this.deathResetWall = null;
        }
        const delay = GAME_CONSTANTS.DEATH_TRANSITION_DELAY;
        if (this.time?.delayedCall) {
            this.deathResetEvent = this.time.delayedCall(delay, () => this.respawnPlayer());
        }
        if (typeof window !== 'undefined' && typeof window.setTimeout === 'function') {
            this.deathResetWall = window.setTimeout(() => this.respawnPlayer(), delay);
        }
    }

    respawnPlayer() {
        if (!this.isTransitioning || this.hasCleanedUp || this.gameOver) {
            return;
        }
        if (this.deathResetEvent?.remove) {
            this.deathResetEvent.remove(false);
        }
        this.deathResetEvent = null;
        if (this.deathResetWall) {
            window.clearTimeout(this.deathResetWall);
            this.deathResetWall = null;
        }
        this.resetBoarders();
        this.boarderGraceUntil = this.getGameTime() + GAME_CONSTANTS.BOARDER_GRACE_MS;
        const start = this.levelCheckpoint || this.levelConfig.playerStart;
        const player = this.player;
        if (player) {
            if (player.enableBody) {
                player.enableBody(true, start.x, start.y, true, true);
            } else {
                player.x = start.x;
                player.y = start.y;
                if (player.body) {
                    player.body.enable = true;
                    player.body.reset?.(start.x, start.y);
                }
            }
            player.body?.stop?.();
            player.clearTint?.();
            player.setAlpha?.(1);
            player.setScale?.(1);
            this.effectsManager?.keepPlayerBodyStable?.(player);
            player.play?.('chicken-walk', true);
        }
        if (this.player2) {
            const secondStart = { x: start.x + 42, y: start.y };
            this.player2.enableBody?.(true, secondStart.x, secondStart.y, true, true);
            this.player2.body?.reset?.(secondStart.x, secondStart.y);
            this.player2.body?.stop?.();
            this.player2.clearTint?.();
            this.player2.setAlpha?.(1);
            this.player2.setScale?.(1);
            this.player2JumpCount = 0;
            this.player2.play?.('chicken-idle', true);
        }
        this.jumpCount = 0;
        this.isJetpacking = false;
        this.jumpRequested = false;
        this.jumpPointerId = null;
        this.wasGrounded = false;
        this.airborneSince = 0;
        this.maxAirSpeedY = 0;
        this.startTime = performance.now();
        if (this.uiManager) {
            this.uiManager.lastTimerDisplay = '';
            this.uiManager.updateTimer(0);
        }
        const camera = this.getMainCamera();
        camera?.resetFX?.();
        camera?.centerOn?.(start.x, start.y);
        this.spawnBomb();
        this.isTransitioning = false;
    }

    queueSceneStart(data) {
        if (this.isTransitioning) {
            return;
        }
        this.isTransitioning = true;
        this.pendingSceneData = data;
        if (this.player?.body) {
            this.player.body.enable = false;
        }
        this.stopActiveGameplay({ pausePhysics: false });
        this.playAdvanceJuice();
        this.time.delayedCall(Math.max(3200, GAME_CONSTANTS.LEVEL_TRANSITION_DELAY), () => {
            const nextSceneData = this.pendingSceneData;
            this.pendingSceneData = null;
            this.scene.start(this.scene.key, nextSceneData);
        });
    }

    clearBombSpawns() {
        if (this.bombSpawnEvent) {
            this.bombSpawnEvent.remove(false);
            this.bombSpawnEvent = null;
        }
        this.recycleAllBombs();
    }

    stopActiveGameplay(options = {}) {
        const pausePhysics = options.pausePhysics !== false;
        this.clearBombSpawns();
        this.worldBuilder?.clearHazardTimers();
        this.effectsManager?.stopCrownIdle();
        this.tweens?.killAll();

        if (pausePhysics && this.physics?.world) {
            this.physics.pause();
        }
    }

    spawnBomb() {
        const bombSettings = this.levelConfig.bombs;
        const x = Phaser.Math.Between(-50, this.worldWidth + 50);
        const y = bombSettings.spawnHeight;
        const bomb = this.acquireBomb(x, y);
        if (bomb) {
            bomb.setGravityY(bombSettings.gravityY);

            const targetY = this.player.y;
            let angle = Phaser.Math.Angle.Between(x, y, this.player.x, targetY);
            const randomOffset = Phaser.Math.FloatBetween(
                -bombSettings.spread,
                bombSettings.spread
            );
            angle += randomOffset;

            const speed = bombSettings.speed;
            bomb.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            bomb.setAngularVelocity?.(Phaser.Math.Between(-240, 240));
        }

        const delay = Phaser.Math.Between(bombSettings.delayMin, bombSettings.delayMax);
        if (this.bombSpawnEvent) {
            this.bombSpawnEvent.remove(false);
        }
        this.bombSpawnEvent = this.time.delayedCall(delay, () => this.spawnBomb(), [], this);
    }

    acquireBomb(x, y) {
        if (!this.bombs) {
            return null;
        }
        const bomb = this.bombs.get
            ? this.bombs.get(x, y, 'bomb')
            : this.bombs.create(x, y, 'bomb');
        if (!bomb) {
            return null;
        }
        bomb.setActive?.(true);
        bomb.setVisible?.(true);
        if (!bomb.testMeta) {
            this.bombTestCounter += 1;
            bomb.testMeta = {
                id: `bomb-${this.bombTestCounter}`,
                kind: 'hazard',
                type: 'bomb',
            };
        }
        if (bomb.enableBody) {
            bomb.enableBody(true, x, y, true, true);
        } else if (bomb.body) {
            bomb.body.enable = true;
            if (bomb.body.reset) {
                bomb.body.reset(x, y);
            } else {
                bomb.x = x;
                bomb.y = y;
            }
        }
        return bomb;
    }

    recycleBomb(bomb) {
        if (!bomb) {
            return;
        }
        if (this.bombs?.killAndHide) {
            this.bombs.killAndHide(bomb);
        } else {
            bomb.setActive?.(false);
            bomb.setVisible?.(false);
        }
        if (bomb.body) {
            bomb.body.stop?.();
            bomb.body.enable = false;
        }
    }

    recycleAllBombs() {
        if (!this.bombs) {
            return;
        }
        const children =
            this.bombs.children && Array.isArray(this.bombs.children.entries)
                ? this.bombs.children.entries
                : [];
        for (let i = 0; i < children.length; i++) {
            const bomb = children[i];
            if (bomb && bomb.active !== false) {
                this.recycleBomb(bomb);
            }
        }
    }

    update(_time, delta) {
        this.backgroundRenderer?.syncToCamera?.();
        this.updatePhaserSprites();
        const inputState = this.handleInput();
        if (this.gameOver) this.effectsManager?.stepParticles?.(delta);

        if (inputState.gamepadStartJustPressed && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('space-chicken-gamepad-start'));
        }

        if (this.muteKey && Phaser.Input.Keyboard.JustDown(this.muteKey)) {
            this.audioManager.toggleMusicMute();
        }
        if (this.debugSkipKey && Phaser.Input.Keyboard.JustDown(this.debugSkipKey)) {
            this.debugSkipLevel();
            return;
        }

        if (this.uiManager?.handleMenuInput?.(inputState)) return;

        this.offerCoop(inputState);

        if (this.awaitingStart) {
            this.updateTitleScreen(inputState);
            return;
        }

        if (this.gameOver) {
            if (
                this.restartDelayDone &&
                this.retryKey &&
                Phaser.Input.Keyboard.JustDown(this.retryKey)
            ) {
                this.scene.restart({
                    level: this.level,
                    deathCount: 0,
                    coopMode: this.coopMode,
                });
                return;
            }
            if (this.restartDelayDone && (inputState.spaceJustPressed || this.jumpRequested)) {
                this.jumpRequested = false;
                this.scene.restart({ level: 1, deathCount: 0, coopMode: this.coopMode });
            } else {
                this.jumpRequested = false;
            }
            return;
        }

        if (this.isTransitioning) {
            this.jumpRequested = false;
            if (this.raceFinale) {
                this.effectsManager?.stepParticles?.(delta);
            }
            return;
        }

        if (this.physics.world.isPaused) {
            this.jumpRequested = false;
            return;
        }

        this.uiManager.updateTimer(performance.now() - this.startTime);

        const isGrounded = this.updateGroundedState();
        const jumpTriggered = this.isJumpInput(inputState);
        this.jumpRequested = false;
        if (jumpTriggered) {
            this.attemptJump();
        }

        this.updatePlayerMovement();
        this.updatePlayerAnimation(isGrounded);
        this.updateLevelCheckpoint();
        if (this.player2) {
            this.updatePlayer2(inputState);
        }
        if (this.effectsManager) {
            this.effectsManager.update(this.player, isGrounded, this.isJetpacking, delta);
        }

        if (this.player.y > this.killZoneFallY) {
            this.hitKillZone();
        }

        this.updateCombat(inputState);
        this.syncBonkMarkers();
        this.cleanupOffscreenBombs();
    }

    syncBonkMarkers() {
        const children = this.dynamicHazardsGroup?.getChildren?.();
        if (!children) {
            return;
        }
        const wave = Math.sin(this.getGameTime() / 160);
        for (let i = 0; i < children.length; i++) {
            const hazard = children[i];
            const marker = hazard?.bonkMarker;
            if (!marker?.setPosition) {
                continue;
            }
            const lift = hazard.bonkMarkerLift || 28;
            marker.setPosition(hazard.x, hazard.y - lift + wave * 5);
            marker.setScale?.(1 + (wave + 1) * 0.05);
            const show = hazard.active !== false && hazard.visible !== false && !hazard.bonkLock;
            if (marker.visible !== show) {
                marker.setVisible?.(show);
            }
        }
    }

    updateGroundedState() {
        const body = this.player.body;
        const isGrounded = Boolean(body.blocked.down || body.touching.down);
        const now = this.getGameTime();
        if (!isGrounded) {
            if (this.airborneSince === 0) {
                this.airborneSince = now;
            }
            const velocityY = body.velocity ? body.velocity.y : 0;
            if (velocityY > this.maxAirSpeedY) {
                this.maxAirSpeedY = velocityY;
            }
        } else {
            if (!this.wasGrounded && this.shouldPlayLandingFx(now)) {
                this.onPlayerLanded();
            }
            this.airborneSince = 0;
            this.maxAirSpeedY = 0;
        }
        this.wasGrounded = isGrounded;
        if (isGrounded) {
            this.jumpCount = 0;
            this.isJetpacking = false;
        }
        return isGrounded;
    }

    getGameTime() {
        return this.time?.now > 0 ? this.time.now : performance.now();
    }

    updateLevelCheckpoint() {
        if (this.level !== 4 || !this.player || this.isTransitioning) return;
        const furthestX = Math.max(this.player.x, this.player2?.x || 0);
        const checkpoints = [
            { trigger: 950, x: 1000, y: 500, label: 'CRATER GATE SECURED' },
            { trigger: 1780, x: 1840, y: 370, label: 'SUMMIT APPROACH SECURED' },
        ];
        const next = checkpoints.find(
            (checkpoint) =>
                furthestX >= checkpoint.trigger &&
                (!this.levelCheckpoint || checkpoint.trigger > this.levelCheckpoint.trigger)
        );
        if (!next) return;
        this.levelCheckpoint = next;
        this.uiManager?.showLevelBanner?.('CHECKPOINT', next.label);
        this.audioManager?.playCollectSound?.();
    }

    shouldPlayLandingFx(now) {
        const airMs = this.airborneSince ? now - this.airborneSince : 0;
        if (airMs < GAME_CONSTANTS.LAND_MIN_AIR_MS) {
            return false;
        }
        return this.jumpCount > 0 || this.maxAirSpeedY >= GAME_CONSTANTS.LAND_MIN_SPEED_Y;
    }

    updateTitleScreen(inputState) {
        this.uiManager?.updateGamepadStatus?.();
        const startTriggered = this.isJumpInput(inputState) || inputState.pointerStartTriggered;
        this.jumpRequested = false;
        if (this.player && this.player.body) {
            const isGrounded = this.updateGroundedState();
            this.updatePlayerAnimation(isGrounded);
        }
        if (startTriggered) {
            this.beginPlay();
        }
    }

    isJumpInput(inputState) {
        return Boolean(
            (this.coopMode !== 'keyboard' && inputState.upJustPressed) ||
            inputState.spaceJustPressed ||
            inputState.wJustPressed ||
            inputState.gamepadJumpJustPressed ||
            inputState.pointerJumpTriggered ||
            inputState.doubleTapJumpTriggered ||
            this.jumpRequested
        );
    }

    offerCoop(inputState) {
        if (!inputState?.coopMode || this.player2 || this.gameOver || this.isTransitioning) {
            return;
        }
        this.coopMode = inputState.coopMode;
        this.runEligible = false;
        this.enableCoopMode();
        if (this.hasStartedPlay) {
            this.uiManager?.showLevelBanner?.('SPLIT SCREEN', 'First to the crown wins');
        }
    }

    enableCoopMode() {
        if (this.player2 || !this.coopMode || !this.platforms) return;
        const start = this.levelConfig.playerStart;
        this.player2 = this.physics.add.sprite(start.x + 42, start.y, 'chicken2');
        this.player2.setBounce(GAME_CONSTANTS.PLAYER_BOUNCE);
        this.player2.setCollideWorldBounds(false);
        this.player2.setDepth(5);
        this.player2.setTint?.(0x9fd4ff);
        this.physics.add.collider(this.player2, this.platforms);
        if (this.movingPlatforms) this.physics.add.collider(this.player2, this.movingPlatforms);
        this.physics.add.overlap(this.player2, this.hazards, this.resolveHazardContact, null, this);
        if (this.dynamicHazardsGroup) {
            this.physics.add.overlap(
                this.player2,
                this.dynamicHazardsGroup,
                this.resolveHazardContact,
                null,
                this
            );
        }
        this.physics.add.overlap(
            this.player2,
            this.crown,
            (chicken) => this.collectGem(chicken),
            null,
            this
        );
        this.physics.add.overlap(
            this.player2,
            this.killZone,
            () => this.failFromHazard(),
            null,
            this
        );
        this.physics.add.overlap(this.player2, this.bombs, this.failFromHazard, null, this);
        this.wireBoarders(this.player2);
        this.attachPhaserSprite(this.player2);
        this.enableSplitCamera();
    }

    enableSplitCamera() {
        if (this.player2Camera || !this.player2 || !this.cameras?.add) {
            return;
        }
        const width = this.getViewportWidth();
        const height = this.getViewportHeight();
        const pane = splitPanes(width, height).panes[1];
        this.player2Camera = this.cameras.add(
            pane.x,
            pane.y,
            pane.width,
            pane.height,
            false,
            'player2'
        );
        this.player2Camera.roundPixels = true;
        this.player2Camera.startFollow?.(
            this.player2,
            true,
            GAME_CONSTANTS.CAMERA_LERP_X,
            GAME_CONSTANTS.CAMERA_LERP_Y
        );
        this.player2Camera.setBounds?.(0, 0, this.worldWidth, this.worldHeight);
        this.bringUiCameraToFront();
        this.bindExistingCameraFilters();
        this.updateCameraForViewport();
    }

    beginRaceFinale(winner) {
        if (this.raceFinale || this.isTransitioning || this.gameOver) {
            return;
        }
        const finisher = winner === this.player2 ? this.player2 : this.player;
        const loser = finisher === this.player2 ? this.player : this.player2;
        this.raceFinale = true;
        this.raceWinner = finisher === this.player2 ? 2 : 1;
        this.raceLevelTime = Math.max(0, performance.now() - this.startTime);
        this.isTransitioning = true;
        this.runEligible = false;
        this.clearBombSpawns();
        finisher?.setVelocity?.(0, -150);
        finisher?.setTint?.(0xb6ff9a);
        this.cameraFor(finisher)?.flash?.(240, 255, 214, 90);
        this.audioManager?.playCollectSound?.();
        this.effectsManager?.collectBurst?.(
            this.crown?.x ?? finisher?.x,
            this.crown?.y ?? finisher?.y
        );
        this.uiManager?.showRaceBanner?.(this.raceWinner);
        this.launchConsolationBomb(loser);
        if (this.time?.delayedCall) {
            this.raceFinaleEvent = this.time.delayedCall(GAME_CONSTANTS.RACE_FINALE_MS, () =>
                this.concludeRace()
            );
        }
    }

    launchConsolationBomb(loser) {
        if (!loser) {
            return;
        }
        const camera = this.cameraFor(loser);
        const dropY = Math.max(24, loser.y - 210);
        if (!this.add?.image || !this.tweens?.add) {
            this.knockOutChicken(loser, camera);
            return;
        }
        const bomb = this.add.image(loser.x, dropY, 'bomb');
        bomb.setDepth?.(40);
        bomb.setScale?.(2.3);
        this.assignCameraFilter?.(bomb);
        this.tweens.add({
            targets: bomb,
            y: loser.y,
            angle: 640,
            scale: 3,
            duration: 560,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                bomb.destroy?.();
                this.knockOutChicken(loser, camera);
            },
        });
    }

    knockOutChicken(loser, camera) {
        if (!loser) {
            return;
        }
        const x = loser.x;
        const y = loser.y;
        this.effectsManager?.deathBurst?.(x, y);
        camera?.shake?.(520, 0.03);
        camera?.flash?.(280, 255, 176, 48);
        loser.setTint?.(0xffd27a);
        const shove = x > this.worldWidth * 0.5 ? -240 : 240;
        loser.body && (loser.body.enable = true);
        loser.setVelocity?.(shove, -540);
        loser.setAngularVelocity?.(shove > 0 ? 420 : -420);
        loser.setBounce?.(0.9);
        this.tweens?.add?.({
            targets: loser,
            angle: shove > 0 ? 720 : -720,
            duration: 900,
            ease: 'Cubic.easeOut',
        });
        this.showBonk(x, y);
        this.audioManager?.playHazardHitSound?.();
    }

    showBonk(x, y, size = 42) {
        if (!this.add?.text) {
            return;
        }
        const bonk = this.add.text(x, y - 28, 'BONK!', {
            fontFamily: 'Trebuchet MS, Courier New, monospace',
            fontSize: `${size}px`,
            fontStyle: 'bold',
            fill: '#ffe566',
            stroke: '#3a1408',
            strokeThickness: 6,
        });
        bonk.setOrigin?.(0.5);
        bonk.setDepth?.(50);
        this.assignCameraFilter?.(bonk);
        this.tweens?.add?.({
            targets: bonk,
            y: y - 76,
            scale: 1.25,
            duration: 260,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens?.add?.({
                    targets: bonk,
                    alpha: 0,
                    delay: 520,
                    duration: 240,
                    onComplete: () => bonk.destroy?.(),
                });
            },
        });
    }

    concludeRace() {
        if (this.hasCleanedUp || this.gameOver || this.raceConcluded) {
            return;
        }
        this.raceConcluded = true;
        this.clearBombSpawns();
        this.worldBuilder?.clearHazardTimers?.();
        if (this.levelConfig?.nextLevel) {
            this.pendingSceneData = {
                level: this.levelConfig.nextLevel,
                deathCount: this.deathCount,
                runElapsedMs: this.runElapsedMs,
                runEligible: false,
                fullRunToken: this.fullRunToken,
                playerId: this.playerId,
                coopMode: this.coopMode,
            };
            this.playAdvanceJuice();
            const startNext = () => {
                const nextSceneData = this.pendingSceneData;
                this.pendingSceneData = null;
                this.scene?.start?.(this.scene.key, nextSceneData);
            };
            if (this.time?.delayedCall) {
                this.time.delayedCall(
                    Math.max(900, GAME_CONSTANTS.LEVEL_TRANSITION_DELAY),
                    startNext
                );
            } else {
                startNext();
            }
            return;
        }
        this.completeRun(this.raceLevelTime || 0);
    }

    // eslint-disable-next-line complexity
    updatePlayer2(_inputState) {
        const pad = this.inputController.getGamepad?.(
            this.coopMode === 'keyboard-controller' ? 0 : 1
        );
        const usePad = this.coopMode !== 'keyboard';
        const axis = usePad && Math.abs(pad?.axes?.[0] || 0) >= 0.22 ? pad.axes[0] : 0;
        const left =
            (this.player2Keys.left.isDown && !usePad) ||
            (usePad && ((pad?.buttons?.[14]?.pressed ?? false) || axis < -0.22));
        const right =
            (this.player2Keys.right.isDown && !usePad) ||
            (usePad && ((pad?.buttons?.[15]?.pressed ?? false) || axis > 0.22));
        this.player2.setVelocityX(
            (right ? 1 : 0) * GAME_CONSTANTS.PLAYER_VELOCITY_X -
                (left ? 1 : 0) * GAME_CONSTANTS.PLAYER_VELOCITY_X
        );
        const upJump =
            !usePad && this.cursors?.up && Phaser.Input.Keyboard.JustDown(this.cursors.up);
        if (
            upJump ||
            (this.player2Keys.jump.justDown && !usePad) ||
            (usePad && this.inputController.gamepadJumpEdges?.[1])
        )
            this.attemptPlayer2Jump();
        if (this.player2.y > this.killZoneFallY) this.failFromHazard();
        const grounded = Boolean(this.player2.body.blocked.down || this.player2.body.touching.down);
        if (grounded) this.player2JumpCount = 0;
        this.updateChickenAnimation(this.player2, grounded, false);
        this.player2.setFlipX?.(left);
    }

    attemptPlayer2Jump() {
        if (this.player2JumpCount >= this.maxJumps) return;
        this.player2.setVelocityY(GAME_CONSTANTS.JUMP_VELOCITY_Y);
        this.player2JumpCount += 1;
        this.effectsManager?.stretchPlayer(this.player2);
        this.effectsManager?.emitJumpPuff(this.player2.x, this.player2.y + 14);
        this.audioManager?.playJumpSound?.();
    }

    onPlayerLanded() {
        if (!this.player) {
            return;
        }
        if (this.effectsManager) {
            this.effectsManager.squashPlayer(this.player);
            this.effectsManager.emitDust(this.player.x, this.player.y + 14);
        }
        this.audioManager?.playLandSound?.();
    }

    updatePlayerMovement() {
        let velocityX = 0;
        const keyboardEnabled = this.coopMode !== 'controllers';
        const arrowsEnabled = this.coopMode !== 'keyboard';
        if (
            (keyboardEnabled &&
                ((arrowsEnabled && this.cursors.left.isDown) || this.wasd.A.isDown)) ||
            this.leftPressed
        ) {
            velocityX -= GAME_CONSTANTS.PLAYER_VELOCITY_X;
        }
        if (
            (keyboardEnabled &&
                ((arrowsEnabled && this.cursors.right.isDown) || this.wasd.D.isDown)) ||
            this.rightPressed
        ) {
            velocityX += GAME_CONSTANTS.PLAYER_VELOCITY_X;
        }
        this.player.setVelocityX(velocityX);
        if (velocityX < 0) {
            this.player.setFlipX?.(true);
        } else if (velocityX > 0) {
            this.player.setFlipX?.(false);
        }

        const halfWidth = this.player.displayWidth * GAME_CONSTANTS.PLAYER_CLAMP_OFFSET;
        const minX = halfWidth;
        const maxX = this.worldWidth - halfWidth;
        const clampedX = Phaser.Math.Clamp(this.player.x, minX, maxX);
        if (clampedX !== this.player.x) {
            this.player.x = clampedX;
            this.player.setVelocityX(0);
        }
    }

    updatePlayerAnimation(isGrounded) {
        this.updateChickenAnimation(
            this.player,
            isGrounded && this.jumpCount === 0,
            this.isJetpacking
        );
    }

    updateChickenAnimation(player, isGrounded, isJetpacking) {
        const speed = Math.abs(player.body?.velocity?.x || 0);
        const animation = isGrounded
            ? speed > 1
                ? 'chicken-walk'
                : 'chicken-idle'
            : isJetpacking
              ? 'chicken-jetpack'
              : (player.body?.velocity?.y || 0) > 20
                ? 'chicken-fall'
                : 'chicken-jump';
        if (player.anims.currentAnim?.key !== animation) {
            player.play(animation);
        }
        // Keep the stride tied to actual motion; restore normal timing for other poses.
        player.anims.timeScale =
            animation === 'chicken-walk' ? speed / GAME_CONSTANTS.PLAYER_VELOCITY_X : 1;
    }

    cleanupOffscreenBombs() {
        if (!this.bombs || !this.bombs.children) {
            return;
        }
        const bombCleanupY = this.worldHeight + GAME_CONSTANTS.BOMB_CLEANUP_THRESHOLD_Y;
        const entries = this.bombs.children.entries;
        if (!Array.isArray(entries)) {
            return;
        }
        for (let i = 0; i < entries.length; i++) {
            const bomb = entries[i];
            if (!bomb || bomb.active === false) {
                continue;
            }
            if (bomb.x < -100 || bomb.x > this.worldWidth + 100 || bomb.y > bombCleanupY) {
                this.recycleBomb(bomb);
            }
        }
    }

    handleResize(gameSize) {
        const width = gameSize?.width > 0 ? gameSize.width : this.getBaseWidth();
        const height = gameSize?.height > 0 ? gameSize.height : this.getBaseHeight();
        this.viewportWidth = width;
        this.viewportHeight = height;
        if (this.uiManager) {
            this.uiManager.handleResize(gameSize);
        }
        this.updateCameraForViewport();
        this.backgroundRenderer?.syncToCamera?.();
    }

    cleanup() {
        if (this.hasCleanedUp) {
            return;
        }
        this.hasCleanedUp = true;
        if (this.events) {
            this.events.off('shutdown', this.cleanup, this);
            this.events.off('destroy', this.cleanup, this);
        }
        if (this.scale && this.boundHandleResize && this.scale.off) {
            this.scale.off('resize', this.boundHandleResize, this);
            this.boundHandleResize = null;
        }
        if (this.events && this.addedToSceneHandler && this.events.off) {
            this.events.off('addedtoscene', this.addedToSceneHandler, this);
            this.addedToSceneHandler = null;
        }
        this.input?.off?.('pointerup', this.onTitlePointerUp, this);
        if (this.raceFinaleEvent?.remove) {
            this.raceFinaleEvent.remove(false);
            this.raceFinaleEvent = null;
        }
        if (this.player2Camera && this.cameras?.remove) {
            this.cameras.remove(this.player2Camera);
            this.player2Camera = null;
        }
        if (this.uiCamera && this.cameras?.remove) {
            this.cameras.remove(this.uiCamera);
            this.uiCamera = null;
        }

        if (this.uiManager) {
            this.uiManager.cleanup();
        }
        if (this.audioManager) {
            this.audioManager.cleanupAudio();
        }
        if (this.effectsManager) {
            this.effectsManager.cleanup();
        }

        if (this.deathResetEvent?.remove) {
            this.deathResetEvent.remove(false);
            this.deathResetEvent = null;
        }
        if (this.deathResetWall) {
            window.clearTimeout(this.deathResetWall);
            this.deathResetWall = null;
        }
        this.clearBombSpawns();

        this.worldBuilder?.clearHazardTimers();

        this.gameTestInterface?.clear();
        this.gameTestInterface = null;

        this.dynamicHazardsGroup = null;
        this.boardersGroup = null;
        this.phaserBolts = null;
        this.bombs = null;

        if (this.pointerTapTimes) {
            this.pointerTapTimes.clear();
        }
    }

    applyTestTimeScale() {
        const scale = this.testTimeScale || 1;
        this.time.timeScale = scale;
        this.tweens.setGlobalTimeScale(scale);
        // Arcade Physics uses the inverse convention: larger values mean fewer fixed steps.
        this.physics.world.timeScale = 1 / scale;
    }

    handleInput() {
        const state = this.inputController.poll();
        const bot =
            typeof window !== 'undefined' && window.__spaceChickenBotInput
                ? window.__spaceChickenBotInput
                : null;
        if (!bot) {
            this.botJumpWasDown = false;
            return state;
        }
        if (bot.start && this.awaitingStart) {
            this.beginPlay();
        }
        if (bot.left) {
            this.leftPressed = true;
        }
        if (bot.right) {
            this.rightPressed = true;
        }
        if (bot.shoot) {
            state.phaserHeld = true;
        }
        const botJumpDown = Boolean(bot.jump);
        if (botJumpDown && !this.botJumpWasDown) {
            this.jumpRequested = true;
        }
        this.botJumpWasDown = botJumpDown;
        return state;
    }

    bindBotDebugApi() {
        if (typeof window === 'undefined') {
            return;
        }
        this.gameTestInterface = new GameTestInterface(this, window);
        window.__spaceChickenDebug = {
            ready: () => Boolean(this.sys && this.player),
            getBotSnapshot: () => this.getBotSnapshot(),
            setBotInput: (input) => {
                window.__spaceChickenBotInput = input;
            },
            clearBotInput: () => {
                window.__spaceChickenBotInput = null;
            },
            mode: this.debugMode,
            goToLevel: (level) => this.debugGoToLevel(level),
            skipLevel: () => this.debugSkipLevel(),
        };
        window.__spaceChickenTest = {
            observe: () => this.gameTestInterface.observe(),
            act: (action) => this.gameTestInterface.act(action),
            reset: (seed) => this.gameTestInterface.reset(seed),
            checkObjectives: () => this.gameTestInterface.checkObjectives(),
            captureReport: () => this.gameTestInterface.captureReport(),
        };
    }

    debugGoToLevel(level) {
        const requested = Number(level);
        if (!this.debugMode || !LEVEL_IDS.includes(requested)) return false;
        this.scene.start(this.scene.key, {
            level: requested,
            deathCount: 0,
            coopMode: this.coopMode,
        });
        return true;
    }

    debugSkipLevel() {
        if (!this.debugMode) return false;
        const index = LEVEL_IDS.indexOf(this.level);
        const nextLevel = LEVEL_IDS[index + 1];
        if (!nextLevel) return false;
        return this.debugGoToLevel(nextLevel);
    }

    getBotSnapshot() {
        const pendingLevel = pendingLevelOf(this);
        const camera = this.cameras && this.cameras.main;
        const now = Number.isFinite(this.time?.now) ? this.time.now : 0;
        const timeScale = this.testTimeScale || 1;
        const staticPlatforms = listGroupBodies(
            this.platforms,
            now,
            {
                kind: 'platform',
                type: 'static_platform',
            },
            timeScale
        );
        const movingPlatforms = listGroupBodies(
            this.movingPlatforms,
            now,
            {
                kind: 'platform',
                type: 'moving_platform',
            },
            timeScale
        );
        return {
            ready: Boolean(this.player),
            capturedAtMs: performance.now(),
            level: this.level,
            nextLevel: this.levelConfig ? this.levelConfig.nextLevel : null,
            deaths: this.deathCount,
            awaitingStart: this.awaitingStart,
            transitioning: this.isTransitioning,
            gameOver: this.gameOver,
            dying: Boolean(this.isTransitioning && !this.gameOver && pendingLevel == null),
            pendingLevel,
            elapsedMs: performance.now() - this.startTime,
            simulationTimeScale: this.testTimeScale,
            jumpCount: this.jumpCount,
            maxJumps: this.maxJumps,
            player: describePlayer(this.player),
            hud: {
                timer: hudField(this.uiManager, 'timerText'),
                deaths: hudField(this.uiManager, 'deathText'),
                level: hudField(this.uiManager, 'levelText'),
            },
            physicsPaused: Boolean(
                this.physics && this.physics.world && this.physics.world.isPaused
            ),
            hasStartedPlay: this.hasStartedPlay,
            hasCleanedUp: this.hasCleanedUp,
            worldWidth: this.worldWidth,
            worldHeight: this.worldHeight,
            killZoneY: this.killZoneFallY,
            camera: camera
                ? {
                      scrollX: camera.scrollX || 0,
                      scrollY: camera.scrollY || 0,
                      zoom: camera.zoom || 1,
                  }
                : null,
            crown: this.crown ? { x: this.crown.x, y: this.crown.y } : null,
            columns: listRayColumns(this),
            platforms: staticPlatforms.concat(movingPlatforms),
            movingPlatforms,
            hazards: listGroupBodies(
                this.hazards,
                now,
                {
                    kind: 'hazard',
                    type: 'rock',
                },
                timeScale
            ).concat(
                listGroupBodies(
                    this.dynamicHazardsGroup,
                    now,
                    {
                        kind: 'hazard',
                        type: 'dynamic_hazard',
                    },
                    timeScale
                ),
                listGroupBodies(
                    this.boardersGroup,
                    now,
                    {
                        kind: 'hazard',
                        type: 'boarder',
                    },
                    timeScale
                )
            ),
            hazardSchedules: listHazardSchedules(this, now, timeScale),
            bombs: listGroupBodies(this.bombs, now, { kind: 'hazard', type: 'bomb' }, timeScale),
        };
    }
}
