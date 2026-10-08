// Womb flesh deck — SOLID platform, 96x24.
// Pale bone walkable top edge over dark mottled flesh with vein dots.
// Same flat style as paintLabDeck; distinct from hiveChitin's teal edge.
export function paint(ctx, width, height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#4a1420';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#f2d8c9';
    ctx.fillRect(0, 0, width, 3);
    ctx.fillStyle = '#8e2f3f';
    ctx.fillRect(0, 3, width, 2);
    ctx.fillStyle = '#33101a';
    for (let x = 6; x < width; x += 24) {
        ctx.fillRect(x, 8, 10, 6);
    }
    ctx.fillStyle = '#ff5a8a';
    for (let x = 4; x < width; x += 24) {
        ctx.fillRect(x, 10, 3, 3);
        ctx.fillRect(x + 14, 16, 3, 3);
    }
    ctx.fillStyle = '#1c060d';
    for (let x = 0; x < width; x += 12) {
        ctx.fillRect(x + 4, 20, 4, 4);
    }
}
