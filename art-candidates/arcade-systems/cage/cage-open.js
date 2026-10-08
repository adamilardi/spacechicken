// Rescue cage (open) — PICKUP state, 32x48.
// Same frame with the door swung open and the cage empty.
export function paint(ctx, width, height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0d1119';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#5a6a86';
    for (let x = 3; x < 14; x += 7) {
        ctx.fillRect(x, 2, 3, 44);
    }
    ctx.strokeStyle = '#5a6a86';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(16, 4);
    ctx.lineTo(28, 12);
    ctx.moveTo(16, 24);
    ctx.lineTo(28, 32);
    ctx.moveTo(16, 44);
    ctx.lineTo(28, 36);
    ctx.stroke();
    ctx.fillStyle = '#39435a';
    ctx.fillRect(0, 0, width, 4);
    ctx.fillRect(0, 44, width, 4);
    ctx.fillRect(0, 0, 3, height);
    ctx.fillRect(width - 3, 0, 3, height);
    ctx.fillStyle = '#7dff9a';
    ctx.fillRect(19, 20, 5, 5);
    ctx.fillStyle = '#e8fff0';
    ctx.fillRect(20, 21, 2, 2);
}
