export function createBastionBackgroundLayout(background, worldWidth, worldHeight) {
    const lamps = [];
    for (let x = 90; x < worldWidth; x += 330) {
        lamps.push({ x: x + ((x * 13) % 140), y: worldHeight * 0.1 });
    }
    const arches = [];
    for (let x = 0; x < worldWidth; x += 240) {
        arches.push({
            x,
            w: 150 + ((x * 7) % 90),
            top: worldHeight * 0.16,
            bottom: worldHeight * 0.66,
        });
    }
    const doors = [];
    for (let x = 420; x < worldWidth; x += 760) {
        doors.push({
            x: x + ((x * 11) % 200),
            w: 120 + ((x * 5) % 140),
            h: worldHeight * (0.26 + ((x * 3) % 10) / 100),
        });
    }
    const struts = [];
    for (let x = 200; x < worldWidth; x += 520) {
        struts.push({ x, flip: Math.floor(x / 520) % 2 === 0 });
    }
    const chains = [];
    for (let x = 320; x < worldWidth; x += 640) {
        chains.push({
            x: x + ((x * 17) % 120),
            len: worldHeight * (0.14 + ((x * 13) % 10) / 120),
        });
    }
    const frames = [];
    for (let x = 600; x < worldWidth; x += 1400) {
        frames.push({ x: x + ((x * 29) % 300) });
    }
    return { lamps, arches, doors, struts, chains, frames };
}

export function renderBastionBackground(
    renderer,
    background,
    layout,
    worldWidth,
    worldHeight,
    layerId
) {
    const palette = Object.assign(
        {
            top: 0x060a14,
            mid: 0x12233d,
            bottom: 0x274b73,
            panel: 0x0d1626,
            seam: 0x16263f,
            girder: 0x1c2f4d,
            alert: 0xff4a3c,
            conduit: 0x9cecff,
            ground: 0x080d18,
        },
        background.palette || {}
    );
    const horizon = worldHeight * 0.62;
    const ceiling = worldHeight * 0.09;
    if (layerId === 'sky') {
        renderer.renderVerticalGradient(
            0,
            0,
            worldWidth,
            worldHeight,
            [palette.top, palette.mid, palette.bottom],
            44
        );
        renderer.graphics.fillStyle(palette.panel, 1);
        renderer.graphics.fillRect(0, 0, worldWidth, ceiling);
        renderer.graphics.fillStyle(palette.seam, 1);
        for (let x = 12; x < worldWidth; x += 48) {
            renderer.graphics.fillRect(x, ceiling - 6, 4, 4);
        }
        (layout.lamps || []).forEach((lamp) => {
            renderer.renderPolygon(
                [
                    { x: lamp.x - 8, y: ceiling },
                    { x: lamp.x + 8, y: ceiling },
                    { x: lamp.x + 52, y: lamp.y + 150 },
                    { x: lamp.x - 52, y: lamp.y + 150 },
                ],
                palette.conduit,
                0.05
            );
            renderer.drawGlow(lamp.x, lamp.y, 46, palette.conduit, 0.16, 4);
            renderer.graphics.fillStyle(palette.ground, 1);
            renderer.graphics.fillRect(lamp.x - 10, ceiling, 20, 8);
            renderer.graphics.fillStyle(0xf4ffff, 0.95);
            renderer.graphics.fillRect(lamp.x - 6, ceiling + 8, 12, 4);
        });
        return;
    }
    if (layerId === 'far') {
        (layout.arches || []).forEach((arch, index) => {
            renderer.graphics.lineStyle(3, palette.seam, 1);
            renderer.graphics.strokeRect(arch.x, arch.top, arch.w, arch.bottom - arch.top);
            renderer.graphics.lineStyle(1, palette.panel, 1);
            renderer.graphics.strokeRect(
                arch.x + 12,
                arch.top + 12,
                arch.w - 24,
                arch.bottom - arch.top - 24
            );
            renderer.graphics.fillStyle(index % 2 === 0 ? palette.alert : 0xffb15a, 0.8);
            renderer.graphics.fillCircle(arch.x + arch.w / 2, arch.top + 8, 3);
        });
        return;
    }
    if (layerId === 'mid') {
        (layout.doors || []).forEach((door) => {
            const top = horizon - door.h;
            renderer.graphics.fillStyle(palette.girder, 0.95);
            renderer.graphics.fillRect(door.x, top, door.w, door.h);
            renderer.graphics.fillStyle(palette.panel, 1);
            renderer.graphics.fillRect(door.x + door.w / 2 - 2, top, 4, door.h);
            for (let i = 0; i < 4; i++) {
                const chevronX = door.x + 10 + i * ((door.w - 20) / 4);
                renderer.renderPolygon(
                    [
                        { x: chevronX, y: horizon - 4 },
                        { x: chevronX + 12, y: horizon - 4 },
                        { x: chevronX + 6, y: horizon - 14 },
                    ],
                    i % 2 === 0 ? palette.alert : palette.conduit,
                    0.7
                );
            }
            renderer.graphics.fillStyle(palette.alert, 0.85);
            renderer.graphics.fillRect(door.x + door.w / 2 - 5, top + 10, 10, 5);
        });
        (layout.struts || []).forEach((strut) => {
            const lean = strut.flip ? -150 : 150;
            renderer.renderPolygon(
                [
                    { x: strut.x - 8, y: horizon },
                    { x: strut.x + 8, y: horizon },
                    { x: strut.x + lean + 8, y: horizon - worldHeight * 0.3 },
                    { x: strut.x + lean - 8, y: horizon - worldHeight * 0.3 },
                ],
                palette.girder,
                0.9
            );
        });
        (layout.chains || []).forEach((chain) => {
            renderer.graphics.fillStyle(palette.seam, 1);
            for (let y = ceiling; y < ceiling + chain.len; y += 10) {
                renderer.graphics.fillRect(chain.x, y, 4, 5);
            }
            renderer.graphics.fillStyle(palette.girder, 1);
            renderer.graphics.fillRect(chain.x - 3, ceiling + chain.len, 10, 8);
        });
        return;
    }
    if (layerId !== 'near') {
        return;
    }
    (layout.frames || []).forEach((frame) => {
        renderer.graphics.fillStyle(palette.ground, 1);
        renderer.graphics.fillRect(frame.x, 0, 26, 170);
        renderer.graphics.fillRect(frame.x + 34, 0, 16, 120);
        renderer.graphics.fillRect(frame.x, 170, 60, 18);
        renderer.graphics.fillRect(frame.x + 8, worldHeight - 150, 26, 150);
        renderer.graphics.fillRect(frame.x + 42, worldHeight - 100, 16, 100);
        renderer.graphics.fillStyle(palette.alert, 0.9);
        renderer.graphics.fillRect(frame.x + 30, 60, 6, 6);
    });
    for (let x = 0; x < worldWidth; x += 28) {
        renderer.graphics.fillStyle(palette.ground, 1);
        renderer.graphics.fillRect(x, horizon + 40, 20, 22);
    }
    renderer.graphics.fillStyle(palette.conduit, 0.5);
    for (let x = 0; x < worldWidth; x += 112) {
        renderer.graphics.fillRect(x, horizon + 40, 20, 2);
    }
}
