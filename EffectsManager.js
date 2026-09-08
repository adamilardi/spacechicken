import { GAME_CONSTANTS } from './Constants.js';

const DEFAULT_TINTS = Object.freeze([0xffffff]);

export class EffectsManager {
    constructor(scene) {
        this.scene = scene;
        this.live = new Set();
        this.pool = [];
        this.playerScaleTween = null;
        this.restBody = null;
        this.crownIdleEvent = null;
        this.lastJetpackEmit = 0;
        this.destroyed = false;
    }

    burst(options = {}) {
        if (this.destroyed || !this.scene || !this.scene.add) {
            return [];
        }
        const count = Math.max(1, options.count || 8);
        const spawned = [];
        for (let i = 0; i < count; i++) {
            const particle = this.spawnParticle(options);
            if (particle) {
                spawned.push(particle);
            }
        }
        return spawned;
    }

    emitDust(x, y) {
        return this.burst({
            x,
            y,
            count: GAME_CONSTANTS.LAND_DUST_COUNT,
            texture: 'particleSoft',
            tint: [0xd6c4a2, 0xbba888, 0xf0e6d2],
            speedMin: 28,
            speedMax: 70,
            lifeMin: 220,
            lifeMax: 380,
            scale: 0.9,
            endScale: 0.15,
            angleMin: Math.PI * 1.05,
            angleMax: Math.PI * 1.95,
            gravity: 90,
            blend: false,
        });
    }

    emitJumpPuff(x, y) {
        return this.burst({
            x,
            y,
            count: GAME_CONSTANTS.JUMP_PUFF_COUNT,
            texture: 'particleSoft',
            tint: [0xe8f6ff, 0xc5e4ff],
            speedMin: 20,
            speedMax: 48,
            lifeMin: 180,
            lifeMax: 300,
            scale: 0.7,
            endScale: 0.1,
            angleMin: Math.PI * 1.1,
            angleMax: Math.PI * 1.9,
            blend: true,
        });
    }

    emitJetpack(x, y, facingLeft) {
        const drift = facingLeft ? 0.2 : -0.2;
        return this.burst({
            x: x + drift * 10,
            y: y + 12,
            count: 2,
            texture: 'particleSoft',
            tint: [0xffee88, 0xff9933, 0xff5522],
            speedMin: 24,
            speedMax: 58,
            lifeMin: 180,
            lifeMax: 280,
            scale: 0.55,
            endScale: 0.05,
            angleMin: Math.PI * 0.35 + drift,
            angleMax: Math.PI * 0.65 + drift,
            blend: true,
        });
    }

    deathBurst(x, y) {
        this.burst({
            x,
            y,
            count: GAME_CONSTANTS.DEATH_BURST_COUNT,
            texture: 'particleSoft',
            tint: [0xffeeaa, 0xff6622, 0xff3355, 0xffffff],
            speedMin: 50,
            speedMax: 160,
            lifeMin: 260,
            lifeMax: 480,
            scale: 1.1,
            endScale: 0.05,
            blend: true,
        });
        return this.burst({
            x,
            y,
            count: 6,
            texture: 'particleSpark',
            tint: [0xfff3c0, 0xffffff],
            speedMin: 40,
            speedMax: 120,
            lifeMin: 200,
            lifeMax: 360,
            scale: 0.9,
            endScale: 0.2,
            blend: true,
        });
    }

    collectBurst(x, y) {
        this.burst({
            x,
            y,
            count: GAME_CONSTANTS.COLLECT_BURST_COUNT,
            texture: 'particleSpark',
            tint: [0xfff6b0, 0xffd24a, 0xffffff, 0x8ce7ff],
            speedMin: 40,
            speedMax: 140,
            lifeMin: 320,
            lifeMax: 560,
            scale: 1,
            endScale: 0.15,
            blend: true,
        });
        return this.burst({
            x,
            y,
            count: 8,
            texture: 'particleSoft',
            tint: [0xffe066, 0xffffff],
            speedMin: 16,
            speedMax: 60,
            lifeMin: 280,
            lifeMax: 520,
            scale: 1.3,
            endScale: 0.2,
            blend: true,
        });
    }

