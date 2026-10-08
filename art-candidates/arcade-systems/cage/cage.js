// Rescue cage (full) — PICKUP, 32x48.
// Iron bars with the crew chicken inside. Touched to free: swaps to the
// open cage, grants a time bonus, crew needs no actor.
export function paint(ctx, width, height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0d1119';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#f4f7fb';
    ctx.beginPath();
    ctx.arc(16, 28, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff9a3c';
    ctx.beginPath();
    ctx.moveTo(22, 26);
    ctx.lineTo(28, 29);
    ctx.lineTo(22, 32);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#14181f';
    ctx.beginPath();
    ctx.arc(14, 26, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff9a3c';
    ctx.fillRect(11, 36, 4, 3);
    ctx.fillRect(18, 36, 4, 3);
    ctx.fillStyle = '#5a6a86';
    for (let x = 3; x < width; x += 7) {
        ctx.fillRect(x, 2, 3, 44);
    }
    ctx.fillStyle = '#39435a';
    ctx.fillRect(0, 0, width, 4);
    ctx.fillRect(0, 44, width, 4);
    ctx.fillRect(0, 0, 3, height);
    ctx.fillRect(width - 3, 0, 3, height);
    ctx.fillStyle = '#ffd23c';
    ctx.fillRect(13, 20, 6, 8);
    ctx.fillStyle = '#14181f';
    ctx.fillRect(15, 22, 2, 4);
}
