class PizzaGame extends Phaser.Scene {
    constructor() {
        super();
    }

    preload() {
        this.createSprites();
    }

    createSprites() {
        // Kitchen background
        let bgCanvas = document.createElement('canvas');
        bgCanvas.width = 800;
        bgCanvas.height = 600;
        let ctx = bgCanvas.getContext('2d');
        // Background color
        ctx.fillStyle = '#fff8e1';
        ctx.fillRect(0, 0, 800, 600);
        // Counter top
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(0, 300, 800, 300);
        // Drawer
        ctx.fillStyle = '#5d4e46';
        ctx.fillRect(50, 400, 100, 150);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(55, 405, 90, 40); // Drawer handle

        this.textures.addCanvas('background', bgCanvas);

        // Oven
        let ovenCanvas = document.createElement('canvas');
        ovenCanvas.width = 150;
        ovenCanvas.height = 200;
        ctx = ovenCanvas.getContext('2d');
        // Oven body
        ctx.fillStyle = '#757575';
        ctx.fillRect(0, 0, 150, 200);
        ctx.strokeStyle = '#424242';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, 150, 200);
        // Door
        ctx.fillStyle = '#424242';
        ctx.fillRect(20, 20, 110, 160);
        ctx.strokeRect(20, 20, 110, 160);
        // Rack inside
        ctx.strokeStyle = '#616161';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(30, 80);
        ctx.lineTo(120, 80);
        ctx.moveTo(30, 120);
        ctx.lineTo(120, 120);
        ctx.stroke();
        this.textures.addCanvas('oven', ovenCanvas);

