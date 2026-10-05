import { GAME_CONSTANTS } from '../Constants.js';
import { addLoopingTween } from '../GameUtils.js';

function attachBonkMarker(builder, enemy) {
    if (!enemy || !builder.add?.image) {
        return;
    }
    const lift = Math.round((enemy.displayHeight || enemy.height || 48) * 0.5 + 8);
    const marker = builder.add.image(enemy.x, enemy.y - lift, 'bonkMarker');
    if (!marker) {
        return;
    }
    marker.setDepth((enemy.depth || 7) + 4);
    enemy.bonkMarker = marker;
    enemy.bonkMarkerLift = lift;
}

export function spawn(builder, group, config) {
    const enemy = group.create(config.x, config.y, config.key || 'labTech');
    enemy.bonkable = true;
    enemy.bonkLock = false;
    enemy.body.allowGravity = false;
    enemy.setImmovable(true);
    enemy.setDepth(config.depth ?? 7);
    const frameWidth = enemy.width || enemy.displayWidth || 32;
    const frameHeight = enemy.height || enemy.displayHeight || 32;
    enemy.body.setSize(
        config.bodyWidth ?? Math.round(frameWidth * 0.72),
        config.bodyHeight ?? Math.round(frameHeight * 0.82),
        true
    );
    enemy.bonkScaleX = enemy.scaleX || 1;
    enemy.bonkScaleY = enemy.scaleY || 1;
    builder.tagTestEntity(enemy, {
        kind: 'hazard',
        type: config.enemy || 'bonk',
        bonkable: true,
        origin: { x: config.x, y: config.y },
        target: config.patrol
            ? { x: config.patrol.x ?? config.x, y: config.patrol.y ?? config.y }
            : null,
        durationMs: config.patrol?.duration ?? null,
        delayMs: config.patrol?.delay ?? 0,
    });
    if (config.patrol && builder.tweens?.add) {
        addLoopingTween(builder.tweens, enemy, {
            ...config.patrol,
            onUpdate: () => {
                const previous = enemy.bonkPrevX ?? enemy.x;
                if (Math.abs(enemy.x - previous) > 0.2) {
                    enemy.setFlipX(enemy.x < previous);
                }
                enemy.bonkPrevX = enemy.x;
            },
        });
    }
    if (config.bobAmplitude != null && builder.tweens?.add) {
        builder.tweens.add({
            targets: enemy,
            y: enemy.y - config.bobAmplitude,
            duration: config.bobDuration ?? GAME_CONSTANTS.BOB_DEFAULT_DURATION,
            yoyo: true,
            repeat: -1,
            ease: GAME_CONSTANTS.BOB_DEFAULT_EASE,
            delay: config.bobDelay ?? 0,
        });
    }
    attachBonkMarker(builder, enemy);
}
