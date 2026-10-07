/**
 * Shared device matrix and performance budgets for Space Chicken testing.
 *
 * One source of truth for:
 * - `tests/device-matrix.test.cjs` (layout/input unit coverage)
 * - `tests/performance-budgets.test.cjs` (smooth-gameplay budget unit coverage)
 * - `scripts/verify-device-matrix.mjs` (Playwright mobile + desktop checks)
 *
 * Frame-spacing numbers need context: headless Chromium on SwiftShader is a
 * software rasterizer, so absolute frame intervals there reflect the test
 * environment more than the game. Main-thread budgets (update/render
 * submission, long tasks) and retained-resource budgets are the strict CI
 * signals; raw frame spacing is graded leniently in emulation and strictly
 * only for real-device reports from `performance.html`.
 */

export const DEVICE_PROFILES = Object.freeze([
    Object.freeze({
        id: 'iphone-se',
        label: 'iPhone SE · small phone portrait',
        category: 'phone',
        width: 320,
        height: 568,
        deviceScaleFactor: 2,
        hasTouch: true,
        isMobile: true,
        safeArea: { top: 20, right: 0, bottom: 0, left: 0 },
    }),
    Object.freeze({
        id: 'iphone-14',
        label: 'iPhone 14 · notch phone portrait',
        category: 'phone',
        width: 390,
        height: 844,
        deviceScaleFactor: 3,
        hasTouch: true,
        isMobile: true,
        safeArea: { top: 47, right: 0, bottom: 34, left: 0 },
    }),
    Object.freeze({
        id: 'pixel-7',
        label: 'Pixel 7 · android phone portrait',
        category: 'phone',
        width: 412,
        height: 915,
        deviceScaleFactor: 2.625,
        hasTouch: true,
        isMobile: true,
        safeArea: { top: 24, right: 0, bottom: 24, left: 0 },
    }),
    Object.freeze({
        id: 'iphone-landscape',
        label: 'iPhone · landscape',
        category: 'phone',
        width: 844,
        height: 390,
        deviceScaleFactor: 3,
        hasTouch: true,
        isMobile: true,
        safeArea: { top: 0, right: 47, bottom: 21, left: 47 },
    }),
    Object.freeze({
        id: 'android-landscape',
        label: 'Pixel · landscape',
        category: 'phone',
        width: 915,
        height: 412,
        deviceScaleFactor: 2.625,
        hasTouch: true,
        isMobile: true,
        safeArea: { top: 0, right: 24, bottom: 24, left: 24 },
    }),
    Object.freeze({
        id: 'ipad-portrait',
        label: 'iPad · portrait tablet',
        category: 'tablet',
        width: 768,
        height: 1024,
        deviceScaleFactor: 2,
        hasTouch: true,
        isMobile: true,
        safeArea: { top: 24, right: 0, bottom: 20, left: 0 },
    }),
    Object.freeze({
        id: 'ipad-landscape',
        label: 'iPad · landscape tablet',
        category: 'tablet',
        width: 1024,
        height: 768,
        deviceScaleFactor: 2,
        hasTouch: true,
        isMobile: true,
        safeArea: { top: 24, right: 0, bottom: 20, left: 0 },
    }),
    Object.freeze({
        id: 'laptop-1366',
        label: 'Laptop · 1366x768',
        category: 'desktop',
        width: 1366,
        height: 768,
        deviceScaleFactor: 1,
        hasTouch: false,
        isMobile: false,
        safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    }),
    Object.freeze({
        id: 'desktop-720p',
        label: 'Desktop · 1280x720',
        category: 'desktop',
        width: 1280,
        height: 720,
        deviceScaleFactor: 1,
        hasTouch: false,
        isMobile: false,
        safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    }),
    Object.freeze({
        id: 'desktop-1080p',
        label: 'Desktop · 1920x1080',
        category: 'desktop',
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
        hasTouch: false,
        isMobile: false,
        safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    }),
    Object.freeze({
        id: 'desktop-hidpi',
        label: 'Desktop · 1440x900 @2x',
        category: 'desktop',
        width: 1440,
        height: 900,
        deviceScaleFactor: 2,
        hasTouch: false,
        isMobile: false,
        safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    }),
    Object.freeze({
        id: 'ultrawide',
        label: 'Desktop · 2560x1080 ultrawide',
        category: 'desktop',
        width: 2560,
        height: 1080,
        deviceScaleFactor: 1,
        hasTouch: false,
        isMobile: false,
        safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    }),
]);

