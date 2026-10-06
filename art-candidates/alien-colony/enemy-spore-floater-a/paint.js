// Spore Floater — lethal colony drone (unmarked), 48x48. Puffball with
// spikes and one flank eye. Central mass fits the drone's ~24px body circle.
export function paint(ctx, _width, _height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#6a4a12';
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const tipX = 24 + Math.cos(angle) * 20;
        const tipY = 24 + Math.sin(angle) * 20;
        const baseX = 24 + Math.cos(angle) * 12;
        const baseY = 24 + Math.sin(angle) * 12;
        ctx.beginPath();
        ctx.moveTo(baseX - 3, baseY);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(baseX + 3, baseY);
        ctx.closePath();
        ctx.fill();
    }
    ctx.fillStyle = '#8a5a1c';
    ctx.beginPath();
    ctx.arc(24, 24, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8a83c';
    ctx.beginPath();
    ctx.arc(24, 24, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff4e0';
    ctx.beginPath();
    ctx.arc(30, 22, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a0e04';
    ctx.beginPath();
    ctx.arc(31, 22, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe6b0';
    ctx.fillRect(14, 15, 4, 3);
}
