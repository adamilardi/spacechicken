import { GAME_CONSTANTS } from './Constants.js';
import { addLoopingTween } from './GameUtils.js';

export class WorldBuilder {
    constructor(scene) {
        this.scene = scene;
        this.warningPool = [];
        this.testEntityCounter = 0;
    }

    get platforms() {
        return this.scene.platforms;
    }

    get hazards() {
        return this.scene.hazards;
    }

    get physics() {
        return this.scene.physics;
    }

    get tweens() {
        return this.scene.tweens;
    }

    get time() {
        return this.scene.time;
    }

    get add() {
        return this.scene.add;
    }

    get worldWidth() {
        return this.scene.worldWidth;
    }

    get worldHeight() {
        return this.scene.worldHeight;
    }

    get dynamicHazardEvents() {
        return this.scene.dynamicHazardEvents;
    }

    get activeWarningGraphics() {
        return this.scene.activeWarningGraphics;
    }

    get now() {
        return Number.isFinite(this.time?.now) ? this.time.now : 0;
    }

    phaseDeadline(delay) {
        return this.now + delay / (this.scene.testTimeScale || 1);
    }

    set dynamicHazardEvents(value) {
        this.scene.dynamicHazardEvents = value;
    }

    set activeWarningGraphics(value) {
        this.scene.activeWarningGraphics = value;
    }

    tagTestEntity(entity, metadata) {
        if (!entity) return entity;
        this.testEntityCounter += 1;
        entity.testMeta = {
            id: `${metadata.type || metadata.kind || 'entity'}-${this.testEntityCounter}`,
            ...metadata,
        };
        return entity;
    }

    build(levelConfig) {
        this.buildStaticPlatforms(levelConfig.platforms.static);
        this.buildFloorPlatforms(levelConfig.platforms.floor);
        this.placeProps(levelConfig.props);
        const movingPlatforms = this.setupMovingPlatforms(levelConfig.platforms.moving);
        this.buildStaticHazards(levelConfig.hazards.rocks);
        const dynamic = levelConfig.hazards.dynamic || [];
        const boarderConfigs = dynamic.filter((config) => config.type === 'boarder');
        const otherDynamic = dynamic.filter((config) => config.type !== 'boarder');
        const dynamicHazardsGroup = this.setupDynamicHazards(otherDynamic);
        const boardersGroup = this.setupBoarders(boarderConfigs);
        return { movingPlatforms, dynamicHazardsGroup, boardersGroup };
    }

    clearHazardTimers() {
        const events = this.scene.dynamicHazardEvents;
        if (events) {
            events.forEach((event) => {
                if (event?.remove) {
                    event.remove(false);
                }
            });
            this.scene.dynamicHazardEvents = [];
        }
        const warnings = this.scene.activeWarningGraphics;
        if (warnings) {
            warnings.forEach((graphic) => this.releaseWarningGraphics(graphic, true));
            this.scene.activeWarningGraphics = [];
        }
        this.warningPool.forEach((graphic) => {
            if (graphic.destroy) {
                graphic.destroy();
            }
        });
        this.warningPool.length = 0;
        this.scene.testHazardSchedules = [];
    }

    acquireWarningGraphics() {
        const graphic = this.warningPool.pop() || this.add.graphics();
        graphic.clear();
        if (graphic.setVisible) {
            graphic.setVisible(true);
        }
        if (graphic.setActive) {
            graphic.setActive(true);
        }
        return graphic;
    }

    releaseWarningGraphics(graphic, destroy = false) {
        if (!graphic) {
            return;
        }
        if (destroy) {
            if (graphic.destroy) {
                graphic.destroy();
            }
            return;
        }
        graphic.clear();
        graphic.rayX = null;
        if (graphic.setVisible) {
            graphic.setVisible(false);
        }
        if (this.warningPool.length < GAME_CONSTANTS.WARNING_POOL_SIZE) {
            this.warningPool.push(graphic);
            return;
        }
        if (graphic.destroy) {
            graphic.destroy();
        }
    }

    placeProps(props) {
        if (!props || props.length === 0 || !this.add?.image) {
            return;
        }
        props.forEach((prop) => {
            const image = this.add.image(prop.x, prop.y, prop.key);
            if (!image) {
                return;
            }
            image.setDepth(prop.depth ?? 2);
            const scale = prop.scale ?? 1;
            if (scale !== 1) {
                image.setScale(scale);
            }
        });
    }

