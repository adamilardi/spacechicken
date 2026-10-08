export function createHarborBackgroundLayout(background, worldWidth, worldHeight) {
    const horizon = worldHeight * 0.72;
    const sun = { x: worldWidth * 0.68, y: horizon - 26, r: 30 };
    const clouds = [];
    for (let i = 0; i < 4; i++) {
        clouds.push({
            x: (i * 260 + 60) % worldWidth,
            y: worldHeight * 0.2 + i * 26,
            w: 220 - i * 30,
        });
    }
    const hulls = [];
    for (let x = 40; x < worldWidth; x += 560) {
        hulls.push({
            x: x + ((x * 11) % 120),
            w: 130 + ((x * 7) % 130),
            h: 40 + ((x * 5) % 28),
        });
    }
    const cranes = [];
    for (let x = 420; x < worldWidth; x += 900) {
        cranes.push({ x: x + ((x * 13) % 160) });
    }
    const stacks = [];
    for (let x = 700; x < worldWidth; x += 1100) {
        const base = x + ((x * 17) % 200);
        stacks.push({ x: base, y: horizon - 30 });
        stacks.push({ x: base + 64, y: horizon - 30 });
        stacks.push({ x: base + 32, y: horizon - 62 });
    }
    const pilings = [];
    for (let x = 20; x < worldWidth; x += 120) {
        pilings.push(x + ((x * 3) % 24));
    }
    const shimmers = [];
    for (let x = 0; x < worldWidth; x += 46) {
        shimmers.push({
            x: x + ((x * 7) % 20),
            y: horizon + 18 + ((x * 3) % 24),
        });
    }
    return { sun, clouds, hulls, cranes, stacks, pilings, shimmers };
}

export function renderHarborBackground(
    renderer,
    background,
    layout,
    worldWidth,
    worldHeight,
    layerId
) {
    const palette = Object.assign(
        {
            top: 0x1b2b4a,
            mid: 0x4a3a52,
            bottom: 0xff9a4a,
            sun: 0xffd7a8,
            cloud: 0x141c30,
            hull: 0x141c30,
            porthole: 0xff9a4a,
            crane: 0x2c3a52,
            box: 0x6e3a22,
            piling: 0x0a101c,
            shimmer: 0xff9a4a,
            water: 0x0a1626,
        },
        background.palette || {}
    );
    const horizon = worldHeight * 0.72;
    if (layerId === 'sky') {
        renderer.renderVerticalGradient(
            0,
            0,
            worldWidth,
            worldHeight,
            [palette.top, palette.mid, palette.bottom, palette.water],
            44
        );
        renderer.graphics.fillStyle(palette.bottom, 0.9);
        renderer.graphics.fillCircle(layout.sun.x, layout.sun.y, layout.sun.r);
        renderer.graphics.fillStyle(palette.sun, 0.95);
        renderer.graphics.fillCircle(layout.sun.x, layout.sun.y, layout.sun.r * 0.66);
        (layout.clouds || []).forEach((cloud) => {
            renderer.graphics.fillStyle(palette.cloud, 0.75);
            renderer.graphics.fillRect(cloud.x, cloud.y, cloud.w, 8);
        });
        renderer.graphics.fillStyle(palette.sun, 0.4);
        renderer.graphics.fillRect(layout.sun.x - 90, layout.sun.y - 4, 180, 3);
        return;
    }
    if (layerId === 'far') {
        (layout.hulls || []).forEach((hull) => {
            renderer.renderPolygon(
                [
                    { x: hull.x, y: horizon },
                    { x: hull.x + 14, y: horizon - hull.h },
                    { x: hull.x + hull.w - 14, y: horizon - hull.h },
                    { x: hull.x + hull.w, y: horizon },
                ],
                palette.hull,
                1
            );
            renderer.graphics.fillStyle(palette.hull, 1);
            renderer.graphics.fillRect(hull.x + hull.w * 0.3, horizon - hull.h - 16, 10, 16);
            renderer.graphics.fillStyle(palette.porthole, 0.9);
            for (let px = hull.x + 24; px < hull.x + hull.w - 20; px += 26) {
                renderer.graphics.fillRect(px, horizon - hull.h + 12, 6, 5);
            }
        });
        return;
    }
    if (layerId === 'mid') {
        (layout.cranes || []).forEach((crane) => {
            renderer.graphics.lineStyle(6, palette.crane, 1);
            renderer.graphics.beginPath();
            renderer.graphics.moveTo(crane.x, horizon);
            renderer.graphics.lineTo(crane.x + 50, horizon - 120);
            renderer.graphics.lineTo(crane.x + 200, horizon - 120);
            renderer.graphics.moveTo(crane.x + 50, horizon - 120);
            renderer.graphics.lineTo(crane.x, horizon - 40);
            renderer.graphics.strokePath();
            renderer.graphics.lineStyle(2, palette.crane, 1);
            renderer.graphics.beginPath();
            renderer.graphics.moveTo(crane.x + 125, horizon - 120);
            renderer.graphics.lineTo(crane.x + 125, horizon - 60);
            renderer.graphics.strokePath();
            renderer.graphics.fillStyle(palette.crane, 1);
            renderer.graphics.fillRect(crane.x + 110, horizon - 60, 30, 26);
        });
        (layout.stacks || []).forEach((stack, index) => {
            const colors = [palette.box, 0x3f6e5a, 0x8a5a2a, 0x54607a];
            renderer.graphics.fillStyle(colors[index % colors.length], 0.95);
            renderer.graphics.fillRect(stack.x, stack.y, 60, 28);
            renderer.graphics.fillStyle(0x000000, 0.3);
            renderer.graphics.fillRect(stack.x, stack.y + 12, 60, 3);
        });
        return;
    }
    if (layerId !== 'near') {
        return;
    }
    (layout.pilings || []).forEach((piling) => {
        renderer.graphics.fillStyle(palette.piling, 1);
        renderer.graphics.fillRect(piling, horizon - 10, 14, worldHeight - horizon + 10);
        renderer.graphics.fillRect(piling - 6, horizon - 16, 26, 8);
    });
    renderer.graphics.fillStyle(palette.shimmer, 0.5);
    (layout.shimmers || []).forEach((shimmer) => {
        renderer.graphics.fillRect(shimmer.x, shimmer.y, 26, 2);
    });
}