    squashPlayer(player) {
        this.tweenPlayerScale(player, 1.26, 0.72, GAME_CONSTANTS.SQUASH_DURATION);
    }

    stretchPlayer(player) {
        this.tweenPlayerScale(player, 0.78, 1.28, GAME_CONSTANTS.STRETCH_DURATION);
    }

    startCrownIdle(crown) {
        this.stopCrownIdle();
        if (!this.scene || !this.scene.time || typeof this.scene.time.addEvent !== 'function') {
            return;
        }
        this.crownIdleEvent = this.scene.time.addEvent({
            delay: GAME_CONSTANTS.CROWN_SPARKLE_INTERVAL,
            loop: true,
            callback: () => {
                if (this.destroyed || !crown || crown.active === false) {
                    return;
                }
                this.burst({
                    x: crown.x + this.randomRange(-8, 8),
                    y: crown.y - 10 + this.randomRange(-4, 4),
                    count: 1,
                    texture: 'particleSpark',
                    tint: [0xfff4b8, 0xffffff],
                    speedMin: 8,
                    speedMax: 22,
                    lifeMin: 380,
                    lifeMax: 620,
                    scale: 0.7,
                    endScale: 0.05,
                    blend: true,
                });
            },
        });
    }

    update(player, isGrounded, isJetpacking) {
        if (this.destroyed || !player || isGrounded || !isJetpacking) {
            return;
        }
        const now =
            this.scene && this.scene.time && typeof this.scene.time.now === 'number'
                ? this.scene.time.now
                : Date.now();
        if (now - this.lastJetpackEmit < GAME_CONSTANTS.JETPACK_EMIT_INTERVAL) {
            return;
        }
        this.lastJetpackEmit = now;
        this.emitJetpack(player.x, player.y, Boolean(player.flipX));
    }

    cleanup() {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        this.stopCrownIdle();
        this.stopPlayerScaleTween();
        this.restBody = null;
        this.live.forEach((sprite) => {
            if (sprite && sprite.destroy) {
                sprite.destroy();
            }
        });
        this.live.clear();
        this.pool.forEach((sprite) => {
            if (sprite && sprite.destroy) {
                sprite.destroy();
            }
        });
        this.pool.length = 0;
    }

    acquireSprite(texture, x, y) {
        const sprite = this.pool.pop();
        if (sprite) {
            if (typeof sprite.setTexture === 'function') {
                sprite.setTexture(texture);
            }
            if (typeof sprite.setPosition === 'function') {
                sprite.setPosition(x, y);
            } else {
                sprite.x = x;
                sprite.y = y;
            }
            if (typeof sprite.setActive === 'function') {
                sprite.setActive(true);
            }
            if (typeof sprite.setVisible === 'function') {
                sprite.setVisible(true);
            }
            if (typeof sprite.setAlpha === 'function') {
                sprite.setAlpha(1);
            }
            return sprite;
        }
        if (!this.scene.add || typeof this.scene.add.image !== 'function') {
            return null;
        }
        return this.scene.add.image(x, y, texture);
    }

    spawnParticle(options) {
        if (!this.scene.add || typeof this.scene.add.image !== 'function') {
            return null;
        }
        const texture = this.resolveTexture(options.texture);
        const sprite = this.acquireSprite(texture, options.x || 0, options.y || 0);
        if (!sprite) {
            return null;
        }
        const tints =
            Array.isArray(options.tint) && options.tint.length ? options.tint : DEFAULT_TINTS;
        const tint = tints[Math.floor(Math.random() * tints.length)];
        const angle = this.randomRange(
            options.angleMin === undefined ? 0 : options.angleMin,
            options.angleMax === undefined ? Math.PI * 2 : options.angleMax
        );
        const speed = this.randomRange(options.speedMin || 20, options.speedMax || 80);
        const life = this.randomRange(options.lifeMin || 220, options.lifeMax || 400);
        const startScale = options.scale || 1;
        const gravity = options.gravity || 0;
        const duration = Math.max(80, life);
        this.styleParticle(sprite, options, tint, startScale);

        this.live.add(sprite);
        const destX = sprite.x + Math.cos(angle) * speed * (duration / 1000);
        const destY =
            sprite.y + Math.sin(angle) * speed * (duration / 1000) + gravity * (duration / 1000);
        if (this.scene.tweens && typeof this.scene.tweens.add === 'function') {
            this.scene.tweens.add({
                targets: sprite,
                x: destX,
                y: destY,
                alpha: 0,
                scale: options.endScale === undefined ? 0.12 : options.endScale,
                duration,
                ease: 'Quad.easeOut',
                onComplete: () => this.release(sprite),
            });
        } else {
            this.release(sprite);
        }
        return sprite;
    }

