# Level build: Colony Drop (Level 8)

## Assumptions

- Contra beachhead: `PHASER: true`, flat decks with 206px gaps (same jump
  unit as Earthwatch), boarder waves 1-3 plus one drone sentry and one
  roller spore-mine. No new hazard code; all actors already run.
- Crown sits on an upper deck (146px rise, same as Earthwatch finale) with
  a ~250px rest zone before it. Crown gate (boss-creator): `CROWN_SHIELD`
  holds the crown gray until all six skitterers die (banner `CROWN OPEN`).
  See `docs/boss-builds/colony-drop.md`.
- Earthwatch `NEXT_LEVEL` now points at 8; 8 points at 9 (chain 7-10).
- Arsenal (weapon-creator): Scatter/Piercer/Nova unlock across 8/9/10
  through the single `tryFirePhaser` path; G swaps, HUD names the gun,
  weapons persist across the level handoff. Phasers stay default.

## Selection paths

- `art-selections/colony-drop/selection.json` (confirmed/user) from
  `art-candidates/alien-colony/manifest.json`, candidate
  `level-colony-drop-a`: layout, deck, beacon prop.
- Wave runners wear the new `skitterling` boarder skin; the sentry wears
  the new `sporeFloater` drone skin (see `enemy-manifest.json`).

## Texture keys

- `colonyDeck` 96x24 (top edge `#ff9a3c`/`#ffe6b0`), `colonyBeacon` 24x44
  decor-only. Painted in `SpriteFactory.js`, registered in
  `createExpeditionSprites`, created at gameplay size with smoothing off.
- Background type `colony`: `createColonyBackgroundLayout` (stars, domes,
  towers) + `renderColonyBackground` (sky/far/mid/near) + branches in
  `ensureLayout`/`drawLayer`.

## Hazard types used

`boarder` waves [1,1,2,2,3,3], `drone` patrol, `roller` patrol+spin.
Props are images, no collision.

## Files changed

- `SpriteFactory.js`, `BackgroundRenderer.js`
- `levels/colony-drop.js` (new), `levels/index.js`, `levels/earthwatch.js`
- `music/colony-drop.js` (new, id `colony-drop`, 132bpm), `music/index.js`
- `config/runtime-assets.cjs`, `tests/game.test.cjs`

## Play URL and results

- `http://127.0.0.1:3000/?level=8` — in-page pilot (`npm run bot`,
  `LEVEL=8`): **win, 0 deaths, 27.9s game time** after fixing the pilot's
  cross-level pogo hopping (closePush now final-approach only).
- Regression: L1 still wins; L7 improved 10-11 deaths to 6 (still no win;
  old content, out of scope).
- `npm test` 83/83, eslint zero warnings, prettier clean on touched files.

## Not verified

- Co-op race on this level, touch controls, and the seam strip under real
  parallax scroll (preview strip only). No debug skip used for the win.
