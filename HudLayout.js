import { GAME_CONSTANTS } from './Constants.js';

// Pure HUD-layout math shared by the scene and the UI manager.
//
// Viewport owns the dimension-resolution chain (Phaser scale -> game config ->
// visual viewport -> fallback). Once a concrete width/height pair is known,
// everything below is a pure function of (width, height, insets) so it can be
// unit-tested without a Phaser scene.
export function computeLayoutMetrics(width, height, insets) {
    const safeInsets = insets || GAME_CONSTANTS.SAFE_AREA_FALLBACK;
    const innerWidth = Math.max(1, width - (safeInsets.left || 0) - (safeInsets.right || 0));
    const innerHeight = Math.max(1, height - (safeInsets.top || 0) - (safeInsets.bottom || 0));
    const shortest = Math.min(innerWidth, innerHeight);
    const isPortrait = innerHeight > innerWidth;
    const isCompact =
        innerWidth < GAME_CONSTANTS.HUD_COMPACT_WIDTH ||
        innerHeight < GAME_CONSTANTS.HUD_COMPACT_HEIGHT;
    const isTiny =
        innerWidth < GAME_CONSTANTS.HUD_TINY_WIDTH || innerHeight < GAME_CONSTANTS.HUD_TINY_HEIGHT;
    const hudScale = Math.min(
        GAME_CONSTANTS.HUD_SCALE_MAX,
        Math.max(GAME_CONSTANTS.HUD_SCALE_MIN, shortest / GAME_CONSTANTS.HUD_REFERENCE_SHORT_SIDE)
    );
    const appliedScale = isTiny
        ? Math.min(hudScale, 0.68)
        : isCompact
          ? Math.min(hudScale, 0.82)
          : 1;
    const controlMin = isCompact
        ? GAME_CONSTANTS.CONTROL_SIZE_COMPACT
        : GAME_CONSTANTS.CONTROL_SIZE_MIN;
    const controlSize = Math.round(
        Math.min(
            GAME_CONSTANTS.CONTROL_SIZE_MAX,
            Math.max(controlMin, shortest * GAME_CONSTANTS.CONTROL_SIZE_RATIO)
        )
    );
    const controlMargin = Math.round(
        Math.min(
            28,
            Math.max(10, shortest * 0.028, GAME_CONSTANTS.TOUCH_CONTROL_MARGIN * appliedScale)
        )
    );
    return {
        width,
        height,
        innerWidth,
        innerHeight,
        shortest,
        isPortrait,
        isCompact,
        isTiny,
        hudScale: appliedScale,
        controlSize,
        controlMargin,
        hudPadding: isCompact ? 10 : 16,
        musicButtonSize: isCompact
            ? GAME_CONSTANTS.MUSIC_BUTTON_SIZE_COMPACT
            : GAME_CONSTANTS.MUSIC_BUTTON_SIZE,
        fonts: {
            timer: Math.round(32 * appliedScale),
            level: Math.max(16, Math.round(22 * appliedScale)),
            death: Math.max(14, Math.round(18 * appliedScale)),
            instructions: Math.max(14, Math.round(16 * appliedScale)),
            playerName: Math.max(14, Math.round(18 * appliedScale)),
            leaderboardButton: Math.max(16, Math.round(18 * appliedScale)),
            leaderboard: Math.max(14, Math.round(16 * appliedScale)),
            title: Math.round(56 * appliedScale),
            subtitle: Math.max(16, Math.round(22 * appliedScale)),
            prompt: Math.max(16, Math.round(20 * appliedScale)),
            banner: Math.round(42 * appliedScale),
            bannerSubtitle: Math.round(20 * appliedScale),
        },
    };
}

// Fit one bottom-row control so `across` buttons plus their gaps and
// margins stay inside the inner width. Levels without fire size three
// across; phaser levels size four. Never below the 44px touch minimum
// that verify-mobile asserts for every button.
export function fitRowControlSize(controlSize, innerWidth, margin, gap, across) {
    const count = Math.max(1, across);
    return Math.min(
        controlSize,
        Math.max(44, Math.floor((innerWidth - margin * 2 - gap * (count - 1)) / count))
    );
}

export function fitFontSize(baseSize, contentWidth, maxWidth, minSize = 16) {
    if (!contentWidth || contentWidth <= maxWidth) {
        return baseSize;
    }
    return Math.max(minSize, Math.floor(baseSize * (maxWidth / contentWidth)));
}
