// Player chicken frames and jetpack flame. Painted canvas textures for SpriteFactory.

export function createChickenFrames(factory) {
    if (factory.scene.textures.exists('chicken1')) {
        return;
    }

    function drawChicken(ctx, wingAngle, legLeftX, legRightX, legBend, blink = false) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.ellipse(16, 23, 9, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f9a825';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#fff59d';
        ctx.beginPath();
        ctx.ellipse(13, 21, 4, 2.5, -0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.arc(16, 15, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f9a825';
        ctx.stroke();

        ctx.fillStyle = '#e53935';
        ctx.beginPath();
        ctx.moveTo(14, 9);
        ctx.lineTo(16, 5);
        ctx.lineTo(18, 9);
        ctx.fill();

        ctx.fillStyle = '#ff9800';
        ctx.beginPath();
        ctx.moveTo(22, 16);
        ctx.lineTo(27, 15);
        ctx.lineTo(22, 18);
        ctx.fill();
        ctx.fillStyle = '#f57c00';
        ctx.beginPath();
        ctx.moveTo(22, 17);
        ctx.lineTo(26, 16.5);
        ctx.lineTo(22, 18.5);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(18.5, 13.5, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(19, 13.8, 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(19.3, 13.4, 0.5, 0, Math.PI * 2);
        ctx.fill();
        if (blink) {
            ctx.fillStyle = '#ffeb3b';
            ctx.beginPath();
            ctx.arc(18.5, 13.5, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#f9a825';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(17, 14);
            ctx.quadraticCurveTo(18.5, 15, 20.5, 14);
            ctx.stroke();
        }

        // Short, tapered legs stay inside the 32px frame and read clearly at game scale.
        ctx.strokeStyle = '#d87918';
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        if (legBend) {
            ctx.moveTo(12, 27);
            ctx.quadraticCurveTo(10, 29, 10, 30.5);
            ctx.moveTo(20, 27);
            ctx.quadraticCurveTo(22, 29, 22, 30.5);
        } else {
            ctx.moveTo(12, 27);
            ctx.lineTo(Math.max(9, Math.min(15, legLeftX)), 30.5);
            ctx.moveTo(20, 27);
            ctx.lineTo(Math.max(17, Math.min(23, legRightX)), 30.5);
        }
        ctx.stroke();

        ctx.strokeStyle = '#f6a52b';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        if (!legBend) {
            const leftFoot = Math.max(9, Math.min(15, legLeftX));
            const rightFoot = Math.max(17, Math.min(23, legRightX));
            ctx.moveTo(leftFoot - 1.5, 30.5);
            ctx.lineTo(leftFoot + 2, 30.5);
            ctx.moveTo(rightFoot - 2, 30.5);
            ctx.lineTo(rightFoot + 1.5, 30.5);
        }
        ctx.stroke();

        ctx.fillStyle = '#fdd835';
        ctx.strokeStyle = '#f9a825';
        ctx.lineWidth = 1;
        ctx.save();
        ctx.translate(16, 23);
        ctx.rotate(wingAngle);
        ctx.beginPath();
        ctx.ellipse(-3, 0, 7, 4, wingAngle * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.save();
        ctx.translate(16, 23);
        ctx.rotate(wingAngle);
        ctx.beginPath();
        ctx.ellipse(-4, -1, 3, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    const walkFrames = [
        ['chicken1', Math.PI / 6, 10, 22],
        ['chicken2', -Math.PI / 6, 12, 20],
        ['chicken3', Math.PI / 6, 14, 18],
        ['chicken4', Math.PI / 8, 11, 21],
    ];
    walkFrames.forEach(([key, wing, left, right]) => {
        factory.addCanvasTexture(key, 32, 32, (ctx) => {
            drawChicken(ctx, wing, left, right, false);
        });
    });
    factory.addCanvasTexture('chicken_idle', 32, 32, (ctx) => {
        drawChicken(ctx, 0, 11, 21, false);
    });
    // Bake the breath into the artwork so squash/stretch and collision bounds stay independent.
    factory.addCanvasTexture('chicken_breathe', 32, 32, (ctx) => {
        ctx.translate(0, 31);
        ctx.scale(1, 1.025);
        ctx.translate(0, -31);
        drawChicken(ctx, 0, 11, 21, false);
    });
    factory.addCanvasTexture('chicken_blink', 32, 32, (ctx) => {
        drawChicken(ctx, 0, 11, 21, false, true);
    });
    factory.addCanvasTexture('chicken_jump', 32, 32, (ctx) => {
        drawChicken(ctx, 0, 0, 0, true);
    });
    factory.addCanvasTexture('chicken_fall', 32, 32, (ctx) => {
        drawChicken(ctx, -Math.PI / 3, 0, 0, true);
    });
    factory.addCanvasTexture('chicken_jetpack1', 32, 32, (ctx) => {
        drawChicken(ctx, 0, 0, 0, true);
        drawJetpack(factory, ctx, 1);
    });
    factory.addCanvasTexture('chicken_jetpack2', 32, 32, (ctx) => {
        drawChicken(ctx, 0, 0, 0, true);
        drawJetpack(factory, ctx, 2);
    });
}

export function drawJetpack(factory, ctx, frame) {
    ctx.fillStyle = '#24394e';
    ctx.fillRect(8, 16, 4, 10);
    ctx.fillRect(20, 16, 4, 10);
    const casing = ctx.createLinearGradient(12, 16, 20, 24);
    casing.addColorStop(0, '#cee9ee');
    casing.addColorStop(0.45, '#7299ac');
    casing.addColorStop(1, '#344d68');
    ctx.fillStyle = casing;
    ctx.fillRect(12, 16, 8, 8);
    ctx.fillStyle = '#81f4ff';
    ctx.fillRect(14, 18, 4, 2);
    ctx.fillStyle = '#ffcc00';
    if (frame === 1) {
        ctx.beginPath();
        ctx.moveTo(10, 26);
        ctx.lineTo(12, 30);
        ctx.lineTo(14, 26);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(18, 26);
        ctx.lineTo(20, 30);
        ctx.lineTo(22, 26);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.moveTo(11, 26);
        ctx.lineTo(12, 30);
        ctx.lineTo(13, 26);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(19, 26);
        ctx.lineTo(20, 30);
        ctx.lineTo(21, 26);
        ctx.closePath();
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.moveTo(10, 26);
        ctx.lineTo(12, 31);
        ctx.lineTo(14, 26);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(18, 26);
        ctx.lineTo(20, 31);
        ctx.lineTo(22, 26);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ff2200';
        ctx.beginPath();
        ctx.moveTo(11, 26);
        ctx.lineTo(12, 31);
        ctx.lineTo(13, 26);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(19, 26);
        ctx.lineTo(20, 31);
        ctx.lineTo(21, 26);
        ctx.closePath();
        ctx.fill();
    }
}
