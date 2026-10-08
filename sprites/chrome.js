// Touch buttons, toggles, and particle textures. Painted canvas textures for SpriteFactory.

export function createParticleTextures(factory) {
    if (!factory.scene.textures.exists('particleSoft')) {
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
        factory.scene.textures.addCanvas('particleSoft', canvas);
    }

    if (!factory.scene.textures.exists('particleSpark')) {
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
        factory.scene.textures.addCanvas('particleSpark', canvas);
    }
}

export function createVirtualButtons(factory) {
    createLeftBtn(factory);
    createRightBtn(factory);
    createJumpBtn(factory);
    createPhaserBtn(factory);
    createWeaponBtn(factory);
    createMusicToggleButtons(factory);
}

export function drawCircularControl(factory, ctx, size, fillStyle, strokeStyle) {
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

export function createPhaserBtn(factory) {
    if (factory.scene.textures.exists('phaserBtn')) {
        return;
    }
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    drawCircularControl(factory, ctx, size, 'rgba(12, 48, 72, 0.86)', 'rgba(140, 245, 255, 0.95)');
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
    factory.scene.textures.addCanvas('phaserBtn', canvas);
}

export function createWeaponBtn(factory) {
    if (factory.scene.textures.exists('weaponBtn')) {
        return;
    }
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    drawCircularControl(factory, ctx, size, 'rgba(48, 40, 12, 0.86)', 'rgba(255, 214, 120, 0.95)');
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
    factory.scene.textures.addCanvas('weaponBtn', canvas);
}

export function createLeftBtn(factory) {
    if (!factory.scene.textures.exists('leftBtn')) {
        const size = 128;
        const leftBtnCanvas = document.createElement('canvas');
        leftBtnCanvas.width = size;
        leftBtnCanvas.height = size;
        const ctx = leftBtnCanvas.getContext('2d');
        drawCircularControl(
            factory,
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
        factory.scene.textures.addCanvas('leftBtn', leftBtnCanvas);
    }
}

export function createRightBtn(factory) {
    if (!factory.scene.textures.exists('rightBtn')) {
        const size = 128;
        const rightBtnCanvas = document.createElement('canvas');
        rightBtnCanvas.width = size;
        rightBtnCanvas.height = size;
        const ctx = rightBtnCanvas.getContext('2d');
        drawCircularControl(
            factory,
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
        factory.scene.textures.addCanvas('rightBtn', rightBtnCanvas);
    }
}

export function createJumpBtn(factory) {
    if (!factory.scene.textures.exists('jumpBtn')) {
        const size = 128;
        const jumpBtnCanvas = document.createElement('canvas');
        jumpBtnCanvas.width = size;
        jumpBtnCanvas.height = size;
        const ctx = jumpBtnCanvas.getContext('2d');
        drawCircularControl(
            factory,
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
        factory.scene.textures.addCanvas('jumpBtn', jumpBtnCanvas);
    }
}

export function createMusicToggleButtons(factory) {
    if (!factory.scene.textures.exists('musicToggleOn')) {
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
        factory.scene.textures.addCanvas('musicToggleOn', musicOnCanvas);
    }

    if (!factory.scene.textures.exists('musicToggleOff')) {
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
        factory.scene.textures.addCanvas('musicToggleOff', musicOffCanvas);
    }
}
