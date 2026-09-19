import { GAME_CONSTANTS } from './Constants.js';
import { valueOrDefault } from './GameUtils.js';

const MAX_LAYOUT_CACHE = 12;

export class BackgroundRenderer {
    static layoutCache = new Map();

    constructor(scene) {
        this.scene = scene;
        this.graphics = null;
        this.image = null;
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
        const maxWidth = GAME_CONSTANTS.BACKGROUND_BAKE_MAX_WIDTH;
        const maxHeight = GAME_CONSTANTS.BACKGROUND_BAKE_MAX_HEIGHT;
        const scale = Math.min(1, maxWidth / worldWidth, maxHeight / worldHeight);
        return {
            scale,
            width: Math.max(1, Math.round(worldWidth * scale)),
            height: Math.max(1, Math.round(worldHeight * scale)),
        };
    }

    render(worldWidth, worldHeight) {
        const background = (this.levelConfig && this.levelConfig.background) || {};
        const bake = this.resolveBakeSize(worldWidth, worldHeight);
        const layoutKey = `${this.level}_background_${background.type || 'space'}_${
            background.style || 'default'
        }_${worldWidth}x${worldHeight}`;
        const textureKey =
            bake.scale < 1
                ? `space-chicken-bg-${layoutKey}_b${bake.width}x${bake.height}`
                : `space-chicken-bg-${layoutKey}`;

        if (this.textures?.exists?.(textureKey)) {
            this.placeBakedBackground(textureKey, worldWidth, worldHeight);
            this.createTwinkleStars(worldWidth, worldHeight);
            return this.image;
        }

        this.graphics = this.createScratchGraphics();
        this.drawBackground(background, layoutKey, worldWidth, worldHeight);

        if (this.tryBakeTexture(textureKey, bake)) {
            this.placeBakedBackground(textureKey, worldWidth, worldHeight);
        } else {
            this.placeLiveGraphics();
        }
        this.createTwinkleStars(worldWidth, worldHeight);
        return this.image || this.graphics;
    }

    createScratchGraphics() {
        if (this.scene.make?.graphics) {
            return this.scene.make.graphics({ x: 0, y: 0, add: false });
        }
        if (this.add?.graphics) {
            const graphics = this.add.graphics();
            graphics.setDepth(-10);
            return graphics;
        }
        return null;
    }

    drawBackground(background, layoutKey, worldWidth, worldHeight) {
        const layoutCache = BackgroundRenderer.layoutCache;
        if (layoutCache.size > MAX_LAYOUT_CACHE) {
            const oldest = layoutCache.keys().next().value;
            layoutCache.delete(oldest);
        }

        let backgroundLayout = layoutCache.get(layoutKey);
        if (!backgroundLayout) {
            if (background.type === 'station') {
                backgroundLayout = this.createStationBackgroundLayout(
                    background,
                    worldWidth,
                    worldHeight
                );
            } else if (background.type === 'moon') {
                backgroundLayout = this.createMoonBackgroundLayout(
                    background,
                    worldWidth,
                    worldHeight
                );
            } else {
                backgroundLayout = this.createSpaceBackgroundLayout(
                    background,
                    worldWidth,
                    worldHeight
                );
            }
            layoutCache.set(layoutKey, backgroundLayout);
        }

        if (!this.graphics?.clear) {
            return;
        }
        this.graphics.clear();
        if (background.type === 'station') {
            this.renderStationBackground(background, backgroundLayout, worldWidth, worldHeight);
            return;
        }
        if (background.type === 'moon') {
            this.renderMoonBackground(background, backgroundLayout, worldWidth, worldHeight);
            return;
        }
        this.renderSpaceBackground(background, backgroundLayout, worldWidth, worldHeight);
    }

    tryBakeTexture(textureKey, bake) {
        if (!this.graphics?.generateTexture || !this.textures?.exists) {
            return false;
        }
        const camera = this.graphics.constructor?.TargetCamera;
        const previousZoom = camera?.zoom;
        try {
            if (camera?.setZoom && bake.scale !== 1) {
                camera.setZoom(bake.scale);
            }
            this.graphics.generateTexture(textureKey, bake.width, bake.height);
            return this.textures.exists(textureKey);
        } catch (_error) {
            return false;
        } finally {
            if (camera?.setZoom && previousZoom != null) {
                camera.setZoom(previousZoom);
            }
        }
    }

    placeBakedBackground(textureKey, worldWidth, worldHeight) {
        this.destroyScratchGraphics();
        if (!this.add?.image) {
            return;
        }
        this.image = this.add.image(0, 0, textureKey);
        this.image.setOrigin?.(0, 0);
        this.image.setDepth?.(-10);
        this.image.setScrollFactor?.(1);
        if (worldWidth && worldHeight) {
            this.image.setDisplaySize?.(worldWidth, worldHeight);
        }
    }

    placeLiveGraphics() {
        if (!this.graphics) {
            return;
        }
        this.graphics.setDepth?.(-10);
        if (this.add?.existing && !this.graphics.displayList) {
            this.add.existing(this.graphics);
        }
        this.image = null;
    }

    destroyScratchGraphics() {
        this.graphics?.destroy?.();
        this.graphics = null;
    }

    createTwinkleStars(worldWidth, worldHeight) {
        if (!this.add?.image) {
            return;
        }
        const count = GAME_CONSTANTS.TWINKLE_STAR_COUNT;
        for (let i = 0; i < count; i++) {
            const star = this.add.image(
                Math.random() * worldWidth,
                Math.random() * worldHeight * 0.62,
                'particleSoft'
            );
            star.setDepth(-9);
            star.setScale(0.18 + Math.random() * 0.28);
            star.setTint?.(0xffffff);
            if (star.setBlendMode && Phaser.BlendModes) {
                star.setBlendMode(Phaser.BlendModes.ADD);
            }
            star.setAlpha(0.35);
            this.tweens?.add?.({
                targets: star,
                alpha: { from: 0.12, to: 0.95 },
                duration: 700 + Math.random() * 1100,
                yoyo: true,
                repeat: -1,
                delay: Math.random() * 900,
                ease: 'Sine.easeInOut',
            });
        }
    }

