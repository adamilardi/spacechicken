export function createWombBackgroundLayout(background, worldWidth, worldHeight) {
    const ribs = [];
    for (let x = 140, i = 0; x < worldWidth; i++) {
        ribs.push({ x, r: worldHeight * (0.3 + (i % 4) * 0.035) });
        x += 640 + ((i * 157) % 330);
    }
    const heart = { x: worldWidth * 0.55, y: worldHeight * 0.34, r: 64 };
    const sacs = [];
    for (let x = 300; x < worldWidth; x += 700) {
        sacs.push({
            x: x + ((x * 13) % 180),
            y: worldHeight * (0.24 + ((x * 5) % 10) / 60),
            r: 16 + ((x * 3) % 16),
        });
    }
    const motes = [];
    for (let i = 0; i < 60; i++) {
        motes.push({
            x: ((i * 173) % worldWidth) + 8,
            y: ((i * 97) % Math.round(worldHeight * 0.6)) + 20,
            r: 1 + (i % 3),
        });
    }
    const teethTop = [];
    for (let x = 40; x < worldWidth; x += 96) {
        teethTop.push({ x: x + ((x * 11) % 40), len: 44 + ((x * 7) % 52) });
    }
    const teethBottom = [];
    for (let x = 90; x < worldWidth; x += 110) {
        teethBottom.push({ x: x + ((x * 13) % 40), len: 36 + ((x * 5) % 44) });
    }
    const wisps = [];
    for (let x = 260; x < worldWidth; x += 900) {
        wisps.push({
            x: x + ((x * 17) % 160),
            y: worldHeight * (0.5 + ((x * 3) % 10) / 40),
            rx: 90 + ((x * 7) % 60),
            ry: 22 + ((x * 11) % 18),
        });
    }
    return { ribs, heart, sacs, motes, teethTop, teethBottom, wisps };
}

export function renderWombBackground(
    renderer,
    background,
    layout,
    worldWidth,
    worldHeight,
    layerId
) {
    const palette = Object.assign(
        {
            top: 0x12060c,
            mid: 0x3d0f22,
            bottom: 0x6e1a2e,
            fold: 0x2a0a18,
            flesh: 0x4a1420,
            vein: 0xff5a8a,
            core: 0x67ffd2,
            ground: 0x160309,
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
            worldWidth * 0.3,
            worldHeight * 0.25,
            Math.max(worldWidth * 0.1, 130),
            palette.vein,
            0.08,
            5
        );
        return;
    }
    if (layerId === 'far') {
        renderer.graphics.fillStyle(palette.fold, 0.65);
        renderer.graphics.fillRect(0, horizon, worldWidth, worldHeight - horizon);
        (layout.ribs || []).forEach((rib) => {
            const points = [];
            const steps = 14;
            const thick = 26;
            for (let i = 0; i <= steps; i++) {
                const angle = Math.PI + (i / steps) * Math.PI;
                points.push({
                    x: rib.x + Math.cos(angle) * rib.r,
                    y: horizon + Math.sin(angle) * rib.r,
                });
            }
            for (let i = steps; i >= 0; i--) {
                const angle = Math.PI + (i / steps) * Math.PI;
                points.push({
                    x: rib.x + Math.cos(angle) * (rib.r - thick),
                    y: horizon + Math.sin(angle) * (rib.r - thick),
                });
            }
            renderer.renderPolygon(points, palette.fold, 0.9);
        });
        return;
    }
    if (layerId === 'mid') {
        const heart = layout.heart;
        if (heart) {
            renderer.drawGlow(heart.x, heart.y, heart.r * 3, palette.vein, 0.14, 5);
            for (let s = 0; s < 6; s++) {
                const angle = (s / 6) * Math.PI * 2 + 0.4;
                const reach = heart.r * (2.1 + (s % 3) * 0.5);
                const base = heart.r * 0.7;
                const perpX = -Math.sin(angle) * 5;
                const perpY = Math.cos(angle) * 5;
                renderer.renderPolygon(
                    [
                        {
                            x: heart.x + Math.cos(angle) * base + perpX,
                            y: heart.y + Math.sin(angle) * base + perpY,
                        },
                        {
                            x: heart.x + Math.cos(angle) * base - perpX,
                            y: heart.y + Math.sin(angle) * base - perpY,
                        },
                        {
                            x: heart.x + Math.cos(angle) * reach,
                            y: heart.y + Math.sin(angle) * reach,
                        },
                    ],
                    palette.vein,
                    0.6
                );
            }
            renderer.graphics.fillStyle(palette.flesh, 0.95);
            renderer.graphics.fillEllipse(heart.x, heart.y, heart.r * 2, heart.r * 1.6);
            renderer.graphics.fillStyle(palette.vein, 0.9);
            renderer.graphics.fillEllipse(heart.x, heart.y, heart.r * 1.1, heart.r * 0.9);
            renderer.graphics.fillStyle(palette.core, 0.95);
            renderer.graphics.fillCircle(heart.x, heart.y, heart.r * 0.3);
            renderer.graphics.fillStyle(0xffffff, 0.9);
            renderer.graphics.fillCircle(heart.x - heart.r * 0.1, heart.y - heart.r * 0.1, 3);
        }
        (layout.sacs || []).forEach((sac) => {
            renderer.graphics.lineStyle(4, palette.fold, 0.85);
            renderer.graphics.beginPath();
            renderer.graphics.moveTo(sac.x - sac.r, 0);
            renderer.graphics.lineTo(sac.x + sac.r * 0.4, sac.y * 0.6);
            renderer.graphics.lineTo(sac.x, sac.y);
            renderer.graphics.strokePath();
            renderer.graphics.fillStyle(palette.flesh, 0.95);
            renderer.graphics.fillCircle(sac.x, sac.y, sac.r);
            renderer.graphics.fillStyle(palette.core, 0.85);
            renderer.graphics.fillCircle(sac.x, sac.y, Math.max(3, sac.r * 0.28));
        });
        (layout.motes || []).forEach((mote) => {
            renderer.graphics.fillStyle(palette.vein, 0.5);
            renderer.graphics.fillCircle(mote.x, mote.y, mote.r);
        });
        return;
    }
    if (layerId !== 'near') {
        return;
    }
    renderer.graphics.fillStyle(palette.ground, 1);
    renderer.graphics.fillRect(0, 0, worldWidth, 16);
    renderer.graphics.fillRect(0, worldHeight - 16, worldWidth, 16);
    (layout.teethTop || []).forEach((tooth) => {
        renderer.renderPolygon(
            [
                { x: tooth.x - 14, y: 0 },
                { x: tooth.x + 14, y: 0 },
                { x: tooth.x + 4, y: tooth.len },
            ],
            palette.ground,
            1
        );
    });
    (layout.teethBottom || []).forEach((tooth) => {
        renderer.renderPolygon(
            [
                { x: tooth.x - 12, y: worldHeight },
                { x: tooth.x + 12, y: worldHeight },
                { x: tooth.x - 4, y: worldHeight - tooth.len },
            ],
            palette.ground,
            1
        );
    });
    (layout.wisps || []).forEach((wisp) => {
        renderer.drawGlow(wisp.x, wisp.y, wisp.rx, palette.vein, 0.04, 8);
    });
}
