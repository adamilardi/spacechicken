import { GAME_CONSTANTS, LEVEL_DEFINITIONS } from './Constants.js';

export class LevelConfig {
    constructor(level) {
        this.level = level;
        this.config = this.getLevelConfig(level);
    }

    get gravity() {
        return this.config.gravity || GAME_CONSTANTS.PHYSICS_GRAVITY.y;
    }

    get maxJumps() {
        return GAME_CONSTANTS.MAX_JUMPS;
    }

    get nextLevel() {
        return this.config.nextLevel;
    }

    get world() {
        return {
            width: this.config.worldWidth || GAME_CONSTANTS.LEVEL_DEFAULT_WORLD_SIZE.width,
            height: this.config.worldHeight || GAME_CONSTANTS.LEVEL_DEFAULT_WORLD_SIZE.height,
        };
    }

    get killZoneY() {
        return this.config.killZoneY || GAME_CONSTANTS.LEVEL_KILLZONE_Y;
    }

    get killZoneHeight() {
        return this.config.killZoneHeight || GAME_CONSTANTS.LEVEL_KILLZONE_HEIGHT;
    }

    get playerStart() {
        return {
            x: this.config.playerStartX,
            y: this.config.playerStartY,
        };
    }

    get crown() {
        return {
            x: this.config.crownX,
            y: this.config.crownY,
        };
    }

    get instructions() {
        return this.getDefaultInstructions();
    }

    get touchInstructions() {
        return this.getDefaultTouchInstructions();
    }

    get background() {
        return this.getBackgroundConfig();
    }

    get platforms() {
        return {
            static: this.getStaticPlatforms(),
            floor: this.getFloorPlatforms(),
            moving: this.getMovingPlatforms(),
        };
    }

    get hazards() {
        return {
            rocks: this.getRockHazards(),
            dynamic: this.getDynamicHazards(),
        };
    }

    get bombs() {
        return {
            speed: this.config.bombSpeed || GAME_CONSTANTS.BOMB_DEFAULT_SPEED,
            delayMin: GAME_CONSTANTS.BOMB_DEFAULT_DELAY_MIN,
            delayMax: GAME_CONSTANTS.BOMB_DEFAULT_DELAY_MAX,
            spawnHeight: GAME_CONSTANTS.BOMB_DEFAULT_SPAWN_HEIGHT,
            spread: GAME_CONSTANTS.BOMB_DEFAULT_SPREAD,
            gravityY: GAME_CONSTANTS.BOMB_DEFAULT_GRAVITY_Y,
        };
    }

    getLevelConfig(level) {
        const def = LEVEL_DEFINITIONS[level];
        if (!def) {
            throw new Error(`Level ${level} configuration not found`);
        }
        const normalized = {
            gravity: def.gravity !== undefined ? def.gravity : def.GRAVITY,
            worldWidth: def.worldWidth !== undefined ? def.worldWidth : def.WORLD_WIDTH,
            worldHeight: def.worldHeight !== undefined ? def.worldHeight : def.WORLD_HEIGHT,
            killZoneY: def.killZoneY !== undefined ? def.killZoneY : def.KILLZONE_Y,
            killZoneHeight:
                def.killZoneHeight !== undefined ? def.killZoneHeight : def.KILLZONE_HEIGHT,
            playerStartX: def.playerStartX !== undefined ? def.playerStartX : def.PLAYER_START_X,
            playerStartY: def.playerStartY !== undefined ? def.playerStartY : def.PLAYER_START_Y,
            crownX: def.crownX !== undefined ? def.crownX : def.CROWN_X,
            crownY: def.crownY !== undefined ? def.crownY : def.CROWN_Y,
            floorY: def.floorY !== undefined ? def.floorY : def.FLOOR_Y,
            bombSpeed: def.bombSpeed !== undefined ? def.bombSpeed : def.BOMB_SPEED,
            nextLevel: def.nextLevel !== undefined ? def.nextLevel : def.NEXT_LEVEL,
        };
        return Object.assign({}, def, normalized);
    }

