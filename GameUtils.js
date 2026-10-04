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
    };
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
