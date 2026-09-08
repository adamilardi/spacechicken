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
    PLAYER_BOUNCE: 0,
    LAND_MIN_AIR_MS: 120,
    LAND_MIN_SPEED_Y: 90,

    // Audio
    MUSIC_VOLUME: 0.18,
    EFFECTS_VOLUME: 0.48,
    AUDIO_UNLOCK_TOLERANCE: 0.05,
    AUDIO_FADE_TIME: 0.05,

    // UI Layout
    DOUBLE_TAP_THRESHOLD: 350,
    RESTART_DELAY: 500,
    DEATH_TRANSITION_DELAY: 320,
    LEVEL_TRANSITION_DELAY: 640,
    OVERLAY_DEPTH: 10000,
    MUSIC_BUTTON_DEPTH: 10002,
    LEADERBOARD_BUTTON_DEPTH: 10002,
    JUMP_BUTTON_DEPTH: 10001,
    MOVE_BUTTON_DEPTH: 10001,
    LEADERBOARD_OVERLAY_DEPTH: 10001,
    HUD_COMPACT_WIDTH: 640,
    HUD_COMPACT_HEIGHT: 500,
    HUD_TINY_WIDTH: 360,
    HUD_TINY_HEIGHT: 360,
    HUD_REFERENCE_SHORT_SIDE: 720,
    HUD_SCALE_MIN: 0.58,
    HUD_SCALE_MAX: 1.1,

    // World Bounds
    SAFE_AREA_FALLBACK: { top: 0, right: 0, bottom: 0, left: 0 },

    // Input
    JUMP_BUTTON_TOUCH_TOLERANCE: 200,
    MOVEMENT_MIDPOINT_RATIO: 0.5,
    TOUCH_HIT_PADDING: 22,
    TOUCH_POINTER_TOTAL: 4,
    CAMERA_TOUCH_FOLLOW_OFFSET_RATIO: 0.38,
    CAMERA_TOUCH_FOLLOW_OFFSET_LANDSCAPE_RATIO: 0.92,

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

    // Feel / juice
    CAMERA_LERP_X: 0.14,
    CAMERA_LERP_Y: 0.16,
    CAMERA_FADE_IN: 420,
    CAMERA_SHAKE_DURATION: 200,
    CAMERA_SHAKE_INTENSITY: 0.012,
    CAMERA_FLASH_DEATH: 180,
    CAMERA_FLASH_COLLECT: 280,
    CAMERA_WIN_ZOOM: 1.12,
    CAMERA_WIN_ZOOM_DURATION: 520,
    SQUASH_DURATION: 80,
    STRETCH_DURATION: 90,
    LAND_DUST_COUNT: 8,
    JUMP_PUFF_COUNT: 5,
    DEATH_BURST_COUNT: 18,
    COLLECT_BURST_COUNT: 20,
    JETPACK_EMIT_INTERVAL: 45,
    CROWN_SPARKLE_INTERVAL: 480,
    INSTRUCTION_DISPLAY_MS: 5600,
    INSTRUCTION_FADE_MS: 420,
    LEVEL_BANNER_HOLD_MS: 1600,
    TITLE_PROMPT_PULSE_MS: 900,

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
    BOMB_POOL_SIZE: 8,
    PARTICLE_POOL_SIZE: 64,

    // Storage and Leaderboard
    LEADERBOARD_MAX_ENTRIES: 5,
    STORAGE_LEVEL_PREFIX: 'spaceChickenLevel',
    PLAYER_NAME_MAX_LENGTH: 24,

    // Config
    FIREBASE_ENDPOINT_CONFIG: 'SPACE_CHICKEN_CONFIG.firebaseEndpoint',

    // Background
    BACKGROUND_STAR_COUNT_DEFAULT: 100,
    BACKGROUND_PLANET_COUNT_DEFAULT: 5,

    // Touch Controls
    TOUCH_CONTROL_MARGIN: 24,
    VIRTUAL_BUTTON_SIZE: 64,
    CONTROL_SIZE_MIN: 72,
    CONTROL_SIZE_COMPACT: 80,
    CONTROL_SIZE_MAX: 108,
    CONTROL_SIZE_RATIO: 0.145,
    MUSIC_BUTTON_SIZE: 48,
    MUSIC_BUTTON_SIZE_COMPACT: 52,
};

export const KEY_CODES = {
    M: 77,
    SPACE: 32,
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
        NEXT_LEVEL: 4,
    },
    4: {
        // Moon level - low gravity, rovers + cosmic rays
        GRAVITY: 180,
        WORLD_WIDTH: 2800,
        WORLD_HEIGHT: 800,
        KILLZONE_Y: 760,
        PLAYER_START_X: 120,
        PLAYER_START_Y: 620,
        CROWN_X: 2550,
        CROWN_Y: 280,
        // No floor (intentionally platform-only level for rovers)
        BOMB_SPEED: 180,
        KILLZONE_HEIGHT: 30,
        NEXT_LEVEL: null,
    },
};

// Keep every level-aware subsystem (scene progression, audio, and leaderboards)
// on the same source of truth instead of maintaining separate hard-coded lists.
export const LEVEL_IDS = Object.freeze(
    Object.keys(LEVEL_DEFINITIONS)
        .map(Number)
        .sort((a, b) => a - b)
);
