// Skyhook Anchor background — concept layout.
// Tether ground station at night: the ribbon climbs off-screen with climber
// lights, gantry towers flank the anchor pylon, service arms reach over the
// pad slab with pipe runs.
// Runtime: four baked parallax layers, horizontal scroll, scrollFactorY = 1.
export function paint(ctx, width, height) {
    ctx.imageSmoothingEnabled = false;
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#060b18');
    sky.addColorStop(0.6, '#101a33');
    sky.addColorStop(1, '#1d2c4d');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    const horizon = height * 0.74;

    // Sky: tether ribbon + climber lights + stars.
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 50; i++) {
        ctx.fillRect((i * 211) % width, (i * 61) % Math.round(height * 0.5), 1, 1);
    }
    const ribbonX = width * 0.55;
    ctx.fillStyle = 'rgba(125, 249, 255, 0.25)';
    ctx.fillRect(ribbonX - 6, 0, 12, height);
    ctx.fillStyle = '#7df9ff';
    ctx.fillRect(ribbonX - 2, 0, 4, height);
    for (let i = 0; i < 3; i++) {
        const y = height * 0.2 + i * height * 0.22;
        ctx.fillStyle = '#ffb15a';
        ctx.fillRect(ribbonX - 8, y, 16, 6);
        ctx.fillStyle = '#fff4e0';
        ctx.fillRect(ribbonX - 8, y, 16, 2);
    }

    // Far: gantry tower frames, irregular heights.
    const towers = [
        { x: 60, h: 150 },
        { x: 300, h: 210 },
        { x: 700, h: 170 },
    ];
    for (const tower of towers) {
        ctx.strokeStyle = '#1d2c4d';
        ctx.lineWidth = 5;
        ctx.strokeRect(tower.x, horizon - tower.h, 70, tower.h);
        ctx.beginPath();
        ctx.moveTo(tower.x, horizon);
        ctx.lineTo(tower.x + 70, horizon - tower.h);
        ctx.moveTo(tower.x + 70, horizon);
        ctx.lineTo(tower.x, horizon - tower.h);
        ctx.stroke();
        ctx.fillStyle = '#ff4a3c';
        ctx.fillRect(tower.x + 32, horizon - tower.h - 6, 6, 6);
    }

    // Mid: anchor pylon landmark + service arms.
    ctx.fillStyle = '#39435a';
    ctx.fillRect(ribbonX - 30, horizon - 130, 60, 130);
    ctx.fillStyle = '#141c30';
    for (let y = horizon - 120; y < horizon; y += 20) {
        ctx.fillRect(ribbonX - 30, y, 60, 3);
    }
    ctx.fillStyle = '#7df9ff';
    ctx.fillRect(ribbonX - 30, horizon - 130, 60, 6);
    for (const side of [-1, 1]) {
        ctx.strokeStyle = '#39435a';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(ribbonX + side * 30, horizon - 90);
        ctx.lineTo(ribbonX + side * 130, horizon - 130);
        ctx.stroke();
        ctx.fillStyle = '#ffb15a';
        ctx.fillRect(ribbonX + side * 130 - 5, horizon - 136, 10, 12);
    }

    // Near: launch pad slab edge + pipe runs.
    ctx.fillStyle = '#141c30';
    ctx.fillRect(0, horizon, width, height - horizon);
    ctx.fillStyle = '#39435a';
    ctx.fillRect(0, horizon, width, 8);
    ctx.fillStyle = '#7df9ff';
    for (let x = 0; x < width; x += 160) {
        ctx.fillRect(x, horizon, 40, 3);
    }
    ctx.fillStyle = '#0a0f1c';
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(0, horizon + 18 + i * 14, width, 6);
    }
    ctx.fillStyle = '#ff4a3c';
    for (let x = 40; x < width; x += 200) {
        ctx.fillRect(x, horizon + 18, 5, 34);
    }
}
