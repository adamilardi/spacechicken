// Bastion Relay background — concept layout.
// Siege corridor interior: ceiling lamps, receding arch frames, blast doors,
// diagonal struts, hanging chains, foreground pipe frames, floor grate.
// Runtime: four baked parallax layers, horizontal scroll, scrollFactorY = 1.
export function paint(ctx, width, height) {
    ctx.imageSmoothingEnabled = false;
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#060a14');
    sky.addColorStop(0.55, '#12233d');
    sky.addColorStop(1, '#274b73');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    const horizon = height * 0.62;
    const ceiling = height * 0.09;

    // Sky: ceiling slab with rivets + hanging lamp cones.
    ctx.fillStyle = '#0d1626';
    ctx.fillRect(0, 0, width, ceiling);
    ctx.fillStyle = '#16263f';
    for (let x = 12; x < width; x += 48) {
        ctx.fillRect(x, ceiling - 6, 4, 4);
    }
    for (let x = 90; x < width; x += 330) {
        ctx.fillStyle = 'rgba(156, 236, 255, 0.08)';
        ctx.beginPath();
        ctx.moveTo(x - 8, ceiling);
        ctx.lineTo(x + 8, ceiling);
        ctx.lineTo(x + 52, ceiling + 150);
        ctx.lineTo(x - 52, ceiling + 150);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#080d18';
        ctx.fillRect(x - 10, ceiling, 20, 8);
        ctx.fillStyle = '#f4ffff';
        ctx.fillRect(x - 6, ceiling + 8, 12, 4);
    }

    // Far: receding arch frames with alternating alert dots.
    let arch = 0;
    for (let x = 0; x < width; x += 240) {
        ctx.strokeStyle = '#16263f';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, height * 0.16, 150, horizon - height * 0.16);
        ctx.fillStyle = arch % 2 === 0 ? '#ff4a3c' : '#ffb15a';
        ctx.beginPath();
        ctx.arc(x + 75, height * 0.16 + 8, 3, 0, Math.PI * 2);
        ctx.fill();
        arch++;
    }

    // Mid: blast door with chevrons + diagonal strut + chain.
    ctx.fillStyle = '#1c2f4d';
    ctx.fillRect(420, horizon - 120, 130, 120);
    ctx.fillStyle = '#0d1626';
    ctx.fillRect(483, horizon - 120, 4, 120);
    for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#ff4a3c' : '#9cecff';
        ctx.beginPath();
        ctx.moveTo(430 + i * 28, horizon - 4);
        ctx.lineTo(442 + i * 28, horizon - 4);
        ctx.lineTo(436 + i * 28, horizon - 14);
        ctx.closePath();
        ctx.fill();
    }
    ctx.fillStyle = '#1c2f4d';
    ctx.beginPath();
    ctx.moveTo(192, horizon);
    ctx.lineTo(208, horizon);
    ctx.lineTo(358, horizon - 110);
    ctx.lineTo(342, horizon - 110);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#16263f';
    for (let y = ceiling; y < ceiling + 70; y += 10) {
        ctx.fillRect(320, y, 4, 5);
    }

    // Near: foreground pipe frame + floor grate slats (no ground ridge).
    ctx.fillStyle = '#080d18';
    ctx.fillRect(600, 0, 26, 170);
    ctx.fillRect(634, 0, 16, 120);
    ctx.fillRect(600, 170, 60, 18);
    for (let x = 0; x < width; x += 28) {
        ctx.fillRect(x, horizon + 40, 20, 22);
    }
    ctx.fillStyle = '#9cecff';
    ctx.fillRect(0, horizon + 40, 20, 2);
    ctx.fillRect(112, horizon + 40, 20, 2);
}
