# 🚀 Space Chicken Game

A modular, browser-based Phaser 3 platformer with 3 challenging levels, procedural graphics, dynamic audio, touch controls, and local + optional Firebase leaderboards.

## 📁 Project Structure

```
spacechicken/
├── index.html              # Entry point (loads modular ES6 scripts)
├── server.js               # Lightweight dev server for ES modules
├── SpaceChicken.js         # Main Phaser Scene (orchestrates gameplay)
├── Constants.js            # All game constants & level definitions
├── LevelConfig.js          # Per-level data (platforms, hazards, gravity, etc.)
├── SpriteFactory.js        # Procedural canvas-based sprite generation
├── AudioManager.js         # Web Audio API music + SFX
├── UIManager.js            # HUD, touch controls, leaderboards UI
├── LeaderboardManager.js   # localStorage + optional Firebase sync
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

## 🧪 Testing & Quality

- `test-modules.cjs` — basic syntax and bracket balance checks (run with `node test-modules.cjs`)
- All modules use ES6 `import`/`export`
- The game runs entirely in the browser with no build step required

For better long-term quality, ESLint + Prettier have been added (see below).

## 🎵 Game Features

- 3 levels with increasing difficulty and distinct visual/audio themes
- Web Audio API music + sound effects (with mute toggle)
- Full keyboard (WASD/arrows/space) + touch controls (including double-tap jump)
- Moving platforms, lasers, patrolling drones, physics bombs
- Collect the crown to advance
- Local leaderboards + optional Firebase real-time sync
- Fully responsive (resizes with the browser)

## 🛠️ Development

### Adding ESLint + Prettier (recommended)

```bash
npm install
npm run lint
npm run lint:fix
npm run format
```

See `package.json` scripts and the generated `.eslintrc.cjs` / `.prettierrc` for configuration.

### Future Enhancements (easy with current architecture)

- New levels → edit `LevelConfig.js`
- New hazards/sprites → extend `SpriteFactory.js` + `LevelConfig`
- Audio improvements → `AudioManager.js`
- UI polish → `UIManager.js`
- Different persistence backends → `LeaderboardManager.js`

## 📜 License

This is a personal/hobby project. Feel free to study the modular architecture and procedural graphics techniques.

---

**The current modular version is the canonical, maintained source.** The archive exists purely for historical interest.
