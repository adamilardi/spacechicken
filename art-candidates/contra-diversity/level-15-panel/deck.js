// Skyhook panel — SOLID platform, 96x24.
// Dark service panel with red beacon dots over night alloy.
// Same flat style as paintSkyhookDeck; dark top inverts the pale deck.
export function paint(ctx, width, height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#141c30';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#5a6a86';
    ctx.fillRect(0, 0, width, 3);
    ctx.fillStyle = '#2c3a52';
    ctx.fillRect(0, 3, width, 2);
    ctx.fillStyle = '#0a0f1c';
    for (let x = 4; x < width; x += 24) {
        ctx.fillRect(x, 7, 14, 8);
    }
    ctx.fillStyle = '#ff4a3c';
    for (let x = 8; x < width; x += 24) {
        ctx.fillRect(x, 17, 4, 4);
    }
    ctx.fillStyle = '#ffd7a8';
    for (let x = 8; x < width; x += 24) {
        ctx.fillRect(x + 1, 18, 2, 2);
    }
    ctx.fillStyle = '#39435a';
    for (let x = 0; x < width; x += 48) {
        ctx.fillRect(x, 9, 3, 12);
    }
}
