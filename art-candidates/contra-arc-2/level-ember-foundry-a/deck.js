// Foundry deck — SOLID platform, 96x24.
// Molten walk edge over riveted iron plates with ember seams.
// Same flat style as paintLabDeck; hot edge inverts pale harborDeck.
export function paint(ctx, width, height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#3a2c26';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#ffd23c';
    ctx.fillRect(0, 0, width, 3);
    ctx.fillStyle = '#ff6a2a';
    ctx.fillRect(0, 3, width, 2);
    ctx.fillStyle = '#241512';
    for (let x = 0; x < width; x += 24) {
        ctx.fillRect(x, 5, 2, 19);
    }
    ctx.fillStyle = '#ff6a2a';
    for (let x = 12; x < width; x += 24) {
        ctx.fillRect(x, 9, 8, 2);
    }
    ctx.fillStyle = '#ffd23c';
    for (let x = 12; x < width; x += 24) {
        ctx.fillRect(x + 2, 9, 4, 1);
    }
    ctx.fillStyle = '#140d0a';
    for (let x = 4; x < width; x += 16) {
        ctx.fillRect(x, 16, 8, 8);
    }
    ctx.fillStyle = '#7d6a5a';
    for (let x = 6; x < width; x += 16) {
        ctx.fillRect(x, 17, 3, 3);
    }
}
