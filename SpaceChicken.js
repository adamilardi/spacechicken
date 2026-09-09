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

function readLaunchQuery() {
    if (typeof location === 'undefined' || !location.search) {
        return { level: null, bot: false };
    }
    const query = new URLSearchParams(location.search);
    const level = Number(query.get('level'));
    return {
        level: Number.isFinite(level) ? level : null,
        bot: query.has('bot'),
    };
}

function listGroupBodies(group) {
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
        out.push({
            x: sprite.x,
            y: sprite.y,
            w: width,
            h: height,
            left: sprite.x - width / 2,
            right: sprite.x + width / 2,
            top: sprite.y - height / 2,
            active: sprite.active !== false,
            enable: !sprite.body || sprite.body.enable !== false,
        });
    }
    return out;
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
        this.launchBot = Boolean(launch.bot);
        this.startTime = 0;
        this.gameOver = false;
        this.isTransitioning = false;
        this.pendingSceneData = null;
        this.maxJumps = GAME_CONSTANTS.MAX_JUMPS;
        this.jumpCount = 0;
        this.isJetpacking = false;
        this.restartDelayDone = true;
        this.bombSpawnEvent = null;
        this.deathResetEvent = null;
        this.deathResetWall = null;
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
        this.spriteFactory.createVirtualButtons();
        this.spriteFactory.createParticleTextures();
    }

    create() {
        this.levelConfig = new LevelConfig(this.level);
        this.audioManager = new AudioManager(this);
        this.uiManager = new UIManager(this);
        this.leaderboardManager = new LeaderboardManager(this);
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
        this.startTime = performance.now();

        this.viewportWidth = this.getBaseWidth();
        this.viewportHeight = this.getBaseHeight();
        this.uiManager.createUI(this.levelConfig, this.level, this.playerName);

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
        this.physics.add.overlap(this.player, this.hazards, this.failFromHazard, null, this);
        if (this.dynamicHazardsGroup) {
            this.physics.add.overlap(
                this.player,
                this.dynamicHazardsGroup,
                this.failFromHazard,
                null,
                this
            );
        }
        this.physics.add.overlap(this.player, this.crown, () => this.collectGem(), null, this);
        this.physics.add.overlap(this.player, killZone, () => this.failFromHazard(), null, this);

        this.bombs = this.physics.add.group({
            maxSize: GAME_CONSTANTS.BOMB_POOL_SIZE,
        });
        this.physics.add.overlap(this.player, this.bombs, this.failFromHazard, null, this);

        this.createAnimations();

        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,S,A,D');
        this.space = this.input.keyboard.addKey(KEY_CODES.SPACE);
        this.muteKey = this.input.keyboard.addKey(KEY_CODES.M);

        this.audioManager.setupAudioPipeline();
        this.audioManager.setMusicMuted(this.musicMuted, { skipSave: true });

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
        if (typeof gameObject.cameraFilter !== 'number') {
            if (gameObject.spaceChickenUi && main.ignore) {
                main.ignore(gameObject);
            } else if (uiCamera.ignore) {
                uiCamera.ignore(gameObject);
            }
            return;
        }
        const mainId = typeof main.id === 'number' ? main.id : 1;
        const uiId = typeof uiCamera.id === 'number' ? uiCamera.id : 2;
        if (gameObject.spaceChickenUi) {
            gameObject.cameraFilter = (gameObject.cameraFilter | mainId) & ~uiId;
            return;
        }
        gameObject.cameraFilter = (gameObject.cameraFilter | uiId) & ~mainId;
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

    flashCamera(duration, red, green, blue) {
        this.getMainCamera()?.flash?.(duration, red, green, blue);
    }

    shakeCamera(duration, intensity) {
        this.getMainCamera()?.shake?.(duration, intensity);
    }

    fadeCameraIn() {
        this.getMainCamera()?.fadeIn?.(GAME_CONSTANTS.CAMERA_FADE_IN, 0, 0, 0);
    }

    fadeCameraOut(duration, red = 0, green = 0, blue = 0) {
        this.getMainCamera()?.fadeOut?.(duration, red, green, blue);
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
        if (this.player) {
            this.player.setTint(0x7dff7d);
        }
        if (this.crown) {
            this.crown.disableBody?.(true, false);
            this.effectsManager?.collectBurst(this.crown.x, this.crown.y);
        }
        this.flashCamera(GAME_CONSTANTS.CAMERA_FLASH_COLLECT, 180, 255, 140);
        const camera = this.getMainCamera();
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

    collectGem() {
        if (this.awaitingStart || this.isTransitioning || this.gameOver) {
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
            this.queueSceneStart({
                level: this.levelConfig.nextLevel,
                deathCount: this.deathCount,
            });
            return;
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
        const start = this.levelConfig.playerStart;
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
        this.time.delayedCall(GAME_CONSTANTS.LEVEL_TRANSITION_DELAY, () => {
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
        const inputState = this.handleInput();

        if (this.muteKey && Phaser.Input.Keyboard.JustDown(this.muteKey)) {
            this.audioManager.toggleMusicMute();
        }

        if (this.awaitingStart) {
            this.updateTitleScreen(inputState);
            return;
        }

        if (this.gameOver) {
            if (this.restartDelayDone && (inputState.spaceJustPressed || this.jumpRequested)) {
                this.jumpRequested = false;
                this.scene.restart({ level: 1, deathCount: 0 });
            } else {
                this.jumpRequested = false;
            }
            return;
        }

        if (this.isTransitioning) {
            this.jumpRequested = false;
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
        if (this.effectsManager) {
            this.effectsManager.update(this.player, isGrounded, this.isJetpacking, delta);
        }

        if (this.player.y > this.killZoneFallY) {
            this.hitKillZone();
        }

        this.cleanupOffscreenBombs();
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

    shouldPlayLandingFx(now) {
        const airMs = this.airborneSince ? now - this.airborneSince : 0;
        if (airMs < GAME_CONSTANTS.LAND_MIN_AIR_MS) {
            return false;
        }
        return this.jumpCount > 0 || this.maxAirSpeedY >= GAME_CONSTANTS.LAND_MIN_SPEED_Y;
    }

    updateTitleScreen(inputState) {
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
            inputState.upJustPressed ||
            inputState.spaceJustPressed ||
            inputState.wJustPressed ||
            inputState.pointerJumpTriggered ||
            inputState.doubleTapJumpTriggered ||
            this.jumpRequested
        );
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
        if (this.cursors.left.isDown || this.wasd.A.isDown || this.leftPressed) {
            velocityX -= GAME_CONSTANTS.PLAYER_VELOCITY_X;
        }
        if (this.cursors.right.isDown || this.wasd.D.isDown || this.rightPressed) {
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
        const currentAnimKey = this.player.anims.currentAnim
            ? this.player.anims.currentAnim.key
            : null;
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

        this.dynamicHazardsGroup = null;
        this.bombs = null;

        if (this.pointerTapTimes) {
            this.pointerTapTimes.clear();
        }
    }

    handleInput() {
        const state = this.inputController.poll();
        const bot =
            typeof window !== 'undefined' && window.__spaceChickenBotInput
                ? window.__spaceChickenBotInput
                : null;
        if (!bot) {
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
        if (bot.jump) {
            this.jumpRequested = true;
        }
        return state;
    }

    bindBotDebugApi() {
        if (typeof window === 'undefined') {
            return;
        }
        window.__spaceChickenDebug = {
            ready: () => Boolean(this.sys && this.player),
            getBotSnapshot: () => this.getBotSnapshot(),
            setBotInput: (input) => {
                window.__spaceChickenBotInput = input;
            },
            clearBotInput: () => {
                window.__spaceChickenBotInput = null;
            },
        };
    }

    getBotSnapshot() {
        const player = this.player;
        const body = player && player.body;
        return {
            ready: Boolean(player),
            level: this.level,
            nextLevel: this.levelConfig ? this.levelConfig.nextLevel : null,
            deaths: this.deathCount,
            awaitingStart: this.awaitingStart,
            transitioning: this.isTransitioning,
            gameOver: this.gameOver,
            elapsedMs: performance.now() - this.startTime,
            jumpCount: this.jumpCount,
            maxJumps: this.maxJumps,
            player: player
                ? {
                      x: player.x,
                      y: player.y,
                      vx: body && body.velocity ? body.velocity.x : 0,
                      vy: body && body.velocity ? body.velocity.y : 0,
                      grounded: Boolean(body && (body.blocked.down || body.touching.down)),
                      alpha: player.alpha,
                      visible: player.visible !== false,
                      scaleX: player.scaleX,
                      scaleY: player.scaleY,
                      bodyEnable: body ? body.enable !== false : null,
                  }
                : null,
            hud: {
                timer:
                    this.uiManager && this.uiManager.timerText
                        ? this.uiManager.timerText.text
                        : null,
                deaths:
                    this.uiManager && this.uiManager.deathText
                        ? this.uiManager.deathText.text
                        : null,
                level:
                    this.uiManager && this.uiManager.levelText
                        ? this.uiManager.levelText.text
                        : null,
            },
            physicsPaused: Boolean(
                this.physics && this.physics.world && this.physics.world.isPaused
            ),
            hasStartedPlay: this.hasStartedPlay,
            hasCleanedUp: this.hasCleanedUp,
            worldWidth: this.worldWidth,
            worldHeight: this.worldHeight,
            killZoneY: this.killZoneFallY,
            camera:
                this.cameras && this.cameras.main
                    ? {
                          scrollX: this.cameras.main.scrollX || 0,
                          scrollY: this.cameras.main.scrollY || 0,
                          zoom: this.cameras.main.zoom || 1,
                      }
                    : null,
            crown: this.crown ? { x: this.crown.x, y: this.crown.y } : null,
            platforms: listGroupBodies(this.platforms).concat(
                listGroupBodies(this.movingPlatforms)
            ),
            hazards: listGroupBodies(this.hazards).concat(
                listGroupBodies(this.dynamicHazardsGroup)
            ),
            bombs: listGroupBodies(this.bombs),
        };
    }
}
