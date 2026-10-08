// Foundry vent — DECOR only, 32x40.
// Iron vent stack with an ember slit. Tall and narrow; never a landing surface.
export function paint(ctx, _width, _height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#241512';
    ctx.fillRect(8, 6, 16, 34);
    ctx.fillRect(4, 0, 24, 8);
    ctx.fillStyle = '#3a2c26';
    ctx.fillRect(8, 6, 16, 3);
    ctx.fillStyle = 'rgba(255, 106, 42, 0.3)';
    ctx.fillRect(11, 12, 10, 20);
    ctx.fillStyle = '#ff6a2a';
    ctx.fillRect(13, 14, 6, 16);
    ctx.fillStyle = '#ffd23c';
    ctx.fillRect(14, 16, 4, 10);
    ctx.fillStyle = '#140d0a';
    ctx.fillRect(8, 34, 16, 6);
}
