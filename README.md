# 🚀 Space Chicken Game

A modular, browser-based Phaser 3 platformer with 4 challenging levels, procedural graphics, dynamic audio, touch controls, and local plus Cloudflare D1 leaderboards.

## 📁 Project Structure

```
spacechicken/
├── index.html              # Entry point (loads modular ES6 scripts)
├── server.cjs              # Lightweight dev server for ES modules
├── SpaceChicken.js         # Phaser Scene orchestrator (input, collisions, flow)
├── Constants.js            # Shared game constants
├── levels/                 # One module per campaign level, plus the registry
├── enemies/                # One spawn module per hazard type
├── music/                  # One track per level, plus the score helpers
├── GameUtils.js            # Shared helpers (time format, defaults, tweens)
├── Viewport.js             # Scale / viewport size helpers
├── LevelConfig.js          # LevelConfig constructor (reads levels/)
├── SpriteFactory.js        # Procedural canvas-based sprite generation
├── BackgroundRenderer.js   # Cached, baked parallax backgrounds
├── WorldBuilder.js         # Platforms, floors, and hazard dispatch
├── InputController.js      # Keyboard + touch polling
├── EffectsManager.js       # Pooled particles, squash/stretch, combat juice
├── AudioManager.js         # Web Audio API music + SFX
├── UIManager.js            # HUD, title screen, touch controls, leaderboards UI
├── LeaderboardManager.js   # localStorage + Cloudflare D1 leaderboard client
├── tests/                  # Behavioral and server integration tests
├── .gitignore
└── archive/
    └── old-versions/       # Historical monolithic code (see archive README)
```

**Active game code is the root modules plus `levels/`, `enemies/`, and `music/`.** The `archive/` directory contains pre-refactor artifacts for reference only.

## 🎯 Refactoring History

This project was refactored from a single ~2,800 line `game.js` monolith into focused, single-responsibility modules. The old code has been moved to `archive/old-versions/` so the repository stays clean while preserving history.

### Key Improvements

- **Separation of Concerns** — Each module has one job
- **Constants Management** — All magic numbers live in `Constants.js`
- **Error Handling & Defensiveness** — Robust guards around storage, audio, input, and Phaser APIs
- **Maintainability** — Easy to add levels, hazards, or new managers
- **Procedural Graphics** — All sprites generated at runtime via canvas (no external assets required)
- **Hot-path performance** — Baked background textures, pooled particles/bombs, and allocation-light input/HUD updates

## 🎮 How to Run

### Recommended: Development Server

```bash
node server.cjs
# Then open http://localhost:3000 (or http://<ip>:3000 from another device)
```

### Alternative

- VS Code Live Server extension
- `python -m http.server 3000`
- Any static file server that supports ES modules

## ☁️ Cloudflare Pages

The production artifact is self-contained and includes the pinned Phaser runtime.

```bash
npm run build:cloudflare
npm run deploy:cloudflare
```

`wrangler.jsonc` is the source of truth for the Pages project. The build writes only runtime
assets and Cloudflare security headers to `dist/`; development files are never uploaded.

## 🧪 Testing & Quality

- `npm test` — executable unit, integration, syntax, persistence, audio, physics, and server checks
- All modules use ES6 `import`/`export`
- The game runs entirely in the browser with no build step required

For better long-term quality, ESLint + Prettier have been added (see below).

## 🎵 Game Features

- 4 levels with increasing difficulty and distinct visual/audio themes
- Title screen, level banners, and a camera that eases, flashes, and shakes with the action
- Landing dust, jump stretch, jetpack trails, and crown sparkles
- Web Audio API music + sound effects (with mute toggle)
- Full keyboard (WASD/arrows/space) + touch controls (including double-tap jump)
- Standard gamepads: left stick or D-pad to move, A/Cross to jump, Start/Menu to pause
- Local two-player mode: press 2 for keyboard + keyboard, 3 for keyboard + controller, or 4 for two controllers
  In keyboard + keyboard mode, Player 1 uses WASD + Space; Player 2 uses the arrow keys + Numpad 0.
- Moving platforms, lasers, patrolling drones, physics bombs
- Collect the crown to advance
- Personal bests, all-time and weekly Cloudflare D1 leaderboards, and a full-game category
- Fully responsive (resizes with the browser)
- Pause with Escape, P, or the on-screen pause button; leaving the tab pauses active play.
  Resume explicitly when ready. Paused time is excluded from the level timer.

### Competition rules

- Each level ranks its fastest completion times. A death restarts that level's timer.
- The full-run board requires a solo, zero-death run through all four levels. Its time is the sum of the four level times, so transitions and pauses do not count.
- Weekly boards start on Monday at 00:00 UTC. Previous weekly winners appear under Past Winners.
- The board shows the best time from each browser identity in each category. Browser storage holds that identity and personal bests; clearing it creates a new identity.
- Online entries require a one-use run token and plausible elapsed wall time. These checks do not prove the player followed the game rules, so the board should not be presented as cheat-proof or tied to cash prizes.
- On the final screen, use NEW FULL GAME or RETRY LEVEL 4. Space or JUMP starts a new full game; R retries level 4. The LEADERBOARD button opens the standings.
- Change your leaderboard name on the title screen before starting a timed run.

## 🛠️ Development

### Quality checks

```bash
npm install
npm run check
```

With the development server running, `node scripts/verify-release.mjs` checks desktop and
phone-sized pause/resume flows, frozen physics, and timer accounting in Chromium.
Set `SPACE_CHICKEN_URL` to test another local server and `PLAYWRIGHT_CHROME` to use a
specific browser executable.