    renderMoonBackground(background, layout, worldWidth, worldHeight) {
        const palette = Object.assign(
            {
                top: 0x0a0a0f,
                mid: 0x1a1a22,
                bottom: 0x2f2f38,
                surface: 0x8a8a94,
                crater: 0x5a5a62,
                highlight: 0xc8c8d0,
                shadow: 0x121216,
            },
            background.palette || {}
        );

        this.renderVerticalGradient(
            0,
            0,
            worldWidth,
            worldHeight,
            [palette.top, palette.mid, palette.bottom],
            40
        );

        this.drawGlow(worldWidth * 0.3, worldHeight * 0.48, worldHeight * 0.52, 0x729fc8, 0.08, 8);
        this.renderStars(layout.stars || []);

        // The final ascent passes beneath a huge blue world, giving the level a clear landmark.
        const planetSize = Math.min(170, worldHeight * 0.2);
        this.renderPlanet({
            x: worldWidth * 0.82,
            y: worldHeight * 0.16,
            size: planetSize,
            color: 0x2d6bb0,
            shadowColor: 0x10183f,
            highlightColor: 0x8bd8ff,
            detailColor: 0x53a77f,
            atmosphereColor: 0x9cecff,
            glowColor: 0x59bfff,
            alpha: 0.94,
        });
        this.drawGlow(worldWidth * 0.08, worldHeight * 0.18, 120, 0xffd38a, 0.14, 10);
        this.graphics
            .fillStyle(0xfff1bd, 0.95)
            .fillCircle(worldWidth * 0.08, worldHeight * 0.18, 9);

        const surfaceY = worldHeight * 0.68;
        this.renderPolygon(
            [
                { x: -100, y: worldHeight },
                { x: -100, y: surfaceY },
                { x: worldWidth + 100, y: surfaceY + 40 },
                { x: worldWidth + 100, y: worldHeight },
            ],
            palette.surface,
            1
        );

        const craters = layout.craters || [
            { x: 420, y: surfaceY + 30, r: 55 },
            { x: 780, y: surfaceY + 55, r: 38 },
            { x: 1150, y: surfaceY + 20, r: 72 },
            { x: 1680, y: surfaceY + 65, r: 45 },
            { x: 2100, y: surfaceY + 35, r: 60 },
            { x: 2450, y: surfaceY + 70, r: 32 },
        ];

        craters.forEach((crater) => {
            this.graphics.fillStyle(palette.highlight, 0.28);
            this.graphics.fillEllipse(crater.x, crater.y + 3, crater.r * 2.1, crater.r * 0.72);
            this.graphics.fillStyle(palette.crater, 0.95);
            this.graphics.fillEllipse(crater.x, crater.y, crater.r * 2, crater.r * 0.65);
            this.graphics.fillStyle(palette.shadow, 0.5);
            this.graphics.fillEllipse(crater.x + 5, crater.y - 3, crater.r * 1.65, crater.r * 0.42);
        });

        const ridgeY = surfaceY - 20;
        this.renderPolygon(
            [
                { x: -80, y: worldHeight },
                { x: 300, y: ridgeY },
                { x: 700, y: ridgeY + 35 },
                { x: 1200, y: ridgeY - 15 },
                { x: 1800, y: ridgeY + 50 },
                { x: 2300, y: ridgeY + 10 },
                { x: worldWidth + 80, y: worldHeight },
            ],
            palette.shadow,
            0.9
        );
    }

    renderSpaceBackground(background, layout, worldWidth, worldHeight) {
        const palette = Object.assign(
            {
                top: 0x06101f,
                mid: 0x104b77,
                bottom: 0xffa466,
                haze: 0x84e7ff,
                glow: 0xffd48c,
                grid: 0x63d5ff,
                accent: 0xff845c,
                silhouetteFar: 0x0c1322,
                silhouetteNear: 0x07101a,
            },
            background.palette || {}
        );

        this.renderVerticalGradient(
            0,
            0,
            worldWidth,
            worldHeight,
            [palette.top, palette.mid, palette.bottom],
            48
        );
        this.drawGlow(
            worldWidth * 0.58,
            worldHeight * 0.82,
            Math.max(worldWidth * 0.16, 180),
            palette.glow,
            0.06,
            5
        );
        this.renderAtmosphericRibbons(layout.ribbons);

        (layout.nebulas || []).forEach((nebula) => {
            this.drawGlow(nebula.x, nebula.y, nebula.radius, nebula.color, nebula.alpha, 6);
        });

        this.renderStars(layout.stars);
        this.renderPlanets(layout.planets);
        this.renderPerspectiveGrid(layout.grid, worldWidth, worldHeight);

        if (layout.farRidge && layout.farRidge.length) {
            const farPoints = [
                { x: -80, y: worldHeight },
                ...layout.farRidge,
                { x: worldWidth + 80, y: worldHeight },
            ];
            this.renderPolygon(farPoints, palette.silhouetteFar, 0.95);
            this.renderRidgeLight(layout.farRidge, palette.haze, 0.22);
        }

        if (layout.nearRidge && layout.nearRidge.length) {
            const nearPoints = [
                { x: -80, y: worldHeight },
                ...layout.nearRidge,
                { x: worldWidth + 80, y: worldHeight },
            ];
            this.renderPolygon(nearPoints, palette.silhouetteNear, 0.98);
            this.renderRidgeLight(layout.nearRidge, palette.accent, 0.16);
        }

        (layout.towers || []).forEach((tower) => {
            (tower.shapes || []).forEach((shape) => {
                this.renderPolygon(
                    shape.points,
                    shape.fill,
                    valueOrDefault(shape.alpha, 1),
                    shape.stroke
                );
            });
            if (tower.spine) {
                this.graphics.fillStyle(tower.spine.fill, valueOrDefault(tower.spine.alpha, 1));
                this.graphics.fillRect(
                    tower.spine.x,
                    tower.spine.y,
                    tower.spine.width,
                    tower.spine.height
                );
            }
            (tower.windows || []).forEach((windowPanel) => {
                this.graphics.fillStyle(windowPanel.color, valueOrDefault(windowPanel.alpha, 1));
                this.graphics.fillRect(
                    windowPanel.x,
                    windowPanel.y,
                    windowPanel.width,
                    windowPanel.height
                );
            });
            if (tower.glow) {
                this.drawGlow(
                    tower.glow.x,
                    tower.glow.y,
                    tower.glow.radius,
                    tower.glow.color,
                    tower.glow.alpha,
                    4
                );
            }
            (tower.crownLights || []).forEach((light) => {
                this.drawGlow(
                    light.x,
                    light.y,
                    light.radius * 3,
                    light.color,
                    light.alpha * 0.16,
                    3
                );
                this.graphics
                    .fillStyle(light.color, light.alpha)
                    .fillCircle(light.x, light.y, light.radius);
            });
        });

        (layout.beacons || []).forEach((beacon) => {
            this.drawGlow(
                beacon.x,
                beacon.y,
                beacon.radius * 4,
                beacon.color,
                beacon.alpha * 0.22,
                4
            );
            this.graphics
                .fillStyle(beacon.color, beacon.alpha)
                .fillCircle(beacon.x, beacon.y, beacon.radius);
        });
    }

