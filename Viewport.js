import { computeLayoutMetrics, fitFontSize } from './HudLayout.js';

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
        return computeLayoutMetrics(this.getWidth(), this.getHeight(), insets);
    }

    fitFontSize(baseSize, contentWidth, maxWidth, minSize = 16) {
        return fitFontSize(baseSize, contentWidth, maxWidth, minSize);
    }
}
