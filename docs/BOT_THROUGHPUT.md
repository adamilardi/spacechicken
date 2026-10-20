# Bot throughput experiment

The opt-in implementation is now available: see [Fast bot simulation](FAST_SIMULATION.md).
The measurements below describe the original exploratory benchmark.

Measured locally on 2026-10-19 with installed Phaser 3.70.0 and Chromium,
800×450 viewport, seed 42, levels 1/3/7, two repetitions per mode.
Raw measurements: [bot-throughput-results.json](bot-throughput-results.json).

## Findings

| Mode                            | Level 1  | Level 3  | Level 7  |
| ------------------------------- | -------- | -------- | -------- |
| Fixed steps with Canvas drawing | 38–41×   | 53–56×   | 51×      |
| Fixed steps, skip drawing       | 106–107× | 161–171× | 121–131× |
| Fixed steps, Phaser HEADLESS    | 116–119× | 177–178× | 129–135× |

These multipliers measure simulated time / simulation-loop wall time, including
the in-page heuristic pilot and trajectory checksum. Each simulation step stays
at 1/60 second. Level 1 stops on completion after about 10.6 simulated seconds
with the normal renderer initialized; other levels run 30 simulated seconds.
Level 3's pilot stalls in this sample, so it is not representative of traversing
the whole level. Level 7 includes two deaths and respawns.

Normal software-WebGL runs measured 30–42 frames/second; Canvas measured about 60. These frame rates are not simulation-speed multipliers: normal Phaser can
change frame delta when rendering slows down. The benchmark's real-time modes
therefore report frame rate, not simulated-time speed.

Creating a fresh page and initializing the game reduces the skip-drawing result
to 22× on level 1, 54–55× on level 3, and 48–49× on level 7. Those figures exclude
launching the browser and server, which are shared across runs, and page cleanup.
They do not measure RL training, remote model inference, or disk logging.

## Why the current bots wait

- `play-bot.mjs` runs its pilot on requestAnimationFrame. Hiding Chrome does not
  remove the frame scheduler or drawing. Some launchers force SwiftShader.
- `playtest-bot.mjs` budgets scenarios in wall-clock seconds and uses a rAF
  watchdog. These durations must become simulation-time budgets for acceleration.
- `rl/rollout.mjs` defaults to sleeping 150 ms between actions and crosses the
  browser automation connection for observations and actions. The RL loop already
  reuses browsers/scenes and defaults to four workers and a 2× time scale.
- `jev-playtest.mjs` awaits model decisions and then defaults to a 450 ms sleep.
  Simulation acceleration cannot make remote decisions 100× faster.
- Time scales are capped at 4. Raising the cap alone is not equivalent to running
  every original physics step and decision faster.

## Recommended implementation

Keep Phaser and Chromium initially. Initialize the normal Canvas game, stop its
real-time loop, and run fixed steps without drawing. Preserve camera updates,
timers, tweens, input edges, and scene lifecycle events. Use simulation time for
observations, rewards, timeouts, and action cadence. For the RL policy, perform one
decision every nine physics ticks to retain the default 150 ms action interval.
Run local policy inference beside the simulation and return batches of transitions
instead of doing browser round trips on every action. Reuse initialized scenes.

The experiment virtualizes performance.now, Date.now, requestAnimationFrame, and
new setTimeout calls after boot. It does not virtualize every browser API, interval,
audio clock, pre-existing timer, or network event. It is a disposable benchmark,
not a production replacement for the playtest/RL runners.

Rendered and skip-drawing modes produced identical per-frame player-position and
death-count checksums on all three sampled levels, including both repetitions.
This is narrower than full-state or real-time parity. A production runner needs
recorded-action replay comparisons covering hazards, physics, deaths, objectives,
and scene changes across all levels. Keep browser UI/visual tests separately.

Phaser HEADLESS produced different trajectories, even with controlled clocks,
seeded randomness, and camera updates. Its underlying cause remains unresolved.
Its small extra speed advantage does not justify adopting it before fixing parity.

## Other options

1. **Quick improvement:** use `HEADLESS=1 RENDERER=canvas npm run bot` with the
   local server running. This reduces graphics cost but retains real-time pacing.
2. **Fixed-step Chromium:** best first target. This experiment demonstrates
   100× simulation throughput on sampled levels. Whole-job 100× remains unproven;
   scene reuse, batching, and measured worker scaling are the next steps.
3. **Node simulation:** extract shared gameplay/physics from DOM, graphics,
   audio, and UI. Both Node and Chrome use V8; the benefit comes from removing
   browser infrastructure and isolating simulation work, not a faster JS engine.
   More architectural work, potentially lower memory per worker. No Node game
   benchmark was performed.
4. **Different game engine or rewritten simulator:** highest maintenance and
   fidelity cost. It can train policies against subtly different collisions or
   timing. Consider only if profiling the shared simulation still shows a need.

## Reproduce

```bash
node scripts/benchmark-bots.mjs
MODES=rendered,unrendered LEVELS="1 3 7" REPEATS=2 node scripts/benchmark-bots.mjs
```

The script starts and closes its own localhost server/browser. Default JSON output
is `/tmp/space-chicken-benchmark.json`; override with `BENCH_OUT`. No game sources
are modified: HEADLESS configuration is intercepted only in its disposable page.
The new script passed ESLint and formatting checks. Existing working-tree changes
were preserved; no deployment or paid model calls were made.
