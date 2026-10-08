// Skyhook deck — SOLID platform, 96x24.
// Cool alloy with a pale walk edge, cyan seam, and amber hazard chevrons.
// Same flat style as paintLabDeck; chevrons keep it off bastionDeck.
export function paint(ctx, width, height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#39435a';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#dfe7f5';
    ctx.fillRect(0, 0, width, 3);
    ctx.fillStyle = '#7df9ff';
    ctx.fillRect(0, 3, width, 2);
    ctx.fillStyle = '#141c30';
    for (let x = 0; x < width; x += 24) {
        ctx.fillRect(x + 10, 5, 4, 19);
    }
    ctx.fillStyle = '#ffb15a';
    for (let x = 4; x < width; x += 24) {
        ctx.fillRect(x, 18, 6, 3);
        ctx.fillRect(x + 3, 14, 6, 3);
    }
    ctx.fillStyle = '#141c30';
    for (let x = 0; x < width; x += 48) {
        ctx.fillRect(x, 8, 6, 3);
    }
    ctx.fillStyle = '#7df9ff';
    for (let x = 20; x < width; x += 48) {
        ctx.fillRect(x, 9, 4, 2);
    }
}
