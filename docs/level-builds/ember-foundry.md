# Level build: Ember Foundry (Level 14)

## Assumptions

- Smelter interior: `PHASER: true`, gnawer waves [1,1,2,2,3,3,4,4] with
  one wave-3 runner stationed on the high shelf, drip pair, two volt-orb
  sentries, dust-devil patrol, two ore-tram moving decks bridging the wide
  gaps. No new hazard code; all actors already run.
- Tram-plus-beam finale (boss-creator): a second tram plus a timed ember
  beam (780ms on, 1180ms off) over the last gap, with an earlier beam
  teaching the cross-on-dark rule mid-level; no shield, crown touch is the
  clear. See `docs/boss-builds/ember-foundry.md`.
- Rust Harbor `NEXT_LEVEL` points at 14; 14 points at 15. Full chain 1..15,
  all with distinct music.
- Comet (weapon-creator): tight 5-way fan that punches through one,
  unlocked here through the single `tryFirePhaser` path; G swaps, HUD names
  the gun. See `docs/weapon-builds/ripper-comet-halo.md`.

## Selection paths

- `art-selections/ember-foundry/selection.json` (delegated/agent) from
  `art-candidates/contra-arc-2/manifest.json`, candidate
  `level-ember-foundry-a`: layout + molten-edge deck + vent prop.
- Wave runners wear the shipped `gnawer` boarder skin; sentries wear the
  shipped `voltOrb` drone skin. Trams reuse the shipped `liftPlatform`.
  No new actor paint.

## Texture keys

- `foundryDeck` 96x24 (molten walk edge over riveted iron, ember seams).
  `foundryVent` 32x40 decor vent stack, no collision. Painted in
  `SpriteFactory.js`, registered in `createExpeditionSprites`, created at
  gameplay size with smoothing off.
- Background type `foundry`: ember-column sky with spark drift, furnace
  wall with crucible mouths far, ladle rail with hanging ladles mid, melt
  channel plus catwalk grate near + branches in
  `ensureLayout`/`drawLayer`. Ember columns and furnace mouths are both new
  devices per the skill's distinct-composition rule.

## Hazard types used

`boarder` waves [1,1,2,2,3,3,4,4], `drip` pair, two `drone` sentries,
`dustDevil` patrol, two `laser` beams, two moving trams. No shield. Three
`foundryVent` props.

## Files changed

- `SpriteFactory.js`, `BackgroundRenderer.js`, `GameUtils.js` (comet def)
- `levels/ember-foundry.js` (new), `levels/index.js`,
  `levels/rust-harbor.js` (next-level link, same change)
- `music/ember-foundry.js` (new, id `ember-foundry`, 140bpm),
  `music/index.js`
- `config/runtime-assets.cjs`, `tests/game.test.cjs`,
  `tests/contra-levels.test.cjs`, `tests/competition.test.cjs`,
  `tests/leaderboard-api.test.cjs`, `functions/api/leaderboard.js`,
  `functions/api/run.js` (campaign grows to 15)

## Play URL and results

- `http://127.0.0.1:3000/?level=14` — probes: loads playing, phaser fires,
  Comet fires after G x7 (`boltsInFlight >= 1`), pause toggles, death
  retries (deaths 0 -> 1, still playing), skip handoff reaches L15, zero
  page errors.
- Preview `art-candidates/contra-arc-2/level-ember-foundry-a/preview.html`
  paints all four canvases with zero page errors.
- `npm test` 111/111, eslint zero warnings, prettier clean on touched
  files.

## Not verified

- Full human playthrough to the crown (including the tram ride at runtime
  tween positions), co-op race, touch controls, and the seam strip under
  real parallax scroll. Handoff proven by debug skip only.
