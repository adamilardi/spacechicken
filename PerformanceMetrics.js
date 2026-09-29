const round = (value) => Math.round(value * 100) / 100;

export function summarizeSamples(samples) {
    const sorted = samples
        .filter((value) => Number.isFinite(value) && value >= 0)
        .sort((a, b) => a - b);
    if (!sorted.length)
        return { count: 0, meanMs: null, p50Ms: null, p95Ms: null, p99Ms: null, maxMs: null };
    const percentile = (fraction) =>
        round(sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)]);
    return {
        count: sorted.length,
        meanMs: round(sorted.reduce((sum, value) => sum + value, 0) / sorted.length),
        p50Ms: percentile(0.5),
        p95Ms: percentile(0.95),
        p99Ms: percentile(0.99),
        maxMs: round(sorted.at(-1)),
        over33Ms: sorted.filter((value) => value > 33.34).length,
        over50Ms: sorted.filter((value) => value > 50).length,
        over100Ms: sorted.filter((value) => value > 100).length,
    };
}

export function summarizeFrames(samples) {
    const summary = summarizeSamples(samples);
    return { ...summary, averageFps: summary.meanMs > 0 ? round(1000 / summary.meanMs) : null };
}
