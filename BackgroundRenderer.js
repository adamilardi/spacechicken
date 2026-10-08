import { GAME_CONSTANTS, parallaxLayersForLevel } from './Constants.js';
import { valueOrDefault } from './GameUtils.js';
import { adjustColor, blendColor } from './backgrounds/paint.js';
import { createBastionBackgroundLayout, renderBastionBackground } from './backgrounds/bastion.js';
import { createColonyBackgroundLayout, renderColonyBackground } from './backgrounds/colony.js';
import {
    createFacilityBackgroundLayout,
    renderFacilityBackground,
} from './backgrounds/facility.js';
import { createFoundryBackgroundLayout, renderFoundryBackground } from './backgrounds/foundry.js';
import { createHarborBackgroundLayout, renderHarborBackground } from './backgrounds/harbor.js';
import { createHiveBackgroundLayout, renderHiveBackground } from './backgrounds/hive.js';
import { createIssBackgroundLayout, renderIssBackground } from './backgrounds/iss.js';
import { createMarsBackgroundLayout, renderMarsBackground } from './backgrounds/mars.js';
import { createMoonBackgroundLayout, renderMoonBackground } from './backgrounds/moon.js';
import { createSkyhookBackgroundLayout, renderSkyhookBackground } from './backgrounds/skyhook.js';
import { createSpaceBackgroundLayout, renderSpaceBackground } from './backgrounds/space.js';
import { createSpireBackgroundLayout, renderSpireBackground } from './backgrounds/spire.js';
import { createStationBackgroundLayout, renderStationBackground } from './backgrounds/station.js';
import { createWombBackgroundLayout, renderWombBackground } from './backgrounds/womb.js';

const MAX_LAYOUT_CACHE = 12;

// Per-biome painters. `space` is the default for unknown/missing types,
// matching the historical if-chain fallthrough in ensureLayout/drawLayer.
const BIOME_LAYOUTS = {
    bastion: createBastionBackgroundLayout,
    colony: createColonyBackgroundLayout,
    facility: createFacilityBackgroundLayout,
    foundry: createFoundryBackgroundLayout,
    harbor: createHarborBackgroundLayout,
    hive: createHiveBackgroundLayout,
    iss: createIssBackgroundLayout,
    mars: createMarsBackgroundLayout,
    moon: createMoonBackgroundLayout,
    skyhook: createSkyhookBackgroundLayout,
    space: createSpaceBackgroundLayout,
    spire: createSpireBackgroundLayout,
    station: createStationBackgroundLayout,
    womb: createWombBackgroundLayout,
};

const BIOME_RENDERERS = {
    bastion: renderBastionBackground,
    colony: renderColonyBackground,
    facility: renderFacilityBackground,
    foundry: renderFoundryBackground,
    harbor: renderHarborBackground,
    hive: renderHiveBackground,
    iss: renderIssBackground,
    mars: renderMarsBackground,
    moon: renderMoonBackground,
    skyhook: renderSkyhookBackground,
    space: renderSpaceBackground,
    spire: renderSpireBackground,
    station: renderStationBackground,
    womb: renderWombBackground,
};

const TWINKLE_TINT = {
    facility: 0x7dffe2,
    mars: 0xffc27a,
    iss: 0xb7e3ff,
};

function twinkleTint(backgroundType) {
    return TWINKLE_TINT[backgroundType] || 0xffffff;
}

export class BackgroundRenderer {
    static layoutCache = new Map();

    constructor(scene) {
        this.scene = scene;
        this.graphics = null;
        this.image = null;
        this.layerSprites = [];
        this.twinkles = [];
        this.twinkleTweens = [];
        this.worldWidth = 0;
        this.worldHeight = 0;
        this.viewKey = '';
    }

    get level() {
        return this.scene.level;
    }

    get levelConfig() {
        return this.scene.levelConfig;
    }

    get add() {
        return this.scene.add;
    }

    get tweens() {
        return this.scene.tweens;
    }

    get textures() {
        return this.scene.textures;
    }

