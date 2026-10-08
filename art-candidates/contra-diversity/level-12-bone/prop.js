// Womb eye — DECOR only, 36x36.
// Watching eye on a flesh stalk. Round and soft; never a landing surface.
export function paint(ctx, _width, _height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#4a1420';
    ctx.fillRect(15, 22, 6, 14);
    ctx.fillStyle = '#f2d8c9';
    ctx.beginPath();
    ctx.arc(18, 13, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff5a8a';
    ctx.beginPath();
    ctx.arc(18, 13, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c060d';
    ctx.beginPath();
    ctx.arc(18, 13, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(16, 11, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8e2f3f';
    ctx.fillRect(8, 24, 4, 4);
    ctx.fillRect(24, 26, 4, 4);
}
