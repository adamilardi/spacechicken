import { starsFor } from './paint.js';

export function createMarsBackgroundLayout(background, worldWidth, worldHeight) {
    const starCount = background.starCount || 70;
    const stars = [];
    for (let i = 0; i < starCount; i++) {
        stars.push({
            x: ((i * 197) % worldWidth) + 8,
            y: ((i * 89) % Math.round(worldHeight * 0.45)) + 12,
            size: (i % 3) + 1,
            color: 0xfff1d6,
            alpha: 0.45 + (i % 5) * 0.1,
        });
    }
    const dunes = [];
    for (let x = 120; x < worldWidth + 80; x += 280) {
        dunes.push({
            x,
            y: worldHeight * 0.93,
            h: 36 + (x % 40),
            w: 240 + (x % 110),
        });
    }
    const buttes = [];
    for (let x = 60; x < worldWidth; x += 520) {
        buttes.push({ x, y: worldHeight * 0.42, w: 280 });
    }
    const rocks = [];
    for (let x = 200; x < worldWidth; x += 360) {
        rocks.push({ x, y: worldHeight * 0.96, w: 36 + (x % 24), h: 14 });
    }
    return {
        stars,
        dunes,
        buttes,
        rocks,
        sun: { x: worldWidth * 0.72, y: worldHeight * 0.16, r: 28 },
        moons: [{ x: worldWidth * 0.18, y: worldHeight * 0.14, r: 14 }],
    };
}

export function renderMarsBackground(
    renderer,
    background,
    layout,
    worldWidth,
    worldHeight,
    layerId
) {
    const palette = Object.assign(
        {
            top: 0x2a0c14,
            mid: 0xc45a3a,
            bottom: 0xf0b56a,
            surface: 0xc4623a,
            dune: 0x9a3d28,
            highlight: 0xffd0a4,
            shadow: 0x4a1c16,
            dust: 0xffb15a,
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
            42
        );
        const sun = layout.sun;
        if (sun) {
            renderer.drawGlow(sun.x, sun.y, sun.r * 2.4, palette.dust, 0.12, 8);
            renderer.graphics.fillStyle(palette.highlight, 0.95).fillCircle(sun.x, sun.y, sun.r);
        }
        return;
    }
    if (layerId === 'far') {
        renderer.renderStars(starsFor(layout, 'far'));
        (layout.moons || []).forEach((moon) => {
            renderer.graphics.fillStyle(palette.highlight, 0.95).fillCircle(moon.x, moon.y, moon.r);
            renderer.graphics
                .fillStyle(palette.shadow, 0.45)
                .fillCircle(moon.x + moon.r * 0.3, moon.y, moon.r * 0.72);
        });
        return;
    }
    if (layerId === 'mid') {
        (layout.buttes || []).forEach((butte) => {
            renderer.renderPolygon(
                [
                    { x: butte.x, y: worldHeight },
                    { x: butte.x + butte.w * 0.18, y: butte.y + 30 },
                    { x: butte.x + butte.w * 0.22, y: butte.y },
                    { x: butte.x + butte.w * 0.78, y: butte.y },
                    { x: butte.x + butte.w * 0.82, y: butte.y + 30 },
                    { x: butte.x + butte.w, y: worldHeight },
                ],
                palette.shadow,
                0.92
            );
            renderer.graphics
                .fillStyle(palette.dune, 0.55)
                .fillRect(butte.x + butte.w * 0.28, butte.y + 8, butte.w * 0.44, 8);
        });
        return;
    }
    if (layerId !== 'near') {
        return;
    }
    (layout.dunes || []).forEach((dune) => {
        renderer.graphics.fillStyle(palette.dune, 0.95);
        renderer.graphics.fillEllipse(dune.x, dune.y, dune.w || 280, dune.h);
        renderer.graphics.fillStyle(palette.highlight, 0.22);
        renderer.graphics.fillEllipse(
            dune.x - 30,
            dune.y - 10,
            (dune.w || 280) * 0.55,
            dune.h * 0.35
        );
    });
    renderer.graphics
        .fillStyle(palette.surface, 1)
        .fillRect(0, worldHeight * 0.95, worldWidth, worldHeight);
    (layout.rocks || []).forEach((rock) => {
        renderer.graphics.fillStyle(palette.shadow, 0.9);
        renderer.graphics.fillEllipse(rock.x, rock.y, rock.w, rock.h);
    });
}
