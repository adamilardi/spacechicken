# 🚀 Space Chicken Game

A modular, browser-based Phaser 3 platformer with 4 challenging levels, procedural graphics, dynamic audio, touch controls, and local + optional Firebase leaderboards.

## 📁 Project Structure

```
spacechicken/
├── index.html              # Entry point (loads modular ES6 scripts)
├── server.cjs              # Lightweight dev server for ES modules
├── SpaceChicken.js         # Phaser Scene orchestrator (input, collisions, flow)
├── Constants.js            # All game constants & level definitions
├── GameUtils.js            # Shared helpers (time format, defaults, tweens)
├── Viewport.js             # Scale / viewport size helpers
├── LevelConfig.js          # Per-level data (platforms, hazards, gravity, etc.)
├── SpriteFactory.js        # Procedural canvas-based sprite generation
├── BackgroundRenderer.js   # Cached, baked parallax backgrounds
├── WorldBuilder.js         # Platforms, floors, and hazards
├── InputController.js      # Keyboard + touch polling
├── EffectsManager.js       # Pooled particles, squash/stretch, combat juice
├── AudioManager.js         # Web Audio API music + SFX
├── UIManager.js            # HUD, title screen, touch controls, leaderboards UI
├── LeaderboardManager.js   # localStorage + optional Firebase sync
├── tests/                  # Behavioral and server integration tests
├── .gitignore
└── archive/
    └── old-versions/       # Historical monolithic code (see archive README)
```

**Active game code is entirely in the root modular files.** The `archive/` directory contains pre-refactor artifacts for reference only.

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
- Local leaderboards + optional Firebase real-time sync
- Fully responsive (resizes with the browser)
- Pause with Escape, P, or the on-screen pause button; leaving the tab pauses active play.
  Resume explicitly when ready. Paused time is excluded from the level timer.

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
`window.__spaceChickenDebug.goToLevel(1)` through `goToLevel(4)` in the browser console.
The bug-hunt bot opens each scenario directly at its target level.

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

- New levels → edit `LevelConfig.js`
- New hazards/sprites → extend `SpriteFactory.js` + `WorldBuilder.js` + `LevelConfig`
- Background themes → `BackgroundRenderer.js`
- Audio improvements → `AudioManager.js`
- UI polish → `UIManager.js`
- Different persistence backends → `LeaderboardManager.js`

## 📜 License

This is a personal/hobby project. Feel free to study the modular architecture and procedural graphics techniques.

---

**The current modular version is the canonical, maintained source.** The archive exists purely for historical interest.
