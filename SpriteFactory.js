export class SpriteFactory {
    constructor(scene) {
        this.scene = scene;
        this.backgroundLayouts = new Map();
    }

    // Create chicken animation frames
    createChickenFrames() {
        if (this.scene.textures.exists('chicken1')) {
            return;
        }

        // Function to draw a chicken frame
        function drawChicken(ctx, wingAngle, legLeftX, legRightX, legBend) {
            // Body (ellipse)
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.ellipse(16, 24, 8, 6, 0, 0, Math.PI * 2);
            ctx.fill();

            // Head (circle)
            ctx.beginPath();
            ctx.arc(16, 16, 6, 0, Math.PI * 2);
            ctx.fill();

            // Beak (triangle)
            ctx.fillStyle = '#ffa500';
            ctx.beginPath();
            ctx.moveTo(22, 18);
            ctx.lineTo(24, 16);
            ctx.lineTo(22, 20);
            ctx.closePath();
            ctx.fill();

            // Eye (black dot)
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(18, 14, 1, 0, Math.PI * 2);
            ctx.fill();

            // Legs
            ctx.strokeStyle = '#ffa500';
            ctx.lineWidth = 2;
            ctx.beginPath();
            if (legBend) {
                // Bent legs for jump
                ctx.moveTo(12, 28);
                ctx.lineTo(12 - 2, 30);
                ctx.lineTo(10, 32);
                ctx.moveTo(20, 28);
                ctx.lineTo(20 + 2, 30);
                ctx.lineTo(22, 32);
            } else {
                // Walking legs
                ctx.moveTo(12, 28);
                ctx.lineTo(legLeftX, 32);
                ctx.moveTo(20, 28);
                ctx.lineTo(legRightX, 32);
            }
            ctx.stroke();

            // Wings (triangles, rotated for animation)
            ctx.fillStyle = '#ffff99';
            ctx.save();
            ctx.translate(16, 24);
            ctx.rotate(wingAngle);
            ctx.beginPath();
            ctx.moveTo(-6, -2);
            ctx.lineTo(-2, -2);
            ctx.lineTo(-4, 2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // Walking frames: alternate leg positions for walking motion
        // Frame 1: wings up, left leg back, right leg forward
        let chicken1 = document.createElement('canvas');
        chicken1.width = 32;
        chicken1.height = 32;
        let ctx1 = chicken1.getContext('2d');
        drawChicken(ctx1, Math.PI / 6, 10, 22, false);
        this.scene.textures.addCanvas('chicken1', chicken1);

        // Frame 2: wings down, legs switch
        let chicken2 = document.createElement('canvas');
        chicken2.width = 32;
        chicken2.height = 32;
        let ctx2 = chicken2.getContext('2d');
        drawChicken(ctx2, -Math.PI / 6, 14, 18, false);
        this.scene.textures.addCanvas('chicken2', chicken2);

        // Frame 3: wings up, right leg back, left leg forward
        let chicken3 = document.createElement('canvas');
        chicken3.width = 32;
        chicken3.height = 32;
        let ctx3 = chicken3.getContext('2d');
        drawChicken(ctx3, Math.PI / 6, 10, 22, false);
        this.scene.textures.addCanvas('chicken3', chicken3);

        // Frame 4: wings down, legs switch back
        let chicken4 = document.createElement('canvas');
        chicken4.width = 32;
        chicken4.height = 32;
        let ctx4 = chicken4.getContext('2d');
        drawChicken(ctx4, -Math.PI / 6, 14, 18, false);
        this.scene.textures.addCanvas('chicken4', chicken4);

        // Jump frame: wings neutral, legs bent
        let chicken_jump = document.createElement('canvas');
        chicken_jump.width = 32;
        chicken_jump.height = 32;
        let ctx_jump = chicken_jump.getContext('2d');
        drawChicken(ctx_jump, 0, 0, 0, true);
        this.scene.textures.addCanvas('chicken_jump', chicken_jump);

        // Jetpack frame 1: compact exhaust
        let chicken_jetpack1 = document.createElement('canvas');
        chicken_jetpack1.width = 32;
        chicken_jetpack1.height = 32;
        let ctx_jetpack1 = chicken_jetpack1.getContext('2d');
        drawChicken(ctx_jetpack1, 0, 0, 0, true);
        this.drawJetpack(ctx_jetpack1, 1);
        this.scene.textures.addCanvas('chicken_jetpack1', chicken_jetpack1);

        // Jetpack frame 2: stretched exhaust
        let chicken_jetpack2 = document.createElement('canvas');
        chicken_jetpack2.width = 32;
        chicken_jetpack2.height = 32;
        let ctx_jetpack2 = chicken_jetpack2.getContext('2d');
        drawChicken(ctx_jetpack2, 0, 0, 0, true);
        this.drawJetpack(ctx_jetpack2, 2);
        this.scene.textures.addCanvas('chicken_jetpack2', chicken_jetpack2);
    }

    drawJetpack(ctx, frame) {
        ctx.fillStyle = '#555555';
        ctx.fillRect(8, 16, 4, 10);
        ctx.fillRect(20, 16, 4, 10);
        ctx.fillStyle = '#999999';
        ctx.fillRect(12, 16, 8, 8);
        ctx.fillStyle = '#ffcc00';
        if (frame === 1) {
            // Compact exhaust
            ctx.beginPath();
            ctx.moveTo(10, 26);
            ctx.lineTo(12, 32);
            ctx.lineTo(14, 26);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(18, 26);
            ctx.lineTo(20, 32);
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
            // Stretched exhaust
            ctx.beginPath();
            ctx.moveTo(10, 26);
            ctx.lineTo(12, 34);
            ctx.lineTo(14, 26);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(18, 26);
            ctx.lineTo(20, 34);
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
            let crownCanvas = document.createElement('canvas');
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

            // Ground shadow so the transparent sprite still has depth.
            ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
            ctx.beginPath();
            ctx.ellipse(16, 28, 9, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Main silhouette.
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

            // Velvet band and lower trim.
            ctx.fillStyle = '#7f1533';
            ctx.fillRect(6, 20, 20, 6);
            ctx.fillStyle = '#5e0f26';
            ctx.fillRect(6, 24, 20, 2);
            ctx.strokeStyle = '#f6c94e';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(6, 20, 20, 6);
            ctx.strokeRect(7, 18, 18, 2);

            // Inner gold bevel to stop it reading as a flat icon.
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

            // Gem settings.
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

            // Top jewels / pearls.
            ctx.fillStyle = '#fff3b0';
            [10, 16, 22].forEach((x) => {
                ctx.beginPath();
                ctx.arc(x, x === 16 ? 10 : 14, 1.3, 0, Math.PI * 2);
                ctx.fill();
            });

            // Specular highlights.
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

            // Tiny spark on the center jewel.
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath();
            ctx.arc(16, 21, 0.8, 0, Math.PI * 2);
            ctx.fill();
            this.scene.textures.addCanvas('crown', crownCanvas);
        }
    }

    createCliff() {
        if (!this.scene.textures.exists('cliff')) {
            let cliffCanvas = document.createElement('canvas');
            cliffCanvas.width = 64;
            cliffCanvas.height = 64;
            const ctx = cliffCanvas.getContext('2d');
            // Space platform: metallic gray with light border
            ctx.fillStyle = '#555555';
            ctx.fillRect(0, 0, 64, 64);
            // Add a light outline for metallic effect
            ctx.strokeStyle = '#aaaaaa';
            ctx.lineWidth = 2;
            ctx.strokeRect(1, 1, 62, 62);
            // Add some panel lines
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(16, 0);
            ctx.lineTo(16, 64);
            ctx.moveTo(32, 0);
            ctx.lineTo(32, 64);
            ctx.moveTo(48, 0);
            ctx.lineTo(48, 64);
            ctx.stroke();
            this.scene.textures.addCanvas('cliff', cliffCanvas);
        }
    }

    createRock() {
        if (!this.scene.textures.exists('rock')) {
            let rockCanvas = document.createElement('canvas');
            rockCanvas.width = 32;
            rockCanvas.height = 32;
            const ctx = rockCanvas.getContext('2d');
            ctx.fillStyle = '#404040';
            ctx.fillRect(0, 0, 32, 32);
            // Draw irregular rock shape
            ctx.fillStyle = '#808080';
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
            // Add shadows/highlights for 3D effect
            ctx.fillStyle = '#cccccc';
            ctx.beginPath();
            ctx.arc(10, 8, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#444444';
            ctx.beginPath();
            ctx.arc(20, 24, 4, 0, Math.PI * 2);
            ctx.fill();
            // Add small craters
            ctx.fillStyle = '#666666';
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
            let bombCanvas = document.createElement('canvas');
            bombCanvas.width = 32;
            bombCanvas.height = 32;
            const ctx = bombCanvas.getContext('2d');
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(16, 16, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(16, 16, 8, 0, Math.PI * 2);
            ctx.fill();
            this.scene.textures.addCanvas('bomb', bombCanvas);
        }
    }

    createStationPanel() {
        if (!this.scene.textures.exists('stationPanel')) {
            let stationPanelCanvas = document.createElement('canvas');
            stationPanelCanvas.width = 96;
            stationPanelCanvas.height = 24;
            const ctx = stationPanelCanvas.getContext('2d');
            ctx.fillStyle = '#2a2f3b';
            ctx.fillRect(0, 0, 96, 24);
            ctx.fillStyle = '#3c455a';
            ctx.fillRect(0, 0, 96, 6);
            ctx.fillRect(0, 18, 96, 6);
            ctx.strokeStyle = '#55617d';
            ctx.lineWidth = 2;
            ctx.strokeRect(1, 1, 94, 22);
            ctx.fillStyle = '#6ad1ff';
            for (let i = 8; i < 96; i += 20) {
                ctx.fillRect(i, 10, 8, 4);
            }
            this.scene.textures.addCanvas('stationPanel', stationPanelCanvas);
        }
    }

    createLiftPlatform() {
        if (!this.scene.textures.exists('liftPlatform')) {
            let liftCanvas = document.createElement('canvas');
            liftCanvas.width = 96;
            liftCanvas.height = 24;
            const ctx = liftCanvas.getContext('2d');
            ctx.fillStyle = '#1f2a38';
            ctx.fillRect(0, 0, 96, 24);
            ctx.fillStyle = '#ffaa00';
            for (let i = 0; i < 96; i += 12) {
                ctx.fillRect(i, 18, 8, 4);
            }
            ctx.fillStyle = '#55617d';
            ctx.fillRect(0, 0, 96, 6);
            this.scene.textures.addCanvas('liftPlatform', liftCanvas);
        }
    }

    createLaserBeam() {
        if (!this.scene.textures.exists('laserBeam')) {
            let laserCanvas = document.createElement('canvas');
            laserCanvas.width = 16;
            laserCanvas.height = 16;
            const ctx = laserCanvas.getContext('2d');
            let gradient = ctx.createLinearGradient(0, 0, 16, 0);
            gradient.addColorStop(0, 'rgba(255, 0, 120, 0)');
            gradient.addColorStop(0.5, 'rgba(255, 0, 120, 1)');
            gradient.addColorStop(1, 'rgba(255, 0, 120, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 4, 16, 8);
            this.scene.textures.addCanvas('laserBeam', laserCanvas);
        }
    }

    createLaserEmitter() {
        if (!this.scene.textures.exists('laserEmitter')) {
            let emitterCanvas = document.createElement('canvas');
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
            let droneCanvas = document.createElement('canvas');
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

    createVirtualButtons() {
        this.createLeftBtn();
        this.createRightBtn();
        this.createJumpBtn();
        this.createMusicToggleButtons();
    }

    createLeftBtn() {
        if (!this.scene.textures.exists('leftBtn')) {
            let leftBtnCanvas = document.createElement('canvas');
            leftBtnCanvas.width = 64;
            leftBtnCanvas.height = 64;
            const ctx = leftBtnCanvas.getContext('2d');
            // Semi-transparent background
            ctx.fillStyle = 'rgba(128, 128, 128, 0.7)';
            ctx.fillRect(0, 0, 64, 64);
            // Arrow
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(64 * 0.6, 64 * 0.2);
            ctx.lineTo(64 * 0.6, 64 * 0.8);
            ctx.lineTo(64 * 0.2, 64 * 0.5);
            ctx.closePath();
            ctx.fill();
            this.scene.textures.addCanvas('leftBtn', leftBtnCanvas);
        }
    }

    createRightBtn() {
        if (!this.scene.textures.exists('rightBtn')) {
            let rightBtnCanvas = document.createElement('canvas');
            rightBtnCanvas.width = 64;
            rightBtnCanvas.height = 64;
            const ctx = rightBtnCanvas.getContext('2d');
            ctx.fillStyle = 'rgba(128, 128, 128, 0.7)';
            ctx.fillRect(0, 0, 64, 64);
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(64 * 0.4, 64 * 0.2);
            ctx.lineTo(64 * 0.4, 64 * 0.8);
            ctx.lineTo(64 * 0.8, 64 * 0.5);
            ctx.closePath();
            ctx.fill();
            this.scene.textures.addCanvas('rightBtn', rightBtnCanvas);
        }
    }

    createJumpBtn() {
        if (!this.scene.textures.exists('jumpBtn')) {
            let jumpBtnCanvas = document.createElement('canvas');
            jumpBtnCanvas.width = 64;
            jumpBtnCanvas.height = 64;
            const ctx = jumpBtnCanvas.getContext('2d');
            ctx.fillStyle = 'rgba(0, 128, 0, 0.7)';
            ctx.beginPath();
            ctx.arc(32, 32, 32 - 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('JUMP', 32, 32 + 5);
            this.scene.textures.addCanvas('jumpBtn', jumpBtnCanvas);
        }
    }

    createMusicToggleButtons() {
        if (!this.scene.textures.exists('musicToggleOn')) {
            let musicSize = 48;
            let musicOnCanvas = document.createElement('canvas');
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
            ctx.lineTo(musicSize * 0.60, musicSize * 0.18);
            ctx.lineTo(musicSize * 0.60, musicSize * 0.82);
            ctx.lineTo(musicSize * 0.44, musicSize * 0.68);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(musicSize * 0.60, musicSize * 0.5, musicSize * 0.16, -Math.PI / 3, Math.PI / 3);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(musicSize * 0.60, musicSize * 0.5, musicSize * 0.26, -Math.PI / 3, Math.PI / 3);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(musicSize * 0.60, musicSize * 0.5, musicSize * 0.36, -Math.PI / 3, Math.PI / 3);
            ctx.stroke();
            this.scene.textures.addCanvas('musicToggleOn', musicOnCanvas);
        }

        if (!this.scene.textures.exists('musicToggleOff')) {
            let musicSize = 48;
            let musicOffCanvas = document.createElement('canvas');
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
            ctx.lineTo(musicSize * 0.60, musicSize * 0.18);
            ctx.lineTo(musicSize * 0.60, musicSize * 0.48);
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