export const PERFORMANCE_BUDGETS = Object.freeze({
    // Target 60fps; 30fps is the minimum playable floor.
    frameTargetMs: 16.7,
    framePlayableMs: 33.34,
    // A single long frame users perceive as a hitch.
    stallMs: 50,
    // A visible freeze.
    freezeMs: 100,
    // Smooth gameplay: 55fps+ average, p95 within one 30fps frame.
    smoothFps: 55,
    smoothP95Ms: 20,
    playableFps: 30,
    // Strict budgets for well-sampled main-thread data (hundreds of samples,
    // e.g. real-device reports): typical frame work must leave headroom inside
    // a 16.7ms budget and no long tasks may block input.
    updateP95Ms: 8,
    updateP95MsThrottled: 12,
    renderP95Ms: 8,
    renderP95MsThrottled: 12,
    maxLongTasks: 0,
    // Lenient budgets for emulated runs (a dozen slow SwiftShader frames, so
    // p95 ≈ max): the average frame cost must stay tiny and no single update
    // may eat two frames by itself.
    emulatedMeanMs: 6,
    emulatedMaxMs: 30,
    // Emulated gate for software-rasterizer runs: frame spacing there measures
    // the test environment, not the game, so CI only requires the loop to stay
    // alive (enough samples) and never hard-freeze. Real smoothness is gated by
    // the main-thread budgets above and the hardware stall rate below.
    ciMinFrameSamples: 5,
    ciMaxSingleFrameMs: 2000,
    // Real-device gate for performance.html reports: flag recurring stalls.
    hardwareMaxStallRate: 0.05,
    hardwareMinFps: 55,
    // Retained-resource ceilings (see docs/performance-review.md).
    textureMiB: 30,
    maxSceneObjects: 400,
    maxPhysicsBodies: 60,
    maxLiveParticles: 64,
    // Measured 70 with 10 levels: 4 current-level backdrops plus preloaded
    // sprite frames, actors, weapons, and buttons. Kept tight so per-visit
    // leaks still trip the gate; raise deliberately when content grows.
    maxTextures: 80,
    // HUD timer rasterization cadence: 20Hz.
    timerBucketMs: 50,
});

export function classifyFrames(summary) {
    if (!summary || summary.count === 0 || summary.averageFps == null) return 'no-data';
    if (summary.averageFps >= PERFORMANCE_BUDGETS.smoothFps && summary.p95Ms <= 25) return 'smooth';
    if (summary.averageFps >= PERFORMANCE_BUDGETS.playableFps && summary.p95Ms <= 50)
        return 'playable';
    return 'janky';
}

function failure(message) {
    return { pass: false, reasons: [message] };
}

export function checkEmulatedFrameHealth(summary) {
    if (!summary || summary.count < PERFORMANCE_BUDGETS.ciMinFrameSamples)
        return failure(
            `only ${summary?.count || 0} frame samples; need at least ${PERFORMANCE_BUDGETS.ciMinFrameSamples}`
        );
    if (summary.maxMs > PERFORMANCE_BUDGETS.ciMaxSingleFrameMs)
        return failure(
            `single frame ${summary.maxMs}ms exceeds ${PERFORMANCE_BUDGETS.ciMaxSingleFrameMs}ms freeze ceiling`
        );
    return { pass: true, reasons: [] };
}

export function checkMainThreadHealth({
    update,
    render,
    longTasks,
    throttled = false,
    maxLongTasks = PERFORMANCE_BUDGETS.maxLongTasks,
}) {
    const reasons = [];
    const updateBudget = throttled
        ? PERFORMANCE_BUDGETS.updateP95MsThrottled
        : PERFORMANCE_BUDGETS.updateP95Ms;
    const renderBudget = throttled
        ? PERFORMANCE_BUDGETS.renderP95MsThrottled
        : PERFORMANCE_BUDGETS.renderP95Ms;
    if (!update || update.count < 5) reasons.push('fewer than 5 update samples');
    else if (update.p95Ms > updateBudget)
        reasons.push(`update p95 ${update.p95Ms}ms exceeds ${updateBudget}ms budget`);
    if (!render || render.count < 5) reasons.push('fewer than 5 render samples');
    else if (render.p95Ms > renderBudget)
        reasons.push(`render submission p95 ${render.p95Ms}ms exceeds ${renderBudget}ms budget`);
    const longTaskCount = Array.isArray(longTasks) ? longTasks.length : (longTasks?.count ?? 0);
    if (longTaskCount > maxLongTasks)
        reasons.push(`${longTaskCount} long tasks exceed budget of ${maxLongTasks}`);
    return reasons.length ? { pass: false, reasons } : { pass: true, reasons: [] };
}

