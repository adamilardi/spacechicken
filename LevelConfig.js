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
            height: this.config.worldHeight || GAME_CONSTANTS.LEVEL_DEFAULT_WORLD_SIZE.height
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
            y: this.config.playerStartY
        };
    }

    get crown() {
        return {
            x: this.config.crownX,
            y: this.config.crownY
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
            moving: this.getMovingPlatforms()
        };
    }

    get hazards() {
        return {
            rocks: this.getRockHazards(),
            dynamic: this.getDynamicHazards()
        };
    }

    get bombs() {
        return {
            speed: this.config.bombSpeed || GAME_CONSTANTS.BOMB_DEFAULT_SPEED,
            delayMin: GAME_CONSTANTS.BOMB_DEFAULT_DELAY_MIN,
            delayMax: GAME_CONSTANTS.BOMB_DEFAULT_DELAY_MAX,
            spawnHeight: GAME_CONSTANTS.BOMB_DEFAULT_SPAWN_HEIGHT,
            spread: GAME_CONSTANTS.BOMB_DEFAULT_SPREAD,
            gravityY: GAME_CONSTANTS.BOMB_DEFAULT_GRAVITY_Y
        };
    }

    getLevelConfig(level) {
        const def = LEVEL_DEFINITIONS[level];
        if (!def) {
            throw new Error(`Level ${level} configuration not found`);
        }
        return def;
    }

    getDefaultInstructions() {
        switch (this.level) {
            case 1:
                return 'Space Chicken - WASD to move, Space to jump, M toggles music\nCollect the golden crown!';
            case 2:
                return 'Space Chicken - WASD to move, Space to jump, M toggles music\nCollect the golden crown!';
            case 3:
                return 'Orbital Gauntlet - Ride the lifts, dodge lasers, claim the crown! (Press M to toggle music)';
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
            default:
                return 'Space Chicken - Touch left half for left, right half for right\nTap jump to leap, tap the speaker to toggle music\nCollect the golden crown!';
        }
    }

    getBackgroundConfig() {
        switch (this.level) {
            case 1:
                return {
                    type: 'space',
                    starCount: GAME_CONSTANTS.BACKGROUND_STAR_COUNT_DEFAULT,
                    planetCount: GAME_CONSTANTS.BACKGROUND_PLANET_COUNT_DEFAULT,
                    color: 0x000000
                };
            case 2:
                return {
                    type: 'space',
                    starCount: 150,
                    planetCount: 8,
                    color: 0x000000
                };
            case 3:
                return {
                    type: 'station',
                    starCount: 110,
                    planetCount: 1,
                    color: 0x050914,
                    disablePlanet: false
                };
            default:
                return {
                    type: 'space',
                    starCount: GAME_CONSTANTS.BACKGROUND_STAR_COUNT_DEFAULT,
                    planetCount: GAME_CONSTANTS.BACKGROUND_PLANET_COUNT_DEFAULT,
                    color: 0x000000
                };
        }
    }

    getStaticPlatforms() {
        switch (this.level) {
            case 1:
                return [
                    { x: 400, y: 568 },
                    { x: 800, y: 500 },
                    { x: 1200, y: 400 }
                ];
            case 2:
                return [
                    { x: 400, y: 568 },
                    { x: 800, y: 500 },
                    { x: 1200, y: 400 },
                    { x: 1600, y: 300 },
                    { x: 2000, y: 200 },
                    { x: 2400, y: 400 },
                    { x: 2800, y: 500 }
                ];
            case 3:
                return [
                    { x: 220, y: 780, key: 'stationPanel', scaleX: 2.4, scaleY: 0.4 },
                    { x: 520, y: 690, key: 'stationPanel', scaleX: 1.6, scaleY: 0.4 },
                    { x: 960, y: 560, key: 'stationPanel', scaleX: 1.6, scaleY: 0.4 },
                    { x: 1440, y: 430, key: 'stationPanel', scaleX: 1.6, scaleY: 0.4 },
                    { x: 1920, y: 320, key: 'stationPanel', scaleX: 1.2, scaleY: 0.4 }
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
                    condition: (x) => x < 350 || (x > 450 && x < 650) || (x > 750 && x < 950) || x > 1050
                };
            case 2:
                return {
                    y: 580,
                    step: 100,
                    scaleX: GAME_CONSTANTS.FLOOR_PLATFORM_SCALE.x,
                    scaleY: GAME_CONSTANTS.FLOOR_PLATFORM_SCALE.y,
                    condition: (x) => x < 350 || (x > 450 && x < 550) || (x > 650 && x < 750) || (x > 850 && x < 1050) || (x > 1150 && x < 1350) || (x > 1450 && x < 1650) || (x > 1750 && x < 1950) || x > 2050
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
                    { x: 320, y: 780, key: 'liftPlatform', scaleX: 1.2, scaleY: 0.4, tween: { y: 640, duration: 2200 } },
                    { x: 760, y: 640, key: 'liftPlatform', scaleX: 1.2, scaleY: 0.4, tween: { y: 500, duration: 2400, delay: 300 } },
                    { x: 1180, y: 500, key: 'liftPlatform', scaleX: 1.2, scaleY: 0.4, tween: { x: 1380, duration: 2600 } },
                    { x: 1680, y: 360, key: 'liftPlatform', scaleX: 1.2, scaleY: 0.4, tween: { y: 260, duration: 2000, delay: 500 } }
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
                    { x: 1000, y: 568 }
                ];
            case 2:
                return [
                    { x: 600, y: 568 },
                    { x: 1000, y: 568 },
                    { x: 1400, y: 568 },
                    { x: 1800, y: 568 },
                    { x: 2200, y: 568 }
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
                    { type: 'laser', x: 520, y: 650, length: 260, width: 12, onDuration: GAME_CONSTANTS.LASER_DEFAULT_ON_DURATION, offDuration: GAME_CONSTANTS.LASER_DEFAULT_OFF_DURATION, startDelay: 400 },
                    { type: 'laser', x: 1420, y: 460, length: 320, width: 12, onDuration: 1200, offDuration: 1000, startDelay: 0 },
                    { type: 'laser', x: 1760, y: 320, length: 220, width: 10, orientation: 'vertical', onDuration: 900, offDuration: 900, startDelay: 600 },
                    { type: 'drone', x: 900, y: 520, patrol: { x: 1120, duration: 2600, ease: 'Sine.easeInOut' }, bobAmplitude: 18, bobDuration: GAME_CONSTANTS.BOB_DEFAULT_DURATION, spin: 6 },
                    { type: 'drone', x: 1550, y: 360, patrol: { x: 1770, duration: 2200, ease: 'Sine.easeInOut', delay: 400 }, bobAmplitude: 22, bobDuration: 900, spin: { angle: 12, duration: GAME_CONSTANTS.SPIN_DEFAULT_DURATION } }
                ];
            default:
                return [];
        }
    }
}
