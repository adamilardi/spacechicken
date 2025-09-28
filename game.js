class SpaceChicken extends Phaser.Scene {
    init(data) {
        this.level = data.level || 1;
    }

    constructor() {
        super();
    }
    preload() {
        // Create animated chicken sprites
        this.createChickenFrames();

        let crownCanvas = document.createElement('canvas');
        crownCanvas.width = 32;
        crownCanvas.height = 32;
        let ctx = crownCanvas.getContext('2d');
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

        // Virtual controller buttons for mobile
        let btnWidth = 64, btnHeight = 64;

        // Left button (arrow left)
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

        // Right button (arrow right)
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

        // Jump button (circle with "JUMP")
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

    createChickenFrames() {
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

    create() {
        // Adjust gravity based on level
        this.physics.world.gravity.y = this.level === 2 ? 400 : 300;

        // Start timer for speedrun
        this.startTime = performance.now();

        // Game over flag for win state
        this.gameOver = false;
        this.maxJumps = 2;
        this.jumpCount = 0;
        this.isJetpacking = false;
        this.restartDelayDone = true;

        // Mobile touch control states
        this.leftPressed = false;
        this.rightPressed = false;

        // Timer display at top-left
        this.timerText = this.add.text(16, 16, 'Time: 00:00.00', { fontSize: '36px', fontFamily: 'monospace', fill: '#ffff00' });
        this.timerText.setScrollFactor(0); // Fixed UI
        this.timerText.setDepth(10000);

        // Level display
        this.levelText = this.add.text(16, 50, `Level: ${this.level}`, { fontSize: '24px', fill: '#fff' });
        this.levelText.setScrollFactor(0);

        // World width
        let worldWidth = this.level === 2 ? 3000 : 2000;

        // Reuse a single graphics layer for background space
        if (!this.backgroundGraphics || !this.backgroundGraphics.scene) {
            this.backgroundGraphics = this.add.graphics();
            this.backgroundGraphics.setDepth(-10);
        } else {
            this.backgroundGraphics.clear();
        }

        // Cache generated background layout per level so restarts reuse the same scenery
        let layoutCache = this.constructor.backgroundLayouts;
        if (!layoutCache) {
            layoutCache = this.constructor.backgroundLayouts = new Map();
        }
        let backgroundLayout = layoutCache.get(this.level);
        if (!backgroundLayout) {
            let starCount = this.level === 2 ? 150 : 100;
            let stars = [];
            for (let i = 0; i < starCount; i++) {
                let x = Phaser.Math.Between(0, worldWidth);
                let y = Phaser.Math.Between(0, 600);
                let size = Phaser.Math.Between(1, 3);
                stars.push({ x, y, size });
            }

            let planetTemplates = [
                { color: 0x004488, size: 50 },
                { color: 0x884400, size: 40 },
                { color: 0x440088, size: 30 },
                { color: 0x448800, size: 60 },
                { color: 0x888844, size: 45 },
                { color: 0x880044, size: 55 },
                { color: 0x008844, size: 35 },
                { color: 0x444488, size: 70 }
            ];
            let planetCount = this.level === 2 ? 8 : 5;
            let planets = [];
            for (let i = 0; i < planetCount; i++) {
                let template = planetTemplates[i % planetTemplates.length];
                let x = Phaser.Math.Between(300, worldWidth - 300);
                let y = Phaser.Math.Between(50, 400);
                planets.push({ x, y, color: template.color, size: template.size });
            }

            backgroundLayout = { stars, planets };
            layoutCache.set(this.level, backgroundLayout);
        }

        this.backgroundGraphics.fillStyle(0x000000).fillRect(0, 0, worldWidth, 600);

        backgroundLayout.stars.forEach(star => {
            this.backgroundGraphics.fillStyle(0xffffff).fillCircle(star.x, star.y, star.size);
        });

        backgroundLayout.planets.forEach(planet => {
            this.backgroundGraphics.fillStyle(planet.color).fillCircle(planet.x, planet.y, planet.size);
        });

        // Player chicken
        this.player = this.physics.add.sprite(100, 450, 'chicken1');
        this.player.setBounce(0.2);
        this.player.setCollideWorldBounds(false);

        // Camera follow and bounds
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, worldWidth, 600);

        // Extend physics world bounds (floor is no longer solid everywhere)
        this.physics.world.setBounds(0, 0, worldWidth, 700);

        // Instructions
        this.text = this.add.text(16, 80, 'Space Chicken - WASD to move, Space to jump\nCollect the golden crown!', { fontSize: '16px', fill: '#fff' });
        this.text.setScrollFactor(0); // Fixed UI

        // Platforms (cliffs)
        this.platforms = this.physics.add.staticGroup();
        this.platforms.create(400, 568, 'cliff');
        this.platforms.create(800, 500, 'cliff');
        this.platforms.create(1200, 400, 'cliff');
        if (this.level === 2) {
            this.platforms.create(1600, 300, 'cliff');
            this.platforms.create(2000, 200, 'cliff');
            this.platforms.create(2400, 400, 'cliff');
            this.platforms.create(2800, 500, 'cliff');
        }

        // Floor with gaps to fall through
        let gapCondition;
        if (this.level === 1) {
            gapCondition = (x) => x < 350 || (x > 450 && x < 650) || (x > 750 && x < 950) || x > 1050;
        } else {
            gapCondition = (x) => x < 350 || (x > 450 && x < 550) || (x > 650 && x < 750) || (x > 850 && x < 1050) || (x > 1150 && x < 1350) || (x > 1450 && x < 1650) || (x > 1750 && x < 1950) || x > 2050;
        }
        for (let x = 0; x < worldWidth; x += 100) {
            if (gapCondition(x)) {
                let platform = this.platforms.create(x, 580, 'cliff');
                platform.setScale(1.5, 0.3);
                platform.refreshBody();
            }
        }

        // Hazards (rocks)
        this.hazards = this.physics.add.staticGroup();
        this.hazards.create(600, 568, 'rock');
        this.hazards.create(1000, 568, 'rock');
        if (this.level === 2) {
            this.hazards.create(1400, 568, 'rock');
            this.hazards.create(1800, 568, 'rock');
            this.hazards.create(2200, 568, 'rock');
        }

        // Win crown
        let crownX = this.level === 2 ? 2800 : 1800;
        this.crown = this.physics.add.staticSprite(crownX, 350, 'crown');

        // Mobile/touch controls setup
        if (this.sys.game.device.input.touch) {
            // Enable multi-touch
            this.input.addPointer(2);
            // Update instructions for mobile
            this.text.setText('Space Chicken - Touch left half for left, right half for right\nTap anywhere to jump - Collect the golden crown!');
        }

        // Bombs
        this.bombs = this.physics.add.group();

        // Invisible kill zone at bottom (for falling into gaps)
        let killZone = this.add.zone(0, 620, worldWidth, 20).setOrigin(0);
        this.physics.world.enable(killZone);
        killZone.body.setImmovable(true);
        killZone.body.setAllowGravity(false);
        killZone.body.moves = false;

        // Collisions
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.overlap(this.player, this.hazards, this.hitHazard, null, this);
        this.physics.add.overlap(this.player, this.crown, this.collectGem, null, this);
        this.physics.add.overlap(this.player, this.bombs, this.hitBomb, null, this);
        this.physics.add.overlap(this.player, killZone, this.hitKillZone, null, this);

        // Chicken animations
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

        // Controls
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,S,A,D');
        this.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // Bomb timer
        this.spawnBomb();
    }

    update() {
        // World width for cleanup
        let worldWidth = this.level === 2 ? 3000 : 2000;

        // Update timer
        if (!this.physics.world.isPaused) {
            let elapsed = performance.now() - this.startTime;
            let minutes = Math.floor(elapsed / 60000);
            let seconds = Math.floor((elapsed % 60000) / 1000);
            let milliseconds = Math.floor((elapsed % 1000) / 10); // for 2 decimal places in ms
            this.timerText.setText(`Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`);
        }

        // Mobile touch controls
        this.leftPressed = false;
        this.rightPressed = false;
        let camW = this.cameras.main.width;
        if (this.input.pointers) {
            this.input.pointers.forEach(pointer => {
                if (pointer.isDown) {
                    if (pointer.x < camW / 2) {
                        this.leftPressed = true;
                    } else {
                        this.rightPressed = true;
                    }
                }
            });
        }

        const isGrounded = this.player.body.blocked.down || this.player.body.touching.down;
        if (isGrounded) {
            this.jumpCount = 0;
            this.isJetpacking = false;
        }

        const spaceJustPressed = Phaser.Input.Keyboard.JustDown(this.space);
        const upJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up);
        const wJustPressed = Phaser.Input.Keyboard.JustDown(this.wasd.W);

        // Jump detection: quick taps anywhere
        const pointerJumpTriggered = this.input.pointers && this.input.pointers.some(pointer => {
            return pointer.justUp && (pointer.upTime - pointer.downTime) < 200;
        });

        const keyboardJumpTriggered = upJustPressed || spaceJustPressed || wJustPressed;

        if (!this.gameOver && (pointerJumpTriggered || keyboardJumpTriggered) && this.jumpCount < this.maxJumps) {
            this.player.setVelocityY(-330);
            this.jumpCount += 1;
            if (this.jumpCount === 2) {
                this.isJetpacking = true;
                this.player.play('chicken-jetpack', true);
            } else {
                this.isJetpacking = false;
                this.player.play('chicken-jump', true);
            }
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
        if (this.player.y > 630 && !this.physics.world.isPaused) {
            this.hitKillZone();
        }

        // Clean up off-screen bombs
        this.bombs.children.entries.forEach(bomb => {
            if (bomb.x < -100 || bomb.x > worldWidth + 100 || bomb.y > 700) {
                bomb.destroy();
            }
        });

        // Restart game when over and space pressed
        if (this.gameOver && this.restartDelayDone && spaceJustPressed) {
            this.scene.restart({ level: 1 });
        }
    }

    hitHazard() {
        this.scene.restart({ level: this.level });
    }

    saveTime(level, newTime) {
        let key = level === 1 ? 'spaceChickenLevel1' : 'spaceChickenLevel2';
        let leaderboard = JSON.parse(localStorage.getItem(key) || '[]');
        leaderboard.push(newTime);
        leaderboard.sort((a, b) => a - b);
        leaderboard = leaderboard.slice(0, 5);
        localStorage.setItem(key, JSON.stringify(leaderboard));
    }

    displayLeaderboard() {
        // Get both leaderboards
        let level1 = JSON.parse(localStorage.getItem('spaceChickenLevel1') || '[]');
        let level2 = JSON.parse(localStorage.getItem('spaceChickenLevel2') || '[]');

        function formatTimes(times) {
            return times.map((time, index) => {
                let minutes = Math.floor(time / 60000);
                let seconds = Math.floor((time % 60000) / 1000);
                let milliseconds = Math.floor((time % 1000) / 10);
                return `${index + 1}. ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
            }).join('\n');
        }

        let leaderboardText = 'Leaderboard\n\nLevel 1 Times:\n' + (level1.length ? formatTimes(level1) : 'No times yet') + '\n\nLevel 2 Times:\n' + (level2.length ? formatTimes(level2) : 'No times yet') + '\n\nPress SPACEBAR to restart';
        this.add.text(400, 120, leaderboardText, { fontSize: '16px', fill: '#ffff00', align: 'center' }).setOrigin(0.5, 0).setScrollFactor(0);
    }

    collectGem() {
        if (this.level === 1) {
            // Save time for level 1 completion
            let time = performance.now() - this.startTime;
            this.saveTime(1, time);
            this.scene.restart({ level: 2 });
        } else {
            // Calculate final time
            this.finalTime = performance.now() - this.startTime;
            // Save time for level 2 completion
            this.saveTime(2, this.finalTime);
            // Set timer text to exact time
            let minutes = Math.floor(this.finalTime / 60000);
            let seconds = Math.floor((this.finalTime % 60000) / 1000);
            let milliseconds = Math.floor((this.finalTime % 1000) / 10);
            this.timerText.setText(`Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`);
            this.gameOver = true;
            this.restartDelayDone = false;
            this.time.delayedCall(500, () => { this.restartDelayDone = true; });
            this.physics.pause();
            this.player.setTint(0x00ff00);
            this.crown.disableBody(true, true);
            // Stop camera follow and scroll back to show leaderboard
            this.cameras.main.stopFollow();
            this.cameras.main.scrollX = 0;
            // Display leaderboard
            this.displayLeaderboard();
            // Update message
            this.text.setText('You Win!');
        }
    }

    hitKillZone() {
        this.scene.restart({ level: this.level });
    }

    hitBomb(bomb, player) {
        this.scene.restart({ level: this.level });
    }

    spawnBomb() {
        let worldWidth = this.level === 2 ? 3000 : 2000;
        let x = Phaser.Math.Between(-50, worldWidth + 50);
        let bomb = this.bombs.create(x, -50, 'bomb');
        // Set no gravity for bombs to fly in straight line or with physics
        bomb.setGravityY(0);  // No gravity, so they fly straight at angle
        // Calculate direction to player with random offset
        let angle = Phaser.Math.Angle.Between(x, -50, this.player.x, this.player.y);
        let randomOffset = Phaser.Math.FloatBetween(-Math.PI / 6, Math.PI / 6);  // +/- 30 degrees random
        angle += randomOffset;
        let speed = this.level === 2 ? 200 : 150;
        bomb.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        // Schedule next bomb
        let delayMin = this.level === 2 ? 500 : 1000;
        let delayMax = this.level === 2 ? 2000 : 5000;
        let delay = Phaser.Math.Between(delayMin, delayMax);
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
