// Hive sac — DECOR only, 40x48.
// Brood sac swaying on a stalk. Round and soft; never a landing surface.
export function paint(ctx, _width, _height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#2c1238';
    ctx.fillRect(18, 0, 4, 14);
    ctx.fillStyle = '#5a2a6e';
    ctx.beginPath();
    ctx.arc(20, 30, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8e3a5e';
    ctx.beginPath();
    ctx.arc(20, 30, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#67ffd2';
    ctx.beginPath();
    ctx.arc(16, 26, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d7fff4';
    ctx.beginPath();
    ctx.arc(15, 25, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2e8d8';
    ctx.fillRect(12, 40, 3, 3);
    ctx.fillRect(26, 38, 3, 3);
}
