# Game performance review

## Scope and measurement limits

Measured on September 28, 2026 using Playwright’s installed headless Chromium shell (build 1148), Linux, WebGL through ANGLE SwiftShader. These are desktop browser samples with phone viewport sizes. No physical phone was connected. CPU throttling changes JavaScript speed; it does not simulate a phone GPU, thermal throttling, or battery use.

Eight scenarios cover all four solo levels, portrait and landscape phones, split-screen racing, and 4× CPU throttling. Each has a 1.2 second warmup and four seconds of active play with seed 42. Hazards and crown completion are disabled only in the benchmark to keep gameplay active; separate behavior checks exercise real transitions. CDP CPU profiles, frame intervals, update/render submission duration, long tasks, asset transfers, and resource counts are saved outside the repository.

The render timer measures main-thread submission, not completed GPU work. Small sample counts and profiler overhead make p95 and maxima noisy. Full-render runs below were sequential; do not attribute their before/after differences entirely to code changes. The benchmark drives both movement and jumps. Audio is scheduled, but headless audio output is muted.

## Runtime measurements after the changes

| Scenario   | Samples | Frame p50 / p95 (ms) | Update p95 (ms) | Render submission p95 (ms) | Estimated texture MiB |
| ---------- | ------: | -------------------: | --------------: | -------------------------: | --------------------: |
| desktop-l1 |      28 |        154.7 / 182.4 |             1.6 |                        1.0 |                  21.7 |
| desktop-l2 |      27 |        160.8 / 223.2 |             2.5 |                        0.7 |                  22.2 |
| desktop-l3 |      26 |        172.7 / 201.1 |             4.5 |                        0.8 |                  28.4 |
| desktop-l4 |      22 |        202.9 / 219.8 |             2.2 |                        1.9 |                  25.3 |
| phone      |      61 |          68.1 / 76.1 |             1.4 |                        0.6 |                  28.4 |
| landscape  |      65 |          64.3 / 72.1 |             1.6 |                        0.5 |                  28.4 |
| race       |      26 |        172.0 / 180.3 |             2.5 |                        0.6 |                  28.4 |
| cpu4x      |      43 |         91.6 / 144.8 |             9.6 |                        5.1 |                  28.4 |

No page errors occurred in these eight scenarios. Texture figures sum width × height × four bytes for texture source zero. They are a base-level RGBA estimate, exclude framebuffer/driver overhead, and do not measure total GPU/process memory. Generated canvases can also retain CPU-side backing storage.

### Slow frame spacing: renderer/environment dominates

The initial portrait sample had 104.5 ms median spacing and 134.3 ms p95, while update p95 was 4.8 ms and render submission p95 was 2.7 ms. With scene drawing disabled, the same portrait gameplay returned to 16.7 ms median and 16.8 ms p95; update p95 was 1.0 ms. CPU samples were dominated by Chromium’s `(program)` bucket, with much smaller JavaScript, texture upload, and audio costs. The pixel-size sensitivity and render ablation support a software graphics/compositor bottleneck. They do not identify an exact GPU draw-call cost or establish real-device frame rate.

Production retains Phaser AUTO/WebGL and the existing visuals. Switching renderers based on this software-only result would need a hardware comparison. Split screen adds another world-camera pass; test it separately on actual low-end devices.

### Timer redraws

The HUD previously formatted and uploaded a new centisecond text texture on almost every frame. It now updates at most once per 50 ms bucket (20 Hz), with immediate zero resets. Scoring, elapsed time, and final result formatting still use full precision.

With drawing disabled to expose the normal 60 Hz update loop, four-second portrait samples counted **242 redraws with the old cadence versus 82 with the new cadence**, about 66% fewer. Update p95 was 0.9 and 1.1 ms respectively, so these short samples do not demonstrate a CPU-speed improvement. The verified benefit is fewer text rasterizations/uploads, especially when hardware rendering can sustain 60 Hz.

### Effects and lifetime

Finish screens used to return before stepping particle lifetimes, and stopping gameplay did not stop the crown sparkle emitter. Gameplay stop now stops that emitter; finish updates expire existing celebration particles. The browser check verifies the particle set returns to zero after finishing.

### Backdrop memory

Before eviction, visiting all four levels retained 43 textures totaling **96.67 MiB** of estimated RGBA data. Keeping only the current level’s backdrop textures reduced this to **31 textures / 22.18 MiB** in the same level-2 end state, a **77% reduction**. Shared sprites remain cached. The current layout remains cached for retries; returning to another level rebakes that background from its cached layout. This trades cross-level reuse for lower retained canvas/GPU memory. Single-level texture figures in the runtime table remain unchanged.

Two complete level cycles after the fix retained 68 non-particle scene objects, 3 dynamic physics bodies, 2 cameras, and 5 scene timers at each snapshot. Particle sprites varied from 9 to 1 as expected and stayed within the pool budget. Garbage-collected JS heap went from 7,189,292 to 7,237,932 bytes (0.7%); background pixel storage is not included in that heap number. The browser check enforces a <30 MiB texture budget in this end state.

Restarts are checked after visiting every level, including textures, children, physics bodies, cameras, scene timers, and garbage-collected JavaScript heap. This catches accumulating resources across level cycles, but is not a multi-hour soak test.

## Loading and delivery

The local uncompressed Phaser Arcade bundle is approximately 1.06 MB; it is the largest runtime dependency. The production Cloudflare response transferred **278,497 bytes with compression** in a single warm-edge request (0.255 seconds on this connection). It returned `CF-Cache-Status: HIT` and `Cache-Control: public, max-age=31536000, immutable`. This is a transfer observation, not a mobile network guarantee.

Game code uses relative ES modules. The local module dependency waterfall finished in roughly 100 ms in the initial desktop run; scene readiness was 0.63–0.77 seconds in later unthrottled cases and 2.01 seconds under 4× CPU throttling. Local transfer size includes HTTP overhead and lacks Cloudflare compression, so it should not be treated as the production payload. Generated backgrounds and sprites avoid separate image downloads. The level backdrops are baked once per cached texture, capped at 2048 × 1024, rather than redrawn as complex graphics each frame. Floor runs share colliders and bombs/particles reuse pools.

No bundler or renderer change was justified by these samples. Cold loading over a constrained connection and first-time background baking remain useful hardware checks.

## Reproduce

```bash
node scripts/profile-performance.mjs
PERF_CASE=phone PERF_RENDER_OFF=1 node scripts/profile-performance.mjs
PERF_CASE=phone PERF_RENDER_OFF=1 PERF_ABLATION=timer-unthrottled node scripts/profile-performance.mjs
node scripts/verify-polish.mjs
```

Use `PERF_OUT` to retain separate reports and `.cpuprofile` files. Use `PERF_DURATION_MS=30000` for a longer sample. `PERF_CASE` accepts any table scenario; `PERF_ABLATION=timer`, `background`, or `render` isolates those costs. Isolated render mode preserves the scene manager’s processing flag so transitions still work. The harness starts its own local server and debug runs do not submit scores.

For a hardware verdict, connect an Android phone with Chrome remote debugging (or iPhone Safari Web Inspector), record two minutes of active play on levels 3 and 4 plus racing, rotate during play, and repeat after the phone has warmed up. Record device/browser, actual renderer, p95 frame spacing, long tasks, heap before/after repeated games, cold loading, and visible stutter. Target stable frame delivery near the device refresh period; flag recurring >50 ms stalls. Actual phone validation remains open.

Runtime profiling method: [Chrome DevTools Performance documentation](https://developer.chrome.com/docs/devtools/performance).
