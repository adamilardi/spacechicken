import { attachBonkMarker } from './bonk.js';

// Shrike: a bonkable cross-tier swooper. Hover-patrols the high tier,
// flashes a red telegraph, swoops diagonally down onto the low tier, then
// climbs back to its hover center and resumes the patrol. The Bear Raider
// dives straight down from a fixed hover; the shrike travels, so the
// player tracks it across heights. All timing runs on the scene clock so
// pause freezes it; delayed calls register in dynamicHazardEvents.
export function spawn(builder, group, config) {
    const shrike = group.create(config.x, config.y, config.key || 'shrike');
    shrike.bonkable = true;
    shrike.bonkLock = false;
    shrike.body.allowGravity = false;
    shrike.setImmovable(true);
    shrike.setDepth(config.depth ?? 7);
    const scale = config.scale ?? 1;
    if (scale !== 1) {
        shrike.setScale(scale);
    }
    const frameWidth = shrike.width || shrike.displayWidth || 48;
    const frameHeight = shrike.height || shrike.displayHeight || 48;
    shrike.body.setSize(
        config.bodyWidth ?? Math.round(frameWidth * 0.7),
        config.bodyHeight ?? Math.round(frameHeight * 0.62),
        true
    );
    shrike.bonkScaleX = shrike.scaleX || 1;
    shrike.bonkScaleY = shrike.scaleY || 1;
    const homeX = config.x;
    const homeY = config.y;
    const sweepRange = config.sweep?.range ?? 70;
    const sweepDuration = config.sweep?.duration ?? 1800;
    const swoopDX = config.swoopDX ?? 90;
    const swoopDY = config.swoopDY ?? 150;
    const hoverMs = config.hoverMs ?? 1600;
    const telegraphMs = config.telegraphMs ?? 450;
    const swoopMs = config.swoopMs ?? 520;
    const recoverMs = config.recoverMs ?? 900;
    builder.tagTestEntity(shrike, {
        kind: 'hazard',
        type: 'shrike',
        bonkable: true,
        origin: { x: config.x, y: config.y },
        target: { x: homeX + swoopDX, y: homeY + swoopDY },
        durationMs: swoopMs,
        delayMs: config.startDelay ?? 0,
        hoverMs,
        telegraphMs,
        recoverMs,
    });
    const startSweep = () => {
        if (!builder.tweens?.add || shrike.shrikeSweep) {
            return;
        }
        shrike.shrikeSweep = builder.tweens.add({
            targets: shrike,
            x: homeX + sweepRange,
            duration: sweepDuration,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            onUpdate: () => {
                const previous = shrike.shrikePrevX ?? shrike.x;
                if (Math.abs(shrike.x - previous) > 0.2) {
                    shrike.setFlipX(shrike.x < previous);
                }
                shrike.shrikePrevX = shrike.x;
            },
        });
    };
    startSweep();
    if (builder.tweens?.add) {
        shrike.shrikeBob = builder.tweens.add({
            targets: shrike,
            y: homeY - 6,
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }
    attachBonkMarker(builder, shrike);
    if (!builder.time?.delayedCall) {
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
            if (shrike.bonkLock) {
                cycle();
                return;
            }
            if (shrike.shrikeSweep) {
                shrike.shrikeSweep.pause();
            }
            if (shrike.shrikeBob) {
                shrike.shrikeBob.pause();
            }
            shrike.setTintFill(0xff4a3c);
            // Blink the tell (3 on/off cycles) so the sprite stays readable;
            // a solid fill turns the shrike into an unreadable red blob.
            const blinkStep = Math.max(40, Math.round(telegraphMs / 6));
            let blinksLeft = 5;
            const startSwoop = () => {
                shrike.clearTint();
                shrike.setFlipX(swoopDX < 0);
                builder.tweens.add({
                    targets: shrike,
                    x: homeX + swoopDX,
                    y: homeY + swoopDY,
                    duration: swoopMs,
                    ease: 'Quad.easeIn',
                    onComplete: () => {
                        builder.tweens.add({
                            targets: shrike,
                            x: homeX,
                            y: homeY,
                            duration: recoverMs,
                            ease: 'Quad.easeOut',
                            onComplete: () => {
                                if (shrike.shrikeSweep) {
                                    shrike.shrikeSweep.resume();
                                }
                                if (shrike.shrikeBob) {
                                    shrike.shrikeBob.resume();
                                }
                                cycle();
                            },
                        });
                    },
                });
            };
            const blink = () => {
                if (blinksLeft <= 0) {
                    startSwoop();
                    return;
                }
                if (blinksLeft % 2 === 0) {
                    shrike.clearTint();
                } else {
                    shrike.setTintFill(0xff4a3c);
                }
                blinksLeft -= 1;
                queue(blinkStep, blink);
            };
            queue(blinkStep, blink);
        });
    };
    queue(config.startDelay ?? 0, cycle);
}