    renderStationBackground(background, layout, worldWidth, worldHeight) {
        const palette = Object.assign(
            {
                top: 0x040915,
                mid: 0x102544,
                bottom: 0x1f5d7a,
                haze: 0x86f0ff,
                glow: 0xffc87c,
                metal: 0x18253a,
                metalAlt: 0x243657,
                highlight: 0x9de4ff,
                accent: 0xff9642,
                shadow: 0x09111d,
            },
            background.palette || {}
        );

        this.renderVerticalGradient(
            0,
            0,
            worldWidth,
            worldHeight,
            [palette.top, palette.mid, palette.bottom],
            52
        );
        this.drawGlow(
            worldWidth * 0.68,
            worldHeight * 0.18,
            Math.max(worldWidth * 0.12, 150),
            palette.haze,
            0.05,
            4
        );
        this.renderAtmosphericRibbons(layout.ribbons);

        (layout.nebulas || []).forEach((nebula) => {
            this.drawGlow(nebula.x, nebula.y, nebula.radius, nebula.color, nebula.alpha, 6);
        });

        this.renderStars(layout.stars);
        this.renderPlanets(layout.planets);

        (layout.frames || []).forEach((frame) => {
            this.graphics.lineStyle(frame.lineWidth, frame.color, frame.alpha);
            this.graphics.strokeEllipse(frame.x, frame.y, frame.width, frame.height);
        });

        (layout.modules || []).forEach((module) => {
            this.graphics.fillStyle(module.fill, valueOrDefault(module.alpha, 1));
            this.graphics.fillRect(module.x, module.y, module.width, module.height);
            this.graphics.fillStyle(module.insetFill, 0.95);
            this.graphics.fillRect(
                module.x + 6,
                module.y + 6,
                Math.max(8, module.width - 12),
                Math.max(8, module.height - 12)
            );
            this.graphics.lineStyle(2, module.strokeColor, valueOrDefault(module.edgeAlpha, 0.75));
            this.graphics.strokeRect(module.x, module.y, module.width, module.height);

            (module.braces || []).forEach((brace) => {
                this.renderPolygon(brace.points, brace.fill, brace.alpha, brace.stroke);
            });

            (module.panels || []).forEach((panel) => {
                this.graphics.fillStyle(panel.fill, valueOrDefault(panel.alpha, 1));
                this.graphics.fillRect(panel.x, panel.y, panel.width, panel.height);
                if (panel.strokeColor) {
                    this.graphics.lineStyle(
                        1,
                        panel.strokeColor,
                        valueOrDefault(panel.strokeAlpha, 0.4)
                    );
                    this.graphics.strokeRect(panel.x, panel.y, panel.width, panel.height);
                }
            });

            (module.windows || []).forEach((windowPanel) => {
                this.graphics.fillStyle(windowPanel.color, valueOrDefault(windowPanel.alpha, 1));
                this.graphics.fillRect(
                    windowPanel.x,
                    windowPanel.y,
                    windowPanel.width,
                    windowPanel.height
                );
                this.drawGlow(
                    windowPanel.x + windowPanel.width * 0.5,
                    windowPanel.y + windowPanel.height * 0.5,
                    Math.max(windowPanel.width, windowPanel.height) * 1.8,
                    windowPanel.color,
                    windowPanel.alpha * 0.18,
                    3
                );
            });

            if (module.antenna) {
                this.graphics.lineStyle(2, module.antenna.color, module.antenna.alpha);
                this.graphics.beginPath();
                this.graphics.moveTo(module.antenna.x, module.antenna.baseY);
                this.graphics.lineTo(module.antenna.x, module.antenna.tipY);
                this.graphics.strokePath();
                this.drawGlow(
                    module.antenna.x,
                    module.antenna.tipY,
                    16,
                    module.antenna.beaconColor,
                    module.antenna.beaconAlpha * 0.18,
                    3
                );
                this.graphics.fillStyle(module.antenna.beaconColor, module.antenna.beaconAlpha);
                this.graphics.fillCircle(module.antenna.x, module.antenna.tipY, 2);
            }
        });

        (layout.catwalks || []).forEach((catwalk) => {
            this.graphics
                .fillStyle(catwalk.fill, catwalk.alpha)
                .fillRect(catwalk.x, catwalk.y, catwalk.width, catwalk.height);
            this.graphics
                .lineStyle(2, catwalk.strokeColor, 0.55)
                .strokeRect(catwalk.x, catwalk.y, catwalk.width, catwalk.height);
            (catwalk.lights || []).forEach((light) => {
                this.graphics
                    .fillStyle(light.color, light.alpha)
                    .fillRect(light.x, light.y, light.width, light.height);
            });
        });

        (layout.struts || []).forEach((strut) => {
            this.renderPolygon(strut.points, strut.fill, strut.alpha, strut.stroke);
        });

        (layout.floorBands || []).forEach((band) => {
            this.renderPolygon(band.points, band.fill, band.alpha, band.stroke);
        });

        (layout.deckLights || []).forEach((light) => {
            this.drawGlow(
                light.x + light.width * 0.5,
                light.y + light.height * 0.5,
                light.width * 1.6,
                light.color,
                light.alpha * 0.18,
                3
            );
            this.graphics
                .fillStyle(light.color, light.alpha)
                .fillRect(light.x, light.y, light.width, light.height);
        });

        (layout.beacons || []).forEach((beacon) => {
            this.drawGlow(
                beacon.x,
                beacon.y,
                beacon.radius * 4,
                beacon.color,
                beacon.alpha * 0.2,
                4
            );
            this.graphics
                .fillStyle(beacon.color, beacon.alpha)
                .fillCircle(beacon.x, beacon.y, beacon.radius);
        });

        this.renderScanlines(
            worldWidth,
            worldHeight,
            palette.highlight,
            Math.min(valueOrDefault(background.scanlineAlpha, 0), 0.008),
            6,
            1
        );
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
            const color = this.blendColor(colors[segmentIndex], colors[segmentIndex + 1], localT);
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
            valueOrDefault(planet.shadowColor, this.adjustColor(planet.color, -70)),
            0.35 * alpha
        );
        this.graphics.fillCircle(planet.x + size * 0.16, planet.y + size * 0.05, size * 0.96);
        this.graphics.fillStyle(planet.color, alpha).fillCircle(planet.x, planet.y, size);
        const shadow = valueOrDefault(planet.shadowColor, this.adjustColor(planet.color, -70));
        const highlight = valueOrDefault(planet.highlightColor, this.adjustColor(planet.color, 50));
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
            valueOrDefault(planet.detailColor, this.adjustColor(planet.color, -28)),
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

