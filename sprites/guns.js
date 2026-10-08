// Gun pods and bolt projectiles for every weapon. Painted canvas textures for SpriteFactory.

export function paintSpacePhaser(ctx) {
    ctx.fillStyle = '#d7e2ee';
    ctx.fillRect(2, 4, 16, 5);
    ctx.fillStyle = '#8aa0b8';
    ctx.fillRect(2, 7, 16, 2);
    ctx.fillStyle = '#39f3ff';
    ctx.fillRect(16, 4, 6, 5);
    ctx.fillStyle = '#e8fdff';
    ctx.fillRect(20, 5, 3, 3);
}

export function paintPhaserBolt(ctx) {
    ctx.fillStyle = '#7af6ff';
    ctx.fillRect(0, 2, 28, 4);
    ctx.fillStyle = '#f4ffff';
    ctx.fillRect(4, 3, 18, 2);
    ctx.fillStyle = '#d8fbff';
    ctx.beginPath();
    ctx.arc(26, 4, 3, 0, Math.PI * 2);
    ctx.fill();
}

export function paintScatterGun(ctx) {
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

export function paintScatterBolt(ctx) {
    ctx.fillStyle = '#ffc46a';
    ctx.fillRect(0, 2, 20, 3);
    ctx.fillStyle = '#fff8e8';
    ctx.fillRect(3, 2, 12, 1);
    ctx.fillStyle = '#ffe6b0';
    ctx.beginPath();
    ctx.arc(18, 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
}

export function paintPiercerGun(ctx) {
    ctx.fillStyle = '#d7e2ee';
    ctx.fillRect(2, 4, 12, 5);
    ctx.fillStyle = '#8aa0b8';
    ctx.fillRect(2, 7, 12, 2);
    ctx.fillStyle = '#8ef6ff';
    ctx.fillRect(12, 5, 12, 3);
    ctx.fillStyle = '#e8fdff';
    ctx.fillRect(12, 5, 12, 1);
}

export function paintPiercerBolt(ctx) {
    ctx.fillStyle = '#8ef6ff';
    ctx.fillRect(0, 2, 34, 2);
    ctx.fillStyle = '#f4ffff';
    ctx.fillRect(6, 2, 22, 1);
    ctx.fillStyle = '#d8fbff';
    ctx.beginPath();
    ctx.arc(32, 3, 2, 0, Math.PI * 2);
    ctx.fill();
}

export function paintNovaGun(ctx) {
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

export function paintNovaOrb(ctx) {
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

export function paintTempestGun(ctx) {
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

export function paintTempestBolt(ctx) {
    ctx.fillStyle = '#c78bff';
    ctx.fillRect(0, 3, 22, 3);
    ctx.fillStyle = '#f4e8ff';
    ctx.fillRect(3, 3, 14, 1);
    ctx.fillStyle = '#fff8e8';
    ctx.beginPath();
    ctx.arc(20, 4, 2.5, 0, Math.PI * 2);
    ctx.fill();
}

export function paintHailGun(ctx) {
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

export function paintHailBolt(ctx) {
    ctx.fillStyle = '#9cecff';
    ctx.fillRect(0, 2, 26, 3);
    ctx.fillStyle = '#f4ffff';
    ctx.fillRect(4, 2, 16, 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(22, 0, 4, 6);
    ctx.fillStyle = '#9cecff';
    ctx.fillRect(23, 1, 2, 4);
}

export function paintRipperGun(ctx) {
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

export function paintRipperBolt(ctx) {
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

export function paintCometGun(ctx) {
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

export function paintCometBolt(ctx) {
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

export function paintHaloGun(ctx) {
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

export function paintHaloOrb(ctx) {
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

export function paintGunPod(ctx) {
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

export function paintGunPodCore(ctx) {
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

export const GUN_SPRITES = [
    ['spacePhaser', 24, 12, paintSpacePhaser],
    ['phaserBolt', 28, 8, paintPhaserBolt],
    ['scatterGun', 24, 12, paintScatterGun],
    ['scatterBolt', 20, 6, paintScatterBolt],
    ['piercerGun', 24, 12, paintPiercerGun],
    ['piercerBolt', 34, 4, paintPiercerBolt],
    ['novaGun', 24, 12, paintNovaGun],
    ['novaOrb', 16, 16, paintNovaOrb],
    ['tempestGun', 24, 12, paintTempestGun],
    ['tempestBolt', 22, 8, paintTempestBolt],
    ['hailGun', 24, 12, paintHailGun],
    ['hailBolt', 26, 6, paintHailBolt],
    ['ripperGun', 24, 12, paintRipperGun],
    ['ripperBolt', 24, 8, paintRipperBolt],
    ['cometGun', 24, 12, paintCometGun],
    ['cometBolt', 20, 8, paintCometBolt],
    ['haloGun', 24, 12, paintHaloGun],
    ['haloOrb', 18, 18, paintHaloOrb],
    ['gunPod', 28, 28, paintGunPod],
    ['gunPodCore', 16, 16, paintGunPodCore],
];
