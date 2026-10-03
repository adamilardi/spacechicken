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
    const dx = targetX - alienX;
    const dir = dx < -4 ? -1 : dx > 4 ? 1 : 0;
    const hop =
        Boolean(grounded) &&
        dir !== 0 &&
        targetY < alienY - options.hopClearance &&
        Math.abs(dx) <= options.hopRange;
    return {
        velocityX: dir * options.speed,
        velocityY: hop ? options.hopVelocity : null,
        flipX: dir === 0 ? null : dir < 0,
    };
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
