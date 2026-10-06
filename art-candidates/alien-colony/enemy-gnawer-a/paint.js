// Gnawer — shootable hive runner (boarder role), 40x48, faces right.
// Vertical toothy maw, small legs, cyan lens above the jaw. Torso mass
// centered for the 22x36 boarder body.
export function paint(ctx, _width, _height) {
    ctx.imageSmoothingEnabled = false;
    ctx.strokeStyle = '#1c0f2e';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(14, 36);
    ctx.lineTo(11, 46);
    ctx.moveTo(26, 36);
    ctx.lineTo(29, 46);
    ctx.stroke();
    ctx.fillStyle = '#3d1c4e';
    ctx.beginPath();
    ctx.ellipse(20, 26, 12, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#12081e';
    ctx.beginPath();
    ctx.ellipse(24, 28, 7, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e9d4ff';
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(18 + i * 4, 20);
        ctx.lineTo(20 + i * 4, 25);
        ctx.lineTo(22 + i * 4, 20);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(18 + i * 4, 36);
        ctx.lineTo(20 + i * 4, 31);
        ctx.lineTo(22 + i * 4, 36);
        ctx.closePath();
        ctx.fill();
    }
    ctx.strokeStyle = '#9af6ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(16, 14, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#e8fdff';
    ctx.beginPath();
    ctx.arc(16, 14, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a3a8e';
    ctx.beginPath();
    ctx.arc(12, 34, 3, 0, Math.PI * 2);
    ctx.fill();
}
