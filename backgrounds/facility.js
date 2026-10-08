export function createFacilityBackgroundLayout(_background, worldWidth, worldHeight) {
    const vats = [];
    for (let x = 180; x < worldWidth; x += 460) {
        const tall = x % 920 < 460;
        vats.push({
            x,
            y: tall ? worldHeight * 0.5 : worldHeight * 0.58,
            w: tall ? 150 : 120,
            h: tall ? 230 : 170,
        });
    }
    const lights = [];
    for (let x = 90; x < worldWidth; x += 220) {
        lights.push({ x, y: 92 + (x % 440 === 90 ? 0 : 18) });
    }
    const windows = [];
    for (let x = 40; x < worldWidth; x += 520) {
        windows.push({ x, y: worldHeight * 0.28, w: 220, h: 70 });
    }
    return { vats, lights, windows, pipes: Math.round(worldHeight * 0.14) };
}

function renderFacilityVats(graphics, vats, palette) {
    (vats || []).forEach((vat) => {
        graphics.fillStyle(palette.metal, 0.95).fillRect(vat.x, vat.y, vat.w, vat.h);
        graphics
            .fillStyle(palette.shadow, 1)
            .fillRect(vat.x + 8, vat.y + 16, vat.w - 16, vat.h - 28);
        graphics
            .fillStyle(palette.accent, 0.5)
            .fillRect(vat.x + 14, vat.y + vat.h * 0.42, vat.w - 28, vat.h * 0.4);
        graphics.fillStyle(palette.glass, 0.28).fillRect(vat.x + 14, vat.y + 22, vat.w - 28, 18);
        graphics.fillStyle(palette.glow, 0.9).fillCircle(vat.x + 28, vat.y + vat.h * 0.62, 5);
        graphics
            .fillStyle(palette.glass, 0.8)
            .fillCircle(vat.x + vat.w - 30, vat.y + vat.h * 0.7, 3);
        graphics
            .fillStyle(palette.metalAlt || palette.metal, 1)
            .fillRect(vat.x - 6, vat.y, vat.w + 12, 10);
        graphics.fillStyle(palette.metal, 1).fillRect(vat.x + vat.w * 0.5 - 4, vat.y - 28, 8, 28);
    });
}

export function renderFacilityBackground(
    renderer,
    background,
    layout,
    worldWidth,
    worldHeight,
    layerId
) {
    const palette = Object.assign(
        {
            top: 0x071016,
            mid: 0x12343c,
            bottom: 0x1c4d46,
            metal: 0x1a3038,
            glow: 0x67ffd2,
            accent: 0xd6ff4a,
            glass: 0x8ee7ff,
            shadow: 0x060d12,
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
        renderer.renderScanlines(worldWidth, worldHeight, palette.shadow, 0.08, 8, 1);
        return;
    }
    if (layerId === 'far') {
        (layout.windows || []).forEach((row) => {
            renderer.graphics.fillStyle(palette.shadow, 0.55).fillRect(row.x, row.y, row.w, row.h);
            for (let x = row.x + 8; x < row.x + row.w - 8; x += 28) {
                renderer.graphics
                    .fillStyle(palette.glass, 0.35)
                    .fillRect(x, row.y + 6, 16, row.h - 12);
            }
        });
        (layout.lights || []).forEach((light) => {
            renderer.drawGlow(light.x, light.y, 36, palette.glow, 0.16, 6);
            renderer.graphics.fillStyle(palette.glow, 0.9).fillCircle(light.x, light.y, 4);
        });
        return;
    }
    if (layerId === 'mid') {
        renderFacilityVats(renderer.graphics, layout.vats, palette);
        return;
    }
    if (layerId !== 'near') {
        return;
    }
    const ceiling = layout.pipes || 80;
    renderer.graphics.fillStyle(palette.shadow, 0.95).fillRect(0, 0, worldWidth, ceiling);
    for (let x = 0; x < worldWidth; x += 140) {
        renderer.graphics.fillStyle(palette.metal, 1).fillRect(x + 18, ceiling - 18, 86, 18);
        renderer.graphics.fillStyle(palette.glow, 0.85).fillRect(x + 36, ceiling - 8, 28, 4);
        renderer.graphics.fillStyle(palette.metal, 0.9).fillRect(x + 54, ceiling, 8, 36);
    }
    renderer.graphics.fillStyle(palette.metal, 1).fillRect(0, worldHeight - 70, worldWidth, 70);
    for (let x = 0; x < worldWidth; x += 24) {
        renderer.graphics.fillStyle(x % 48 === 0 ? palette.glow : palette.shadow, 0.9);
        renderer.graphics.fillRect(x, worldHeight - 16, 24, 16);
    }
}
