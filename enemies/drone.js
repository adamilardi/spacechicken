import { GAME_CONSTANTS } from '../Constants.js';
import { addLoopingTween } from '../GameUtils.js';

export function spawn(builder, group, config) {
    const drone = group.create(config.x, config.y, config.key || 'drone');
    builder.tagTestEntity(drone, {
        kind: 'hazard',
        type: 'drone',
        origin: { x: config.x, y: config.y },
        target: config.patrol
            ? { x: config.patrol.x ?? config.x, y: config.patrol.y ?? config.y }
            : null,
        durationMs: config.patrol?.duration ?? null,
        delayMs: config.patrol?.delay ?? 0,
        bobAmplitude: config.bobAmplitude ?? 0,
        bobDurationMs: config.bobDuration ?? null,
    });
    drone.body.allowGravity = false;
    drone.setImmovable(true);
    const scale = config.scale ?? 1;
    if (scale !== 1) {
        drone.setScale(scale);
    }
    const radius =
        config.radius !== undefined
            ? config.radius
            : Math.max(8, Math.round(drone.displayWidth * 0.25));
    drone.body.setCircle(
        radius,
        drone.displayWidth * 0.5 - radius,
        drone.displayHeight * 0.5 - radius
    );
    drone.setDepth(config.depth ?? 7);

    if (config.patrol) {
        addLoopingTween(builder.tweens, drone, config.patrol);
    }

    if (config.bobAmplitude != null) {
        builder.tweens.add({
            targets: drone,
            y: drone.y - config.bobAmplitude,
            duration: config.bobDuration ?? GAME_CONSTANTS.BOB_DEFAULT_DURATION,
            yoyo: true,
            repeat: -1,
            ease: GAME_CONSTANTS.BOB_DEFAULT_EASE,
            delay: config.bobDelay ?? 0,
        });
    }

    if (config.spin) {
        const spinConfig = typeof config.spin === 'object' ? config.spin : { angle: config.spin };
        const angle =
            typeof spinConfig.angle === 'number'
                ? { from: -spinConfig.angle, to: spinConfig.angle }
                : spinConfig.angle || { from: -10, to: 10 };
        builder.tweens.add({
            targets: drone,
            angle,
            duration: spinConfig.duration ?? GAME_CONSTANTS.SPIN_DEFAULT_DURATION,
            yoyo: true,
            repeat: -1,
            ease: GAME_CONSTANTS.SPIN_DEFAULT_EASE,
        });
    }
}
