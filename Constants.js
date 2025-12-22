// Game Constants for SpaceChicken
export const GAME_CONSTANTS = {
    // Physics
    PHYSICS_GRAVITY: { x: 0, y: 300 },
    DEBUG_MODE: false,

    // Player
    PLAYER_VELOCITY_X: 160,
    JUMP_VELOCITY_Y: -330,
    MAX_JUMPS: 2,
    PLAYER_CLAMP_OFFSET: 0.5,

    // Audio
    MUSIC_VOLUME: 0.18,
    EFFECTS_VOLUME: 0.4,
    AUDIO_UNLOCK_TOLERANCE: 0.05,
    AUDIO_FADE_TIME: 0.05,

    // UI Layout
    TIMER_FORMAT: 'Time: %M:%S.%MS',
    DOUBLE_TAP_THRESHOLD: 350,
    RESTART_DELAY: 500,
    OVERLAY_DEPTH: 10000,
    MUSIC_BUTTON_DEPTH: 10002,
    LEADERBOARD_BUTTON_DEPTH: 10002,
    JUMP_BUTTON_DEPTH: 10001,
    LEADERBOARD_OVERLAY_DEPTH: 10001,

    // World Bounds
    SAFE_AREA_FALLBACK: { top: 0, right: 0, bottom: 0, left: 0 },

    // Input
    JUMP_BUTTON_TOUCH_TOLERANCE: 200,
    MOVEMENT_MIDPOINT_RATIO: 0.5,

    // Hazard Timing (lasers)
    LASER_DEFAULT_ON_DURATION: 1200,
    LASER_DEFAULT_OFF_DURATION: 900,
    LASER_DEFAULT_START_DELAY: 0,

    // Animation
    WALK_FRAME_RATE: 8,
    JETPACK_FRAME_RATE: 12,
    BOB_DEFAULT_DURATION: 1000,
    BOB_DEFAULT_EASE: 'Sine.easeInOut',
    SPIN_DEFAULT_DURATION: 1600,
    SPIN_DEFAULT_EASE: 'Sine.easeInOut',

    // Platform Config
    PLATFORM_DEFAULT_SCALE: { x: 1, y: 1 },
    FLOOR_PLATFORM_SCALE: { x: 1.5, y: 0.3 },

    // Level-specific constants
    LEVEL_DEFAULT_WORLD_SIZE: { width: 2000, height: 700 },
    LEVEL_KILLZONE_Y: 620,
    LEVEL_KILLZONE_HEIGHT: 20,

    // Bomb settings defaults
    BOMB_DEFAULT_SPEED: 150,
    BOMB_DEFAULT_DELAY_MIN: 1000,
    BOMB_DEFAULT_DELAY_MAX: 5000,
    BOMB_DEFAULT_SPAWN_HEIGHT: -50,
    BOMB_DEFAULT_SPREAD: Math.PI / 6,
    BOMB_DEFAULT_GRAVITY_Y: 0,
    BOMB_CLEANUP_THRESHOLD_Y: 100,

    // Storage and Leaderboard
    LEADERBOARD_MAX_ENTRIES: 5,
    STORAGE_LEVEL_PREFIX: 'spaceChickenLevel',

    // Config
    FIREBASE_ENDPOINT_CONFIG: 'SPACE_CHICKEN_CONFIG.firebaseEndpoint',

    // Background
    BACKGROUND_STAR_COUNT_DEFAULT: 100,
    BACKGROUND_PLANET_COUNT_DEFAULT: 5,

    // Touch Controls
    TOUCH_CONTROL_MARGIN: 24,
    VIRTUAL_BUTTON_SIZE: 64,
};

export const KEY_CODES = {
    M: Phaser.Input.Keyboard.KeyCodes.M,
    SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
};

export const AUDIO_SETTINGS = {
    MUSIC_MUTED_KEY: 'spaceChickenMusicMuted',
    PLAYER_NAME_KEY: 'spaceChickenPlayerName',
    BACKGROUND_LOOP_PADDING: 0.4,
};

export const LEVEL_DEFINITIONS = {
    1: {
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
    2: {
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
    3: {
        GRAVITY: 260,
        WORLD_WIDTH: 2200,
        WORLD_HEIGHT: 900,
        KILLZONE_Y: 860,
        PLAYER_START_X: 200,
        PLAYER_START_Y: 760,
        CROWN_X: 2050,
        CROWN_Y: 220,
        FLOOR_Y: null, // No floor, uses static platforms
        BOMB_SPEED: 260,
        KILLZONE_HEIGHT: 40,
        NEXT_LEVEL: null,
    },
};
