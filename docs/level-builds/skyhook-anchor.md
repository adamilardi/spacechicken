# Level build: Skyhook Anchor (Level 15)

## Assumptions

- Tether ground station at night, the campaign finale: `PHASER: true`,
  spire-warden waves [1,1,2,2,3,3,4,4] with one wave-3 runner stationed on
  the high shelf, drip pair, two volt-orb sentries, dust-devil patrol. No
  new hazard code; all actors already run.
- Gauntlet finale (boss-creator): anchor lift plus timed beam plus pad
  slam plus `CROWN_SHIELD` (drop all eight wardens to open it); crown
  touch is the clear and `NEXT_LEVEL` is null. See
  `docs/boss-builds/skyhook-anchor.md`.
- Ember Foundry `NEXT_LEVEL` points at 15. Full chain 1..15, all with
  distinct music.
- Halo (weapon-creator): piercing orb that never stops, unlocked here
  through the single `tryFirePhaser` path; G swaps, HUD names the gun. See
  `docs/weapon-builds/ripper-comet-halo.md`.

## Selection paths

- `art-selections/skyhook-anchor/selection.json` (delegated/agent) from
  `art-candidates/contra-arc-2/manifest.json`, candidate
  `level-skyhook-anchor-a`: layout + chevron deck + clamp prop.
- Wave runners wear the shipped `spireWarden` boarder skin; sentries wear
  the shipped `voltOrb` drone skin. The lift reuses the shipped
  `liftPlatform`. No new actor paint.

## Texture keys

- `skyhookDeck` 96x24 (pale walk edge, cyan seam, amber hazard chevrons
  over cool alloy). `tetherClamp` 24x40 decor clamp post, no collision.
  Painted in `SpriteFactory.js`, registered in `createExpeditionSprites`,
  created at gameplay size with smoothing off.
- Background type `skyhook`: night gradient with a climbing tether ribbon,
  climber lights and stars, gantry tower frames far, anchor pylon landmark
  with service arms mid, pad slab with pipe runs near + branches in
  `ensureLayout`/`drawLayer`. Tether ribbon and pylon-plus-arms are both
  new devices per the skill's distinct-composition rule.

## Hazard types used

`boarder` waves [1,1,2,2,3,3,4,4], `drip` pair, two `drone` sentries,
`dustDevil` patrol, `laser` beam, `crusher` pad slam, anchor-lift mover,
`CROWN_SHIELD` gate. Three `tetherClamp` props.

## Files changed

- `SpriteFactory.js`, `BackgroundRenderer.js`, `GameUtils.js` (halo def)
- `levels/skyhook-anchor.js` (new), `levels/index.js`,
  `levels/ember-foundry.js` (next-level link, same change)
- `music/skyhook.js` (new, id `skyhook`, 150bpm), `music/index.js`
- `config/runtime-assets.cjs`, `tests/game.test.cjs`,
  `tests/contra-levels.test.cjs`, `tests/competition.test.cjs`,
  `tests/leaderboard-api.test.cjs`, `functions/api/leaderboard.js`,
  `functions/api/run.js` (campaign grows to 15)

## Play URL and results

- `http://127.0.0.1:3000/?level=15` — probes: loads playing, phaser fires,
  Halo fires after G x8 (`boltsInFlight >= 1`), pause toggles, death
  retries (deaths 0 -> 1, still playing), finale confirmed (no skip
  target), shielded crown holds on touch (still level 15), zero page
  errors.
- Preview `art-candidates/contra-arc-2/level-skyhook-anchor-a/preview.html`
  paints all four canvases with zero page errors.
- `npm test` 111/111, eslint zero warnings, prettier clean on touched
  files.

## Not verified

- Full human playthrough to the crown, the final-clear screen, co-op race,
  touch controls, and the seam strip under real parallax scroll.