        // Pizza base (dough)
        let baseCanvas = document.createElement('canvas');
        baseCanvas.width = 200;
        baseCanvas.height = 200;
        ctx = baseCanvas.getContext('2d');
        // Round dough
        ctx.fillStyle = '#f5f5dc';
        ctx.beginPath();
        ctx.arc(100, 100, 95, 0, Math.PI * 2);
        ctx.fill();
        // Crust
        ctx.strokeStyle = '#f4e4bc';
        ctx.lineWidth = 5;
        ctx.stroke();
        // Texture
        ctx.strokeStyle = '#e8dabd';
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
            let angle = (i * Math.PI) / 4;
            ctx.beginPath();
            ctx.moveTo(100, 100);
            ctx.lineTo(100 + Math.cos(angle) * 80, 100 + Math.sin(angle) * 80);
            ctx.stroke();
        }
        this.textures.addCanvas('pizza_base', baseCanvas);

        // Tomato sauce
        let sauceCanvas = document.createElement('canvas');
        sauceCanvas.width = 150;
        sauceCanvas.height = 150;
        ctx = sauceCanvas.getContext('2d');
        ctx.fillStyle = '#b71c1c';
        ctx.beginPath();
        ctx.arc(75, 75, 70, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#7f0000';
        ctx.lineWidth = 2;
        ctx.stroke();
        this.textures.addCanvas('tomato_sauce', sauceCanvas);

        // Cheese
        let cheeseCanvas = document.createElement('canvas');
        cheeseCanvas.width = 150;
        cheeseCanvas.height = 150;
        ctx = cheeseCanvas.getContext('2d');
        ctx.fillStyle = '#fff9c4';
        // Shreds
        ctx.beginPath();
        ctx.ellipse(20, 75, 30, 10, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(55, 45, 25, 8, -Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(90, 25, 20, 6, Math.PI / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(110, 80, 35, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(135, 55, 28, 9, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        this.textures.addCanvas('cheese', cheeseCanvas);

        // Pepperoni
        let pepperoniCanvas = document.createElement('canvas');
        pepperoniCanvas.width = 60;
        pepperoniCanvas.height = 60;
        ctx = pepperoniCanvas.getContext('2d');
        ctx.fillStyle = '#c62828';
        ctx.beginPath();
        ctx.arc(30, 30, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#b71c1c';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Holes
        ctx.fillStyle = '#d32f2f';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(25 + i * 5, 20 + i * 5, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        this.textures.addCanvas('pepperoni', pepperoniCanvas);

        // Mushroom
        let mushroomCanvas = document.createElement('canvas');
        mushroomCanvas.width = 50;
        mushroomCanvas.height = 70;
        ctx = mushroomCanvas.getContext('2d');
        // Stem
        ctx.fillStyle = '#f9f9f9';
        ctx.fillRect(20, 50, 10, 20);
        // Cap
        ctx.fillStyle = '#8d6e63';
        ctx.beginPath();
        ctx.arc(25, 45, 20, 0, Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#6d4c41';
        ctx.lineWidth = 2;
        ctx.stroke();
        this.textures.addCanvas('mushroom', mushroomCanvas);

        // Green pepper
        let pepperCanvas = document.createElement('canvas');
        pepperCanvas.width = 80;
        pepperCanvas.height = 60;
        ctx = pepperCanvas.getContext('2d');
        ctx.fillStyle = '#4caf50';
        ctx.beginPath();
        ctx.ellipse(40, 30, 35, 25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#388e3c';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Stem
        ctx.strokeStyle = '#2e7d32';
        ctx.beginPath();
        ctx.moveTo(40, 15);
        ctx.lineTo(40, 5);
        ctx.stroke();
        // Bulge
        ctx.beginPath();
        ctx.arc(40, 5, 3, 0, Math.PI * 2);
        ctx.stroke();
        this.textures.addCanvas('green_pepper', pepperCanvas);

        // Olive
        let oliveCanvas = document.createElement('canvas');
        oliveCanvas.width = 30;
        oliveCanvas.height = 50;
        ctx = oliveCanvas.getContext('2d');
        ctx.fillStyle = '#424242';
        ctx.beginPath();
        ctx.ellipse(15, 25, 12, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#212121';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Shine
        ctx.strokeStyle = '#6d6d6d';
        ctx.beginPath();
        ctx.arc(12, 18, 2, 0, Math.PI * 2);
        ctx.stroke();
        this.textures.addCanvas('olive', oliveCanvas);

        // Onion
        let onionCanvas = document.createElement('canvas');
        onionCanvas.width = 60;
        onionCanvas.height = 60;
        ctx = onionCanvas.getContext('2d');
        // Outer ring
        ctx.strokeStyle = '#fff8e1';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(30, 30, 25, 0, Math.PI * 2);
        ctx.stroke();
        // Inner ring
        ctx.strokeStyle = '#f5f5f5';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(30, 30, 15, 0, Math.PI * 2);
        ctx.stroke();
        // Center
        ctx.fillStyle = '#e8dac6';
        ctx.beginPath();
        ctx.arc(30, 30, 8, 0, Math.PI * 2);
        ctx.fill();
        this.textures.addCanvas('onion', onionCanvas);
    }

    create() {
        // Phase: prepare, baking, finished
        this.phase = 'prepare';

        // Ingredients on pizza
        this.ingredientsOnPizza = [];

        // Background
        this.add.sprite(400, 300, 'background');

        // Oven on the left
        this.add.sprite(100, 200, 'oven');

        // Pizza base in center
        this.pizzaBase = this.add.sprite(500, 350, 'pizza_base').setScale(0.8);

        // Instruction text
        this.instructionText = this.add.text(400, 20, 'Make your pizza! Drag ingredients to the pizza base', { fontSize: '18px', color: '#000' }).setOrigin(0.5);

        // Timer text
        this.timerText = this.add.text(650, 20, 'Time: 30', { fontSize: '20px', color: '#000' });
        this.timer = 30;

        // Score text
        this.scoreText = this.add.text(150, 20, 'Ingredients: 0/7', { fontSize: '18px', color: '#000' });

        // Ingredients shelf on right
        this.ingredients = [
            { name: 'tomato_sauce', x: 700, y: 150 },
            { name: 'cheese', x: 650, y: 250 },
            { name: 'pepperoni', x: 700, y: 350 },
            { name: 'mushroom', x: 750, y: 450 },
            { name: 'green_pepper', x: 700, y: 550 },
            { name: 'olive', x: 650, y: 150 },
            { name: 'onion', x: 750, y: 250 },
        ];

        this.ingredientSprites = [];

        this.ingredients.forEach(ing => {
            let sprite = this.add.sprite(ing.x, ing.y, ing.name);
            sprite.setInteractive();
            this.input.setDraggable(sprite);
            this.ingredientSprites.push({ sprite, name: ing.name, placed: false });
        });

        // Drag events
        this.input.on('dragstart', (pointer, gameObject) => {
            gameObject.setTint(0xffaaaa);
        });

        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            gameObject.x = dragX;
            gameObject.y = dragY;
        });

        this.input.on('dragend', (pointer, gameObject) => {
            gameObject.clearTint();
            // Check if dropped on pizza base (within 100 pixels)
            let distance = Phaser.Math.Distance.Between(gameObject.x, gameObject.y, this.pizzaBase.x, this.pizzaBase.y);
            if (distance < 100) {
                // Place on pizza
                let ing = this.ingredientSprites.find(i => i.sprite === gameObject);
                if (!ing.placed) {
                    ing.placed = true;
                    this.ingredientsOnPizza.push(ing.name);
                    // Keep the position where ingredient was dropped
                    this.input.setDraggable(gameObject, false);
                    this.updateScore();
                }
            } else {
                // Return to original position
                let ing = this.ingredientSprites.find(i => i.sprite === gameObject);
                let pos = this.ingredients.find(i => i.name === ing.name);
                gameObject.x = pos.x;
                gameObject.y = pos.y;
            }
        });

        // Timer event
        this.time.addEvent({
            delay: 1000,
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });
    }

    updateTimer() {
        if (this.phase === 'prepare') {
            this.timer--;
            this.timerText.setText('Time: ' + this.timer);
            if (this.timer <= 0) {
                this.endPreparation();
            }
        }
    }

    update() {
        if (this.phase === 'prepare' && Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey('SPACE'))) {
            this.endPreparation();
        } else if (this.phase === 'finished' && Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey('SPACE'))) {
            this.scene.restart();
        }
    }

    updateScore() {
        this.scoreText.setText('Ingredients: ' + this.ingredientsOnPizza.length + '/7');
    }

    endPreparation() {
        this.phase = 'baking';
        this.instructionText.setText('Pizza is baking!');
        this.timerText.setText('');
        // Disable all drags
        this.ingredientSprites.forEach(ing => {
            this.input.setDraggable(ing.sprite, false);
        });
        // Tint to simulate cooking
        this.pizzaBase.setTint(0x8B6F47); // browned crust
        this.ingredientSprites.forEach(ing => {
            if (ing.placed) {
                ing.sprite.setTint(0x8B4513); // darker brown for ingredients
            }
        });
        // Animate pizza to oven
        this.tweens.add({
            targets: this.pizzaBase,
            x: 100,
            y: 200,
            duration: 2000,
            ease: 'Power2'
        });
        this.ingredientSprites.forEach(ing => {
            if (ing.placed) {
                this.tweens.add({
                    targets: ing.sprite,
                    x: 100 + Phaser.Math.Between(-30, 30),
                    y: 200 + Phaser.Math.Between(-30, 30),
                    duration: 2000,
                    ease: 'Power2'
                });
            }
        });
        // After baking, show score
        this.time.delayedCall(3000, this.showScore, [], this);
    }

    showScore() {
        this.phase = 'finished';
        // Keep baked pizza visible in oven

        const scores = {
            tomato_sauce: 20,
            cheese: 15,
            pepperoni: 10,
            mushroom: 12,
            green_pepper: 12,
            olive: 8,
            onion: 10
        };
        let score = this.ingredientsOnPizza.reduce((sum, ing) => sum + (scores[ing] || 0), 0);
        let maxScore = Object.values(scores).reduce((sum, val) => sum + val, 0);

        this.instructionText.setText('Pizza ready! Your score: ' + score + '/' + maxScore + ' (Press SPACE to restart)');
        this.scoreText.setText('');
    }
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'phaser-game',
    scene: [PizzaGame]
};

const game = new Phaser.Game(config);
