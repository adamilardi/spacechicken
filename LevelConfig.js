import { GAME_CONSTANTS, LEVEL_DEFINITIONS } from './Constants.js';

const DEFAULT_INSTRUCTIONS =
    'Space Chicken - WASD to move, Space to jump, M toggles music\nCollect the golden crown!';
const DEFAULT_TOUCH_INSTRUCTIONS =
    'Hold the arrows to move, tap jump to leap, tap the speaker for music.\nCollect the golden crown!';

const DAWN_PALETTE = {
    top: 0x06101f,
    mid: 0x0f4e7a,
    bottom: 0xffa563,
    haze: 0x87ebff,
    glow: 0xffd79a,
    grid: 0x64d8ff,
    accent: 0xff8358,
    silhouetteFar: 0x0d1526,
    silhouetteNear: 0x07101a,
};

const LEVEL_CONTENT = {
    1: {
        instructions: DEFAULT_INSTRUCTIONS,
        touchInstructions: DEFAULT_TOUCH_INSTRUCTIONS,
        background: {
            type: 'space',
            style: 'dreamcastSunrise',
            starCount: 140,
            planetCount: 3,
            color: 0x06101f,
            palette: DAWN_PALETTE,
        },
        staticPlatforms: [
            { x: 400, y: 568 },
            { x: 800, y: 500 },
            { x: 1200, y: 400 },
        ],
        floor: {
            y: 580,
            step: 100,
            scaleX: GAME_CONSTANTS.FLOOR_PLATFORM_SCALE.x,
            scaleY: GAME_CONSTANTS.FLOOR_PLATFORM_SCALE.y,
            condition: (x) => x < 350 || (x > 450 && x < 650) || (x > 750 && x < 950) || x > 1050,
        },
        moving: [],
        rocks: [
            { x: 600, y: 568 },
            { x: 1000, y: 568 },
        ],
        dynamic: [],
    },
    2: {
        instructions: DEFAULT_INSTRUCTIONS,
        touchInstructions: DEFAULT_TOUCH_INSTRUCTIONS,
        background: {
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
        },
        staticPlatforms: [
            { x: 400, y: 568 },
            { x: 800, y: 500 },
            { x: 1200, y: 400 },
            { x: 1600, y: 300 },
            { x: 2000, y: 200 },
            { x: 2400, y: 400 },
            { x: 2800, y: 500 },
        ],
        floor: {
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
        },
        moving: [],
        rocks: [
            { x: 600, y: 568 },
            { x: 1000, y: 568 },
            { x: 1400, y: 568 },
            { x: 1800, y: 568 },
            { x: 2200, y: 568 },
        ],
        dynamic: [],
    },
    3: {
        instructions:
            'Orbital Gauntlet - Ride the lifts, dodge lasers, claim the crown! (Press M to toggle music)',
        touchInstructions:
            'Orbital Gauntlet - Ride the lifts and dodge lasers. Arrows move, jump leaps.',
        background: {
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
        },
        staticPlatforms: [
            { x: 220, y: 780, key: 'stationPanel', scaleX: 2.4, scaleY: 0.4 },
            { x: 520, y: 690, key: 'stationPanel', scaleX: 1.6, scaleY: 0.4 },
            { x: 960, y: 560, key: 'stationPanel', scaleX: 1.6, scaleY: 0.4 },
            { x: 1440, y: 430, key: 'stationPanel', scaleX: 1.6, scaleY: 0.4 },
            { x: 1920, y: 320, key: 'stationPanel', scaleX: 1.2, scaleY: 0.4 },
        ],
        floor: null,
        moving: [
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
        ],
        rocks: [],
        dynamic: [
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
        ],
    },
    4: {
        instructions:
            'Lunar Gauntlet - Low gravity. Avoid patrolling rovers and cosmic rays! (M toggles music)',
        touchInstructions:
            'Lunar Gauntlet - Low gravity. Avoid rovers and cosmic rays. Arrows move, jump leaps.',
        background: {
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
        },
        staticPlatforms: [
            { x: 280, y: 680, key: 'cliff', scaleX: 2.8, scaleY: 0.4 },
            { x: 720, y: 580, key: 'cliff', scaleX: 3.2, scaleY: 0.4 },
            { x: 1350, y: 470, key: 'cliff', scaleX: 3.5, scaleY: 0.4 },
            { x: 1950, y: 360, key: 'cliff', scaleX: 2.6, scaleY: 0.4 },
            { x: 2350, y: 290, key: 'cliff', scaleX: 1.8, scaleY: 0.4 },
            { x: 2600, y: 240, key: 'cliff', scaleX: 1.4, scaleY: 0.4 },
        ],
        floor: null,
        moving: [],
        rocks: [],
        dynamic: [
            { type: 'rover', x: 580, y: 555, patrol: { x: 980, duration: 3200 } },
            { type: 'rover', x: 1220, y: 445, patrol: { x: 1700, duration: 2800 } },
            {
                type: 'rover',
                x: 1880,
                y: 335,
                patrol: { x: 2220, duration: 2600, delay: 600 },
            },
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
        ],
    },
};