    resolveBakeSize(worldWidth, worldHeight) {
        const width = Math.max(1, Math.min(worldWidth, GAME_CONSTANTS.BACKGROUND_BAKE_MAX_WIDTH));
        const height = Math.max(
            1,
            Math.min(worldHeight, GAME_CONSTANTS.BACKGROUND_BAKE_MAX_HEIGHT)
        );
        return {
            width,
            height,
            scaleX: width / Math.max(1, worldWidth),
            scaleY: height / Math.max(1, worldHeight),
        };
    }

    render(worldWidth, worldHeight) {
        const { background, layoutKey, layers } = this.prepareRender(worldWidth, worldHeight);
        for (let i = 0; i < layers.length; i++) {
            this.renderLayer(layers[i], background, layoutKey, worldWidth, worldHeight);
        }
        this.createTwinkleStars();
        this.viewKey = '';
        this.syncToCamera();
        return this.image || this.graphics;
    }

    // Same final backdrop as render(), but layers that still need a bake land one
    // per tick behind the level fade instead of blocking first paint for ~175ms.
    // Layers already baked (retries, revisits) are placed synchronously, so the
    // death path looks identical. Falls back to render() without a scheduler.
    renderProgressive(worldWidth, worldHeight) {
        if (typeof this.scene?.time?.delayedCall !== 'function') {
            return this.render(worldWidth, worldHeight);
        }
        const { background, layoutKey, layers } = this.prepareRender(worldWidth, worldHeight);
        const generation = this.renderGeneration;
        const pending = [];
        for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];
            const bake = this.resolveBakeSize(worldWidth, worldHeight);
            const textureKey = this.textureKeyFor(layer, layoutKey, bake);
            if (this.placeCachedLayer(layer, textureKey)) {
                continue;
            }
            pending.push(layer);
        }
        this.createTwinkleStars();
        this.viewKey = '';
        this.syncToCamera();
        if (pending.length) {
            this.scheduleLayerBakes(
                pending,
                background,
                layoutKey,
                worldWidth,
                worldHeight,
                generation
            );
        }
        return this.image || this.graphics;
    }

    scheduleLayerBakes(pending, background, layoutKey, worldWidth, worldHeight, generation) {
        const queue = pending.slice();
        const bakeNext = () => {
            if (this.scene?.backgroundRenderer !== this || this.renderGeneration !== generation) {
                return;
            }
            const layer = queue.shift();
            if (!layer) {
                return;
            }
            this.renderLayer(layer, background, layoutKey, worldWidth, worldHeight);
            this.layoutTwinkles();
            if (queue.length) {
                this.scene.time.delayedCall(0, bakeNext);
            }
        };
        this.scene.time.delayedCall(0, bakeNext);
    }

    prepareRender(worldWidth, worldHeight) {
        const background = (this.levelConfig && this.levelConfig.background) || {};
        const layoutKey = `${this.level}_background_${background.type || 'space'}_${
            background.style || 'default'
        }_${worldWidth}x${worldHeight}`;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.destroyPlacedLayers();
        // Large generated canvases otherwise retain every visited level in CPU/GPU memory.
        // Preserve this layout for retries; rebake other levels when revisiting them.
        const currentPrefix = `space-chicken-bg-${layoutKey}_`;
        for (const key of this.textures?.getTextureKeys?.() || []) {
            if (key.startsWith('space-chicken-bg-') && !key.startsWith(currentPrefix)) {
                this.textures.remove(key);
            }
        }
        return { background, layoutKey, layers: parallaxLayersForLevel(this.level) };
    }

    renderLayer(layer, background, layoutKey, worldWidth, worldHeight) {
        const bake = this.resolveBakeSize(worldWidth, worldHeight);
        const textureKey = this.textureKeyFor(layer, layoutKey, bake);
        if (this.placeCachedLayer(layer, textureKey)) {
            return;
        }

        this.graphics = this.createScratchGraphics();
        this.drawLayer(layer.id, background, layoutKey, worldWidth, worldHeight);
        if (this.tryBakeTexture(textureKey, bake)) {
            this.placeBakedLayer(layer, textureKey);
            return;
        }
        this.placeLiveLayer(layer);
    }

    placeCachedLayer(layer, textureKey) {
        if (!this.textures?.exists?.(textureKey)) {
            return false;
        }
        this.placeBakedLayer(layer, textureKey);
        return true;
    }

    textureKeyFor(layer, layoutKey, bake) {
        const base = `space-chicken-bg-${layoutKey}_${layer.id}`;
        if (bake.scaleX < 1 || bake.scaleY < 1) {
            return `${base}_b${bake.width}x${bake.height}`;
        }
        return base;
    }

    // Width tracks camera travel so the whole painting scrolls through the view.
    // Height stays at least the world height so horizons are not squashed.
    parallaxSpan(worldSize, viewSize, scrollFactor) {
        return this.axisSpan(worldSize, viewSize, 1, scrollFactor);
    }

    // Zoomed cameras look at a point inset from the scroll origin, so a layer
    // sized only to the visible world width ends before the right edge.
    axisSpan(worldSize, pixels, zoom, scrollFactor) {
        const world = Math.max(1, Number(worldSize) || 1);
        const safePixels = Math.max(1, Number(pixels) || world);
        const safeZoom = Number(zoom) > 0 ? Number(zoom) : 1;
        const visible = safePixels / safeZoom;
        const factor = Number.isFinite(scrollFactor) ? scrollFactor : 1;
        const edge = (safePixels + visible) / 2;
        return Math.ceil(
            factor * world + (1 - factor) * edge + GAME_CONSTANTS.BACKGROUND_PARALLAX_PADDING
        );
    }

    worldCameras() {
        const cameras = [];
        const main = this.scene.getMainCamera?.() || this.scene.cameras?.main || null;
        if (main?.width > 0 && main?.height > 0) {
            cameras.push(main);
        }
        const second = this.scene.player2Camera;
        if (second?.width > 0 && second?.height > 0) {
            cameras.push(second);
        }
        return cameras;
    }

    resolveView() {
        const camera = this.scene.getMainCamera?.() || this.scene.cameras?.main || null;
        const zoom = Number(camera?.zoom) > 0 ? Number(camera.zoom) : 1;
        const cameraWidth = Number(camera?.width) > 0 ? Number(camera.width) / zoom : 0;
        const cameraHeight = Number(camera?.height) > 0 ? Number(camera.height) / zoom : 0;
        const fallbackWidth =
            Number(this.scene.viewportWidth) > 0
                ? Number(this.scene.viewportWidth)
                : this.worldWidth;
        const fallbackHeight =
            Number(this.scene.viewportHeight) > 0
                ? Number(this.scene.viewportHeight)
                : this.worldHeight;
        return {
            width: cameraWidth > 0 ? cameraWidth : Math.max(1, fallbackWidth || 1),
            height: cameraHeight > 0 ? cameraHeight : Math.max(1, fallbackHeight || 1),
        };
    }

    syncToCamera() {
        if (!this.layerSprites.length || !this.worldWidth || !this.worldHeight) {
            return;
        }
        const cameras = this.worldCameras();
        const viewKey = cameras.length
            ? cameras
                  .map((camera) => {
                      const zoom = Number(camera.zoom) > 0 ? Number(camera.zoom) : 1;
                      return `${camera.width}x${camera.height}@${Math.round(zoom * 1000)}`;
                  })
                  .join('|')
            : (() => {
                  const view = this.resolveView();
                  return `${Math.round(view.width)}x${Math.round(view.height)}`;
              })();
        if (viewKey === this.viewKey) {
            return;
        }
        this.viewKey = viewKey;
        this.layoutParallax();
    }

    layoutParallax() {
        for (let i = 0; i < this.layerSprites.length; i++) {
            this.applySpan(this.layerSprites[i]);
        }
        this.layoutTwinkles();
    }

    applySpan(record) {
        if (!record?.image || record.live) {
            return;
        }
        const cameras = this.worldCameras();
        let width = 0;
        let height = 0;
        if (cameras.length) {
            for (let i = 0; i < cameras.length; i++) {
                const camera = cameras[i];
                const zoom = Number(camera.zoom) > 0 ? Number(camera.zoom) : 1;
                width = Math.max(
                    width,
                    this.axisSpan(this.worldWidth, camera.width, zoom, record.scrollX)
                );
            }
        } else {
            const view = this.resolveView();
            width = this.parallaxSpan(this.worldWidth, view.width, record.scrollX);
        }
        // Keep the painted floor on the same vertical coordinates as the platforms.
        height = this.worldHeight;
        record.image.setDisplaySize?.(width, height);
        record.image.setSize?.(width, height);
        record.spanWidth = width;
        record.spanHeight = height;
    }

    layoutTwinkles() {
        const far = this.layerSprites.find((layer) => layer.id === 'far');
        const width = far?.spanWidth || this.worldWidth;
        const height = far?.spanHeight || this.worldHeight;
        for (let i = 0; i < this.twinkles.length; i++) {
            const twinkle = this.twinkles[i];
            twinkle.star.x = twinkle.u * width;
            twinkle.star.y = twinkle.v * height;
        }
    }

    createScratchGraphics() {
        if (this.scene.make?.graphics) {
            return this.scene.make.graphics({ x: 0, y: 0, add: false });
        }
        if (this.add?.graphics) {
            const graphics = this.add.graphics();
            graphics.setDepth?.(-10);
            return graphics;
        }
        return null;
    }

    ensureLayout(background, layoutKey, worldWidth, worldHeight) {
        const layoutCache = BackgroundRenderer.layoutCache;
        if (layoutCache.size > MAX_LAYOUT_CACHE) {
            const oldest = layoutCache.keys().next().value;
            layoutCache.delete(oldest);
        }

        let backgroundLayout = layoutCache.get(layoutKey);
        if (!backgroundLayout) {
            const createLayout = BIOME_LAYOUTS[background.type] || BIOME_LAYOUTS.space;
            backgroundLayout = createLayout(background, worldWidth, worldHeight);
            layoutCache.set(layoutKey, backgroundLayout);
        }
        return backgroundLayout;
    }

    drawLayer(layerId, background, layoutKey, worldWidth, worldHeight) {
        if (!this.graphics?.clear) {
            return;
        }
        const layout = this.ensureLayout(background, layoutKey, worldWidth, worldHeight);
        this.graphics.clear();
        const renderBiome = BIOME_RENDERERS[background.type] || BIOME_RENDERERS.space;
        renderBiome(this, background, layout, worldWidth, worldHeight, layerId);
    }

    tryBakeTexture(textureKey, bake) {
        if (!this.graphics?.generateTexture || !this.textures?.exists) {
            return false;
        }
        // generateTexture snapshots the camera matrix before it can see a zoom change,
        // so the graphics object itself is scaled to fit the bake.
        const graphics = this.graphics;
        const scaled =
            (bake.scaleX !== 1 || bake.scaleY !== 1) && typeof graphics.setScale === 'function';
        const previousScaleX = graphics.scaleX;
        const previousScaleY = graphics.scaleY;
        try {
            if (scaled) {
                graphics.setScale(bake.scaleX, bake.scaleY);
            }
            graphics.generateTexture(textureKey, bake.width, bake.height);
            return this.textures.exists(textureKey);
        } catch (_error) {
            return false;
        } finally {
            if (scaled) {
                graphics.setScale(previousScaleX ?? 1, previousScaleY ?? 1);
            }
        }
    }

    placeBakedLayer(layer, textureKey) {
        this.destroyScratchGraphics();
        if (!this.add?.image) {
            return;
        }
        const image = this.add.image(0, 0, textureKey);
        this.trackLayer(layer, image, false);
    }

    placeLiveLayer(layer) {
        if (!this.graphics) {
            return;
        }
        const graphics = this.graphics;
        this.graphics = null;
        graphics.setDepth?.(layer.depth);
        graphics.setScrollFactor?.(layer.scrollX, layer.scrollY);
        if (this.add?.existing && !graphics.displayList) {
            this.add.existing(graphics);
        }
        this.trackLayer(layer, graphics, true);
    }

    trackLayer(layer, image, live) {
        image.setOrigin?.(0, 0);
        image.setDepth?.(layer.depth);
        image.setScrollFactor?.(layer.scrollX, layer.scrollY);
        const record = {
            id: layer.id,
            image,
            scrollX: layer.scrollX,
            scrollY: layer.scrollY,
            depth: layer.depth,
            live,
        };
        this.layerSprites.push(record);
        if (layer.id === 'near') {
            this.image = image;
        }
        this.applySpan(record);
    }

    destroyPlacedLayers() {
        // Every path that discards placed layers also invalidates deferred bakes.
        this.renderGeneration = (this.renderGeneration || 0) + 1;
        for (let i = 0; i < this.twinkleTweens.length; i++) {
            const tween = this.twinkleTweens[i];
            if (tween?.stop) {
                tween.stop();
            } else {
                this.tweens?.killTweensOf?.(tween?.targets || tween);
            }
        }
        this.twinkleTweens = [];
        for (let i = 0; i < this.layerSprites.length; i++) {
            this.layerSprites[i].image?.destroy?.();
        }
        for (let i = 0; i < this.twinkles.length; i++) {
            const star = this.twinkles[i].star;
            if (star) {
                this.tweens?.killTweensOf?.(star);
                star.destroy?.();
            }
        }
        this.layerSprites = [];
        this.twinkles = [];
        this.image = null;
        this.destroyScratchGraphics();
        this.viewKey = '';
    }

    cleanup() {
        this.destroyPlacedLayers();
    }

    destroyScratchGraphics() {
        this.graphics?.destroy?.();
        this.graphics = null;
    }

    createTwinkleStars() {
        if (!this.add?.image) {
            return;
        }
        const far = parallaxLayersForLevel(this.level).find((layer) => layer.id === 'far');
        const count = GAME_CONSTANTS.TWINKLE_STAR_COUNT;
        for (let i = 0; i < count; i++) {
            const star = this.add.image(0, 0, 'particleSoft');
            star.setDepth((far?.depth ?? -32) + 1);
            star.setScale(0.18 + Math.random() * 0.28);
            star.setScrollFactor?.(far?.scrollX ?? 0.16, far?.scrollY ?? 0.08);
            star.setTint?.(twinkleTint(this.levelConfig?.background?.type));
            if (star.setBlendMode && Phaser.BlendModes) {
                star.setBlendMode(Phaser.BlendModes.ADD);
            }
            star.setAlpha(0.35);
            this.twinkles.push({
                star,
                u: Math.random(),
                v: Math.random() * 0.62,
            });
            const twinkle = this.tweens?.add?.({
                targets: star,
                alpha: { from: 0.12, to: 0.95 },
                duration: 700 + Math.random() * 1100,
                yoyo: true,
                repeat: -1,
                delay: Math.random() * 900,
                ease: 'Sine.easeInOut',
            });
            if (twinkle) {
                this.twinkleTweens.push(twinkle);
            }
        }
    }

    renderVerticalGradient(x, y, width, height, colors, steps = 32) {
        if (!Array.isArray(colors) || colors.length === 0) {
            return;
        }
        if (colors.length === 1) {
            this.graphics.fillStyle(colors[0], 1).fillRect(x, y, width, height);
            return;
        }

        // These strips are baked once; finer spacing avoids visible sky bands on tablets.
        const safeSteps = Math.max(steps, Math.min(384, Math.ceil(height / 2)));
        const segments = colors.length - 1;
        for (let i = 0; i < safeSteps; i++) {
            const t = i / safeSteps;
            const segmentPosition = t * segments;
            const segmentIndex = Math.min(segments - 1, Math.floor(segmentPosition));
            const localT = segmentPosition - segmentIndex;
            const color = blendColor(colors[segmentIndex], colors[segmentIndex + 1], localT);
            const rectY = y + Math.floor((i / safeSteps) * height);
            const nextY = y + Math.ceil(((i + 1) / safeSteps) * height);
            this.graphics.fillStyle(color, 1).fillRect(x, rectY, width, Math.max(1, nextY - rectY));
        }
    }

    renderPolygons(polygons) {
        (polygons || []).forEach((polygon) => {
            this.renderPolygon(polygon.points, polygon.fill, polygon.alpha, polygon.stroke);
        });
    }

    renderAtmosphericRibbons(ribbons) {
        (ribbons || []).forEach((ribbon) => {
            const points = ribbon.points;
            if (!points || points.length < 4) return;
            const leftY = (points[0].y + points[3].y) * 0.5;
            const rightY = (points[1].y + points[2].y) * 0.5;
            const thickness = Math.abs(points[3].y - points[0].y);
            // Feathered clouds replace hard-edged bands, using the cached layout.
            for (let i = 0; i < 12; i++) {
                const t = i / 11;
                const x = Phaser.Math.Linear(points[0].x, points[1].x, t);
                const y =
                    Phaser.Math.Linear(leftY, rightY, t) +
                    Math.sin(t * Math.PI * 3) * thickness * 0.25;
                this.drawGlow(
                    x,
                    y,
                    thickness * (1.2 + Math.sin(t * Math.PI)),
                    ribbon.fill,
                    ribbon.alpha * 0.28,
                    8
                );
            }
        });
    }

    renderRidgeLight(points, color, alpha) {
        this.graphics.lineStyle(2, color, alpha);
        this.graphics.beginPath();
        this.graphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.graphics.lineTo(points[i].x, points[i].y);
        }
        this.graphics.strokePath();
    }

    renderPolygon(points, fill, alpha = 1, stroke = null) {
        if (!points || points.length < 3) {
            return;
        }

        this.graphics.fillStyle(fill, alpha);
        this.graphics.beginPath();
        this.graphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.graphics.lineTo(points[i].x, points[i].y);
        }
        this.graphics.closePath();
        this.graphics.fillPath();

        if (!stroke) {
            return;
        }

        this.graphics.lineStyle(
            valueOrDefault(stroke.width, 1),
            valueOrDefault(stroke.color, 0xffffff),
            valueOrDefault(stroke.alpha, 1)
        );
        this.graphics.beginPath();
        this.graphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.graphics.lineTo(points[i].x, points[i].y);
        }
        this.graphics.closePath();
        this.graphics.strokePath();
    }

    renderStars(stars) {
        (stars || []).forEach((star) => {
            const alpha = valueOrDefault(star.alpha, 1);
            const size = valueOrDefault(star.size, 1) * 0.65;
            if (star.flare) this.drawGlow(star.x, star.y, size * 5, star.color, alpha * 0.1, 6);
            this.graphics.fillStyle(star.color, alpha).fillCircle(star.x, star.y, size);
            if (star.flare) {
                this.graphics.fillStyle(star.color, alpha * 0.7);
                this.graphics.fillRect(star.x - star.flare, star.y, star.flare * 2 + 1, 1);
                this.graphics.fillRect(star.x, star.y - star.flare, 1, star.flare * 2 + 1);
            }
        });
    }

    renderPlanets(planets) {
        (planets || []).forEach((planet) => {
            this.renderPlanet(planet);
        });
    }

    renderPlanet(planet) {
        const alpha = valueOrDefault(planet.alpha, 1);
        const size = valueOrDefault(planet.size, 40);
        const glowColor = valueOrDefault(planet.glowColor, planet.color);

        this.drawGlow(planet.x, planet.y, size * 1.8, glowColor, 0.16 * alpha, 6);

        if (planet.ringWidth && planet.ringHeight) {
            this.graphics.lineStyle(
                2,
                valueOrDefault(planet.ringColor, glowColor),
                valueOrDefault(planet.ringAlpha, 0.4)
            );
            this.graphics.strokeEllipse(planet.x, planet.y, planet.ringWidth, planet.ringHeight);
        }

        this.graphics.fillStyle(
            valueOrDefault(planet.shadowColor, adjustColor(planet.color, -70)),
            0.35 * alpha
        );
        this.graphics.fillCircle(planet.x + size * 0.16, planet.y + size * 0.05, size * 0.96);
        this.graphics.fillStyle(planet.color, alpha).fillCircle(planet.x, planet.y, size);
        const shadow = valueOrDefault(planet.shadowColor, adjustColor(planet.color, -70));
        const highlight = valueOrDefault(planet.highlightColor, adjustColor(planet.color, 50));
        // Each latitude stays within the sphere, with a curved day/night boundary.
        for (let row = -size; row < size; row += 2) {
            const halfWidth = Math.sqrt(Math.max(0, size * size - row * row));
            const terminator = halfWidth * 0.08 + row * 0.12;
            this.graphics.fillStyle(shadow, 0.65 * alpha);
            this.graphics.fillRect(
                planet.x + terminator,
                planet.y + row,
                Math.max(0, halfWidth - terminator),
                2
            );
        }
        for (let layer = 0; layer < 12; layer++) {
            const t = layer / 12;
            this.graphics.fillStyle(highlight, 0.025 * alpha);
            this.graphics.fillCircle(
                planet.x - size * 0.22,
                planet.y - size * 0.2,
                size * (0.68 - t * 0.42)
            );
        }
        this.graphics.fillStyle(
            valueOrDefault(planet.detailColor, adjustColor(planet.color, -28)),
            0.15 * alpha
        );
        this.graphics.fillCircle(planet.x - size * 0.08, planet.y + size * 0.14, size * 0.18);
        this.graphics.fillCircle(planet.x + size * 0.3, planet.y - size * 0.2, size * 0.12);
        this.graphics.lineStyle(
            1.5,
            valueOrDefault(planet.atmosphereColor, glowColor),
            0.35 * alpha
        );
        this.graphics.strokeCircle(planet.x, planet.y, size + 1);
    }

    renderPerspectiveGrid(grid, worldWidth, worldHeight) {
        if (!grid) {
            return;
        }

        const horizonY = valueOrDefault(grid.horizonY, Math.round(worldHeight * 0.72));
        const vanishingX = valueOrDefault(grid.vanishingX, Math.round(worldWidth * 0.5));
        const rows = valueOrDefault(grid.rows, 8);
        const colStep = Math.max(48, valueOrDefault(grid.colStep, 120));
        const color = valueOrDefault(grid.color, 0x63d5ff);

        this.drawGlow(vanishingX, horizonY + 36, Math.max(worldWidth * 0.18, 180), color, 0.08, 4);

        for (let row = 1; row <= rows; row++) {
            const t = row / rows;
            const y = Phaser.Math.Linear(horizonY, worldHeight, t * t);
            this.graphics.lineStyle(1, color, 0.06 + t * 0.16);
            this.graphics.beginPath();
            this.graphics.moveTo(0, y);
            this.graphics.lineTo(worldWidth, y);
            this.graphics.strokePath();
        }

        for (let x = -colStep; x <= worldWidth + colStep; x += colStep) {
            const distance = Math.abs(x - vanishingX) / Math.max(1, worldWidth);
            this.graphics.lineStyle(1, color, 0.08 + distance * 0.08);
            this.graphics.beginPath();
            this.graphics.moveTo(vanishingX, horizonY);
            this.graphics.lineTo(x, worldHeight);
            this.graphics.strokePath();
        }
    }

    renderScanlines(worldWidth, worldHeight, color, alpha, step = 6, thickness = 1) {
        if (alpha <= 0) return;
        const safeStep = Math.max(2, step);
        for (let y = 0; y < worldHeight; y += safeStep) {
            const lineAlpha = Math.floor(y / safeStep) % 2 === 0 ? alpha : alpha * 0.55;
            this.graphics.fillStyle(color, lineAlpha).fillRect(0, y, worldWidth, thickness);
        }
    }

    drawGlow(x, y, radius, color, alpha = 0.15, rings = 5) {
        const originalRings = Math.max(12, rings * 2);
        const safeRings = Math.min(64, Math.max(24, originalRings, Math.ceil(radius / 8)));
        // Preserve the existing glow strength as the baked gradient gains finer steps.
        const strength = (alpha * 4 * (1 - 1 / originalRings)) / (safeRings - 1);
        for (let i = safeRings; i >= 1; i--) {
            const ratio = i / safeRings;
            this.graphics.fillStyle(color, strength * (1 - ratio));
            this.graphics.fillCircle(x, y, Math.max(1, radius * ratio));
        }
    }
}
