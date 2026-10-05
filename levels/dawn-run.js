import { GAME_CONSTANTS } from '../Constants.js';
import { DAWN_PALETTE, DEFAULT_INSTRUCTIONS, DEFAULT_TOUCH_INSTRUCTIONS } from './shared.js';

export const level = {
    id: 1,
    definition: {
        TITLE: 'Dawn Run',
        GRAVITY: 300,
        WORLD_WIDTH: 2000,
        WORLD_HEIGHT: 700,
        KILLZONE_Y: 620,
        PLAYER_START_X: 100,
        PLAYER_START_Y: 450,
        CROWN_X: 1800,
        CROWN_Y: 350,
        FLOOR_Y: 580,
        BOMB_SPEED: 150,
        NEXT_LEVEL: 2,
    },
    content: {
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
};
