export function formatElapsedTime(milliseconds) {
    const safeTime =
        typeof milliseconds === 'number' && Number.isFinite(milliseconds) && milliseconds >= 0
            ? milliseconds
            : 0;
    const minutes = Math.floor(safeTime / 60000);
    const seconds = Math.floor((safeTime % 60000) / 1000);
    const centiseconds = Math.floor((safeTime % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}

export function valueOrDefault(value, fallback) {
    return value === undefined || value === null ? fallback : value;
}

// Title level select: step the selection, clamped to unlocked levels.
export function cycleSelection(current, direction, max) {
    const safe = Number.isInteger(current) ? current : 1;
    const limit = Number.isInteger(max) && max > 0 ? max : 1;
    return Math.min(limit, Math.max(1, safe + (direction > 0 ? 1 : -1)));
}

// Checkpoints: furthest crossed point at or behind the chicken, or -1.
export function checkpointIndexAt(checkpoints, x) {
    let best = -1;
    const points = Array.isArray(checkpoints) ? checkpoints : [];
    for (let i = 0; i < points.length; i++) {
        if (typeof points[i]?.x === 'number' && x >= points[i].x) {
            best = i;
        }
    }
    return best;
}

// Jump style: 'max' always jumps full height; 'fine' cuts the rise on
// early release. Anything unrecognized falls back to max.
export function normalizeJumpMode(value) {
    return value === 'fine' ? 'fine' : 'max';
}

export const JUMP_MODE_LABEL = Object.freeze({
    max: 'Max jump',
    fine: 'Fine control',
});

// Difficulty: 'normal' is the intended experience; 'hard' remixes timers
// and speeds via HARD_MODE. Anything unrecognized falls back to normal.
export function normalizeDifficulty(value) {
    return value === 'hard' ? 'hard' : 'normal';
}

export const DIFFICULTY_LABEL = Object.freeze({
    normal: 'Normal',
    hard: 'Hard',
});

// Hard-mode remix of one dynamic hazard config. Pure: returns a new
// object, never mutates level data. Unknown types pass through untouched.
export function applyHardModeConfig(config, mults) {
    if (!config || typeof config !== 'object') {
        return config;
    }
    const harden = (value, mult) =>
        typeof value === 'number' && Number.isFinite(value) ? Math.round(value * mult) : value;
    switch (config.type) {
        case 'laser':
            return { ...config, offDuration: harden(config.offDuration, mults.LASER_OFF_MULT) };
        case 'drip':
            return { ...config, interval: harden(config.interval, mults.INTERVAL_MULT) };
        case 'cosmicRay':
            return {
                ...config,
                interval: harden(config.interval, mults.INTERVAL_MULT),
                warning: harden(config.warning, mults.WARNING_MULT),
            };
        case 'crusher':
            return { ...config, duration: harden(config.duration, mults.CRUSHER_MULT) };
        case 'bearRaider':
            return {
                ...config,
                hoverMs: harden(config.hoverMs, mults.PATROL_MULT),
                telegraphMs: harden(config.telegraphMs, mults.WARNING_MULT),
            };
        case 'shrike':
            return {
                ...config,
                hoverMs: harden(config.hoverMs, mults.PATROL_MULT),
                telegraphMs: harden(config.telegraphMs, mults.WARNING_MULT),
                sweep: config.sweep
                    ? {
                          ...config.sweep,
                          duration: harden(config.sweep.duration, mults.PATROL_MULT),
                      }
                    : config.sweep,
            };
        case 'drone':
        case 'rover':
        case 'roller':
        case 'dustDevil':
        case 'bonk':
            if (!config.patrol || typeof config.patrol !== 'object') {
                return { ...config };
            }
            return {
                ...config,
                patrol: {
                    ...config.patrol,
                    duration: harden(config.patrol.duration, mults.PATROL_MULT),
                },
            };
        default:
            return { ...config };
    }
}

// Hard-mode remix of bomb settings. Pure.
export function hardBombSettings(settings, mults) {
    if (!settings || typeof settings !== 'object') {
        return settings;
    }
    const harden = (value, mult) =>
        typeof value === 'number' && Number.isFinite(value) ? Math.round(value * mult) : value;
    return {
        ...settings,
        speed: harden(settings.speed, mults.BOMB_SPEED_MULT),
        delayMin: harden(settings.delayMin, mults.BOMB_DELAY_MULT),
        delayMax: harden(settings.delayMax, mults.BOMB_DELAY_MULT),
    };
}

// Variable jump height: releasing jump mid-ascent cuts the rise short.
// Ascents stronger than a full jump (bonk boosts) are never cut.
export function jumpCutVelocity(velocityY, fullVelocity, multiplier) {
    if (typeof velocityY !== 'number' || velocityY >= 0 || velocityY < fullVelocity) {
        return velocityY;
    }
    const cut = fullVelocity * multiplier;
    return velocityY < cut ? cut : velocityY;
}

export function canBonkFromAbove(chicken, hazard, minFallSpeed = 30) {
    if (!hazard?.bonkable || hazard.bonkLock) {
        return false;
    }
    const body = chicken?.body;
    if (!body) {
        return false;
    }
    const fallSpeed = body.velocity?.y ?? 0;
    if (fallSpeed < minFallSpeed) {
        return false;
    }
    const playerHalf = (body.height || chicken.displayHeight || 32) / 2;
    const playerBottom = chicken.y + playerHalf;
    const hazardHalf = (hazard.body?.height || hazard.displayHeight || 32) / 2;
    const hazardTop = hazard.y - hazardHalf;
    const headRoom = Math.max(14, hazardHalf * 0.9);
    return playerBottom <= hazardTop + headRoom;
}

export function boarderSteering(alienX, alienY, targetX, targetY, grounded, options) {
    const homeX = options.homeX ?? alienX;
    const homeY = options.homeY ?? alienY;
    const aggroX = options.aggroX ?? Number.POSITIVE_INFINITY;
    const aggroY = options.aggroY ?? Number.POSITIVE_INFINITY;
    const dxHome = targetX - homeX;
    const dyHome = targetY - homeY;
    const inAggro = options.engaged ?? (Math.abs(dxHome) <= aggroX && Math.abs(dyHome) <= aggroY);
    const goalX = inAggro ? targetX : homeX;
    const goalY = inAggro ? targetY : homeY;
    const dx = goalX - alienX;
    const dir = dx < -4 ? -1 : dx > 4 ? 1 : 0;
    const targetGrounded = options.targetGrounded !== false;
    const hop =
        Boolean(grounded) &&
        dir !== 0 &&
        goalY < alienY - options.hopClearance &&
        Math.abs(dx) <= options.hopRange &&
        (inAggro ? targetGrounded : true);
    return {
        velocityX: dir * options.speed,
        velocityY: hop ? options.hopVelocity : null,
        flipX: dir === 0 ? null : dir < 0,
        goalX,
        goalY,
    };
}

// Contra aim: which way a chicken's gun points this frame. Fire is aimed
// with held direction keys, never with the facing alone: aimUp fires up
// (diagonal while moving), aimDown fires down only while airborne — on
// the ground it falls back to forward fire, because there is no crouch.
// moveX is the current horizontal input (or run velocity); facing is the
// last horizontal direction faced. Returns a unit vector; diagonals use
// SQRT1_2 so bolt speed is constant in every direction.
export function aimVector(options = {}) {
    const facing = options.facing < 0 ? -1 : 1;
    const moveX = Number(options.moveX) || 0;
    const horizontal = moveX !== 0 ? Math.sign(moveX) : facing;
    const up = Boolean(options.aimUp);
    const down = Boolean(options.aimDown);
    if (up === down) {
        return { x: horizontal, y: 0 };
    }
    if (up) {
        return moveX !== 0 ? { x: horizontal * Math.SQRT1_2, y: -Math.SQRT1_2 } : { x: 0, y: -1 };
    }
    if (options.grounded) {
        return { x: horizontal, y: 0 };
    }
    return moveX !== 0 ? { x: horizontal * Math.SQRT1_2, y: Math.SQRT1_2 } : { x: 0, y: 1 };
}

export function nextBoarderWave(currentWave, leadX, waves) {
    let wave = currentWave > 0 ? currentWave : 1;
    const list = waves || [];
    for (let i = 0; i < list.length; i++) {
        const entry = list[i];
        if (entry.wave > wave && leadX >= entry.x) {
            wave = entry.wave;
        }
    }
    return wave;
}

// The crown deck hangs over the last hull post, so that post drops in just
// under the deck. Open posts fall in from above.
export function boarderEntryY(homeX, homeY) {
    const underCrownDeck = homeX >= 3232 && homeX <= 3808 && homeY > 484;
    return underCrownDeck ? homeY - 28 : homeY - 140;
}

export function boarderYields(alienX, alienY, goalX, allies, separation) {
    const alienDist = Math.abs(goalX - alienX);
    for (let i = 0; i < allies.length; i++) {
        const ally = allies[i];
        if (Math.abs(ally.x - alienX) >= separation) {
            continue;
        }
        if (Math.abs(ally.y - alienY) >= 48) {
            continue;
        }
        const allyDist = Math.abs(goalX - ally.x);
        if (allyDist < alienDist - 1) {
            return true;
        }
        if (Math.abs(allyDist - alienDist) <= 1 && ally.x < alienX) {
            return true;
        }
    }
    return false;
}

export function addLoopingTween(tweens, target, config) {
    if (!tweens || typeof tweens.add !== 'function' || !config) {
        return null;
    }
    const tweenConfig = Object.assign({ targets: target }, config);
    if (!Object.prototype.hasOwnProperty.call(tweenConfig, 'yoyo')) {
        tweenConfig.yoyo = true;
    }
    if (!Object.prototype.hasOwnProperty.call(tweenConfig, 'repeat')) {
        tweenConfig.repeat = -1;
    }
    if (!Object.prototype.hasOwnProperty.call(tweenConfig, 'ease')) {
        tweenConfig.ease = 'Sine.easeInOut';
    }
    return tweens.add(tweenConfig);
}

// Player arsenal. The space phaser is the default everywhere; each contra
// level unlocks one more gun. Guns share cooldown, pool, range, and the
// boarders-only hit rule — they differ in coverage shape, Contra-style.
export const WEAPON_DEFS = Object.freeze({
    phaser: Object.freeze({
        id: 'phaser',
        name: 'Phaser',
        gun: 'spacePhaser',
        bolt: 'phaserBolt',
        boltWidth: 28,
        boltHeight: 8,
        spread: 0,
        pierce: 0,
    }),
    scatter: Object.freeze({
        id: 'scatter',
        name: 'Scatter',
        gun: 'scatterGun',
        bolt: 'scatterBolt',
        boltWidth: 20,
        boltHeight: 6,
        spread: 140,
        pierce: 0,
    }),
    piercer: Object.freeze({
        id: 'piercer',
        name: 'Piercer',
        gun: 'piercerGun',
        bolt: 'piercerBolt',
        boltWidth: 34,
        boltHeight: 4,
        spread: 0,
        pierce: 99,
    }),
    nova: Object.freeze({
        id: 'nova',
        name: 'Nova',
        gun: 'novaGun',
        bolt: 'novaOrb',
        boltWidth: 16,
        boltHeight: 16,
        spread: 0,
        pierce: 0,
    }),
    tempest: Object.freeze({
        id: 'tempest',
        name: 'Tempest',
        gun: 'tempestGun',
        bolt: 'tempestBolt',
        boltWidth: 22,
        boltHeight: 8,
        spread: 150,
        pierce: 0,
        ways: 5,
    }),
    hail: Object.freeze({
        id: 'hail',
        name: 'Hail',
        gun: 'hailGun',
        bolt: 'hailBolt',
        boltWidth: 26,
        boltHeight: 6,
        spread: 120,
        pierce: 2,
    }),
    ripper: Object.freeze({
        id: 'ripper',
        name: 'Ripper',
        gun: 'ripperGun',
        bolt: 'ripperBolt',
        boltWidth: 24,
        boltHeight: 8,
        spread: 200,
        pierce: 1,
    }),
    comet: Object.freeze({
        id: 'comet',
        name: 'Comet',
        gun: 'cometGun',
        bolt: 'cometBolt',
        boltWidth: 20,
        boltHeight: 8,
        spread: 90,
        pierce: 1,
        ways: 5,
    }),
    halo: Object.freeze({
        id: 'halo',
        name: 'Halo',
        gun: 'haloGun',
        bolt: 'haloOrb',
        boltWidth: 18,
        boltHeight: 18,
        spread: 0,
        pierce: 99,
    }),
});

export function weaponsForLevel(level) {
    if (Number(level) >= 15)
        return [
            'phaser',
            'scatter',
            'piercer',
            'nova',
            'tempest',
            'hail',
            'ripper',
            'comet',
            'halo',
        ];
    if (Number(level) >= 14)
        return ['phaser', 'scatter', 'piercer', 'nova', 'tempest', 'hail', 'ripper', 'comet'];
    if (Number(level) >= 13)
        return ['phaser', 'scatter', 'piercer', 'nova', 'tempest', 'hail', 'ripper'];
    if (Number(level) >= 12) return ['phaser', 'scatter', 'piercer', 'nova', 'tempest', 'hail'];
    if (Number(level) >= 11) return ['phaser', 'scatter', 'piercer', 'nova', 'tempest'];
    if (Number(level) >= 10) return ['phaser', 'scatter', 'piercer', 'nova'];
    if (Number(level) >= 9) return ['phaser', 'scatter', 'piercer'];
    if (Number(level) >= 8) return ['phaser', 'scatter'];
    return ['phaser'];
}

export const POD_TINTS = Object.freeze({
    phaser: 0x7af6ff,
    scatter: 0xffb15a,
    piercer: 0x8ef6ff,
    nova: 0xffd74f,
    tempest: 0xc78bff,
    hail: 0x9cecff,
    ripper: 0xff9a4a,
    comet: 0x7df9ff,
    halo: 0xffb15a,
});

export function rescueBonusMs(count, bonusMs = 2000) {
    const safe = Math.max(0, Math.floor(Number(count) || 0));
    return safe * Math.max(0, bonusMs);
}

export function effectiveLevelTime(levelTime, rescues, bonusMs = 2000, floorMs = 1000) {
    const time = Math.max(0, Number(levelTime) || 0);
    return Math.max(floorMs, time - rescueBonusMs(rescues, bonusMs));
}

export function activeWeaponId(baseId, tempGun, now) {
    if (tempGun && tempGun.id && Number(tempGun.until) > Number(now)) {
        return tempGun.id;
    }
    return baseId;
}

export function tempGunMsLeft(tempGun, now) {
    if (!tempGun || !tempGun.id) {
        return 0;
    }
    return Math.max(0, Number(tempGun.until) - Number(now));
}

export function nextWeaponId(current, level) {
    const list = weaponsForLevel(level);
    const index = list.indexOf(current);
    return list[(index + 1) % list.length] || 'phaser';
}
