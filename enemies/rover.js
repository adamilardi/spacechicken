import { addLoopingTween } from '../GameUtils.js';

export function spawn(builder, group, config) {
    const rover = group.create(config.x, config.y, 'rover');
    builder.tagTestEntity(rover, {
        kind: 'hazard',
        type: 'rover',
        origin: { x: config.x, y: config.y },
        target: config.patrol
            ? { x: config.patrol.x ?? config.x, y: config.patrol.y ?? config.y }
            : null,
        durationMs: config.patrol?.duration ?? null,
        delayMs: config.patrol?.delay ?? 0,
    });
    rover.body.allowGravity = false;
    rover.setImmovable(true);
    rover.setDepth(6);
    rover.body.setSize(42, 24, true);
    rover.body.setOffset(7, 6);
    if (config.patrol) {
        addLoopingTween(builder.tweens, rover, config.patrol);
    }
}
