export function createSkyhookBackgroundLayout(background, worldWidth, worldHeight) {
    const ribbonX = worldWidth * 0.55;
    const stars = [];
    for (let i = 0; i < 50; i++) {
        stars.push({
            x: (i * 211) % worldWidth,
            y: (i * 61) % Math.round(worldHeight * 0.5),
        });
    }
    const climbers = [worldHeight * 0.2, worldHeight * 0.42, worldHeight * 0.64];
    const towers = [];
    for (let x = 60; x < worldWidth; x += 640) {
        if (Math.abs(x - ribbonX) < 90) {
            continue;
        }
        towers.push({ x: x + ((x * 11) % 80), h: 150 + ((x * 7) % 70) });
    }
    const pylon = { x: ribbonX, h: 130 };
    return { ribbonX, stars, climbers, towers, pylon };
}

export function renderSkyhookBackground(
    renderer,
    background,
    layout,
    worldWidth,
    worldHeight,
    layerId
) {
    const palette = Object.assign(
        {
            top: 0x060b18,
            mid: 0x101a33,
            bottom: 0x1d2c4d,
            ribbon: 0x7df9ff,
            climber: 0xffb15a,
            tower: 0x1d2c4d,
            beacon: 0xff4a3c,
            pylon: 0x39435a,
            panel: 0x141c30,
            slab: 0x39435a,
            pipe: 0x0a0f1c,
        },
        background.palette || {}
    );
    const horizon = worldHeight * 0.74;
    if (layerId === 'sky') {
        renderer.renderVerticalGradient(
            0,
            0,
            worldWidth,
            worldHeight,
            [palette.top, palette.mid, palette.bottom],
            44
        );
        renderer.graphics.fillStyle(0xffffff, 0.8);
        (layout.stars || []).forEach((star) => {
            renderer.graphics.fillRect(star.x, star.y, 1, 1);
        });
        renderer.graphics.fillStyle(palette.ribbon, 0.25);
        renderer.graphics.fillRect(layout.ribbonX - 6, 0, 12, worldHeight);
        renderer.graphics.fillStyle(palette.ribbon, 0.95);
        renderer.graphics.fillRect(layout.ribbonX - 2, 0, 4, worldHeight);
        (layout.climbers || []).forEach((climber) => {
            renderer.graphics.fillStyle(palette.climber, 0.95);
            renderer.graphics.fillRect(layout.ribbonX - 8, climber, 16, 6);
            renderer.graphics.fillStyle(0xfff4e0, 0.95);
            renderer.graphics.fillRect(layout.ribbonX - 8, climber, 16, 2);
        });
        return;
    }
    if (layerId === 'far') {
        (layout.towers || []).forEach((tower) => {
            renderer.graphics.lineStyle(5, palette.tower, 1);
            renderer.graphics.strokeRect(tower.x, horizon - tower.h, 70, tower.h);
            renderer.graphics.beginPath();
            renderer.graphics.moveTo(tower.x, horizon);
            renderer.graphics.lineTo(tower.x + 70, horizon - tower.h);
            renderer.graphics.moveTo(tower.x + 70, horizon);
            renderer.graphics.lineTo(tower.x, horizon - tower.h);
            renderer.graphics.strokePath();
            renderer.graphics.fillStyle(palette.beacon, 0.9);
            renderer.graphics.fillRect(tower.x + 32, horizon - tower.h - 6, 6, 6);
        });
        return;
    }
    if (layerId === 'mid') {
        const pylon = layout.pylon || { x: layout.ribbonX, h: 130 };
        renderer.graphics.fillStyle(palette.pylon, 1);
        renderer.graphics.fillRect(pylon.x - 30, horizon - pylon.h, 60, pylon.h);
        renderer.graphics.fillStyle(palette.panel, 1);
        for (let y = horizon - pylon.h + 10; y < horizon; y += 20) {
            renderer.graphics.fillRect(pylon.x - 30, y, 60, 3);
        }
        renderer.graphics.fillStyle(palette.ribbon, 0.95);
        renderer.graphics.fillRect(pylon.x - 30, horizon - pylon.h, 60, 6);
        for (const side of [-1, 1]) {
            renderer.graphics.lineStyle(8, palette.pylon, 1);
            renderer.graphics.beginPath();
            renderer.graphics.moveTo(pylon.x + side * 30, horizon - 90);
            renderer.graphics.lineTo(pylon.x + side * 130, horizon - 130);
            renderer.graphics.strokePath();
            renderer.graphics.fillStyle(palette.climber, 0.95);
            renderer.graphics.fillRect(pylon.x + side * 130 - 5, horizon - 136, 10, 12);
        }
        return;
    }
    if (layerId !== 'near') {
        return;
    }
    renderer.graphics.fillStyle(palette.panel, 1);
    renderer.graphics.fillRect(0, horizon, worldWidth, worldHeight - horizon);
    renderer.graphics.fillStyle(palette.slab, 1);
    renderer.graphics.fillRect(0, horizon, worldWidth, 8);
    renderer.graphics.fillStyle(palette.ribbon, 0.8);
    for (let x = 0; x < worldWidth; x += 160) {
        renderer.graphics.fillRect(x, horizon, 40, 3);
    }
    renderer.graphics.fillStyle(palette.pipe, 1);
    for (let i = 0; i < 3; i++) {
        renderer.graphics.fillRect(0, horizon + 18 + i * 14, worldWidth, 6);
    }
    renderer.graphics.fillStyle(palette.beacon, 0.9);
    for (let x = 40; x < worldWidth; x += 200) {
        renderer.graphics.fillRect(x, horizon + 18, 5, 34);
    }
}
