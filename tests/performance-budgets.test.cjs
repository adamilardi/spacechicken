const test = require('node:test');
const assert = require('node:assert/strict');

test('frame summaries expose the percentiles and stall counts budgets need', async () => {
    const { summarizeFrames, summarizeSamples } = await import('../PerformanceMetrics.js');

    const smooth = summarizeFrames(Array(120).fill(16.7));
    assert.equal(smooth.count, 120);
    assert.ok(smooth.averageFps > 55);
    assert.ok(smooth.p95Ms <= 20);
    assert.equal(smooth.over50Ms, 0);
    assert.equal(smooth.over100Ms, 0);

    const janky = summarizeFrames([16, 16, 16, 16, 16, 16, 16, 16, 16, 100]);
    assert.equal(janky.over50Ms, 1);
    assert.equal(janky.over100Ms, 0);
    assert.ok(janky.averageFps < 55);

    const frozen = summarizeSamples([16, 16, 250]);
    assert.equal(frozen.over50Ms, 1);
    assert.equal(frozen.over100Ms, 1);
    assert.equal(frozen.maxMs, 250);

    // Invalid samples never masquerade as perfect performance.
    const empty = summarizeFrames([Number.NaN, Number.POSITIVE_INFINITY, -5]);
    assert.equal(empty.count, 0);
    assert.equal(empty.averageFps, null);
    assert.equal(empty.p95Ms, null);
});

test('smooth 60fps gameplay passes every hardware gate', async () => {
    const { summarizeFrames } = await import('../PerformanceMetrics.js');
    const { checkHardwareReport, classifyFrames } = await import('../PerformanceBudgets.js');

    const frames = summarizeFrames(Array(600).fill(16.7));
    assert.equal(classifyFrames(frames), 'smooth');
    assert.deepEqual(checkHardwareReport({ frames }), { pass: true, reasons: [] });
});

test('recurring stalls and freezes fail the real-device gate', async () => {
    const { summarizeFrames } = await import('../PerformanceMetrics.js');
    const { checkHardwareReport, classifyFrames } = await import('../PerformanceBudgets.js');

    // 10% of frames stall: clearly noticeable on a phone.
    const stutter = summarizeFrames([...Array(90).fill(16.7), ...Array(10).fill(80)]);
    assert.equal(classifyFrames(stutter), 'janky');
    const stutterResult = checkHardwareReport({ frames: stutter });
    assert.equal(stutterResult.pass, false);
    assert.ok(stutterResult.reasons.some((reason) => reason.includes('over 50ms')));

    const frozen = summarizeFrames([...Array(99).fill(16.7), 250]);
    const frozenResult = checkHardwareReport({ frames: frozen });
    assert.equal(frozenResult.pass, false);
    assert.ok(frozenResult.reasons.some((reason) => reason.includes('100ms')));

    assert.deepEqual(checkHardwareReport({ frames: summarizeFrames([]) }).pass, false);
});

test('emulated CI tolerates software rasterizer spacing but catches freezes', async () => {
    const { summarizeFrames } = await import('../PerformanceMetrics.js');
    const { checkEmulatedFrameHealth } = await import('../PerformanceBudgets.js');

    // Typical SwiftShader spacing: slow but flowing, no hard freeze.
    const emulated = summarizeFrames(Array(60).fill(400));
    assert.equal(checkEmulatedFrameHealth(emulated).pass, true);

    const frozen = summarizeFrames([...Array(59).fill(70), 2500]);
    const result = checkEmulatedFrameHealth(frozen);
    assert.equal(result.pass, false);
    assert.ok(result.reasons.some((reason) => reason.includes('freeze')));

    assert.equal(checkEmulatedFrameHealth(summarizeFrames([16])).pass, false);
});

test('emulated runs gate on average cost plus single-frame spikes', async () => {
    const { summarizeSamples } = await import('../PerformanceMetrics.js');
    const { checkEmulatedMainThread } = await import('../PerformanceBudgets.js');

    // A dozen slow emulated frames with cheap per-frame work: healthy.
    const healthy = checkEmulatedMainThread({
        update: summarizeSamples([2, 1, 3, 2, 1, 2, 4, 1, 2, 3, 2, 1]),
        render: summarizeSamples([1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 1]),
    });
    assert.deepEqual(healthy, { pass: true, reasons: [] });

    // Creeping average cost fails even without one big spike.
    const heavy = checkEmulatedMainThread({
        update: summarizeSamples(Array(12).fill(10)),
        render: summarizeSamples(Array(12).fill(1)),
    });
    assert.equal(heavy.pass, false);
    assert.ok(heavy.reasons.some((reason) => reason.includes('update mean')));

    // One update eating two frames fails even with a fine average.
    const spike = checkEmulatedMainThread({
        update: summarizeSamples([2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 45]),
        render: summarizeSamples(Array(12).fill(1)),
    });
    assert.equal(spike.pass, false);
    assert.ok(spike.reasons.some((reason) => reason.includes('update max')));

    const tooFew = checkEmulatedMainThread({
        update: summarizeSamples([2]),
        render: summarizeSamples([1]),
    });
    assert.equal(tooFew.pass, false);
});

