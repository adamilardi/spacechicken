// Spire fin — DECOR only, 24x56.
// Gold antenna fin. Thin and tall; never a landing surface.
export function paint(ctx, _width, _height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#3a4356';
    ctx.fillRect(8, 40, 8, 16);
    ctx.fillRect(4, 52, 16, 4);
    ctx.fillStyle = '#d7a441';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(20, 44);
    ctx.lineTo(4, 44);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f4e8c8';
    ctx.fillRect(11, 6, 2, 32);
    ctx.fillStyle = '#ff4a3c';
    ctx.beginPath();
    ctx.arc(12, 4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd7a8';
    ctx.beginPath();
    ctx.arc(12, 4, 1.2, 0, Math.PI * 2);
    ctx.fill();
}