    blendColor(colorA, colorB, t) {
        const clamped = Phaser.Math.Clamp(t, 0, 1);
        const rA = (colorA >> 16) & 0xff;
        const gA = (colorA >> 8) & 0xff;
        const bA = colorA & 0xff;
        const rB = (colorB >> 16) & 0xff;
        const gB = (colorB >> 8) & 0xff;
        const bB = colorB & 0xff;
        const r = Math.round(Phaser.Math.Linear(rA, rB, clamped));
        const g = Math.round(Phaser.Math.Linear(gA, gB, clamped));
        const b = Math.round(Phaser.Math.Linear(bA, bB, clamped));
        return (r << 16) | (g << 8) | b;
    }

    adjustColor(color, amount) {
        const clampChannel = (value) => Math.max(0, Math.min(255, value));
        const r = clampChannel(((color >> 16) & 0xff) + amount);
        const g = clampChannel(((color >> 8) & 0xff) + amount);
        const b = clampChannel((color & 0xff) + amount);
        return (r << 16) | (g << 8) | b;
    }

    getRangeValue(range, fallbackMin, fallbackMax) {
        if (Array.isArray(range) && range.length >= 2) {
            const min = Math.min(range[0], range[1]);
            const max = Math.max(range[0], range[1]);
            return Phaser.Math.Between(min, max);
        }
        if (typeof range === 'number' && Number.isFinite(range)) {
            return range;
        }
        return Phaser.Math.Between(fallbackMin, fallbackMax);
    }

    createRidgePoints(worldWidth, baseY, amplitudeMin, amplitudeMax, segmentMin, segmentMax) {
        const points = [];
        let x = -120;
        while (x <= worldWidth + 120) {
            points.push({
                x,
                y: baseY - Phaser.Math.Between(amplitudeMin, amplitudeMax),
            });
            x += Phaser.Math.Between(segmentMin, segmentMax);
        }
        return points;
    }

    sampleRidgeY(points, x, fallback) {
        if (!points || points.length === 0) {
            return fallback;
        }
        if (x <= points[0].x) {
            return points[0].y;
        }
        for (let i = 0; i < points.length - 1; i++) {
            const current = points[i];
            const next = points[i + 1];
            if (x >= current.x && x <= next.x) {
                const t = (x - current.x) / Math.max(1, next.x - current.x);
                return Phaser.Math.Linear(current.y, next.y, t);
            }
        }
        return points[points.length - 1].y;
    }

