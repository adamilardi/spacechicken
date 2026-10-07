export const GAME_CONSTANTS = {
    PHYSICS_GRAVITY: { x: 0, y: 300 },

    PLAYER_VELOCITY_X: 160,
    JUMP_VELOCITY_Y: -330,
    BONK_JUMP_VELOCITY_Y: -520,
    BONK_MIN_FALL_SPEED: 30,
    BONK_STUN_MS: 700,
    BONK_HITSTOP_MS: 32,
    PHASER_COOLDOWN_MS: 220,
    PHASER_BOLT_SPEED: 560,
    PHASER_RANGE: 820,
    PHASER_POOL_SIZE: 10,
    BOARDER_SPEED: 190,
    BOARDER_HOP_VELOCITY_Y: -320,
    BOARDER_HOP_RANGE_X: 230,
    BOARDER_HOP_CLEARANCE: 48,
    BOARDER_AGGRO_X: 280,
    BOARDER_AGGRO_Y: 260,
    BOARDER_SEPARATION: 42,
    BOARDER_GRACE_MS: 700,
    BOARDER_WAVES: Object.freeze([
        Object.freeze({ wave: 1, x: 0 }),
        Object.freeze({ wave: 2, x: 1300 }),
        Object.freeze({ wave: 3, x: 2200 }),
        Object.freeze({ wave: 4, x: 3000 }),
    ]),
    MAX_JUMPS: 2,
    COYOTE_MS: 110,
    JUMP_BUFFER_MS: 130,
    BOMB_TRAIL_INTERVAL_MS: 80,
    BOARDER_AGGRO_FLASH_MS: 160,
    PLAYER_CLAMP_OFFSET: 0.5,
    PLAYER_BOUNCE: 0,
    LAND_MIN_AIR_MS: 120,
    LAND_MIN_SPEED_Y: 90,

    MUSIC_VOLUME: 0.18,
    EFFECTS_VOLUME: 0.48,
    AUDIO_UNLOCK_TOLERANCE: 0.05,
    AUDIO_FADE_TIME: 0.05,
    MUSIC_DUCK_MS: 200,
    HAPTIC_BONK_MS: 28,
    HAPTIC_DEATH_MS: 90,
    HAPTIC_CROWN_MS: 46,
    COACH_BONK_KEY: 'spaceChickenCoachBonk',
    COACH_PHASER_KEY: 'spaceChickenCoachPhaser',

    DOUBLE_TAP_THRESHOLD: 350,
    // With no gamepad connected, re-check for one this often instead of
    // calling navigator.getGamepads() every frame (touch devices pay ~nothing).
    GAMEPAD_SLOW_POLL_FRAMES: 30,
    RESTART_DELAY: 500,
    DEATH_TRANSITION_DELAY: 320,
    LEVEL_TRANSITION_DELAY: 640,
    RACE_FINALE_MS: 1700,
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

    SAFE_AREA_FALLBACK: { top: 0, right: 0, bottom: 0, left: 0 },

    JUMP_BUTTON_TOUCH_TOLERANCE: 200,
    MOVEMENT_MIDPOINT_RATIO: 0.5,
    TOUCH_HIT_PADDING: 22,
    TOUCH_POINTER_TOTAL: 4,
    CAMERA_TOUCH_FOLLOW_OFFSET_RATIO: 0.38,
    CAMERA_TOUCH_FOLLOW_OFFSET_LANDSCAPE_RATIO: 0.92,

    LASER_DEFAULT_ON_DURATION: 1200,
    LASER_DEFAULT_OFF_DURATION: 900,
    LASER_DEFAULT_START_DELAY: 0,

    WALK_FRAME_RATE: 8,
    JETPACK_FRAME_RATE: 12,
    BOB_DEFAULT_DURATION: 1000,
    BOB_DEFAULT_EASE: 'Sine.easeInOut',
    SPIN_DEFAULT_DURATION: 1600,
    SPIN_DEFAULT_EASE: 'Sine.easeInOut',

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
    TWINKLE_STAR_COUNT: 6,
    BACKGROUND_BAKE_MAX_WIDTH: 2048,
    BACKGROUND_BAKE_MAX_HEIGHT: 1024,
    // Extra pixels so camera rounding cannot expose a gap at the layer edge.
    BACKGROUND_PARALLAX_PADDING: 8,
    BACKGROUND_PARALLAX_LAYERS: Object.freeze([
        Object.freeze({ id: 'sky', scrollX: 0.05, scrollY: 1, depth: -40 }),
        Object.freeze({ id: 'far', scrollX: 0.16, scrollY: 1, depth: -32 }),
        Object.freeze({ id: 'mid', scrollX: 0.4, scrollY: 1, depth: -24 }),
        Object.freeze({ id: 'near', scrollX: 0.7, scrollY: 1, depth: -16 }),
    ]),
    // Dawn Run and Arcade Orbit drift much closer to the playfield.
    // Vertical factor stays locked so the floor does not slide against the platforms.
    BACKGROUND_PARALLAX_LAYERS_GENTLE: Object.freeze([
        Object.freeze({ id: 'sky', scrollX: 0.82, scrollY: 1, depth: -40 }),
        Object.freeze({ id: 'far', scrollX: 0.86, scrollY: 1, depth: -32 }),
        Object.freeze({ id: 'mid', scrollX: 0.9, scrollY: 1, depth: -24 }),
        Object.freeze({ id: 'near', scrollX: 0.95, scrollY: 1, depth: -16 }),
    ]),

    FLOOR_PLATFORM_SCALE: { x: 1.5, y: 0.3 },
    FLOOR_TILE_SIZE: 64,

    LEVEL_DEFAULT_WORLD_SIZE: { width: 2000, height: 700 },
    LEVEL_KILLZONE_Y: 620,
    LEVEL_KILLZONE_HEIGHT: 20,

    BOMB_DEFAULT_SPEED: 150,
    BOMB_DEFAULT_DELAY_MIN: 1000,
    BOMB_DEFAULT_DELAY_MAX: 5000,
    BOMB_DEFAULT_SPAWN_HEIGHT: -50,
    BOMB_DEFAULT_SPREAD: Math.PI / 6,
    BOMB_DEFAULT_GRAVITY_Y: 0,
    BOMB_CLEANUP_THRESHOLD_Y: 100,
    BOMB_POOL_SIZE: 8,
    PARTICLE_POOL_SIZE: 64,
    WARNING_POOL_SIZE: 8,

    LEADERBOARD_MAX_ENTRIES: 5,
    STORAGE_LEVEL_PREFIX: 'spaceChickenLevel',
    PLAYER_NAME_MAX_LENGTH: 24,

    BACKGROUND_STAR_COUNT_DEFAULT: 100,
    BACKGROUND_PLANET_COUNT_DEFAULT: 5,

    TOUCH_CONTROL_MARGIN: 24,
    VIRTUAL_BUTTON_SIZE: 64,
    CONTROL_SIZE_MIN: 72,
    CONTROL_SIZE_COMPACT: 80,
    CONTROL_SIZE_MAX: 108,
    CONTROL_SIZE_RATIO: 0.145,
    MUSIC_BUTTON_SIZE: 48,
    MUSIC_BUTTON_SIZE_COMPACT: 52,
};

export function parallaxLayersForLevel(level) {
    return Number(level) <= 2
        ? GAME_CONSTANTS.BACKGROUND_PARALLAX_LAYERS_GENTLE
        : GAME_CONSTANTS.BACKGROUND_PARALLAX_LAYERS;
}

export const KEY_CODES = {
    M: 77,
    SPACE: 32,
};

export const AUDIO_SETTINGS = {
    MUSIC_MUTED_KEY: 'spaceChickenMusicMuted',
    PLAYER_NAME_KEY: 'spaceChickenPlayerName',
    BACKGROUND_LOOP_PADDING: 0.4,
};
