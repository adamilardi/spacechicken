// Harbor deck — SOLID platform, 96x24.
// Pale sand walk edge over rust-red steel with rivets and barnacle dots.
// Same flat style as paintLabDeck; warmer than gunmetal bastionDeck.
export function paint(ctx, width, height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#6e3a22';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#e8d8b0';
    ctx.fillRect(0, 0, width, 3);
    ctx.fillStyle = '#8a5a2a';
    ctx.fillRect(0, 3, width, 2);
    ctx.fillStyle = '#4a2414';
    for (let x = 0; x < width; x += 32) {
        ctx.fillRect(x, 5, 3, 19);
    }
    ctx.fillStyle = '#e8d8b0';
    for (let x = 8; x < width; x += 32) {
        ctx.fillRect(x, 8, 2, 2);
        ctx.fillRect(x + 12, 8, 2, 2);
    }
    ctx.fillStyle = '#c9b48a';
    for (let x = 16; x < width; x += 32) {
        ctx.fillRect(x, 16, 4, 3);
        ctx.fillRect(x + 6, 19, 3, 3);
    }
    ctx.fillStyle = '#2c1408';
    for (let x = 4; x < width; x += 24) {
        ctx.fillRect(x, 21, 10, 3);
    }
}
