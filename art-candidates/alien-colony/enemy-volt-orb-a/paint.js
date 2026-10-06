// Volt Orb — lethal spire drone (unmarked), 48x48. Dark orb with gold
// arc strokes and a pale core. Central mass fits the drone body circle.
export function paint(ctx, _width, _height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#1c2430';
    ctx.beginPath();
    ctx.arc(24, 24, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6a1c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(24, 24, 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ffe14a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(12, 18);
    ctx.lineTo(20, 22);
    ctx.lineTo(16, 28);
    ctx.lineTo(26, 30);
    ctx.moveTo(36, 16);
    ctx.lineTo(30, 22);
    ctx.lineTo(34, 30);
    ctx.stroke();
    ctx.fillStyle = '#d9fbff';
    ctx.beginPath();
    ctx.arc(24, 24, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#173e68';
    ctx.beginPath();
    ctx.arc(24, 24, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a4356';
    ctx.fillRect(4, 22, 5, 4);
    ctx.fillRect(39, 22, 5, 4);
}
