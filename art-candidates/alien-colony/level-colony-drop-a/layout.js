// Colony Drop beachhead background — concept layout.
// Layers, top to bottom: sky gradient, far domes, mid gun-towers, near ridge.
// Runtime: four baked parallax layers, horizontal scroll, scrollFactorY = 1.
export function paint(ctx, width, height) {
    ctx.imageSmoothingEnabled = false;
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#0b0e22');
    sky.addColorStop(0.55, '#3a2a5e');
    sky.addColorStop(1, '#ff8a4a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // Far: quiet dome silhouettes.
    ctx.fillStyle = '#1c1740';
    const horizon = height * 0.62;
    for (let x = 0; x < width; x += 120) {
        ctx.beginPath();
        ctx.arc(x + 60, horizon, 44, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(x + 56, horizon - 66, 8, 66);
    }

    // Mid: blocky gun-towers, darker than platforms.
    ctx.fillStyle = '#2a2352';
    for (let x = 20; x < width; x += 180) {
        const tw = 46;
        const th = height * 0.22;
        ctx.fillRect(x, horizon - th, tw, th);
        ctx.fillStyle = '#ff5a4a';
        ctx.fillRect(x + 8, horizon - th + 10, 8, 4);
        ctx.fillStyle = '#2a2352';
    }

    // Near: dark ridge + landing-strip glow.
    ctx.fillStyle = '#0d0b1e';
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, horizon + 40);
    for (let x = 0; x <= width; x += 80) {
        ctx.lineTo(x, horizon + 34 + ((x / 80) % 2 === 0 ? 0 : 14));
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffb15a';
    ctx.fillRect(0, horizon + 52, width, 3);
}
