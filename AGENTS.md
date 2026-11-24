# Space Chicken assistant instructions

Space Chicken is one of two Ailardi browser games. Its sibling NovaWing lives at `/home/adam/GameDevelopment/NovaWing`.

## Deployment map

- This project: `/home/adam/GameDevelopment/spacechicken`
- Cloudflare Pages project: `space-chicken`
- Public game route: `https://space-chicken.ailardi.com/`
- NovaWing public route: `https://novawing.ailardi.com/`
- Shared landing/router source: `/home/adam/GameDevelopment/NovaWing/hub`
- Shared landing: `https://ailardi.com/`

The `ailardi.com` apex is owned by the static `ailardi-landing` Pages project. This game has its own direct Pages custom domain, so it does not pass through a Worker. Keep this game's assets and imports relative to its root.

## Build and deploy

From this directory:

```bash
npm run check
npm run build:cloudflare
npx wrangler pages deploy dist --project-name space-chicken --branch main
```

Use `npx wrangler whoami` before Cloudflare operations. NovaWing is deployed separately from `/home/adam/GameDevelopment/NovaWing`; do not modify or redeploy it for an isolated Space Chicken change.

## Assistant workflow

This file is for Codex, Grok, and other coding assistants. The game itself should not gain navigation/setup links unless explicitly requested. Cross-project context belongs here and in the Ailardi Arcade hub. Preserve unrelated existing working-tree changes when editing this repository.

## Code map

`SpaceChicken.js` is the Phaser scene and thin orchestrator; system logic lives in manager modules constructed in its `constructor()` and phased in `create()` (`createManagers` → `buildWorld` → `bindKeys` → `finishSetup`). Managers own their state and the scene keeps one-line delegates plus forwarding accessors, so external callers (`GameTestInterface.js`, bots, tests, other managers) keep using `scene.*` unchanged.

- `SceneCameras.js` — follow/UI/split cameras, camera-filter routing, split chrome.
- `CombatSystem.js` — phaser, temp guns, weapon switching.
- `BoarderDirector.js` / `BossDirector.js` — boarders, bosses, crown shield.
- `WorldBuilder.js` — platforms, hazards, boarders/rescue/pod groups.
- `UIManager.js` — HUD state; `Overlays.js` — title/leaderboard/finish/branch/race overlays.
- `BackgroundRenderer.js`, `EffectsManager.js`, `AudioManager.js` — presentation.
- `InputController.js`, `GamepadController.js`, `TouchController.js`, `PauseController.js` — input.
- `Viewport.js`, `SplitScreen.js`, `HudLayout.js`, `CameraFilters.js` — layout/camera helpers.
- `GameUtils.js`, `Constants.js`, `LevelConfig.js`, `levels/`, `enemies/`, `sprites/`, `backgrounds/` — data and pure helpers.

Conventions: keep the scene's public method/field surface stable when extracting (managers, scripts, and `tests/game.test.cjs` reach into it); prefer data tables plus loops over repeated blocks; put shared DOM/test helpers next to their cluster. Verify with `npm run check` (tests + lint + format).

Level, enemy, animation, and weapon work goes through `skills/`. Read `docs/ART_SKILLS.md` and the matching `SKILL.md`. Art may be generated images (Muse Image) or canvas paint code; generated images must be saved into the repo, registered for serving, loaded as real game textures, and style-matched to the shipped game. Canvas paint stays the fallback when image generation is unavailable.
