// Vault deck — SOLID platform, 96x24.
// Pale amber walk edge over dark bronze plates with seal rivets.
// Same flat style as paintBastionDeck; warm body keeps it off gunmetal.
export function paint(ctx, width, height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#2c2118';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#e8d8b0';
    ctx.fillRect(0, 0, width, 3);
    ctx.fillStyle = '#8a6a2a';
    ctx.fillRect(0, 3, width, 2);
    ctx.fillStyle = '#1c140c';
    for (let x = 0; x < width; x += 32) {
        ctx.fillRect(x, 5, 3, 19);
    }
    ctx.fillStyle = '#ffb15a';
    for (let x = 10; x < width; x += 32) {
        ctx.fillRect(x, 9, 6, 6);
    }
    ctx.fillStyle = '#2c2118';
    for (let x = 10; x < width; x += 32) {
        ctx.fillRect(x + 2, 11, 2, 2);
    }
    ctx.fillStyle = '#8a6a2a';
    for (let x = 4; x < width; x += 16) {
        ctx.fillRect(x, 19, 5, 5);
    }
}
