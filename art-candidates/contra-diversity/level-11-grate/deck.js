// Bastion grate — SOLID platform, 96x24.
// Dark grate bars with red signal lights over near-black steel.
// Same flat style as paintBastionDeck; dark body inverts the pale deck.
export function paint(ctx, width, height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0d1119';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#5a6a86';
    ctx.fillRect(0, 0, width, 3);
    ctx.fillStyle = '#2a3140';
    ctx.fillRect(0, 3, width, 2);
    ctx.fillStyle = '#161b26';
    for (let x = 4; x < width; x += 12) {
        ctx.fillRect(x, 5, 6, 19);
    }
    ctx.fillStyle = '#ff4a3c';
    for (let x = 6; x < width; x += 24) {
        ctx.fillRect(x, 8, 4, 4);
    }
    ctx.fillStyle = '#ffd7a8';
    for (let x = 6; x < width; x += 24) {
        ctx.fillRect(x + 1, 9, 2, 2);
    }
    ctx.fillStyle = '#2a3140';
    for (let x = 0; x < width; x += 48) {
        ctx.fillRect(x, 14, 10, 3);
    }
}