    getDefaultInstructions() {
        switch (this.level) {
            case 1:
                return 'Space Chicken - WASD to move, Space to jump, M toggles music\nCollect the golden crown!';
            case 2:
                return 'Space Chicken - WASD to move, Space to jump, M toggles music\nCollect the golden crown!';
            case 3:
                return 'Orbital Gauntlet - Ride the lifts, dodge lasers, claim the crown! (Press M to toggle music)';
            case 4:
                return 'Lunar Gauntlet - Low gravity. Avoid patrolling rovers and cosmic rays! (M toggles music)';
            default:
                return 'Space Chicken - WASD to move, Space to jump, M toggles music\nCollect the golden crown!';
        }
    }

    getDefaultTouchInstructions() {
        switch (this.level) {
            case 1:
                return 'Space Chicken - Touch left half for left, right half for right\nTap jump to leap, tap the speaker to toggle music\nCollect the golden crown!';
            case 2:
                return 'Space Chicken - Touch left half for left, right half for right\nTap jump to leap, tap the speaker to toggle music\nCollect the golden crown!';
            case 3:
                return 'Orbital Gauntlet - Tap left/right halves to move, use the jump button to leap. Tap the speaker to toggle music.';
            case 4:
                return 'Lunar Gauntlet - Low gravity. Avoid patrolling rovers and dodge falling cosmic rays!';
            default:
                return 'Space Chicken - Touch left half for left, right half for right\nTap jump to leap, tap the speaker to toggle music\nCollect the golden crown!';
        }
    }

    getBackgroundConfig() {
        switch (this.level) {
            case 1:
                return {
                    type: 'space',
                    style: 'dreamcastSunrise',
                    starCount: 140,
                    planetCount: 3,
                    color: 0x06101f,
                    palette: {
                        top: 0x06101f,
                        mid: 0x0f4e7a,
                        bottom: 0xffa563,
                        haze: 0x87ebff,
                        glow: 0xffd79a,
                        grid: 0x64d8ff,
                        accent: 0xff8358,
                        silhouetteFar: 0x0d1526,
                        silhouetteNear: 0x07101a,
                    },
                };
            case 2:
                return {
                    type: 'space',
                    style: 'arcadeOrbit',
                    starCount: 180,
                    planetCount: 4,
                    color: 0x090418,
                    palette: {
                        top: 0x090418,
                        mid: 0x34115a,
                        bottom: 0xff7a58,
                        haze: 0x8ce4ff,
                        glow: 0xffc86f,
                        grid: 0x63d5ff,
                        accent: 0xff6faf,
                        silhouetteFar: 0x120822,
                        silhouetteNear: 0x080411,
                    },
                    planetTemplates: [
                        { color: 0x3568c0, size: 58 },
                        { color: 0xf06d57, size: 44 },
                        { color: 0x7f62cf, size: 36 },
                        { color: 0x37b0a1, size: 40 },
                    ],
                };
            case 3:
                return {
                    type: 'station',
                    starCount: 68,
                    planetCount: 1,
                    style: 'orbitalDreamcast',
                    color: 0x050914,
                    disablePlanet: false,
                    ribbonCount: 1,
                    nebulaCount: 1,
                    frameCount: 1,
                    moduleStride: 420,
                    moduleBeaconChance: 0.25,
                    catwalkStep: 360,
                    catwalkLightStep: 44,
                    deckLightStep: 260,
                    showDeckLights: false,
                    moduleDetail: {
                        panelRows: [1, 2],
                        panelCols: [2, 3],
                        windowCount: [4, 8],
                        antennaHeight: [18, 34],
                    },
                    scanlineAlpha: 0.02,
                    palette: {
                        top: 0x040915,
                        mid: 0x102544,
                        bottom: 0x1f5d7a,
                        haze: 0x87f0ff,
                        glow: 0xffc87c,
                        metal: 0x18253a,
                        metalAlt: 0x243657,
                        highlight: 0x9ee5ff,
                        accent: 0xff9745,
                        shadow: 0x09111d,
                    },
                };
            case 4:
                // Moon theme - gray, cratered, low contrast
                return {
                    type: 'moon',
                    starCount: 220,
                    color: 0x0a0a0f,
                    palette: {
                        top: 0x0a0a0f,
                        mid: 0x1a1a22,
                        bottom: 0x2f2f38,
                        surface: 0x8a8a94,
                        crater: 0x5a5a62,
                        highlight: 0xc8c8d0,
                        shadow: 0x121216,
                    },
                };
            default:
                return {
                    type: 'space',
                    style: 'dreamcastSunrise',
                    starCount: GAME_CONSTANTS.BACKGROUND_STAR_COUNT_DEFAULT,
                    planetCount: GAME_CONSTANTS.BACKGROUND_PLANET_COUNT_DEFAULT,
                    color: 0x06101f,
                    palette: {
                        top: 0x06101f,
                        mid: 0x0f4e7a,
                        bottom: 0xffa563,
                        haze: 0x87ebff,
                        glow: 0xffd79a,
                        grid: 0x64d8ff,
                        accent: 0xff8358,
                        silhouetteFar: 0x0d1526,
                        silhouetteNear: 0x07101a,
                    },
                };
        }
    }

