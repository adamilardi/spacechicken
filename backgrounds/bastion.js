import { adjustColor } from './paint.js';

function drift(x, salt, mod) {
    return (x * salt) % mod;
}

export function createBastionBackgroundLayout(background, worldWidth, worldHeight) {
    const lamps = [];
    for (let x = 90; x < worldWidth; x += 330) {
        lamps.push({
            x: x + drift(x, 13, 140),
            y: worldHeight * 0.1,
            r: 38 + drift(x, 7, 26),
        });
    }
    const beams = [];
    for (let x = 60; x < worldWidth; x += 420) {
        beams.push({
            x: x + drift(x, 5, 90),
            w: 46 + drift(x, 3, 70),
            drop: worldHeight * (0.04 + drift(x, 7, 8) / 200),
        });
    }
    const arches = [];
    for (let x = 0; x < worldWidth; x += 320) {
        arches.push({
            x,
            w: 120 + drift(x, 7, 100),
            top: worldHeight * 0.09,
            bottom: worldHeight * 0.92,
            brace: Math.floor(x / 320) % 2 === 0,
        });
    }
    const shafts = [];
    for (let x = 40; x < worldWidth; x += 300) {
        shafts.push({
            x: x + drift(x, 11, 60),
            w: 34 + drift(x, 13, 52),
            lit: Math.floor(x / 300) % 3 !== 1,
        });
    }
    const rings = [];
    for (let x = 500; x < worldWidth; x += 1500) {
        rings.push({
            x: x + drift(x, 29, 300),
            y: worldHeight * (0.3 + drift(x, 3, 20) / 100),
            r: 80 + drift(x, 7, 60),
        });
    }
    const crystals = [];
    for (let x = 200; x < worldWidth; x += 640) {
        crystals.push({
            x: x + drift(x, 17, 120),
            y: worldHeight * (0.25 + drift(x, 5, 35) / 100),
            len: 60 + drift(x, 11, 80),
            lean: drift(x, 7, 80) - 40,
        });
    }
    const plates = [];
    const rowGap = 230;
    const rows = Math.max(2, Math.floor((worldHeight * 0.65) / rowGap));
    for (let row = 0; row < rows; row++) {
        const y = worldHeight * 0.2 + row * ((worldHeight * 0.6) / Math.max(1, rows - 1));
        for (let x = 30; x < worldWidth; x += 260) {
            plates.push({
                x: x + drift(x + row * 131, 7, 40),
                y: y + drift(x, 3, 24) - 12,
                w: 120 + drift(x + row * 57, 11, 100),
                h: 84 + drift(x, 5, 40),
                grille: drift(x + row * 91, 13, 4) === 0,
            });
        }
    }
    const pipes = [];
    const pipeRows = Math.max(2, Math.floor(worldHeight / 340));
    for (let row = 0; row < pipeRows; row++) {
        const y = worldHeight * (0.16 + (0.68 * row) / Math.max(1, pipeRows - 1));
        pipes.push({ y, h: 10 + drift(row * 733, 7, 9) });
    }
    const doors = [];
    let doorIndex = 0;
    for (let x = 420; x < worldWidth; x += 760) {
        const bottom =
            worldHeight * 0.2 +
            (doorIndex % rows) * ((worldHeight * 0.6) / Math.max(1, rows - 1)) +
            96;
        doors.push({
            x: x + drift(x, 11, 200),
            w: 120 + drift(x, 5, 140),
            h: worldHeight * (0.16 + drift(x, 3, 10) / 100),
            bottom: Math.min(bottom, worldHeight * 0.9),
        });
        doorIndex += 1;
    }
    const struts = [];
    for (let x = 200; x < worldWidth; x += 520) {
        struts.push({
            x,
            y0: worldHeight * 0.78,
            y1: worldHeight * 0.44,
            flip: Math.floor(x / 520) % 2 === 0,
        });
    }
    const chains = [];
    for (let x = 320; x < worldWidth; x += 640) {
        chains.push({
            x: x + drift(x, 17, 120),
            len: worldHeight * (0.14 + drift(x, 13, 16) / 120),
        });
    }
    const vents = [];
    for (let x = 450; x < worldWidth; x += 900) {
        vents.push({
            x: x + drift(x, 23, 160),
            y: worldHeight * (0.3 + drift(x, 11, 40) / 100),
            r: 26 + drift(x, 7, 14),
        });
    }
    const columns = [];
    for (let x = 120; x < worldWidth; x += 880) {
        columns.push({ x: x + drift(x, 19, 140), w: 44 + drift(x, 5, 26) });
    }
    const frames = [];
    for (let x = 600; x < worldWidth; x += 1400) {
        frames.push({ x: x + drift(x, 29, 300) });
    }
    const hooks = [];
    for (let x = 260; x < worldWidth; x += 780) {
        hooks.push({
            x: x + drift(x, 31, 180),
            len: worldHeight * (0.12 + drift(x, 13, 16) / 100),
            jaw: Math.floor(x / 780) % 2 === 0,
        });
    }
    const stubs = [];
    for (let x = 700; x < worldWidth; x += 1150) {
        stubs.push({
            x: x + drift(x, 37, 220),
            h: 60 + drift(x, 7, 90),
            w: 30 + drift(x, 11, 24),
        });
    }
    return {
        lamps,
        beams,
        arches,
        shafts,
        rings,
        crystals,
        plates,
        pipes,
        doors,
        struts,
        chains,
        vents,
        columns,
        frames,
        hooks,
        stubs,
    };
}

