// Gun pod shell — PICKUP, 28x28.
// Dark round shell with rivets and a core window; the tinted core overlays.
export function paint(ctx, _width, _height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#14181f';
    ctx.beginPath();
    ctx.arc(14, 14, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#39435a';
    ctx.beginPath();
    ctx.arc(14, 14, 13, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#39435a';
    ctx.stroke();
    ctx.fillStyle = '#0d1119';
    ctx.fillRect(7, 7, 14, 14);
    ctx.fillStyle = '#8a99b5';
    ctx.fillRect(4, 12, 3, 3);
    ctx.fillRect(21, 12, 3, 3);
    ctx.fillRect(12, 4, 3, 3);
    ctx.fillRect(12, 21, 3, 3);
    ctx.fillStyle = '#5a6a86';
    ctx.fillRect(2, 13, 4, 2);
    ctx.fillRect(22, 13, 4, 2);
}
