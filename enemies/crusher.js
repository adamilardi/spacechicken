import { addLoopingTween } from '../GameUtils.js';

export function spawn(builder, group, config) {
    const crusher = group.create(config.x, config.y, config.key || 'crusher');
    builder.tagTestEntity(crusher, {
        kind: 'hazard',
        type: 'crusher',
        origin: { x: config.x, y: config.y },
        target: { x: config.x, y: config.slamY ?? config.y + 120 },
        durationMs: config.duration ?? 780,
        delayMs: config.delay ?? 0,
    });
    crusher.body.allowGravity = false;
    crusher.setImmovable(true);
    crusher.setDepth(8);
    crusher.body.setSize(64, 22, true);
    if (config.slamY != null) {
        addLoopingTween(builder.tweens, crusher, {
            y: config.slamY,
            duration: config.duration ?? 780,
            ease: 'Quad.easeIn',
            delay: config.delay ?? 0,
            hold: config.hold ?? 280,
        });
    }
}
