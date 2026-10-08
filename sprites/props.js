// Signs, beacons, cages, and decorative structures. Painted canvas textures for SpriteFactory.

export function paintBonkSign(ctx) {
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

export function paintSpecimenJar(ctx) {
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

export function paintBastionPylon(ctx) {
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

export function paintColonyBeacon(ctx) {
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

export function paintHarborLamp(ctx) {
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

export function paintFoundryVent(ctx) {
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

export function paintTetherClamp(ctx) {
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

export function paintHiveSac(ctx) {
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

export function paintSpireFin(ctx) {
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

export function paintWombEye(ctx) {
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

export function paintRescueCage(ctx) {
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

export function paintRescueCageOpen(ctx) {
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

export function paintVaultSeal(ctx) {
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

export function createCrown(factory) {
    if (!factory.scene.textures.exists('crown')) {
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
        factory.scene.textures.addCanvas('crown', crownCanvas);
    }
}

export const PROP_SPRITES = [
    ['bonkSign', 64, 36, paintBonkSign],
    ['specimenJar', 28, 44, paintSpecimenJar],
    ['colonyBeacon', 24, 44, paintColonyBeacon],
    ['bastionPylon', 20, 48, paintBastionPylon],
    ['harborLamp', 16, 48, paintHarborLamp],
    ['foundryVent', 32, 40, paintFoundryVent],
    ['tetherClamp', 24, 40, paintTetherClamp],
    ['hiveSac', 40, 48, paintHiveSac],
    ['spireFin', 24, 56, paintSpireFin],
    ['wombEye', 36, 36, paintWombEye],
    ['rescueCage', 32, 48, paintRescueCage],
    ['rescueCageOpen', 32, 48, paintRescueCageOpen],
    ['vaultSeal', 24, 48, paintVaultSeal],
];
