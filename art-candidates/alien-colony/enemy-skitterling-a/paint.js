// Skitterling — shootable colony runner (boarder role), 40x48, faces right.
// Low magenta carapace, six legs, cyan chest lens. Keep the torso mass
// centered so the 22x36 boarder body still fits the solid pixels.
export function paint(ctx, _width, _height) {
    ctx.imageSmoothingEnabled = false;
    ctx.strokeStyle = '#4a1030';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
        const x = 10 + i * 9;
        ctx.beginPath();
        ctx.moveTo(x, 30);
        ctx.lineTo(x - 3, 42);
        ctx.moveTo(x + 9, 30);
        ctx.lineTo(x + 12, 42);
        ctx.stroke();
    }
    ctx.fillStyle = '#5e1440';
    ctx.beginPath();
    ctx.ellipse(20, 26, 15, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d63c8c';
    ctx.beginPath();
    ctx.ellipse(21, 24, 11, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff9ac2';
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(10 + i * 7, 18);
        ctx.lineTo(13 + i * 7, 10);
        ctx.lineTo(16 + i * 7, 18);
        ctx.closePath();
        ctx.fill();
    }
    ctx.fillStyle = '#2a0a1c';
    ctx.beginPath();
    ctx.moveTo(32, 22);
    ctx.lineTo(39, 25);
    ctx.lineTo(32, 28);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#9af6ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(20, 27, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#e8fdff';
    ctx.beginPath();
    ctx.arc(20, 27, 2, 0, Math.PI * 2);
    ctx.fill();
}