function bastionStyle(background) {
    const style = background && background.style;
    if (style === 'vault' || style === 'coldstore' || style === 'relay') {
        return style;
    }
    return 'relay';
}

function renderSky(renderer, palette, style, layout, worldWidth, worldHeight, ceiling) {
    renderer.renderVerticalGradient(
        0,
        0,
        worldWidth,
        worldHeight,
        [palette.top, palette.mid, palette.bottom],
        44
    );
    // A faint style wash keeps the deep shaft from reading as flat navy.
    const wash =
        style === 'vault'
            ? { color: palette.lamp, y: worldHeight * 0.72, alpha: 0.08 }
            : style === 'coldstore'
              ? { color: palette.seam, y: worldHeight * 0.2, alpha: 0.09 }
              : { color: palette.alert, y: worldHeight * 0.12, alpha: 0.05 };
    renderer.drawGlow(
        worldWidth * 0.5,
        wash.y,
        Math.max(worldWidth, worldHeight) * 0.45,
        wash.color,
        wash.alpha,
        4
    );
    renderer.graphics.fillStyle(palette.panel, 1);
    renderer.graphics.fillRect(0, 0, worldWidth, ceiling);
    // Distant ceiling pipe runs sit just under the deck band.
    renderer.graphics.fillStyle(adjustColor(palette.panel, -14), 1);
    renderer.graphics.fillRect(0, ceiling + 10, worldWidth, 12);
    renderer.graphics.fillRect(0, ceiling + 30, worldWidth, 7);
    renderer.graphics.fillStyle(palette.seam, 1);
    for (let x = 12; x < worldWidth; x += 48) {
        renderer.graphics.fillRect(x, ceiling - 6, 4, 4);
    }
    renderer.graphics.fillStyle(adjustColor(palette.seam, -20), 1);
    for (let x = 30; x < worldWidth; x += 240) {
        renderer.graphics.fillRect(x, ceiling + 8, 8, 16);
    }
    (layout.beams || []).forEach((beam, index) => {
        renderer.graphics.fillStyle(adjustColor(palette.panel, -22), 1);
        renderer.graphics.fillRect(beam.x, 0, beam.w, ceiling + beam.drop);
        renderer.graphics.fillStyle(palette.seam, 1);
        renderer.graphics.fillRect(beam.x, ceiling + beam.drop, beam.w, 5);
        if (index % 3 === 0) {
            renderer.graphics.fillStyle(style === 'vault' ? palette.lamp : palette.alert, 0.9);
            renderer.graphics.fillCircle(beam.x + beam.w / 2, ceiling + beam.drop + 12, 3);
        }
    });
    (layout.lamps || []).forEach((lamp) => {
        renderer.renderPolygon(
            [
                { x: lamp.x - 8, y: ceiling },
                { x: lamp.x + 8, y: ceiling },
                { x: lamp.x + 52, y: lamp.y + 150 },
                { x: lamp.x - 52, y: lamp.y + 150 },
            ],
            style === 'vault' ? palette.lamp : palette.conduit,
            0.05
        );
        renderer.drawGlow(lamp.x, lamp.y, lamp.r, palette.conduit, 0.16, 4);
        renderer.graphics.fillStyle(palette.ground, 1);
        renderer.graphics.fillRect(lamp.x - 10, ceiling, 20, 8);
        renderer.graphics.fillStyle(0xf4ffff, 0.95);
        renderer.graphics.fillRect(lamp.x - 6, ceiling + 8, 12, 4);
    });
}

