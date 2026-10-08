// Spikes, lasers, bombs, rocks, and terrain obstacles. Painted canvas textures for SpriteFactory.

export function paintMarsSpike(ctx) {
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

export function paintAcidDrop(ctx) {
    ctx.fillStyle = '#7dff4a';
    ctx.beginPath();
    ctx.moveTo(9, 2);
    ctx.quadraticCurveTo(18, 14, 9, 26);
    ctx.quadraticCurveTo(0, 14, 9, 2);
    ctx.fill();
    ctx.fillStyle = '#eaffc4';
    ctx.fillRect(7, 12, 3, 6);
}

export function paintDustDevil(ctx) {
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

export function paintBoulder(ctx) {
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

export function createCliff(factory) {
    if (!factory.scene.textures.exists('cliff')) {
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
        factory.scene.textures.addCanvas('cliff', cliffCanvas);
    }
}

export function createRock(factory) {
    if (!factory.scene.textures.exists('rock')) {
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
        factory.scene.textures.addCanvas('rock', rockCanvas);
    }
}

export function createBomb(factory) {
    if (!factory.scene.textures.exists('bomb')) {
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
        factory.scene.textures.addCanvas('bomb', bombCanvas);
    }
}

export function createLaserBeam(factory) {
    if (!factory.scene.textures.exists('laserBeam')) {
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
        factory.scene.textures.addCanvas('laserBeam', laserCanvas);
    }

    if (!factory.scene.textures.exists('laserBeamVertical')) {
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
        factory.scene.textures.addCanvas('laserBeamVertical', laserCanvas);
    }
}

export function createLaserEmitter(factory) {
    if (!factory.scene.textures.exists('laserEmitter')) {
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
        factory.scene.textures.addCanvas('laserEmitter', emitterCanvas);
    }
}

export const HAZARD_SPRITES = [
    ['marsSpike', 28, 24, paintMarsSpike],
    ['acidDrop', 18, 28, paintAcidDrop],
    ['dustDevil', 36, 100, paintDustDevil],
    ['boulder', 40, 40, paintBoulder],
];
