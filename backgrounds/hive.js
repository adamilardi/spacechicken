export function createHiveBackgroundLayout(background, worldWidth, worldHeight) {
    // Connected cavern buttresses, with open chambers between them.
    const ribs = [];
    for (let x = -100, i = 0; x < worldWidth + 400; i++) {
        ribs.push({ x, w: 180 + ((i * 71) % 130), lean: (i % 2 ? 1 : -1) * 65 });
        x += 680 + ((i * 137) % 290);
    }
    const nests = ribs
        .filter((_, i) => i % 2 === 0)
        .map((rib, i) => ({
            x: rib.x + rib.w * 0.4,
            y: worldHeight * (0.22 + (i % 3) * 0.07),
            r: 24 + (i % 3) * 8,
        }));
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
    return { ribs, nests, motes, pools };
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
        // Both ends meet a continuous ceiling/floor; nothing floats like a hazard.
        renderer.graphics.fillStyle(palette.chitinDark, 0.95);
        renderer.graphics.fillRect(0, 0, worldWidth, worldHeight * 0.1);
        renderer.graphics.fillRect(0, floorY, worldWidth, worldHeight - floorY);
        (layout.ribs || []).forEach((rib) => {
            const x = rib.x;
            const w = rib.w;
            renderer.renderPolygon(
                [
                    { x: x - w, y: 0 },
                    { x: x + w * 1.5, y: 0 },
                    { x: x + w, y: worldHeight * 0.13 },
                    { x: x + w * 0.48 + rib.lean, y: worldHeight * 0.3 },
                    { x: x + w * 0.32, y: floorY - 90 },
                    { x: x + w, y: floorY + 30 },
                    { x: x - w * 0.6, y: floorY + 30 },
                    { x: x - w * 0.12, y: floorY - 100 },
                    { x: x + rib.lean, y: worldHeight * 0.28 },
                    { x: x - w * 0.5, y: worldHeight * 0.12 },
                ],
                palette.chitinDark,
                0.9
            );
            renderer.renderPolygon(
                [
                    { x: x + w * 0.95, y: worldHeight * 0.12 },
                    { x: x + w * 0.48 + rib.lean, y: worldHeight * 0.3 },
                    { x: x + w * 0.32, y: floorY - 90 },
                    { x: x + w * 0.13, y: floorY - 70 },
                    { x: x + w * 0.28 + rib.lean, y: worldHeight * 0.29 },
                ],
                palette.chitin,
                0.25
            );
        });
        (layout.nests || []).forEach((nest) => {
            renderer.drawGlow(nest.x, nest.y, nest.r * 2, palette.spore, 0.06, 5);
            renderer.graphics.fillStyle(palette.flesh, 0.9);
            renderer.graphics.fillEllipse(nest.x, nest.y, nest.r * 2, nest.r * 1.3);
            renderer.graphics.fillStyle(palette.glow, 0.2);
            renderer.graphics.fillEllipse(nest.x, nest.y + 2, nest.r, nest.r * 0.5);
        });
        return;
    }
    if (layerId === 'mid') {
        (layout.motes || []).forEach((mote) => {
            renderer.drawGlow(mote.x, mote.y, mote.r * 4, palette.glow, 0.12, 3);
            renderer.graphics.fillStyle(palette.glow, 0.5);
            renderer.graphics.fillCircle(mote.x, mote.y, mote.r);
        });
        return;
    }
    if (layerId !== 'near') {
        return;
    }
    renderer.graphics.fillStyle(palette.flesh, 1);
    renderer.graphics.fillRect(0, floorY, worldWidth, worldHeight - floorY);

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