function renderFar(renderer, palette, style, layout, worldWidth, worldHeight, ceiling) {
    const recess = adjustColor(palette.panel, -26);
    (layout.shafts || []).forEach((shaft, index) => {
        renderer.graphics.fillStyle(recess, 1);
        renderer.graphics.fillRect(shaft.x, ceiling, shaft.w, worldHeight * 0.92 - ceiling);
        renderer.graphics.fillStyle(palette.seam, 0.22);
        renderer.graphics.fillRect(shaft.x + shaft.w - 3, ceiling, 3, worldHeight * 0.92 - ceiling);
        for (let i = 0; i < 3; i++) {
            const wy = worldHeight * (0.22 + i * 0.2) + drift(shaft.x + i * 47, 5, 30);
            const lit = shaft.lit && (index + i) % 3 !== 2;
            renderer.graphics.fillStyle(
                lit ? palette.conduit : adjustColor(palette.seam, -30),
                lit ? 0.85 : 1
            );
            renderer.graphics.fillRect(shaft.x + 8, wy, Math.max(8, shaft.w - 16), 14);
        }
    });
    (layout.arches || []).forEach((arch, index) => {
        renderer.graphics.lineStyle(4, palette.seam, 1);
        renderer.graphics.strokeRect(arch.x, arch.top, arch.w, arch.bottom - arch.top);
        renderer.graphics.lineStyle(1, palette.panel, 1);
        renderer.graphics.strokeRect(
            arch.x + 12,
            arch.top + 12,
            arch.w - 24,
            arch.bottom - arch.top - 24
        );
        const lean = arch.brace ? arch.w - 24 : 24 - arch.w;
        renderer.renderPolygon(
            [
                { x: arch.x + 12, y: arch.bottom - 12 },
                { x: arch.x + 24, y: arch.bottom - 12 },
                { x: arch.x + arch.w - 24 + lean * 0.2, y: arch.top + 12 },
                { x: arch.x + arch.w - 12 + lean * 0.2, y: arch.top + 12 },
            ],
            palette.girder,
            0.8
        );
        renderer.graphics.fillStyle(index % 2 === 0 ? palette.alert : 0xffb15a, 0.8);
        renderer.graphics.fillCircle(arch.x + arch.w / 2, arch.top + 8, 3);
    });
    if (style === 'relay') {
        renderer.graphics.fillStyle(palette.conduit, 0.35);
        renderer.graphics.fillRect(0, worldHeight * 0.2, worldWidth, 3);
        (layout.arches || []).forEach((arch, index) => {
            if (index % 2 === 0) {
                renderer.graphics.fillStyle(palette.alert, 0.9);
                renderer.graphics.fillCircle(arch.x + 20, worldHeight * 0.2, 4);
            }
        });
    }
    if (style === 'vault') {
        (layout.rings || []).forEach((ring) => {
            renderer.graphics.lineStyle(6, palette.door, 0.9);
            renderer.graphics.strokeCircle(ring.x, ring.y, ring.r);
            renderer.graphics.lineStyle(2, palette.seam, 0.9);
            renderer.graphics.strokeCircle(ring.x, ring.y, ring.r * 0.68);
            renderer.graphics.lineStyle(3, palette.door, 0.7);
            for (let spoke = 0; spoke < 4; spoke++) {
                const angle = (Math.PI / 4) * spoke + Math.PI / 8;
                renderer.graphics.beginPath();
                renderer.graphics.moveTo(ring.x, ring.y);
                renderer.graphics.lineTo(
                    ring.x + Math.cos(angle) * ring.r,
                    ring.y + Math.sin(angle) * ring.r
                );
                renderer.graphics.strokePath();
            }
            renderer.drawGlow(ring.x, ring.y, 40, palette.lamp, 0.2, 4);
            renderer.graphics.fillStyle(palette.lamp, 0.95);
            renderer.graphics.fillCircle(ring.x, ring.y, 6);
        });
    }
    if (style === 'coldstore') {
        (layout.crystals || []).forEach((crystal) => {
            renderer.renderPolygon(
                [
                    { x: crystal.x, y: crystal.y },
                    { x: crystal.x + crystal.lean, y: crystal.y + crystal.len },
                    { x: crystal.x + crystal.lean + 18, y: crystal.y + crystal.len },
                    { x: crystal.x + 14, y: crystal.y + 10 },
                ],
                palette.seam,
                0.85
            );
            renderer.graphics.lineStyle(2, 0xe8fbff, 0.8);
            renderer.graphics.beginPath();
            renderer.graphics.moveTo(crystal.x, crystal.y);
            renderer.graphics.lineTo(crystal.x + crystal.lean, crystal.y + crystal.len);
            renderer.graphics.strokePath();
        });
    }
}

