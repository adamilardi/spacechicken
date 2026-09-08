import { GAME_CONSTANTS } from './Constants.js';

export class Viewport {
    constructor(scene) {
        this.scene = scene;
    }

    get scale() {
        return this.scene.scale;
    }

    get sys() {
        return this.scene.sys;
    }

    get viewportWidth() {
        return this.scene.viewportWidth;
    }

    get viewportHeight() {
        return this.scene.viewportHeight;
    }

    getScaleDimension(dimension) {
        const scale = this.scale;
        if (!scale) {
            return null;
        }
        const gameSize = scale.gameSize;
        if (gameSize && typeof gameSize[dimension] === 'number') {
            return gameSize[dimension];
        }
        if (typeof scale[dimension] === 'number') {
            return scale[dimension];
        }
        return null;
    }

    getVisualDimension(dimension) {
        if (typeof window === 'undefined') {
            return null;
        }
        const visual = window.visualViewport;
        if (visual) {
            const visualValue = visual[dimension];
            if (typeof visualValue === 'number' && visualValue > 0) {
                return visualValue;
            }
        }
        if (
            dimension === 'width' &&
            typeof window.innerWidth === 'number' &&
            window.innerWidth > 0
        ) {
            return window.innerWidth;
        }
        if (
            dimension === 'height' &&
            typeof window.innerHeight === 'number' &&
            window.innerHeight > 0
        ) {
            return window.innerHeight;
        }
        return null;
    }

    getBaseDimension(dimension) {
        const scaleValue = this.getScaleDimension(dimension);
        if (typeof scaleValue === 'number' && scaleValue > 0) {
            return scaleValue;
        }
        const configValue = this.getConfigDimension(dimension);
        if (typeof configValue === 'number' && configValue > 0) {
            return configValue;
        }
        const visualValue = this.getVisualDimension(dimension);
        if (typeof visualValue === 'number' && visualValue > 0) {
            return visualValue;
        }
        return dimension === 'width' ? 800 : 600;
    }

    getConfigDimension(dimension) {
        const sys = this.sys;
        if (!sys || !sys.game || !sys.game.config) {
            return null;
        }
        const value = sys.game.config[dimension];
        return typeof value === 'number' ? value : null;
    }

    getBaseWidth() {
        return this.getBaseDimension('width');
    }

    getBaseHeight() {
        return this.getBaseDimension('height');
    }

    getWidth() {
        if (typeof this.viewportWidth === 'number' && this.viewportWidth > 0) {
            return this.viewportWidth;
        }
        return this.getBaseWidth();
    }

    getHeight() {
        if (typeof this.viewportHeight === 'number' && this.viewportHeight > 0) {
            return this.viewportHeight;
        }
        return this.getBaseHeight();
    }

    getLayoutMetrics(insets) {
        const safeInsets = insets || GAME_CONSTANTS.SAFE_AREA_FALLBACK;
        const width = this.getWidth();
        const height = this.getHeight();
        const innerWidth = Math.max(1, width - (safeInsets.left || 0) - (safeInsets.right || 0));
        const innerHeight = Math.max(1, height - (safeInsets.top || 0) - (safeInsets.bottom || 0));
        const shortest = Math.min(innerWidth, innerHeight);
        const isPortrait = innerHeight > innerWidth;
        const isCompact =
            innerWidth < GAME_CONSTANTS.HUD_COMPACT_WIDTH ||
            innerHeight < GAME_CONSTANTS.HUD_COMPACT_HEIGHT;
        const isTiny =
            innerWidth < GAME_CONSTANTS.HUD_TINY_WIDTH ||
            innerHeight < GAME_CONSTANTS.HUD_TINY_HEIGHT;
        const hudScale = Math.min(
            GAME_CONSTANTS.HUD_SCALE_MAX,
            Math.max(
                GAME_CONSTANTS.HUD_SCALE_MIN,
                shortest / GAME_CONSTANTS.HUD_REFERENCE_SHORT_SIDE
            )
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
                level: Math.round(22 * appliedScale),
                death: Math.round(18 * appliedScale),
                instructions: Math.round(16 * appliedScale),
                playerName: Math.round(18 * appliedScale),
                leaderboardButton: Math.round(18 * appliedScale),
                leaderboard: Math.round(16 * appliedScale),
                title: Math.round(56 * appliedScale),
                subtitle: Math.round(22 * appliedScale),
                prompt: Math.round(20 * appliedScale),
                banner: Math.round(42 * appliedScale),
                bannerSubtitle: Math.round(20 * appliedScale),
            },
        };
    }

    fitFontSize(baseSize, contentWidth, maxWidth, minSize = 16) {
        if (!contentWidth || contentWidth <= maxWidth) {
            return baseSize;
        }
        return Math.max(minSize, Math.floor(baseSize * (maxWidth / contentWidth)));
    }
}
