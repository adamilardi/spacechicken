// Shrike A — diving falcon-drone (bonk), 48x48, faces right.
// Swept wings, rust body, cream belly, hooked beak pointing down-forward:
// the swoop verb in the neutral pose. Gold spring-cap is the bonk read.
export function paint(ctx, _width, _height) {
    ctx.imageSmoothingEnabled = false;
    // Rear wing (darker, behind): sweeps up-left.
    ctx.fillStyle = '#5e1f16';
    ctx.beginPath();
    ctx.moveTo(20, 26);
    ctx.lineTo(6, 8);
    ctx.lineTo(24, 18);
    ctx.closePath();
    ctx.fill();
    // Tail fins.
    ctx.fillStyle = '#7d2a1d';
    ctx.beginPath();
    ctx.moveTo(12, 30);
    ctx.lineTo(2, 26);
    ctx.lineTo(4, 34);
    ctx.lineTo(12, 36);
    ctx.closePath();
    ctx.fill();
    // Body: rust almond.
    ctx.fillStyle = '#b33a2a';
    ctx.beginPath();
    ctx.ellipse(25, 30, 13, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    // Cream belly.
    ctx.fillStyle = '#f2d8a8';
    ctx.beginPath();
    ctx.ellipse(26, 34, 8, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Front wing: sweeps up from the shoulder.
    ctx.fillStyle = '#7d2a1d';
    ctx.beginPath();
    ctx.moveTo(22, 28);
    ctx.lineTo(14, 10);
    ctx.lineTo(28, 22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d65a3a';
    ctx.beginPath();
    ctx.moveTo(22, 27);
    ctx.lineTo(17, 15);
    ctx.lineTo(25, 23);
    ctx.closePath();
    ctx.fill();
    // Head + hooked beak pointing down-forward.
    ctx.fillStyle = '#b33a2a';
    ctx.beginPath();
    ctx.arc(33, 26, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffb15a';
    ctx.beginPath();
    ctx.moveTo(37, 27);
    ctx.lineTo(45, 31);
    ctx.lineTo(38, 35);
    ctx.closePath();
    ctx.fill();
    // Eye.
    ctx.fillStyle = '#fff8ec';
    ctx.beginPath();
    ctx.arc(33, 23, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a0e04';
    ctx.beginPath();
    ctx.arc(34, 23, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Gold spring-cap: the bonk read.
    paintCap(ctx, 22, 0);
}

function paintCap(ctx, cx, y) {
    ctx.strokeStyle = '#fff6c2';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 8, y + 12);
    ctx.lineTo(cx - 3, y + 8);
    ctx.lineTo(cx - 8, y + 5);
    ctx.lineTo(cx - 1, y + 2);
    ctx.moveTo(cx + 8, y + 12);
    ctx.lineTo(cx + 3, y + 8);
    ctx.lineTo(cx + 8, y + 5);
    ctx.lineTo(cx + 1, y + 2);
    ctx.stroke();
    ctx.fillStyle = '#6a4a12';
    ctx.beginPath();
    ctx.ellipse(cx, y + 4, 13, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe14a';
    ctx.beginPath();
    ctx.ellipse(cx, y + 3, 12, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff8c4';
    ctx.fillRect(cx - 7, y + 2, 14, 2);
}
