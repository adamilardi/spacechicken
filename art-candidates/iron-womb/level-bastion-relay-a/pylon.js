// Bastion wall sconce — DECOR ONLY, 20x48. No collision.
// Thin and tall so it can never read as a deck.
export function paint(ctx, width, height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#141a26';
    ctx.fillRect(6, 0, 8, height);
    ctx.fillStyle = '#2a3140';
    ctx.fillRect(6, 0, 8, 4);
    ctx.fillRect(6, height - 4, 8, 4);
    ctx.fillStyle = 'rgba(156, 236, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(10, 16, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9cecff';
    ctx.fillRect(6, 12, 8, 8);
    ctx.fillStyle = '#f4ffff';
    ctx.fillRect(6, 12, 8, 2);
    ctx.fillStyle = '#ff4a3c';
    ctx.beginPath();
    ctx.arc(10, 32, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd7a8';
    ctx.beginPath();
    ctx.arc(10, 32, 1.5, 0, Math.PI * 2);
    ctx.fill();
}
