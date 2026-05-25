# Archive — Historical / Pre-Refactor Code

This directory contains artifacts from before the major modular refactoring of Space Chicken.

## Contents

- `game.js` — The original monolithic ~2,800 line single-file implementation (all game logic, sprites, UI, audio, levels in one file).
- `pizza-game/` — An experimental / alternate "Pizza Game" prototype (separate Phaser scene, never integrated into the main Space Chicken experience).

## Current Active Code

The maintained game lives at the repository root:

- `index.html` + modular ES6 files:
  - `SpaceChicken.js` (main Phaser scene)
  - `Constants.js`, `LevelConfig.js`, `SpriteFactory.js`, `AudioManager.js`, `UIManager.js`, `LeaderboardManager.js`
- `server.js` — simple development HTTP server for ES modules

## Why Keep These Files?

They are preserved for:
- Historical reference
- Diffing the before/after of the refactor
- Potential future archaeology or blog posts about the refactoring journey

**Do not use these files for development or running the game.** They are no longer loaded by `index.html` and are not maintained.

## Date of Refactor

Modular version became the canonical implementation in early 2025 (see git history for exact commits).

---

If you are looking for the current source, go back to the parent directory.