test('main-thread budgets catch update/render regressions, including throttled phones', async () => {
    const { summarizeSamples } = await import('../PerformanceMetrics.js');
    const { checkMainThreadHealth } = await import('../PerformanceBudgets.js');

    const healthy = checkMainThreadHealth({
        update: summarizeSamples(Array(120).fill(2)),
        render: summarizeSamples(Array(120).fill(1)),
        longTasks: [],
    });
    assert.deepEqual(healthy, { pass: true, reasons: [] });

    const slowUpdate = checkMainThreadHealth({
        update: summarizeSamples(Array(120).fill(25)),
        render: summarizeSamples(Array(120).fill(1)),
        longTasks: [],
    });
    assert.equal(slowUpdate.pass, false);
    assert.ok(slowUpdate.reasons.some((reason) => reason.includes('update p95')));

    const slowRender = checkMainThreadHealth({
        update: summarizeSamples(Array(120).fill(2)),
        render: summarizeSamples(Array(120).fill(25)),
        longTasks: [],
    });
    assert.equal(slowRender.pass, false);

    const jankyPhone = checkMainThreadHealth({
        update: summarizeSamples(Array(120).fill(11)),
        render: summarizeSamples(Array(120).fill(11)),
        longTasks: [60],
        throttled: true,
    });
    assert.equal(jankyPhone.pass, false);
    assert.ok(jankyPhone.reasons.some((reason) => reason.includes('long task')));

    // The throttled allowance still catches real regressions.
    const throttledOk = checkMainThreadHealth({
        update: summarizeSamples(Array(120).fill(9)),
        render: summarizeSamples(Array(120).fill(5)),
        longTasks: [],
        throttled: true,
    });
    assert.equal(throttledOk.pass, true);
});

test('texture and scene-resource budgets guard phone memory', async () => {
    const { checkTextureBudget, checkSceneResources, PERFORMANCE_BUDGETS } =
        await import('../PerformanceBudgets.js');

    assert.equal(checkTextureBudget(22.18).pass, true);
    assert.equal(checkTextureBudget(29.9).pass, true);
    const over = checkTextureBudget(PERFORMANCE_BUDGETS.textureMiB + 1);
    assert.equal(over.pass, false);
    assert.equal(checkTextureBudget(Number.NaN).pass, false);

    assert.deepEqual(
        checkSceneResources({ objects: 68, dynamicBodies: 3, particles: 9, textures: 31 }),
        { pass: true, reasons: [] }
    );
    const leaked = checkSceneResources({
        objects: 2000,
        dynamicBodies: 200,
        particles: 500,
        textures: 200,
    });
    assert.equal(leaked.pass, false);
    assert.equal(leaked.reasons.length, 4);
});

test('HUD timer work stays at or below a 20Hz rasterization cadence', async () => {
    const { UIManager } = await import('../UIManager.js');
    const { maxTimerRedraws, PERFORMANCE_BUDGETS } = await import('../PerformanceBudgets.js');
    assert.equal(PERFORMANCE_BUDGETS.timerBucketMs, 50);

    const redraws = [];
    const manager = new UIManager({});
    manager.timerText = {
        setText(value) {
            redraws.push(value);
        },
    };
    // Four seconds of 60fps updates must not rasterize anywhere near 240 times.
    for (let ms = 0; ms < 4000; ms += 16.7) manager.updateTimer(ms);
    assert.ok(
        redraws.length <= maxTimerRedraws(4000),
        `${redraws.length} timer redraws exceed 20Hz budget`
    );
    assert.ok(redraws.length >= 40, 'timer should still visibly tick forward');
});

test('particle bursts expire and pooled sprites are reused instead of leaking', async () => {
    const { EffectsManager } = await import('../EffectsManager.js');
    const { GAME_CONSTANTS } = await import('../Constants.js');
    let created = 0;
    const scene = {
        add: {
            image(x, y) {
                created += 1;
                const sprite = {
                    x,
                    y,
                    setDepth: () => sprite,
                    setScale: () => sprite,
                    setTint: () => sprite,
                    setBlendMode: () => sprite,
                    setTexture: () => sprite,
                    setPosition: () => sprite,
                    setActive: () => sprite,
                    setVisible: () => sprite,
                    setAlpha: () => sprite,
                    destroy: () => {},
                };
                return sprite;
            },
        },
        tweens: { add: () => ({}) },
        textures: { exists: () => true },
        time: { now: 1000 },
    };
    const effects = new EffectsManager(scene);
    // A heavy gameplay moment: several overlapping bursts, then time passes.
    for (let i = 0; i < 5; i++) effects.burst({ x: i, y: i, count: 20, tint: 0xffffff });
    assert.ok(effects.live.size > 0);
    effects.stepParticles(10_000);
    assert.equal(effects.live.size, 0);
    assert.ok(
        effects.pool.length <= GAME_CONSTANTS.PARTICLE_POOL_SIZE,
        `${effects.pool.length} retained sprites exceed pool ${GAME_CONSTANTS.PARTICLE_POOL_SIZE}`
    );
    const createdAfterFirstWave = created;
    // The next wave reuses pooled sprites instead of allocating forever.
    effects.burst({ x: 1, y: 1, count: 20, tint: 0xffffff });
    effects.stepParticles(10_000);
    assert.ok(
        created <= createdAfterFirstWave + 20,
        `${created} created sprites keep growing instead of reusing the pool`
    );
    assert.ok(
        effects.pool.length <= GAME_CONSTANTS.PARTICLE_POOL_SIZE,
        'pool retains at most one budget of sprites'
    );
});

test('background bakes stay capped for low-end phone GPUs', async () => {
    const { GAME_CONSTANTS } = await import('../Constants.js');
    assert.ok(GAME_CONSTANTS.BACKGROUND_BAKE_MAX_WIDTH <= 2048);
    assert.ok(GAME_CONSTANTS.BACKGROUND_BAKE_MAX_HEIGHT <= 1024);
});
