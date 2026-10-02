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
