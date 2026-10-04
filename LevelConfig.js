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
            'MOONFALL CITADEL - Chain low-gravity jumps through the ray storm and storm the lunar summit! (M toggles music)',
        touchInstructions:
            'MOONFALL CITADEL - Chain low-gravity jumps through the ray storm. Arrows move, jump boosts.',
        background: {
            type: 'moon',
            starCount: 260,
            color: 0x080b1c,
            palette: {
                top: 0x050717,
                mid: 0x171733,
                bottom: 0x353249,
                surface: 0x9696a6,
                crater: 0x5c5a70,
                highlight: 0xe0dcff,
                shadow: 0x0b0b18,
            },
        },
        staticPlatforms: [
            { x: 220, y: 680, key: 'cliff', scaleX: 3.2, scaleY: 0.45 },
            { x: 590, y: 625, key: 'cliff', scaleX: 2.5, scaleY: 0.42 },
            { x: 1000, y: 550, key: 'cliff', scaleX: 2.2, scaleY: 0.4 },
            { x: 1420, y: 485, key: 'cliff', scaleX: 2.6, scaleY: 0.42 },
            { x: 1840, y: 420, key: 'cliff', scaleX: 2.2, scaleY: 0.4 },
            { x: 2220, y: 345, key: 'cliff', scaleX: 2.1, scaleY: 0.4 },
            { x: 2600, y: 270, key: 'cliff', scaleX: 2.4, scaleY: 0.45 },
        ],
        floor: null,
        moving: [
            {
                x: 405,
                y: 650,
                key: 'liftPlatform',
                scaleX: 1.25,
                scaleY: 0.42,
                tween: { y: 570, duration: 1700 },
            },
            {
                x: 800,
                y: 590,
                key: 'liftPlatform',
                scaleX: 1.35,
                scaleY: 0.42,
                tween: { x: 900, duration: 1900, delay: 250 },
            },
            {
                x: 1200,
                y: 520,
                key: 'liftPlatform',
                scaleX: 1.25,
                scaleY: 0.42,
                tween: { y: 415, duration: 1800, delay: 500 },
            },
            {
                x: 1640,
                y: 455,
                key: 'liftPlatform',
                scaleX: 1.3,
                scaleY: 0.42,
                tween: { x: 1740, y: 375, duration: 2100 },
            },
            {
                x: 2030,
                y: 385,
                key: 'liftPlatform',
                scaleX: 1.25,
                scaleY: 0.42,
                tween: { x: 2120, duration: 1600, delay: 350 },
            },
            {
                x: 2420,
                y: 310,
                key: 'liftPlatform',
                scaleX: 1.2,
                scaleY: 0.42,
                tween: { y: 220, duration: 1500, delay: 700 },
            },
        ],
        rocks: [
            { x: 655, y: 596, scaleX: 0.8, scaleY: 0.8 },
            { x: 1470, y: 456, scaleX: 0.9, scaleY: 0.9 },
            { x: 2250, y: 316, scaleX: 0.75, scaleY: 0.75 },
        ],
        dynamic: [
            { type: 'rover', x: 535, y: 590, patrol: { x: 635, duration: 1800 } },
            { type: 'rover', x: 1360, y: 450, patrol: { x: 1480, duration: 1650 } },
            {
                type: 'rover',
                x: 2165,
                y: 310,
                patrol: { x: 2265, duration: 1500, delay: 500 },
            },
            {
                type: 'drone',
                x: 1080,
                y: 420,
                patrol: { x: 1280, duration: 2200 },
                bobAmplitude: 18,
                bobDuration: 900,
                spin: 10,
            },
            {
                type: 'drone',
                x: 1880,
                y: 300,
                patrol: { x: 2070, duration: 1900, delay: 400 },
                bobAmplitude: 16,
                bobDuration: 760,
                spin: 14,
            },
            { type: 'cosmicRay', x: 420, y: 90, interval: 3600, warning: 1100 },
            { type: 'cosmicRay', x: 835, y: 70, interval: 3900, warning: 1080, delay: 900 },
            {
                type: 'cosmicRay',
                x: 1260,
                y: 80,
                interval: 3500,
                warning: 1050,
                delay: 350,
            },
            {
                type: 'cosmicRay',
                x: 1690,
                y: 60,
                interval: 3300,
                warning: 1000,
                delay: 1100,
            },
            { type: 'cosmicRay', x: 2080, y: 70, interval: 3100, warning: 950, delay: 450 },
            { type: 'cosmicRay', x: 2440, y: 55, interval: 2900, warning: 900, delay: 900 },
            {
                type: 'laser',
                x: 2370,
                y: 285,
                length: 180,
                width: 9,
                onDuration: 720,
                offDuration: 1050,
                startDelay: 300,
            },
        ],
    },
    5: {
        instructions:
            'SPECIMEN WING - Gold heads are springs. Drop on the marked one to reach the catwalk. A side touch still fails the run. (M toggles music)',
        touchInstructions:
            'SPECIMEN WING - Drop onto a gold head to bounce up. Arrows move, jump leaps.',
        background: {
            type: 'facility',
            style: 'specimenWing',
            color: 0x071016,
            palette: {
                top: 0x071016,
                mid: 0x12343c,
                bottom: 0x1c4d46,
                metal: 0x1a3038,
                metalAlt: 0x24545a,
                glow: 0x67ffd2,
                accent: 0xd6ff4a,
                glass: 0x8ee7ff,
                shadow: 0x060d12,
            },
        },
        staticPlatforms: [
            { x: 250, y: 742, key: 'labDeck', scaleX: 4.8, scaleY: 1 },
            { x: 390, y: 320, key: 'labDeck', scaleX: 2.6, scaleY: 1 },
            { x: 860, y: 370, key: 'labDeck', scaleX: 2.2, scaleY: 1 },
            { x: 1220, y: 330, key: 'labDeck', scaleX: 2.2, scaleY: 1 },
            { x: 1560, y: 410, key: 'labDeck', scaleX: 2.4, scaleY: 1 },
            { x: 1940, y: 360, key: 'labDeck', scaleX: 2.0, scaleY: 1 },
            { x: 2280, y: 280, key: 'labDeck', scaleX: 1.8, scaleY: 1 },
            { x: 2580, y: 200, key: 'labDeck', scaleX: 2.2, scaleY: 1 },
        ],
        floor: null,
        moving: [
            {
                x: 2140,
                y: 390,
                key: 'liftPlatform',
                scaleX: 1.15,
                scaleY: 0.42,
                tween: { y: 270, duration: 2200, delay: 280 },
            },
        ],
        rocks: [],
        props: [
            { x: 130, y: 712, key: 'bonkSign' },
            { x: 78, y: 708, key: 'specimenJar' },
            { x: 188, y: 708, key: 'specimenJar' },
        ],
        dynamic: [
            {
                type: 'bonk',
                enemy: 'lab_tech',
                key: 'labTech',
                x: 330,
                y: 702,
                patrol: { x: 460, duration: 1700 },
                bodyWidth: 30,
                bodyHeight: 56,
            },
            {
                type: 'bonk',
                enemy: 'sentry',
                key: 'sentryOrb',
                x: 640,
                y: 470,
                bobAmplitude: 18,
                bobDuration: 900,
                bodyWidth: 30,
                bodyHeight: 44,
            },
            {
                type: 'laser',
                x: 860,
                y: 300,
                length: 150,
                width: 12,
                orientation: 'vertical',
                tint: 0x44ffd0,
                onDuration: 820,
                offDuration: 1100,
                startDelay: 180,
            },
            { type: 'drip', x: 1160, y: 70, interval: 1600, delay: 0 },
            { type: 'drip', x: 1280, y: 70, interval: 1600, delay: 700 },
            {
                type: 'bonk',
                enemy: 'lab_tech',
                key: 'labTech',
                x: 1500,
                y: 370,
                patrol: { x: 1620, duration: 1500, delay: 200 },
                bodyWidth: 30,
                bodyHeight: 56,
            },
            {
                type: 'crusher',
                x: 1940,
                y: 250,
                slamY: 340,
                duration: 760,
                hold: 280,
                delay: 200,
            },
            {
                type: 'bonk',
                enemy: 'specimen',
                key: 'specimen',
                x: 2420,
                y: 400,
                bobAmplitude: 22,
                bobDuration: 860,
                bodyWidth: 32,
                bodyHeight: 46,
            },
        ],
    },
    6: {
        instructions:
            'RED REACH - Gold shells are springs. Stomp the marked beetle to cross the canyon. Dust, boulders, and steam are not. (M toggles music)',
        touchInstructions: 'RED REACH - Stomp a gold shell to bounce. Arrows move, jump leaps.',
        background: {
            type: 'mars',
            style: 'redReach',
            starCount: 80,
            color: 0x3a120c,
            palette: {
                top: 0x2a0c14,
                mid: 0xc45a3a,
                bottom: 0xf0b56a,
                surface: 0xc4623a,
                dune: 0x9a3d28,
                highlight: 0xffd0a4,
                shadow: 0x4a1c16,
                dust: 0xffb15a,
            },
        },
        staticPlatforms: [
            { x: 200, y: 620, key: 'mesa', scaleX: 3.6, scaleY: 1 },
            { x: 1334, y: 648, key: 'mesa', scaleX: 2.8, scaleY: 1 },
            { x: 1700, y: 560, key: 'mesa', scaleX: 2.2, scaleY: 1 },
            { x: 2060, y: 470, key: 'mesa', scaleX: 2.2, scaleY: 1 },
            { x: 2400, y: 380, key: 'mesa', scaleX: 2.0, scaleY: 1 },
            { x: 2720, y: 300, key: 'mesa', scaleX: 2.0, scaleY: 1 },
            { x: 3000, y: 220, key: 'mesa', scaleX: 1.4, scaleY: 1 },
        ],
        floor: null,
        moving: [],
        rocks: [{ x: 1450, y: 620, key: 'marsSpike' }],
        props: [{ x: 120, y: 586, key: 'bonkSign' }],
        dynamic: [
            {
                type: 'bonk',
                enemy: 'beetle',
                key: 'beetle',
                x: 480,
                y: 657,
                patrol: { x: 540, duration: 1800 },
                bodyWidth: 44,
                bodyHeight: 34,
            },
            {
                type: 'dustDevil',
                x: 1560,
                y: 560,
                patrol: { x: 1640, duration: 1500 },
            },
            {
                type: 'bonk',
                enemy: 'beetle',
                key: 'beetle',
                x: 1660,
                y: 527,
                patrol: { x: 1760, duration: 1500, delay: 180 },
                bodyWidth: 44,
                bodyHeight: 34,
            },
            {
                type: 'roller',
                x: 2000,
                y: 434,
                patrol: { x: 2120, duration: 1400 },
                spinDuration: 640,
            },
            {
                type: 'laser',
                x: 2400,
                y: 310,
                length: 80,
                width: 16,
                orientation: 'vertical',
                tint: 0xffb15a,
                onDuration: 780,
                offDuration: 1180,
                startDelay: 160,
            },
            {
                type: 'bonk',
                enemy: 'hopper',
                key: 'hopper',
                x: 2860,
                y: 400,
                bobAmplitude: 18,
                bobDuration: 700,
                bodyWidth: 24,
                bodyHeight: 52,
            },
        ],
    },
    7: {
        instructions:
            'EARTHWATCH - On the station hull, with Earth below. Aliens run at you. Face them and press F or J to fire the space phaser. Gamepad uses the left face button. (M toggles music)',
        touchInstructions:
            'EARTHWATCH - On the station. Aliens run at you. The bolt button fires the space phaser. Arrows move, jump leaps.',
        background: {
            type: 'iss',
            style: 'earthwatch',
            starCount: 90,
            color: 0x071018,
            palette: {
                top: 0x02040c,
                mid: 0x0a1c33,
                ocean: 0x1a6cae,
                land: 0x3f9a45,
                landDeep: 0x1f6a32,
                cloud: 0xf4fbff,
                atmosphere: 0x9ad7ff,
                hull: 0xc5d0dc,
                array: 0x1d4e89,
            },
        },
        staticPlatforms: [
            { x: 520, y: 616, key: 'issHull', scaleX: 8.2 },
            { x: 1540, y: 616, key: 'issHull', scaleX: 8.2 },
            { x: 2560, y: 616, key: 'issHull', scaleX: 8.2 },
            { x: 3480, y: 616, key: 'issHull', scaleX: 6.4 },
            { x: 3520, y: 470, key: 'issHull', scaleX: 4.5 },
        ],
        floor: null,
        moving: [],
        rocks: [],
        dynamic: [
            { type: 'boarder', x: 700, y: 540 },
            { type: 'boarder', x: 1120, y: 540 },
            { type: 'boarder', x: 1560, y: 540 },
            { type: 'boarder', x: 2040, y: 540 },
            { type: 'boarder', x: 2480, y: 540 },
            { type: 'boarder', x: 2920, y: 540 },
            { type: 'boarder', x: 3320, y: 540 },
            { type: 'boarder', x: 3600, y: 400 },
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
        this.props = content.props || [];
        this.phaser = def.PHASER === true;
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
