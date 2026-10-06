import { GAME_CONSTANTS } from './Constants.js';
import { LEVEL_CONTENT, LEVEL_DEFINITIONS } from './levels/index.js';
import { DAWN_PALETTE, DEFAULT_INSTRUCTIONS, DEFAULT_TOUCH_INSTRUCTIONS } from './levels/shared.js';

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
        this.crownShield = def.CROWN_SHIELD === true;
    }
}
