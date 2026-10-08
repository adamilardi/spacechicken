import { GAME_CONSTANTS } from '../Constants.js';
import { valueOrDefault } from '../GameUtils.js';
import { adjustColor, blendColor, createRidgePoints, sampleRidgeY, starsFor } from './paint.js';

function createSpaceTower(x, groundY, width, height, palette) {
    const halfWidth = width * 0.5;
    const topY = groundY - height;
    const bodyColor = adjustColor(palette.silhouetteNear, Phaser.Math.Between(10, 26));
    const shadowColor = adjustColor(bodyColor, -12);
    const edgeColor = adjustColor(palette.haze, -30);
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
            fill: adjustColor(bodyColor, 10),
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
            fill: adjustColor(bodyColor, 12),
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
            fill: adjustColor(bodyColor, 14),
            alpha: 0.98,
        });
        shapes.push({
            points: [
                { x: x - neckWidth * 0.45, y: topY + crownHeight * 0.22 },
                { x: x, y: topY - crownHeight * 0.28 },
                { x: x + neckWidth * 0.45, y: topY + crownHeight * 0.22 },
            ],
            fill: adjustColor(bodyColor, 22),
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
            fill: adjustColor(bodyColor, 8),
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

export function createSpaceBackgroundLayout(background, worldWidth, worldHeight) {
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
    const starColors = [0xffffff, palette.haze, palette.glow, adjustColor(palette.accent, 18)];
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
        ringColor: blendColor(palette.haze, palette.glow, 0.5),
        ringAlpha: 0.5,
        ringWidth: Math.round(heroSize * 2.3),
        ringHeight: Math.max(32, Math.round(heroSize * 0.7)),
        shadowColor: adjustColor(heroTemplate.color, -70),
        highlightColor: adjustColor(heroTemplate.color, 55),
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
            shadowColor: adjustColor(template.color, -60),
            highlightColor: adjustColor(template.color, 45),
        });
    }

    const horizonY = Math.round(worldHeight * 0.72);
    const farRidge = createRidgePoints(worldWidth, horizonY + 12, 36, 110, 120, 220);
    const nearRidge = createRidgePoints(worldWidth, horizonY + 92, 70, 180, 90, 160);

    const towers = [];
    const beacons = [];
    for (
        let x = Phaser.Math.Between(60, 140);
        x < worldWidth - 40;
        x += Phaser.Math.Between(180, 320)
    ) {
        const groundY = sampleRidgeY(nearRidge, x, worldHeight - 90);
        const width = Phaser.Math.Between(22, 48);
        const height = Phaser.Math.Between(60, 170);
        const tower = createSpaceTower(x, groundY, width, height, palette);
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

export function renderSpaceBackground(
    renderer,
    background,
    layout,
    worldWidth,
    worldHeight,
    layerId
) {
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

    if (layerId === 'sky') {
        renderer.renderVerticalGradient(
            0,
            0,
            worldWidth,
            worldHeight,
            [palette.top, palette.mid, palette.bottom],
            48
        );
        renderer.drawGlow(
            worldWidth * 0.58,
            worldHeight * 0.82,
            Math.max(worldWidth * 0.16, 180),
            palette.glow,
            0.06,
            5
        );
        return;
    }

    if (layerId === 'far') {
        renderer.renderAtmosphericRibbons(layout.ribbons);
        (layout.nebulas || []).forEach((nebula) => {
            renderer.drawGlow(nebula.x, nebula.y, nebula.radius, nebula.color, nebula.alpha, 6);
        });
        renderer.renderStars(starsFor(layout, 'far'));
        return;
    }

    if (layerId === 'mid') {
        renderer.renderStars(starsFor(layout, 'mid'));
        renderer.renderPlanets(layout.planets);
        if (layout.farRidge && layout.farRidge.length) {
            const farPoints = [
                { x: -80, y: worldHeight },
                ...layout.farRidge,
                { x: worldWidth + 80, y: worldHeight },
            ];
            renderer.renderPolygon(farPoints, palette.silhouetteFar, 0.95);
            renderer.renderRidgeLight(layout.farRidge, palette.haze, 0.22);
        }
        return;
    }

    if (layerId !== 'near') {
        return;
    }

    renderer.renderPerspectiveGrid(layout.grid, worldWidth, worldHeight);

    if (layout.nearRidge && layout.nearRidge.length) {
        const nearPoints = [
            { x: -80, y: worldHeight },
            ...layout.nearRidge,
            { x: worldWidth + 80, y: worldHeight },
        ];
        renderer.renderPolygon(nearPoints, palette.silhouetteNear, 0.98);
        renderer.renderRidgeLight(layout.nearRidge, palette.accent, 0.16);
    }

    (layout.towers || []).forEach((tower) => {
        (tower.shapes || []).forEach((shape) => {
            renderer.renderPolygon(
                shape.points,
                shape.fill,
                valueOrDefault(shape.alpha, 1),
                shape.stroke
            );
        });
        if (tower.spine) {
            renderer.graphics.fillStyle(tower.spine.fill, valueOrDefault(tower.spine.alpha, 1));
            renderer.graphics.fillRect(
                tower.spine.x,
                tower.spine.y,
                tower.spine.width,
                tower.spine.height
            );
        }
        (tower.windows || []).forEach((windowPanel) => {
            renderer.graphics.fillStyle(windowPanel.color, valueOrDefault(windowPanel.alpha, 1));
            renderer.graphics.fillRect(
                windowPanel.x,
                windowPanel.y,
                windowPanel.width,
                windowPanel.height
            );
        });
        if (tower.glow) {
            renderer.drawGlow(
                tower.glow.x,
                tower.glow.y,
                tower.glow.radius,
                tower.glow.color,
                tower.glow.alpha,
                4
            );
        }
        (tower.crownLights || []).forEach((light) => {
            renderer.drawGlow(
                light.x,
                light.y,
                light.radius * 3,
                light.color,
                light.alpha * 0.16,
                3
            );
            renderer.graphics
                .fillStyle(light.color, light.alpha)
                .fillCircle(light.x, light.y, light.radius);
        });
    });

    (layout.beacons || []).forEach((beacon) => {
        renderer.drawGlow(
            beacon.x,
            beacon.y,
            beacon.radius * 4,
            beacon.color,
            beacon.alpha * 0.22,
            4
        );
        renderer.graphics
            .fillStyle(beacon.color, beacon.alpha)
            .fillCircle(beacon.x, beacon.y, beacon.radius);
    });
}
