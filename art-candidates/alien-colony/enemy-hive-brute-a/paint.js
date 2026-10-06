// Hive Brute — bonk spring (gold cap), 56x48, faces right. Bulky chitin
// torso under the spring pad; stomp the cap to launch. Solid pixels sit
// under the pad so a 44x34 bonk body matches.
export function paint(ctx, _width, _height) {
    ctx.imageSmoothingEnabled = false;
    ctx.strokeStyle = '#fff6c2';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(20, 13);
    ctx.lineTo(25, 9);
    ctx.lineTo(20, 6);
    ctx.lineTo(27, 3);
    ctx.moveTo(36, 13);
    ctx.lineTo(31, 9);
    ctx.lineTo(36, 6);
    ctx.lineTo(29, 3);
    ctx.stroke();
    ctx.fillStyle = '#6a4a12';
    ctx.beginPath();
    ctx.ellipse(28, 5, 13, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe14a';
    ctx.beginPath();
    ctx.ellipse(28, 4, 12, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff8c4';
    ctx.fillRect(21, 3, 14, 2);
    ctx.fillStyle = '#3d1c4e';
    ctx.beginPath();
    ctx.ellipse(28, 28, 19, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a3a8e';
    ctx.beginPath();
    ctx.ellipse(29, 26, 13, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#67ffd2';
    ctx.fillRect(14, 24, 8, 3);
    ctx.fillRect(34, 30, 8, 3);
    ctx.fillStyle = '#2c1238';
    ctx.beginPath();
    ctx.moveTo(44, 20);
    ctx.lineTo(54, 14);
    ctx.lineTo(48, 24);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff4e0';
    ctx.beginPath();
    ctx.arc(40, 24, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#24122e';
    ctx.beginPath();
    ctx.arc(41, 24, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c1238';
    ctx.fillRect(14, 40, 8, 4);
    ctx.fillRect(34, 40, 8, 4);
}
