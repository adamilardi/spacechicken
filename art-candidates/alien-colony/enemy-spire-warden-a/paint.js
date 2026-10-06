// Spire Warden — shootable spire elite (boarder role), 40x56, faces right.
// Tall gold helm and cuirass with a cyan lens; pike held low. Torso mass
// centered for the 22x36 boarder body; helm and skirt are trim.
export function paint(ctx, _width, _height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#8a6a1c';
    ctx.fillRect(14, 4, 12, 10);
    ctx.fillStyle = '#ffe14a';
    ctx.fillRect(14, 4, 12, 3);
    ctx.fillStyle = '#3a2c08';
    ctx.fillRect(24, 8, 4, 3);
    ctx.fillStyle = '#9aa6b5';
    ctx.fillRect(8, 16, 24, 20);
    ctx.strokeStyle = '#3a4356';
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 16, 24, 20);
    ctx.fillStyle = '#d7a441';
    ctx.fillRect(8, 24, 24, 3);
    ctx.strokeStyle = '#9af6ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(20, 26, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#e8fdff';
    ctx.beginPath();
    ctx.arc(20, 26, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6d7888';
    ctx.beginPath();
    ctx.moveTo(8, 36);
    ctx.lineTo(32, 36);
    ctx.lineTo(28, 46);
    ctx.lineTo(12, 46);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#3a4356';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(15, 46);
    ctx.lineTo(14, 54);
    ctx.moveTo(25, 46);
    ctx.lineTo(26, 54);
    ctx.stroke();
    ctx.strokeStyle = '#8a6a1c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, 30);
    ctx.lineTo(38, 12);
    ctx.stroke();
    ctx.fillStyle = '#ffe14a';
    ctx.beginPath();
    ctx.moveTo(38, 6);
    ctx.lineTo(40, 13);
    ctx.lineTo(36, 13);
    ctx.closePath();
    ctx.fill();
}
