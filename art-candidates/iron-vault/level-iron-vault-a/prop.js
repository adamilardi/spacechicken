// Vault seal — DECOR only, 24x48.
// Seal post with a glowing sigil. Thin and tall; never a landing surface.
export function paint(ctx, _width, _height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#2c2118';
    ctx.fillRect(8, 8, 8, 40);
    ctx.fillRect(4, 42, 16, 6);
    ctx.fillStyle = '#8a6a2a';
    ctx.fillRect(8, 8, 8, 3);
    ctx.fillRect(8, 36, 8, 3);
    ctx.fillStyle = 'rgba(255, 177, 90, 0.3)';
    ctx.beginPath();
    ctx.arc(12, 22, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffb15a';
    ctx.fillRect(8, 18, 8, 8);
    ctx.fillStyle = '#2c2118';
    ctx.fillRect(11, 19, 2, 6);
    ctx.fillRect(9, 21, 6, 2);
    ctx.fillStyle = '#fff4e0';
    ctx.fillRect(8, 18, 8, 2);
}
