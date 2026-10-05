import { GAME_CONSTANTS } from '../Constants.js';
import { DEFAULT_INSTRUCTIONS, DEFAULT_TOUCH_INSTRUCTIONS } from './shared.js';

export const level = {
    id: 2,
    definition: {
        TITLE: 'Arcade Orbit',
        GRAVITY: 400,
        WORLD_WIDTH: 3000,
        WORLD_HEIGHT: 700,
        KILLZONE_Y: 620,
        PLAYER_START_X: 100,
        PLAYER_START_Y: 450,
        CROWN_X: 2800,
        CROWN_Y: 350,
        FLOOR_Y: 580,
        BOMB_SPEED: 200,
        NEXT_LEVEL: 3,
    },
    content: {
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
};
