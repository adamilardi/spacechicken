if (!String.prototype.padStart) {
    String.prototype.padStart = function padStart(targetLength, padString) {
        const str = String(this);
        const length = targetLength >>> 0;
        let filler = padString !== undefined ? String(padString) : ' ';
        if (str.length >= length || filler.length === 0) {
            return str;
        }
        const fillLength = length - str.length;
        while (filler.length < fillLength) {
            filler += filler;
        }
        return filler.slice(0, fillLength) + str;
    };
}

class SpaceChicken extends Phaser.Scene {
    init(data = {}) {
        this.level = data.level || 1;
        this.deathCount = data.deathCount || 0;
        this.storageAvailable = true;
        this.safeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };
        this.viewportWidth = 0;
        this.viewportHeight = 0;
        this.leaderboardTextObject = null;
        this.leaderboardTextContent = '';
        this.jumpPointerId = null;
        this.jumpRequested = false;
        this.touchControlsEnabled = false;
        this.jumpButton = null;
        this.touchMovementMidpoint = 0;
        this.audioUnlocked = false;
        this.audioUnlockHandler = null;
        this.musicGainNode = null;
        this.effectsGainNode = null;
        this.backgroundLoopEvent = null;
        this.backgroundPattern = null;
        this.backgroundPatternDuration = 0;
        this.backgroundSources = new Set();
        this.activeEffects = new Set();
        this.musicMuted = false;
        this.musicVolume = 0.18;
        this.musicToggleButton = null;
        this.leaderboardButton = null;
        this.leaderboardVisible = false;
        this.leaderboardRequestId = 0;
        this.muteKey = null;
        this.levelMusicId = null;
        this.playerName = null;
        this.firebaseEndpoint = null;
        this.pointerTapTimes = new Map();
        this.doubleTapThreshold = 350;
        if (typeof window !== 'undefined' && window.SPACE_CHICKEN_CONFIG && window.SPACE_CHICKEN_CONFIG.firebaseEndpoint) {
            const trimmed = window.SPACE_CHICKEN_CONFIG.firebaseEndpoint.replace(/\/+$/, '');
            this.firebaseEndpoint = trimmed.length ? trimmed : null;
        }
    }

    constructor() {
        super();
    }
    preload() {
            // Create animated chicken sprites
        this.createChickenFrames();

            let ctx;
        if (!this.textures.exists('crown')) {
                let crownCanvas = document.createElement('canvas');
            crownCanvas.width = 32;
            crownCanvas.height = 32;
            ctx = crownCanvas.getContext('2d');
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(0, 0, 32, 32);
            // Draw golden crown
            ctx.fillStyle = '#ffed4a';
            ctx.strokeStyle = '#ffa500';
            ctx.lineWidth = 2;
            // Main crown body
            ctx.fillRect(4, 20, 24, 8);
            ctx.strokeRect(4, 20, 24, 8);
            // Jewels/spikes
            ctx.beginPath();
            ctx.moveTo(6, 20);
            ctx.lineTo(8, 14);
            ctx.lineTo(10, 20);
            ctx.moveTo(11, 20);
            ctx.lineTo(13, 12);
            ctx.lineTo(15, 20);
            ctx.moveTo(16, 20);
            ctx.lineTo(18, 10);
            ctx.lineTo(20, 20);
            ctx.moveTo(21, 20);
            ctx.lineTo(23, 14);
            ctx.lineTo(25, 20);
            ctx.moveTo(26, 20);
            ctx.lineTo(28, 14);
            ctx.lineTo(30, 20);
            ctx.stroke();
            // Fill spikes with gold
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(6, 20, 4, 8);
            ctx.fillRect(11, 20, 4, 8);
            ctx.fillRect(16, 20, 4, 8);
            ctx.fillRect(21, 20, 4, 8);
            ctx.fillRect(26, 20, 4, 8);
            // Jewels on spikes
            ctx.fillStyle = '#ff0000'; // Ruby
            ctx.beginPath();
            ctx.arc(7, 17, 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.arc(12, 15, 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#0000ff'; // Sapphire
            ctx.beginPath();
            ctx.arc(17, 13, 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#00ff00'; // Emerald
            ctx.beginPath();
            ctx.arc(22, 17, 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.arc(27, 17, 1, 0, Math.PI * 2);
            ctx.fill();
            this.textures.addCanvas('crown', crownCanvas);
        }

        if (!this.textures.exists('cliff')) {
            let cliffCanvas = document.createElement('canvas');
        cliffCanvas.width = 64;
        cliffCanvas.height = 64;
            ctx = cliffCanvas.getContext('2d');
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
            this.textures.addCanvas('cliff', cliffCanvas);
        }


        if (!this.textures.exists('rock')) {
                let rockCanvas = document.createElement('canvas');
        rockCanvas.width = 32;
        rockCanvas.height = 32;
            ctx = rockCanvas.getContext('2d');
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
            this.textures.addCanvas('rock', rockCanvas);
        }


        if (!this.textures.exists('bomb')) {
                let bombCanvas = document.createElement('canvas');
        bombCanvas.width = 32;
        bombCanvas.height = 32;
            ctx = bombCanvas.getContext('2d');
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(16, 16, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(16, 16, 8, 0, Math.PI * 2);
            ctx.fill();
            this.textures.addCanvas('bomb', bombCanvas);
        }


            // Station platform panel
        if (!this.textures.exists('stationPanel')) {
                let stationPanelCanvas = document.createElement('canvas');
        stationPanelCanvas.width = 96;
        stationPanelCanvas.height = 24;
            ctx = stationPanelCanvas.getContext('2d');
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
            this.textures.addCanvas('stationPanel', stationPanelCanvas);
        }


        if (!this.textures.exists('liftPlatform')) {
                let liftCanvas = document.createElement('canvas');
        liftCanvas.width = 96;
        liftCanvas.height = 24;
            ctx = liftCanvas.getContext('2d');
            ctx.fillStyle = '#1f2a38';
            ctx.fillRect(0, 0, 96, 24);
            ctx.fillStyle = '#ffaa00';
            for (let i = 0; i < 96; i += 12) {
            ctx.fillRect(i, 18, 8, 4);
        }
            ctx.fillStyle = '#55617d';
            ctx.fillRect(0, 0, 96, 6);
            this.textures.addCanvas('liftPlatform', liftCanvas);
        }


        if (!this.textures.exists('laserBeam')) {
                let laserCanvas = document.createElement('canvas');
        laserCanvas.width = 16;
        laserCanvas.height = 16;
            ctx = laserCanvas.getContext('2d');
            let gradient = ctx.createLinearGradient(0, 0, 16, 0);
        gradient.addColorStop(0, 'rgba(255, 0, 120, 0)');
        gradient.addColorStop(0.5, 'rgba(255, 0, 120, 1)');
        gradient.addColorStop(1, 'rgba(255, 0, 120, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 4, 16, 8);
            this.textures.addCanvas('laserBeam', laserCanvas);
        }


        if (!this.textures.exists('laserEmitter')) {
                let emitterCanvas = document.createElement('canvas');
        emitterCanvas.width = 24;
        emitterCanvas.height = 24;
            ctx = emitterCanvas.getContext('2d');
            ctx.fillStyle = '#121722';
            ctx.fillRect(0, 0, 24, 24);
            ctx.fillStyle = '#2f3c4f';
            ctx.fillRect(2, 2, 20, 20);
            ctx.fillStyle = '#ff0066';
            ctx.fillRect(9, 4, 6, 16);
            ctx.fillStyle = '#ffaa00';
            ctx.fillRect(6, 9, 12, 6);
            this.textures.addCanvas('laserEmitter', emitterCanvas);
        }


        if (!this.textures.exists('drone')) {
                let droneCanvas = document.createElement('canvas');
        droneCanvas.width = 48;
        droneCanvas.height = 48;
            ctx = droneCanvas.getContext('2d');
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
            this.textures.addCanvas('drone', droneCanvas);
        }


            // Virtual controller buttons for mobile
            let btnWidth = 64, btnHeight = 64;

            // Left button (arrow left)
        if (!this.textures.exists('leftBtn')) {
                let leftBtnCanvas = document.createElement('canvas');
        leftBtnCanvas.width = btnWidth;
        leftBtnCanvas.height = btnHeight;
            ctx = leftBtnCanvas.getContext('2d');
            // Semi-transparent background
            ctx.fillStyle = 'rgba(128, 128, 128, 0.7)';
            ctx.fillRect(0, 0, btnWidth, btnHeight);
            // Arrow
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(btnWidth * 0.6, btnHeight * 0.2);
            ctx.lineTo(btnWidth * 0.6, btnHeight * 0.8);
            ctx.lineTo(btnWidth * 0.2, btnHeight * 0.5);
            ctx.closePath();
            ctx.fill();
            this.textures.addCanvas('leftBtn', leftBtnCanvas);
        }


            // Right button (arrow right)
        if (!this.textures.exists('rightBtn')) {
                let rightBtnCanvas = document.createElement('canvas');
        rightBtnCanvas.width = btnWidth;
        rightBtnCanvas.height = btnHeight;
            ctx = rightBtnCanvas.getContext('2d');
            ctx.fillStyle = 'rgba(128, 128, 128, 0.7)';
            ctx.fillRect(0, 0, btnWidth, btnHeight);
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(btnWidth * 0.4, btnHeight * 0.2);
            ctx.lineTo(btnWidth * 0.4, btnHeight * 0.8);
            ctx.lineTo(btnWidth * 0.8, btnHeight * 0.5);
            ctx.closePath();
            ctx.fill();
            this.textures.addCanvas('rightBtn', rightBtnCanvas);
        }


            // Jump button (circle with "JUMP")
        if (!this.textures.exists('jumpBtn')) {
                let jumpBtnCanvas = document.createElement('canvas');
        jumpBtnCanvas.width = btnWidth;
        jumpBtnCanvas.height = btnHeight;
            ctx = jumpBtnCanvas.getContext('2d');
            ctx.fillStyle = 'rgba(0, 128, 0, 0.7)';
            ctx.beginPath();
            ctx.arc(btnWidth/2, btnHeight/2, btnWidth/2 - 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('JUMP', btnWidth/2, btnHeight/2 + 5);
            this.textures.addCanvas('jumpBtn', jumpBtnCanvas);
        }

        if (!this.textures.exists('musicToggleOn')) {
                let musicSize = 48;
        let musicOnCanvas = document.createElement('canvas');
        musicOnCanvas.width = musicSize;
        musicOnCanvas.height = musicSize;
            ctx = musicOnCanvas.getContext('2d');
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
            this.textures.addCanvas('musicToggleOn', musicOnCanvas);
        }

        if (!this.textures.exists('musicToggleOff')) {
                let musicSize = 48;
        let musicOffCanvas = document.createElement('canvas');
        musicOffCanvas.width = musicSize;
        musicOffCanvas.height = musicSize;
            ctx = musicOffCanvas.getContext('2d');
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
            this.textures.addCanvas('musicToggleOff', musicOffCanvas);
        }

    }

    createChickenFrames() {
        if (this.textures.exists('chicken1')) {
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
            this.textures.addCanvas('chicken1', chicken1);

            // Frame 2: wings down, legs switch
            let chicken2 = document.createElement('canvas');
        chicken2.width = 32;
        chicken2.height = 32;
            let ctx2 = chicken2.getContext('2d');
        drawChicken(ctx2, -Math.PI / 6, 14, 18, false);
            this.textures.addCanvas('chicken2', chicken2);

            // Frame 3: wings up, right leg back, left leg forward
            let chicken3 = document.createElement('canvas');
        chicken3.width = 32;
        chicken3.height = 32;
            let ctx3 = chicken3.getContext('2d');
        drawChicken(ctx3, Math.PI / 6, 10, 22, false);
            this.textures.addCanvas('chicken3', chicken3);

            // Frame 4: wings down, legs switch back
            let chicken4 = document.createElement('canvas');
        chicken4.width = 32;
        chicken4.height = 32;
            let ctx4 = chicken4.getContext('2d');
        drawChicken(ctx4, -Math.PI / 6, 14, 18, false);
            this.textures.addCanvas('chicken4', chicken4);

            // Jump frame: wings neutral, legs bent
            let chicken_jump = document.createElement('canvas');
        chicken_jump.width = 32;
        chicken_jump.height = 32;
            let ctx_jump = chicken_jump.getContext('2d');
        drawChicken(ctx_jump, 0, 0, 0, true);
            this.textures.addCanvas('chicken_jump', chicken_jump);
            // Jetpack frame 1: compact exhaust
            let chicken_jetpack1 = document.createElement('canvas');
        chicken_jetpack1.width = 32;
        chicken_jetpack1.height = 32;
            let ctx_jetpack1 = chicken_jetpack1.getContext('2d');
        drawChicken(ctx_jetpack1, 0, 0, 0, true);
            ctx_jetpack1.fillStyle = '#555555';
            ctx_jetpack1.fillRect(8, 16, 4, 10);
            ctx_jetpack1.fillRect(20, 16, 4, 10);
            ctx_jetpack1.fillStyle = '#999999';
            ctx_jetpack1.fillRect(12, 16, 8, 8);
            ctx_jetpack1.fillStyle = '#ffcc00';
            ctx_jetpack1.beginPath();
            ctx_jetpack1.moveTo(10, 26);
            ctx_jetpack1.lineTo(12, 32);
            ctx_jetpack1.lineTo(14, 26);
            ctx_jetpack1.closePath();
            ctx_jetpack1.fill();
            ctx_jetpack1.beginPath();
            ctx_jetpack1.moveTo(18, 26);
            ctx_jetpack1.lineTo(20, 32);
            ctx_jetpack1.lineTo(22, 26);
            ctx_jetpack1.closePath();
            ctx_jetpack1.fill();
            ctx_jetpack1.fillStyle = '#ff6600';
            ctx_jetpack1.beginPath();
            ctx_jetpack1.moveTo(11, 26);
            ctx_jetpack1.lineTo(12, 30);
            ctx_jetpack1.lineTo(13, 26);
            ctx_jetpack1.closePath();
            ctx_jetpack1.fill();
            ctx_jetpack1.beginPath();
            ctx_jetpack1.moveTo(19, 26);
            ctx_jetpack1.lineTo(20, 30);
            ctx_jetpack1.lineTo(21, 26);
            ctx_jetpack1.closePath();
            ctx_jetpack1.fill();
            this.textures.addCanvas('chicken_jetpack1', chicken_jetpack1);

            // Jetpack frame 2: stretched exhaust
            let chicken_jetpack2 = document.createElement('canvas');
        chicken_jetpack2.width = 32;
        chicken_jetpack2.height = 32;
            let ctx_jetpack2 = chicken_jetpack2.getContext('2d');
        drawChicken(ctx_jetpack2, 0, 0, 0, true);
            ctx_jetpack2.fillStyle = '#555555';
            ctx_jetpack2.fillRect(8, 16, 4, 10);
            ctx_jetpack2.fillRect(20, 16, 4, 10);
            ctx_jetpack2.fillStyle = '#999999';
            ctx_jetpack2.fillRect(12, 16, 8, 8);
            ctx_jetpack2.fillStyle = '#ffcc00';
            ctx_jetpack2.beginPath();
            ctx_jetpack2.moveTo(10, 26);
            ctx_jetpack2.lineTo(12, 34);
            ctx_jetpack2.lineTo(14, 26);
            ctx_jetpack2.closePath();
            ctx_jetpack2.fill();
            ctx_jetpack2.beginPath();
            ctx_jetpack2.moveTo(18, 26);
            ctx_jetpack2.lineTo(20, 34);
            ctx_jetpack2.lineTo(22, 26);
            ctx_jetpack2.closePath();
            ctx_jetpack2.fill();
            ctx_jetpack2.fillStyle = '#ff2200';
            ctx_jetpack2.beginPath();
            ctx_jetpack2.moveTo(11, 26);
            ctx_jetpack2.lineTo(12, 31);
            ctx_jetpack2.lineTo(13, 26);
            ctx_jetpack2.closePath();
            ctx_jetpack2.fill();
            ctx_jetpack2.beginPath();
            ctx_jetpack2.moveTo(19, 26);
            ctx_jetpack2.lineTo(20, 31);
            ctx_jetpack2.lineTo(21, 26);
            ctx_jetpack2.closePath();
            ctx_jetpack2.fill();
            this.textures.addCanvas('chicken_jetpack2', chicken_jetpack2);
    }

    valueOrDefault(value, fallback) {
        return (value === undefined || value === null) ? fallback : value;
    }

    getNested(source, keys, fallback) {
            let current = source;
            for (let i = 0; i < keys.length; i++) {
            if (current === undefined || current === null) {
                return fallback;
            }
            current = current[keys[i]];
        }
        return (current === undefined || current === null) ? fallback : current;
    }

    getScaleDimension(dimension) {
        const scale = this.scale;
        if (!scale) {
            return null;
        }
        const gameSize = scale.gameSize;
        if (gameSize && typeof gameSize[dimension] === 'number') {
            return gameSize[dimension];
        }
        if (typeof scale[dimension] === 'number') {
            return scale[dimension];
        }
        return null;
    }

    getConfigDimension(dimension) {
        const sys = this.sys;
        if (!sys || !sys.game || !sys.game.config) {
            return null;
        }
        const value = sys.game.config[dimension];
        return (typeof value === 'number') ? value : null;
    }

    getBaseDimension(dimension) {
        const scaleValue = this.getScaleDimension(dimension);
        if (typeof scaleValue === 'number' && scaleValue > 0) {
            return scaleValue;
        }
        const configValue = this.getConfigDimension(dimension);
        if (typeof configValue === 'number' && configValue > 0) {
            return configValue;
        }
        if (typeof window !== 'undefined') {
            if (dimension === 'width') {
                return window.innerWidth;
            }
            if (dimension === 'height') {
                return window.innerHeight;
            }
        }
        return dimension === 'width' ? 800 : 600;
    }

    getBaseWidth() {
        return this.getBaseDimension('width');
    }

    getBaseHeight() {
        return this.getBaseDimension('height');
    }

    getViewportWidth() {
        if (typeof this.viewportWidth === 'number' && this.viewportWidth > 0) {
            return this.viewportWidth;
        }
        return this.getBaseWidth();
    }

    getViewportHeight() {
        if (typeof this.viewportHeight === 'number' && this.viewportHeight > 0) {
            return this.viewportHeight;
        }
        return this.getBaseHeight();
    }

    shouldEnableTouchControls() {
        if (this.sys && this.sys.game && this.sys.game.device && this.sys.game.device.input && this.sys.game.device.input.touch) {
            return true;
        }
        if (typeof navigator !== 'undefined') {
            if ((typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0) ||
                (typeof navigator.msMaxTouchPoints === 'number' && navigator.msMaxTouchPoints > 0)) {
                return true;
            }
            const userAgent = navigator.userAgent || '';
            if (userAgent.indexOf('Macintosh') !== -1 && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0) {
                return true;
            }
        }
        if (typeof window !== 'undefined') {
            if ('ontouchstart' in window) {
                return true;
            }
            if (typeof window.matchMedia === 'function') {
                try {
                    if (window.matchMedia('(any-pointer: coarse)').matches) {
                        return true;
                    }
                } catch (error) {
                    // Ignore matchMedia errors (some browsers throw when the query is unsupported)
                }
            }
        }
        if (typeof window !== 'undefined' && typeof document !== 'undefined' && window.DocumentTouch && document instanceof window.DocumentTouch) {
            return true;
        }
        return false;
    }

    getActivePointers() {
        if (!this.input) {
            return [];
        }
        const pointers = [];
        if (Array.isArray(this.input.pointers)) {
            pointers.push(...this.input.pointers);
        }
        if (this.input.activePointer) {
            pointers.push(this.input.activePointer);
        }
        const uniquePointers = [];
        const seen = new Set();
        pointers.forEach(pointer => {
            if (!pointer || seen.has(pointer)) {
                return;
            }
            seen.add(pointer);
            uniquePointers.push(pointer);
        });
        return uniquePointers;
    }

    isPointerOverGameObject(pointerX, pointerY, gameObject) {
        if (!gameObject || typeof pointerX !== 'number' || typeof pointerY !== 'number' || typeof gameObject.getBounds !== 'function') {
            return false;
        }
        const bounds = gameObject.getBounds();
        if (bounds && typeof bounds.contains === 'function') {
            return bounds.contains(pointerX, pointerY);
        }
        if (!bounds) {
            return false;
        }
        return pointerX >= bounds.x && pointerX <= bounds.x + bounds.width &&
            pointerY >= bounds.y && pointerY <= bounds.y + bounds.height;
    }

    canUseWebAudio() {
        return this.sound && this.sound.context && typeof this.sound.context.createOscillator === 'function';
    }

    setupAudioPipeline(options = {}) {
        if (!this.canUseWebAudio()) {
            return;
        }

        const skipAutoStart = options.skipAutoStart === true;
        const context = this.sound.context;
        const destination = this.sound.masterGainNode || context.destination;

        if (!this.musicGainNode) {
            this.musicGainNode = context.createGain();
            const initialGain = this.musicMuted ? 0 : this.musicVolume;
            this.musicGainNode.gain.setValueAtTime(initialGain, context.currentTime);
            this.musicGainNode.connect(destination);
        } else {
            const targetGain = this.musicMuted ? 0 : this.musicVolume;
            try {
                this.musicGainNode.gain.cancelScheduledValues(context.currentTime);
            } catch (err) {
                // ignore
            }
            this.musicGainNode.gain.setTargetAtTime(targetGain, context.currentTime, 0.05);
        }

        if (!this.effectsGainNode) {
            this.effectsGainNode = context.createGain();
            this.effectsGainNode.gain.setValueAtTime(0.4, context.currentTime);
            this.effectsGainNode.connect(destination);
        }

        if (!this.backgroundPattern || !this.backgroundPattern.length) {
            this.configureLevelMusic();
        }

        if (context.state === 'running') {
            this.audioUnlocked = true;
            if (!skipAutoStart) {
                this.startBackgroundMusic();
            }
            return;
        }

        if (this.audioUnlockHandler) {
            return;
        }

        const unlock = () => {
            if (this.audioUnlocked) {
                return;
            }
            this.audioUnlocked = true;
            if (context.state === 'suspended') {
                context.resume().catch(() => {});
            }
            this.startBackgroundMusic();
            if (this.input) {
                this.input.off('pointerdown', unlock, this);
            }
            if (this.input && this.input.keyboard) {
                this.input.keyboard.off('keydown', unlock, this);
            }
            this.audioUnlockHandler = null;
        };

        this.audioUnlockHandler = unlock;
        if (this.input) {
            this.input.once('pointerdown', unlock, this);
        }
        if (this.input && this.input.keyboard) {
            this.input.keyboard.once('keydown', unlock, this);
        }
    }

    startBackgroundMusic() {
        if (!this.canUseWebAudio() || !this.audioUnlocked) {
            return;
        }
        if (!this.musicGainNode) {
            this.setupAudioPipeline({ skipAutoStart: true });
        }
        if (!this.musicGainNode || this.backgroundLoopEvent || !this.backgroundPattern || !this.backgroundPattern.length) {
            return;
        }
        const context = this.sound.context;
        const offsetTime = context.currentTime + 0.05;
        this.scheduleBackgroundPattern(offsetTime);
        const delay = Math.max(1000, this.backgroundPatternDuration * 1000);
        this.backgroundLoopEvent = this.time.addEvent({
            delay,
            loop: true,
            callback: () => this.scheduleBackgroundPattern(context.currentTime + 0.05)
        });
    }

    scheduleBackgroundPattern(baseTime) {
        if (!this.backgroundPattern || !this.canUseWebAudio()) {
            return;
        }
        this.backgroundPattern.forEach(note => {
            this.playTone({
                freqStart: note.freqStart,
                freqEnd: note.freqEnd,
                duration: note.duration,
                type: note.type,
                volume: note.volume,
                startTime: baseTime + note.offset,
                destination: this.musicGainNode,
                trackSet: this.backgroundSources
            });
        });
    }

    stopBackgroundMusic() {
        if (this.backgroundLoopEvent) {
            this.backgroundLoopEvent.remove();
            this.backgroundLoopEvent = null;
        }
        if (this.backgroundSources) {
            this.backgroundSources.forEach(source => {
                try {
                    source.stop();
                } catch (err) {
                    // ignore
                }
            });
            this.backgroundSources.clear();
        }
    }

    stopAllEffects() {
        if (!this.activeEffects) {
            return;
        }
        this.activeEffects.forEach(source => {
            try {
                source.stop();
            } catch (err) {
                // ignore
            }
        });
        this.activeEffects.clear();
    }

    cleanupAudio() {
        if (!this.sound) {
            return;
        }
        this.stopBackgroundMusic();
        this.stopAllEffects();
        if (this.musicGainNode) {
            try {
                this.musicGainNode.disconnect();
            } catch (err) {
                // ignore
            }
            this.musicGainNode = null;
        }
        if (this.effectsGainNode) {
            try {
                this.effectsGainNode.disconnect();
            } catch (err) {
                // ignore
            }
            this.effectsGainNode = null;
        }
        if (this.audioUnlockHandler) {
            if (this.input) {
                this.input.off('pointerdown', this.audioUnlockHandler, this);
            }
            if (this.input && this.input.keyboard) {
            this.input.keyboard.off('keydown', this.audioUnlockHandler, this);
            }
            this.audioUnlockHandler = null;
        }
        this.audioUnlocked = false;
        if (this.musicToggleButton) {
            this.musicToggleButton.destroy();
            this.musicToggleButton = null;
        }
    }

    playTone(options = {}) {
        if (!this.canUseWebAudio()) {
            return null;
        }
        const context = this.sound.context;
        const startTime = options.startTime !== undefined ? options.startTime : context.currentTime;
        const duration = Math.max(0.05, options.duration || 0.2);
        const stopTime = startTime + duration + 0.05;

        const oscillator = context.createOscillator();
        oscillator.type = options.type || 'sine';
        const freqStart = options.freqStart || options.freqEnd || 440;
        oscillator.frequency.setValueAtTime(freqStart, startTime);
        if (options.freqEnd && options.freqEnd !== freqStart) {
            oscillator.frequency.linearRampToValueAtTime(options.freqEnd, startTime + duration);
        }

        const gainNode = context.createGain();
        const targetVolume = options.volume !== undefined ? options.volume : 0.4;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(targetVolume, startTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(targetVolume * 0.6, startTime + duration * 0.6);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
        gainNode.gain.setValueAtTime(0, stopTime);

        oscillator.connect(gainNode);
        const destination = options.destination || this.effectsGainNode || this.sound.masterGainNode || context.destination;
        gainNode.connect(destination);

        const trackingSet = options.trackSet || this.activeEffects;

        oscillator.start(startTime);
        oscillator.stop(stopTime);

        const cleanup = () => {
            oscillator.disconnect();
            gainNode.disconnect();
            if (trackingSet) {
                trackingSet.delete(oscillator);
            }
        };
        oscillator.onended = cleanup;

        if (trackingSet) {
            trackingSet.add(oscillator);
        }

        return oscillator;
    }

    playJumpSound() {
        if (!this.canUseWebAudio()) {
            return;
        }
        const now = this.sound.context.currentTime;
        this.playTone({
            freqStart: 560,
            freqEnd: 720,
            duration: 0.18,
            type: 'square',
            volume: 0.34,
            startTime: now
        });
    }

    playJetpackSound() {
        if (!this.canUseWebAudio()) {
            return;
        }
        const now = this.sound.context.currentTime;
        this.playTone({
            freqStart: 820,
            freqEnd: 540,
            duration: 0.35,
            type: 'sawtooth',
            volume: 0.28,
            startTime: now
        });
    }

    playCollectSound() {
        if (!this.canUseWebAudio()) {
            return;
        }
        const now = this.sound.context.currentTime;
        this.playTone({ freqStart: 660, duration: 0.18, type: 'triangle', volume: 0.28, startTime: now });
        this.playTone({ freqStart: 784, duration: 0.18, type: 'triangle', volume: 0.26, startTime: now + 0.2 });
        this.playTone({ freqStart: 988, duration: 0.32, type: 'triangle', volume: 0.24, startTime: now + 0.4 });
    }

    playHazardHitSound() {
        if (!this.canUseWebAudio()) {
            return;
        }
        const now = this.sound.context.currentTime;
        this.playTone({
            freqStart: 320,
            freqEnd: 120,
            duration: 0.28,
            type: 'sawtooth',
            volume: 0.32,
            startTime: now
        });
        this.playTone({
            freqStart: 180,
            freqEnd: 80,
            duration: 0.4,
            type: 'square',
            volume: 0.25,
            startTime: now + 0.02
        });
    }

    getMusicDefinitionForLevel(level) {
        const commonPad = (baseFreq, startOffset = 0, duration = 1.6, volume = 0.1) => ([
            { offset: startOffset, duration, freqStart: baseFreq, type: 'sawtooth', volume }
        ]);

        const level1Pattern = [
            { offset: 0, duration: 0.32, freqStart: 392, type: 'triangle', volume: 0.22 },
            { offset: 0.36, duration: 0.32, freqStart: 440, type: 'triangle', volume: 0.22 },
            { offset: 0.72, duration: 0.32, freqStart: 494, type: 'triangle', volume: 0.22 },
            { offset: 1.08, duration: 0.32, freqStart: 523, type: 'triangle', volume: 0.22 },
            { offset: 1.44, duration: 0.32, freqStart: 494, type: 'triangle', volume: 0.22 },
            { offset: 1.8, duration: 0.32, freqStart: 440, type: 'triangle', volume: 0.22 },
            { offset: 2.16, duration: 0.32, freqStart: 392, type: 'triangle', volume: 0.22 },
            { offset: 2.52, duration: 0.48, freqStart: 330, type: 'triangle', volume: 0.2 },
            ...commonPad(196, 0, 1.6, 0.12),
            ...commonPad(220, 1.68, 1.6, 0.12)
        ];

        const level2Pattern = [
            { offset: 0, duration: 0.24, freqStart: 523, freqEnd: 554, type: 'square', volume: 0.24 },
            { offset: 0.26, duration: 0.24, freqStart: 494, freqEnd: 523, type: 'square', volume: 0.24 },
            { offset: 0.52, duration: 0.24, freqStart: 440, freqEnd: 466, type: 'square', volume: 0.24 },
            { offset: 0.78, duration: 0.24, freqStart: 392, freqEnd: 415, type: 'triangle', volume: 0.23 },
            { offset: 1.04, duration: 0.28, freqStart: 440, freqEnd: 494, type: 'triangle', volume: 0.24 },
            { offset: 1.34, duration: 0.3, freqStart: 587, type: 'square', volume: 0.25 },
            { offset: 1.68, duration: 0.24, freqStart: 659, freqEnd: 698, type: 'triangle', volume: 0.22 },
            { offset: 1.94, duration: 0.24, freqStart: 622, freqEnd: 659, type: 'triangle', volume: 0.22 },
            { offset: 2.2, duration: 0.24, freqStart: 587, freqEnd: 622, type: 'triangle', volume: 0.22 },
            { offset: 2.46, duration: 0.36, freqStart: 494, freqEnd: 440, type: 'triangle', volume: 0.22 },
            ...commonPad(220, 0, 1.8, 0.14),
            ...commonPad(247, 1.9, 1.6, 0.14),
            { offset: 0, duration: 1.6, freqStart: 110, freqEnd: 82, type: 'sine', volume: 0.08 }
        ];

        const level3Pattern = [
            { offset: 0, duration: 0.18, freqStart: 659, freqEnd: 698, type: 'sawtooth', volume: 0.26 },
            { offset: 0.2, duration: 0.18, freqStart: 698, freqEnd: 740, type: 'sawtooth', volume: 0.26 },
            { offset: 0.4, duration: 0.18, freqStart: 740, freqEnd: 784, type: 'sawtooth', volume: 0.26 },
            { offset: 0.6, duration: 0.24, freqStart: 831, type: 'triangle', volume: 0.25 },
            { offset: 0.9, duration: 0.24, freqStart: 880, freqEnd: 932, type: 'square', volume: 0.27 },
            { offset: 1.2, duration: 0.24, freqStart: 988, freqEnd: 1046, type: 'square', volume: 0.27 },
            { offset: 1.52, duration: 0.24, freqStart: 1174, type: 'triangle', volume: 0.25 },
            { offset: 1.86, duration: 0.24, freqStart: 1109, freqEnd: 1046, type: 'triangle', volume: 0.24 },
            { offset: 2.1, duration: 0.24, freqStart: 988, freqEnd: 932, type: 'triangle', volume: 0.24 },
            { offset: 2.34, duration: 0.42, freqStart: 880, freqEnd: 784, type: 'triangle', volume: 0.24 },
            ...commonPad(262, 0, 1.2, 0.16),
            ...commonPad(330, 1.1, 1.2, 0.16),
            ...commonPad(196, 2.2, 0.9, 0.12),
            { offset: 0, duration: 2.4, freqStart: 98, freqEnd: 73, type: 'sine', volume: 0.09 }
        ];

        const definitions = {
            1: { id: 'level-1', pattern: level1Pattern, loopPadding: 0.4, musicVolume: 0.18 },
            2: { id: 'level-2', pattern: level2Pattern, loopPadding: 0.5, musicVolume: 0.2 },
            3: { id: 'level-3', pattern: level3Pattern, loopPadding: 0.55, musicVolume: 0.22 }
        };

        return definitions[level] || definitions[1];
    }

    computePatternDuration(pattern) {
        if (!pattern || !pattern.length) {
            return 0;
        }
        return pattern.reduce((max, note) => {
            const duration = this.valueOrDefault(note.duration, 0);
            const end = this.valueOrDefault(note.offset, 0) + duration;
            return end > max ? end : max;
        }, 0);
    }

    configureLevelMusic() {
        const definition = this.getMusicDefinitionForLevel(this.level) || {};
        const pattern = Array.isArray(definition.pattern) ? definition.pattern : [];
        this.levelMusicId = definition.id || `level-${this.level}`;
        this.backgroundPattern = pattern.slice();
        const baseDuration = this.computePatternDuration(this.backgroundPattern);
        const padding = this.valueOrDefault(definition.loopPadding, 0.4);
        this.backgroundPatternDuration = baseDuration + padding;
        this.musicVolume = this.valueOrDefault(definition.musicVolume, 0.18);

        if (this.musicGainNode) {
            try {
                const context = this.sound.context;
                this.musicGainNode.gain.cancelScheduledValues(context.currentTime);
                const target = this.musicMuted ? 0 : this.musicVolume;
                this.musicGainNode.gain.setTargetAtTime(target, context.currentTime, 0.05);
            } catch (err) {
                // ignore
            }
        }

        this.stopBackgroundMusic();
        this.updateMusicToggleVisual();
    }

    loadMusicPreference() {
        if (!this.storageAvailable || typeof window === 'undefined' || !window.localStorage) {
            return false;
        }
        try {
            const raw = window.localStorage.getItem('spaceChickenMusicMuted');
            if (raw === null || raw === undefined) {
                return false;
            }
            return raw === 'true';
        } catch (err) {
            return false;
        }
    }

    saveMusicPreference(muted) {
        if (!this.storageAvailable || typeof window === 'undefined' || !window.localStorage) {
            return;
        }
        try {
            window.localStorage.setItem('spaceChickenMusicMuted', muted ? 'true' : 'false');
        } catch (err) {
            this.storageAvailable = false;
        }
    }

    setMusicMuted(muted, options = {}) {
        const desired = !!muted;
        const changed = desired !== this.musicMuted;
        this.musicMuted = desired;
        if (this.canUseWebAudio()) {
            if (!this.musicGainNode) {
                this.setupAudioPipeline({ skipAutoStart: true });
            }
            if (this.musicGainNode) {
                const context = this.sound.context;
                const target = this.musicMuted ? 0 : (this.musicVolume || 0.18);
                try {
                    this.musicGainNode.gain.cancelScheduledValues(context.currentTime);
                } catch (err) {
                    // ignore
                }
                this.musicGainNode.gain.setTargetAtTime(target, context.currentTime, 0.05);
            }
        }
        this.updateMusicToggleVisual();
        if (!options.skipSave) {
            this.saveMusicPreference(this.musicMuted);
        }
        return changed;
    }

    toggleMusicMute() {
        this.setMusicMuted(!this.musicMuted);
    }

    updateMusicToggleVisual() {
        if (!this.musicToggleButton) {
            return;
        }
        const textureKey = this.musicMuted ? 'musicToggleOff' : 'musicToggleOn';
        this.musicToggleButton.setTexture(textureKey);
        this.musicToggleButton.setAlpha(this.musicMuted ? 0.75 : 0.95);
    }

    create() {
        this.levelConfig = this.getLevelConfig(this.level);

        this.physics.world.gravity.y = this.levelConfig.gravity;

        this.startTime = performance.now();

        this.gameOver = false;
        this.maxJumps = this.levelConfig.maxJumps || 2;
        this.jumpCount = 0;
        this.isJetpacking = false;
        this.restartDelayDone = true;

        this.leftPressed = false;
        this.rightPressed = false;
        this.jumpRequested = false;
        this.jumpPointerId = null;
        this.touchControlsEnabled = false;

        this.storageAvailable = this.checkStorageAvailability();
        this.playerName = this.loadPlayerName();
        this.musicMuted = this.loadMusicPreference();
        this.configureLevelMusic();

        this.leaderboardTextContent = '';
        if (this.leaderboardTextObject) {
            this.leaderboardTextObject.destroy();
        }
        this.leaderboardTextObject = null;
        this.leaderboardVisible = false;
        this.leaderboardRequestId = 0;

        this.timerText = this.add.text(0, 0, 'Time: 00:00.00', { fontSize: '36px', fontFamily: 'monospace', fill: '#ffff00' });
        this.timerText.setScrollFactor(0);
        this.timerText.setDepth(10000);

        this.levelText = this.add.text(0, 0, `Level: ${this.level}`, { fontSize: '24px', fill: '#fff' });
        this.levelText.setScrollFactor(0);
        this.levelText.setDepth(10000);

        const worldWidth = this.getNested(this.levelConfig, ['world', 'width'], 2000);
        const worldHeight = this.getNested(this.levelConfig, ['world', 'height'], 700);
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;

        if (!this.backgroundGraphics || !this.backgroundGraphics.scene) {
            this.backgroundGraphics = this.add.graphics();
            this.backgroundGraphics.setDepth(-10);
        } else {
            this.backgroundGraphics.clear();
        }
        this.renderBackground(worldWidth, worldHeight);

        const spawnPoint = this.levelConfig.playerStart;
        this.player = this.physics.add.sprite(spawnPoint.x, spawnPoint.y, 'chicken1');
        this.player.setBounce(0.2);
        this.player.setCollideWorldBounds(false);

        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

        const defaultDesktopInstructions = 'Space Chicken - WASD to move, Space to jump, M toggles music\nCollect the golden crown!';
        const defaultTouchInstructions = 'Space Chicken - Touch left half for left, right half for right\nTap jump to leap, tap the speaker to toggle music\nCollect the golden crown!';
        this.baseInstructions = this.levelConfig.instructions || defaultDesktopInstructions;
        this.touchInstructions = this.levelConfig.touchInstructions || defaultTouchInstructions;
        const referenceWidth = (this.scale && this.scale.width) ? this.scale.width : (this.sys.game.config.width || 800);
        const initialWrapWidth = Math.max(200, referenceWidth - 32);
        this.text = this.add.text(0, 0, '', { fontSize: '16px', fill: '#fff', wordWrap: { width: initialWrapWidth, useAdvancedWrap: true } });
        this.text.setScrollFactor(0);
        this.text.setDepth(10000);

        if (!this.musicToggleButton) {
            const toggleTexture = this.musicMuted ? 'musicToggleOff' : 'musicToggleOn';
            this.musicToggleButton = this.add.image(0, 0, toggleTexture);
            this.musicToggleButton.setScrollFactor(0);
            this.musicToggleButton.setDepth(10002);
            this.musicToggleButton.setAlpha(0.95);
            this.musicToggleButton.setInteractive({ useHandCursor: true });
            this.musicToggleButton.on('pointerdown', () => {
                if (this.musicToggleButton) {
                    this.musicToggleButton.setTint(0xcde6ff);
                }
            });
            this.musicToggleButton.on('pointerup', () => {
                if (this.musicToggleButton) {
                    this.musicToggleButton.clearTint();
                }
                this.toggleMusicMute();
            });
            this.musicToggleButton.on('pointerout', () => {
                if (this.musicToggleButton) {
                    this.musicToggleButton.clearTint();
                }
            });
        }
        this.updateMusicToggleVisual();

        if (!this.leaderboardButton) {
            this.leaderboardButton = this.add.text(0, 0, 'LB', {
                fontSize: '20px',
                fontFamily: 'monospace',
                fill: '#ffff00',
                backgroundColor: '#222222',
                align: 'center'
            });
            this.leaderboardButton.setOrigin(0.5, 0.5);
            this.leaderboardButton.setPadding(8, 4, 8, 4);
            this.leaderboardButton.setScrollFactor(0);
            this.leaderboardButton.setDepth(10002);
            this.leaderboardButton.setAlpha(0.95);
            this.leaderboardButton.setInteractive({ useHandCursor: true });
            this.leaderboardButton.on('pointerdown', () => {
                if (this.leaderboardButton) {
                    this.leaderboardButton.setStyle({ backgroundColor: '#555555' });
                }
            });
            this.leaderboardButton.on('pointerup', () => {
                this.toggleLeaderboardOverlay();
                this.refreshLeaderboardButtonStyle();
            });
            this.leaderboardButton.on('pointerout', () => {
                this.refreshLeaderboardButtonStyle();
            });
        }
        this.refreshLeaderboardButtonStyle();

        this.platforms = this.physics.add.staticGroup();
        this.buildStaticPlatforms(this.getNested(this.levelConfig, ['platforms', 'static'], []));
        this.buildFloorPlatforms(worldWidth, this.getNested(this.levelConfig, ['platforms', 'floor'], null));

        this.movingPlatforms = this.setupMovingPlatforms(this.getNested(this.levelConfig, ['platforms', 'moving'], []));

        this.hazards = this.physics.add.staticGroup();
        this.buildStaticHazards(this.getNested(this.levelConfig, ['hazards', 'rocks'], []));

        this.dynamicHazardsGroup = this.setupDynamicHazards(this.getNested(this.levelConfig, ['hazards', 'dynamic'], []));

        const crownPosition = this.levelConfig.crown;
        this.crown = this.physics.add.staticSprite(crownPosition.x, crownPosition.y, 'crown');

        if (this.shouldEnableTouchControls()) {
            this.enableTouchControls();
        }
        this.updateInstructionText();

        this.bombs = this.physics.add.group();
        this.bombSettings = this.levelConfig.bombs || {};

        const killZoneY = this.valueOrDefault(this.levelConfig.killZoneY, worldHeight - 80);
        const killZoneHeight = this.valueOrDefault(this.levelConfig.killZoneHeight, 20);
        this.killZoneY = killZoneY;
        const killZone = this.add.zone(0, killZoneY, worldWidth, killZoneHeight).setOrigin(0);
        this.physics.world.enable(killZone);
        killZone.body.setImmovable(true);
        killZone.body.setAllowGravity(false);
        killZone.body.moves = false;
        this.killZone = killZone;

        this.physics.add.collider(this.player, this.platforms);
        if (this.movingPlatforms) {
            this.physics.add.collider(this.player, this.movingPlatforms);
        }
        this.physics.add.overlap(this.player, this.hazards, this.hitHazard, null, this);
        if (this.dynamicHazardsGroup) {
            this.physics.add.overlap(this.player, this.dynamicHazardsGroup, this.hitHazard, null, this);
        }
        this.physics.add.overlap(this.player, this.crown, this.collectGem, null, this);
        this.physics.add.overlap(this.player, this.bombs, this.hitBomb, null, this);
        this.physics.add.overlap(this.player, killZone, this.hitKillZone, null, this);

        if (!this.anims.exists('chicken-walk')) {
            this.anims.create({
                key: 'chicken-walk',
                frames: [
                    { key: 'chicken1' },
                    { key: 'chicken2' },
                    { key: 'chicken3' },
                    { key: 'chicken4' }
                ],
                frameRate: 8,
                repeat: -1
            });
        }
        if (!this.anims.exists('chicken-jump')) {
            this.anims.create({
                key: 'chicken-jump',
                frames: [
                    { key: 'chicken_jump' }
                ],
                frameRate: 1,
                repeat: 0
            });
        }
        if (!this.anims.exists('chicken-jetpack')) {
            this.anims.create({
                key: 'chicken-jetpack',
                frames: [
                    { key: 'chicken_jetpack1' },
                    { key: 'chicken_jetpack2' }
                ],
                frameRate: 12,
                repeat: -1
            });
        }
        this.player.play('chicken-walk');

        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,S,A,D');
        this.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.muteKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);

        this.spawnBomb();

        this.setupAudioPipeline();
        this.setMusicMuted(this.musicMuted, { skipSave: true });

        this.scale.on('resize', this.handleResize, this);
        this.events.once('shutdown', () => {
            this.scale.off('resize', this.handleResize, this);
            this.cleanupAudio();
        });
        this.events.once('destroy', this.cleanupAudio, this);
        const initialWidth = this.getBaseWidth();
        const initialHeight = this.getBaseHeight();
        this.handleResize({ width: initialWidth, height: initialHeight });
    }

    enableTouchControls() {
        if (this.touchControlsEnabled) {
            return;
        }
        this.touchControlsEnabled = true;
        if (this.pointerTapTimes && typeof this.pointerTapTimes.clear === 'function') {
            this.pointerTapTimes.clear();
        }
        this.input.addPointer(2);

        if (!this.jumpButton) {
            this.jumpButton = this.add.image(0, 0, 'jumpBtn');
            this.jumpButton.setScrollFactor(0);
            this.jumpButton.setDepth(10001);
            this.jumpButton.setAlpha(0.85);
            this.jumpButton.setInteractive({ useHandCursor: false });
            this.jumpButton.on('pointerdown', this.onJumpButtonDown, this);
            this.jumpButton.on('pointerup', this.onJumpButtonUp, this);
            this.jumpButton.on('pointerout', this.onJumpButtonUp, this);
            this.jumpButton.on('pointerupoutside', this.onJumpButtonUp, this);
            this.jumpButton.on('pointercancel', this.onJumpButtonUp, this);
        }
        this.layoutTouchControls();
    }

    onJumpButtonDown(pointer) {
        this.jumpPointerId = pointer.id;
        this.jumpRequested = true;
        if (this.jumpButton) {
            this.jumpButton.setTint(0x99ff99);
        }
    }

    onJumpButtonUp(pointer) {
        if (!pointer || pointer.id === this.jumpPointerId) {
            this.jumpPointerId = null;
        }
        if (this.jumpButton) {
            this.jumpButton.clearTint();
        }
    }

    updateInstructionText() {
        if (!this.text) {
            return;
        }
        const instructions = this.touchControlsEnabled ? this.touchInstructions : this.baseInstructions;
        this.text.setText(instructions);
        this.layoutOverlay();
    }

    handleResize(gameSize) {
        const fallbackWidth = this.getBaseWidth();
        const fallbackHeight = this.getBaseHeight();
        const width = (gameSize && gameSize.width) ? gameSize.width : fallbackWidth;
        const height = (gameSize && gameSize.height) ? gameSize.height : fallbackHeight;

        this.viewportWidth = width;
        this.viewportHeight = height;
        this.safeAreaInsets = this.getSafeAreaInsets();

        this.layoutOverlay();
        this.layoutTouchControls();
        this.layoutLeaderboard();
    }

    getSafeAreaInsets() {
        if (typeof window === 'undefined' || !window.getComputedStyle) {
            return { top: 0, right: 0, bottom: 0, left: 0 };
        }
        const styles = getComputedStyle(document.documentElement);
        const parseInset = (prop) => {
            const value = styles.getPropertyValue(prop);
            const parsed = parseFloat(value);
            return Number.isFinite(parsed) ? parsed : 0;
        };
        return {
            top: parseInset('--safe-area-top'),
            right: parseInset('--safe-area-right'),
            bottom: parseInset('--safe-area-bottom'),
            left: parseInset('--safe-area-left')
        };
    }

    layoutOverlay() {
        if (!this.timerText || !this.levelText || !this.text) {
            return;
        }
        const insets = this.safeAreaInsets || { top: 0, right: 0, bottom: 0, left: 0 };
        const width = this.getViewportWidth();
        const padding = 16;
        const availableWidth = Math.max(160, width - insets.left - insets.right - padding * 2);
        this.timerText.setPosition(insets.left + padding, insets.top + padding);
        this.levelText.setPosition(insets.left + padding, this.timerText.y + this.timerText.height + 8);
        this.text.setWordWrapWidth(availableWidth, true);
        this.text.setPosition(insets.left + padding, this.levelText.y + this.levelText.height + 8);
        if (this.musicToggleButton) {
            const buttonPadding = 16;
            const buttonHalfWidth = this.musicToggleButton.displayWidth * 0.5;
            const buttonX = width - insets.right - buttonPadding - buttonHalfWidth;
            const buttonY = insets.top + buttonPadding + buttonHalfWidth;
            this.musicToggleButton.setPosition(buttonX, buttonY);
        }
        if (this.leaderboardButton) {
            const buttonPadding = 16;
            const buttonHalfWidth = this.leaderboardButton.displayWidth * 0.5;
            const buttonHalfHeight = this.leaderboardButton.displayHeight * 0.5;
            let buttonX = width - insets.right - buttonPadding - buttonHalfWidth;
            if (this.musicToggleButton) {
                const musicHalfWidth = this.musicToggleButton.displayWidth * 0.5;
                buttonX = this.musicToggleButton.x - musicHalfWidth - buttonPadding - buttonHalfWidth;
            }
            const buttonY = insets.top + buttonPadding + buttonHalfHeight;
            this.leaderboardButton.setPosition(buttonX, buttonY);
        }
    }

    layoutTouchControls() {
        if (!this.jumpButton) {
            const width = this.getViewportWidth();
            this.touchMovementMidpoint = width / 2;
            return;
        }
        const insets = this.safeAreaInsets || { top: 0, right: 0, bottom: 0, left: 0 };
        const width = this.getViewportWidth();
        const height = this.getViewportHeight();
        const margin = 24;
        const buttonX = width - insets.right - (this.jumpButton.displayWidth / 2) - margin;
        const buttonY = height - insets.bottom - (this.jumpButton.displayHeight / 2) - margin;
        this.jumpButton.setPosition(buttonX, buttonY);
        this.touchMovementMidpoint = insets.left + (width - insets.left - insets.right) / 2;
    }

    layoutLeaderboard() {
        if (!this.leaderboardTextObject) {
            return;
        }
        const insets = this.safeAreaInsets || { top: 0, right: 0, bottom: 0, left: 0 };
        const width = this.getViewportWidth();
        const availableWidth = Math.max(220, width - insets.left - insets.right - 32);
        this.leaderboardTextObject.setWordWrapWidth(availableWidth, true);
        const centerX = insets.left + (width - insets.left - insets.right) / 2;
        const top = Math.max(insets.top + 80, this.text ? this.text.y + this.text.height + 24 : insets.top + 80);
        this.leaderboardTextObject.setPosition(centerX, top);
    }

    checkStorageAvailability() {
        if (typeof window === 'undefined' || !window.localStorage) {
            return false;
        }
        const testKey = '__space_chicken_storage_test__';
        try {
            window.localStorage.setItem(testKey, '1');
            window.localStorage.removeItem(testKey);
            return true;
        } catch (err) {
            return false;
        }
    }

    readLeaderboard(key) {
        if (!this.storageAvailable || typeof window === 'undefined' || !window.localStorage) {
            return [];
        }
        try {
            const raw = window.localStorage.getItem(key);
            if (!raw) {
                return [];
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return [];
            }
            return parsed.map(entry => {
                if (typeof entry === 'number') {
                    return { time: entry, name: 'Anonymous' };
                }
                if (entry && typeof entry.time === 'number') {
                    const name = typeof entry.name === 'string' ? entry.name.trim() : '';
                    return {
                        time: entry.time,
                        name: name.length ? name : 'Anonymous'
                    };
                }
                return null;
            }).filter(Boolean);
        } catch (err) {
            this.storageAvailable = false;
            return [];
        }
    }

    writeLeaderboard(key, data) {
        if (!this.storageAvailable || typeof window === 'undefined' || !window.localStorage) {
            return;
        }
        try {
            const payload = Array.isArray(data) ? data.map(entry => {
                if (!entry || typeof entry.time !== 'number') {
                    return null;
                }
                const name = typeof entry.name === 'string' ? entry.name.trim() : '';
                return {
                    time: entry.time,
                    name: name.length ? name : 'Anonymous'
                };
            }).filter(Boolean) : [];
            window.localStorage.setItem(key, JSON.stringify(payload));
        } catch (err) {
            this.storageAvailable = false;
        }
    }

    loadPlayerName() {
        if (!this.storageAvailable || typeof window === 'undefined' || !window.localStorage) {
            return null;
        }
        try {
            const stored = window.localStorage.getItem('spaceChickenPlayerName');
            if (!stored) {
                return null;
            }
            const trimmed = stored.trim();
            return trimmed.length ? trimmed : null;
        } catch (err) {
            return null;
        }
    }

    savePlayerName(name) {
        if (!this.storageAvailable || typeof window === 'undefined' || !window.localStorage) {
            return;
        }
        try {
            window.localStorage.setItem('spaceChickenPlayerName', name);
        } catch (err) {
            // Ignore persistence errors for player name
        }
    }

    ensurePlayerName(forcePrompt = false) {
        let current = this.playerName;
        if (!forcePrompt && current) {
            return current;
        }
        const currentTrimmed = typeof current === 'string' ? current.trim() : '';
        if (typeof window === 'undefined' || typeof window.prompt !== 'function') {
            const fallback = currentTrimmed || 'Anonymous';
            this.playerName = fallback;
            return fallback;
        }
        const defaultValue = currentTrimmed;
        const response = window.prompt('Enter your name for the leaderboard:', defaultValue);
        let finalName;
        if (response === null) {
            finalName = currentTrimmed;
        } else {
            finalName = response.trim();
        }
        if (!finalName) {
            finalName = currentTrimmed || 'Anonymous';
        }
        this.playerName = finalName;
        this.savePlayerName(finalName);
        return finalName;
    }

    attemptJump() {
        if (this.gameOver || this.jumpCount >= this.maxJumps) {
            return;
        }
        this.player.setVelocityY(-330);
        this.jumpCount += 1;
        if (this.jumpCount === 2) {
            this.isJetpacking = true;
            this.player.play('chicken-jetpack', true);
            this.playJetpackSound();
        } else {
            this.isJetpacking = false;
            this.player.play('chicken-jump', true);
            this.playJumpSound();
        }
    }


    buildStaticPlatforms(platformConfigs) {
        if (!platformConfigs || platformConfigs.length === 0) {
            return;
        }
        platformConfigs.forEach(config => {
            const key = config.key || 'cliff';
            const platform = this.platforms.create(config.x, config.y, key);
            const scaleX = this.valueOrDefault(config.scaleX, 1);
            const scaleY = this.valueOrDefault(config.scaleY, 1);
            if (scaleX !== 1 || scaleY !== 1) {
                platform.setScale(scaleX, scaleY);
                platform.refreshBody();
            }
            if (config.angle !== undefined && config.angle !== null) {
                platform.setAngle(config.angle);
                platform.refreshBody();
            }
        });
    }

    buildFloorPlatforms(worldWidth, floorConfig) {
        if (!floorConfig) {
            return;
        }
        const step = this.valueOrDefault(floorConfig.step, 100);
        const key = floorConfig.key || 'cliff';
        const scaleX = this.valueOrDefault(floorConfig.scaleX, 1);
        const scaleY = this.valueOrDefault(floorConfig.scaleY, 1);
        if (Array.isArray(floorConfig.segments) && floorConfig.segments.length) {
            floorConfig.segments.forEach(segment => {
                const startX = segment[0];
                const endX = segment[1];
                for (let x = startX; x <= endX; x += step) {
                    const platform = this.platforms.create(x, floorConfig.y, key);
                    if (scaleX !== 1 || scaleY !== 1) {
                        platform.setScale(scaleX, scaleY);
                        platform.refreshBody();
                    }
                }
            });
            return;
        }
        const startX = this.valueOrDefault(floorConfig.start, 0);
            for (let x = startX; x < worldWidth; x += step) {
            const shouldPlace = typeof floorConfig.condition === 'function' ? floorConfig.condition(x, worldWidth) : true;
            if (!shouldPlace) {
                continue;
            }
            const platform = this.platforms.create(x, floorConfig.y, key);
            if (scaleX !== 1 || scaleY !== 1) {
                platform.setScale(scaleX, scaleY);
                platform.refreshBody();
            }
        }
    }

    setupMovingPlatforms(movingConfigs) {
        if (!movingConfigs || movingConfigs.length === 0) {
            return null;
        }
        const group = this.physics.add.group({ allowGravity: false });
        movingConfigs.forEach(config => {
            const platform = group.create(config.x, config.y, config.key || 'cliff');
            platform.setImmovable(true);
            platform.body.allowGravity = false;
            platform.setPushable(false);

            if (config.origin) {
                const originX = this.valueOrDefault(config.origin.x, 0.5);
                const originY = this.valueOrDefault(config.origin.y, 0.5);
                platform.setOrigin(originX, originY);
            }

            if (config.flipX) {
                platform.setFlipX(true);
            }

            const scaleX = this.valueOrDefault(config.scaleX, 1);
            const scaleY = this.valueOrDefault(config.scaleY, 1);
            if (scaleX !== 1 || scaleY !== 1) {
                platform.setScale(scaleX, scaleY);
            }

            const bodySize = config.bodySize || {};
            const bodyWidth = this.valueOrDefault(bodySize.width, platform.displayWidth);
            const bodyHeight = this.valueOrDefault(bodySize.height, platform.displayHeight);
            platform.body.setSize(bodyWidth, bodyHeight, true);

            if (config.bodyOffset) {
                const offsetX = this.valueOrDefault(config.bodyOffset.x, platform.body.offset.x);
                const offsetY = this.valueOrDefault(config.bodyOffset.y, platform.body.offset.y);
                platform.body.setOffset(offsetX, offsetY);
            }

            if (config.tween) {
                const tweenConfig = Object.assign({ targets: platform }, config.tween);
                if (!Object.prototype.hasOwnProperty.call(tweenConfig, 'yoyo')) {
                    tweenConfig.yoyo = true;
                }
                if (!Object.prototype.hasOwnProperty.call(tweenConfig, 'repeat')) {
                    tweenConfig.repeat = -1;
                }
                if (!Object.prototype.hasOwnProperty.call(tweenConfig, 'ease')) {
                    tweenConfig.ease = 'Sine.easeInOut';
                }
                this.tweens.add(tweenConfig);
            }

            if (config.pathVelocity) {
                const velocityX = this.valueOrDefault(config.pathVelocity.x, 0);
                const velocityY = this.valueOrDefault(config.pathVelocity.y, 0);
                platform.body.setVelocity(velocityX, velocityY);
            }
        });
        return group;
    }

    buildStaticHazards(rockConfigs) {
        if (!rockConfigs || rockConfigs.length === 0) {
            return;
        }
        rockConfigs.forEach(config => {
            const hazard = this.hazards.create(config.x, config.y, config.key || 'rock');
            const scaleX = this.valueOrDefault(config.scaleX, 1);
            const scaleY = this.valueOrDefault(config.scaleY, 1);
            if (scaleX !== 1 || scaleY !== 1) {
                hazard.setScale(scaleX, scaleY);
                hazard.refreshBody();
            }
        });
    }

    setupDynamicHazards(dynamicConfigs) {
        if (this.dynamicHazardEvents) {
            this.dynamicHazardEvents.forEach(event => event.remove());
        }
        this.dynamicHazardEvents = [];

        if (!dynamicConfigs || dynamicConfigs.length === 0) {
            return null;
        }
        const group = this.physics.add.group({ allowGravity: false });
        dynamicConfigs.forEach(config => {
            switch (config.type) {
                case 'laser':
                    this.createLaserHazard(group, config);
                    break;
                case 'drone':
                    this.createDroneHazard(group, config);
                    break;
                default:
                    const hazard = group.create(config.x, config.y, config.key || 'rock');
                    hazard.body.allowGravity = false;
                    hazard.setImmovable(true);
                    const scaleX = this.valueOrDefault(config.scaleX, 1);
                    const scaleY = this.valueOrDefault(config.scaleY, 1);
                    if (scaleX !== 1 || scaleY !== 1) {
                        hazard.setScale(scaleX, scaleY);
                    }
                    if (config.tween) {
                        const tweenConfig = Object.assign({ targets: hazard }, config.tween);
                        if (!Object.prototype.hasOwnProperty.call(tweenConfig, 'yoyo')) {
                            tweenConfig.yoyo = true;
                        }
                        if (!Object.prototype.hasOwnProperty.call(tweenConfig, 'repeat')) {
                            tweenConfig.repeat = -1;
                        }
                        if (!Object.prototype.hasOwnProperty.call(tweenConfig, 'ease')) {
                            tweenConfig.ease = 'Sine.easeInOut';
                        }
                        this.tweens.add(tweenConfig);
                    }
                    if (config.velocity) {
                        const velocityX = this.valueOrDefault(config.velocity.x, 0);
                        const velocityY = this.valueOrDefault(config.velocity.y, 0);
                        hazard.setVelocity(velocityX, velocityY);
                    }
                    break;
            }
        });
        return group;
    }

    createLaserHazard(group, config) {
        const orientation = config.orientation || 'horizontal';
        const length = this.valueOrDefault(config.length, 200);
        const width = this.valueOrDefault(config.width, 10);
        const beamTexture = config.key || 'laserBeam';
        const beam = group.create(config.x, config.y, beamTexture);
        beam.body.allowGravity = false;
        beam.setImmovable(true);
        beam.setBlendMode(Phaser.BlendModes.ADD);
        const depth = this.valueOrDefault(config.depth, 6);
        beam.setDepth(depth);

        if (orientation === 'horizontal') {
            beam.setDisplaySize(length, width);
            beam.setAngle(0);
        } else {
            beam.setDisplaySize(width, length);
            beam.setAngle(90);
        }
        const hitHeight = Math.max(2, Math.round(width * 0.6));
        beam.body.setSize(beam.displayWidth, hitHeight, true);
        const verticalOffset = orientation === 'horizontal' ? (width - hitHeight) * 0.5 : 0;
        beam.body.setOffset(0, verticalOffset);

        const startActive = this.valueOrDefault(config.initiallyActive, true);
        const setState = (state) => {
            beam.body.enable = state;
            beam.setActive(state);
            beam.setVisible(state);
        };
        setState(startActive);

        if (config.emitter !== false) {
            const emitterKey = config.emitterKey || 'laserEmitter';
            const halfLength = length * 0.5;
            const offsetX = orientation === 'horizontal' ? halfLength : 0;
            const offsetY = orientation === 'horizontal' ? 0 : halfLength;
            const emitterStart = this.add.image(config.x - offsetX, config.y - offsetY, emitterKey);
            const emitterEnd = this.add.image(config.x + offsetX, config.y + offsetY, emitterKey);
            if (orientation === 'vertical') {
                emitterStart.setAngle(90);
                emitterEnd.setAngle(90);
            }
            const emitterDepth = depth - 1;
            emitterStart.setDepth(emitterDepth);
            emitterEnd.setDepth(emitterDepth);
        }

        const onDuration = this.valueOrDefault(config.onDuration, 1200);
        const offDuration = this.valueOrDefault(config.offDuration, 900);
        const startDelay = this.valueOrDefault(config.startDelay, 0);

        const scheduleCycle = (state, delay) => {
            const event = this.time.delayedCall(delay, () => {
                Phaser.Utils.Array.Remove(this.dynamicHazardEvents, event);
                const nextState = !state;
                setState(nextState);
                scheduleCycle(nextState, nextState ? onDuration : offDuration);
            });
            this.dynamicHazardEvents.push(event);
        };

        const starter = this.time.delayedCall(startDelay, () => {
            Phaser.Utils.Array.Remove(this.dynamicHazardEvents, starter);
            scheduleCycle(startActive, startActive ? onDuration : offDuration);
        });
        this.dynamicHazardEvents.push(starter);
    }

    createDroneHazard(group, config) {
        const drone = group.create(config.x, config.y, config.key || 'drone');
        drone.body.allowGravity = false;
        drone.setImmovable(true);
        const scale = this.valueOrDefault(config.scale, 1);
        if (scale !== 1) {
            drone.setScale(scale);
        }
        const radius = config.radius !== undefined ? config.radius : Math.max(8, Math.round(drone.displayWidth * 0.25));
        drone.body.setCircle(radius, drone.displayWidth * 0.5 - radius, drone.displayHeight * 0.5 - radius);
        drone.setDepth(this.valueOrDefault(config.depth, 7));

        if (config.patrol) {
            const patrolConfig = Object.assign({ targets: drone }, config.patrol);
            if (!Object.prototype.hasOwnProperty.call(patrolConfig, 'yoyo')) {
                patrolConfig.yoyo = true;
            }
            if (!Object.prototype.hasOwnProperty.call(patrolConfig, 'repeat')) {
                patrolConfig.repeat = -1;
            }
            if (!Object.prototype.hasOwnProperty.call(patrolConfig, 'ease')) {
                patrolConfig.ease = 'Sine.easeInOut';
            }
            this.tweens.add(patrolConfig);
        }

        if (config.bobAmplitude !== undefined && config.bobAmplitude !== null) {
            this.tweens.add({
                targets: drone,
                y: drone.y - config.bobAmplitude,
                duration: this.valueOrDefault(config.bobDuration, 1000),
                yoyo: true,
                repeat: -1,
                ease: config.bobEase || 'Sine.easeInOut',
                delay: this.valueOrDefault(config.bobDelay, 0)
            });
        }

        if (config.spin) {
            const spinConfig = typeof config.spin === 'object' ? Object.assign({}, config.spin) : { angle: config.spin };
            if (typeof spinConfig.angle === 'number') {
                const angle = spinConfig.angle;
                this.tweens.add({
                    targets: drone,
                    angle: { from: -angle, to: angle },
                    duration: this.valueOrDefault(spinConfig.duration, 1600),
                    yoyo: true,
                    repeat: -1,
                    ease: spinConfig.ease || 'Sine.easeInOut'
                });
            } else {
                this.tweens.add({
                    targets: drone,
                    angle: spinConfig.angle || { from: -10, to: 10 },
                    duration: this.valueOrDefault(spinConfig.duration, 1600),
                    yoyo: true,
                    repeat: -1,
                    ease: spinConfig.ease || 'Sine.easeInOut'
                });
            }
        }
    }

    renderBackground(worldWidth, worldHeight) {
        const background = this.levelConfig.background || {};
        const layoutKey = `${this.level}:${background.type || 'space'}`;
            let layoutCache = this.constructor.backgroundLayouts;
        if (!layoutCache) {
            layoutCache = this.constructor.backgroundLayouts = new Map();
        }
            let backgroundLayout = layoutCache.get(layoutKey);
        if (!backgroundLayout) {
            if (background.type === 'station') {
                backgroundLayout = this.createStationBackgroundLayout(background, worldWidth, worldHeight);
            } else {
                backgroundLayout = this.createSpaceBackgroundLayout(background, worldWidth, worldHeight);
            }
            layoutCache.set(layoutKey, backgroundLayout);
        }

        const baseColor = this.valueOrDefault(background.color, 0x000000);
        this.backgroundGraphics.fillStyle(baseColor).fillRect(0, 0, worldWidth, worldHeight);

        (backgroundLayout.stars || []).forEach(star => {
            const starColor = this.valueOrDefault(star.color, 0xffffff);
            this.backgroundGraphics.fillStyle(starColor).fillCircle(star.x, star.y, star.size);
        });

        (backgroundLayout.planets || []).forEach(planet => {
            this.backgroundGraphics.fillStyle(planet.color).fillCircle(planet.x, planet.y, planet.size);
        });

        (backgroundLayout.structures || []).forEach(structure => {
            const structureFill = this.valueOrDefault(structure.fill, 0x333333);
            this.backgroundGraphics.fillStyle(structureFill).fillRect(structure.x, structure.y, structure.width, structure.height);
            if (structure.stroke) {
                const strokeWidth = this.valueOrDefault(structure.stroke.width, 1);
                const strokeColor = this.valueOrDefault(structure.stroke.color, 0xffffff);
                const strokeAlpha = this.valueOrDefault(structure.stroke.alpha, 1);
                this.backgroundGraphics.lineStyle(strokeWidth, strokeColor, strokeAlpha);
                this.backgroundGraphics.strokeRect(structure.x, structure.y, structure.width, structure.height);
            }
        });
    }

    createSpaceBackgroundLayout(background, worldWidth, worldHeight) {
        const starCount = this.valueOrDefault(background.starCount, 100);
        const stars = [];
            for (let i = 0; i < starCount; i++) {
            stars.push({
                x: Phaser.Math.Between(0, worldWidth),
                y: Phaser.Math.Between(0, worldHeight),
                size: Phaser.Math.Between(1, 3),
                color: 0xffffff
            });
        }

        const defaultPlanets = [
            { color: 0x004488, size: 50 },
            { color: 0x884400, size: 40 },
            { color: 0x440088, size: 30 },
            { color: 0x448800, size: 60 },
            { color: 0x888844, size: 45 },
            { color: 0x880044, size: 55 },
            { color: 0x008844, size: 35 },
            { color: 0x444488, size: 70 }
        ];
        const planetTemplates = background.planetTemplates || defaultPlanets;
        const planetCount = this.valueOrDefault(background.planetCount, 5);
        const planets = [];
            for (let i = 0; i < planetCount; i++) {
            const template = planetTemplates[i % planetTemplates.length];
            const x = Phaser.Math.Between(300, Math.max(300, worldWidth - 300));
            const y = Phaser.Math.Between(50, Math.max(50, worldHeight - 200));
            planets.push({ x, y, color: template.color, size: template.size });
        }

        return { stars, planets };
    }

    createStationBackgroundLayout(background, worldWidth, worldHeight) {
        const stars = [];
        const starCount = this.valueOrDefault(background.starCount, 80);
            for (let i = 0; i < starCount; i++) {
            stars.push({
                x: Phaser.Math.Between(0, worldWidth),
                y: Phaser.Math.Between(0, worldHeight),
                size: Phaser.Math.Between(1, 2),
                color: 0x9fb7ff
            });
        }

        const structures = [];
        const moduleStride = 260;
        const moduleCount = Math.ceil(worldWidth / moduleStride) + 1;
            for (let i = 0; i < moduleCount; i++) {
            const width = Phaser.Math.Between(180, 260);
            const height = Phaser.Math.Between(140, 220);
            const x = i * moduleStride + Phaser.Math.Between(-20, 40);
            const y = Phaser.Math.Between(80, Math.max(120, worldHeight - height - 160));
            structures.push({
                x,
                y,
                width,
                height,
                fill: 0x1d2333,
                stroke: { width: 2, color: 0x3b455d, alpha: 0.9 }
            });

            const windowRows = Phaser.Math.Between(2, 3);
            const windowsPerRow = Math.max(3, Math.floor(width / 40));
            for (let row = 0; row < windowRows; row++) {
                const windowY = y + 20 + row * 50;
                for (let col = 0; col < windowsPerRow; col++) {
                    const windowX = x + 16 + col * 32;
                    const lightColor = Phaser.Math.Between(0, 1) ? 0x78c0ff : 0xffe066;
                    structures.push({
                        x: windowX,
                        y: windowY,
                        width: 20,
                        height: 10,
                        fill: lightColor
                    });
                }
            }
        }

        const planets = background.disablePlanet ? [] : [{
            x: worldWidth - 160,
            y: 140,
            color: 0x142441,
            size: 80
        }];

        return { stars, planets, structures };
    }


    getLevelConfig(level) {
        const defaultInstructions = 'Space Chicken - WASD to move, Space to jump, M toggles music\nCollect the golden crown!';
        const defaultTouchInstructions = 'Space Chicken - Touch left half for left, right half for right\nTap jump to leap, tap the speaker to toggle music\nCollect the golden crown!';

            let config;
        switch (level) {
            case 1:
                config = {
                    gravity: 300,
                    maxJumps: 2,
                    nextLevel: 2,
                    world: { width: 2000, height: 700 },
                    killZoneY: 620,
                    killZoneHeight: 20,
                    playerStart: { x: 100, y: 450 },
                    instructions: defaultInstructions,
                    touchInstructions: defaultTouchInstructions,
                    background: { type: 'space', starCount: 100, planetCount: 5, color: 0x000000 },
                    platforms: {
                        static: [
                            { x: 400, y: 568 },
                            { x: 800, y: 500 },
                            { x: 1200, y: 400 }
                        ],
                        floor: {
                            y: 580,
                            step: 100,
                            scaleX: 1.5,
                            scaleY: 0.3,
                            condition: (x) => x < 350 || (x > 450 && x < 650) || (x > 750 && x < 950) || x > 1050
                        },
                        moving: []
                    },
                    hazards: {
                        rocks: [
                            { x: 600, y: 568 },
                            { x: 1000, y: 568 }
                        ],
                        dynamic: []
                    },
                    crown: { x: 1800, y: 350 },
                    bombs: {
                        speed: 150,
                        delayMin: 1000,
                        delayMax: 5000,
                        spawnHeight: -50,
                        spread: Math.PI / 6
                    }
                };
                break;
            case 2:
                config = {
                    gravity: 400,
                    maxJumps: 2,
                    nextLevel: 3,
                    world: { width: 3000, height: 700 },
                    killZoneY: 620,
                    killZoneHeight: 20,
                    playerStart: { x: 100, y: 450 },
                    instructions: defaultInstructions,
                    touchInstructions: defaultTouchInstructions,
                    background: { type: 'space', starCount: 150, planetCount: 8, color: 0x000000 },
                    platforms: {
                        static: [
                            { x: 400, y: 568 },
                            { x: 800, y: 500 },
                            { x: 1200, y: 400 },
                            { x: 1600, y: 300 },
                            { x: 2000, y: 200 },
                            { x: 2400, y: 400 },
                            { x: 2800, y: 500 }
                        ],
                        floor: {
                            y: 580,
                            step: 100,
                            scaleX: 1.5,
                            scaleY: 0.3,
                            condition: (x) => x < 350 || (x > 450 && x < 550) || (x > 650 && x < 750) || (x > 850 && x < 1050) || (x > 1150 && x < 1350) || (x > 1450 && x < 1650) || (x > 1750 && x < 1950) || x > 2050
                        },
                        moving: []
                    },
                    hazards: {
                        rocks: [
                            { x: 600, y: 568 },
                            { x: 1000, y: 568 },
                            { x: 1400, y: 568 },
                            { x: 1800, y: 568 },
                            { x: 2200, y: 568 }
                        ],
                        dynamic: []
                    },
                    crown: { x: 2800, y: 350 },
                    bombs: {
                        speed: 200,
                        delayMin: 500,
                        delayMax: 2000,
                        spawnHeight: -50,
                        spread: Math.PI / 6
                    }
                };
                break;
            case 3:
                config = {
                    gravity: 260,
                    maxJumps: 2,
                    nextLevel: null,
                    world: { width: 2200, height: 900 },
                    killZoneY: 860,
                    killZoneHeight: 40,
                    playerStart: { x: 200, y: 760 },
                    instructions: 'Orbital Gauntlet - Ride the lifts, dodge lasers, claim the crown! (Press M to toggle music)',
                    touchInstructions: 'Orbital Gauntlet - Tap left/right halves to move, use the jump button to leap. Tap the speaker to toggle music.',
                    background: { type: 'station', starCount: 110, planetCount: 1, color: 0x050914 },
                    platforms: {
                        static: [
                            { x: 220, y: 780, key: 'stationPanel', scaleX: 2.4, scaleY: 0.4 },
                            { x: 520, y: 690, key: 'stationPanel', scaleX: 1.6, scaleY: 0.4 },
                            { x: 960, y: 560, key: 'stationPanel', scaleX: 1.6, scaleY: 0.4 },
                            { x: 1440, y: 430, key: 'stationPanel', scaleX: 1.6, scaleY: 0.4 },
                            { x: 1920, y: 320, key: 'stationPanel', scaleX: 1.2, scaleY: 0.4 }
                        ],
                        floor: null,
                        moving: [
                            { x: 320, y: 780, key: 'liftPlatform', scaleX: 1.2, scaleY: 0.4, tween: { y: 640, duration: 2200 } },
                            { x: 760, y: 640, key: 'liftPlatform', scaleX: 1.2, scaleY: 0.4, tween: { y: 500, duration: 2400, delay: 300 } },
                            { x: 1180, y: 500, key: 'liftPlatform', scaleX: 1.2, scaleY: 0.4, tween: { x: 1380, duration: 2600 } },
                            { x: 1680, y: 360, key: 'liftPlatform', scaleX: 1.2, scaleY: 0.4, tween: { y: 260, duration: 2000, delay: 500 } }
                        ]
                    },
                    hazards: {
                        rocks: [],
                        dynamic: [
                            { type: 'laser', x: 520, y: 650, length: 260, width: 12, onDuration: 1300, offDuration: 900, startDelay: 400 },
                            { type: 'laser', x: 1420, y: 460, length: 320, width: 12, onDuration: 1200, offDuration: 1000, startDelay: 0 },
                            { type: 'laser', x: 1760, y: 320, length: 220, width: 10, orientation: 'vertical', onDuration: 900, offDuration: 900, startDelay: 600 },
                            { type: 'drone', x: 900, y: 520, patrol: { x: 1120, duration: 2600, ease: 'Sine.easeInOut' }, bobAmplitude: 18, bobDuration: 800, spin: 6 },
                            { type: 'drone', x: 1550, y: 360, patrol: { x: 1770, duration: 2200, ease: 'Sine.easeInOut', delay: 400 }, bobAmplitude: 22, bobDuration: 900, spin: { angle: 12, duration: 1800 } }
                        ]
                    },
                    crown: { x: 2050, y: 220 },
                    bombs: {
                        speed: 260,
                        delayMin: 350,
                        delayMax: 1400,
                        spawnHeight: -100,
                        spread: Math.PI / 10
                    }
                };
                break;
            default:
                return this.getLevelConfig(1);
        }

        return config;
    }




    update() {
            // World bounds for cleanup
        const worldWidth = this.worldWidth !== undefined ? this.worldWidth : this.getNested(this.levelConfig, ['world', 'width'], 2000);
        const worldHeight = this.worldHeight !== undefined ? this.worldHeight : this.getNested(this.levelConfig, ['world', 'height'], 700);

            // Update timer
        if (!this.physics.world.isPaused) {
            let elapsed = performance.now() - this.startTime;
            let minutes = Math.floor(elapsed / 60000);
            let seconds = Math.floor((elapsed % 60000) / 1000);
            let milliseconds = Math.floor((elapsed % 1000) / 10); // for 2 decimal places in ms
            this.timerText.setText(`Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`);
        }

        const spaceJustPressed = Phaser.Input.Keyboard.JustDown(this.space);
        const upJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up);
        const wJustPressed = Phaser.Input.Keyboard.JustDown(this.wasd.W);
        const keyboardJumpTriggered = upJustPressed || spaceJustPressed || wJustPressed;

        if (this.muteKey && Phaser.Input.Keyboard.JustDown(this.muteKey)) {
            this.toggleMusicMute();
        }

        if (this.gameOver) {
            if (this.restartDelayDone && (spaceJustPressed || this.jumpRequested)) {
                this.jumpRequested = false;
                this.scene.restart({ level: 1, deathCount: 0 });
            } else {
                this.jumpRequested = false;
            }
            return;
        }

            // Mobile touch controls
        const activePointers = this.getActivePointers();

        if (this.jumpPointerId !== null) {
            const jumpPointer = activePointers.find(pointer => pointer.id === this.jumpPointerId);
            if (!jumpPointer || !jumpPointer.isDown) {
                this.jumpPointerId = null;
            }
        }

        this.leftPressed = false;
        this.rightPressed = false;
        let doubleTapJumpTriggered = false;
        const movementMidpoint = this.touchMovementMidpoint || (this.viewportWidth ? this.viewportWidth / 2 : this.cameras.main.width / 2);
        activePointers.forEach(pointer => {
            const pointerX = (typeof pointer.x === 'number') ? pointer.x : pointer.worldX;
            const pointerY = (typeof pointer.y === 'number') ? pointer.y : pointer.worldY;
            const hasCoordinates = typeof pointerX === 'number' && typeof pointerY === 'number';
            const isOnJumpButton = hasCoordinates && this.isPointerOverGameObject(pointerX, pointerY, this.jumpButton);
            const isOnMusicToggle = hasCoordinates && this.isPointerOverGameObject(pointerX, pointerY, this.musicToggleButton);
            const isOnLeaderboardButton = hasCoordinates && this.isPointerOverGameObject(pointerX, pointerY, this.leaderboardButton);
            const pointerEligibleForDoubleTap = !isOnJumpButton && !isOnMusicToggle && !isOnLeaderboardButton;

            if (pointer.justUp) {
                const upTime = (typeof pointer.upTime === 'number' && pointer.upTime > 0) ? pointer.upTime : performance.now();
                if (this.touchControlsEnabled && hasCoordinates && pointerEligibleForDoubleTap) {
                    const lastTapTime = this.pointerTapTimes.has(pointer.id) ? this.pointerTapTimes.get(pointer.id) : 0;
                    if (lastTapTime > 0 && (upTime - lastTapTime) <= this.doubleTapThreshold) {
                        doubleTapJumpTriggered = true;
                    }
                }
                if (this.pointerTapTimes) {
                    if (pointerEligibleForDoubleTap) {
                        this.pointerTapTimes.set(pointer.id, upTime);
                    } else {
                        this.pointerTapTimes.delete(pointer.id);
                    }
                }
            }

            if (!pointer.isDown) {
                return;
            }
            if (this.jumpPointerId !== null && pointer.id === this.jumpPointerId) {
                return;
            }
            if (!hasCoordinates) {
                return;
            }
            if (pointerX < movementMidpoint) {
                this.leftPressed = true;
            } else {
                this.rightPressed = true;
            }
        });

        const isGrounded = this.player.body.blocked.down || this.player.body.touching.down;
        if (isGrounded) {
            this.jumpCount = 0;
            this.isJetpacking = false;
        }

            // Jump detection fallback for pointer taps when no jump button
        const pointerJumpTriggered = !this.jumpButton && activePointers.some(pointer => {
            if (this.jumpPointerId !== null && pointer.id === this.jumpPointerId) {
                return false;
            }
            if (!pointer.justUp) {
                return false;
            }
            const downTime = (typeof pointer.downTime === 'number') ? pointer.downTime : 0;
            const upTime = (typeof pointer.upTime === 'number') ? pointer.upTime : downTime + 201;
            return (upTime - downTime) < 200;
        });

        if (keyboardJumpTriggered) {
            this.attemptJump();
        }

        if (pointerJumpTriggered) {
            this.attemptJump();
        }

        if (doubleTapJumpTriggered) {
            this.attemptJump();
        }

        if (this.jumpRequested) {
            this.attemptJump();
            this.jumpRequested = false;
        }

            // Movement
            let velocityX = 0;
        if (this.cursors.left.isDown || this.wasd.A.isDown || this.leftPressed) {
            velocityX -= 160;
        }
        if (this.cursors.right.isDown || this.wasd.D.isDown || this.rightPressed) {
            velocityX += 160;
        }
        this.player.setVelocityX(velocityX);

        const halfWidth = this.player.displayWidth * 0.5;
        const minX = halfWidth;
        const maxX = worldWidth - halfWidth;
        const clampedX = Phaser.Math.Clamp(this.player.x, minX, maxX);
        if (clampedX !== this.player.x) {
            this.player.x = clampedX;
            this.player.setVelocityX(0);
        }

            // Animation state
        const currentAnimKey = this.player.anims.currentAnim ? this.player.anims.currentAnim.key : null;
        if (isGrounded && this.jumpCount === 0) {
            if (currentAnimKey !== 'chicken-walk') {
                this.player.play('chicken-walk');
            }
        } else if (this.isJetpacking) {
            if (currentAnimKey !== 'chicken-jetpack') {
                this.player.play('chicken-jetpack');
            }
        } else if (currentAnimKey !== 'chicken-jump') {
            this.player.play('chicken-jump');
        }

            // Check for falling into gap
        const killThreshold = this.valueOrDefault(this.killZoneY, 620) + 10;
        if (this.player.y > killThreshold && !this.physics.world.isPaused) {
            this.hitKillZone();
        }

            // Clean up off-screen bombs
        const bombCleanupY = worldHeight + 100;
        this.bombs.children.entries.forEach(bomb => {
            if (bomb.x < -100 || bomb.x > worldWidth + 100 || bomb.y > bombCleanupY) {
                bomb.destroy();
            }
        });
    }

    hitHazard() {
        this.playHazardHitSound();
        this.scene.restart({ level: this.level, deathCount: this.deathCount + 1 });
    }

    saveTime(level, newTime, playerName) {
        const normalizedLevel = Math.max(1, Math.min(3, Number(level) || 1));
        const trimmedName = typeof playerName === 'string' ? playerName.trim() : '';
        const safeName = trimmedName.length ? trimmedName : 'Anonymous';
        this.saveTimeToFirebase(normalizedLevel, newTime, safeName);
        if (!this.storageAvailable) {
            return;
        }
        const key = `spaceChickenLevel${normalizedLevel}`;
        const leaderboard = this.readLeaderboard(key);
        leaderboard.push({ time: newTime, name: safeName });
        leaderboard.sort((a, b) => a.time - b.time);
        const trimmed = leaderboard.slice(0, 5);
        this.writeLeaderboard(key, trimmed);
    }

    saveTimeToFirebase(level, newTime, playerName) {
        if (!this.firebaseEndpoint || typeof fetch !== 'function') {
            return;
        }
        const url = `${this.firebaseEndpoint}/leaderboard/level${level}.json`;
        const payload = {
            time: newTime,
            name: playerName,
            createdAt: Date.now()
        };
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to save time: ${response.status}`);
                }
                return response.json();
            })
            .then(() => {
                this.trimFirebaseLeaderboard(level);
            })
            .catch(err => {
                console.error('Firebase save failed', err);
            });
    }

    trimFirebaseLeaderboard(level) {
        if (!this.firebaseEndpoint || typeof fetch !== 'function') {
            return;
        }
        const url = `${this.firebaseEndpoint}/leaderboard/level${level}.json`;
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch leaderboard: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (!data || typeof data !== 'object') {
                    return null;
                }
                const entries = Object.entries(data)
                    .map(([key, value]) => {
                        if (typeof value === 'number') {
                            return { key, time: value };
                        }
                        if (value && typeof value.time === 'number') {
                            return { key, time: value.time };
                        }
                        return null;
                    })
                    .filter(Boolean);
                if (entries.length <= 5) {
                    return null;
                }
                entries.sort((a, b) => a.time - b.time);
                const extras = entries.slice(5);
                if (!extras.length) {
                    return null;
                }
                const updates = {};
                extras.forEach(entry => {
                    updates[entry.key] = null;
                });
                return fetch(url, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                });
            })
            .catch(err => {
                console.error('Firebase trim failed', err);
            });
    }

    fetchFirebaseLeaderboards() {
        if (!this.firebaseEndpoint || typeof fetch !== 'function') {
            return Promise.resolve(null);
        }
        const levels = [1, 2, 3];
        const normalizeEntry = (value) => {
            if (value && typeof value === 'object') {
                const time = typeof value.time === 'number' ? value.time : null;
                if (time === null) {
                    return null;
                }
                const name = typeof value.name === 'string' ? value.name.trim() : '';
                return {
                    time,
                    name: name.length ? name : 'Anonymous'
                };
            }
            if (typeof value === 'number') {
                return { time: value, name: 'Anonymous' };
            }
            return null;
        };
        const requests = levels.map(level => {
            const url = `${this.firebaseEndpoint}/leaderboard/level${level}.json`;
            return fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to load leaderboard: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (!data) {
                        return [];
                    }
                    if (Array.isArray(data)) {
                        const entries = data.map(normalizeEntry).filter(Boolean);
                        entries.sort((a, b) => a.time - b.time);
                        return entries.slice(0, 5);
                    }
                    if (typeof data === 'object') {
                        const times = Object.values(data)
                            .map(normalizeEntry)
                            .filter(Boolean);
                        times.sort((a, b) => a.time - b.time);
                        return times.slice(0, 5);
                    }
                    return [];
                })
                .catch(err => {
                    console.error(`Firebase load failed for level ${level}`, err);
                    return null;
                });
        });
        return Promise.all(requests)
            .then(results => {
                if (!results || !results.length) {
                    return null;
                }
                const data = {};
                results.forEach((times, index) => {
                    if (Array.isArray(times)) {
                        data[levels[index]] = times;
                    }
                });
                return data;
            })
            .catch(err => {
                console.error('Firebase leaderboard fetch failed', err);
                return null;
            });
    }

    formatTimes(times) {
        return times.map((entry, index) => {
            const timeValue = entry && typeof entry === 'object' ? entry.time : entry;
            const nameValue = entry && typeof entry === 'object' && typeof entry.name === 'string' ? entry.name : 'Anonymous';
            if (typeof timeValue !== 'number') {
                return null;
            }
            const minutes = Math.floor(timeValue / 60000);
            const seconds = Math.floor((timeValue % 60000) / 1000);
            const milliseconds = Math.floor((timeValue % 1000) / 10);
            const paddedName = nameValue && nameValue.length ? nameValue : 'Anonymous';
            return `${index + 1}. ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')} - ${paddedName}`;
        }).filter(Boolean).join('\n');
    }

    refreshLeaderboardButtonStyle() {
        if (!this.leaderboardButton) {
            return;
        }
        const backgroundColor = this.leaderboardVisible ? '#444444' : '#222222';
        this.leaderboardButton.setStyle({ backgroundColor });
    }

    hideLeaderboard() {
        if (this.leaderboardTextObject) {
            this.leaderboardTextObject.destroy();
        }
        this.leaderboardTextObject = null;
        this.leaderboardTextContent = '';
        this.leaderboardVisible = false;
        this.leaderboardRequestId = 0;
        this.refreshLeaderboardButtonStyle();
    }

    toggleLeaderboardOverlay() {
        if (this.leaderboardVisible) {
            this.hideLeaderboard();
        } else {
            this.displayLeaderboard();
        }
    }

    displayLeaderboard() {
        const requestId = Date.now() + Math.random();
        this.leaderboardRequestId = requestId;
        const restartPrompt = this.gameOver
            ? (this.touchControlsEnabled ? 'Press SPACEBAR or tap the jump button to restart' : 'Press SPACEBAR to restart')
            : 'Select the LB button again to close this leaderboard';
        const updateTextObject = (sectionsText) => {
            if (this.leaderboardRequestId !== requestId) {
                return;
            }
            const leaderboardText = 'Leaderboard\n\n' + sectionsText + `\n\nDeaths this run: ${this.deathCount}\n\n${restartPrompt}`;
            this.leaderboardTextContent = leaderboardText;
            if (this.leaderboardTextObject) {
                this.leaderboardTextObject.destroy();
            }
            this.leaderboardTextObject = this.add.text(0, 0, leaderboardText, { fontSize: '16px', fill: '#ffff00', align: 'center' }).setOrigin(0.5, 0).setScrollFactor(0);
            this.leaderboardTextObject.setDepth(10001);
            this.layoutLeaderboard();
            this.leaderboardVisible = true;
            this.refreshLeaderboardButtonStyle();
        };

        const buildSections = (remoteData) => {
            const sections = [1, 2, 3].map(level => {
                const remoteTimes = remoteData && remoteData[level] ? remoteData[level] : null;
                const localTimes = this.storageAvailable ? this.readLeaderboard(`spaceChickenLevel${level}`) : [];
                const combined = remoteTimes && remoteTimes.length ? remoteTimes : localTimes;
                const normalized = Array.isArray(combined) ? combined.slice() : [];
                normalized.sort((a, b) => {
                    const timeA = a && typeof a === 'object' ? a.time : a;
                    const timeB = b && typeof b === 'object' ? b.time : b;
                    if (typeof timeA !== 'number' && typeof timeB !== 'number') {
                        return 0;
                    }
                    if (typeof timeA !== 'number') {
                        return 1;
                    }
                    if (typeof timeB !== 'number') {
                        return -1;
                    }
                    return timeA - timeB;
                });
                const header = `Level ${level} Times:`;
                const body = normalized.length ? this.formatTimes(normalized) : 'No times yet';
                return `${header}\n${body}`;
            });
            if (!this.storageAvailable && (!remoteData || Object.keys(remoteData).length === 0)) {
                return 'Saved times unavailable (local storage disabled).';
            }
            return sections.join('\n\n');
        };

        updateTextObject('Loading leaderboard…');

        this.fetchFirebaseLeaderboards()
            .then(remoteData => {
                if (this.leaderboardRequestId !== requestId) {
                    return;
                }
                const sectionsText = buildSections(remoteData);
                updateTextObject(sectionsText);
            })
            .catch(() => {
                if (this.leaderboardRequestId !== requestId) {
                    return;
                }
                const fallback = this.storageAvailable ? buildSections(null) : 'Saved times unavailable (local storage disabled).';
                updateTextObject(fallback);
            });
    }

    collectGem() {
        const levelTime = performance.now() - this.startTime;
        this.playCollectSound();
        let playerName = this.playerName;
        if (!playerName) {
            playerName = this.ensurePlayerName(true);
        }
        if (typeof playerName === 'string') {
            playerName = playerName.trim();
        }
        if (!playerName) {
            playerName = 'Anonymous';
        }
        if (!this.playerName || this.playerName !== playerName) {
            this.playerName = playerName;
            this.savePlayerName(this.playerName);
        }
        this.saveTime(this.level, levelTime, this.playerName);

        if (this.levelConfig.nextLevel) {
            this.scene.restart({ level: this.levelConfig.nextLevel, deathCount: this.deathCount });
            return;
        }

        this.finalTime = levelTime;
        const minutes = Math.floor(this.finalTime / 60000);
        const seconds = Math.floor((this.finalTime % 60000) / 1000);
        const milliseconds = Math.floor((this.finalTime % 1000) / 10);
        this.timerText.setText(`Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`);

        this.gameOver = true;
        this.restartDelayDone = false;
        this.time.delayedCall(500, () => { this.restartDelayDone = true; });
        this.physics.pause();
        this.player.setTint(0x00ff00);
        this.crown.disableBody(true, true);
        this.cameras.main.stopFollow();
        this.cameras.main.scrollX = 0;
        this.displayLeaderboard();
        this.text.setText(`You Win!\nDeaths this run: ${this.deathCount}`);
        this.layoutOverlay();
        this.layoutLeaderboard();
    }

    hitKillZone() {
        this.playHazardHitSound();
        this.scene.restart({ level: this.level, deathCount: this.deathCount + 1 });
    }

    hitBomb(bomb, player) {
        this.playHazardHitSound();
        this.scene.restart({ level: this.level, deathCount: this.deathCount + 1 });
    }

    spawnBomb() {
        const worldWidth = this.getNested(this.levelConfig, ['world', 'width'], 2000);
        const bombSettings = this.bombSettings || {};
        const spawnHeight = this.valueOrDefault(bombSettings.spawnHeight, -50);
        const x = Phaser.Math.Between(-50, worldWidth + 50);
        const bomb = this.bombs.create(x, spawnHeight, 'bomb');
        bomb.setGravityY(this.valueOrDefault(bombSettings.gravityY, 0));
        const targetY = this.player.y;
            let angle = Phaser.Math.Angle.Between(x, spawnHeight, this.player.x, targetY);
        const spread = this.valueOrDefault(bombSettings.spread, Math.PI / 6);
        const randomOffset = Phaser.Math.FloatBetween(-spread, spread);
        angle += randomOffset;
        const speed = this.valueOrDefault(bombSettings.speed, 150);
        bomb.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        const delayMin = this.valueOrDefault(bombSettings.delayMin, 1000);
        const delayMax = this.valueOrDefault(bombSettings.delayMax, 5000);
        const delay = Phaser.Math.Between(delayMin, delayMax);
        this.time.delayedCall(delay, this.spawnBomb, [], this);
    }



}

const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    parent: 'phaser-game',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: [SpaceChicken]
};

const game = new Phaser.Game(config);
