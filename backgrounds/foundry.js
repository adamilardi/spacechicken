export function createFoundryBackgroundLayout(background, worldWidth, worldHeight) {
    const horizon = worldHeight * 0.7;
    const columns = [];
    for (let x = 60; x < worldWidth; x += 190) {
        columns.push({ x: x + ((x * 13) % 60), w: 26 + ((x * 7) % 30) });
    }
    const sparks = [];
    for (let i = 0; i < 60; i++) {
        sparks.push({
            x: (i * 173) % worldWidth,
            y: (i * 97) % worldHeight,
        });
    }
    const mouths = [];
    for (let x = 120; x < worldWidth; x += 320) {
        mouths.push({ x: x + ((x * 11) % 80) });
    }
    const ladles = [];
    for (let x = 200; x < worldWidth; x += 380) {
        ladles.push({ x: x + ((x * 17) % 100) });
    }
    const flows = [];
    for (let x = 0; x < worldWidth; x += 52) {
        flows.push({ x: x + ((x * 5) % 24) });
    }
    return { columns, sparks, mouths, ladles, flows, horizon };
}

export function renderFoundryBackground(
    renderer,
    background,
    layout,
    worldWidth,
    worldHeight,
    layerId
) {
    const palette = Object.assign(
        {
            top: 0x140d0a,
            mid: 0x2a1410,
            bottom: 0x4a1e12,
            ember: 0xff6a2a,
            molten: 0xffd23c,
            wall: 0x241512,
            rail: 0x3a2c26,
            signal: 0x7dff9a,
        },
        background.palette || {}
    );
    const horizon = worldHeight * 0.7;
    if (layerId === 'sky') {
        renderer.renderVerticalGradient(
            0,
            0,
            worldWidth,
            worldHeight,
            [palette.top, palette.mid, palette.bottom],
            44
        );
        (layout.columns || []).forEach((column) => {
            for (let step = 0; step < 6; step++) {
                const alpha = 0.3 - step * 0.05;
                renderer.graphics.fillStyle(palette.ember, Math.max(0.02, alpha));
                renderer.graphics.fillRect(
                    column.x,
                    horizon - ((step + 1) / 6) * horizon * 0.85,
                    column.w,
                    (horizon * 0.85) / 6 + 1
                );
            }
        });
        renderer.graphics.fillStyle(palette.molten, 0.9);
        (layout.sparks || []).forEach((spark) => {
            renderer.graphics.fillRect(spark.x, spark.y, 2, 2);
        });
        return;
    }
    if (layerId === 'far') {
        const wallTop = worldHeight * 0.3;
        renderer.graphics.fillStyle(palette.wall, 1);
        renderer.graphics.fillRect(0, wallTop, worldWidth, horizon - wallTop);
        renderer.graphics.fillStyle(palette.top, 1);
        for (let x = 0; x < worldWidth; x += 64) {
            renderer.graphics.fillRect(x, wallTop, 3, horizon - wallTop);
        }
        (layout.mouths || []).forEach((mouth) => {
            renderer.graphics.fillStyle(palette.ember, 0.95);
            renderer.graphics.fillEllipse(mouth.x, horizon - 30, 52, 40);
            renderer.graphics.fillStyle(palette.molten, 0.95);
            renderer.graphics.fillEllipse(mouth.x, horizon - 28, 28, 22);
            renderer.graphics.fillStyle(palette.wall, 1);
            renderer.graphics.fillRect(mouth.x - 34, horizon - 52, 68, 12);
        });
        return;
    }
    if (layerId === 'mid') {
        const railY = worldHeight * 0.18;
        renderer.graphics.fillStyle(palette.rail, 1);
        renderer.graphics.fillRect(0, railY, worldWidth, 10);
        (layout.ladles || []).forEach((ladle) => {
            renderer.graphics.lineStyle(5, palette.rail, 1);
            renderer.graphics.beginPath();
            renderer.graphics.moveTo(ladle.x, railY);
            renderer.graphics.lineTo(ladle.x + 40, railY + 70);
            renderer.graphics.strokePath();
            renderer.renderPolygon(
                [
                    { x: ladle.x + 16, y: railY + 70 },
                    { x: ladle.x + 64, y: railY + 70 },
                    { x: ladle.x + 56, y: railY + 104 },
                    { x: ladle.x + 24, y: railY + 104 },
                ],
                palette.wall,
                1
            );
            renderer.graphics.fillStyle(palette.molten, 0.95);
            renderer.graphics.fillRect(ladle.x + 20, railY + 70, 40, 5);
        });
        return;
    }
    if (layerId !== 'near') {
        return;
    }
    renderer.graphics.fillStyle(palette.ember, 1);
    renderer.graphics.fillRect(0, horizon + 26, worldWidth, 14);
    renderer.graphics.fillStyle(palette.molten, 0.9);
    (layout.flows || []).forEach((flow) => {
        renderer.graphics.fillRect(flow.x, horizon + 30, 30, 4);
    });
    renderer.graphics.fillStyle(palette.top, 1);
    for (let x = 0; x < worldWidth; x += 28) {
        renderer.graphics.fillRect(x, horizon, 18, 26);
    }
    renderer.graphics.fillStyle(palette.signal, 0.9);
    for (let x = 14; x < worldWidth; x += 224) {
        renderer.graphics.fillRect(x, horizon + 6, 5, 5);
    }
}