function renderMid(renderer, palette, style, layout, worldWidth, worldHeight) {
    const pipeBody = style === 'relay' ? palette.girder : palette.pipe;
    (layout.pipes || []).forEach((pipe) => {
        renderer.graphics.fillStyle(pipeBody, 1);
        renderer.graphics.fillRect(0, pipe.y, worldWidth, pipe.h);
        renderer.graphics.fillStyle(adjustColor(pipeBody, 26), 1);
        renderer.graphics.fillRect(0, pipe.y, worldWidth, 3);
        for (let x = 60; x < worldWidth; x += 480) {
            renderer.graphics.fillStyle(adjustColor(pipeBody, -24), 1);
            renderer.graphics.fillRect(x, pipe.y - 4, 14, pipe.h + 8);
            if (style === 'coldstore') {
                renderer.graphics.fillStyle(palette.seam, 0.6);
                renderer.graphics.fillRect(x + 3, pipe.y - 4, 3, pipe.h + 8);
            }
        }
    });
    const warn = style === 'vault' ? palette.lamp : palette.alert;
    (layout.plates || []).forEach((plate, index) => {
        renderer.graphics.fillStyle(palette.panel, 1);
        renderer.graphics.fillRect(plate.x, plate.y, plate.w, plate.h);
        renderer.graphics.lineStyle(1, palette.seam, 0.3);
        renderer.graphics.strokeRect(plate.x, plate.y, plate.w, plate.h);
        renderer.graphics.fillStyle(adjustColor(palette.panel, 12), 1);
        renderer.graphics.fillRect(plate.x, plate.y, plate.w, 4);
        renderer.graphics.fillStyle(
            style === 'vault' && index % 2 === 0 ? warn : palette.seam,
            0.35
        );
        renderer.graphics.fillRect(plate.x + 6, plate.y + 8, 4, 4);
        renderer.graphics.fillRect(plate.x + plate.w - 10, plate.y + 8, 4, 4);
        renderer.graphics.fillRect(plate.x + 6, plate.y + plate.h - 12, 4, 4);
        renderer.graphics.fillRect(plate.x + plate.w - 10, plate.y + plate.h - 12, 4, 4);
        if (plate.grille) {
            renderer.graphics.fillStyle(adjustColor(palette.panel, -30), 1);
            for (let slat = 0; slat < 3; slat++) {
                renderer.graphics.fillRect(plate.x + 16, plate.y + 18 + slat * 14, plate.w - 32, 6);
            }
        } else if (index % 5 === 2) {
            renderer.graphics.fillStyle(palette.conduit, 0.8);
            renderer.graphics.fillCircle(plate.x + plate.w - 18, plate.y + 18, 3);
        }
    });
    const doorBody = style === 'relay' ? palette.girder : adjustColor(palette.door, -52);
    const chevronB = style === 'vault' ? palette.lamp : palette.conduit;
    (layout.doors || []).forEach((door) => {
        const top = door.bottom - door.h;
        renderer.graphics.fillStyle(doorBody, 0.95);
        renderer.graphics.fillRect(door.x, top, door.w, door.h);
        renderer.graphics.lineStyle(3, palette.seam, 1);
        renderer.graphics.strokeRect(door.x, top, door.w, door.h);
        renderer.graphics.fillStyle(palette.panel, 1);
        renderer.graphics.fillRect(door.x + door.w / 2 - 2, top, 4, door.h);
        renderer.graphics.fillStyle(adjustColor(pipeBody, -20), 1);
        renderer.graphics.fillRect(door.x - 10, top + 12, 10, door.h - 24);
        renderer.graphics.fillRect(door.x + door.w, top + 12, 10, door.h - 24);
        for (let i = 0; i < 4; i++) {
            const chevronX = door.x + 10 + i * ((door.w - 20) / 4);
            renderer.renderPolygon(
                [
                    { x: chevronX, y: door.bottom - 4 },
                    { x: chevronX + 12, y: door.bottom - 4 },
                    { x: chevronX + 6, y: door.bottom - 14 },
                ],
                i % 2 === 0 ? warn : chevronB,
                0.7
            );
        }
        renderer.graphics.fillStyle(warn, 0.85);
        renderer.graphics.fillRect(door.x + door.w / 2 - 5, top + 10, 10, 5);
    });
    (layout.struts || []).forEach((strut) => {
        const lean = strut.flip ? -150 : 150;
        renderer.renderPolygon(
            [
                { x: strut.x - 8, y: strut.y0 },
                { x: strut.x + 8, y: strut.y0 },
                { x: strut.x + lean + 8, y: strut.y1 },
                { x: strut.x + lean - 8, y: strut.y1 },
            ],
            palette.girder,
            0.9
        );
    });
    (layout.chains || []).forEach((chain) => {
        renderer.graphics.fillStyle(palette.seam, 1);
        for (let y = worldHeight * 0.09; y < worldHeight * 0.09 + chain.len; y += 10) {
            renderer.graphics.fillRect(chain.x, y, 4, 5);
        }
        renderer.graphics.fillStyle(palette.girder, 1);
        renderer.graphics.fillRect(chain.x - 3, worldHeight * 0.09 + chain.len, 10, 8);
        renderer.graphics.fillStyle(warn, 0.85);
        renderer.graphics.fillRect(chain.x - 1, worldHeight * 0.09 + chain.len + 8, 6, 6);
    });
    if (style === 'coldstore') {
        (layout.vents || []).forEach((vent) => {
            renderer.graphics.fillStyle(adjustColor(palette.pipe, -8), 1);
            renderer.graphics.fillCircle(vent.x, vent.y, vent.r);
            renderer.graphics.lineStyle(3, palette.seam, 0.9);
            renderer.graphics.strokeCircle(vent.x, vent.y, vent.r);
            renderer.graphics.lineStyle(2, palette.seam, 0.7);
            for (let blade = 0; blade < 3; blade++) {
                const angle = (Math.PI / 3) * blade;
                renderer.graphics.beginPath();
                renderer.graphics.moveTo(vent.x, vent.y);
                renderer.graphics.lineTo(
                    vent.x + Math.cos(angle) * vent.r,
                    vent.y + Math.sin(angle) * vent.r
                );
                renderer.graphics.strokePath();
            }
            renderer.drawGlow(vent.x, vent.y, vent.r * 1.4, palette.seam, 0.12, 4);
        });
    }
}