    styleParticle(sprite, options, tint, startScale) {
        if (typeof sprite.setDepth === 'function') {
            sprite.setDepth(options.depth || 22);
        }
        if (typeof sprite.setScale === 'function') {
            sprite.setScale(startScale);
        }
        if (typeof sprite.setTint === 'function') {
            sprite.setTint(tint);
        }
        if (
            options.blend !== false &&
            typeof sprite.setBlendMode === 'function' &&
            Phaser.BlendModes
        ) {
            sprite.setBlendMode(Phaser.BlendModes.ADD);
        }
    }

    tweenPlayerScale(player, scaleX, scaleY, duration) {
        if (!player || !this.scene.tweens || typeof this.scene.tweens.add !== 'function') {
            return;
        }
        this.stopPlayerScaleTween();
        if (typeof player.setScale === 'function') {
            player.setScale(1);
        }
        this.captureRestBody(player);
        this.playerScaleTween = this.scene.tweens.add({
            targets: player,
            scaleX,
            scaleY,
            duration: Math.max(40, duration || 80),
            yoyo: true,
            ease: 'Quad.easeOut',
            onUpdate: () => this.keepPlayerBodyStable(player),
            onComplete: () => {
                if (player && typeof player.setScale === 'function') {
                    player.setScale(1);
                }
                this.keepPlayerBodyStable(player);
                this.playerScaleTween = null;
            },
        });
    }

    captureRestBody(player) {
        if (this.restBody || !player || !player.body) {
            return;
        }
        const body = player.body;
        this.restBody = {
            width: body.sourceWidth || player.width || 32,
            height: body.sourceHeight || player.height || 32,
        };
    }

    keepPlayerBodyStable(player) {
        if (
            !player ||
            !player.body ||
            !this.restBody ||
            typeof player.body.setSize !== 'function'
        ) {
            return;
        }
        const scaleX = Math.abs(player.scaleX) || 1;
        const scaleY = Math.abs(player.scaleY) || 1;
        player.body.setSize(this.restBody.width / scaleX, this.restBody.height / scaleY, false);
    }

    stopPlayerScaleTween() {
        if (this.playerScaleTween && typeof this.playerScaleTween.stop === 'function') {
            this.playerScaleTween.stop();
        }
        this.playerScaleTween = null;
    }

    stopCrownIdle() {
        if (this.crownIdleEvent && typeof this.crownIdleEvent.remove === 'function') {
            this.crownIdleEvent.remove(false);
        }
        this.crownIdleEvent = null;
    }

    release(sprite) {
        if (!sprite) {
            return;
        }
        this.live.delete(sprite);
        if (this.destroyed) {
            if (sprite.destroy) {
                sprite.destroy();
            }
            return;
        }
        if (this.pool.length < GAME_CONSTANTS.PARTICLE_POOL_SIZE) {
            if (typeof sprite.setActive === 'function') {
                sprite.setActive(false);
            }
            if (typeof sprite.setVisible === 'function') {
                sprite.setVisible(false);
            }
            this.pool.push(sprite);
            return;
        }
        if (sprite.destroy) {
            sprite.destroy();
        }
    }

    resolveTexture(preferred) {
        if (
            preferred &&
            this.scene.textures &&
            typeof this.scene.textures.exists === 'function' &&
            this.scene.textures.exists(preferred)
        ) {
            return preferred;
        }
        if (
            this.scene.textures &&
            typeof this.scene.textures.exists === 'function' &&
            this.scene.textures.exists('particleSoft')
        ) {
            return 'particleSoft';
        }
        return preferred || 'particleSoft';
    }

    randomRange(min, max) {
        if (typeof max !== 'number') {
            return min;
        }
        return min + Math.random() * (max - min);
    }
}
