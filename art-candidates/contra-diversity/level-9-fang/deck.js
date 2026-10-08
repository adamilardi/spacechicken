// Hive fang — SOLID platform, 96x24.
// Bone fang walk edge over dark chitin with purple marrow notches.
// Same flat style as paintHiveChitin; bone edge inverts the teal deck.
export function paint(ctx, width, height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#2c1238';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#f2e8d8';
    ctx.fillRect(0, 0, width, 3);
    ctx.fillStyle = '#8e6a9e';
    ctx.fillRect(0, 3, width, 2);
    ctx.fillStyle = '#f2e8d8';
    for (let x = 6; x < width; x += 24) {
        ctx.fillRect(x, 5, 8, 4);
        ctx.fillRect(x + 2, 9, 4, 4);
    }
    ctx.fillStyle = '#5a2a6e';
    for (let x = 2; x < width; x += 24) {
        ctx.fillRect(x, 15, 6, 5);
    }
    ctx.fillStyle = '#170a20';
    for (let x = 0; x < width; x += 12) {
        ctx.fillRect(x + 5, 21, 3, 3);
    }
}