function renderNear(renderer, palette, style, layout, worldWidth, worldHeight, horizon) {
    const edge =
        style === 'vault' ? palette.lamp : style === 'coldstore' ? palette.seam : palette.conduit;
    (layout.columns || []).forEach((column) => {
        renderer.graphics.fillStyle(palette.ground, 1);
        renderer.graphics.fillRect(column.x, 0, column.w, worldHeight * 0.92);
        renderer.graphics.fillStyle(edge, 0.75);
        renderer.graphics.fillRect(column.x + column.w - 5, 0, 5, worldHeight * 0.92);
        renderer.graphics.fillStyle(palette.seam, 1);
        for (let y = 40; y < worldHeight * 0.9; y += 120) {
            renderer.graphics.fillRect(column.x + 8, y, 6, 6);
        }
        renderer.graphics.fillStyle(adjustColor(palette.ground, 18), 1);
        renderer.graphics.fillRect(column.x - 8, worldHeight * 0.88, column.w + 16, 26);
    });
    const topBlock = Math.min(170, worldHeight * 0.22);
    const footBlock = Math.min(150, worldHeight * 0.2);
    (layout.frames || []).forEach((frame) => {
        renderer.graphics.fillStyle(palette.ground, 1);
        renderer.graphics.fillRect(frame.x, 0, 26, topBlock);
        renderer.graphics.fillRect(frame.x + 34, 0, 16, topBlock * 0.7);
        renderer.graphics.fillRect(frame.x, topBlock, 60, 18);
        renderer.graphics.fillRect(frame.x + 8, worldHeight - footBlock, 26, footBlock);
        renderer.graphics.fillRect(
            frame.x + 42,
            worldHeight - footBlock * 0.66,
            16,
            footBlock * 0.66
        );
        renderer.graphics.fillStyle(palette.alert, 0.9);
        renderer.graphics.fillRect(frame.x + 30, 60, 6, 6);
    });
    for (let x = 0; x < worldWidth; x += 28) {
        renderer.graphics.fillStyle(palette.ground, 1);
        renderer.graphics.fillRect(x, horizon + 40, 20, 22);
    }
    const warn = style === 'vault' ? palette.lamp : palette.alert;
    for (let x = 0; x < worldWidth; x += 56) {
        renderer.graphics.fillStyle(warn, 0.55);
        renderer.graphics.fillRect(x, horizon + 40, 20, 4);
    }
    renderer.graphics.fillStyle(edge, 0.5);
    for (let x = 0; x < worldWidth; x += 112) {
        renderer.graphics.fillRect(x, horizon + 40, 20, 2);
    }
}