    createSpaceTower(x, groundY, width, height, palette) {
        const halfWidth = width * 0.5;
        const topY = groundY - height;
        const bodyColor = this.adjustColor(palette.silhouetteNear, Phaser.Math.Between(10, 26));
        const shadowColor = this.adjustColor(bodyColor, -12);
        const edgeColor = this.adjustColor(palette.haze, -30);
        const shoulderWidth = halfWidth * Phaser.Math.FloatBetween(0.72, 0.9);
        const waistWidth = halfWidth * Phaser.Math.FloatBetween(0.42, 0.62);
        const neckWidth = halfWidth * Phaser.Math.FloatBetween(0.18, 0.36);
        const crownHeight = Phaser.Math.Between(16, 34);
        const profile = Phaser.Math.Between(0, 2);
        const bodyTopY = topY + crownHeight;
        const shapes = [];

        if (profile === 0) {
            shapes.push({
                points: [
                    { x: x - halfWidth, y: groundY },
                    { x: x - shoulderWidth, y: groundY - height * 0.22 },
                    { x: x - waistWidth, y: groundY - height * 0.56 },
                    { x: x - neckWidth, y: bodyTopY },
                    { x: x + neckWidth, y: bodyTopY },
                    { x: x + waistWidth, y: groundY - height * 0.56 },
                    { x: x + shoulderWidth, y: groundY - height * 0.22 },
                    { x: x + halfWidth, y: groundY },
                ],
                fill: bodyColor,
                alpha: 0.96,
            });
            shapes.push({
                points: [
                    { x: x - neckWidth * 0.8, y: bodyTopY },
                    { x: x, y: topY - crownHeight * 0.2 },
                    { x: x + neckWidth * 0.8, y: bodyTopY },
                ],
                fill: this.adjustColor(bodyColor, 10),
                alpha: 0.98,
                stroke: { width: 1, color: edgeColor, alpha: 0.16 },
            });
        } else if (profile === 1) {
            const finReach = halfWidth * Phaser.Math.FloatBetween(0.22, 0.38);
            shapes.push({
                points: [
                    { x: x - halfWidth, y: groundY },
                    { x: x - halfWidth * 0.82, y: groundY - height * 0.18 },
                    { x: x - shoulderWidth, y: groundY - height * 0.52 },
                    { x: x - neckWidth, y: bodyTopY },
                    { x: x + neckWidth, y: bodyTopY },
                    { x: x + shoulderWidth, y: groundY - height * 0.52 },
                    { x: x + halfWidth * 0.82, y: groundY - height * 0.18 },
                    { x: x + halfWidth, y: groundY },
                ],
                fill: bodyColor,
                alpha: 0.96,
            });
            shapes.push({
                points: [
                    { x: x - shoulderWidth, y: groundY - height * 0.34 },
                    { x: x - shoulderWidth - finReach, y: groundY - height * 0.2 },
                    { x: x - shoulderWidth * 0.68, y: groundY - height * 0.1 },
                ],
                fill: shadowColor,
                alpha: 0.92,
            });
            shapes.push({
                points: [
                    { x: x + shoulderWidth, y: groundY - height * 0.34 },
                    { x: x + shoulderWidth + finReach, y: groundY - height * 0.2 },
                    { x: x + shoulderWidth * 0.68, y: groundY - height * 0.1 },
                ],
                fill: shadowColor,
                alpha: 0.92,
            });
            shapes.push({
                points: [
                    { x: x - neckWidth * 0.9, y: bodyTopY },
                    { x: x - neckWidth * 0.42, y: topY + crownHeight * 0.15 },
                    { x: x, y: topY - crownHeight * 0.35 },
                    { x: x + neckWidth * 0.42, y: topY + crownHeight * 0.15 },
                    { x: x + neckWidth * 0.9, y: bodyTopY },
                ],
                fill: this.adjustColor(bodyColor, 12),
                alpha: 0.98,
                stroke: { width: 1, color: edgeColor, alpha: 0.14 },
            });
        } else {
            const ledgeWidth = halfWidth * Phaser.Math.FloatBetween(0.22, 0.36);
            shapes.push({
                points: [
                    { x: x - halfWidth, y: groundY },
                    { x: x - halfWidth * 0.94, y: groundY - height * 0.14 },
                    { x: x - shoulderWidth, y: groundY - height * 0.36 },
                    { x: x - waistWidth, y: groundY - height * 0.62 },
                    { x: x - ledgeWidth, y: groundY - height * 0.62 },
                    { x: x - neckWidth, y: bodyTopY },
                    { x: x + neckWidth, y: bodyTopY },
                    { x: x + ledgeWidth, y: groundY - height * 0.62 },
                    { x: x + waistWidth, y: groundY - height * 0.62 },
                    { x: x + shoulderWidth, y: groundY - height * 0.36 },
                    { x: x + halfWidth * 0.94, y: groundY - height * 0.14 },
                    { x: x + halfWidth, y: groundY },
                ],
                fill: bodyColor,
                alpha: 0.96,
            });
            shapes.push({
                points: [
                    { x: x - neckWidth, y: bodyTopY },
                    { x: x - neckWidth * 0.5, y: topY + crownHeight * 0.22 },
                    { x: x + neckWidth * 0.5, y: topY + crownHeight * 0.22 },
                    { x: x + neckWidth, y: bodyTopY },
                ],
                fill: this.adjustColor(bodyColor, 14),
                alpha: 0.98,
            });
            shapes.push({
                points: [
                    { x: x - neckWidth * 0.45, y: topY + crownHeight * 0.22 },
                    { x: x, y: topY - crownHeight * 0.28 },
                    { x: x + neckWidth * 0.45, y: topY + crownHeight * 0.22 },
                ],
                fill: this.adjustColor(bodyColor, 22),
                alpha: 0.98,
                stroke: { width: 1, color: edgeColor, alpha: 0.14 },
            });
        }

        const spineWidth = Math.max(4, Math.round(width * Phaser.Math.FloatBetween(0.12, 0.2)));
        const spineHeight = Math.max(18, Math.round(height * Phaser.Math.FloatBetween(0.2, 0.32)));
        const spineY = groundY - Math.round(height * 0.52) - spineHeight * 0.5;
        const windows = [];
        const slitCount = Phaser.Math.Between(4, 8);
        for (let i = 0; i < slitCount; i++) {
            const windowWidth = Phaser.Math.Between(3, Math.max(5, Math.floor(width * 0.16)));
            const windowHeight = Phaser.Math.Between(3, 6);
            const lateralOffset = Phaser.Math.Between(
                -Math.floor(width * 0.14),
                Math.floor(width * 0.14)
            );
            windows.push({
                x: x + lateralOffset - Math.floor(windowWidth * 0.5),
                y: groundY - Math.round(height * Phaser.Math.FloatBetween(0.2, 0.78)),
                width: windowWidth,
                height: windowHeight,
                color: Phaser.Utils.Array.GetRandom([palette.haze, palette.glow, palette.accent]),
                alpha: Phaser.Math.FloatBetween(0.45, 0.82),
            });
        }

        const crownLights = [];
        if (Phaser.Math.Between(0, 1) === 1) {
            crownLights.push({
                x,
                y: topY - crownHeight * 0.28,
                radius: 2,
                color: palette.accent,
                alpha: 0.88,
            });
        }

        return {
            shapes,
            spine: {
                x: x - Math.floor(spineWidth * 0.5),
                y: spineY,
                width: spineWidth,
                height: spineHeight,
                fill: this.adjustColor(bodyColor, 8),
                alpha: 0.85,
            },
            windows,
            crownLights,
            glow: {
                x,
                y: topY + crownHeight * 0.25,
                radius: Math.max(20, width),
                color: palette.accent,
                alpha: 0.08,
            },
        };
    }

    createMoonBackgroundLayout(background, worldWidth, worldHeight) {
        const starCount = background.starCount || 200;
        const stars = [];
        for (let i = 0; i < starCount; i++) {
            stars.push({
                x: Math.random() * worldWidth,
                y: Math.random() * (worldHeight * 0.75),
                size: Math.random() * 2.2 + 0.6,
                alpha: Math.random() * 0.6 + 0.4,
            });
        }

        const craters = [
            { x: 420, y: 580, r: 55 },
            { x: 780, y: 605, r: 38 },
            { x: 1150, y: 570, r: 72 },
            { x: 1680, y: 615, r: 45 },
            { x: 2100, y: 585, r: 60 },
            { x: 2450, y: 620, r: 32 },
        ];

        return { stars, craters };
    }

