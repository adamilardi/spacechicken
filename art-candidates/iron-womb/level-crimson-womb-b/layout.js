// Crimson Womb background — concept layout.
// Living throat: ribcage arcs, one landmark heart with vein spokes, satellite
// sacs, teeth top and bottom, membrane wisps. No ground ridge, no glow strip.
// Runtime: four baked parallax layers, horizontal scroll, scrollFactorY = 1.
export function paint(ctx, width, height) {
    ctx.imageSmoothingEnabled = false;
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#12060c');
    sky.addColorStop(0.55, '#3d0f22');
    sky.addColorStop(1, '#6e1a2e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    const horizon = height * 0.62;

    // Sky: asymmetric gloom glow, upper left of the heart.
    ctx.fillStyle = 'rgba(255, 90, 138, 0.08)';
    ctx.beginPath();
    ctx.arc(width * 0.3, height * 0.25, 130, 0, Math.PI * 2);
    ctx.fill();

    // Far: ribcage arcs.
    ctx.strokeStyle = '#2a0a18';
    ctx.lineWidth = 26;
    for (let x = 140; x < width; x += 460) {
        ctx.beginPath();
        ctx.arc(x, horizon, height * 0.36, Math.PI, 0);
        ctx.stroke();
    }

    // Mid: the heart landmark + satellites + motes.
    const hx = width * 0.55;
    const hy = height * 0.34;
    ctx.fillStyle = 'rgba(255, 90, 138, 0.14)';
    ctx.beginPath();
    ctx.arc(hx, hy, 190, 0, Math.PI * 2);
    ctx.fill();
    for (let s = 0; s < 6; s++) {
        const a = (s / 6) * Math.PI * 2 + 0.4;
        ctx.fillStyle = 'rgba(255, 90, 138, 0.6)';
        ctx.beginPath();
        ctx.moveTo(hx + Math.cos(a) * 45, hy + Math.sin(a) * 45);
        ctx.lineTo(hx + Math.cos(a + 0.08) * 45, hy + Math.sin(a + 0.08) * 45);
        ctx.lineTo(hx + Math.cos(a) * 150, hy + Math.sin(a) * 150);
        ctx.closePath();
        ctx.fill();
    }
    ctx.fillStyle = '#4a1420';
    ctx.beginPath();
    ctx.ellipse(hx, hy, 64, 51, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff5a8a';
    ctx.beginPath();
    ctx.ellipse(hx, hy, 35, 29, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#67ffd2';
    ctx.beginPath();
    ctx.arc(hx, hy, 19, 0, Math.PI * 2);
    ctx.fill();
    for (let x = 300; x < width; x += 700) {
        ctx.fillStyle = '#4a1420';
        ctx.beginPath();
        ctx.arc(x, height * 0.3, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#67ffd2';
        ctx.beginPath();
        ctx.arc(x, height * 0.3, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    // Near: teeth top and bottom + membrane wisps.
    ctx.fillStyle = '#160309';
    for (let x = 40; x < width; x += 96) {
        ctx.beginPath();
        ctx.moveTo(x - 14, 0);
        ctx.lineTo(x + 14, 0);
        ctx.lineTo(x + 4, 60);
        ctx.closePath();
        ctx.fill();
    }
    for (let x = 90; x < width; x += 110) {
        ctx.beginPath();
        ctx.moveTo(x - 12, height);
        ctx.lineTo(x + 12, height);
        ctx.lineTo(x - 4, height - 50);
        ctx.closePath();
        ctx.fill();
    }
    ctx.fillStyle = 'rgba(255, 90, 138, 0.18)';
    ctx.beginPath();
    ctx.ellipse(260, height * 0.55, 110, 28, 0, 0, Math.PI * 2);
    ctx.fill();
}