For testing, add `?debug=1` to the URL. Press N to skip to the next level, or use
`window.__spaceChickenDebug.goToLevel(1)` through `goToLevel(7)` in the browser console.
The bug-hunt bot opens each scenario directly at its target level.

The debug build also exposes a constrained gameplay-testing API:

```js
window.__spaceChickenTest.observe();
window.__spaceChickenTest.act('jump_right');
window.__spaceChickenTest.reset(42);
window.__spaceChickenTest.checkObjectives();
```

Run a server-side Jev pilot with `npm run jev:playtest`. The runner starts a temporary
local game server unless `SPACE_CHICKEN_URL` is set, reads `TYPESAFE_API_KEY` only from
the Node environment, and writes its action history, assertions, token usage, API
errors, and final screenshot under `.jev-runs/`. Use `LEVEL=2`, `SEED=42`,
`JEV_DURATION_MS=90000`, or `HEADLESS=0` to adjust a run. Jev can only select the
published movement actions; collisions, deaths, checkpoints, and crown collection
still use the same controller and game rules as human play. Jev runs the simulation at
quarter speed by default for finer control while normal gameplay stays at full speed.
Set `JEV_TIME_SCALE=0.5` to override it (accepted range: `0.1` through `1`).

Observations use named entities and relative coordinates. Dynamic entries include hazard
type, phase timing, velocity, direction, patrol endpoints, and moving-platform paths. The
`navigation` section identifies the supporting platform, next landing window, gap width,
and immediate threat so a decision model does not have to reconstruct those facts from raw
sprites.

`node scripts/verify-mobile.mjs` exercises simultaneous touch movement and jumping,
control bounds, and rotation across phone and tablet viewports. Mobile HUD text uses
readable minimum sizes, and neighboring controls have separate touch regions.
Browser emulation does not replace checking performance and audio on physical devices.

`node scripts/verify-graphics.mjs` checks all four levels at desktop and phone sizes,
verifies generated textures and background size limits, and saves screenshots under
`/tmp/space-chicken-graphics-after` (override with `GRAPHICS_SCREENSHOT_DIR`). Artwork is
generated at startup: shaded metal platforms, warning mines, gold chicken frames,
and atmospheric backgrounds reuse the existing texture caches.

The chicken has a relaxed blinking idle pose, separate from its walking cycle. Jump
puffs and landing dust expand and fade using the existing particle pool; atmospheric
glows use finer gradients baked into the background. `node scripts/verify-animation.mjs`
checks idle, walking, jumping, and landing in the browser.

Use `npm run lint:fix` or `npm run format` for automatic fixes. See `package.json`,
`.eslintrc.cjs`, and `.prettierrc.json` for configuration.

### Future Enhancements (easy with current architecture)

- New levels → add `levels/<name>.js` and register it in `levels/index.js`
- New hazards/sprites → extend `SpriteFactory.js` and add `enemies/<type>.js`
- New music → add `music/<id>.js` and register it in `music/index.js`
- Background themes → `BackgroundRenderer.js`
- Audio playback → `AudioManager.js`
- UI polish → `UIManager.js`
- Different persistence backends → `LeaderboardManager.js`

## 📜 License

Copyright © 2026 Adam Ailardi. The original game materials are available under the [Space Chicken Noncommercial License](LICENSE.txt). You may study, modify, and share them for noncommercial purposes with the required notices. Commercial use and monetization of the game or derivative versions are reserved to Adam Ailardi and require his prior written permission. Third-party dependencies retain their own licenses.

---

**The current modular version is the canonical, maintained source.** The archive exists purely for historical interest.

## Race setup and controller menus

Open **RACE SETUP** on the title screen to choose solo, two players on one keyboard, keyboard plus controller, or two controllers. Controller modes check the required controllers are connected; press a button on each controller to register it. Keyboard racing uses P1 A/D + Space and P2 arrows + ↑. Numeric shortcuts 2/3/4 remain available.

Controller menus use D-pad/stick to select, A to confirm, B to close, and Y to open the leaderboard. On the title screen, D-pad up/down opens race setup. On the finish screen, retry is selected first; move the selection to start a new full game. Start pauses; release it, then press Start, A, or B to resume. Held buttons must be released after scene restarts.

Intermediate level results stay visible for 2.8 seconds before fading and advance after 3.2 seconds.

## Performance profiling

See [the performance review](docs/performance-review.md) for measured runtime, delivery, resource lifetime, and the remaining physical-phone validation. Run `node scripts/profile-performance.mjs` for CPU profiles and frame/resource reports; run `node scripts/verify-polish.mjs` for controller menu, transition timing, and restart stability checks. Both create their own local server and write reports under `/tmp`.

### Test on your phone

Open [the phone performance test](https://space-chicken.ailardi.com/performance.html) in your normal browser. Choose Quick, Standard, or Extended, add your phone model if you know it, and tap **Start test**. Keep the tab visible and the phone in one orientation. The game automatically exercises solo levels 3 and 4 and split-screen racing, with seeded movement, jumps, hazards, and particles. Crown completion and hazard deaths are disabled to keep the workload active. It uses the same game configuration as normal play.

Download or share the JSON report and attach it to the Codex conversation. Repeat in the other orientation and, if investigating slowdown as the phone warms, use Extended. Rotating, switching tabs, locking the phone, or pressing Stop produces an interrupted report. Reports include raw game-frame intervals, percentile timings, CPU update/render submission times, loading, texture estimates, errors, and optional long-task/heap metrics. Unsupported measurements are null; render submission does not measure GPU completion. Audio availability is recorded per scenario.

Reports stay in page memory until you download/share them; no report upload or score submission occurs. Refreshing discards the report. The page is a separate diagnostic URL with no link added to normal gameplay. Verify it with `node scripts/verify-performance-page.mjs`.
