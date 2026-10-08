// Walkable decks, platforms, and station structures. Painted canvas textures for SpriteFactory.

export function paintLabDeck(ctx) {
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

export function paintMesa(ctx) {
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

export function paintIssHull(ctx) {
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

export function paintColonyDeck(ctx) {
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

export function paintBastionDeck(ctx) {
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

export function paintWombFlesh(ctx) {
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

export function paintHiveChitin(ctx) {
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

export function paintSpireAlloy(ctx) {
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

export function paintHarborDeck(ctx) {
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

export function paintFoundryDeck(ctx) {
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

export function paintSkyhookDeck(ctx) {
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

export function paintColonyGirder(ctx) {
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

export function paintHiveFang(ctx) {
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

export function paintSpireGlass(ctx) {
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

export function paintBastionGrate(ctx) {
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

export function paintWombBone(ctx) {
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

export function paintHarborPlank(ctx) {
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

export function paintFoundryChain(ctx) {
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

export function paintSkyhookPanel(ctx) {
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

export function paintVaultDeck(ctx) {
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

export function createStationPanel(factory) {
    if (!factory.scene.textures.exists('stationPanel')) {
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
        factory.scene.textures.addCanvas('stationPanel', stationPanelCanvas);
    }
}

export function createLiftPlatform(factory) {
    if (!factory.scene.textures.exists('liftPlatform')) {
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
        factory.scene.textures.addCanvas('liftPlatform', liftCanvas);
    }
}

export const DECK_SPRITES = [
    ['labDeck', 96, 24, paintLabDeck],
    ['mesa', 96, 32, paintMesa],
    ['issHull', 128, 28, paintIssHull],
    ['colonyDeck', 96, 24, paintColonyDeck],
    ['hiveChitin', 96, 24, paintHiveChitin],
    ['spireAlloy', 128, 28, paintSpireAlloy],
    ['bastionDeck', 96, 24, paintBastionDeck],
    ['wombFlesh', 96, 24, paintWombFlesh],
    ['harborDeck', 96, 24, paintHarborDeck],
    ['foundryDeck', 96, 24, paintFoundryDeck],
    ['skyhookDeck', 96, 24, paintSkyhookDeck],
    ['colonyGirder', 96, 24, paintColonyGirder],
    ['hiveFang', 96, 24, paintHiveFang],
    ['spireGlass', 96, 24, paintSpireGlass],
    ['bastionGrate', 96, 24, paintBastionGrate],
    ['wombBone', 96, 24, paintWombBone],
    ['harborPlank', 96, 24, paintHarborPlank],
    ['foundryChain', 96, 24, paintFoundryChain],
    ['skyhookPanel', 96, 24, paintSkyhookPanel],
    ['vaultDeck', 96, 24, paintVaultDeck],
];