    buildStaticPlatforms(platformConfigs) {
        if (!platformConfigs || platformConfigs.length === 0) {
            return;
        }
        platformConfigs.forEach((config) => {
            const platform = this.platforms.create(config.x, config.y, config.key || 'cliff');
            this.tagTestEntity(platform, { kind: 'platform', type: 'static_platform' });
            platform.setDepth(0);
            const scaleX = config.scaleX ?? 1;
            const scaleY = config.scaleY ?? 1;
            if (scaleX !== 1 || scaleY !== 1) {
                platform.setScale(scaleX, scaleY);
                platform.refreshBody();
            }
            if (config.angle != null) {
                platform.setAngle(config.angle);
                platform.refreshBody();
            }
        });
    }

    buildFloorPlatforms(floorConfig) {
        if (!floorConfig) {
            return;
        }
        const step = floorConfig.step ?? 100;
        const key = floorConfig.key || 'cliff';
        const scaleX = floorConfig.scaleX ?? 1;
        const scaleY = floorConfig.scaleY ?? 1;
        const positions = [];
        if (Array.isArray(floorConfig.segments) && floorConfig.segments.length) {
            floorConfig.segments.forEach((segment) => {
                for (let x = segment[0]; x <= segment[1]; x += step) {
                    positions.push(x);
                }
            });
        } else {
            const startX = floorConfig.start ?? 0;
            for (let x = startX; x < this.worldWidth; x += step) {
                if (
                    typeof floorConfig.condition === 'function' &&
                    !floorConfig.condition(x, this.worldWidth)
                ) {
                    continue;
                }
                positions.push(x);
            }
        }
        this.placeFloorRuns(positions, floorConfig.y, key, scaleX, scaleY, step);
    }

    placeFloorRuns(positions, y, key, scaleX, scaleY, step) {
        if (!positions.length) {
            return;
        }
        positions.sort((a, b) => a - b);
        const tileWidth = GAME_CONSTANTS.FLOOR_TILE_SIZE * scaleX;
        const tileHeight = GAME_CONSTANTS.FLOOR_TILE_SIZE * scaleY;
        let runStart = 0;
        for (let i = 1; i <= positions.length; i++) {
            const endOfRun = i === positions.length || positions[i] - positions[i - 1] > step + 1;
            if (!endOfRun) {
                continue;
            }
            const run = positions.slice(runStart, i);
            for (let j = 0; j < run.length; j++) {
                this.placeFloorVisual(run[j], y, key, scaleX, scaleY);
            }
            if (this.add?.image) {
                this.placeFloorCollider(run, y, key, tileWidth, tileHeight);
            }
            runStart = i;
        }
    }

    placeFloorVisual(x, y, key, scaleX, scaleY) {
        if (!this.add?.image) {
            const platform = this.platforms.create(x, y, key);
            this.tagTestEntity(platform, { kind: 'platform', type: 'static_platform' });
            platform.setDepth(0);
            if (scaleX !== 1 || scaleY !== 1) {
                platform.setScale(scaleX, scaleY);
                platform.refreshBody();
            }
            return;
        }
        const image = this.add.image(x, y, key);
        image.setDepth(0);
        if (scaleX !== 1 || scaleY !== 1) {
            image.setScale(scaleX, scaleY);
        }
    }

    placeFloorCollider(run, y, key, tileWidth, tileHeight) {
        if (!this.platforms?.create || !run.length) {
            return;
        }
        const left = run[0] - tileWidth / 2;
        const right = run[run.length - 1] + tileWidth / 2;
        const collider = this.platforms.create((left + right) / 2, y, key);
        this.tagTestEntity(collider, { kind: 'platform', type: 'floor' });
        collider.setDepth(0);
        collider.setVisible(false);
        if (collider.setDisplaySize) {
            collider.setDisplaySize(right - left, tileHeight);
        } else {
            collider.displayWidth = right - left;
            collider.displayHeight = tileHeight;
        }
        collider.refreshBody?.();
    }