    getStaticPlatforms() {
        switch (this.level) {
            case 1:
                return [
                    { x: 400, y: 568 },
                    { x: 800, y: 500 },
                    { x: 1200, y: 400 },
                ];
            case 2:
                return [
                    { x: 400, y: 568 },
                    { x: 800, y: 500 },
                    { x: 1200, y: 400 },
                    { x: 1600, y: 300 },
                    { x: 2000, y: 200 },
                    { x: 2400, y: 400 },
                    { x: 2800, y: 500 },
                ];
            case 3:
                return [
                    { x: 220, y: 780, key: 'stationPanel', scaleX: 2.4, scaleY: 0.4 },
                    { x: 520, y: 690, key: 'stationPanel', scaleX: 1.6, scaleY: 0.4 },
                    { x: 960, y: 560, key: 'stationPanel', scaleX: 1.6, scaleY: 0.4 },
                    { x: 1440, y: 430, key: 'stationPanel', scaleX: 1.6, scaleY: 0.4 },
                    { x: 1920, y: 320, key: 'stationPanel', scaleX: 1.2, scaleY: 0.4 },
                ];
            case 4:
                // Moon platforms - wider platforms for rover sections
                return [
                    // Big starting platform
                    { x: 280, y: 680, key: 'cliff', scaleX: 2.8, scaleY: 0.4 },

                    // Wide rover platform 1
                    { x: 720, y: 580, key: 'cliff', scaleX: 3.2, scaleY: 0.4 },

                    // Wide rover platform 2 (main challenge area)
                    { x: 1350, y: 470, key: 'cliff', scaleX: 3.5, scaleY: 0.4 },

                    // Platform with rover near the end
                    { x: 1950, y: 360, key: 'cliff', scaleX: 2.6, scaleY: 0.4 },

                    // Final approach platforms
                    { x: 2350, y: 290, key: 'cliff', scaleX: 1.8, scaleY: 0.4 },
                    { x: 2600, y: 240, key: 'cliff', scaleX: 1.4, scaleY: 0.4 },
                ];
            default:
                return [];
        }
    }

    getFloorPlatforms() {
        switch (this.level) {
            case 1:
                return {
                    y: 580,
                    step: 100,
                    scaleX: GAME_CONSTANTS.FLOOR_PLATFORM_SCALE.x,
                    scaleY: GAME_CONSTANTS.FLOOR_PLATFORM_SCALE.y,
                    condition: (x) =>
                        x < 350 || (x > 450 && x < 650) || (x > 750 && x < 950) || x > 1050,
                };
            case 2:
                return {
                    y: 580,
                    step: 100,
                    scaleX: GAME_CONSTANTS.FLOOR_PLATFORM_SCALE.x,
                    scaleY: GAME_CONSTANTS.FLOOR_PLATFORM_SCALE.y,
                    condition: (x) =>
                        x < 350 ||
                        (x > 450 && x < 550) ||
                        (x > 650 && x < 750) ||
                        (x > 850 && x < 1050) ||
                        (x > 1150 && x < 1350) ||
                        (x > 1450 && x < 1650) ||
                        (x > 1750 && x < 1950) ||
                        x > 2050,
                };
            case 3:
                return null; // No floor platforms for level 3
            default:
                return null;
        }
    }

