// Hive Warrens background — concept layout.
// Teal womb sky, purple chitin ribs far, dripping teeth mid, flesh floor near.
export function paint(ctx, width, height) {
    ctx.imageSmoothingEnabled = false;
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#0a1412');
    sky.addColorStop(0.6, '#1c4d46');
    sky.addColorStop(1, '#3d1c4e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // Far ribs — quiet.
    ctx.fillStyle = '#2a2a4e';
    for (let x = 0; x < width; x += 90) {
        ctx.beginPath();
        ctx.ellipse(x + 45, height * 0.5, 14, 60, 0.2, 0, Math.PI * 2);
        ctx.fill();
    }

    // Mid teeth.
    ctx.fillStyle = '#5e2a6e';
    for (let x = 10; x < width; x += 70) {
        ctx.beginPath();
        ctx.moveTo(x, height * 0.3);
        ctx.lineTo(x + 18, height * 0.3);
        ctx.lineTo(x + 9, height * 0.3 + 34);
        ctx.closePath();
        ctx.fill();
    }
    ctx.fillStyle = '#67ffd2';
    for (let x = 10; x < width; x += 70) {
        ctx.fillRect(x + 7, height * 0.3 + 30, 4, 4);
    }

    // Near flesh floor.
    ctx.fillStyle = '#24122e';
    ctx.fillRect(0, height * 0.72, width, height * 0.28);
    ctx.fillStyle = '#8ee7a8';
    ctx.fillRect(0, height * 0.72, width, 3);
}
