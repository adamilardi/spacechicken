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
    const inAggro = Math.abs(dxHome) <= aggroX && Math.abs(dyHome) <= aggroY;
    const goalX = inAggro ? targetX : homeX;
    const goalY = inAggro ? targetY : homeY;
    const dx = goalX - alienX;
    const dir = dx < -4 ? -1 : dx > 4 ? 1 : 0;
    const targetGrounded = options.targetGrounded !== false;
    // A grounded alien holds its ground while its target is airborne instead
    // of sliding underneath the jump. This keeps jump-overs dodgeable: the
    // alien only chases and hops once the target lands.
    const holdingForJump = Boolean(grounded) && inAggro && !targetGrounded;
    const hop =
        Boolean(grounded) &&
        !holdingForJump &&
        dir !== 0 &&
        goalY < alienY - options.hopClearance &&
        Math.abs(dx) <= options.hopRange &&
        (inAggro ? targetGrounded : true);
    return {
        velocityX: holdingForJump ? 0 : dir * options.speed,
        velocityY: hop ? options.hopVelocity : null,
        flipX: holdingForJump || dir === 0 ? null : dir < 0,
        goalX,
    };
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
    scatter: 0xffcf5a,
    piercer: 0x9cecff,
    nova: 0xff5a8a,
    tempest: 0xc78bff,
    hail: 0xf4ffff,
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
