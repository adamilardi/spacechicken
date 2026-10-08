const rootFiles = Object.freeze([
    'index.html',
    'GameConfig.js',
    'Constants.js',
    'GameUtils.js',
    'MusicConfig.js',
    'music/score.js',
    'music/solar-run.js',
    'music/neon-pursuit.js',
    'music/orbital-machinery.js',
    'music/lunar-horizon.js',
    'music/specimen-wing.js',
    'music/red-reach.js',
    'music/earthwatch.js',
    'music/colony-drop.js',
    'music/hive.js',
    'music/spire.js',
    'music/bastion.js',
    'music/womb.js',
    'music/rust-harbor.js',
    'music/ember-foundry.js',
    'music/skyhook.js',
    'music/vault.js',
    'music/index.js',
    'AudioManager.js',
    'LevelConfig.js',
    'levels/shared.js',
    'levels/dawn-run.js',
    'levels/arcade-orbit.js',
    'levels/orbital-gauntlet.js',
    'levels/moonfall-citadel.js',
    'levels/specimen-wing.js',
    'levels/red-reach.js',
    'levels/earthwatch.js',
    'levels/colony-drop.js',
    'levels/hive-warrens.js',
    'levels/spire-crown.js',
    'levels/bastion-relay.js',
    'levels/crimson-womb.js',
    'levels/rust-harbor.js',
    'levels/ember-foundry.js',
    'levels/skyhook-anchor.js',
    'levels/iron-vault.js',
    'levels/index.js',
    'UIManager.js',
    'LeaderboardManager.js',
    'SpriteFactory.js',
    'EffectsManager.js',
    'BackgroundRenderer.js',
    'WorldBuilder.js',
    'enemies/laser.js',
    'enemies/drone.js',
    'enemies/rover.js',
    'enemies/cosmic-ray.js',
    'enemies/bonk.js',
    'enemies/crusher.js',
    'enemies/drip.js',
    'enemies/roller.js',
    'enemies/dust-devil.js',
    'enemies/boarder.js',
    'enemies/generic.js',
    'enemies/index.js',
    'InputController.js',
    'Viewport.js',
    // GameTestInterface.js ships because SpaceChicken.js statically imports it
    // (normalizeTestSeed). Its window APIs are gated on debugMode (see
    // SpaceChicken.bindBotDebugApi). performance.html + PerformanceTest.js are
    // intentionally excluded from prod deploys.
    'GameTestInterface.js',
    'SpaceChicken.js',
    'SplitScreen.js',
    'PauseController.js',
]);

const vendorFiles = Object.freeze({
    'vendor/phaser-arcade-physics-3.70.0.min.js':
        'node_modules/phaser/dist/phaser-arcade-physics.min.js',
});

// Served by the local dev server for on-device verification, but never
// deployed (see scripts/verify-performance-page.mjs).
const devOnlyFiles = Object.freeze([
    'performance.html',
    'PerformanceTest.js',
    'PerformanceMetrics.js',
]);

module.exports = { rootFiles, vendorFiles, devOnlyFiles };
