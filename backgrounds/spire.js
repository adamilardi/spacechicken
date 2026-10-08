import { starsFor } from './paint.js';

export function createSpireBackgroundLayout(background, worldWidth, worldHeight) {
    const starCount = background.starCount || 90;
    const stars = [];
    for (let i = 0; i < starCount; i++) {
        stars.push({
            x: ((i * 197) % worldWidth) + 8,
            y: ((i * 89) % Math.round(worldHeight * 0.45)) + 12,
            size: (i % 3) + 1,
            color: 0xcfd8ff,
            alpha: 0.45 + (i % 5) * 0.1,
        });
    }
    const fins = [];
    for (let x = 200; x < worldWidth; x += 620) {
        fins.push({ x, w: 90 + (x % 60), h: worldHeight * (0.2 + ((x * 5) % 10) / 80) });
    }
    return {
        stars,
        fins,
        planet: { x: worldWidth * 0.8, y: worldHeight * 0.24, r: 40 },
        spire: { x: worldWidth * 0.5, w: 80 },
    };
}

export function renderSpireBackground(
    renderer,
    background,
    layout,
    worldWidth,
    worldHeight,
    layerId
) {
    const palette = Object.assign(
        {
            top: 0x060818,
            mid: 0x1a2a5e,
            bottom: 0x0a0d20,
            planet: 0x2d6bb0,
            ring: 0x9cecff,
            gold: 0x8a6a1c,
            bright: 0xffe14a,
            hull: 0x101828,
            seam: 0xf4f7fb,
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
            44
        );
        return;
    }
    if (layerId === 'far') {
        renderer.renderStars(starsFor(layout, 'far'));
        if (layout.planet) {
            const planet = layout.planet;
            renderer.drawGlow(planet.x, planet.y, planet.r * 1.8, palette.planet, 0.16, 6);
            renderer.graphics.fillStyle(palette.planet, 0.95);
            renderer.graphics.fillCircle(planet.x, planet.y, planet.r);
            renderer.graphics.fillStyle(palette.bottom, 0.45);
            renderer.graphics.fillCircle(planet.x + planet.r * 0.3, planet.y, planet.r * 0.72);
            renderer.graphics.lineStyle(2, palette.ring, 0.5);
            renderer.graphics.strokeEllipse(planet.x, planet.y, planet.r * 3.2, planet.r * 0.6);
        }
        return;
    }
    if (layerId === 'mid') {
        renderer.renderStars(starsFor(layout, 'mid'));
        if (layout.spire) {
            const spire = layout.spire;
            const baseY = worldHeight * 0.75;
            const tipY = worldHeight * 0.2;
            renderer.renderPolygon(
                [
                    { x: spire.x - spire.w * 0.5, y: baseY },
                    { x: spire.x - 12, y: tipY },
                    { x: spire.x + 12, y: tipY },
                    { x: spire.x + spire.w * 0.5, y: baseY },
                ],
                palette.gold,
                0.9
            );
            renderer.graphics.fillStyle(palette.bright, 0.95);
            renderer.graphics.fillRect(spire.x - 4, tipY + 40, 8, 60);
            renderer.drawGlow(spire.x, tipY, 30, palette.bright, 0.2, 4);
            renderer.graphics.fillStyle(palette.bright, 0.95);
            renderer.graphics.fillCircle(spire.x, tipY, 5);
        }
        (layout.fins || []).forEach((fin) => {
            renderer.renderPolygon(
                [
                    { x: fin.x - fin.w * 0.5, y: worldHeight * 0.78 },
                    { x: fin.x, y: worldHeight * 0.78 - fin.h },
                    { x: fin.x + fin.w * 0.5, y: worldHeight * 0.78 },
                ],
                palette.hull,
                0.92
            );
        });
        return;
    }
    if (layerId !== 'near') {
        return;
    }
    renderer.graphics.fillStyle(palette.hull, 1);
    renderer.graphics.fillRect(0, worldHeight * 0.78, worldWidth, worldHeight);
    renderer.graphics.fillStyle(palette.seam, 0.9);
    renderer.graphics.fillRect(0, worldHeight * 0.78, worldWidth, 3);
    renderer.graphics.fillStyle(palette.gold, 0.85);
    for (let x = 60; x < worldWidth; x += 240) {
        renderer.graphics.fillRect(x, worldHeight * 0.78 + 12, 20, 4);
    }
}
