import { WEAPON_DEFS, POD_TINTS } from '../GameUtils.js';

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

// Collectibles use a square supply-pack silhouette, white corners and a plus
// tab. The actual gun, its name and firing diagram identify the reward even
// without color; hazard lenses deliberately never use this frame.
const POD_GUN_PAINT = {
    phaser: paintSpacePhaser,
    scatter: paintScatterGun,
    piercer: paintPiercerGun,
    nova: paintNovaGun,
    tempest: paintTempestGun,
    hail: paintHailGun,
    ripper: paintRipperGun,
    comet: paintCometGun,
    halo: paintHaloGun,
};

function paintShotDiagram(ctx, id) {
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (id === 'nova' || id === 'halo') {
        ctx.arc(43, 16, 6, 0, Math.PI * 2);
        if (id === 'nova') ctx.fill();
        else ctx.stroke();
        ctx.fillRect(42, 15, 2, 2);
    } else if (id === 'piercer') {
        ctx.moveTo(34, 16);
        ctx.lineTo(51, 16);
        ctx.moveTo(46, 11);
        ctx.lineTo(51, 16);
        ctx.lineTo(46, 21);
        ctx.stroke();
        ctx.fillRect(38, 11, 2, 10);
    } else if (id === 'ripper') {
        ctx.moveTo(34, 20);
        ctx.lineTo(38, 12);
        ctx.lineTo(41, 19);
        ctx.lineTo(45, 11);
        ctx.lineTo(49, 18);
        ctx.stroke();
    } else {
        const ways = id === 'tempest' || id === 'comet' ? 5 : id === 'phaser' ? 1 : 3;
        for (let i = 0; i < ways; i++) {
            const dy = (i - (ways - 1) / 2) * (ways === 5 ? 3 : 5);
            ctx.moveTo(34, 16);
            ctx.lineTo(49, 16 + dy);
            if (id === 'hail') {
                ctx.moveTo(45, 13 + dy);
                ctx.lineTo(45, 19 + dy);
            }
        }
        ctx.stroke();
        if (id === 'comet') {
            ctx.fillRect(32, 10, 5, 2);
            ctx.fillRect(31, 20, 5, 2);
        }
    }
}

export function paintGunPod(ctx, id = 'phaser') {
    const def = WEAPON_DEFS[id] || WEAPON_DEFS.phaser;
    const color = '#' + (POD_TINTS[def.id] ?? 0x7af6ff).toString(16).padStart(6, '0');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#07151e';
    ctx.fillRect(2, 4, 52, 34);
    ctx.fillStyle = color;
    ctx.fillRect(4, 6, 48, 20);
    ctx.fillStyle = '#112c38';
    ctx.fillRect(6, 8, 44, 16);
    ctx.fillStyle = '#f4ffff';
    for (const x of [0, 50]) {
        ctx.fillRect(x, 4, 6, 2);
        ctx.fillRect(x, 36, 6, 2);
        ctx.fillRect(x === 0 ? 0 : 54, 4, 2, 8);
        ctx.fillRect(x === 0 ? 0 : 54, 30, 2, 8);
    }
    ctx.fillStyle = '#8dffba';
    ctx.fillRect(23, 0, 10, 7);
    ctx.fillStyle = '#092719';
    ctx.fillRect(27, 1, 2, 5);
    ctx.fillRect(25, 3, 6, 1);
    ctx.save();
    ctx.translate(6, 10);
    POD_GUN_PAINT[def.id](ctx);
    ctx.restore();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    paintShotDiagram(ctx, def.id);
    ctx.fillStyle = '#f4ffff';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.name.toUpperCase(), 28, 31);
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
    ...Object.keys(WEAPON_DEFS).map((id) => [
        `weaponPod-${id}`,
        56,
        40,
        (ctx) => paintGunPod(ctx, id),
    ]),
];