    createSpaceBackgroundLayout(background, worldWidth, worldHeight) {
        const palette = Object.assign(
            {
                haze: 0x84e7ff,
                glow: 0xffd48c,
                accent: 0xff845c,
                grid: 0x63d5ff,
                silhouetteNear: 0x07101a,
            },
            background.palette || {}
        );
        const starCount = valueOrDefault(
            background.starCount,
            GAME_CONSTANTS.BACKGROUND_STAR_COUNT_DEFAULT
        );
        const stars = [];
        const starColors = [
            0xffffff,
            palette.haze,
            palette.glow,
            this.adjustColor(palette.accent, 18),
        ];
        for (let i = 0; i < starCount; i++) {
            stars.push({
                x: Phaser.Math.Between(0, worldWidth),
                y: Phaser.Math.Between(0, Math.round(worldHeight * 0.72)),
                size: Phaser.Math.Between(1, 3),
                color: Phaser.Utils.Array.GetRandom(starColors),
                alpha: Phaser.Math.FloatBetween(0.35, 1),
                flare: Phaser.Math.Between(0, 10) === 0 ? Phaser.Math.Between(2, 5) : 0,
            });
        }

        const ribbons = [];
        const ribbonColors = [palette.haze, palette.accent, palette.glow];
        for (let i = 0; i < 3; i++) {
            const startY = Phaser.Math.Between(40, Math.round(worldHeight * 0.48));
            const thickness = Phaser.Math.Between(70, 140);
            const endY = startY + Phaser.Math.Between(-120, 120);
            ribbons.push({
                points: [
                    { x: -140, y: startY },
                    { x: worldWidth + 140, y: endY },
                    { x: worldWidth + 140, y: endY + thickness },
                    { x: -140, y: startY + thickness },
                ],
                fill: Phaser.Utils.Array.GetRandom(ribbonColors),
                alpha: Phaser.Math.FloatBetween(0.05, 0.11),
            });
        }

        const nebulas = [];
        for (let i = 0; i < 5; i++) {
            nebulas.push({
                x: Phaser.Math.Between(0, worldWidth),
                y: Phaser.Math.Between(40, Math.round(worldHeight * 0.58)),
                radius: Phaser.Math.Between(120, 280),
                color: Phaser.Utils.Array.GetRandom(ribbonColors),
                alpha: Phaser.Math.FloatBetween(0.05, 0.13),
            });
        }

        const defaultPlanets = [
            { color: 0x2d5f9c, size: 54 },
            { color: 0xe17b52, size: 40 },
            { color: 0x6b59b6, size: 34 },
            { color: 0x3a9877, size: 46 },
            { color: 0xb8b054, size: 38 },
            { color: 0xd05572, size: 44 },
        ];
        const planetTemplates = background.planetTemplates || defaultPlanets;
        const planetCount = Math.max(
            1,
            valueOrDefault(background.planetCount, GAME_CONSTANTS.BACKGROUND_PLANET_COUNT_DEFAULT)
        );
        const planets = [];
        const heroTemplate = planetTemplates[0];
        const heroSize = Phaser.Math.Between(
            Math.round(worldHeight * 0.12),
            Math.round(worldHeight * 0.2)
        );
        planets.push({
            x: Phaser.Math.Between(Math.round(worldWidth * 0.18), Math.round(worldWidth * 0.82)),
            y: Phaser.Math.Between(90, Math.round(worldHeight * 0.28)),
            color: heroTemplate.color,
            size: heroSize,
            alpha: 0.95,
            glowColor: palette.glow,
            atmosphereColor: palette.haze,
            ringColor: this.blendColor(palette.haze, palette.glow, 0.5),
            ringAlpha: 0.5,
            ringWidth: Math.round(heroSize * 2.3),
            ringHeight: Math.max(32, Math.round(heroSize * 0.7)),
            shadowColor: this.adjustColor(heroTemplate.color, -70),
            highlightColor: this.adjustColor(heroTemplate.color, 55),
        });

        for (let i = 1; i < planetCount; i++) {
            const template = planetTemplates[i % planetTemplates.length];
            planets.push({
                x: Phaser.Math.Between(120, Math.max(120, worldWidth - 120)),
                y: Phaser.Math.Between(50, Math.max(80, Math.round(worldHeight * 0.45))),
                color: template.color,
                size: Phaser.Math.Between(Math.max(18, template.size - 10), template.size + 14),
                alpha: Phaser.Math.FloatBetween(0.75, 0.92),
                glowColor: Phaser.Utils.Array.GetRandom([palette.haze, palette.accent]),
                atmosphereColor: palette.haze,
                shadowColor: this.adjustColor(template.color, -60),
                highlightColor: this.adjustColor(template.color, 45),
            });
        }

        const horizonY = Math.round(worldHeight * 0.72);
        const farRidge = this.createRidgePoints(worldWidth, horizonY + 12, 36, 110, 120, 220);
        const nearRidge = this.createRidgePoints(worldWidth, horizonY + 92, 70, 180, 90, 160);

        const towers = [];
        const beacons = [];
        for (
            let x = Phaser.Math.Between(60, 140);
            x < worldWidth - 40;
            x += Phaser.Math.Between(180, 320)
        ) {
            const groundY = this.sampleRidgeY(nearRidge, x, worldHeight - 90);
            const width = Phaser.Math.Between(22, 48);
            const height = Phaser.Math.Between(60, 170);
            const tower = this.createSpaceTower(x, groundY, width, height, palette);
            towers.push(tower);
            if (Phaser.Math.Between(0, 1) === 1) {
                beacons.push({
                    x,
                    y: groundY - height - Phaser.Math.Between(8, 18),
                    radius: 2,
                    color: palette.accent,
                    alpha: 0.74,
                });
            }
        }

        const grid = {
            horizonY,
            vanishingX: Math.round(worldWidth * Phaser.Math.FloatBetween(0.42, 0.58)),
            color: palette.grid,
            rows: 8,
            colStep: Phaser.Math.Between(100, 150),
        };

        return { stars, ribbons, nebulas, planets, farRidge, nearRidge, towers, beacons, grid };
    }