export class LevelConfig {
    constructor(level) {
        const def = LEVEL_DEFINITIONS[level];
        if (!def) {
            throw new Error(`Level ${level} configuration not found`);
        }
        const content = LEVEL_CONTENT[level] || {};
        this.level = level;
        this.gravity = def.GRAVITY ?? GAME_CONSTANTS.PHYSICS_GRAVITY.y;
        this.maxJumps = GAME_CONSTANTS.MAX_JUMPS;
        this.nextLevel = def.NEXT_LEVEL;
        this.world = {
            width: def.WORLD_WIDTH ?? GAME_CONSTANTS.LEVEL_DEFAULT_WORLD_SIZE.width,
            height: def.WORLD_HEIGHT ?? GAME_CONSTANTS.LEVEL_DEFAULT_WORLD_SIZE.height,
        };
        this.killZoneY = def.KILLZONE_Y ?? GAME_CONSTANTS.LEVEL_KILLZONE_Y;
        this.killZoneHeight = def.KILLZONE_HEIGHT ?? GAME_CONSTANTS.LEVEL_KILLZONE_HEIGHT;
        this.playerStart = {
            x: def.PLAYER_START_X,
            y: def.PLAYER_START_Y,
        };
        this.crown = {
            x: def.CROWN_X,
            y: def.CROWN_Y,
        };
        this.title = def.TITLE || `Level ${level}`;
        this.instructions = content.instructions || DEFAULT_INSTRUCTIONS;
        this.touchInstructions = content.touchInstructions || DEFAULT_TOUCH_INSTRUCTIONS;
        this.background = content.background || {
            type: 'space',
            style: 'dreamcastSunrise',
            starCount: GAME_CONSTANTS.BACKGROUND_STAR_COUNT_DEFAULT,
            planetCount: GAME_CONSTANTS.BACKGROUND_PLANET_COUNT_DEFAULT,
            color: 0x06101f,
            palette: DAWN_PALETTE,
        };
        this.platforms = {
            static: content.staticPlatforms || [],
            floor: content.floor ?? null,
            moving: content.moving || [],
        };
        this.hazards = {
            rocks: content.rocks || [],
            dynamic: content.dynamic || [],
        };
        this.bombs = {
            speed: def.BOMB_SPEED ?? GAME_CONSTANTS.BOMB_DEFAULT_SPEED,
            delayMin: GAME_CONSTANTS.BOMB_DEFAULT_DELAY_MIN,
            delayMax: GAME_CONSTANTS.BOMB_DEFAULT_DELAY_MAX,
            spawnHeight: GAME_CONSTANTS.BOMB_DEFAULT_SPAWN_HEIGHT,
            spread: GAME_CONSTANTS.BOMB_DEFAULT_SPREAD,
            gravityY: GAME_CONSTANTS.BOMB_DEFAULT_GRAVITY_Y,
        };
    }
}
