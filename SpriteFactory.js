function paintBonkPad(ctx, cx, y) {
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

function paintBonkMarker(ctx) {
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

function paintBonkSign(ctx) {
    ctx.fillStyle = '#16343a';
    ctx.fillRect(29, 18, 6, 18);
    ctx.fillStyle = '#0c1c22';
    ctx.fillRect(6, 2, 52, 24);
    ctx.strokeStyle = '#67ffd2';
    ctx.lineWidth = 2;
    ctx.strokeRect(7, 3, 50, 22);
    ctx.fillStyle = '#ffe14a';
    ctx.beginPath();
    ctx.ellipse(32, 16, 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fffef2';
    ctx.beginPath();
    ctx.moveTo(25, 7);
    ctx.lineTo(32, 14);
    ctx.lineTo(39, 7);
    ctx.lineTo(35, 7);
    ctx.lineTo(32, 10);
    ctx.lineTo(29, 7);
    ctx.closePath();
    ctx.fill();
}

function paintLabDeck(ctx) {
    ctx.fillStyle = '#16343a';
    ctx.fillRect(0, 0, 96, 24);
    ctx.fillStyle = '#2f8f86';
    ctx.fillRect(0, 0, 96, 4);
    ctx.fillStyle = '#9ef6e2';
    ctx.fillRect(0, 4, 96, 2);
    for (let x = 0; x < 96; x += 12) {
        ctx.fillStyle = x % 24 === 0 ? '#67ffd2' : '#1a1c22';
        ctx.fillRect(x, 18, 12, 6);
    }
    ctx.fillStyle = '#d7fff4';
    ctx.fillRect(8, 9, 18, 5);
    ctx.fillRect(70, 9, 18, 5);
}

function paintMesa(ctx) {
    const rock = ctx.createLinearGradient(0, 0, 0, 32);
    rock.addColorStop(0, '#e7a36a');
    rock.addColorStop(0.45, '#c45a32');
    rock.addColorStop(1, '#6e2b22');
    ctx.fillStyle = rock;
    ctx.fillRect(0, 6, 96, 26);
    ctx.fillStyle = '#f0c39a';
    ctx.fillRect(0, 6, 96, 4);
    ctx.fillStyle = '#4a1c18';
    ctx.fillRect(18, 16, 22, 3);
    ctx.fillRect(58, 20, 26, 3);
    ctx.fillStyle = '#ffd7a8';
    ctx.fillRect(8, 12, 10, 2);
}

function paintLabTech(ctx) {
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

function paintSpecimen(ctx) {
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

function paintSentryOrb(ctx) {
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

function paintBeetle(ctx) {
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

function paintHopper(ctx) {
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

function paintCrusher(ctx) {
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

function paintSpecimenJar(ctx) {
    ctx.fillStyle = '#9fd7e8';
    ctx.fillRect(6, 8, 16, 32);
    ctx.fillStyle = '#39e07a';
    ctx.fillRect(8, 20, 12, 18);
    ctx.fillStyle = '#d8fff0';
    ctx.beginPath();
    ctx.arc(12, 26, 2, 0, Math.PI * 2);
    ctx.arc(17, 32, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#24515c';
    ctx.fillRect(4, 6, 20, 5);
    ctx.strokeStyle = '#e7fbff';
    ctx.strokeRect(6.5, 8.5, 15, 31);
}

function paintMarsSpike(ctx) {
    ctx.fillStyle = '#8a4630';
    ctx.fillRect(2, 16, 24, 8);
    ctx.fillStyle = '#ff5a3c';
    ctx.beginPath();
    ctx.moveTo(6, 16);
    ctx.lineTo(10, 2);
    ctx.lineTo(14, 16);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(14, 16);
    ctx.lineTo(20, 4);
    ctx.lineTo(24, 16);
    ctx.fill();
}

function paintAcidDrop(ctx) {
    ctx.fillStyle = '#7dff4a';
    ctx.beginPath();
    ctx.moveTo(9, 2);
    ctx.quadraticCurveTo(18, 14, 9, 26);
    ctx.quadraticCurveTo(0, 14, 9, 2);
    ctx.fill();
    ctx.fillStyle = '#eaffc4';
    ctx.fillRect(7, 12, 3, 6);
}

function paintDustDevil(ctx) {
    ctx.fillStyle = 'rgba(255, 156, 74, 0.18)';
    ctx.beginPath();
    ctx.ellipse(18, 50, 16, 46, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 214, 150, 0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(18, 24, 8, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(18, 48, 12, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(18, 74, 15, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
}

function paintBoulder(ctx) {
    ctx.fillStyle = '#a35332';
    ctx.beginPath();
    ctx.arc(20, 20, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e39a62';
    ctx.beginPath();
    ctx.arc(14, 14, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6a2e1c';
    ctx.beginPath();
    ctx.arc(24, 24, 4, 0, Math.PI * 2);
    ctx.fill();
}

function paintIssHull(ctx) {
    ctx.fillStyle = '#9aa6b5';
    ctx.fillRect(0, 4, 128, 20);
    ctx.fillStyle = '#f4f7fb';
    ctx.fillRect(0, 4, 128, 5);
    ctx.fillStyle = '#d7a441';
    ctx.fillRect(0, 9, 128, 2);
    ctx.fillStyle = '#6d7888';
    for (let x = 0; x < 128; x += 32) {
        ctx.fillRect(x, 4, 2, 20);
    }
    ctx.fillStyle = '#173e68';
    ctx.fillRect(10, 13, 16, 6);
    ctx.fillRect(54, 13, 16, 6);
    ctx.fillRect(98, 13, 16, 6);
    ctx.fillStyle = '#8fd4ff';
    ctx.fillRect(12, 14, 6, 3);
    ctx.fillRect(56, 14, 6, 3);
    ctx.fillRect(100, 14, 6, 3);
}

function paintColonyDeck(ctx) {
    ctx.fillStyle = '#232838';
    ctx.fillRect(0, 0, 96, 24);
    ctx.fillStyle = '#ff9a3c';
    ctx.fillRect(0, 0, 96, 4);
    ctx.fillStyle = '#ffe6b0';
    ctx.fillRect(0, 4, 96, 2);
    ctx.fillStyle = '#313a4e';
    ctx.fillRect(0, 6, 96, 2);
    for (let x = 8; x < 96; x += 32) {
        ctx.fillStyle = '#12161f';
        ctx.fillRect(x, 6, 2, 10);
    }
    ctx.fillStyle = '#8fd4ff';
    ctx.fillRect(8, 9, 18, 4);
    ctx.fillRect(70, 9, 18, 4);
    ctx.fillStyle = '#e8fbff';
    ctx.fillRect(8, 9, 18, 1);
    ctx.fillRect(70, 9, 18, 1);
    ctx.fillStyle = '#12161f';
    for (let x = 0; x < 96; x += 16) {
        ctx.fillRect(x, 16, 8, 8);
    }
    ctx.fillStyle = '#ffcf7a';
    for (let x = 2; x < 96; x += 16) {
        ctx.fillRect(x, 18, 4, 2);
    }
    ctx.fillStyle = '#aeb9c9';
    for (const x of [5, 47, 89]) {
        ctx.fillRect(x, 11, 2, 2);
    }
}

function paintBastionDeck(ctx) {
    ctx.fillStyle = '#2a3140';
    ctx.fillRect(0, 0, 96, 24);
    ctx.fillStyle = '#f4f7fb';
    ctx.fillRect(0, 0, 96, 3);
    ctx.fillStyle = '#9cecff';
    ctx.fillRect(0, 3, 96, 2);
    ctx.fillStyle = '#161b26';
    for (let x = 0; x < 96; x += 24) {
        ctx.fillRect(x, 5, 2, 19);
    }
    ctx.fillStyle = '#ff4a3c';
    for (let x = 10; x < 96; x += 32) {
        ctx.fillRect(x, 8, 4, 4);
    }
    ctx.fillStyle = '#ffd7a8';
    for (let x = 10; x < 96; x += 32) {
        ctx.fillRect(x + 1, 9, 2, 2);
    }
    ctx.fillStyle = '#0d1119';
    for (let x = 4; x < 96; x += 16) {
        ctx.fillRect(x, 16, 8, 8);
    }
    ctx.fillStyle = '#5a6a86';
    for (let x = 6; x < 96; x += 16) {
        ctx.fillRect(x, 17, 4, 2);
    }
    ctx.fillStyle = '#aeb9c9';
    for (const x of [5, 47, 89]) {
        ctx.fillRect(x, 11, 2, 2);
    }
}

function paintBastionPylon(ctx) {
    ctx.fillStyle = '#141a26';
    ctx.fillRect(6, 0, 8, 48);
    ctx.fillStyle = '#2a3140';
    ctx.fillRect(6, 0, 8, 4);
    ctx.fillRect(6, 44, 8, 4);
    ctx.fillStyle = 'rgba(156, 236, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(10, 16, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9cecff';
    ctx.fillRect(6, 12, 8, 8);
    ctx.fillStyle = '#f4ffff';
    ctx.fillRect(6, 12, 8, 2);
    ctx.fillStyle = '#ff4a3c';
    ctx.beginPath();
    ctx.arc(10, 32, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd7a8';
    ctx.beginPath();
    ctx.arc(10, 32, 1.5, 0, Math.PI * 2);
    ctx.fill();
}

function paintWombFlesh(ctx) {
    ctx.fillStyle = '#4a1420';
    ctx.fillRect(0, 0, 96, 24);
    ctx.fillStyle = '#f2d8c9';
    ctx.fillRect(0, 0, 96, 3);
    ctx.fillStyle = '#8e2f3f';
    ctx.fillRect(0, 3, 96, 2);
    ctx.fillStyle = '#33101a';
    for (let x = 6; x < 96; x += 24) {
        ctx.fillRect(x, 8, 10, 6);
    }
    ctx.fillStyle = '#ff5a8a';
    for (let x = 4; x < 96; x += 24) {
        ctx.fillRect(x, 10, 3, 3);
        ctx.fillRect(x + 14, 16, 3, 3);
    }
    ctx.fillStyle = '#ffc7da';
    for (let x = 4; x < 96; x += 24) {
        ctx.fillRect(x, 10, 3, 1);
    }
    ctx.fillStyle = '#1c060d';
    for (let x = 0; x < 96; x += 12) {
        ctx.fillRect(x + 4, 20, 4, 4);
    }
}

function paintColonyBeacon(ctx) {
    ctx.fillStyle = '#0e1420';
    ctx.fillRect(6, 38, 12, 6);
    ctx.fillStyle = '#1a2233';
    ctx.fillRect(10, 14, 4, 26);
    ctx.fillStyle = '#2c3a52';
    ctx.fillRect(10, 14, 4, 3);
    ctx.fillStyle = 'rgba(255, 90, 74, 0.25)';
    ctx.beginPath();
    ctx.arc(12, 8, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff5a4a';
    ctx.beginPath();
    ctx.arc(12, 8, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd7a8';
    ctx.beginPath();
    ctx.arc(12, 8, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff4e0';
    ctx.fillRect(11, 3, 2, 2);
}

function paintHiveChitin(ctx) {
    ctx.fillStyle = '#3d1c4e';
    ctx.fillRect(0, 0, 96, 24);
    ctx.fillStyle = '#67ffd2';
    ctx.fillRect(0, 0, 96, 4);
    ctx.fillStyle = '#d7fff4';
    ctx.fillRect(0, 4, 96, 2);
    ctx.fillStyle = '#2c1238';
    for (let x = 0; x < 96; x += 24) {
        ctx.fillRect(x, 6, 2, 18);
    }
    ctx.fillStyle = '#24122e';
    for (let x = 6; x < 96; x += 24) {
        ctx.beginPath();
        ctx.arc(x, 16, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = '#c78bff';
    ctx.fillRect(40, 10, 16, 4);
    ctx.fillStyle = '#8ef6ff';
    for (const x of [16, 64, 88]) {
        ctx.fillRect(x, 12, 3, 3);
    }
    ctx.fillStyle = '#e9d4ff';
    for (const x of [16, 64, 88]) {
        ctx.fillRect(x, 12, 3, 1);
    }
}

function paintBoarder(ctx) {
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

function paintSkitterling(ctx) {
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

function paintSporeFloater(ctx) {
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

function paintHiveBrute(ctx) {
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

function paintGnawer(ctx) {
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

function paintSpireWarden(ctx) {
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

function paintVoltOrb(ctx) {
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

function paintSpireAlloy(ctx) {
    ctx.fillStyle = '#9aa6b5';
    ctx.fillRect(0, 0, 128, 28);
    ctx.fillStyle = '#f4f7fb';
    ctx.fillRect(0, 0, 128, 5);
    ctx.fillStyle = '#d7a441';
    ctx.fillRect(0, 5, 128, 3);
    ctx.fillStyle = '#3a4356';
    for (let x = 12; x < 128; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 12);
        ctx.lineTo(x + 8, 18);
        ctx.lineTo(x, 24);
        ctx.closePath();
        ctx.fill();
    }
    ctx.fillStyle = '#6d7888';
    for (let x = 0; x < 128; x += 32) {
        ctx.fillRect(x, 5, 2, 23);
    }
    ctx.fillStyle = '#173e68';
    ctx.fillRect(10, 14, 16, 6);
    ctx.fillRect(102, 14, 16, 6);
    ctx.fillStyle = '#8fd4ff';
    ctx.fillRect(12, 15, 6, 3);
    ctx.fillRect(104, 15, 6, 3);
}

function paintSpacePhaser(ctx) {
    ctx.fillStyle = '#d7e2ee';
    ctx.fillRect(2, 4, 16, 5);
    ctx.fillStyle = '#8aa0b8';
    ctx.fillRect(2, 7, 16, 2);
    ctx.fillStyle = '#39f3ff';
    ctx.fillRect(16, 4, 6, 5);
    ctx.fillStyle = '#e8fdff';
    ctx.fillRect(20, 5, 3, 3);
}

function paintPhaserBolt(ctx) {
    ctx.fillStyle = '#7af6ff';
    ctx.fillRect(0, 2, 28, 4);
    ctx.fillStyle = '#f4ffff';
    ctx.fillRect(4, 3, 18, 2);
    ctx.fillStyle = '#d8fbff';
    ctx.beginPath();
    ctx.arc(26, 4, 3, 0, Math.PI * 2);
    ctx.fill();
}

function paintScatterGun(ctx) {
    ctx.fillStyle = '#d7e2ee';
    ctx.fillRect(2, 4, 16, 5);
    ctx.fillStyle = '#8aa0b8';
    ctx.fillRect(2, 7, 16, 2);
    ctx.fillStyle = '#ffb15a';
    ctx.fillRect(16, 2, 6, 3);
    ctx.fillRect(16, 4, 6, 5);
    ctx.fillRect(16, 9, 6, 3);
    ctx.fillStyle = '#fff4e0';
    ctx.fillRect(20, 5, 3, 3);
}

function paintScatterBolt(ctx) {
    ctx.fillStyle = '#ffc46a';
    ctx.fillRect(0, 2, 20, 3);
    ctx.fillStyle = '#fff8e8';
    ctx.fillRect(3, 2, 12, 1);
    ctx.fillStyle = '#ffe6b0';
    ctx.beginPath();
    ctx.arc(18, 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
}

function paintPiercerGun(ctx) {
    ctx.fillStyle = '#d7e2ee';
    ctx.fillRect(2, 4, 12, 5);
    ctx.fillStyle = '#8aa0b8';
    ctx.fillRect(2, 7, 12, 2);
    ctx.fillStyle = '#8ef6ff';
    ctx.fillRect(12, 5, 12, 3);
    ctx.fillStyle = '#e8fdff';
    ctx.fillRect(12, 5, 12, 1);
}

function paintPiercerBolt(ctx) {
    ctx.fillStyle = '#8ef6ff';
    ctx.fillRect(0, 2, 34, 2);
    ctx.fillStyle = '#f4ffff';
    ctx.fillRect(6, 2, 22, 1);
    ctx.fillStyle = '#d8fbff';
    ctx.beginPath();
    ctx.arc(32, 3, 2, 0, Math.PI * 2);
    ctx.fill();
}

function paintNovaGun(ctx) {
    ctx.fillStyle = '#d7e2ee';
    ctx.fillRect(2, 4, 14, 5);
    ctx.fillStyle = '#8aa0b8';
    ctx.fillRect(2, 7, 14, 2);
    ctx.fillStyle = '#d7a441';
    ctx.beginPath();
    ctx.arc(19, 6, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath();
    ctx.arc(19, 6, 2, 0, Math.PI * 2);
    ctx.fill();
}

function paintNovaOrb(ctx) {
    ctx.fillStyle = 'rgba(255, 209, 74, 0.35)';
    ctx.beginPath();
    ctx.arc(8, 8, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd74f';
    ctx.beginPath();
    ctx.arc(8, 8, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff9c8';
    ctx.beginPath();
    ctx.arc(8, 8, 3, 0, Math.PI * 2);
    ctx.fill();
}

function paintTempestGun(ctx) {
    ctx.fillStyle = '#d7e2ee';
    ctx.fillRect(2, 4, 12, 5);
    ctx.fillStyle = '#8aa0b8';
    ctx.fillRect(2, 7, 12, 2);
    ctx.fillStyle = '#c78bff';
    for (let y = 1; y <= 9; y += 2) {
        ctx.fillRect(14, y, 8, 1);
    }
    ctx.fillStyle = '#f4e8ff';
    ctx.fillRect(20, 3, 2, 6);
}

function paintTempestBolt(ctx) {
    ctx.fillStyle = '#c78bff';
    ctx.fillRect(0, 3, 22, 3);
    ctx.fillStyle = '#f4e8ff';
    ctx.fillRect(3, 3, 14, 1);
    ctx.fillStyle = '#fff8e8';
    ctx.beginPath();
    ctx.arc(20, 4, 2.5, 0, Math.PI * 2);
    ctx.fill();
}

function paintHailGun(ctx) {
    ctx.fillStyle = '#d7e2ee';
    ctx.fillRect(2, 4, 12, 5);
    ctx.fillStyle = '#8aa0b8';
    ctx.fillRect(2, 7, 12, 2);
    ctx.fillStyle = '#9cecff';
    ctx.fillRect(13, 5, 9, 3);
    ctx.fillStyle = '#f4ffff';
    ctx.fillRect(13, 5, 9, 1);
    ctx.fillRect(16, 2, 3, 8);
}

function paintHailBolt(ctx) {
    ctx.fillStyle = '#9cecff';
    ctx.fillRect(0, 2, 26, 3);
    ctx.fillStyle = '#f4ffff';
    ctx.fillRect(4, 2, 16, 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(22, 0, 4, 6);
    ctx.fillStyle = '#9cecff';
    ctx.fillRect(23, 1, 2, 4);
}

function paintHarborDeck(ctx) {
    ctx.fillStyle = '#6e3a22';
    ctx.fillRect(0, 0, 96, 24);
    ctx.fillStyle = '#e8d8b0';
    ctx.fillRect(0, 0, 96, 3);
    ctx.fillStyle = '#8a5a2a';
    ctx.fillRect(0, 3, 96, 2);
    ctx.fillStyle = '#4a2414';
    for (let x = 0; x < 96; x += 32) {
        ctx.fillRect(x, 5, 3, 19);
    }
    ctx.fillStyle = '#e8d8b0';
    for (let x = 8; x < 96; x += 32) {
        ctx.fillRect(x, 8, 2, 2);
        ctx.fillRect(x + 12, 8, 2, 2);
    }
    ctx.fillStyle = '#c9b48a';
    for (let x = 16; x < 96; x += 32) {
        ctx.fillRect(x, 16, 4, 3);
        ctx.fillRect(x + 6, 19, 3, 3);
    }
    ctx.fillStyle = '#2c1408';
    for (let x = 4; x < 96; x += 24) {
        ctx.fillRect(x, 21, 10, 3);
    }
}

function paintHarborLamp(ctx) {
    ctx.fillStyle = '#141c30';
    ctx.fillRect(6, 10, 4, 38);
    ctx.fillRect(2, 44, 12, 4);
    ctx.fillStyle = '#2c3a52';
    ctx.fillRect(6, 6, 10, 4);
    ctx.fillStyle = 'rgba(255, 154, 74, 0.25)';
    ctx.beginPath();
    ctx.arc(13, 18, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff9a4a';
    ctx.fillRect(10, 12, 6, 8);
    ctx.fillStyle = '#ffd7a8';
    ctx.fillRect(11, 13, 4, 3);
}

function paintRipperGun(ctx) {
    ctx.fillStyle = '#3a2c26';
    ctx.fillRect(2, 4, 12, 5);
    ctx.fillStyle = '#241a16';
    ctx.fillRect(2, 7, 12, 2);
    ctx.fillStyle = '#ff9a4a';
    for (let x = 13; x <= 21; x += 2) {
        ctx.fillRect(x, 5, 1, 3);
    }
    ctx.fillStyle = '#ffd7a8';
    ctx.fillRect(21, 3, 2, 6);
}

function paintRipperBolt(ctx) {
    ctx.fillStyle = '#ff9a4a';
    ctx.fillRect(0, 3, 24, 3);
    ctx.fillStyle = '#ffd7a8';
    for (let x = 2; x < 22; x += 4) {
        ctx.fillRect(x, 2, 2, 1);
        ctx.fillRect(x + 1, 6, 2, 1);
    }
    ctx.fillStyle = '#fff4e0';
    ctx.fillRect(20, 1, 4, 6);
}

function paintFoundryDeck(ctx) {
    ctx.fillStyle = '#3a2c26';
    ctx.fillRect(0, 0, 96, 24);
    ctx.fillStyle = '#ffd23c';
    ctx.fillRect(0, 0, 96, 3);
    ctx.fillStyle = '#ff6a2a';
    ctx.fillRect(0, 3, 96, 2);
    ctx.fillStyle = '#241512';
    for (let x = 0; x < 96; x += 24) {
        ctx.fillRect(x, 5, 2, 19);
    }
    ctx.fillStyle = '#ff6a2a';
    for (let x = 12; x < 96; x += 24) {
        ctx.fillRect(x, 9, 8, 2);
    }
    ctx.fillStyle = '#ffd23c';
    for (let x = 12; x < 96; x += 24) {
        ctx.fillRect(x + 2, 9, 4, 1);
    }
    ctx.fillStyle = '#140d0a';
    for (let x = 4; x < 96; x += 16) {
        ctx.fillRect(x, 16, 8, 8);
    }
    ctx.fillStyle = '#7d6a5a';
    for (let x = 6; x < 96; x += 16) {
        ctx.fillRect(x, 17, 3, 3);
    }
}

function paintFoundryVent(ctx) {
    ctx.fillStyle = '#241512';
    ctx.fillRect(8, 6, 16, 34);
    ctx.fillRect(4, 0, 24, 8);
    ctx.fillStyle = '#3a2c26';
    ctx.fillRect(8, 6, 16, 3);
    ctx.fillStyle = 'rgba(255, 106, 42, 0.3)';
    ctx.fillRect(11, 12, 10, 20);
    ctx.fillStyle = '#ff6a2a';
    ctx.fillRect(13, 14, 6, 16);
    ctx.fillStyle = '#ffd23c';
    ctx.fillRect(14, 16, 4, 10);
    ctx.fillStyle = '#140d0a';
    ctx.fillRect(8, 34, 16, 6);
}

function paintCometGun(ctx) {
    ctx.fillStyle = '#d7e2ee';
    ctx.fillRect(2, 4, 12, 5);
    ctx.fillStyle = '#8aa0b8';
    ctx.fillRect(2, 7, 12, 2);
    ctx.fillStyle = '#7df9ff';
    ctx.fillRect(13, 2, 3, 8);
    ctx.fillRect(16, 4, 6, 3);
    ctx.fillStyle = '#f4ffff';
    ctx.fillRect(16, 4, 6, 1);
    ctx.fillRect(13, 2, 3, 2);
}

function paintCometBolt(ctx) {
    ctx.fillStyle = '#7df9ff';
    ctx.fillRect(0, 3, 20, 3);
    ctx.fillStyle = '#f4ffff';
    ctx.fillRect(10, 3, 10, 1);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(17, 4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7df9ff';
    ctx.fillRect(0, 1, 6, 1);
    ctx.fillRect(0, 6, 6, 1);
}

function paintSkyhookDeck(ctx) {
    ctx.fillStyle = '#39435a';
    ctx.fillRect(0, 0, 96, 24);
    ctx.fillStyle = '#dfe7f5';
    ctx.fillRect(0, 0, 96, 3);
    ctx.fillStyle = '#7df9ff';
    ctx.fillRect(0, 3, 96, 2);
    ctx.fillStyle = '#141c30';
    for (let x = 0; x < 96; x += 24) {
        ctx.fillRect(x + 10, 5, 4, 19);
    }
    ctx.fillStyle = '#ffb15a';
    for (let x = 4; x < 96; x += 24) {
        ctx.fillRect(x, 18, 6, 3);
        ctx.fillRect(x + 3, 14, 6, 3);
    }
    ctx.fillStyle = '#141c30';
    for (let x = 0; x < 96; x += 48) {
        ctx.fillRect(x, 8, 6, 3);
    }
    ctx.fillStyle = '#7df9ff';
    for (let x = 20; x < 96; x += 48) {
        ctx.fillRect(x, 9, 4, 2);
    }
}

function paintTetherClamp(ctx) {
    ctx.fillStyle = 'rgba(125, 249, 255, 0.3)';
    ctx.fillRect(9, 0, 6, 40);
    ctx.fillStyle = '#7df9ff';
    ctx.fillRect(11, 0, 2, 40);
    ctx.fillStyle = '#39435a';
    ctx.fillRect(2, 8, 20, 8);
    ctx.fillRect(2, 26, 20, 8);
    ctx.fillStyle = '#141c30';
    ctx.fillRect(2, 12, 20, 2);
    ctx.fillRect(2, 30, 20, 2);
    ctx.fillStyle = '#ffb15a';
    ctx.fillRect(4, 9, 3, 6);
    ctx.fillRect(17, 27, 3, 6);
    ctx.fillStyle = '#141c30';
    ctx.fillRect(6, 36, 12, 4);
}

function paintHaloGun(ctx) {
    ctx.fillStyle = '#39435a';
    ctx.fillRect(2, 4, 12, 5);
    ctx.fillStyle = '#141c30';
    ctx.fillRect(2, 7, 12, 2);
    ctx.fillStyle = '#ffb15a';
    ctx.beginPath();
    ctx.arc(17, 6, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff4e0';
    ctx.beginPath();
    ctx.arc(17, 6, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffb15a';
    ctx.fillRect(20, 5, 3, 2);
}

function paintHaloOrb(ctx) {
    ctx.fillStyle = '#ffb15a';
    ctx.beginPath();
    ctx.arc(9, 9, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff4e0';
    ctx.beginPath();
    ctx.arc(9, 9, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(9, 9, 2, 0, Math.PI * 2);
    ctx.fill();
}

function paintColonyGirder(ctx) {
    ctx.fillStyle = '#1c2230';
    ctx.fillRect(0, 0, 96, 24);
    ctx.fillStyle = '#bcd2e8';
    ctx.fillRect(0, 0, 96, 3);
    ctx.fillStyle = '#5a6a86';
    ctx.fillRect(0, 3, 96, 2);
    ctx.fillStyle = '#ffb15a';
    for (let x = 4; x < 96; x += 24) {
        ctx.fillRect(x, 17, 8, 4);
        ctx.fillRect(x + 4, 12, 8, 4);
    }
    ctx.fillStyle = '#0d1017';
    for (let x = 0; x < 96; x += 32) {
        ctx.fillRect(x, 5, 3, 19);
    }
    ctx.fillStyle = '#8a99b5';
    for (let x = 8; x < 96; x += 32) {
        ctx.fillRect(x, 7, 3, 3);
    }
}

function paintHiveFang(ctx) {
    ctx.fillStyle = '#2c1238';
    ctx.fillRect(0, 0, 96, 24);
    ctx.fillStyle = '#f2e8d8';
    ctx.fillRect(0, 0, 96, 3);
    ctx.fillStyle = '#8e6a9e';
    ctx.fillRect(0, 3, 96, 2);
    ctx.fillStyle = '#f2e8d8';
    for (let x = 6; x < 96; x += 24) {
        ctx.fillRect(x, 5, 8, 4);
        ctx.fillRect(x + 2, 9, 4, 4);
    }
    ctx.fillStyle = '#5a2a6e';
    for (let x = 2; x < 96; x += 24) {
        ctx.fillRect(x, 15, 6, 5);
    }
    ctx.fillStyle = '#170a20';
    for (let x = 0; x < 96; x += 12) {
        ctx.fillRect(x + 5, 21, 3, 3);
    }
}

function paintHiveSac(ctx) {
    ctx.fillStyle = '#2c1238';
    ctx.fillRect(18, 0, 4, 14);
    ctx.fillStyle = '#5a2a6e';
    ctx.beginPath();
    ctx.arc(20, 30, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8e3a5e';
    ctx.beginPath();
    ctx.arc(20, 30, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#67ffd2';
    ctx.beginPath();
    ctx.arc(16, 26, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d7fff4';
    ctx.beginPath();
    ctx.arc(15, 25, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2e8d8';
    ctx.fillRect(12, 40, 3, 3);
    ctx.fillRect(26, 38, 3, 3);
}

function paintSpireGlass(ctx) {
    ctx.fillStyle = '#3a4356';
    ctx.fillRect(0, 0, 96, 24);
    ctx.fillStyle = '#d7a441';
    ctx.fillRect(0, 0, 96, 3);
    ctx.fillStyle = '#f4e8c8';
    ctx.fillRect(0, 0, 96, 1);
    ctx.fillStyle = '#bcd8e8';
    for (let x = 4; x < 96; x += 24) {
        ctx.fillRect(x, 7, 16, 10);
    }
    ctx.fillStyle = '#f4fbfd';
    for (let x = 4; x < 96; x += 24) {
        ctx.fillRect(x, 7, 16, 2);
    }
    ctx.fillStyle = '#d7a441';
    for (let x = 0; x < 96; x += 24) {
        ctx.fillRect(x, 5, 3, 19);
    }
    ctx.fillStyle = '#232838';
    for (let x = 8; x < 96; x += 24) {
        ctx.fillRect(x, 19, 8, 5);
    }
}

function paintSpireFin(ctx) {
    ctx.fillStyle = '#3a4356';
    ctx.fillRect(8, 40, 8, 16);
    ctx.fillRect(4, 52, 16, 4);
    ctx.fillStyle = '#d7a441';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(20, 44);
    ctx.lineTo(4, 44);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f4e8c8';
    ctx.fillRect(11, 6, 2, 32);
    ctx.fillStyle = '#ff4a3c';
    ctx.beginPath();
    ctx.arc(12, 4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd7a8';
    ctx.beginPath();
    ctx.arc(12, 4, 1.2, 0, Math.PI * 2);
    ctx.fill();
}

function paintBastionGrate(ctx) {
    ctx.fillStyle = '#0d1119';
    ctx.fillRect(0, 0, 96, 24);
    ctx.fillStyle = '#5a6a86';
    ctx.fillRect(0, 0, 96, 3);
    ctx.fillStyle = '#2a3140';
    ctx.fillRect(0, 3, 96, 2);
    ctx.fillStyle = '#161b26';
    for (let x = 4; x < 96; x += 12) {
        ctx.fillRect(x, 5, 6, 19);
    }
    ctx.fillStyle = '#ff4a3c';
    for (let x = 6; x < 96; x += 24) {
        ctx.fillRect(x, 8, 4, 4);
    }
    ctx.fillStyle = '#ffd7a8';
    for (let x = 6; x < 96; x += 24) {
        ctx.fillRect(x + 1, 9, 2, 2);
    }
    ctx.fillStyle = '#2a3140';
    for (let x = 0; x < 96; x += 48) {
        ctx.fillRect(x, 14, 10, 3);
    }
}

function paintWombBone(ctx) {
    ctx.fillStyle = '#33101a';
    ctx.fillRect(0, 0, 96, 24);
    ctx.fillStyle = '#f2d8c9';
    ctx.fillRect(0, 0, 96, 3);
    ctx.fillStyle = '#8e2f3f';
    ctx.fillRect(0, 3, 96, 2);
    ctx.fillStyle = '#f2d8c9';
    for (let x = 8; x < 96; x += 32) {
        ctx.fillRect(x, 7, 12, 3);
        ctx.fillRect(x + 3, 10, 6, 4);
    }
    ctx.fillStyle = '#ff5a8a';
    for (let x = 4; x < 96; x += 32) {
        ctx.fillRect(x, 16, 4, 4);
        ctx.fillRect(x + 20, 18, 4, 3);
    }
    ctx.fillStyle = '#1c060d';
    for (let x = 0; x < 96; x += 16) {
        ctx.fillRect(x + 6, 21, 4, 3);
    }
}

function paintWombEye(ctx) {
    ctx.fillStyle = '#4a1420';
    ctx.fillRect(15, 22, 6, 14);
    ctx.fillStyle = '#f2d8c9';
    ctx.beginPath();
    ctx.arc(18, 13, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff5a8a';
    ctx.beginPath();
    ctx.arc(18, 13, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c060d';
    ctx.beginPath();
    ctx.arc(18, 13, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(16, 11, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8e2f3f';
    ctx.fillRect(8, 24, 4, 4);
    ctx.fillRect(24, 26, 4, 4);
}

function paintHarborPlank(ctx) {
    ctx.fillStyle = '#2c2118';
    ctx.fillRect(0, 0, 96, 24);
    ctx.fillStyle = '#9e8f76';
    ctx.fillRect(0, 0, 96, 3);
    ctx.fillStyle = '#5a4c38';
    ctx.fillRect(0, 3, 96, 2);
    ctx.fillStyle = '#4a3d2c';
    for (let x = 0; x < 96; x += 24) {
        ctx.fillRect(x, 5, 2, 19);
    }
    ctx.fillStyle = '#c9b48a';
    for (let x = 10; x < 96; x += 24) {
        ctx.fillRect(x, 8, 4, 8);
    }
    ctx.fillStyle = '#6e5a3a';
    for (let x = 10; x < 96; x += 24) {
        ctx.fillRect(x, 10, 4, 1);
        ctx.fillRect(x, 13, 4, 1);
    }
    ctx.fillStyle = '#14100a';
    for (let x = 4; x < 96; x += 16) {
        ctx.fillRect(x, 20, 8, 4);
    }
}

function paintFoundryChain(ctx) {
    ctx.fillStyle = '#1c1412';
    ctx.fillRect(0, 0, 96, 24);
    ctx.fillStyle = '#7d6a5a';
    ctx.fillRect(0, 0, 96, 3);
    ctx.fillStyle = '#3a2c26';
    ctx.fillRect(0, 3, 96, 2);
    ctx.fillStyle = '#241512';
    for (let x = 6; x < 96; x += 24) {
        ctx.fillRect(x, 6, 12, 5);
        ctx.fillRect(x + 3, 11, 6, 4);
    }
    ctx.fillStyle = '#7dff9a';
    for (let x = 4; x < 96; x += 24) {
        ctx.fillRect(x, 17, 4, 4);
    }
    ctx.fillStyle = '#e8fff0';
    for (let x = 4; x < 96; x += 24) {
        ctx.fillRect(x + 1, 18, 2, 2);
    }
}

function paintSkyhookPanel(ctx) {
    ctx.fillStyle = '#141c30';
    ctx.fillRect(0, 0, 96, 24);
    ctx.fillStyle = '#5a6a86';
    ctx.fillRect(0, 0, 96, 3);
    ctx.fillStyle = '#2c3a52';
    ctx.fillRect(0, 3, 96, 2);
    ctx.fillStyle = '#0a0f1c';
    for (let x = 4; x < 96; x += 24) {
        ctx.fillRect(x, 7, 14, 8);
    }
    ctx.fillStyle = '#ff4a3c';
    for (let x = 8; x < 96; x += 24) {
        ctx.fillRect(x, 17, 4, 4);
    }
    ctx.fillStyle = '#ffd7a8';
    for (let x = 8; x < 96; x += 24) {
        ctx.fillRect(x + 1, 18, 2, 2);
    }
    ctx.fillStyle = '#39435a';
    for (let x = 0; x < 96; x += 48) {
        ctx.fillRect(x, 9, 3, 12);
    }
}

function paintRescueCage(ctx) {
    ctx.fillStyle = '#0d1119';
    ctx.fillRect(0, 0, 32, 48);
    ctx.fillStyle = '#f4f7fb';
    ctx.beginPath();
    ctx.arc(16, 28, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff9a3c';
    ctx.beginPath();
    ctx.moveTo(22, 26);
    ctx.lineTo(28, 29);
    ctx.lineTo(22, 32);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#14181f';
    ctx.beginPath();
    ctx.arc(14, 26, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff9a3c';
    ctx.fillRect(11, 36, 4, 3);
    ctx.fillRect(18, 36, 4, 3);
    ctx.fillStyle = '#5a6a86';
    for (let x = 3; x < 32; x += 7) {
        ctx.fillRect(x, 2, 3, 44);
    }
    ctx.fillStyle = '#39435a';
    ctx.fillRect(0, 0, 32, 4);
    ctx.fillRect(0, 44, 32, 4);
    ctx.fillRect(0, 0, 3, 48);
    ctx.fillRect(29, 0, 3, 48);
    ctx.fillStyle = '#ffd23c';
    ctx.fillRect(13, 20, 6, 8);
    ctx.fillStyle = '#14181f';
    ctx.fillRect(15, 22, 2, 4);
}

function paintRescueCageOpen(ctx) {
    ctx.fillStyle = '#0d1119';
    ctx.fillRect(0, 0, 32, 48);
    ctx.fillStyle = '#5a6a86';
    for (let x = 3; x < 14; x += 7) {
        ctx.fillRect(x, 2, 3, 44);
    }
    ctx.strokeStyle = '#5a6a86';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(16, 4);
    ctx.lineTo(28, 12);
    ctx.moveTo(16, 24);
    ctx.lineTo(28, 32);
    ctx.moveTo(16, 44);
    ctx.lineTo(28, 36);
    ctx.stroke();
    ctx.fillStyle = '#39435a';
    ctx.fillRect(0, 0, 32, 4);
    ctx.fillRect(0, 44, 32, 4);
    ctx.fillRect(0, 0, 3, 48);
    ctx.fillRect(29, 0, 3, 48);
    ctx.fillStyle = '#7dff9a';
    ctx.fillRect(19, 20, 5, 5);
    ctx.fillStyle = '#e8fff0';
    ctx.fillRect(20, 21, 2, 2);
}

function paintGunPod(ctx) {
    ctx.fillStyle = '#14181f';
    ctx.beginPath();
    ctx.arc(14, 14, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#39435a';
    ctx.beginPath();
    ctx.arc(14, 14, 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#0d1119';
    ctx.fillRect(7, 7, 14, 14);
    ctx.fillStyle = '#8a99b5';
    ctx.fillRect(4, 12, 3, 3);
    ctx.fillRect(21, 12, 3, 3);
    ctx.fillRect(12, 4, 3, 3);
    ctx.fillRect(12, 21, 3, 3);
    ctx.fillStyle = '#5a6a86';
    ctx.fillRect(2, 13, 4, 2);
    ctx.fillRect(22, 13, 4, 2);
}

function paintGunPodCore(ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(8, 8, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#dfe7f5';
    ctx.beginPath();
    ctx.arc(8, 8, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(6, 6, 2, 0, Math.PI * 2);
    ctx.fill();
}

function paintVaultDeck(ctx) {
    ctx.fillStyle = '#2c2118';
    ctx.fillRect(0, 0, 96, 24);
    ctx.fillStyle = '#e8d8b0';
    ctx.fillRect(0, 0, 96, 3);
    ctx.fillStyle = '#8a6a2a';
    ctx.fillRect(0, 3, 96, 2);
    ctx.fillStyle = '#1c140c';
    for (let x = 0; x < 96; x += 32) {
        ctx.fillRect(x, 5, 3, 19);
    }
    ctx.fillStyle = '#ffb15a';
    for (let x = 10; x < 96; x += 32) {
        ctx.fillRect(x, 9, 6, 6);
    }
    ctx.fillStyle = '#2c2118';
    for (let x = 10; x < 96; x += 32) {
        ctx.fillRect(x + 2, 11, 2, 2);
    }
    ctx.fillStyle = '#8a6a2a';
    for (let x = 4; x < 96; x += 16) {
        ctx.fillRect(x, 19, 5, 5);
    }
}

function paintVaultSeal(ctx) {
    ctx.fillStyle = '#2c2118';
    ctx.fillRect(8, 8, 8, 40);
    ctx.fillRect(4, 42, 16, 6);
    ctx.fillStyle = '#8a6a2a';
    ctx.fillRect(8, 8, 8, 3);
    ctx.fillRect(8, 36, 8, 3);
    ctx.fillStyle = 'rgba(255, 177, 90, 0.3)';
    ctx.beginPath();
    ctx.arc(12, 22, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffb15a';
    ctx.fillRect(8, 18, 8, 8);
    ctx.fillStyle = '#2c2118';
    ctx.fillRect(11, 19, 2, 6);
    ctx.fillRect(9, 21, 6, 2);
    ctx.fillStyle = '#fff4e0';
    ctx.fillRect(8, 18, 8, 2);
}

export class SpriteFactory {
    constructor(scene) {
        this.scene = scene;
    }

    addCanvasTexture(key, width, height, paint) {
        if (this.scene.textures.exists(key)) {
            return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        paint(canvas.getContext('2d'), width, height);
        this.scene.textures.addCanvas(key, canvas);
    }

    createChickenFrames() {
        if (this.scene.textures.exists('chicken1')) {
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
            this.addCanvasTexture(key, 32, 32, (ctx) => {
                drawChicken(ctx, wing, left, right, false);
            });
        });
        this.addCanvasTexture('chicken_idle', 32, 32, (ctx) => {
            drawChicken(ctx, 0, 11, 21, false);
        });
        // Bake the breath into the artwork so squash/stretch and collision bounds stay independent.
        this.addCanvasTexture('chicken_breathe', 32, 32, (ctx) => {
            ctx.translate(0, 31);
            ctx.scale(1, 1.025);
            ctx.translate(0, -31);
            drawChicken(ctx, 0, 11, 21, false);
        });
        this.addCanvasTexture('chicken_blink', 32, 32, (ctx) => {
            drawChicken(ctx, 0, 11, 21, false, true);
        });
        this.addCanvasTexture('chicken_jump', 32, 32, (ctx) => {
            drawChicken(ctx, 0, 0, 0, true);
        });
        this.addCanvasTexture('chicken_fall', 32, 32, (ctx) => {
            drawChicken(ctx, -Math.PI / 3, 0, 0, true);
        });
        this.addCanvasTexture('chicken_jetpack1', 32, 32, (ctx) => {
            drawChicken(ctx, 0, 0, 0, true);
            this.drawJetpack(ctx, 1);
        });
        this.addCanvasTexture('chicken_jetpack2', 32, 32, (ctx) => {
            drawChicken(ctx, 0, 0, 0, true);
            this.drawJetpack(ctx, 2);
        });
    }

    drawJetpack(ctx, frame) {
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

    createCrown() {
        if (!this.scene.textures.exists('crown')) {
            const crownCanvas = document.createElement('canvas');
            crownCanvas.width = 32;
            crownCanvas.height = 32;
            const ctx = crownCanvas.getContext('2d');
            const goldGradient = ctx.createLinearGradient(0, 8, 0, 28);
            goldGradient.addColorStop(0, '#fff3a6');
            goldGradient.addColorStop(0.35, '#ffd74f');
            goldGradient.addColorStop(0.7, '#e6a91c');
            goldGradient.addColorStop(1, '#9a5c00');
            const innerGold = ctx.createLinearGradient(0, 10, 0, 24);
            innerGold.addColorStop(0, '#fff9c8');
            innerGold.addColorStop(0.45, '#ffd85e');
            innerGold.addColorStop(1, '#c68108');

            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';

            ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
            ctx.beginPath();
            ctx.ellipse(16, 28, 9, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = goldGradient;
            ctx.strokeStyle = '#8a4f00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(5, 25);
            ctx.lineTo(7, 18);
            ctx.lineTo(10, 12);
            ctx.lineTo(13, 18);
            ctx.lineTo(16, 8);
            ctx.lineTo(19, 18);
            ctx.lineTo(22, 12);
            ctx.lineTo(25, 18);
            ctx.lineTo(27, 25);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#7f1533';
            ctx.fillRect(6, 20, 20, 6);
            ctx.fillStyle = '#5e0f26';
            ctx.fillRect(6, 24, 20, 2);
            ctx.strokeStyle = '#f6c94e';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(6, 20, 20, 6);
            ctx.strokeRect(7, 18, 18, 2);

            ctx.fillStyle = innerGold;
            ctx.beginPath();
            ctx.moveTo(8, 23);
            ctx.lineTo(10, 17);
            ctx.lineTo(12.6, 14.4);
            ctx.lineTo(15, 19);
            ctx.lineTo(16, 14.5);
            ctx.lineTo(17, 19);
            ctx.lineTo(19.4, 14.4);
            ctx.lineTo(22, 17);
            ctx.lineTo(24, 23);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#4c0013';
            ctx.fillRect(9, 21, 4, 3);
            ctx.fillRect(14, 20, 4, 4);
            ctx.fillRect(19, 21, 4, 3);

            ctx.fillStyle = '#e9415d';
            ctx.fillRect(9.5, 21.5, 3, 2);
            ctx.fillStyle = '#4cb5ff';
            ctx.fillRect(14.5, 20.5, 3, 3);
            ctx.fillStyle = '#3bdc8d';
            ctx.fillRect(19.5, 21.5, 3, 2);

            ctx.fillStyle = '#fff3b0';
            [10, 16, 22].forEach((x) => {
                ctx.beginPath();
                ctx.arc(x, x === 16 ? 10 : 14, 1.3, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(9, 18);
            ctx.lineTo(11, 14);
            ctx.moveTo(15.2, 15.2);
            ctx.lineTo(16, 11.2);
            ctx.moveTo(21, 18);
            ctx.lineTo(23, 14);
            ctx.stroke();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath();
            ctx.arc(16, 21, 0.8, 0, Math.PI * 2);
            ctx.fill();
            this.scene.textures.addCanvas('crown', crownCanvas);
        }
    }

    createCliff() {
        if (!this.scene.textures.exists('cliff')) {
            const cliffCanvas = document.createElement('canvas');
            cliffCanvas.width = 64;
            cliffCanvas.height = 64;
            const ctx = cliffCanvas.getContext('2d');
            const metal = ctx.createLinearGradient(0, 0, 0, 64);
            metal.addColorStop(0, '#94b8ce');
            metal.addColorStop(0.12, '#49627c');
            metal.addColorStop(0.4, '#293b54');
            metal.addColorStop(1, '#101b30');
            ctx.fillStyle = metal;
            ctx.fillRect(0, 0, 64, 64);
            ctx.strokeStyle = '#67879d';
            ctx.lineWidth = 2;
            ctx.strokeRect(1, 1, 62, 62);
            ctx.strokeStyle = '#142238';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(16, 0);
            ctx.lineTo(16, 64);
            ctx.moveTo(32, 0);
            ctx.lineTo(32, 64);
            ctx.moveTo(48, 0);
            ctx.lineTo(48, 64);
            ctx.stroke();
            ctx.fillStyle = '#bed8e5';
            ctx.fillRect(1, 1, 62, 2);
            ctx.fillStyle = '#69e5f4';
            ctx.fillRect(5, 5, 54, 2);
            ctx.fillStyle = '#0e1a2c';
            ctx.fillRect(5, 13, 54, 38);
            ctx.strokeStyle = '#415c76';
            ctx.strokeRect(5.5, 13.5, 53, 37);
            ctx.beginPath();
            ctx.moveTo(9, 17);
            ctx.lineTo(55, 47);
            ctx.moveTo(55, 17);
            ctx.lineTo(9, 47);
            ctx.stroke();
            ctx.fillStyle = '#304760';
            ctx.fillRect(24, 25, 16, 14);
            ctx.fillStyle = '#f6c16a';
            ctx.fillRect(28, 30, 8, 3);
            for (const x of [3, 61]) {
                for (const y of [10, 55]) {
                    ctx.fillStyle = '#a5bccb';
                    ctx.fillRect(x - 1, y, 2, 2);
                }
            }
            this.scene.textures.addCanvas('cliff', cliffCanvas);
        }
    }

    createRock() {
        if (!this.scene.textures.exists('rock')) {
            const rockCanvas = document.createElement('canvas');
            rockCanvas.width = 32;
            rockCanvas.height = 32;
            const ctx = rockCanvas.getContext('2d');
            const stone = ctx.createLinearGradient(5, 2, 27, 30);
            stone.addColorStop(0, '#9cb1c7');
            stone.addColorStop(0.5, '#526880');
            stone.addColorStop(1, '#26374f');
            ctx.fillStyle = stone;
            ctx.beginPath();
            ctx.moveTo(8, 2);
            ctx.lineTo(12, 4);
            ctx.lineTo(16, 2);
            ctx.lineTo(20, 6);
            ctx.lineTo(24, 8);
            ctx.lineTo(28, 16);
            ctx.lineTo(26, 20);
            ctx.lineTo(28, 24);
            ctx.lineTo(24, 28);
            ctx.lineTo(20, 30);
            ctx.lineTo(16, 28);
            ctx.lineTo(12, 26);
            ctx.lineTo(8, 28);
            ctx.lineTo(4, 24);
            ctx.lineTo(2, 16);
            ctx.lineTo(4, 12);
            ctx.lineTo(6, 6);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#1b293f';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#c6d4e0';
            ctx.beginPath();
            ctx.arc(10, 8, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#283c55';
            ctx.beginPath();
            ctx.arc(20, 24, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#445970';
            ctx.beginPath();
            ctx.arc(6, 20, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(22, 10, 2, 0, Math.PI * 2);
            ctx.fill();
            this.scene.textures.addCanvas('rock', rockCanvas);
        }
    }

    createBomb() {
        if (!this.scene.textures.exists('bomb')) {
            const bombCanvas = document.createElement('canvas');
            bombCanvas.width = 32;
            bombCanvas.height = 32;
            const ctx = bombCanvas.getContext('2d');
            const shell = ctx.createRadialGradient(10, 8, 1, 16, 16, 16);
            shell.addColorStop(0, '#ffb39e');
            shell.addColorStop(0.35, '#ef5d5b');
            shell.addColorStop(0.7, '#ad2746');
            shell.addColorStop(1, '#401e3a');
            ctx.fillStyle = shell;
            ctx.beginPath();
            ctx.arc(16, 16, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ff8e82';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.strokeStyle = '#61223d';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(16, 16, 11, 0.2, Math.PI * 1.2);
            ctx.stroke();
            ctx.fillStyle = '#281e35';
            ctx.beginPath();
            ctx.arc(16, 16, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffc298';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#ffcc73';
            ctx.beginPath();
            ctx.moveTo(16, 10);
            ctx.lineTo(22, 20);
            ctx.lineTo(10, 20);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#6b2637';
            ctx.fillRect(15, 13, 2, 4);
            ctx.fillRect(15, 18, 2, 1);
            ctx.fillStyle = '#fff0c9';
            for (const [x, y] of [
                [16, 3],
                [3, 16],
                [29, 16],
                [16, 29],
            ]) {
                ctx.fillRect(x - 1, y - 1, 2, 2);
            }
            this.scene.textures.addCanvas('bomb', bombCanvas);
        }
    }

    createStationPanel() {
        if (!this.scene.textures.exists('stationPanel')) {
            const stationPanelCanvas = document.createElement('canvas');
            stationPanelCanvas.width = 96;
            stationPanelCanvas.height = 24;
            const ctx = stationPanelCanvas.getContext('2d');
            const metal = ctx.createLinearGradient(0, 0, 0, 24);
            metal.addColorStop(0, '#99becd');
            metal.addColorStop(0.25, '#435c77');
            metal.addColorStop(1, '#152238');
            ctx.fillStyle = metal;
            ctx.fillRect(0, 0, 96, 24);
            ctx.fillStyle = '#aeeaf0';
            ctx.fillRect(2, 1, 92, 2);
            ctx.fillStyle = '#0e1a2b';
            ctx.fillRect(4, 8, 88, 10);
            ctx.strokeStyle = '#6c889f';
            ctx.lineWidth = 2;
            ctx.strokeRect(1, 1, 94, 22);
            ctx.fillStyle = '#6ad1ff';
            for (let i = 8; i < 96; i += 20) {
                ctx.fillStyle = '#286880';
                ctx.fillRect(i - 1, 10, 10, 6);
                ctx.fillStyle = '#83efff';
                ctx.fillRect(i, 11, 8, 2);
            }
            this.scene.textures.addCanvas('stationPanel', stationPanelCanvas);
        }
    }

    createLiftPlatform() {
        if (!this.scene.textures.exists('liftPlatform')) {
            const liftCanvas = document.createElement('canvas');
            liftCanvas.width = 96;
            liftCanvas.height = 24;
            const ctx = liftCanvas.getContext('2d');
            const metal = ctx.createLinearGradient(0, 0, 0, 24);
            metal.addColorStop(0, '#b6bbab');
            metal.addColorStop(0.3, '#4f6073');
            metal.addColorStop(1, '#18243b');
            ctx.fillStyle = metal;
            ctx.fillRect(0, 0, 96, 24);
            ctx.fillStyle = '#0d1a2e';
            ctx.fillRect(4, 8, 88, 8);
            ctx.fillStyle = '#ffaa00';
            for (let i = 0; i < 96; i += 12) {
                ctx.fillRect(i, 18, 8, 4);
            }
            ctx.fillStyle = '#ffe0a1';
            ctx.fillRect(1, 1, 94, 2);
            ctx.fillStyle = '#92d6e1';
            for (const x of [8, 84]) {
                ctx.fillRect(x, 10, 4, 3);
            }
            ctx.strokeStyle = '#536b7f';
            ctx.strokeRect(0.5, 0.5, 95, 23);
            this.scene.textures.addCanvas('liftPlatform', liftCanvas);
        }
    }

    createLaserBeam() {
        if (!this.scene.textures.exists('laserBeam')) {
            const laserCanvas = document.createElement('canvas');
            laserCanvas.width = 16;
            laserCanvas.height = 16;
            const ctx = laserCanvas.getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, 16, 0);
            gradient.addColorStop(0, 'rgba(255, 0, 120, 0)');
            gradient.addColorStop(0.5, 'rgba(255, 0, 120, 1)');
            gradient.addColorStop(1, 'rgba(255, 0, 120, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 4, 16, 8);
            this.scene.textures.addCanvas('laserBeam', laserCanvas);
        }

        if (!this.scene.textures.exists('laserBeamVertical')) {
            const laserCanvas = document.createElement('canvas');
            laserCanvas.width = 16;
            laserCanvas.height = 16;
            const ctx = laserCanvas.getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, 0, 16);
            gradient.addColorStop(0, 'rgba(255, 0, 120, 0)');
            gradient.addColorStop(0.5, 'rgba(255, 0, 120, 1)');
            gradient.addColorStop(1, 'rgba(255, 0, 120, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(4, 0, 8, 16);
            this.scene.textures.addCanvas('laserBeamVertical', laserCanvas);
        }
    }

    createLaserEmitter() {
        if (!this.scene.textures.exists('laserEmitter')) {
            const emitterCanvas = document.createElement('canvas');
            emitterCanvas.width = 24;
            emitterCanvas.height = 24;
            const ctx = emitterCanvas.getContext('2d');
            ctx.fillStyle = '#121722';
            ctx.fillRect(0, 0, 24, 24);
            ctx.fillStyle = '#2f3c4f';
            ctx.fillRect(2, 2, 20, 20);
            ctx.fillStyle = '#ff0066';
            ctx.fillRect(9, 4, 6, 16);
            ctx.fillStyle = '#ffaa00';
            ctx.fillRect(6, 9, 12, 6);
            this.scene.textures.addCanvas('laserEmitter', emitterCanvas);
        }
    }

    createDrone() {
        if (!this.scene.textures.exists('drone')) {
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
            this.scene.textures.addCanvas('drone', droneCanvas);
        }
    }

    createRover() {
        if (!this.scene.textures.exists('rover')) {
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

            this.scene.textures.addCanvas('rover', roverCanvas);
        }
    }

    createExpeditionSprites() {
        const sprites = [
            ['labDeck', 96, 24, paintLabDeck],
            ['mesa', 96, 32, paintMesa],
            ['bonkMarker', 26, 18, paintBonkMarker],
            ['bonkSign', 64, 36, paintBonkSign],
            ['labTech', 48, 64, paintLabTech],
            ['specimen', 48, 56, paintSpecimen],
            ['sentryOrb', 48, 52, paintSentryOrb],
            ['beetle', 56, 42, paintBeetle],
            ['hopper', 40, 62, paintHopper],
            ['crusher', 72, 30, paintCrusher],
            ['specimenJar', 28, 44, paintSpecimenJar],
            ['marsSpike', 28, 24, paintMarsSpike],
            ['acidDrop', 18, 28, paintAcidDrop],
            ['dustDevil', 36, 100, paintDustDevil],
            ['boulder', 40, 40, paintBoulder],
            ['issHull', 128, 28, paintIssHull],
            ['colonyDeck', 96, 24, paintColonyDeck],
            ['colonyBeacon', 24, 44, paintColonyBeacon],
            ['hiveChitin', 96, 24, paintHiveChitin],
            ['boarder', 40, 48, paintBoarder],
            ['skitterling', 40, 48, paintSkitterling],
            ['sporeFloater', 48, 48, paintSporeFloater],
            ['hiveBrute', 56, 48, paintHiveBrute],
            ['gnawer', 40, 48, paintGnawer],
            ['spireWarden', 40, 56, paintSpireWarden],
            ['voltOrb', 48, 48, paintVoltOrb],
            ['spireAlloy', 128, 28, paintSpireAlloy],
            ['spacePhaser', 24, 12, paintSpacePhaser],
            ['phaserBolt', 28, 8, paintPhaserBolt],
            ['scatterGun', 24, 12, paintScatterGun],
            ['scatterBolt', 20, 6, paintScatterBolt],
            ['piercerGun', 24, 12, paintPiercerGun],
            ['piercerBolt', 34, 4, paintPiercerBolt],
            ['novaGun', 24, 12, paintNovaGun],
            ['novaOrb', 16, 16, paintNovaOrb],
            ['bastionDeck', 96, 24, paintBastionDeck],
            ['bastionPylon', 20, 48, paintBastionPylon],
            ['wombFlesh', 96, 24, paintWombFlesh],
            ['tempestGun', 24, 12, paintTempestGun],
            ['tempestBolt', 22, 8, paintTempestBolt],
            ['hailGun', 24, 12, paintHailGun],
            ['hailBolt', 26, 6, paintHailBolt],
            ['harborDeck', 96, 24, paintHarborDeck],
            ['harborLamp', 16, 48, paintHarborLamp],
            ['ripperGun', 24, 12, paintRipperGun],
            ['ripperBolt', 24, 8, paintRipperBolt],
            ['foundryDeck', 96, 24, paintFoundryDeck],
            ['foundryVent', 32, 40, paintFoundryVent],
            ['cometGun', 24, 12, paintCometGun],
            ['cometBolt', 20, 8, paintCometBolt],
            ['skyhookDeck', 96, 24, paintSkyhookDeck],
            ['tetherClamp', 24, 40, paintTetherClamp],
            ['haloGun', 24, 12, paintHaloGun],
            ['haloOrb', 18, 18, paintHaloOrb],
            ['colonyGirder', 96, 24, paintColonyGirder],
            ['hiveFang', 96, 24, paintHiveFang],
            ['hiveSac', 40, 48, paintHiveSac],
            ['spireGlass', 96, 24, paintSpireGlass],
            ['spireFin', 24, 56, paintSpireFin],
            ['bastionGrate', 96, 24, paintBastionGrate],
            ['wombBone', 96, 24, paintWombBone],
            ['wombEye', 36, 36, paintWombEye],
            ['harborPlank', 96, 24, paintHarborPlank],
            ['foundryChain', 96, 24, paintFoundryChain],
            ['skyhookPanel', 96, 24, paintSkyhookPanel],
            ['rescueCage', 32, 48, paintRescueCage],
            ['rescueCageOpen', 32, 48, paintRescueCageOpen],
            ['gunPod', 28, 28, paintGunPod],
            ['gunPodCore', 16, 16, paintGunPodCore],
            ['vaultDeck', 96, 24, paintVaultDeck],
            ['vaultSeal', 24, 48, paintVaultSeal],
        ];
        sprites.forEach(([key, width, height, paint]) => {
            this.addCanvasTexture(key, width, height, paint);
        });
    }

    createParticleTextures() {
        if (!this.scene.textures.exists('particleSoft')) {
            const size = 16;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            const gradient = ctx.createRadialGradient(
                size * 0.5,
                size * 0.5,
                0,
                size * 0.5,
                size * 0.5,
                size * 0.5
            );
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(0.45, 'rgba(255, 255, 255, 0.55)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size, size);
            this.scene.textures.addCanvas('particleSoft', canvas);
        }

        if (!this.scene.textures.exists('particleSpark')) {
            const size = 12;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.translate(size * 0.5, size * 0.5);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-1, -size * 0.5, 2, size);
            ctx.fillRect(-size * 0.5, -1, size, 2);
            ctx.globalAlpha = 0.7;
            ctx.fillRect(-0.5, -size * 0.28, 1, size * 0.56);
            this.scene.textures.addCanvas('particleSpark', canvas);
        }
    }

    createVirtualButtons() {
        this.createLeftBtn();
        this.createRightBtn();
        this.createJumpBtn();
        this.createPhaserBtn();
        this.createWeaponBtn();
        this.createMusicToggleButtons();
    }

    drawCircularControl(ctx, size, fillStyle, strokeStyle) {
        const radius = size * 0.46;
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.arc(size * 0.5, size * 0.5, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = Math.max(3, size * 0.045);
        ctx.stroke();
        const sheen = ctx.createLinearGradient(0, size * 0.08, 0, size * 0.92);
        sheen.addColorStop(0, 'rgba(175, 222, 255, 0.22)');
        sheen.addColorStop(0.5, 'rgba(175, 222, 255, 0)');
        sheen.addColorStop(1, 'rgba(0, 6, 28, 0.24)');
        ctx.fillStyle = sheen;
        ctx.fill();
        ctx.strokeStyle = 'rgba(225, 246, 255, 0.16)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(size * 0.5, size * 0.5, radius - size * 0.07, 0, Math.PI * 2);
        ctx.stroke();
    }

    createPhaserBtn() {
        if (this.scene.textures.exists('phaserBtn')) {
            return;
        }
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        this.drawCircularControl(ctx, size, 'rgba(12, 48, 72, 0.86)', 'rgba(140, 245, 255, 0.95)');
        ctx.fillStyle = '#d7e6f2';
        ctx.fillRect(size * 0.24, size * 0.46, size * 0.28, size * 0.1);
        ctx.fillStyle = '#39f3ff';
        ctx.beginPath();
        ctx.moveTo(size * 0.48, size * 0.3);
        ctx.lineTo(size * 0.66, size * 0.48);
        ctx.lineTo(size * 0.5, size * 0.48);
        ctx.lineTo(size * 0.7, size * 0.72);
        ctx.lineTo(size * 0.52, size * 0.54);
        ctx.lineTo(size * 0.66, size * 0.54);
        ctx.closePath();
        ctx.fill();
        this.scene.textures.addCanvas('phaserBtn', canvas);
    }

    createWeaponBtn() {
        if (this.scene.textures.exists('weaponBtn')) {
            return;
        }
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        this.drawCircularControl(ctx, size, 'rgba(48, 40, 12, 0.86)', 'rgba(255, 214, 120, 0.95)');
        ctx.strokeStyle = '#ffe6b0';
        ctx.lineWidth = size * 0.05;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(size * 0.3, size * 0.32);
        ctx.lineTo(size * 0.52, size * 0.5);
        ctx.lineTo(size * 0.3, size * 0.68);
        ctx.moveTo(size * 0.56, size * 0.32);
        ctx.lineTo(size * 0.78, size * 0.5);
        ctx.lineTo(size * 0.56, size * 0.68);
        ctx.stroke();
        this.scene.textures.addCanvas('weaponBtn', canvas);
    }

    createLeftBtn() {
        if (!this.scene.textures.exists('leftBtn')) {
            const size = 128;
            const leftBtnCanvas = document.createElement('canvas');
            leftBtnCanvas.width = size;
            leftBtnCanvas.height = size;
            const ctx = leftBtnCanvas.getContext('2d');
            this.drawCircularControl(
                ctx,
                size,
                'rgba(28, 40, 72, 0.82)',
                'rgba(205, 230, 255, 0.9)'
            );
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(size * 0.62, size * 0.22);
            ctx.lineTo(size * 0.62, size * 0.78);
            ctx.lineTo(size * 0.28, size * 0.5);
            ctx.closePath();
            ctx.fill();
            this.scene.textures.addCanvas('leftBtn', leftBtnCanvas);
        }
    }

    createRightBtn() {
        if (!this.scene.textures.exists('rightBtn')) {
            const size = 128;
            const rightBtnCanvas = document.createElement('canvas');
            rightBtnCanvas.width = size;
            rightBtnCanvas.height = size;
            const ctx = rightBtnCanvas.getContext('2d');
            this.drawCircularControl(
                ctx,
                size,
                'rgba(28, 40, 72, 0.82)',
                'rgba(205, 230, 255, 0.9)'
            );
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(size * 0.38, size * 0.22);
            ctx.lineTo(size * 0.38, size * 0.78);
            ctx.lineTo(size * 0.72, size * 0.5);
            ctx.closePath();
            ctx.fill();
            this.scene.textures.addCanvas('rightBtn', rightBtnCanvas);
        }
    }

    createJumpBtn() {
        if (!this.scene.textures.exists('jumpBtn')) {
            const size = 128;
            const jumpBtnCanvas = document.createElement('canvas');
            jumpBtnCanvas.width = size;
            jumpBtnCanvas.height = size;
            const ctx = jumpBtnCanvas.getContext('2d');
            this.drawCircularControl(
                ctx,
                size,
                'rgba(16, 90, 42, 0.82)',
                'rgba(180, 255, 196, 0.9)'
            );
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(size * 0.5, size * 0.22);
            ctx.lineTo(size * 0.72, size * 0.52);
            ctx.lineTo(size * 0.58, size * 0.52);
            ctx.lineTo(size * 0.58, size * 0.74);
            ctx.lineTo(size * 0.42, size * 0.74);
            ctx.lineTo(size * 0.42, size * 0.52);
            ctx.lineTo(size * 0.28, size * 0.52);
            ctx.closePath();
            ctx.fill();
            this.scene.textures.addCanvas('jumpBtn', jumpBtnCanvas);
        }
    }

    createMusicToggleButtons() {
        if (!this.scene.textures.exists('musicToggleOn')) {
            const musicSize = 48;
            const musicOnCanvas = document.createElement('canvas');
            musicOnCanvas.width = musicSize;
            musicOnCanvas.height = musicSize;
            const ctx = musicOnCanvas.getContext('2d');
            ctx.clearRect(0, 0, musicSize, musicSize);
            ctx.fillStyle = 'rgba(40, 40, 60, 0.85)';
            ctx.fillRect(0, 0, musicSize, musicSize);
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(musicSize * 0.28, musicSize * 0.68);
            ctx.lineTo(musicSize * 0.28, musicSize * 0.32);
            ctx.lineTo(musicSize * 0.44, musicSize * 0.32);
            ctx.lineTo(musicSize * 0.6, musicSize * 0.18);
            ctx.lineTo(musicSize * 0.6, musicSize * 0.82);
            ctx.lineTo(musicSize * 0.44, musicSize * 0.68);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(musicSize * 0.6, musicSize * 0.5, musicSize * 0.16, -Math.PI / 3, Math.PI / 3);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(musicSize * 0.6, musicSize * 0.5, musicSize * 0.26, -Math.PI / 3, Math.PI / 3);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(musicSize * 0.6, musicSize * 0.5, musicSize * 0.36, -Math.PI / 3, Math.PI / 3);
            ctx.stroke();
            this.scene.textures.addCanvas('musicToggleOn', musicOnCanvas);
        }

        if (!this.scene.textures.exists('musicToggleOff')) {
            const musicSize = 48;
            const musicOffCanvas = document.createElement('canvas');
            musicOffCanvas.width = musicSize;
            musicOffCanvas.height = musicSize;
            const ctx = musicOffCanvas.getContext('2d');
            ctx.clearRect(0, 0, musicSize, musicSize);
            ctx.fillStyle = 'rgba(40, 40, 60, 0.85)';
            ctx.fillRect(0, 0, musicSize, musicSize);
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(musicSize * 0.28, musicSize * 0.68);
            ctx.lineTo(musicSize * 0.28, musicSize * 0.32);
            ctx.lineTo(musicSize * 0.44, musicSize * 0.32);
            ctx.lineTo(musicSize * 0.6, musicSize * 0.18);
            ctx.lineTo(musicSize * 0.6, musicSize * 0.48);
            ctx.lineTo(musicSize * 0.44, musicSize * 0.48);
            ctx.lineTo(musicSize * 0.44, musicSize * 0.32);
            ctx.lineTo(musicSize * 0.28, musicSize * 0.32);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#ff6666';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(musicSize * 0.62, musicSize * 0.32);
            ctx.lineTo(musicSize * 0.82, musicSize * 0.68);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(musicSize * 0.82, musicSize * 0.32);
            ctx.lineTo(musicSize * 0.62, musicSize * 0.68);
            ctx.stroke();
            this.scene.textures.addCanvas('musicToggleOff', musicOffCanvas);
        }
    }
}
