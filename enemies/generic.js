import { addLoopingTween } from '../GameUtils.js';

export function spawn(builder, group, config) {
    const hazard = group.create(config.x, config.y, config.key || 'rock');
    builder.tagTestEntity(hazard, {
        kind: 'hazard',
        type: config.type || 'dynamic_hazard',
    });
    hazard.body.allowGravity = false;
    hazard.setImmovable(true);
    const scaleX = config.scaleX ?? 1;
    const scaleY = config.scaleY ?? 1;
    if (scaleX !== 1 || scaleY !== 1) {
        hazard.setScale(scaleX, scaleY);
    }
    if (config.tween) {
        addLoopingTween(builder.tweens, hazard, config.tween);
    }
    if (config.velocity) {
        hazard.setVelocity(config.velocity.x ?? 0, config.velocity.y ?? 0);
    }
}
