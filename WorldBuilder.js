import { GAME_CONSTANTS } from './Constants.js';
import { addLoopingTween } from './GameUtils.js';
import { spawnDynamicHazard, spawners } from './enemies/index.js';

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
            spawnDynamicHazard(this, group, config);
        });
        return group;
    }

    createLaserHazard(group, config) {
        spawners.laser(this, group, config);
    }

    createBoarder(group, config) {
        spawners.boarder(this, group, config);
    }
    setupBoarders(configs) {
        if (!configs || configs.length === 0) {
            return null;
        }
        const group = this.physics.add.group();
        configs.forEach((config) => this.createBoarder(group, config));
        return group;
    }
}
