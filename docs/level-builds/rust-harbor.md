# Level build: Rust Harbor (Level 13)

## Assumptions

- Breaker's yard at dusk: `PHASER: true`, skitterling waves
  [1,1,2,2,3,3,4,4] with one wave-3 runner stationed on the high shelf,
  drip pair on the low run, volt-orb sentry, dust-devil patrol, bobbing
  sentry bonk over the first shelf. No new hazard code; all actors already
  run.
- Cargo-slam finale (boss-creator): twin `crusher` slams over the crown pad
  plus `CROWN_SHIELD` (drop all eight skitterlings to open it); crown touch
  is the clear. See `docs/boss-builds/rust-harbor.md`.
- Crimson Womb `NEXT_LEVEL` points at 13; 13 points at 14. Full chain
  1..15, all with distinct music.
- Ripper (weapon-creator): wide 3-fan that punches through one, unlocked
  here through the single `tryFirePhaser` path; G swaps, HUD names the gun.
  See `docs/weapon-builds/ripper-comet-halo.md`.

## Selection paths

- `art-selections/rust-harbor/selection.json` (delegated/agent) from
  `art-candidates/contra-arc-2/manifest.json`, candidate
  `level-rust-harbor-a`: layout + sand-edge deck + lamp prop.
- Wave runners wear the shipped `skitterling` boarder skin; sentries wear
  the shipped `voltOrb` drone and `sentryOrb` bonk skins. No new actor
  paint.

## Texture keys

- `harborDeck` 96x24 (pale sand walk edge over rust steel, rivets and
  barnacles). `harborLamp` 16x48 decor lamp post, no collision. Painted in
  `SpriteFactory.js`, registered in `createExpeditionSprites`, created at
  gameplay size with smoothing off.
- Background type `harbor`: dusk gradient with a low sun disc and cloud
  bands, beached hull far silhouettes, crane diagonals plus container
  stacks mid, pier pilings over shimmering water near + branches in
  `ensureLayout`/`drawLayer`. Sun disc and water are both new devices per
  the skill's distinct-composition rule.

## Hazard types used

`boarder` waves [1,1,2,2,3,3,4,4], `drip` pair, `drone` sentry, `dustDevil`
patrol, `bonk` sentry, twin `crusher` slams, `CROWN_SHIELD` gate. Three
`harborLamp` props.

## Files changed

- `SpriteFactory.js`, `BackgroundRenderer.js`, `GameUtils.js` (ripper def)
- `levels/rust-harbor.js` (new), `levels/index.js`,
  `levels/crimson-womb.js` (next-level link, same change)
- `music/rust-harbor.js` (new, id `rust-harbor`, 132bpm), `music/index.js`
- `config/runtime-assets.cjs`, `tests/game.test.cjs`,
  `tests/contra-levels.test.cjs`, `tests/competition.test.cjs`,
  `tests/leaderboard-api.test.cjs`, `functions/api/leaderboard.js`,
  `functions/api/run.js` (campaign grows to 15)

## Play URL and results

- `http://127.0.0.1:3000/?level=13` — probes: loads playing, phaser fires,
  Ripper fires after G x6 (`boltsInFlight >= 1`), pause toggles, death
  retries (deaths 0 -> 1, still playing), sentry bonk bounces at vy=-520
  with no death, skip handoff reaches L14, zero page errors.
- Preview `art-candidates/contra-arc-2/level-rust-harbor-a/preview.html`
  paints all four canvases with zero page errors.
- `npm test` 111/111, eslint zero warnings, prettier clean on touched
  files.

## Not verified

- Full human playthrough to the crown, co-op race, touch controls, and the
  seam strip under real parallax scroll. Handoff proven by debug skip only.
