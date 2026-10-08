import { starsFor } from './paint.js';

function drawEarth(renderer, earth) {
    if (!earth || !renderer.graphics?.fillCircle) {
        return;
    }
    const graphics = renderer.graphics;
    renderer.drawGlow(earth.x, earth.y, earth.r * 1.08, 0x7ec8ff, 0.22, 8);
    graphics.fillStyle(0x2f86d6, 1).fillCircle(earth.x, earth.y, earth.r);
    (earth.lands || []).forEach((land) => {
        graphics.fillStyle(land.color, 1);
        graphics.fillEllipse(earth.x + land.dx, earth.y + land.dy, land.rx * 2, land.ry * 2);
    });
    (earth.clouds || []).forEach((cloud) => {
        graphics.fillStyle(0xf7fbff, 0.82);
        graphics.fillEllipse(earth.x + cloud.dx, earth.y + cloud.dy, cloud.rx * 2, cloud.ry * 2);
    });
    graphics.fillStyle(0x071422, 0.62);
    graphics.fillCircle(earth.x + earth.r * 1.35, earth.y - earth.r * 0.05, earth.r * 0.72);
    graphics.lineStyle(12, 0x9ad7ff, 0.5);
    graphics.strokeCircle(earth.x, earth.y, earth.r + 8);
}

function renderIssArrays(graphics, arrays) {
    (arrays || []).forEach((panel) => {
        graphics.fillStyle(0x8d97a6, 0.9);
        graphics.fillRect(panel.x, panel.y + panel.h * 0.4, panel.w, 3);
        graphics.fillStyle(0x163e78, 0.92);
        graphics.fillRect(panel.x, panel.y, panel.w * 0.42, panel.h);
        graphics.fillRect(panel.x + panel.w * 0.5, panel.y, panel.w * 0.42, panel.h);
        graphics.fillStyle(0x8fd0ff, 0.35);
        graphics.fillRect(panel.x + 4, panel.y + 3, panel.w * 0.28, 3);
    });
}

function renderIssHullBelly(graphics, layout, worldWidth, worldHeight) {
    const bellyY = Math.round(worldHeight * 0.86);
    graphics.fillStyle(0x1a2433, 1).fillRect(0, bellyY, worldWidth, worldHeight - bellyY);
    (layout.modules || []).forEach((module) => {
        graphics.fillStyle(0xb7c3d1, 0.95);
        graphics.fillRect(module.x, module.y, module.w, module.h);
        graphics.fillStyle(0x6e7c8d, 0.9);
        graphics.fillRect(module.x, module.y + module.h - 8, module.w, 8);
        graphics.fillStyle(0x173e68, 0.95);
        graphics.fillRect(module.x + 12, module.y + 10, 22, 12);
    });
    if (layout.cupola) {
        graphics.fillStyle(0xd5dee8, 0.95);
        graphics.fillCircle(layout.cupola.x, layout.cupola.y, layout.cupola.r);
        graphics.fillStyle(0x8fd4ff, 0.55);
        graphics.fillCircle(layout.cupola.x - 8, layout.cupola.y - 6, layout.cupola.r * 0.55);
    }
}

export function createIssBackgroundLayout(background, worldWidth, worldHeight) {
    const starCount = background.starCount || 90;
    const stars = [];
    for (let i = 0; i < starCount; i++) {
        stars.push({
            x: ((i * 211) % worldWidth) + 6,
            y: ((i * 97) % Math.round(worldHeight * 0.55)) + 8,
            size: (i % 3) + 1,
            color: 0xf7fbff,
            alpha: 0.4 + (i % 5) * 0.1,
        });
    }
    const earthR = Math.round(worldHeight * 0.62);
    const earth = {
        x: Math.round(worldWidth * 0.22),
        y: Math.round(worldHeight * 0.34),
        r: earthR,
        lands: [
            {
                dx: -earthR * 0.22,
                dy: -earthR * 0.08,
                rx: earthR * 0.16,
                ry: earthR * 0.1,
                color: 0x3fa84a,
            },
            {
                dx: -earthR * 0.05,
                dy: earthR * 0.16,
                rx: earthR * 0.2,
                ry: earthR * 0.11,
                color: 0x2f8a3c,
            },
            {
                dx: earthR * 0.2,
                dy: -earthR * 0.02,
                rx: earthR * 0.14,
                ry: earthR * 0.16,
                color: 0x49b255,
            },
            {
                dx: earthR * 0.02,
                dy: -earthR * 0.22,
                rx: earthR * 0.1,
                ry: earthR * 0.06,
                color: 0xd2b36a,
            },
        ],
        clouds: [
            { dx: -earthR * 0.12, dy: earthR * 0.02, rx: earthR * 0.16, ry: earthR * 0.035 },
            { dx: earthR * 0.1, dy: -earthR * 0.16, rx: earthR * 0.12, ry: earthR * 0.03 },
            { dx: earthR * 0.16, dy: earthR * 0.2, rx: earthR * 0.14, ry: earthR * 0.028 },
        ],
    };
    const arrays = [];
    for (let x = 40; x < worldWidth; x += 280) {
        arrays.push({ x, y: Math.round(worldHeight * 0.5), w: 168, h: 22 });
    }
    const modules = [];
    for (let x = 30; x < worldWidth; x += 240) {
        modules.push({ x, y: Math.round(worldHeight * 0.9), w: 180, h: 52 });
    }
    return {
        stars,
        earth,
        arrays,
        modules,
        cupola: {
            x: worldWidth - 280,
            y: Math.round(worldHeight * 0.78),
            r: 48,
        },
    };
}

export function renderIssBackground(
    renderer,
    _background,
    layout,
    worldWidth,
    worldHeight,
    layerId
) {
    if (layerId === 'sky') {
        renderer.renderVerticalGradient(
            0,
            0,
            worldWidth,
            worldHeight,
            [0x02040c, 0x071426, 0x10283f],
            36
        );
        return;
    }
    if (layerId === 'far') {
        renderer.renderStars(starsFor(layout, 'far'));
        drawEarth(renderer, layout.earth);
        return;
    }
    if (layerId === 'mid') {
        renderIssArrays(renderer.graphics, layout.arrays);
        return;
    }
    if (layerId === 'near') {
        renderIssHullBelly(renderer.graphics, layout, worldWidth, worldHeight);
    }
}
