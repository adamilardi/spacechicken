// Colony girder — SOLID platform, 96x24.
// Pale steel walk edge with amber hazard chevrons over dark gunmetal.
// Same flat style as paintColonyDeck; cool edge inverts the orange deck.
export function paint(ctx, width, height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#1c2230';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#bcd2e8';
    ctx.fillRect(0, 0, width, 3);
    ctx.fillStyle = '#5a6a86';
    ctx.fillRect(0, 3, width, 2);
    ctx.fillStyle = '#ffb15a';
    for (let x = 4; x < width; x += 24) {
        ctx.fillRect(x, 17, 8, 4);
        ctx.fillRect(x + 4, 12, 8, 4);
    }
    ctx.fillStyle = '#0d1017';
    for (let x = 0; x < width; x += 32) {
        ctx.fillRect(x, 5, 3, 19);
    }
    ctx.fillStyle = '#8a99b5';
    for (let x = 8; x < width; x += 32) {
        ctx.fillRect(x, 7, 3, 3);
    }
}
