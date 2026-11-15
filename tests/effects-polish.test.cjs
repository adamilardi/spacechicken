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

test('boss rings follow scene tweens and are cleaned up before delayed defeat echoes', async () => {
    const { EffectsManager } = await import('../EffectsManager.js');
    const rings = [];
    const delayed = [];
    const tweens = [];
    const scene = {
        add: {
            graphics() {
                const ring = {
                    destroyed: false,
                    setPosition() {
                        return this;
                    },
                    setDepth() {
                        return this;
                    },
                    lineStyle() {},
                    strokeEllipse() {},
                    destroy() {
                        this.destroyed = true;
                    },
                };
                rings.push(ring);
                return ring;
            },
        },
        tweens: { add: (tween) => tweens.push(tween), killTweensOf() {} },
        time: { delayedCall: (_delay, callback) => delayed.push(callback) },
    };
    const effects = new EffectsManager(scene);
    effects.bossBurst(200, 300, 'defeat');
    assert.equal(rings.length, 1);
    assert.equal(tweens.length, 1);
    assert.equal(delayed.length, 1);
    effects.cleanup();
    delayed[0]();
    assert.equal(rings.length, 1, 'shutdown cannot create an orphaned echo');
    assert.equal(rings[0].destroyed, true);
    assert.equal(effects.bossRings.size, 0);
});