    setupMovingPlatforms(movingConfigs) {
        if (!movingConfigs || movingConfigs.length === 0) {
            return null;
        }
        const group = this.physics.add.group({ allowGravity: false });
        // eslint-disable-next-line complexity
        movingConfigs.forEach((config) => {
            const platform = group.create(config.x, config.y, config.key || 'cliff');
            this.tagTestEntity(platform, {
                kind: 'platform',
                type: 'moving_platform',
                origin: { x: config.x, y: config.y },
                target: config.tween
                    ? { x: config.tween.x ?? config.x, y: config.tween.y ?? config.y }
                    : null,
                durationMs: config.tween?.duration ?? null,
                delayMs: config.tween?.delay ?? 0,
            });
            platform.setImmovable(true);
            platform.body.allowGravity = false;
            platform.setPushable(false);
            platform.setDepth(0);

            if (config.origin) {
                platform.setOrigin(config.origin.x ?? 0.5, config.origin.y ?? 0.5);
            }
            if (config.flipX) {
                platform.setFlipX(true);
            }

            const scaleX = config.scaleX ?? 1;
            const scaleY = config.scaleY ?? 1;
            if (scaleX !== 1 || scaleY !== 1) {
                platform.setScale(scaleX, scaleY);
            }

            const bodySize = config.bodySize || {};
            const bodyWidth = bodySize.width ?? platform.displayWidth;
            const bodyHeight = bodySize.height ?? platform.displayHeight;
            const bodyScaleX = Math.abs(platform.scaleX) || 1;
            const bodyScaleY = Math.abs(platform.scaleY) || 1;
            platform.body.setSize(bodyWidth / bodyScaleX, bodyHeight / bodyScaleY, true);

            if (config.bodyOffset) {
                platform.body.setOffset(
                    config.bodyOffset.x ?? platform.body.offset.x,
                    config.bodyOffset.y ?? platform.body.offset.y
                );
            }
            if (config.tween) {
                addLoopingTween(this.tweens, platform, config.tween);
            }
            if (config.pathVelocity) {
                platform.body.setVelocity(config.pathVelocity.x ?? 0, config.pathVelocity.y ?? 0);
            }
        });
        return group;
    }

    buildStaticHazards(rockConfigs) {
        if (!rockConfigs || rockConfigs.length === 0) {
            return;
        }
        rockConfigs.forEach((config) => {
            const hazard = this.hazards.create(config.x, config.y, config.key || 'rock');
            this.tagTestEntity(hazard, { kind: 'hazard', type: 'rock' });
            const scaleX = config.scaleX ?? 1;
            const scaleY = config.scaleY ?? 1;
            if (scaleX !== 1 || scaleY !== 1) {
                hazard.setScale(scaleX, scaleY);
                hazard.refreshBody();
            }
        });
    }

