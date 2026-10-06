// Hive chitin deck — SOLID platform, 96x24. Teal top edge reads as walkable.
export function paint(ctx, width, height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#3d1c4e';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#67ffd2';
    ctx.fillRect(0, 0, width, 4);
    ctx.fillStyle = '#d7fff4';
    ctx.fillRect(0, 4, width, 2);
    ctx.fillStyle = '#24122e';
    for (let x = 6; x < width; x += 24) {
        ctx.beginPath();
        ctx.arc(x, 16, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = '#c78bff';
    ctx.fillRect(40, 10, 16, 4);
}
