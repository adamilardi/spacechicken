export function createGameConfig(size, scene) {
    return {
        type: Phaser.AUTO,
        width: size.width,
        height: size.height,
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            expandParent: false,
            width: size.width,
            height: size.height,
        },
        parent: 'phaser-game',
        input: {
            activePointers: 4,
            gamepad: true,
            touch: {
                capture: true,
            },
        },
        render: {
            antialias: true,
            roundPixels: true,
            powerPreference: 'high-performance',
        },
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 300 },
                debug: false,
            },
        },
        scene: [scene],
    };
}
