// Spire alloy deck — SOLID platform, 128x28.
// New silhouette vs issHull: chevron notches + gold center stripe.
export function paint(ctx, width, height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#9aa6b5';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#f4f7fb';
    ctx.fillRect(0, 0, width, 5);
    ctx.fillStyle = '#d7a441';
    ctx.fillRect(0, 5, width, 3);
    ctx.fillStyle = '#3a4356';
    for (let x = 12; x < width; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 12);
        ctx.lineTo(x + 8, 18);
        ctx.lineTo(x, 24);
        ctx.closePath();
        ctx.fill();
    }
    ctx.fillStyle = '#173e68';
    ctx.fillRect(10, 14, 16, 6);
    ctx.fillRect(102, 14, 16, 6);
}
