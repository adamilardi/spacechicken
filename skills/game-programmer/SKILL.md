---
name: space-chicken-game-programmer
description: Build and review Space Chicken code: architecture, bug fixes, and performance. Use for refactors, shared systems, and code review. Art, levels, and audio stay in their own skills.
---

# Game programmer

Keep the code healthy: one fire path, one spawn map, no wall-clock timers for gameplay. Read [the authoring reference](../level-creator/references/spacechicken.md) and trace the system you touch (`SpaceChicken.js`, `WorldBuilder.js`, `GameUtils.js`, `Constants.js`) before editing. Do not deploy.

## Create

Reuse the existing path: hazards through the `enemies/index.js` spawner map, bolts through `tryFirePhaser`, motion on the scene clock so pause freezes it. A new file under `levels/`, `enemies/`, or `music/` must be registered in `config/runtime-assets.cjs` `rootFiles` and the server restarted. Bodies match the painted solid; decorations never collide.

Hold the budgets in `PerformanceBudgets.js`: small canvases, `imageSmoothingEnabled` false, flat fills. Author every timer for Normal; hard mode scales at spawn.

## Review

Review against the real callers: every alias, re-lookup, and re-store of shared state, including the co-op second chicken. Flag duplicated spawn or fire paths, timers outside the scene clock, bodies that drift from their paint, and config fields nothing reads. Run `npm run check` (tests, eslint with zero warnings, prettier) and name the failing file and rule.

Report findings with file paths and the smallest fix. If a request removes an input that sibling code consumed, remove the sibling machinery; do not re-point it at a substitute.

## Verify

Run `npm test` and `npm run check`. Play `http://127.0.0.1:3000/?level=N` on a touched level and one untouched neighbor; confirm pause, death retry, and co-op keys 2/3/4 when shared code moved.