export function checkEmulatedMainThread({ update, render }) {
    const reasons = [];
    for (const [name, summary] of [
        ['update', update],
        ['render submission', render],
    ]) {
        if (!summary || summary.count < PERFORMANCE_BUDGETS.ciMinFrameSamples) {
            reasons.push(`fewer than ${PERFORMANCE_BUDGETS.ciMinFrameSamples} ${name} samples`);
            continue;
        }
        if (summary.meanMs > PERFORMANCE_BUDGETS.emulatedMeanMs)
            reasons.push(
                `${name} mean ${summary.meanMs}ms exceeds ${PERFORMANCE_BUDGETS.emulatedMeanMs}ms budget`
            );
        if (summary.maxMs > PERFORMANCE_BUDGETS.emulatedMaxMs)
            reasons.push(
                `${name} max ${summary.maxMs}ms exceeds ${PERFORMANCE_BUDGETS.emulatedMaxMs}ms single-frame budget`
            );
    }
    return reasons.length ? { pass: false, reasons } : { pass: true, reasons: [] };
}

export function checkHardwareReport(scenario) {
    const reasons = [];
    const frames = scenario?.frames;
    if (!frames || frames.count === 0) return failure('scenario has no frame samples');
    const stallRate = frames.count ? (frames.over50Ms || 0) / frames.count : 1;
    if ((frames.averageFps || 0) < PERFORMANCE_BUDGETS.hardwareMinFps)
        reasons.push(
            `average ${frames.averageFps}fps below ${PERFORMANCE_BUDGETS.hardwareMinFps}fps hardware target`
        );
    if (stallRate > PERFORMANCE_BUDGETS.hardwareMaxStallRate)
        reasons.push(
            `${frames.over50Ms}/${frames.count} frames over 50ms (${Math.round(stallRate * 100)}% > ${PERFORMANCE_BUDGETS.hardwareMaxStallRate * 100}% stall allowance)`
        );
    if ((frames.over100Ms || 0) > 0) reasons.push(`${frames.over100Ms} visible freezes over 100ms`);
    return reasons.length ? { pass: false, reasons } : { pass: true, reasons: [] };
}

export function checkTextureBudget(estimatedMiB, maxMiB = PERFORMANCE_BUDGETS.textureMiB) {
    if (!Number.isFinite(estimatedMiB)) return failure('texture estimate is not a finite number');
    if (estimatedMiB > maxMiB)
        return failure(`texture estimate ${estimatedMiB}MiB exceeds ${maxMiB}MiB budget`);
    return { pass: true, reasons: [] };
}

export function checkSceneResources(snapshot) {
    const reasons = [];
    if (snapshot.objects > PERFORMANCE_BUDGETS.maxSceneObjects)
        reasons.push(
            `${snapshot.objects} scene objects exceed ${PERFORMANCE_BUDGETS.maxSceneObjects}`
        );
    if (snapshot.dynamicBodies > PERFORMANCE_BUDGETS.maxPhysicsBodies)
        reasons.push(
            `${snapshot.dynamicBodies} physics bodies exceed ${PERFORMANCE_BUDGETS.maxPhysicsBodies}`
        );
    if (snapshot.particles > PERFORMANCE_BUDGETS.maxLiveParticles)
        reasons.push(
            `${snapshot.particles} live particles exceed pool budget ${PERFORMANCE_BUDGETS.maxLiveParticles}`
        );
    if (snapshot.textures > PERFORMANCE_BUDGETS.maxTextures)
        reasons.push(`${snapshot.textures} textures exceed ${PERFORMANCE_BUDGETS.maxTextures}`);
    return reasons.length ? { pass: false, reasons } : { pass: true, reasons: [] };
}

export function maxTimerRedraws(durationMs) {
    return Math.ceil(durationMs / PERFORMANCE_BUDGETS.timerBucketMs) + 2;
}
