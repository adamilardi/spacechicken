// Tether clamp — DECOR only, 24x40.
// Clamp post gripping a cyan ribbon segment. Narrow; never a landing surface.
export function paint(ctx, _width, _height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = 'rgba(125, 249, 255, 0.3)';
    ctx.fillRect(9, 0, 6, 40);
    ctx.fillStyle = '#7df9ff';
    ctx.fillRect(11, 0, 2, 40);
    ctx.fillStyle = '#39435a';
    ctx.fillRect(2, 8, 20, 8);
    ctx.fillRect(2, 26, 20, 8);
    ctx.fillStyle = '#141c30';
    ctx.fillRect(2, 12, 20, 2);
    ctx.fillRect(2, 30, 20, 2);
    ctx.fillStyle = '#ffb15a';
    ctx.fillRect(4, 9, 3, 6);
    ctx.fillRect(17, 27, 3, 6);
    ctx.fillStyle = '#141c30';
    ctx.fillRect(6, 36, 12, 4);
}
