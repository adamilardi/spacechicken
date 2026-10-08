// Bonkable enemies, boarders, and hive creatures. Painted canvas textures for SpriteFactory.

export function paintBonkPad(ctx, cx, y) {
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

export function paintBonkMarker(ctx) {
    const chevron = (y, color) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(3, y);
        ctx.lineTo(13, y + 8);
        ctx.lineTo(23, y);
        ctx.lineTo(19, y);
        ctx.lineTo(13, y + 5);
        ctx.lineTo(7, y);
        ctx.closePath();
        ctx.fill();
    };
    chevron(1, '#ffe14a');
    chevron(9, '#fff4b0');
}

export function paintLabTech(ctx) {
    paintBonkPad(ctx, 24, 1);
    ctx.fillStyle = '#f4f7fb';
    ctx.fillRect(12, 30, 24, 24);
    ctx.fillStyle = '#c5d0de';
    ctx.fillRect(14, 34, 20, 14);
    ctx.fillStyle = '#5b3ec4';
    ctx.beginPath();
    ctx.arc(24, 24, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#efe6ff';
    ctx.beginPath();
    ctx.arc(20, 24, 3, 0, Math.PI * 2);
    ctx.arc(29, 24, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1030';
    ctx.beginPath();
    ctx.arc(20, 24, 1.4, 0, Math.PI * 2);
    ctx.arc(29, 24, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#67ffd2';
    ctx.fillRect(16, 40, 5, 3);
    ctx.fillRect(27, 40, 5, 3);
    ctx.strokeStyle = '#3a2d6b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, 54);
    ctx.lineTo(16, 62);
    ctx.moveTo(30, 54);
    ctx.lineTo(32, 62);
    ctx.stroke();
}

export function paintSpecimen(ctx) {
    paintBonkPad(ctx, 24, 0);
    ctx.fillStyle = '#3a1460';
    ctx.beginPath();
    ctx.ellipse(24, 34, 16, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c78bff';
    ctx.beginPath();
    ctx.ellipse(24, 32, 11, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7d2dff';
    ctx.beginPath();
    ctx.arc(18, 30, 3, 0, Math.PI * 2);
    ctx.arc(30, 38, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fffef6';
    ctx.beginPath();
    ctx.arc(19, 28, 2.4, 0, Math.PI * 2);
    ctx.arc(29, 28, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#241033';
    ctx.beginPath();
    ctx.arc(20, 28, 1.1, 0, Math.PI * 2);
    ctx.arc(30, 28, 1.1, 0, Math.PI * 2);
    ctx.fill();
}

export function paintSentryOrb(ctx) {
    paintBonkPad(ctx, 24, 0);
    ctx.fillStyle = '#1c2430';
    ctx.beginPath();
    ctx.arc(24, 32, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8ef6ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(24, 32, 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#d9fbff';
    ctx.beginPath();
    ctx.arc(24, 32, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#12343a';
    ctx.beginPath();
    ctx.arc(24, 32, 2.5, 0, Math.PI * 2);
    ctx.fill();
}

export function paintBeetle(ctx) {
    paintBonkPad(ctx, 28, 0);
    ctx.fillStyle = '#6a1d14';
    ctx.beginPath();
    ctx.ellipse(28, 24, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e25b32';
    ctx.beginPath();
    ctx.ellipse(30, 23, 13, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a0c08';
    ctx.fillRect(8, 28, 8, 3);
    ctx.fillRect(20, 30, 8, 3);
    ctx.fillRect(34, 30, 8, 3);
    ctx.fillRect(44, 28, 8, 3);
    ctx.fillStyle = '#fff1a8';
    ctx.beginPath();
    ctx.arc(42, 20, 2, 0, Math.PI * 2);
    ctx.fill();
}

export function paintHopper(ctx) {
    paintBonkPad(ctx, 20, 0);
    ctx.fillStyle = '#c46a3a';
    ctx.fillRect(16, 28, 8, 16);
    ctx.fillStyle = '#f0b27a';
    ctx.beginPath();
    ctx.arc(20, 22, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a120c';
    ctx.beginPath();
    ctx.arc(17, 21, 1.5, 0, Math.PI * 2);
    ctx.arc(23, 21, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a3d22';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(16, 44);
    ctx.lineTo(8, 58);
    ctx.lineTo(18, 58);
    ctx.moveTo(24, 44);
    ctx.lineTo(32, 58);
    ctx.lineTo(20, 58);
    ctx.stroke();
}

export function paintCrusher(ctx) {
    ctx.fillStyle = '#2b313c';
    ctx.fillRect(0, 4, 72, 22);
    ctx.fillStyle = '#8d97a8';
    ctx.fillRect(0, 4, 72, 4);
    for (let x = 0; x < 72; x += 12) {
        ctx.fillStyle = x % 24 === 0 ? '#ff5a4a' : '#15181f';
        ctx.fillRect(x, 18, 12, 8);
    }
    ctx.fillStyle = '#d5dde8';
    ctx.beginPath();
    ctx.arc(12, 12, 3, 0, Math.PI * 2);
    ctx.arc(60, 12, 3, 0, Math.PI * 2);
    ctx.fill();
}

export function paintBoarder(ctx) {
    ctx.fillStyle = '#1d8a45';
    ctx.fillRect(12, 22, 16, 16);
    ctx.fillStyle = '#39c46a';
    ctx.beginPath();
    ctx.arc(20, 14, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4fff6';
    ctx.beginPath();
    ctx.ellipse(24, 13, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#102016';
    ctx.beginPath();
    ctx.arc(26, 13, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#9af6ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(20, 30, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#e8fdff';
    ctx.beginPath();
    ctx.arc(20, 30, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#146b36';
    ctx.fillRect(6, 24, 6, 4);
    ctx.fillRect(28, 24, 6, 4);
    ctx.fillStyle = '#0e4a26';
    ctx.fillRect(13, 38, 6, 8);
    ctx.fillRect(23, 38, 6, 8);
}

export function paintSkitterling(ctx) {
    ctx.strokeStyle = '#4a1030';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
        const x = 10 + i * 9;
        ctx.beginPath();
        ctx.moveTo(x, 30);
        ctx.lineTo(x - 3, 42);
        ctx.moveTo(x + 9, 30);
        ctx.lineTo(x + 12, 42);
        ctx.stroke();
    }
    ctx.fillStyle = '#5e1440';
    ctx.beginPath();
    ctx.ellipse(20, 26, 15, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d63c8c';
    ctx.beginPath();
    ctx.ellipse(21, 24, 11, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff9ac2';
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(10 + i * 7, 18);
        ctx.lineTo(13 + i * 7, 10);
        ctx.lineTo(16 + i * 7, 18);
        ctx.closePath();
        ctx.fill();
    }
    ctx.fillStyle = '#2a0a1c';
    ctx.beginPath();
    ctx.moveTo(32, 22);
    ctx.lineTo(39, 25);
    ctx.lineTo(32, 28);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#9af6ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(20, 27, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#e8fdff';
    ctx.beginPath();
    ctx.arc(20, 27, 2, 0, Math.PI * 2);
    ctx.fill();
}

export function paintSporeFloater(ctx) {
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

export function paintHiveBrute(ctx) {
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
    ctx.arc(41, 24, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c1238';
    ctx.fillRect(14, 40, 8, 4);
    ctx.fillRect(34, 40, 8, 4);
}

export function paintGnawer(ctx) {
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

export function paintSpireWarden(ctx) {
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

export function paintVoltOrb(ctx) {
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

export function createDrone(factory) {
    if (!factory.scene.textures.exists('drone')) {
        const droneCanvas = document.createElement('canvas');
        droneCanvas.width = 48;
        droneCanvas.height = 48;
        const ctx = droneCanvas.getContext('2d');
        ctx.fillStyle = '#1f2633';
        ctx.beginPath();
        ctx.arc(24, 24, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5fd0ff';
        ctx.beginPath();
        ctx.arc(24, 24, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff0066';
        ctx.fillRect(20, 8, 8, 6);
        ctx.fillRect(20, 34, 8, 6);
        ctx.fillRect(8, 20, 6, 8);
        ctx.fillRect(34, 20, 6, 8);
        factory.scene.textures.addCanvas('drone', droneCanvas);
    }
}

export function createRover(factory) {
    if (!factory.scene.textures.exists('rover')) {
        const roverCanvas = document.createElement('canvas');
        roverCanvas.width = 56;
        roverCanvas.height = 36;
        const ctx = roverCanvas.getContext('2d');

        ctx.fillStyle = '#5a5a66';
        ctx.fillRect(8, 8, 40, 18);
        ctx.strokeStyle = '#3a3a42';
        ctx.lineWidth = 2;
        ctx.strokeRect(8, 8, 40, 18);

        ctx.fillStyle = '#2f4f6f';
        ctx.fillRect(14, 4, 28, 6);

        ctx.fillStyle = '#2a2a32';
        ctx.beginPath();
        ctx.arc(14, 28, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(42, 28, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#7a7a82';
        ctx.beginPath();
        ctx.arc(14, 28, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(42, 28, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#9a9aa2';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(48, 10);
        ctx.lineTo(54, 2);
        ctx.stroke();
        ctx.fillStyle = '#ffdd55';
        ctx.beginPath();
        ctx.arc(54, 2, 2, 0, Math.PI * 2);
        ctx.fill();

        factory.scene.textures.addCanvas('rover', roverCanvas);
    }
}

export const ENEMY_SPRITES = [
    ['bonkMarker', 26, 18, paintBonkMarker],
    ['labTech', 48, 64, paintLabTech],
    ['specimen', 48, 56, paintSpecimen],
    ['sentryOrb', 48, 52, paintSentryOrb],
    ['beetle', 56, 42, paintBeetle],
    ['hopper', 40, 62, paintHopper],
    ['crusher', 72, 30, paintCrusher],
    ['boarder', 40, 48, paintBoarder],
    ['skitterling', 40, 48, paintSkitterling],
    ['sporeFloater', 48, 48, paintSporeFloater],
    ['hiveBrute', 56, 48, paintHiveBrute],
    ['gnawer', 40, 48, paintGnawer],
    ['spireWarden', 40, 56, paintSpireWarden],
    ['voltOrb', 48, 48, paintVoltOrb],
];
