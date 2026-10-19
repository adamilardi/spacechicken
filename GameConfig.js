export function resolveRendererType() {
    try {
        const search = typeof location === 'undefined' ? '' : location.search || '';
        if (new URLSearchParams(search).get('renderer') === 'canvas') {
            return Phaser.CANVAS;
        }
    } catch (err) {
        // Fall through to AUTO.
    }
    return Phaser.AUTO;
}

export function createGameConfig(size, scene) {
    return {
        type: resolveRendererType(),
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
