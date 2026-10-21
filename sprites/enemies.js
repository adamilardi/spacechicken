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
    // Lethal drone: a red-hot core and heavy sparks. The center stays red
    // so it never reads as a shootable lens or a gold pickup.
    ctx.fillStyle = '#1c2430';
    ctx.beginPath();
    ctx.arc(24, 24, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a2a1c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(24, 24, 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ffe14a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(24, 24, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ff5a3c';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(10, 16);
    ctx.lineTo(19, 21);
    ctx.lineTo(15, 28);
    ctx.lineTo(26, 31);
    ctx.moveTo(38, 15);
    ctx.lineTo(30, 21);
    ctx.lineTo(35, 29);
    ctx.lineTo(28, 33);
    ctx.stroke();
    ctx.fillStyle = '#ff4a3c';
    ctx.beginPath();
    ctx.arc(24, 24, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd7a8';
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
        // Lethal patrol cart: hazard chevrons on the hull.
        ctx.fillStyle = '#ff4a3c';
        for (let x = 10; x < 44; x += 10) {
            ctx.beginPath();
            ctx.moveTo(x, 24);
            ctx.lineTo(x + 5, 16);
            ctx.lineTo(x + 9, 16);
            ctx.lineTo(x + 4, 24);
            ctx.closePath();
            ctx.fill();
        }

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
        ctx.fillStyle = '#ff4a3c';
        ctx.beginPath();
        ctx.arc(54, 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd7a8';
        ctx.beginPath();
        ctx.arc(54, 2, 1.2, 0, Math.PI * 2);
        ctx.fill();

        factory.scene.textures.addCanvas('rover', roverCanvas);
    }
}

export function paintBroodmother(ctx) {
    ctx.imageSmoothingEnabled = false;
    ctx.strokeStyle = '#3d0b26';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
        const x = 34 + i * 26;
        ctx.beginPath();
        ctx.moveTo(x, 58);
        ctx.lineTo(x - 8, 80);
        ctx.moveTo(x + 14, 58);
        ctx.lineTo(x + 22, 80);
        ctx.stroke();
    }
    ctx.fillStyle = '#5e1440';
    ctx.beginPath();
    ctx.ellipse(60, 48, 50, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d63c8c';
    ctx.beginPath();
    ctx.ellipse(62, 43, 40, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8f1f5c';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
        const x = 34 + i * 18;
        ctx.beginPath();
        ctx.moveTo(x, 30);
        ctx.quadraticCurveTo(x + 4, 43, x, 58);
        ctx.stroke();
    }
    ctx.fillStyle = '#ff9ac2';
    for (let i = 0; i < 5; i++) {
        const x = 26 + i * 17;
        ctx.beginPath();
        ctx.moveTo(x, 26);
        ctx.lineTo(x + 8, 6);
        ctx.lineTo(x + 16, 26);
        ctx.closePath();
        ctx.fill();
    }
    ctx.fillStyle = '#2a0a1c';
    ctx.beginPath();
    ctx.moveTo(14, 44);
    ctx.lineTo(2, 54);
    ctx.lineTo(14, 60);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(14, 60);
    ctx.lineTo(4, 68);
    ctx.lineTo(16, 66);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff4a5a';
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(22 + i * 9, 36, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.strokeStyle = '#9af6ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(60, 48, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#e8fdff';
    ctx.beginPath();
    ctx.arc(60, 48, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4a4cf';
    ctx.beginPath();
    ctx.ellipse(60, 66, 34, 7, 0, 0, Math.PI);
    ctx.fill();
}

export function paintHiveMother(ctx) {
    ctx.imageSmoothingEnabled = false;
    ctx.strokeStyle = '#1c0f2e';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
        const x = 30 + i * 24;
        ctx.beginPath();
        ctx.moveTo(x, 56);
        ctx.lineTo(x - 7, 76);
        ctx.moveTo(x + 12, 56);
        ctx.lineTo(x + 19, 76);
        ctx.stroke();
    }
    ctx.fillStyle = '#3d1c4e';
    ctx.beginPath();
    ctx.ellipse(55, 46, 46, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5e2a6e';
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
        const x = 34 + i * 17;
        ctx.beginPath();
        ctx.moveTo(x, 28);
        ctx.quadraticCurveTo(x + 4, 44, x, 62);
        ctx.stroke();
    }
    ctx.fillStyle = '#e9d4ff';
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(72 + i * 9, 62, 4.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = '#e9d4ff';
    for (let i = 0; i < 5; i++) {
        const x = 22 + i * 15;
        ctx.beginPath();
        ctx.moveTo(x, 24);
        ctx.lineTo(x + 7, 6);
        ctx.lineTo(x + 14, 24);
        ctx.closePath();
        ctx.fill();
    }
    ctx.fillStyle = '#12081e';
    ctx.beginPath();
    ctx.moveTo(12, 42);
    ctx.lineTo(2, 52);
    ctx.lineTo(12, 58);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff4a5a';
    ctx.beginPath();
    ctx.arc(20, 34, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(28, 34, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#9af6ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(45, 46, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#e8fdff';
    ctx.beginPath();
    ctx.arc(45, 46, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c78bff';
    ctx.beginPath();
    ctx.arc(66, 30, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(82, 36, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(52, 26, 2, 0, Math.PI * 2);
    ctx.fill();
}

export function paintWardenPrime(ctx) {
    ctx.imageSmoothingEnabled = false;
    // War plume.
    ctx.fillStyle = '#3a2c08';
    ctx.fillRect(52, 2, 26, 12);
    ctx.fillStyle = '#ffe14a';
    ctx.fillRect(52, 2, 26, 5);
    ctx.fillRect(58, 14, 14, 6);
    // Helm band.
    ctx.fillStyle = '#8a6a1c';
    ctx.fillRect(38, 18, 54, 14);
    ctx.fillStyle = '#ffe14a';
    ctx.fillRect(38, 18, 54, 4);
    ctx.fillStyle = '#3a2c08';
    ctx.fillRect(80, 22, 8, 6);
    // Cuirass.
    ctx.fillStyle = '#9aa6b5';
    ctx.fillRect(24, 34, 82, 30);
    ctx.strokeStyle = '#3a4356';
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 34, 82, 30);
    ctx.fillStyle = '#d7a441';
    ctx.fillRect(24, 46, 82, 5);
    ctx.fillStyle = '#c7cfd8';
    ctx.fillRect(30, 38, 10, 22);
    // Lens: the shot reads here.
    ctx.strokeStyle = '#9af6ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(65, 49, 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#e8fdff';
    ctx.beginPath();
    ctx.arc(65, 49, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // Pauldrons.
    ctx.fillStyle = '#8a6a1c';
    ctx.fillRect(12, 32, 14, 20);
    ctx.fillRect(104, 32, 14, 20);
    ctx.fillStyle = '#ffe14a';
    ctx.fillRect(12, 32, 14, 4);
    ctx.fillRect(104, 32, 14, 4);
    // Tassets and greaves.
    ctx.fillStyle = '#6d7888';
    ctx.beginPath();
    ctx.moveTo(24, 64);
    ctx.lineTo(106, 64);
    ctx.lineTo(98, 80);
    ctx.lineTo(32, 80);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3a2c08';
    ctx.fillRect(40, 80, 16, 8);
    ctx.fillRect(74, 80, 16, 8);
    ctx.fillStyle = '#ffe14a';
    ctx.fillRect(40, 80, 16, 3);
    ctx.fillRect(74, 80, 16, 3);
}

export function paintGatekeeper(ctx) {
    ctx.imageSmoothingEnabled = false;
    // Relay antennae.
    ctx.fillStyle = '#1c2f4d';
    ctx.fillRect(30, 0, 6, 20);
    ctx.fillRect(94, 0, 6, 20);
    ctx.fillStyle = '#ff4a3c';
    ctx.fillRect(30, 0, 6, 4);
    ctx.fillRect(94, 0, 6, 4);
    ctx.fillStyle = '#9cecff';
    ctx.fillRect(30, 8, 6, 3);
    ctx.fillRect(94, 8, 6, 3);
    // Hull dome.
    ctx.fillStyle = '#16263f';
    ctx.beginPath();
    ctx.arc(65, 52, 40, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(25, 52, 80, 14);
    ctx.strokeStyle = '#0d1626';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(65, 52, 40, Math.PI, 0);
    ctx.stroke();
    // Conduit seams.
    ctx.fillStyle = '#9cecff';
    ctx.fillRect(25, 56, 80, 3);
    ctx.fillRect(40, 20, 4, 32);
    ctx.fillRect(86, 20, 4, 32);
    // Lens: the shot reads here.
    ctx.strokeStyle = '#ff4a3c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(65, 44, 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd9d2';
    ctx.beginPath();
    ctx.arc(65, 44, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // Girder shoulders.
    ctx.fillStyle = '#1c2f4d';
    ctx.fillRect(8, 40, 16, 22);
    ctx.fillRect(106, 40, 16, 22);
    ctx.fillStyle = '#274b73';
    ctx.fillRect(8, 40, 16, 4);
    ctx.fillRect(106, 40, 16, 4);
    // Treads.
    ctx.fillStyle = '#080d18';
    ctx.fillRect(28, 66, 74, 12);
    ctx.fillStyle = '#274b73';
    for (let x = 32; x < 100; x += 12) {
        ctx.fillRect(x, 66, 5, 12);
    }
    ctx.fillStyle = '#ff4a3c';
    ctx.fillRect(28, 78, 74, 3);
}

export function paintCrimsonHeart(ctx) {
    ctx.imageSmoothingEnabled = false;
    // Artery stubs.
    ctx.fillStyle = '#5e0f1e';
    ctx.fillRect(38, 0, 10, 22);
    ctx.fillRect(56, 0, 10, 18);
    ctx.fillRect(74, 0, 10, 22);
    ctx.fillStyle = '#ff5a6a';
    ctx.fillRect(38, 0, 10, 4);
    ctx.fillRect(56, 0, 10, 4);
    ctx.fillRect(74, 0, 10, 4);
    // Twin lobes.
    ctx.fillStyle = '#5e0f1e';
    ctx.beginPath();
    ctx.ellipse(42, 40, 30, 26, -0.3, 0, Math.PI * 2);
    ctx.ellipse(78, 40, 30, 26, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c22040';
    ctx.beginPath();
    ctx.ellipse(42, 38, 24, 21, -0.3, 0, Math.PI * 2);
    ctx.ellipse(78, 38, 24, 21, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Veins.
    ctx.strokeStyle = '#7d1530';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(24 + i * 8, 26);
        ctx.quadraticCurveTo(30 + i * 8, 42, 26 + i * 8, 58);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(96 - i * 8, 26);
        ctx.quadraticCurveTo(90 - i * 8, 42, 94 - i * 8, 58);
        ctx.stroke();
    }
    // Lens: the shot reads here.
    ctx.strokeStyle = '#9af6ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(60, 42, 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#e8fdff';
    ctx.beginPath();
    ctx.arc(60, 42, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // Flesh skirt.
    ctx.fillStyle = '#5e0f1e';
    for (let x = 22; x < 98; x += 13) {
        ctx.fillRect(x, 62, 8, 12);
    }
    // Glow sacs.
    ctx.fillStyle = '#ff9ac2';
    for (const [sx, sy] of [
        [30, 50],
        [90, 50],
        [60, 24],
    ]) {
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

export function paintScrapjaw(ctx) {
    ctx.imageSmoothingEnabled = false;
    // Crane mast.
    ctx.fillStyle = '#4a2c18';
    ctx.fillRect(60, 0, 10, 26);
    ctx.fillStyle = '#7a4a24';
    ctx.fillRect(60, 0, 10, 4);
    ctx.fillRect(60, 12, 10, 3);
    // Jaw frame.
    ctx.fillStyle = '#3a2415';
    ctx.fillRect(18, 24, 94, 34);
    ctx.fillStyle = '#7a4a24';
    ctx.fillRect(18, 24, 94, 6);
    ctx.fillRect(18, 52, 94, 6);
    // Rivets.
    ctx.fillStyle = '#c98a4a';
    for (let x = 24; x < 110; x += 14) {
        ctx.fillRect(x, 27, 3, 3);
        ctx.fillRect(x, 52, 3, 3);
    }
    // Piston teeth.
    ctx.fillStyle = '#2a1a0e';
    for (let x = 26; x < 104; x += 13) {
        ctx.fillRect(x, 58, 7, 12);
    }
    ctx.fillStyle = '#c98a4a';
    for (let x = 26; x < 104; x += 13) {
        ctx.fillRect(x, 66, 7, 4);
    }
    // Lens: the shot reads here.
    ctx.strokeStyle = '#ff7a2a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(65, 41, 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffe8d2';
    ctx.beginPath();
    ctx.arc(65, 41, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // Hazard stripes.
    ctx.fillStyle = '#ffb42a';
    for (let x = 20; x < 110; x += 18) {
        ctx.fillRect(x, 72, 9, 4);
    }
    // Treads.
    ctx.fillStyle = '#1a120a';
    ctx.fillRect(24, 78, 82, 10);
    ctx.fillStyle = '#4a2c18';
    for (let x = 28; x < 102; x += 12) {
        ctx.fillRect(x, 78, 5, 10);
    }
}

export function paintEmbermaw(ctx) {
    ctx.imageSmoothingEnabled = false;
    // Furnace horns.
    ctx.fillStyle = '#2a1408';
    ctx.beginPath();
    ctx.moveTo(20, 30);
    ctx.lineTo(8, 6);
    ctx.lineTo(34, 22);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(110, 30);
    ctx.lineTo(122, 6);
    ctx.lineTo(96, 22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff6a2a';
    ctx.fillRect(8, 6, 6, 4);
    ctx.fillRect(116, 6, 6, 4);
    // Iron maw.
    ctx.fillStyle = '#241209';
    ctx.beginPath();
    ctx.ellipse(65, 50, 46, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a2408';
    ctx.beginPath();
    ctx.ellipse(65, 48, 38, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    // Molten core.
    ctx.fillStyle = '#ff6a2a';
    ctx.beginPath();
    ctx.ellipse(65, 52, 26, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd42a';
    ctx.beginPath();
    ctx.ellipse(65, 52, 16, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    // Flame teeth.
    ctx.fillStyle = '#ffe8d2';
    for (let x = 33; x < 97; x += 11) {
        ctx.beginPath();
        ctx.moveTo(x, 34);
        ctx.lineTo(x + 5, 24);
        ctx.lineTo(x + 10, 34);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, 66);
        ctx.lineTo(x + 5, 76);
        ctx.lineTo(x + 10, 66);
        ctx.closePath();
        ctx.fill();
    }
    // Lens: the shot reads here.
    ctx.strokeStyle = '#fff42a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(65, 52, 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fffbe8';
    ctx.beginPath();
    ctx.arc(65, 52, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // Ember feet.
    ctx.fillStyle = '#2a1408';
    ctx.fillRect(30, 76, 18, 12);
    ctx.fillRect(82, 76, 18, 12);
    ctx.fillStyle = '#ff6a2a';
    ctx.fillRect(30, 84, 18, 4);
    ctx.fillRect(82, 84, 18, 4);
}

export function paintHighroost(ctx) {
    ctx.imageSmoothingEnabled = false;
    // Tail cables fanning left and right.
    ctx.strokeStyle = '#2a3a55';
    ctx.lineWidth = 7;
    for (const [x0, x1] of [
        [30, 4],
        [34, 12],
        [100, 126],
        [96, 118],
    ]) {
        ctx.beginPath();
        ctx.moveTo(x0, 66);
        ctx.quadraticCurveTo((x0 + x1) / 2, 78, x1, 52);
        ctx.stroke();
    }
    ctx.strokeStyle = '#7df9ff';
    ctx.lineWidth = 2;
    for (const [x0, x1] of [
        [30, 4],
        [100, 126],
    ]) {
        ctx.beginPath();
        ctx.moveTo(x0, 66);
        ctx.quadraticCurveTo((x0 + x1) / 2, 78, x1, 52);
        ctx.stroke();
    }
    // Anchor-spur feet.
    ctx.fillStyle = '#39435a';
    ctx.fillRect(34, 72, 16, 14);
    ctx.fillRect(80, 72, 16, 14);
    ctx.fillStyle = '#7df9ff';
    ctx.beginPath();
    ctx.moveTo(34, 86);
    ctx.lineTo(42, 78);
    ctx.lineTo(50, 86);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(80, 86);
    ctx.lineTo(88, 78);
    ctx.lineTo(96, 86);
    ctx.closePath();
    ctx.fill();
    // Hen torso.
    ctx.fillStyle = '#1d2c4d';
    ctx.beginPath();
    ctx.ellipse(65, 52, 44, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a3a55';
    ctx.beginPath();
    ctx.ellipse(65, 50, 36, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    // Cable-plumage arcs.
    ctx.strokeStyle = '#7df9ff';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(65, 52, 30 - i * 8, 19 - i * 5, 0, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
    }
    // Comb crest.
    ctx.fillStyle = '#ff4a3c';
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(45 + i * 10, 22 - (i % 2) * 4, 7, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillRect(43, 24, 44, 8);
    // Beak under the lens.
    ctx.fillStyle = '#ffb15a';
    ctx.beginPath();
    ctx.moveTo(55, 62);
    ctx.lineTo(65, 74);
    ctx.lineTo(75, 62);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c77a2a';
    ctx.fillRect(55, 62, 20, 3);
    // Wing plates.
    ctx.fillStyle = '#141c30';
    ctx.beginPath();
    ctx.ellipse(30, 52, 10, 18, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(100, 52, 10, 18, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7df9ff';
    ctx.fillRect(24, 44, 4, 16);
    ctx.fillRect(102, 44, 4, 16);
    // Lens: the shot reads here.
    ctx.strokeStyle = '#7df9ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(65, 46, 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#e8fbff';
    ctx.beginPath();
    ctx.arc(65, 46, 4.5, 0, Math.PI * 2);
    ctx.fill();
}

export function paintTumbler(ctx) {
    ctx.imageSmoothingEnabled = false;
    // Lockplate feet.
    ctx.fillStyle = '#2c3a52';
    ctx.fillRect(32, 72, 18, 14);
    ctx.fillRect(80, 72, 18, 14);
    ctx.fillStyle = '#9cecff';
    ctx.fillRect(32, 82, 18, 4);
    ctx.fillRect(80, 82, 18, 4);
    // Iron tumbler body.
    ctx.fillStyle = '#1c2230';
    ctx.beginPath();
    ctx.ellipse(65, 52, 46, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c3a52';
    ctx.beginPath();
    ctx.ellipse(65, 50, 38, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    // Brass pin tumblers across the face.
    for (let i = 0; i < 5; i++) {
        const x = 35 + i * 15;
        ctx.fillStyle = '#8a99b5';
        ctx.fillRect(x, 30, 10, 22);
        ctx.fillStyle = '#ffb15a';
        ctx.fillRect(x + 2, 30 + (i % 3) * 4, 6, 8);
    }
    // Keyway seams.
    ctx.strokeStyle = '#9cecff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(27, 60);
    ctx.lineTo(103, 60);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(65, 60);
    ctx.lineTo(65, 72);
    ctx.stroke();
    // Shackle horns.
    ctx.strokeStyle = '#8a99b5';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(22, 44);
    ctx.quadraticCurveTo(10, 30, 22, 16);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(108, 44);
    ctx.quadraticCurveTo(120, 30, 108, 16);
    ctx.stroke();
    ctx.fillStyle = '#9cecff';
    ctx.fillRect(18, 12, 8, 6);
    ctx.fillRect(104, 12, 8, 6);
    // Vault seal plate below the lens.
    ctx.fillStyle = '#141c30';
    ctx.fillRect(53, 62, 24, 12);
    ctx.strokeStyle = '#ffb15a';
    ctx.lineWidth = 2;
    ctx.strokeRect(53, 62, 24, 12);
    // Lens: the shot reads here.
    ctx.strokeStyle = '#ff4a3c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(65, 46, 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffe8e8';
    ctx.beginPath();
    ctx.arc(65, 46, 4.5, 0, Math.PI * 2);
    ctx.fill();
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
    ['broodmother', 120, 84, paintBroodmother],
    ['hiveMother', 110, 80, paintHiveMother],
    ['wardenPrime', 130, 90, paintWardenPrime],
    ['gatekeeper', 130, 90, paintGatekeeper],
    ['crimsonHeart', 120, 84, paintCrimsonHeart],
    ['scrapjaw', 130, 90, paintScrapjaw],
    ['embermaw', 130, 90, paintEmbermaw],
    ['highroost', 130, 90, paintHighroost],
    ['tumbler', 130, 90, paintTumbler],
    ['sporeFloater', 48, 48, paintSporeFloater],
    ['hiveBrute', 56, 48, paintHiveBrute],
    ['gnawer', 40, 48, paintGnawer],
    ['spireWarden', 40, 56, paintSpireWarden],
    ['voltOrb', 48, 48, paintVoltOrb],
];
