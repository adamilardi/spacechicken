import { GAME_CONSTANTS } from '../Constants.js';

function tintHazard(sprite, tint) {
    if (tint != null && sprite?.setTint) {
        sprite.setTint(tint);
    }
}

export function spawn(builder, group, config) {
    const orientation = config.orientation || 'horizontal';
    const length = config.length ?? 200;
    const width = config.width ?? 10;
    const beamTexture =
        config.key || (orientation === 'vertical' ? 'laserBeamVertical' : 'laserBeam');
    const beam = group.create(config.x, config.y, beamTexture);
    const onDuration = config.onDuration ?? GAME_CONSTANTS.LASER_DEFAULT_ON_DURATION;
    const offDuration = config.offDuration ?? GAME_CONSTANTS.LASER_DEFAULT_OFF_DURATION;
    const startDelay = config.startDelay ?? GAME_CONSTANTS.LASER_DEFAULT_START_DELAY;
    const startActive = config.initiallyActive ?? true;
    builder.tagTestEntity(beam, {
        kind: 'hazard',
        type: 'laser',
        orientation,
        onDurationMs: onDuration,
        offDurationMs: offDuration,
        phase: startActive ? 'active' : 'cooldown',
        nextChangeAt: builder.phaseDeadline(startDelay + (startActive ? onDuration : offDuration)),
    });
    beam.body.allowGravity = false;
    beam.setImmovable(true);
    beam.setBlendMode(Phaser.BlendModes.ADD);
    beam.setDepth(config.depth ?? 6);
    tintHazard(beam, config.tint);

    if (orientation === 'horizontal') {
        beam.setDisplaySize(length, width);
    } else {
        beam.setDisplaySize(width, length);
    }
    const hitThickness = Math.max(2, Math.round(width * 0.6));
    const hitboxWidth = orientation === 'horizontal' ? length : hitThickness;
    const hitboxHeight = orientation === 'horizontal' ? hitThickness : length;
    const scaleX = Math.abs(beam.scaleX) || 1;
    const scaleY = Math.abs(beam.scaleY) || 1;
    beam.body.setSize(hitboxWidth / scaleX, hitboxHeight / scaleY, true);

    const setState = (state) => {
        beam.body.enable = state;
        beam.setActive(state);
        beam.setVisible(state);
        beam.testMeta.phase = state ? 'active' : 'cooldown';
    };
    setState(startActive);

    if (builder.tweens?.add) {
        builder.tweens.add({
            targets: beam,
            alpha: { from: 0.72, to: 1 },
            duration: 160,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    if (config.emitter !== false) {
        const emitterKey = config.emitterKey || 'laserEmitter';
        const halfLength = length * 0.5;
        const offsetX = orientation === 'horizontal' ? halfLength : 0;
        const offsetY = orientation === 'horizontal' ? 0 : halfLength;
        const emitterStart = builder.add.image(config.x - offsetX, config.y - offsetY, emitterKey);
        const emitterEnd = builder.add.image(config.x + offsetX, config.y + offsetY, emitterKey);
        if (orientation === 'vertical') {
            emitterStart.setAngle(90);
            emitterEnd.setAngle(90);
        }
        const emitterDepth = (config.depth ?? 6) - 1;
        emitterStart.setDepth(emitterDepth);
        emitterEnd.setDepth(emitterDepth);
        tintHazard(emitterStart, config.tint);
        tintHazard(emitterEnd, config.tint);
    }

    const scheduleCycle = (state, delay) => {
        beam.testMeta.nextChangeAt = builder.phaseDeadline(delay);
        const event = builder.time.delayedCall(delay, () => {
            Phaser.Utils.Array.Remove(builder.dynamicHazardEvents, event);
            const nextState = !state;
            setState(nextState);
            scheduleCycle(nextState, nextState ? onDuration : offDuration);
        });
        builder.dynamicHazardEvents.push(event);
    };

    const starter = builder.time.delayedCall(startDelay, () => {
        Phaser.Utils.Array.Remove(builder.dynamicHazardEvents, starter);
        scheduleCycle(startActive, startActive ? onDuration : offDuration);
    });
    builder.dynamicHazardEvents.push(starter);
}
