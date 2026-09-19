const test = require('node:test');
const assert = require('node:assert/strict');

test('pooled glow particles reset blending when reused for landing dust', async () => {
    const { EffectsManager } = await import('../EffectsManager.js');
    const previousPhaser = global.Phaser;
    global.Phaser = { BlendModes: { NORMAL: 0, ADD: 1 } };
    try {
        const effects = new EffectsManager({
            add: {
                image(x, y) {
                    return {
                        x,
                        y,
                        setBlendMode(mode) {
                            this.blendMode = mode;
                        },
                    };
                },
            },
        });
        const glow = effects.emitJetpack(20, 20, false);
        assert.ok(glow.every((sprite) => sprite.blendMode === 1));
        effects.stepParticles(1000);
        const dust = effects.emitDust(20, 20);
        assert.ok(dust.some((sprite) => glow.includes(sprite)));
        assert.ok(dust.every((sprite) => sprite.blendMode === 0));
        assert.ok(dust.every((sprite) => sprite._fx.destY < sprite._fx.startY));
        effects.stepParticles(1000);
        assert.equal(effects.live.size, 0);
        effects.cleanup();
    } finally {
        global.Phaser = previousPhaser;
    }
});
