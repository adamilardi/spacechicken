export function createHiveBackgroundLayout(background, worldWidth, worldHeight) {
    const ribs = [];
    for (let x = 60; x < worldWidth; x += 200) {
        ribs.push({ x, w: 30 + (x % 40), h: worldHeight * (0.3 + ((x * 3) % 10) / 50) });
    }
    const teeth = [];
    for (let x = 100; x < worldWidth; x += 140) {
        teeth.push({ x, y: worldHeight * 0.3, h: 50 + (x % 40) });
    }
    const motes = [];
    const moteCount = 60;
    for (let i = 0; i < moteCount; i++) {
        motes.push({
            x: ((i * 173) % worldWidth) + 8,
            y: ((i * 97) % Math.round(worldHeight * 0.6)) + 20,
            r: 1 + (i % 3),
        });
    }
    const pools = [];
    for (let x = 200; x < worldWidth; x += 560) {
        pools.push({ x, y: worldHeight * 0.86, w: 130 + (x % 70) });
    }
    return { ribs, teeth, motes, pools };
}

export function renderHiveBackground(
    renderer,
    background,
    layout,
    worldWidth,
    worldHeight,
    layerId
) {
    const palette = Object.assign(
        {
            top: 0x0a1412,
            mid: 0x1c4d46,
            bottom: 0x3d1c4e,
            flesh: 0x24122e,
            chitin: 0x5e2a6e,
            chitinDark: 0x2c1238,
            glow: 0x67ffd2,
            spore: 0xc78bff,
        },
        background.palette || {}
    );
    const floorY = worldHeight * 0.72;
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
            worldWidth * 0.5,
            worldHeight * 0.4,
            Math.max(worldWidth * 0.1, 140),
            palette.glow,
            0.05,
            5
        );
        return;
    }
    if (layerId === 'far') {
        (layout.ribs || []).forEach((rib) => {
            renderer.graphics.fillStyle(palette.chitinDark, 0.9);
            renderer.graphics.fillEllipse(rib.x, worldHeight * 0.5, rib.w, rib.h);
            renderer.graphics.fillStyle(palette.chitin, 0.5);
            renderer.graphics.fillEllipse(rib.x - 4, worldHeight * 0.5, rib.w * 0.6, rib.h * 0.8);
        });
        return;
    }
    if (layerId === 'mid') {
        (layout.motes || []).forEach((mote) => {
            renderer.drawGlow(mote.x, mote.y, mote.r * 4, palette.glow, 0.12, 3);
            renderer.graphics.fillStyle(palette.glow, 0.5);
            renderer.graphics.fillCircle(mote.x, mote.y, mote.r);
        });
        (layout.teeth || []).forEach((tooth) => {
            renderer.renderPolygon(
                [
                    { x: tooth.x - 18, y: tooth.y },
                    { x: tooth.x + 18, y: tooth.y },
                    { x: tooth.x, y: tooth.y + tooth.h },
                ],
                palette.chitin,
                0.95
            );
            renderer.graphics.fillStyle(palette.glow, 0.85);
            renderer.graphics.fillRect(tooth.x - 2, tooth.y + tooth.h - 8, 4, 4);
        });
        return;
    }
    if (layerId !== 'near') {
        return;
    }
    renderer.graphics.fillStyle(palette.flesh, 1);
    renderer.graphics.fillRect(0, floorY, worldWidth, worldHeight - floorY);
    renderer.graphics.fillStyle(palette.glow, 0.9);
    renderer.graphics.fillRect(0, floorY, worldWidth, 3);
    renderer.graphics.fillStyle(palette.chitinDark, 1);
    for (let x = 0; x < worldWidth; x += 48) {
        renderer.graphics.fillRect(x, floorY + 24, 24, 10);
    }
    (layout.pools || []).forEach((pool) => {
        renderer.drawGlow(pool.x, pool.y, pool.w * 0.4, palette.spore, 0.14, 4);
        renderer.graphics.fillStyle(palette.spore, 0.55);
        renderer.graphics.fillEllipse(pool.x, pool.y, pool.w, 14);
        renderer.graphics.fillStyle(palette.glow, 0.5);
        renderer.graphics.fillEllipse(pool.x - pool.w * 0.2, pool.y - 2, pool.w * 0.3, 6);
    });
}
