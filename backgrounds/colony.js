import { starsFor } from './paint.js';

export function createColonyBackgroundLayout(background, worldWidth, worldHeight) {
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
    const domes = [];
    for (let x = 120; x < worldWidth; x += 480) {
        domes.push({ x, y: worldHeight * 0.62, r: 90 + (x % 60) });
    }
    const towers = [];
    for (let x = 20; x < worldWidth; x += 180) {
        towers.push({
            x,
            w: 46,
            h: worldHeight * (0.18 + ((x * 7) % 10) / 100),
        });
    }
    const beams = [];
    for (let x = 300; x < worldWidth; x += 900) {
        beams.push({ x, top: worldHeight * 0.08, spread: 60 + (x % 40) });
    }
    return {
        stars,
        domes,
        towers,
        beams,
        moon: { x: worldWidth * 0.8, y: worldHeight * 0.14, r: 16 },
    };
}

export function renderColonyBackground(
    renderer,
    background,
    layout,
    worldWidth,
    worldHeight,
    layerId
) {
    const palette = Object.assign(
        {
            top: 0x0b0e22,
            mid: 0x3a2a5e,
            bottom: 0xff8a4a,
            silhouette: 0x1c1740,
            tower: 0x2a2352,
            signal: 0xff5a4a,
            strip: 0xffb15a,
            ground: 0x0d0b1e,
        },
        background.palette || {}
    );
    const horizon = worldHeight * 0.62;
    if (layerId === 'sky') {
        renderer.renderVerticalGradient(
            0,
            0,
            worldWidth,
            worldHeight,
            [palette.top, palette.mid, palette.bottom],
            44
        );
        renderer.drawGlow(
            worldWidth * 0.58,
            worldHeight * 0.82,
            Math.max(worldWidth * 0.16, 180),
            palette.strip,
            0.06,
            5
        );
        return;
    }
    if (layerId === 'far') {
        renderer.renderStars(starsFor(layout, 'far'));
        if (layout.moon) {
            renderer.drawGlow(layout.moon.x, layout.moon.y, layout.moon.r * 3, 0xcfd8ff, 0.1, 6);
            renderer.graphics.fillStyle(0xe8edff, 0.9);
            renderer.graphics.fillCircle(layout.moon.x, layout.moon.y, layout.moon.r);
            renderer.graphics.fillStyle(palette.silhouette, 0.35);
            renderer.graphics.fillCircle(
                layout.moon.x + layout.moon.r * 0.3,
                layout.moon.y,
                layout.moon.r * 0.7
            );
        }
        (layout.domes || []).forEach((dome) => {
            renderer.graphics.fillStyle(palette.silhouette, 0.95);
            renderer.graphics.beginPath();
            renderer.graphics.arc(dome.x, horizon, dome.r, Math.PI, 0);
            renderer.graphics.fillPath();
            renderer.graphics.fillRect(dome.x - 4, horizon - 66, 8, 66);
            renderer.graphics.fillStyle(palette.signal, 0.8);
            renderer.graphics.fillCircle(dome.x, horizon - 66, 2);
        });
        return;
    }
    if (layerId === 'mid') {
        renderer.renderStars(starsFor(layout, 'mid'));
        (layout.beams || []).forEach((beam) => {
            renderer.renderPolygon(
                [
                    { x: beam.x - 6, y: horizon },
                    { x: beam.x + 6, y: horizon },
                    { x: beam.x + beam.spread, y: beam.top },
                    { x: beam.x - beam.spread, y: beam.top },
                ],
                0xffe6b0,
                0.05
            );
        });
        (layout.towers || []).forEach((tower) => {
            renderer.graphics.fillStyle(palette.tower, 0.95);
            renderer.graphics.fillRect(tower.x, horizon - tower.h, tower.w, tower.h);
            renderer.graphics.fillStyle(palette.tower, 1);
            renderer.graphics.fillRect(tower.x - 4, horizon - tower.h, tower.w + 8, 6);
            renderer.graphics.fillStyle(palette.signal, 0.9);
            renderer.graphics.fillRect(tower.x + 8, horizon - tower.h + 14, 8, 4);
            renderer.graphics.fillStyle(palette.strip, 0.5);
            renderer.graphics.fillRect(tower.x + 8, horizon - tower.h + 22, 8, 2);
        });
        return;
    }
    if (layerId !== 'near') {
        return;
    }
    renderer.graphics.fillStyle(palette.ground, 1);
    renderer.graphics.beginPath();
    renderer.graphics.moveTo(0, worldHeight);
    renderer.graphics.lineTo(0, horizon + 40);
    for (let x = 0; x <= worldWidth; x += 80) {
        renderer.graphics.lineTo(x, horizon + 34 + ((x / 80) % 2 === 0 ? 0 : 14));
    }
    renderer.graphics.lineTo(worldWidth, worldHeight);
    renderer.graphics.closePath();
    renderer.graphics.fillPath();
    renderer.graphics.fillStyle(palette.strip, 0.9);
    renderer.graphics.fillRect(0, horizon + 52, worldWidth, 3);
    for (let x = 40; x < worldWidth; x += 200) {
        renderer.drawGlow(x, horizon + 52, 14, palette.strip, 0.2, 3);
        renderer.graphics.fillStyle(0xfff4e0, 0.95);
        renderer.graphics.fillRect(x - 3, horizon + 50, 6, 3);
    }
}
