// Shrike C — manta ray (bonk), 48x48, faces right. KILLED: the full-width
// flat wing reads as a platform edge and the curled tail muddies the
// hitbox. Kept on disk per the skill in case the selector resurrects it.
export function paint(ctx, _width, _height) {
    ctx.imageSmoothingEnabled = false;
    // Flat diamond wing.
    ctx.fillStyle = '#4a2a6e';
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.lineTo(24, 12);
    ctx.lineTo(48, 22);
    ctx.lineTo(24, 32);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7d5fc4';
    ctx.beginPath();
    ctx.moveTo(8, 22);
    ctx.lineTo(24, 16);
    ctx.lineTo(40, 22);
    ctx.lineTo(24, 28);
    ctx.closePath();
    ctx.fill();
    // Head hump + eye.
    ctx.fillStyle = '#4a2a6e';
    ctx.beginPath();
    ctx.arc(32, 24, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff8ec';
    ctx.beginPath();
    ctx.arc(34, 22, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a0e04';
    ctx.beginPath();
    ctx.arc(35, 22, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Curled stinger tail.
    ctx.strokeStyle = '#2c1846';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(16, 28);
    ctx.quadraticCurveTo(10, 40, 20, 44);
    ctx.stroke();
    ctx.fillStyle = '#c78bff';
    ctx.beginPath();
    ctx.moveTo(20, 44);
    ctx.lineTo(26, 44);
    ctx.lineTo(23, 38);
    ctx.closePath();
    ctx.fill();
    paintCap(ctx, 32, 0);
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
