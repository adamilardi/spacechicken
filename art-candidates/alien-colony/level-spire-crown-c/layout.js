// Spire Crown background — concept layout.
// Black-gold sky, ringed planet far, gold spire mid, pale alloy ridge near.
export function paint(ctx, width, height) {
    ctx.imageSmoothingEnabled = false;
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#060818');
    sky.addColorStop(0.6, '#1a2a5e');
    sky.addColorStop(1, '#0a0d20');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // Far planet + ring.
    ctx.fillStyle = '#2d6bb0';
    ctx.beginPath();
    ctx.arc(width * 0.8, height * 0.24, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#9cecff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(width * 0.8, height * 0.24, 64, 12, -0.3, 0, Math.PI * 2);
    ctx.stroke();

    // Mid spire.
    ctx.fillStyle = '#8a6a1c';
    const sx = width * 0.5;
    ctx.beginPath();
    ctx.moveTo(sx - 40, height * 0.75);
    ctx.lineTo(sx - 12, height * 0.2);
    ctx.lineTo(sx + 12, height * 0.2);
    ctx.lineTo(sx + 40, height * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe14a';
    ctx.fillRect(sx - 4, height * 0.24, 8, 60);

    // Near alloy ridge.
    ctx.fillStyle = '#101828';
    ctx.fillRect(0, height * 0.78, width, height * 0.22);
    ctx.fillStyle = '#f4f7fb';
    ctx.fillRect(0, height * 0.78, width, 3);
}
