import { starsFor } from './paint.js';

export function createMoonBackgroundLayout(background, worldWidth, worldHeight) {
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

export function renderMoonBackground(
    renderer,
    background,
    layout,
    worldWidth,
    worldHeight,
    layerId
) {
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

    if (layerId === 'sky') {
        renderer.renderVerticalGradient(
            0,
            0,
            worldWidth,
            worldHeight,
            [palette.top, palette.mid, palette.bottom],
            40
        );
        renderer.drawGlow(
            worldWidth * 0.3,
            worldHeight * 0.48,
            worldHeight * 0.52,
            0x729fc8,
            0.08,
            8
        );
        return;
    }

    if (layerId === 'far') {
        renderer.renderStars(starsFor(layout, 'far'));
        renderer.drawGlow(worldWidth * 0.08, worldHeight * 0.18, 120, 0xffd38a, 0.14, 10);
        renderer.graphics
            .fillStyle(0xfff1bd, 0.95)
            .fillCircle(worldWidth * 0.08, worldHeight * 0.18, 9);
        return;
    }

    if (layerId === 'mid') {
        renderer.renderStars(starsFor(layout, 'mid'));
        // The final ascent passes beneath a huge blue world, giving the level a clear landmark.
        const planetSize = Math.min(170, worldHeight * 0.2);
        renderer.renderPlanet({
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
        return;
    }

    if (layerId !== 'near') {
        return;
    }

    const surfaceY = worldHeight * 0.68;
    renderer.renderPolygon(
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
        renderer.graphics.fillStyle(palette.highlight, 0.28);
        renderer.graphics.fillEllipse(crater.x, crater.y + 3, crater.r * 2.1, crater.r * 0.72);
        renderer.graphics.fillStyle(palette.crater, 0.95);
        renderer.graphics.fillEllipse(crater.x, crater.y, crater.r * 2, crater.r * 0.65);
        renderer.graphics.fillStyle(palette.shadow, 0.5);
        renderer.graphics.fillEllipse(crater.x + 5, crater.y - 3, crater.r * 1.65, crater.r * 0.42);
    });

    const ridgeY = surfaceY - 20;
    renderer.renderPolygon(
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