    setupDynamicHazards(dynamicConfigs) {
        this.clearHazardTimers();
        this.dynamicHazardEvents = [];
        this.activeWarningGraphics = [];
        this.scene.testHazardSchedules = [];

        if (!dynamicConfigs || dynamicConfigs.length === 0) {
            return null;
        }

        const group = this.physics.add.group({ allowGravity: false });
        dynamicConfigs.forEach((config) => {
            switch (config.type) {
                case 'laser':
                    this.createLaserHazard(group, config);
                    break;
                case 'drone':
                    this.createDroneHazard(group, config);
                    break;
                case 'rover':
                    this.createRoverHazard(group, config);
                    break;
                case 'cosmicRay':
                    this.createCosmicRayHazard(group, config);
                    break;
                case 'bonk':
                    this.createBonkEnemy(group, config);
                    break;
                case 'crusher':
                    this.createCrusherHazard(group, config);
                    break;
                case 'drip':
                    this.createDripHazard(group, config);
                    break;
                case 'roller':
                    this.createRollerHazard(group, config);
                    break;
                case 'dustDevil':
                    this.createDustDevilHazard(group, config);
                    break;
                default: {
                    const hazard = group.create(config.x, config.y, config.key || 'rock');
                    this.tagTestEntity(hazard, {
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
                        addLoopingTween(this.tweens, hazard, config.tween);
                    }
                    if (config.velocity) {
                        hazard.setVelocity(config.velocity.x ?? 0, config.velocity.y ?? 0);
                    }
                    break;
                }
            }
        });
        return group;
    }

    createLaserHazard(group, config) {
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
        this.tagTestEntity(beam, {
            kind: 'hazard',
            type: 'laser',
            orientation,
            onDurationMs: onDuration,
            offDurationMs: offDuration,
            phase: startActive ? 'active' : 'cooldown',
            nextChangeAt: this.phaseDeadline(startDelay + (startActive ? onDuration : offDuration)),
        });
        beam.body.allowGravity = false;
        beam.setImmovable(true);
        beam.setBlendMode(Phaser.BlendModes.ADD);
        beam.setDepth(config.depth ?? 6);
        this.tintHazard(beam, config.tint);

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

        if (this.tweens?.add) {
            this.tweens.add({
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
            const emitterStart = this.add.image(config.x - offsetX, config.y - offsetY, emitterKey);
            const emitterEnd = this.add.image(config.x + offsetX, config.y + offsetY, emitterKey);
            if (orientation === 'vertical') {
                emitterStart.setAngle(90);
                emitterEnd.setAngle(90);
            }
            const emitterDepth = (config.depth ?? 6) - 1;
            emitterStart.setDepth(emitterDepth);
            emitterEnd.setDepth(emitterDepth);
            this.tintHazard(emitterStart, config.tint);
            this.tintHazard(emitterEnd, config.tint);
        }

        const scheduleCycle = (state, delay) => {
            beam.testMeta.nextChangeAt = this.phaseDeadline(delay);
            const event = this.time.delayedCall(delay, () => {
                Phaser.Utils.Array.Remove(this.dynamicHazardEvents, event);
                const nextState = !state;
                setState(nextState);
                scheduleCycle(nextState, nextState ? onDuration : offDuration);
            });
            this.dynamicHazardEvents.push(event);
        };

        const starter = this.time.delayedCall(startDelay, () => {
            Phaser.Utils.Array.Remove(this.dynamicHazardEvents, starter);
            scheduleCycle(startActive, startActive ? onDuration : offDuration);
        });
        this.dynamicHazardEvents.push(starter);
    }

    createDroneHazard(group, config) {
        const drone = group.create(config.x, config.y, config.key || 'drone');
        this.tagTestEntity(drone, {
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
            addLoopingTween(this.tweens, drone, config.patrol);
        }

        if (config.bobAmplitude != null) {
            this.tweens.add({
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
            const spinConfig =
                typeof config.spin === 'object' ? config.spin : { angle: config.spin };
            const angle =
                typeof spinConfig.angle === 'number'
                    ? { from: -spinConfig.angle, to: spinConfig.angle }
                    : spinConfig.angle || { from: -10, to: 10 };
            this.tweens.add({
                targets: drone,
                angle,
                duration: spinConfig.duration ?? GAME_CONSTANTS.SPIN_DEFAULT_DURATION,
                yoyo: true,
                repeat: -1,
                ease: GAME_CONSTANTS.SPIN_DEFAULT_EASE,
            });
        }
    }

    createRoverHazard(group, config) {
        const rover = group.create(config.x, config.y, 'rover');
        this.tagTestEntity(rover, {
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
            addLoopingTween(this.tweens, rover, config.patrol);
        }
    }

    createCosmicRayHazard(group, config) {
        const startY = config.y || 80;
        const interval = config.interval ?? 2000;
        const warningTime = config.warning ?? 420;
        const initialDelay = config.delay ?? 0;
        const schedule = {
            id: `cosmic_ray-${++this.testEntityCounter}`,
            kind: 'hazard_schedule',
            type: 'cosmic_ray',
            x: config.x,
            y: startY,
            intervalMs: interval,
            warningDurationMs: warningTime,
            activeDurationMs: 220,
            phase: 'cooldown',
            nextChangeAt: this.phaseDeadline(initialDelay),
        };
        if (!Array.isArray(this.scene.testHazardSchedules)) {
            this.scene.testHazardSchedules = [];
        }
        this.scene.testHazardSchedules.push(schedule);

        const spawnRay = () => {
            schedule.phase = 'warning';
            schedule.nextChangeAt = this.phaseDeadline(warningTime);
            schedule.nextWarningAt = this.phaseDeadline(interval);
            const warning = this.acquireWarningGraphics();
            warning.rayX = config.x;
            warning.setDepth(25);
            if (this.activeWarningGraphics) {
                this.activeWarningGraphics.push(warning);
            }

            warning.fillStyle(0xffee66, 0.35);
            warning.fillRect(config.x - 18, startY, 36, this.worldHeight - 100);
            warning.fillStyle(0xffffaa, 0.9);
            warning.fillRect(config.x - 5, startY, 10, this.worldHeight - 100);
            warning.fillStyle(0xffee66, 0.6);
            warning.fillCircle(config.x, startY + 35, 28);
            warning.fillStyle(0xffffff, 0.85);
            warning.fillCircle(config.x, startY + 35, 14);

            const warningDelay = this.time.delayedCall(warningTime, () => {
                Phaser.Utils.Array.Remove(this.dynamicHazardEvents, warningDelay);
                if (this.activeWarningGraphics) {
                    Phaser.Utils.Array.Remove(this.activeWarningGraphics, warning);
                }
                this.releaseWarningGraphics(warning);
                schedule.phase = 'active';
                schedule.nextChangeAt = this.phaseDeadline(schedule.activeDurationMs);

                const ray = group.create(config.x, startY, 'laserBeamVertical');
                this.tagTestEntity(ray, {
                    kind: 'hazard',
                    type: 'cosmic_ray',
                    phase: 'active',
                    scheduleId: schedule.id,
                });
                ray.setDisplaySize(10, this.worldHeight - 110);
                ray.body.allowGravity = false;
                ray.setImmovable(true);
                ray.setBlendMode(Phaser.BlendModes.ADD);
                ray.setDepth(8);

                const rayLength = this.worldHeight - 110;
                const hitThickness = 8;
                const scaleX = Math.abs(ray.scaleX) || 1;
                const scaleY = Math.abs(ray.scaleY) || 1;
                ray.body.setSize(hitThickness / scaleX, rayLength / scaleY, true);

                const rayLife = this.time.delayedCall(220, () => {
                    Phaser.Utils.Array.Remove(this.dynamicHazardEvents, rayLife);
                    if (ray?.destroy) {
                        ray.destroy();
                    }
                    schedule.phase = 'cooldown';
                    schedule.nextChangeAt = schedule.nextWarningAt;
                });
                this.dynamicHazardEvents.push(rayLife);
            });
            this.dynamicHazardEvents.push(warningDelay);
        };

        const starter = this.time.delayedCall(initialDelay, spawnRay);
        this.dynamicHazardEvents.push(starter);
        this.dynamicHazardEvents.push(
            this.time.addEvent({
                delay: interval,
                loop: true,
                callback: spawnRay,
            })
        );
    }

    tintHazard(sprite, tint) {
        if (tint != null && sprite?.setTint) {
            sprite.setTint(tint);
        }
    }

    setupBoarders(configs) {
        if (!configs || configs.length === 0) {
            return null;
        }
        const group = this.physics.add.group();
        configs.forEach((config) => this.createBoarder(group, config));
        return group;
    }

    createBoarder(group, config) {
        const alien = group.create(config.x, config.y, 'boarder');
        if (!alien) {
            return;
        }
        alien.shootable = true;
        alien.homeX = config.x;
        alien.homeY = config.y;
        alien.wave = config.wave > 1 ? config.wave : 1;
        alien.arrived = alien.wave === 1;
        alien.setDepth(7);
        alien.setBounce(0);
        alien.setCollideWorldBounds(false);
        alien.body.allowGravity = true;
        alien.body.setSize(22, 36, true);
        this.tagTestEntity(alien, {
            kind: 'hazard',
            type: 'boarder',
            shootable: true,
            wave: alien.wave,
            origin: { x: config.x, y: config.y },
        });
        if (!alien.arrived) {
            alien.body.enable = false;
            alien.setActive(false);
            alien.setVisible(false);
        }
    }

    createBonkEnemy(group, config) {
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
        this.tagTestEntity(enemy, {
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
        if (config.patrol && this.tweens?.add) {
            addLoopingTween(this.tweens, enemy, {
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
        if (config.bobAmplitude != null && this.tweens?.add) {
            this.tweens.add({
                targets: enemy,
                y: enemy.y - config.bobAmplitude,
                duration: config.bobDuration ?? GAME_CONSTANTS.BOB_DEFAULT_DURATION,
                yoyo: true,
                repeat: -1,
                ease: GAME_CONSTANTS.BOB_DEFAULT_EASE,
                delay: config.bobDelay ?? 0,
            });
        }
        this.attachBonkMarker(enemy);
    }

    attachBonkMarker(enemy) {
        if (!enemy || !this.add?.image) {
            return;
        }
        const lift = Math.round((enemy.displayHeight || enemy.height || 48) * 0.5 + 8);
        const marker = this.add.image(enemy.x, enemy.y - lift, 'bonkMarker');
        if (!marker) {
            return;
        }
        marker.setDepth((enemy.depth || 7) + 4);
        enemy.bonkMarker = marker;
        enemy.bonkMarkerLift = lift;
    }

    createCrusherHazard(group, config) {
        const crusher = group.create(config.x, config.y, config.key || 'crusher');
        this.tagTestEntity(crusher, {
            kind: 'hazard',
            type: 'crusher',
            origin: { x: config.x, y: config.y },
            target: { x: config.x, y: config.slamY ?? config.y + 120 },
            durationMs: config.duration ?? 780,
            delayMs: config.delay ?? 0,
        });
        crusher.body.allowGravity = false;
        crusher.setImmovable(true);
        crusher.setDepth(8);
        crusher.body.setSize(64, 22, true);
        if (config.slamY != null) {
            addLoopingTween(this.tweens, crusher, {
                y: config.slamY,
                duration: config.duration ?? 780,
                ease: 'Quad.easeIn',
                delay: config.delay ?? 0,
                hold: config.hold ?? 280,
            });
        }
    }

    createDripHazard(group, config) {
        const interval = config.interval ?? 1500;
        const spawn = () => {
            const drop = group.create(config.x, config.y, config.key || 'acidDrop');
            if (!drop) {
                return;
            }
            this.tagTestEntity(drop, { kind: 'hazard', type: 'acid_drip' });
            drop.body.allowGravity = true;
            drop.setImmovable(false);
            drop.setVelocity(0, config.speed ?? 90);
            drop.body.setGravityY?.(config.gravityY ?? 900);
            drop.setDepth(6);
            const watch = this.time.addEvent({
                delay: 100,
                loop: true,
                callback: () => {
                    if (!drop.scene || drop.y > this.worldHeight + 40) {
                        watch.remove(false);
                        Phaser.Utils.Array.Remove(this.dynamicHazardEvents, watch);
                        drop.destroy();
                    }
                },
            });
            this.dynamicHazardEvents.push(watch);
        };
        const starter = this.time.delayedCall(config.delay ?? 0, () => {
            Phaser.Utils.Array.Remove(this.dynamicHazardEvents, starter);
            spawn();
        });
        this.dynamicHazardEvents.push(starter);
        this.dynamicHazardEvents.push(
            this.time.addEvent({
                delay: interval,
                loop: true,
                callback: spawn,
            })
        );
    }

    createRollerHazard(group, config) {
        const roller = group.create(config.x, config.y, config.key || 'boulder');
        this.tagTestEntity(roller, {
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
            addLoopingTween(this.tweens, roller, config.patrol);
        }
        if (this.tweens?.add) {
            this.tweens.add({
                targets: roller,
                angle: 360,
                duration: config.spinDuration ?? 700,
                repeat: -1,
                ease: 'Linear',
            });
        }
    }

    createDustDevilHazard(group, config) {
        const devil = group.create(config.x, config.y, config.key || 'dustDevil');
        this.tagTestEntity(devil, {
            kind: 'hazard',
            type: 'dust_devil',
            origin: { x: config.x, y: config.y },
            target: config.patrol
                ? { x: config.patrol.x ?? config.x, y: config.patrol.y ?? config.y }
                : null,
            durationMs: config.patrol?.duration ?? null,
            delayMs: config.patrol?.delay ?? 0,
        });
        devil.body.allowGravity = false;
        devil.setImmovable(true);
        devil.setDepth(6);
        devil.setBlendMode?.(Phaser.BlendModes.ADD);
        devil.body.setSize(18, 78, true);
        if (config.patrol) {
            addLoopingTween(this.tweens, devil, config.patrol);
        }
        if (this.tweens?.add) {
            this.tweens.add({
                targets: devil,
                angle: { from: -8, to: 8 },
                duration: 420,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        }
    }
}
