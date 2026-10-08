// Ember Foundry background — concept layout.
// Smelter interior: ember columns rising through soot, furnace wall with
// crucible mouths, ladle crane rails, melt channel below catwalks.
// Runtime: four baked parallax layers, horizontal scroll, scrollFactorY = 1.
export function paint(ctx, width, height) {
    ctx.imageSmoothingEnabled = false;
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#140d0a');
    sky.addColorStop(0.6, '#2a1410');
    sky.addColorStop(1, '#4a1e12');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    const horizon = height * 0.7;

    // Sky: rising ember columns + spark drift.
    for (let x = 60; x < width; x += 190) {
        const w = 26 + ((x * 7) % 30);
        const grad = ctx.createLinearGradient(0, height, 0, height * 0.15);
        grad.addColorStop(0, 'rgba(255, 106, 42, 0.35)');
        grad.addColorStop(1, 'rgba(255, 106, 42, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x, height * 0.15, w, height * 0.85);
    }
    ctx.fillStyle = '#ffd23c';
    for (let i = 0; i < 40; i++) {
        ctx.fillRect((i * 173) % width, (i * 97) % height, 2, 2);
    }

    // Far: furnace wall with crucible mouths.
    ctx.fillStyle = '#241512';
    ctx.fillRect(0, height * 0.3, width, horizon - height * 0.3);
    ctx.fillStyle = '#140d0a';
    for (let x = 0; x < width; x += 64) {
        ctx.fillRect(x, height * 0.3, 3, horizon - height * 0.3);
    }
    for (let x = 120; x < width; x += 320) {
        ctx.fillStyle = '#ff6a2a';
        ctx.beginPath();
        ctx.arc(x, horizon - 30, 26, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#ffd23c';
        ctx.beginPath();
        ctx.arc(x, horizon - 30, 14, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#140d0a';
        ctx.fillRect(x - 34, horizon - 34, 68, 6);
    }

    // Mid: ladle crane rail with hanging ladles (diagonals).
    ctx.fillStyle = '#3a2c26';
    ctx.fillRect(0, height * 0.18, width, 10);
    for (let x = 200; x < width; x += 380) {
        ctx.strokeStyle = '#3a2c26';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x, height * 0.18);
        ctx.lineTo(x + 40, height * 0.18 + 70);
        ctx.stroke();
        ctx.fillStyle = '#241512';
        ctx.beginPath();
        ctx.moveTo(x + 16, height * 0.18 + 70);
        ctx.lineTo(x + 64, height * 0.18 + 70);
        ctx.lineTo(x + 56, height * 0.18 + 104);
        ctx.lineTo(x + 24, height * 0.18 + 104);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffd23c';
        ctx.fillRect(x + 20, height * 0.18 + 70, 40, 5);
    }

    // Near: melt channel flow + catwalk grate edge.
    ctx.fillStyle = '#ff6a2a';
    ctx.fillRect(0, horizon + 26, width, 14);
    ctx.fillStyle = '#ffd23c';
    for (let x = 0; x < width; x += 52) {
        ctx.fillRect(x + ((x * 5) % 24), horizon + 30, 30, 4);
    }
    ctx.fillStyle = '#140d0a';
    for (let x = 0; x < width; x += 28) {
        ctx.fillRect(x, horizon, 18, 26);
    }
    ctx.fillStyle = '#7dff9a';
    for (let x = 14; x < width; x += 224) {
        ctx.fillRect(x, horizon + 6, 5, 5);
    }
}
