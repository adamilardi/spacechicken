export function spawn(builder, group, config) {
    const interval = config.interval ?? 1500;
    const spawn = () => {
        const drop = group.create(config.x, config.y, config.key || 'acidDrop');
        if (!drop) {
            return;
        }
        builder.tagTestEntity(drop, { kind: 'hazard', type: 'acid_drip' });
        drop.body.allowGravity = true;
        drop.setImmovable(false);
        drop.setVelocity(0, config.speed ?? 90);
        drop.body.setGravityY?.(config.gravityY ?? 900);
        drop.setDepth(6);
        const watch = builder.time.addEvent({
            delay: 100,
            loop: true,
            callback: () => {
                if (!drop.scene || drop.y > builder.worldHeight + 40) {
                    watch.remove(false);
                    Phaser.Utils.Array.Remove(builder.dynamicHazardEvents, watch);
                    drop.destroy();
                }
            },
        });
        builder.dynamicHazardEvents.push(watch);
    };
    const starter = builder.time.delayedCall(config.delay ?? 0, () => {
        Phaser.Utils.Array.Remove(builder.dynamicHazardEvents, starter);
        spawn();
    });
    builder.dynamicHazardEvents.push(starter);
    builder.dynamicHazardEvents.push(
        builder.time.addEvent({
            delay: interval,
            loop: true,
            callback: spawn,
        })
    );
}
