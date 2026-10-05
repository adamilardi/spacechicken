import { addLoopingTween } from '../GameUtils.js';

export function spawn(builder, group, config) {
    const devil = group.create(config.x, config.y, config.key || 'dustDevil');
    builder.tagTestEntity(devil, {
        kind: 'hazard',
        type: 'dust_devil',
        origin: { x: config.x, y: config.y },
        target: config.patrol
            ? { x: config.patrol.x ?? config.x, y: config.patrol.y ?? config.y }
            : null,
        durationMs: config.patrol?.duration ?? null,
        delayMs: config.patrol?.delay ?? 0,
    });
    devil.body.allowGravity = false;
    devil.setImmovable(true);
    devil.setDepth(6);
    devil.setBlendMode?.(Phaser.BlendModes.ADD);
    devil.body.setSize(18, 78, true);
    if (config.patrol) {
        addLoopingTween(builder.tweens, devil, config.patrol);
    }
    if (builder.tweens?.add) {
        builder.tweens.add({
            targets: devil,
            angle: { from: -8, to: 8 },
            duration: 420,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }
}