function renderFore(renderer, palette, style, layout, worldHeight) {
    const cable = adjustColor(palette.ground, 8);
    (layout.hooks || []).forEach((hook) => {
        const thick = style === 'vault' ? 16 : 10;
        renderer.graphics.fillStyle(cable, 1);
        renderer.graphics.fillRect(hook.x, 0, thick, hook.len);
        if (style === 'vault') {
            renderer.graphics.fillStyle(palette.seam, 1);
            for (let y = 12; y < hook.len; y += 26) {
                renderer.graphics.fillRect(hook.x - 3, y, thick + 6, 6);
            }
            renderer.graphics.fillStyle(palette.door, 1);
            renderer.graphics.fillCircle(hook.x + thick / 2, hook.len + 18, 16);
            renderer.graphics.fillStyle(palette.lamp, 1);
            renderer.graphics.fillCircle(hook.x + thick / 2, hook.len + 18, 6);
            return;
        }
        if (style === 'coldstore') {
            renderer.renderPolygon(
                [
                    { x: hook.x - 4, y: hook.len - 30 },
                    { x: hook.x + thick + 4, y: hook.len - 30 },
                    { x: hook.x + thick / 2 + (hook.jaw ? 10 : -10), y: hook.len + 52 },
                ],
                palette.seam,
                0.9
            );
            renderer.graphics.fillStyle(0xe8fbff, 0.9);
            renderer.graphics.fillCircle(hook.x + thick / 2, hook.len + 54, 3);
            return;
        }
        const dir = hook.jaw ? 1 : -1;
        renderer.renderPolygon(
            [
                { x: hook.x - 4, y: hook.len },
                { x: hook.x + thick + 4, y: hook.len },
                { x: hook.x + thick / 2 + dir * 22, y: hook.len + 34 },
                { x: hook.x + thick / 2 + dir * 12, y: hook.len + 34 },
            ],
            cable,
            1
        );
        renderer.graphics.fillStyle(palette.alert, 0.95);
        renderer.graphics.fillCircle(hook.x + thick / 2, hook.len + 4, 4);
    });
    (layout.stubs || []).forEach((stub, index) => {
        const y = worldHeight - stub.h;
        renderer.graphics.fillStyle(adjustColor(palette.ground, 12), 1);
        renderer.graphics.fillRect(stub.x, y, stub.w, stub.h);
        renderer.graphics.fillStyle(adjustColor(palette.ground, 34), 1);
        renderer.graphics.fillRect(stub.x, y, stub.w, 8);
        renderer.graphics.fillStyle(0x02040a, 1);
        renderer.graphics.fillRect(stub.x + 5, y + 8, stub.w - 10, 6);
        if (index % 2 === 0) {
            renderer.graphics.fillStyle(style === 'vault' ? palette.lamp : palette.conduit, 0.9);
            renderer.graphics.fillRect(stub.x + stub.w + 4, y + 18, 6, 14);
        }
    });
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
            door: 0x5a6b80,
            pipe: 0x101a2a,
            lamp: 0xffb15a,
        },
        background.palette || {}
    );
    const style = bastionStyle(background);
    const horizon = worldHeight * 0.62;
    const ceiling = worldHeight * 0.09;
    if (layerId === 'sky') {
        renderSky(renderer, palette, style, layout, worldWidth, worldHeight, ceiling);
        return;
    }
    if (layerId === 'far') {
        renderFar(renderer, palette, style, layout, worldWidth, worldHeight, ceiling);
        return;
    }
    if (layerId === 'mid') {
        renderMid(renderer, palette, style, layout, worldWidth, worldHeight);
        return;
    }
    if (layerId === 'fore') {
        renderFore(renderer, palette, style, layout, worldHeight);
        return;
    }
    if (layerId !== 'near') {
        return;
    }
    renderNear(renderer, palette, style, layout, worldWidth, worldHeight, horizon);
}
