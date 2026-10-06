// Colony landing-pad deck — SOLID platform, 96x24.
// Top edge is the walkable highlight. Same flat style as paintLabDeck.
export function paint(ctx, width, height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#232838';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#ff9a3c';
    ctx.fillRect(0, 0, width, 4);
    ctx.fillStyle = '#ffe6b0';
    ctx.fillRect(0, 4, width, 2);
    ctx.fillStyle = '#12161f';
    for (let x = 0; x < width; x += 16) {
        ctx.fillRect(x, 16, 8, 8);
    }
    ctx.fillStyle = '#8fd4ff';
    ctx.fillRect(8, 9, 18, 4);
    ctx.fillRect(70, 9, 18, 4);
}
