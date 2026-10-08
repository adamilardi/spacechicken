// Harbor lamp — DECOR only, 16x48.
// Dock lamp post with a warm lamp. Thin and tall; never a landing surface.
export function paint(ctx, _width, _height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#141c30';
    ctx.fillRect(6, 10, 4, 38);
    ctx.fillRect(2, 44, 12, 4);
    ctx.fillStyle = '#2c3a52';
    ctx.fillRect(6, 6, 10, 4);
    ctx.fillStyle = 'rgba(255, 154, 74, 0.25)';
    ctx.beginPath();
    ctx.arc(13, 18, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff9a4a';
    ctx.fillRect(10, 12, 6, 8);
    ctx.fillStyle = '#ffd7a8';
    ctx.fillRect(11, 13, 4, 3);
}
