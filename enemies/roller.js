import { addLoopingTween } from '../GameUtils.js';

export function spawn(builder, group, config) {
    const roller = group.create(config.x, config.y, config.key || 'boulder');
    builder.tagTestEntity(roller, {
        kind: 'hazard',
        type: 'boulder',
        origin: { x: config.x, y: config.y },
        target: config.patrol
            ? { x: config.patrol.x ?? config.x, y: config.patrol.y ?? config.y }
            : null,
        durationMs: config.patrol?.duration ?? null,
        delayMs: config.patrol?.delay ?? 0,
    });
    roller.body.allowGravity = false;
    roller.setImmovable(true);
    roller.setDepth(6);
    roller.body.setCircle(16, 4, 4);
    if (config.patrol) {
        addLoopingTween(builder.tweens, roller, config.patrol);
    }
    if (builder.tweens?.add) {
        builder.tweens.add({
            targets: roller,
            angle: 360,
            duration: config.spinDuration ?? 700,
            repeat: -1,
            ease: 'Linear',
        });
    }
}
