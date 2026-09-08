import { GAME_CONSTANTS } from './Constants.js';
import { addLoopingTween, valueOrDefault } from './GameUtils.js';

export class WorldBuilder {
    constructor(scene) {
        this.scene = scene;
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

    set dynamicHazardEvents(value) {
        this.scene.dynamicHazardEvents = value;
    }

    set activeWarningGraphics(value) {
        this.scene.activeWarningGraphics = value;
    }

    valueOrDefault(value, fallback) {
        return valueOrDefault(value, fallback);
    }

    build(levelConfig) {
        this.buildStaticPlatforms(levelConfig.platforms.static);
        this.buildFloorPlatforms(levelConfig.platforms.floor);
        const movingPlatforms = this.setupMovingPlatforms(levelConfig.platforms.moving);
        this.buildStaticHazards(levelConfig.hazards.rocks);
        const dynamicHazardsGroup = this.setupDynamicHazards(levelConfig.hazards.dynamic);
        return { movingPlatforms, dynamicHazardsGroup };
    }

    clearHazardTimers() {
        if (this.scene.dynamicHazardEvents) {
            this.scene.dynamicHazardEvents.forEach((event) => {
                if (event && typeof event.remove === 'function') {
                    event.remove(false);
                }
            });
            this.scene.dynamicHazardEvents = [];
        }
        if (this.scene.activeWarningGraphics) {
            this.scene.activeWarningGraphics.forEach((graphic) => {
                if (graphic && typeof graphic.destroy === 'function') {
                    graphic.destroy();
                }
            });
            this.scene.activeWarningGraphics = [];
        }
    }

    buildStaticPlatforms(platformConfigs) {
        if (!platformConfigs || platformConfigs.length === 0) {
            return;
        }
        platformConfigs.forEach((config) => {
            const key = config.key || 'cliff';
            const platform = this.platforms.create(config.x, config.y, key);
            platform.setDepth(0);
            const scaleX = this.valueOrDefault(config.scaleX, 1);
            const scaleY = this.valueOrDefault(config.scaleY, 1);
            if (scaleX !== 1 || scaleY !== 1) {
                platform.setScale(scaleX, scaleY);
                platform.refreshBody();
            }
            if (config.angle !== undefined && config.angle !== null) {
                platform.setAngle(config.angle);
                platform.refreshBody();
            }
        });
    }

    buildFloorPlatforms(floorConfig) {
        if (!floorConfig) {
            return;
        }
        const step = this.valueOrDefault(floorConfig.step, 100);
        const key = floorConfig.key || 'cliff';
        const scaleX = this.valueOrDefault(floorConfig.scaleX, 1);
        const scaleY = this.valueOrDefault(floorConfig.scaleY, 1);
        if (Array.isArray(floorConfig.segments) && floorConfig.segments.length) {
            floorConfig.segments.forEach((segment) => {
                const startX = segment[0];
                const endX = segment[1];
                for (let x = startX; x <= endX; x += step) {
                    const platform = this.platforms.create(x, floorConfig.y, key);
                    platform.setDepth(0);
                    if (scaleX !== 1 || scaleY !== 1) {
                        platform.setScale(scaleX, scaleY);
                        platform.refreshBody();
                    }
                }
            });
            return;
        }
        const startX = this.valueOrDefault(floorConfig.start, 0);
        for (let x = startX; x < this.worldWidth; x += step) {
            const shouldPlace =
                typeof floorConfig.condition === 'function'
                    ? floorConfig.condition(x, this.worldWidth)
                    : true;
            if (!shouldPlace) {
                continue;
            }
            const platform = this.platforms.create(x, floorConfig.y, key);
            platform.setDepth(0);
            if (scaleX !== 1 || scaleY !== 1) {
                platform.setScale(scaleX, scaleY);
                platform.refreshBody();
            }
        }
    }

    setupMovingPlatforms(movingConfigs) {
        if (!movingConfigs || movingConfigs.length === 0) {
            return null;
        }
        const group = this.physics.add.group({ allowGravity: false });
        movingConfigs.forEach((config) => {
            const platform = group.create(config.x, config.y, config.key || 'cliff');
            platform.setImmovable(true);
            platform.body.allowGravity = false;
            platform.setPushable(false);
            platform.setDepth(0);

            if (config.origin) {
                const originX = this.valueOrDefault(config.origin.x, 0.5);
                const originY = this.valueOrDefault(config.origin.y, 0.5);
                platform.setOrigin(originX, originY);
            }

            if (config.flipX) {
                platform.setFlipX(true);
            }

            const scaleX = this.valueOrDefault(config.scaleX, 1);
            const scaleY = this.valueOrDefault(config.scaleY, 1);
            if (scaleX !== 1 || scaleY !== 1) {
                platform.setScale(scaleX, scaleY);
            }

            const bodySize = config.bodySize || {};
            const bodyWidth = this.valueOrDefault(bodySize.width, platform.displayWidth);
            const bodyHeight = this.valueOrDefault(bodySize.height, platform.displayHeight);
            const bodyScaleX = Math.abs(platform.scaleX) || 1;
            const bodyScaleY = Math.abs(platform.scaleY) || 1;
            platform.body.setSize(bodyWidth / bodyScaleX, bodyHeight / bodyScaleY, true);

            if (config.bodyOffset) {
                const offsetX = this.valueOrDefault(config.bodyOffset.x, platform.body.offset.x);
                const offsetY = this.valueOrDefault(config.bodyOffset.y, platform.body.offset.y);
                platform.body.setOffset(offsetX, offsetY);
            }

            if (config.tween) {
                addLoopingTween(this.tweens, platform, config.tween);
            }

            if (config.pathVelocity) {
                const velocityX = this.valueOrDefault(config.pathVelocity.x, 0);
                const velocityY = this.valueOrDefault(config.pathVelocity.y, 0);
                platform.body.setVelocity(velocityX, velocityY);
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
            const scaleX = this.valueOrDefault(config.scaleX, 1);
            const scaleY = this.valueOrDefault(config.scaleY, 1);
            if (scaleX !== 1 || scaleY !== 1) {
                hazard.setScale(scaleX, scaleY);
                hazard.refreshBody();
            }
        });
    }

    setupDynamicHazards(dynamicConfigs) {
        // Clean up any existing dynamic hazard events
        if (this.dynamicHazardEvents) {
            this.dynamicHazardEvents.forEach((event) => event.remove());
        }
        this.dynamicHazardEvents = [];
        if (this.activeWarningGraphics) {
            this.activeWarningGraphics.forEach((g) => g && g.destroy && g.destroy());
            this.activeWarningGraphics = [];
        }

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
                default: {
                    const hazard = group.create(config.x, config.y, config.key || 'rock');
                    hazard.body.allowGravity = false;
                    hazard.setImmovable(true);
                    const scaleX = this.valueOrDefault(config.scaleX, 1);
                    const scaleY = this.valueOrDefault(config.scaleY, 1);
                    if (scaleX !== 1 || scaleY !== 1) {
                        hazard.setScale(scaleX, scaleY);
                    }
                    if (config.tween) {
                        addLoopingTween(this.tweens, hazard, config.tween);
                    }
                    if (config.velocity) {
                        const velocityX = this.valueOrDefault(config.velocity.x, 0);
                        const velocityY = this.valueOrDefault(config.velocity.y, 0);
                        hazard.setVelocity(velocityX, velocityY);
                    }
                    break;
                }
            }
        });
        return group;
    }

    createLaserHazard(group, config) {
        const orientation = config.orientation || 'horizontal';
        const length = this.valueOrDefault(config.length, 200);
        const width = this.valueOrDefault(config.width, 10);
        const beamTexture =
            config.key || (orientation === 'vertical' ? 'laserBeamVertical' : 'laserBeam');
        const beam = group.create(config.x, config.y, beamTexture);
        beam.body.allowGravity = false;
        beam.setImmovable(true);
        beam.setBlendMode(Phaser.BlendModes.ADD);
        beam.setDepth(this.valueOrDefault(config.depth, 6));

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

        const startActive = this.valueOrDefault(config.initiallyActive, true);
        const setState = (state) => {
            beam.body.enable = state;
            beam.setActive(state);
            beam.setVisible(state);
        };
        setState(startActive);

        if (this.tweens && typeof this.tweens.add === 'function') {
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
            const emitterDepth = this.valueOrDefault(config.depth, 6) - 1;
            emitterStart.setDepth(emitterDepth);
            emitterEnd.setDepth(emitterDepth);
        }

        const onDuration = this.valueOrDefault(
            config.onDuration,
            GAME_CONSTANTS.LASER_DEFAULT_ON_DURATION
        );
        const offDuration = this.valueOrDefault(
            config.offDuration,
            GAME_CONSTANTS.LASER_DEFAULT_OFF_DURATION
        );
        const startDelay = this.valueOrDefault(
            config.startDelay,
            GAME_CONSTANTS.LASER_DEFAULT_START_DELAY
        );

        const scheduleCycle = (state, delay) => {
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
        drone.body.allowGravity = false;
        drone.setImmovable(true);
        const scale = this.valueOrDefault(config.scale, 1);
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
        drone.setDepth(this.valueOrDefault(config.depth, 7));

        if (config.patrol) {
            addLoopingTween(this.tweens, drone, config.patrol);
        }

        if (config.bobAmplitude !== undefined && config.bobAmplitude !== null) {
            this.tweens.add({
                targets: drone,
                y: drone.y - config.bobAmplitude,
                duration: this.valueOrDefault(
                    config.bobDuration,
                    GAME_CONSTANTS.BOB_DEFAULT_DURATION
                ),
                yoyo: true,
                repeat: -1,
                ease: GAME_CONSTANTS.BOB_DEFAULT_EASE,
                delay: this.valueOrDefault(config.bobDelay, 0),
            });
        }

        if (config.spin) {
            const spinConfig =
                typeof config.spin === 'object'
                    ? Object.assign({}, config.spin)
                    : { angle: config.spin };
            if (typeof spinConfig.angle === 'number') {
                const angle = spinConfig.angle;
                this.tweens.add({
                    targets: drone,
                    angle: { from: -angle, to: angle },
                    duration: this.valueOrDefault(
                        spinConfig.duration,
                        GAME_CONSTANTS.SPIN_DEFAULT_DURATION
                    ),
                    yoyo: true,
                    repeat: -1,
                    ease: GAME_CONSTANTS.SPIN_DEFAULT_EASE,
                });
            } else {
                this.tweens.add({
                    targets: drone,
                    angle: spinConfig.angle || { from: -10, to: 10 },
                    duration: this.valueOrDefault(
                        spinConfig.duration,
                        GAME_CONSTANTS.SPIN_DEFAULT_DURATION
                    ),
                    yoyo: true,
                    repeat: -1,
                    ease: GAME_CONSTANTS.SPIN_DEFAULT_EASE,
                });
            }
        }
    }

    createRoverHazard(group, config) {
        const rover = group.create(config.x, config.y, 'rover');
        rover.body.allowGravity = false;
        rover.setImmovable(true);
        rover.setDepth(6);

        // Rovers are ground threats - slightly smaller hitbox
        rover.body.setSize(42, 24, true);
        rover.body.setOffset(7, 6);

        if (config.patrol) {
            addLoopingTween(this.tweens, rover, config.patrol);
        }
    }

    createCosmicRayHazard(group, config) {
        const startY = config.y || 80;
        const interval = this.valueOrDefault(config.interval, 2000);
        const warningTime = this.valueOrDefault(config.warning, 420);
        const initialDelay = this.valueOrDefault(config.delay, 0);

        const spawnRay = () => {
            // Strong visual warning: bright vertical beam + top glow
            const warning = this.add.graphics();
            warning.setDepth(25);
            if (this.activeWarningGraphics) {
                this.activeWarningGraphics.push(warning);
            }

            // Bright warning column (much more visible)
            warning.fillStyle(0xffee66, 0.35);
            warning.fillRect(config.x - 18, startY, 36, this.worldHeight - 100);

            // Core bright line
            warning.fillStyle(0xffffaa, 0.9);
            warning.fillRect(config.x - 5, startY, 10, this.worldHeight - 100);

            // Top charge glow (using graphics)
            warning.fillStyle(0xffee66, 0.6);
            warning.fillCircle(config.x, startY + 35, 28);
            warning.fillStyle(0xffffff, 0.85);
            warning.fillCircle(config.x, startY + 35, 14);

            // Remove warning, then spawn the actual damaging ray
            const warningDelay = this.time.delayedCall(warningTime, () => {
                Phaser.Utils.Array.Remove(this.dynamicHazardEvents, warningDelay);
                if (this.activeWarningGraphics) {
                    Phaser.Utils.Array.Remove(this.activeWarningGraphics, warning);
                }
                warning.destroy();

                const ray = group.create(config.x, startY, 'laserBeamVertical');
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

                // The ray is dangerous for a short window
                const rayLife = this.time.delayedCall(220, () => {
                    Phaser.Utils.Array.Remove(this.dynamicHazardEvents, rayLife);
                    if (ray && ray.destroy) ray.destroy();
                });
                this.dynamicHazardEvents.push(rayLife);
            });
            this.dynamicHazardEvents.push(warningDelay);
        };

        const starter = this.time.delayedCall(initialDelay, spawnRay);
        this.dynamicHazardEvents.push(starter);

        // Repeat
        const repeatEvent = this.time.addEvent({
            delay: interval,
            loop: true,
            callback: spawnRay,
        });
        this.dynamicHazardEvents.push(repeatEvent);
    }
}
