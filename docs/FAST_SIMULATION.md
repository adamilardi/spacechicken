# Fast bot simulation

The pilot and local-policy rollout runners now support `FAST=1`. They use the
normal Phaser game in Chromium with Canvas initialized, stop the animation-frame
scheduler, and advance fixed 1/60-second steps without drawing. This is an opt-in
mode; ordinary bot, UI, video, resize, and Jev tests retain their existing behavior.

## Run

These commands start their own local server and headless browser:

```bash
npm run bot:fast
LEVEL=7 TRIALS=20 DURATION_MS=75000 npm run bot:fast
LEVELS="1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16" TRIALS=16 npm run bot:fast

EPISODE_COUNT=20 LEVEL=1 npm run rl:rollout:fast
FAST=1 WORKERS=4 EPISODES=16 MAX_ITERS=10 npm run rl:loop

npm run verify:fast
```

The equivalent existing commands are `FAST=1 npm run bot` and
`FAST=1 npm run rl:rollout`. The training loop passes the flag to its workers and
uses a 1× time scale, a 150 ms decision interval, and a 75-second simulation limit
by default. Worker count increases aggregate throughput, subject to CPU/memory.

Fast pilot runs test isolated levels: `LEVEL` defaults to 1; `LEVELS` cycles through
levels across `TRIALS`. A run stops at the crown/level-completion state. Policy
runs preserve `LEVELS`, `LEVEL_SWEEP`, `EPISODE_COUNT`, `SEED`, `POLICY`, `POLICY_ID`,
`TEMPERATURE`, `STEP_COST`, `BEST_MS`, `BEST_JSON`, and `ROLLOUT_OUT` options. Plans
are grouped by level to reuse initialized scenes. Each episode gets a distinct
seed, recorded in its report.

`DURATION_MS` and `DECISION_MS` are **simulation milliseconds**, never sleep times.
Decisions round to the nearest whole physics tick; the default is exactly nine
ticks. `TIMESCALE` does not accelerate fast mode: its physics always uses 1× steps.

Pilot results go to `.bot-runs/fast-report.json` (or `BOT_SCREENSHOT_DIR`). Policy
results use the existing `rollout-*.jsonl` format and default to `rl/rollouts`.
Only policy runs create training transitions. No screenshots or video are taken.

## What changed

- Virtual clocks synchronize `performance.now()`, `Date.now()`, constructed Dates,
  new timeouts/intervals, animation frames, and Phaser's game/scene clocks.
- Scene resets clear virtual callbacks, synchronize Phaser's retained clock before
  hazard creation, and reset seeded randomness. Camera tracking still updates.
- Audio is disabled in the disposable automation page. Normal game configuration
  and assets are unchanged; Phaser HEADLESS is not used.
- The pilot runs once per simulation tick. Policy encoding, masking, inference,
  sampling, rewards, and terminal detection run inside the page. Model weights are
  cached there. Policy randomness is separate from gameplay randomness.
- Observations are cached per tick so repeated reads do not erase the game's
  moving-platform velocity estimates. Continuity is checked across batch boundaries.
- Transitions return in JSON batches of up to 64 decisions, avoiding per-action
  automation calls and expensive per-number weight marshalling. The same feature,
  reward, and inference implementations used by the Node runner are loaded into
  the page, without duplicating their logic.
- A ten-second wall-time batch watchdog and a two-minute episode watchdog catch
  unexpectedly slow simulations. These limits do not define gameplay time.

Reports distinguish `simulatedMs` / `timeMs` (episode simulation time), `elapsedMs`
(the game's timer, which resets after death), `wallTimeMs` (episode wall time), and
`computeMs` (simulation-batch computation). `simulationSpeed` excludes setup and
transport; `speed` includes episode setup/reset and transport but excludes writing
that episode's file. The final aggregate includes output writing and all episode
resets/page loads; it excludes browser/server launch and teardown.

## Validation and measured performance

- 16 levels replayed identical recorded pilot inputs with drawing enabled and
  disabled, up to 1,800 ticks per level, stopping at completion. Compared complete
  exposed snapshots every frame, plus projectile state and objective checks.
- Policy parity covers encoded observations, legal masks, sampled actions,
  behavior probabilities, rewards, next observations, and truncation after ten
  150 ms decisions. Clocks and callback cleanup have unit tests.
- The existing PPO trainer consumed four generated episodes / 400 transitions and
  completed a CPU training epoch with outputs isolated under `/tmp`.
- In a local level-1 sample, warm pilot episodes reached 112–142× including reset
  and transport. After caching policy weights, warm 15-second policy episodes
  reached 166–209×; four episodes including the cold page and output reached 72×.
  A subsequent 20-episode level-1 batch reached **169.5× overall**, including cold
  page initialization, resets, transport, and output (browser launch excluded).
  These are samples, not a guarantee for all levels, CPUs, or policies.

Run `npm run verify:fast` to reproduce the replay checks. Narrow with
`LEVELS="3 7"`, change `SEED` (default 42), or set `VERIFY_FRAMES`. The report is
written to `/tmp/space-chicken-fast-parity.json`; a mismatch writes the first
actual/expected snapshot pair to `/tmp/space-chicken-fast-mismatch.json`.

## Scope

This validates sampled deterministic gameplay, not every state or browser timing
behavior. Keep normal browser tests for visual correctness, real-time input,
audio, resize, pause, and full campaign transitions. A larger time multiplier is
not equivalent to this runner. Jev's remote inference remains real-time.

Fast mode currently rejects video, external URLs, and `WARM_START>0` explicitly.
It runs the local checkout at an 800×450 viewport. Virtual clocks are installed
after boot, then the scene is reset; browser loading/networking and pre-existing
browser timers are not a general virtual-time environment. Future gameplay code
using additional wall-clock APIs needs corresponding tests/adaptation here.

The repository unit suite passed (341 tests). The full `npm run check` then hit
301 existing formatting errors in untracked `diag-*.tmp.mjs` files. Those files
were left alone; changed/new implementation files pass targeted ESLint/format
checks.
