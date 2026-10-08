// Bastion deck — SOLID platform, 96x24.
// Pale walkable top edge with a cyan underlight over dark gunmetal.
// Same flat style as paintLabDeck; inverted vs pale-bodied issHull.
export function paint(ctx, width, height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#2a3140';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#f4f7fb';
    ctx.fillRect(0, 0, width, 3);
    ctx.fillStyle = '#9cecff';
    ctx.fillRect(0, 3, width, 2);
    ctx.fillStyle = '#161b26';
    for (let x = 0; x < width; x += 24) {
        ctx.fillRect(x, 5, 2, 19);
    }
    ctx.fillStyle = '#ff4a3c';
    for (let x = 10; x < width; x += 32) {
        ctx.fillRect(x, 8, 4, 4);
    }
    ctx.fillStyle = '#0d1119';
    for (let x = 4; x < width; x += 16) {
        ctx.fillRect(x, 16, 8, 8);
    }
    ctx.fillStyle = '#5a6a86';
    for (let x = 6; x < width; x += 16) {
        ctx.fillRect(x, 17, 4, 2);
    }
}
