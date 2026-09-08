const rootFiles = Object.freeze([
    'index.html',
    'Constants.js',
    'GameUtils.js',
    'MusicConfig.js',
    'AudioManager.js',
    'LevelConfig.js',
    'UIManager.js',
    'LeaderboardManager.js',
    'SpriteFactory.js',
    'EffectsManager.js',
    'BackgroundRenderer.js',
    'WorldBuilder.js',
    'InputController.js',
    'Viewport.js',
    'SpaceChicken.js',
]);

const vendorFiles = Object.freeze({
    'vendor/phaser-arcade-physics-3.70.0.min.js':
        'node_modules/phaser/dist/phaser-arcade-physics.min.js',
});

module.exports = { rootFiles, vendorFiles };
