// Foundry chain — SOLID platform, 96x24.
// Dark chain plates with green signal dots over soot iron.
// Same flat style as paintFoundryDeck; dark top inverts the molten deck.
export function paint(ctx, width, height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#1c1412';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#7d6a5a';
    ctx.fillRect(0, 0, width, 3);
    ctx.fillStyle = '#3a2c26';
    ctx.fillRect(0, 3, width, 2);
    ctx.fillStyle = '#241512';
    for (let x = 6; x < width; x += 24) {
        ctx.fillRect(x, 6, 12, 5);
        ctx.fillRect(x + 3, 11, 6, 4);
    }
    ctx.fillStyle = '#7dff9a';
    for (let x = 4; x < width; x += 24) {
        ctx.fillRect(x, 17, 4, 4);
    }
    ctx.fillStyle = '#e8fff0';
    for (let x = 4; x < width; x += 24) {
        ctx.fillRect(x + 1, 18, 2, 2);
    }
}
