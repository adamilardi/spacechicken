// Pure background-paint toolkit shared by every biome module and the
// BackgroundRenderer engine: color math, range sampling, ridge lines, and
// star-layer splitting. No Phaser scene state; Phaser.Math is the only
// global, exactly as before.
export function blendColor(colorA, colorB, t) {
    const clamped = Phaser.Math.Clamp(t, 0, 1);
    const rA = (colorA >> 16) & 0xff;
    const gA = (colorA >> 8) & 0xff;
    const bA = colorA & 0xff;
    const rB = (colorB >> 16) & 0xff;
    const gB = (colorB >> 8) & 0xff;
    const bB = colorB & 0xff;
    const r = Math.round(Phaser.Math.Linear(rA, rB, clamped));
    const g = Math.round(Phaser.Math.Linear(gA, gB, clamped));
    const b = Math.round(Phaser.Math.Linear(bA, bB, clamped));
    return (r << 16) | (g << 8) | b;
}

export function adjustColor(color, amount) {
    const clampChannel = (value) => Math.max(0, Math.min(255, value));
    const r = clampChannel(((color >> 16) & 0xff) + amount);
    const g = clampChannel(((color >> 8) & 0xff) + amount);
    const b = clampChannel((color & 0xff) + amount);
    return (r << 16) | (g << 8) | b;
}

export function getRangeValue(range, fallbackMin, fallbackMax) {
    if (Array.isArray(range) && range.length >= 2) {
        const min = Math.min(range[0], range[1]);
        const max = Math.max(range[0], range[1]);
        return Phaser.Math.Between(min, max);
    }
    if (typeof range === 'number' && Number.isFinite(range)) {
        return range;
    }
    return Phaser.Math.Between(fallbackMin, fallbackMax);
}

export function createRidgePoints(
    worldWidth,
    baseY,
    amplitudeMin,
    amplitudeMax,
    segmentMin,
    segmentMax
) {
    const points = [];
    let x = -120;
    while (x <= worldWidth + 120) {
        points.push({
            x,
            y: baseY - Phaser.Math.Between(amplitudeMin, amplitudeMax),
        });
        x += Phaser.Math.Between(segmentMin, segmentMax);
    }
    return points;
}

export function sampleRidgeY(points, x, fallback) {
    if (!points || points.length === 0) {
        return fallback;
    }
    if (x <= points[0].x) {
        return points[0].y;
    }
    for (let i = 0; i < points.length - 1; i++) {
        const current = points[i];
        const next = points[i + 1];
        if (x >= current.x && x <= next.x) {
            const t = (x - current.x) / Math.max(1, next.x - current.x);
            return Phaser.Math.Linear(current.y, next.y, t);
        }
    }
    return points[points.length - 1].y;
}

export function starsFor(layout, layerId) {
    const stars = layout?.stars || [];
    if (layerId === 'mid') {
        return stars.filter((_, index) => index % 3 === 0);
    }
    if (layerId === 'far') {
        return stars.filter((_, index) => index % 3 !== 0);
    }
    return stars;
}
