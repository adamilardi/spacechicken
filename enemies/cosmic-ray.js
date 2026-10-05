export function spawn(builder, group, config) {
    const startY = config.y || 80;
    const interval = config.interval ?? 2000;
    const warningTime = config.warning ?? 420;
    const initialDelay = config.delay ?? 0;
    const schedule = {
        id: `cosmic_ray-${++builder.testEntityCounter}`,
        kind: 'hazard_schedule',
        type: 'cosmic_ray',
        x: config.x,
        y: startY,
        intervalMs: interval,
        warningDurationMs: warningTime,
        activeDurationMs: 220,
        phase: 'cooldown',
        nextChangeAt: builder.phaseDeadline(initialDelay),
    };
    if (!Array.isArray(builder.scene.testHazardSchedules)) {
        builder.scene.testHazardSchedules = [];
    }
    builder.scene.testHazardSchedules.push(schedule);

    const spawnRay = () => {
        schedule.phase = 'warning';
        schedule.nextChangeAt = builder.phaseDeadline(warningTime);
        schedule.nextWarningAt = builder.phaseDeadline(interval);
        const warning = builder.acquireWarningGraphics();
        warning.rayX = config.x;
        warning.setDepth(25);
        if (builder.activeWarningGraphics) {
            builder.activeWarningGraphics.push(warning);
        }

        warning.fillStyle(0xffee66, 0.35);
        warning.fillRect(config.x - 18, startY, 36, builder.worldHeight - 100);
        warning.fillStyle(0xffffaa, 0.9);
        warning.fillRect(config.x - 5, startY, 10, builder.worldHeight - 100);
        warning.fillStyle(0xffee66, 0.6);
        warning.fillCircle(config.x, startY + 35, 28);
        warning.fillStyle(0xffffff, 0.85);
        warning.fillCircle(config.x, startY + 35, 14);

        const warningDelay = builder.time.delayedCall(warningTime, () => {
            Phaser.Utils.Array.Remove(builder.dynamicHazardEvents, warningDelay);
            if (builder.activeWarningGraphics) {
                Phaser.Utils.Array.Remove(builder.activeWarningGraphics, warning);
            }
            builder.releaseWarningGraphics(warning);
            schedule.phase = 'active';
            schedule.nextChangeAt = builder.phaseDeadline(schedule.activeDurationMs);

            const ray = group.create(config.x, startY, 'laserBeamVertical');
            builder.tagTestEntity(ray, {
                kind: 'hazard',
                type: 'cosmic_ray',
                phase: 'active',
                scheduleId: schedule.id,
            });
            ray.setDisplaySize(10, builder.worldHeight - 110);
            ray.body.allowGravity = false;
            ray.setImmovable(true);
            ray.setBlendMode(Phaser.BlendModes.ADD);
            ray.setDepth(8);

            const rayLength = builder.worldHeight - 110;
            const hitThickness = 8;
            const scaleX = Math.abs(ray.scaleX) || 1;
            const scaleY = Math.abs(ray.scaleY) || 1;
            ray.body.setSize(hitThickness / scaleX, rayLength / scaleY, true);

            const rayLife = builder.time.delayedCall(220, () => {
                Phaser.Utils.Array.Remove(builder.dynamicHazardEvents, rayLife);
                if (ray?.destroy) {
                    ray.destroy();
                }
                schedule.phase = 'cooldown';
                schedule.nextChangeAt = schedule.nextWarningAt;
            });
            builder.dynamicHazardEvents.push(rayLife);
        });
        builder.dynamicHazardEvents.push(warningDelay);
    };

    const starter = builder.time.delayedCall(initialDelay, spawnRay);
    builder.dynamicHazardEvents.push(starter);
    builder.dynamicHazardEvents.push(
        builder.time.addEvent({
            delay: interval,
            loop: true,
            callback: spawnRay,
        })
    );
}
