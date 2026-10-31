import { attachBonkMarker } from './bonk.js';

// Bear Raider: a bonkable panic bot. Hovers, flashes a red telegraph, dives,
// then recovers to its hover height. With `dive: false` it is a docile
// springboard (bounce shafts). All timing runs on the scene clock so pause
// freezes it; delayed calls register in dynamicHazardEvents for cleanup.
export function spawn(builder, group, config) {
    const dives = config.dive !== false;
    const bear = group.create(config.x, config.y, config.key || 'bearRaider');
    bear.bonkable = true;
    bear.bonkLock = false;
    bear.body.allowGravity = false;
    bear.setImmovable(true);
    bear.setDepth(config.depth ?? 7);
    const scale = config.scale ?? 0.05;
    if (scale !== 1) {
        bear.setScale(scale);
    }
    const size = Math.max(24, Math.round(bear.displayWidth * 0.62));
    bear.body.setSize(size, size, true);
    bear.bonkScaleX = bear.scaleX || 1;
    bear.bonkScaleY = bear.scaleY || 1;
    const hoverY = config.y;
    const diveY = config.diveY ?? hoverY + 160;
    const hoverMs = config.hoverMs ?? 1400;
    const telegraphMs = config.telegraphMs ?? 300;
    const diveMs = config.diveMs ?? 420;
    const recoverMs = config.recoverMs ?? 900;
    builder.tagTestEntity(bear, {
        kind: 'hazard',
        type: 'bearRaider',
        bonkable: true,
        origin: { x: config.x, y: config.y },
        target: dives ? { x: config.x, y: diveY } : null,
        durationMs: dives ? diveMs : null,
        delayMs: config.startDelay ?? 0,
        hoverMs,
        telegraphMs,
        recoverMs,
    });
    if (builder.tweens?.add) {
        bear.bearBob = builder.tweens.add({
            targets: bear,
            y: hoverY - 6,
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }
    attachBonkMarker(builder, bear);
    if (!dives || !builder.time?.delayedCall) {
        return;
    }
    const queue = (delay, fn) => {
        const event = builder.time.delayedCall(delay, () => {
            Phaser.Utils.Array.Remove(builder.dynamicHazardEvents, event);
            fn();
        });
        builder.dynamicHazardEvents.push(event);
    };
    const cycle = () => {
        queue(hoverMs, () => {
            if (bear.bonkLock) {
                cycle();
                return;
            }
            bear.setTintFill(0xff4a3c);
            builder.scene?.audioManager?.playBearTelegraph?.();
            // Blink the tell (3 on/off cycles) so the sprite stays readable;
            // a solid fill turns the bear into an unreadable red blob.
            const blinkStep = Math.max(40, Math.round(telegraphMs / 6));
            let blinksLeft = 5;
            const startDive = () => {
                bear.clearTint();
                if (bear.bearBob) {
                    bear.bearBob.pause();
                }
                builder.tweens.add({
                    targets: bear,
                    y: diveY,
                    duration: diveMs,
                    ease: 'Quad.easeIn',
                    onComplete: () => {
                        builder.tweens.add({
                            targets: bear,
                            y: hoverY,
                            duration: recoverMs,
                            ease: 'Quad.easeOut',
                            onComplete: () => {
                                if (bear.bearBob) {
                                    bear.bearBob.resume();
                                }
                                cycle();
                            },
                        });
                    },
                });
            };
            const blink = () => {
                if (blinksLeft <= 0) {
                    startDive();
                    return;
                }
                if (blinksLeft % 2 === 0) {
                    bear.clearTint();
                } else {
                    bear.setTintFill(0xff4a3c);
                }
                blinksLeft -= 1;
                queue(blinkStep, blink);
            };
            queue(blinkStep, blink);
        });
    };
    queue(config.startDelay ?? 0, cycle);
}