    createStationModule(x, y, width, height, palette, options = {}) {
        const padding = Phaser.Math.Between(10, 16);
        const insetWidth = Math.max(32, width - padding * 2);
        const insetHeight = Math.max(32, height - padding * 2);
        const panels = [];
        const windows = [];
        const braces = [];
        const panelRows = this.getRangeValue(options.panelRows, 2, 4);
        const panelCols = this.getRangeValue(options.panelCols, 2, 4);
        const gap = 8;
        const panelWidth = Math.max(
            24,
            Math.floor((insetWidth - (panelCols - 1) * gap) / panelCols)
        );
        const panelHeight = Math.max(
            20,
            Math.floor((insetHeight - (panelRows - 1) * gap) / panelRows)
        );

        for (let row = 0; row < panelRows; row++) {
            for (let col = 0; col < panelCols; col++) {
                const panelX = x + padding + col * (panelWidth + gap);
                const panelY = y + padding + row * (panelHeight + gap);
                panels.push({
                    x: panelX,
                    y: panelY,
                    width: panelWidth,
                    height: panelHeight,
                    fill:
                        (row + col) % 2 === 0
                            ? palette.metalAlt
                            : this.adjustColor(palette.metal, -8),
                    alpha: 0.85,
                    strokeColor: palette.highlight,
                    strokeAlpha: 0.16,
                });
            }
        }

        const windowCount = this.getRangeValue(options.windowCount, 8, 18);
        for (let i = 0; i < windowCount; i++) {
            const windowWidth = Phaser.Math.Between(8, 18);
            const windowHeight = Phaser.Math.Between(3, 6);
            windows.push({
                x: Phaser.Math.Between(x + 14, x + Math.max(14, width - windowWidth - 14)),
                y: Phaser.Math.Between(y + 14, y + Math.max(14, height - windowHeight - 14)),
                width: windowWidth,
                height: windowHeight,
                color: Phaser.Utils.Array.GetRandom([
                    palette.haze,
                    palette.highlight,
                    palette.accent,
                ]),
                alpha: Phaser.Math.FloatBetween(0.55, 0.95),
            });
        }

        braces.push({
            points: [
                { x: x + 8, y: y + height * 0.2 },
                { x: x + width * 0.5, y: y + height * 0.08 },
                { x: x + width - 8, y: y + height * 0.2 },
                { x: x + width - 20, y: y + height * 0.34 },
                { x: x + 20, y: y + height * 0.34 },
            ],
            fill: palette.shadow,
            alpha: 0.4,
            stroke: { width: 1, color: palette.highlight, alpha: 0.12 },
        });

        const antennaHeight = this.getRangeValue(options.antennaHeight, 20, 56);
        return {
            x,
            y,
            width,
            height,
            fill: palette.metal,
            insetFill: this.adjustColor(palette.metalAlt, -6),
            strokeColor: palette.highlight,
            edgeAlpha: 0.72,
            alpha: 0.92,
            panels,
            windows,
            braces,
            antenna: {
                x: x + width - Phaser.Math.Between(18, 30),
                baseY: y,
                tipY: y - antennaHeight,
                color: palette.highlight,
                alpha: 0.7,
                beaconColor: palette.accent,
                beaconAlpha: 0.85,
            },
        };
    }

