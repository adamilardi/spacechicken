// Rust Harbor background — concept layout.
// Breaker's yard at dusk: low sun disc with cloud bands, beached hulls,
// dock cranes with container stacks, pier pilings over dark water.
// Runtime: four baked parallax layers, horizontal scroll, scrollFactorY = 1.
export function paint(ctx, width, height) {
    ctx.imageSmoothingEnabled = false;
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#1b2b4a');
    sky.addColorStop(0.55, '#4a3a52');
    sky.addColorStop(0.78, '#ff9a4a');
    sky.addColorStop(1, '#0a1626');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    const horizon = height * 0.72;

    // Sky: low sun disc + cloud bands.
    ctx.fillStyle = '#ff9a4a';
    ctx.beginPath();
    ctx.arc(width * 0.68, horizon - 26, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd7a8';
    ctx.beginPath();
    ctx.arc(width * 0.68, horizon - 26, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(27, 43, 74, 0.75)';
    for (let i = 0; i < 4; i++) {
        const y = height * 0.2 + i * 26;
        ctx.fillRect((i * 260 + 60) % width, y, 220 - i * 30, 8);
    }
    ctx.fillStyle = 'rgba(255, 215, 168, 0.5)';
    ctx.fillRect(width * 0.68 - 90, horizon - 30, 180, 3);

    // Far: beached hull silhouettes, irregular spacing.
    const hulls = [
        { x: 40, w: 200, h: 54 },
        { x: 330, w: 130, h: 40 },
        { x: 620, w: 260, h: 66 },
    ];
    for (const hull of hulls) {
        ctx.fillStyle = '#141c30';
        ctx.beginPath();
        ctx.moveTo(hull.x, horizon);
        ctx.lineTo(hull.x + 14, horizon - hull.h);
        ctx.lineTo(hull.x + hull.w - 14, horizon - hull.h);
        ctx.lineTo(hull.x + hull.w, horizon);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#141c30';
        ctx.fillRect(hull.x + hull.w * 0.3, horizon - hull.h - 16, 10, 16);
        ctx.fillStyle = '#ff9a4a';
        for (let px = hull.x + 24; px < hull.x + hull.w - 20; px += 26) {
            ctx.fillRect(px, horizon - hull.h + 12, 6, 5);
        }
    }

    // Mid: dock crane frame (diagonals) + container stacks.
    ctx.strokeStyle = '#2c3a52';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(420, horizon);
    ctx.lineTo(470, horizon - 120);
    ctx.lineTo(620, horizon - 120);
    ctx.moveTo(470, horizon - 120);
    ctx.lineTo(420, horizon - 40);
    ctx.moveTo(545, horizon - 120);
    ctx.lineTo(545, horizon - 60);
    ctx.stroke();
    ctx.fillStyle = '#2c3a52';
    ctx.fillRect(530, horizon - 60, 30, 26);
    const boxes = ['#6e3a22', '#3f6e5a', '#8a5a2a', '#54607a'];
    boxes.forEach((color, i) => {
        ctx.fillStyle = color;
        const bx = 700 + (i % 2) * 64;
        const by = horizon - 30 - Math.floor(i / 2) * 32;
        ctx.fillRect(bx, by, 60, 28);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(bx, by + 12, 60, 3);
    });

    // Near: pier pilings + water shimmer.
    ctx.fillStyle = '#0a101c';
    for (let x = 20; x < width; x += 120) {
        ctx.fillRect(x, horizon - 10, 14, height - horizon + 10);
        ctx.fillRect(x - 6, horizon - 16, 26, 8);
    }
    ctx.fillStyle = 'rgba(255, 154, 74, 0.5)';
    for (let x = 0; x < width; x += 46) {
        ctx.fillRect(x + ((x * 7) % 20), horizon + 18 + ((x * 3) % 24), 26, 2);
    }
}
