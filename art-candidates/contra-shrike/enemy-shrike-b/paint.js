// Shrike B — rotor orb (bonk), 48x48, faces right. KILLED: repeats the
// sentry orb read; static side propellers say "drone variant". Kept on disk
// per the skill in case the selector resurrects it.
export function paint(ctx, _width, _height) {
    ctx.imageSmoothingEnabled = false;
    // Side propeller pods.
    ctx.fillStyle = '#2a3648';
    ctx.fillRect(0, 22, 8, 10);
    ctx.fillRect(40, 22, 8, 10);
    ctx.strokeStyle = '#9cecff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.lineTo(8, 32);
    ctx.moveTo(8, 22);
    ctx.lineTo(0, 32);
    ctx.moveTo(40, 22);
    ctx.lineTo(48, 32);
    ctx.moveTo(48, 22);
    ctx.lineTo(40, 32);
    ctx.stroke();
    // Slate sphere.
    ctx.fillStyle = '#3d4c63';
    ctx.beginPath();
    ctx.arc(24, 28, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5a6f8f';
    ctx.beginPath();
    ctx.arc(24, 26, 10, 0, Math.PI * 2);
    ctx.fill();
    // Red eye.
    ctx.fillStyle = '#ff4a3c';
    ctx.beginPath();
    ctx.arc(29, 26, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff8ec';
    ctx.beginPath();
    ctx.arc(30, 25, 2, 0, Math.PI * 2);
    ctx.fill();
    // Bottom spike.
    ctx.fillStyle = '#c7d3e8';
    ctx.beginPath();
    ctx.moveTo(19, 38);
    ctx.lineTo(24, 48);
    ctx.lineTo(29, 38);
    ctx.closePath();
    ctx.fill();
    paintCap(ctx, 24, 0);
}

function paintCap(ctx, cx, y) {
    ctx.fillStyle = '#6a4a12';
    ctx.beginPath();
    ctx.ellipse(cx, y + 4, 13, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe14a';
    ctx.beginPath();
    ctx.ellipse(cx, y + 3, 12, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
}