    getMovingPlatforms() {
        switch (this.level) {
            case 1:
            case 2:
                return [];
            case 3:
                return [
                    {
                        x: 320,
                        y: 780,
                        key: 'liftPlatform',
                        scaleX: 1.2,
                        scaleY: 0.4,
                        tween: { y: 640, duration: 2200 },
                    },
                    {
                        x: 760,
                        y: 640,
                        key: 'liftPlatform',
                        scaleX: 1.2,
                        scaleY: 0.4,
                        tween: { y: 500, duration: 2400, delay: 300 },
                    },
                    {
                        x: 1180,
                        y: 500,
                        key: 'liftPlatform',
                        scaleX: 1.2,
                        scaleY: 0.4,
                        tween: { x: 1380, duration: 2600 },
                    },
                    {
                        x: 1680,
                        y: 360,
                        key: 'liftPlatform',
                        scaleX: 1.2,
                        scaleY: 0.4,
                        tween: { y: 260, duration: 2000, delay: 500 },
                    },
                ];
            default:
                return [];
        }
    }

    getRockHazards() {
        switch (this.level) {
            case 1:
                return [
                    { x: 600, y: 568 },
                    { x: 1000, y: 568 },
                ];
            case 2:
                return [
                    { x: 600, y: 568 },
                    { x: 1000, y: 568 },
                    { x: 1400, y: 568 },
                    { x: 1800, y: 568 },
                    { x: 2200, y: 568 },
                ];
            case 3:
                return [];
            default:
                return [];
        }
    }

    getDynamicHazards() {
        switch (this.level) {
            case 1:
            case 2:
                return [];
            case 3:
                return [
                    {
                        type: 'laser',
                        x: 520,
                        y: 650,
                        length: 260,
                        width: 12,
                        onDuration: GAME_CONSTANTS.LASER_DEFAULT_ON_DURATION,
                        offDuration: GAME_CONSTANTS.LASER_DEFAULT_OFF_DURATION,
                        startDelay: 400,
                    },
                    {
                        type: 'laser',
                        x: 1420,
                        y: 460,
                        length: 320,
                        width: 12,
                        onDuration: 1200,
                        offDuration: 1000,
                        startDelay: 0,
                    },
                    {
                        type: 'laser',
                        x: 1760,
                        y: 320,
                        length: 220,
                        width: 10,
                        orientation: 'vertical',
                        onDuration: 900,
                        offDuration: 900,
                        startDelay: 600,
                    },
                    {
                        type: 'drone',
                        x: 900,
                        y: 520,
                        patrol: { x: 1120, duration: 2600, ease: 'Sine.easeInOut' },
                        bobAmplitude: 18,
                        bobDuration: GAME_CONSTANTS.BOB_DEFAULT_DURATION,
                        spin: 6,
                    },
                    {
                        type: 'drone',
                        x: 1550,
                        y: 360,
                        patrol: { x: 1770, duration: 2200, ease: 'Sine.easeInOut', delay: 400 },
                        bobAmplitude: 22,
                        bobDuration: 900,
                        spin: { angle: 12, duration: GAME_CONSTANTS.SPIN_DEFAULT_DURATION },
                    },
                ];
            case 4:
                return [
                    // Patrolling rovers (placed on wide platforms)
                    { type: 'rover', x: 580, y: 555, patrol: { x: 980, duration: 3200 } },
                    { type: 'rover', x: 1220, y: 445, patrol: { x: 1700, duration: 2800 } },
                    {
                        type: 'rover',
                        x: 1880,
                        y: 335,
                        patrol: { x: 2220, duration: 2600, delay: 600 },
                    },
                    // Cosmic rays falling from the sky (much stronger warnings)
                    { type: 'cosmicRay', x: 550, y: 120, interval: 2100, warning: 850 },
                    { type: 'cosmicRay', x: 980, y: 80, interval: 2600, warning: 780, delay: 900 },
                    {
                        type: 'cosmicRay',
                        x: 1450,
                        y: 100,
                        interval: 2300,
                        warning: 920,
                        delay: 400,
                    },
                    {
                        type: 'cosmicRay',
                        x: 2000,
                        y: 90,
                        interval: 2800,
                        warning: 750,
                        delay: 1400,
                    },
                    { type: 'cosmicRay', x: 2350, y: 110, interval: 1900, warning: 820 },
                ];
            default:
                return [];
        }
    }
}