    // eslint-disable-next-line max-lines-per-function
    createStationBackgroundLayout(background, worldWidth, worldHeight) {
        const palette = Object.assign(
            {
                haze: 0x86f0ff,
                glow: 0xffc87c,
                metal: 0x18253a,
                metalAlt: 0x243657,
                highlight: 0x9de4ff,
                accent: 0xff9642,
                shadow: 0x09111d,
            },
            background.palette || {}
        );
        const stars = [];
        const starCount = valueOrDefault(background.starCount, 80);
        const ribbonCount = valueOrDefault(background.ribbonCount, 2);
        const nebulaCount = valueOrDefault(background.nebulaCount, 3);
        const frameCount = valueOrDefault(background.frameCount, 2);
        const moduleStride = valueOrDefault(background.moduleStride, 260);
        const catwalkStep = valueOrDefault(background.catwalkStep, 220);
        const deckLightStep = valueOrDefault(background.deckLightStep, 130);
        const beaconChance = valueOrDefault(background.moduleBeaconChance, 0.5);
        const starColors = [0xffffff, palette.haze, palette.highlight];
        for (let i = 0; i < starCount; i++) {
            stars.push({
                x: Phaser.Math.Between(0, worldWidth),
                y: Phaser.Math.Between(0, Math.round(worldHeight * 0.7)),
                size: Phaser.Math.Between(1, 2),
                color: Phaser.Utils.Array.GetRandom(starColors),
                alpha: Phaser.Math.FloatBetween(0.35, 0.95),
                flare: Phaser.Math.Between(0, 12) === 0 ? Phaser.Math.Between(2, 4) : 0,
            });
        }

        const ribbons = [];
        for (let i = 0; i < ribbonCount; i++) {
            const startY = Phaser.Math.Between(30, Math.round(worldHeight * 0.42));
            const thickness = Phaser.Math.Between(50, 120);
            const endY = startY + Phaser.Math.Between(-80, 80);
            ribbons.push({
                points: [
                    { x: -120, y: startY },
                    { x: worldWidth + 120, y: endY },
                    { x: worldWidth + 120, y: endY + thickness },
                    { x: -120, y: startY + thickness },
                ],
                fill: Phaser.Utils.Array.GetRandom([
                    palette.haze,
                    palette.highlight,
                    palette.accent,
                ]),
                alpha: Phaser.Math.FloatBetween(0.04, 0.09),
            });
        }

        const nebulas = [];
        for (let i = 0; i < nebulaCount; i++) {
            nebulas.push({
                x: Phaser.Math.Between(0, worldWidth),
                y: Phaser.Math.Between(50, Math.round(worldHeight * 0.45)),
                radius: Phaser.Math.Between(120, 260),
                color: Phaser.Utils.Array.GetRandom([palette.haze, palette.highlight]),
                alpha: Phaser.Math.FloatBetween(0.04, 0.1),
            });
        }

        const frameTemplates = [
            {
                x: Math.round(worldWidth * 0.26),
                y: Math.round(worldHeight * 0.22),
                width: 300,
                height: 128,
                color: palette.highlight,
                alpha: 0.18,
                lineWidth: 2,
            },
            {
                x: Math.round(worldWidth * 0.76),
                y: Math.round(worldHeight * 0.18),
                width: 420,
                height: 164,
                color: palette.haze,
                alpha: 0.12,
                lineWidth: 3,
            },
        ];
        const frames = frameTemplates.slice(0, Math.max(0, frameCount));

        const modules = [];
        const beacons = [];
        const moduleCount = Math.ceil(worldWidth / moduleStride) + 1;
        for (let i = 0; i < moduleCount; i++) {
            const width = Phaser.Math.Between(180, 260);
            const height = Phaser.Math.Between(140, 220);
            const x = i * moduleStride + Phaser.Math.Between(-20, 40);
            const y = Phaser.Math.Between(80, Math.max(120, worldHeight - height - 160));
            const module = this.createStationModule(
                x,
                y,
                width,
                height,
                palette,
                background.moduleDetail || {}
            );
            modules.push(module);
            if (module.antenna && Math.random() < beaconChance) {
                beacons.push({
                    x: module.antenna.x,
                    y: module.antenna.tipY,
                    radius: 2,
                    color: palette.accent,
                    alpha: 0.82,
                });
            }
        }

        const catwalks = [];
        const struts = [];
        for (let x = -40; x < worldWidth + 40; x += catwalkStep) {
            const width = Phaser.Math.Between(120, 240);
            const y = Phaser.Math.Between(
                Math.round(worldHeight * 0.58),
                Math.round(worldHeight * 0.76)
            );
            const lights = [];
            const catwalkLightStep = valueOrDefault(background.catwalkLightStep, 28);
            for (let lightX = x + 18; lightX < x + width - 18; lightX += catwalkLightStep) {
                lights.push({
                    x: lightX,
                    y: y + 7,
                    width: 12,
                    height: 3,
                    color: Phaser.Utils.Array.GetRandom([palette.haze, palette.accent]),
                    alpha: Phaser.Math.FloatBetween(0.55, 0.9),
                });
            }
            catwalks.push({
                x,
                y,
                width,
                height: 18,
                fill: palette.metalAlt,
                strokeColor: palette.highlight,
                alpha: 0.8,
                lights,
            });

            const supportHeight = Phaser.Math.Between(60, 140);
            struts.push({
                points: [
                    { x: x + 22, y: y + 18 },
                    { x: x + 10, y: y + 18 + supportHeight },
                    { x: x + 34, y: y + 18 + supportHeight },
                    { x: x + 44, y: y + 18 },
                ],
                fill: palette.shadow,
                alpha: 0.42,
                stroke: { width: 1, color: palette.highlight, alpha: 0.08 },
            });
            struts.push({
                points: [
                    { x: x + width - 22, y: y + 18 },
                    { x: x + width - 34, y: y + 18 + supportHeight },
                    { x: x + width - 10, y: y + 18 + supportHeight },
                    { x: x + width, y: y + 18 },
                ],
                fill: palette.shadow,
                alpha: 0.42,
                stroke: { width: 1, color: palette.highlight, alpha: 0.08 },
            });
        }

        const floorBands = [
            {
                points: [
                    { x: -100, y: worldHeight },
                    { x: -100, y: Math.round(worldHeight * 0.84) },
                    { x: Math.round(worldWidth * 0.3), y: Math.round(worldHeight * 0.77) },
                    { x: Math.round(worldWidth * 0.68), y: Math.round(worldHeight * 0.8) },
                    { x: worldWidth + 100, y: Math.round(worldHeight * 0.78) },
                    { x: worldWidth + 100, y: worldHeight },
                ],
                fill: palette.shadow,
                alpha: 0.94,
            },
            {
                points: [
                    { x: -100, y: worldHeight },
                    { x: -100, y: Math.round(worldHeight * 0.91) },
                    { x: Math.round(worldWidth * 0.42), y: Math.round(worldHeight * 0.87) },
                    { x: worldWidth + 100, y: Math.round(worldHeight * 0.89) },
                    { x: worldWidth + 100, y: worldHeight },
                ],
                fill: palette.metal,
                alpha: 0.76,
                stroke: { width: 2, color: palette.highlight, alpha: 0.08 },
            },
        ];

        const deckLights = [];
        for (let x = -20; x < worldWidth + 40; x += deckLightStep) {
            deckLights.push({
                x,
                y: Math.round(worldHeight * 0.9),
                width: 42,
                height: 4,
                color: Phaser.Utils.Array.GetRandom([
                    palette.haze,
                    palette.accent,
                    palette.highlight,
                ]),
                alpha: Phaser.Math.FloatBetween(0.55, 0.9),
            });
        }

        const planets = background.disablePlanet
            ? []
            : [
                  {
                      x: worldWidth - 190,
                      y: 150,
                      color: 0x1d4f76,
                      size: Math.round(worldHeight * 0.12),
                      alpha: 0.92,
                      glowColor: palette.haze,
                      atmosphereColor: palette.haze,
                      shadowColor: 0x0a1a2e,
                      highlightColor: 0x5db5ff,
                  },
                  {
                      x: worldWidth - 78,
                      y: 102,
                      color: 0x67789f,
                      size: 24,
                      alpha: 0.84,
                      glowColor: palette.highlight,
                      atmosphereColor: palette.highlight,
                      shadowColor: 0x25334d,
                      highlightColor: 0xbfd4ff,
                  },
              ];

        return {
            stars,
            ribbons,
            nebulas,
            planets,
            frames,
            modules,
            catwalks: background.showCatwalks === false ? [] : catwalks,
            struts: background.showCatwalks === false ? [] : struts,
            floorBands,
            deckLights: background.showDeckLights === false ? [] : deckLights,
            beacons,
        };
    }
}
