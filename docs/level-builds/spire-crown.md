# Level build: Spire Crown (Level 10)

## Assumptions

- Contra finale ascent: `PHASER: true`, rising alloy steps, offset timed
  laser hall, dust-devil plaza, volt-orb sentry, elite warden waves,
  lift ride to the crown deck. No new hazard code.
- Steps rise 60px per deck (single-jumpable at gravity 280); the lift
  bridges the only wide gap to the crown deck on a 2200ms loop.
- Campaign finale: Hive Warrens points at 10; 10 points at null. Full
  chain 1..10, all with distinct music.

## Selection paths

- `art-selections/spire-crown/selection.json` (confirmed/user) from
  `art-candidates/alien-colony/manifest.json`, candidate
  `level-spire-crown-c`: layout + chevron alloy deck.
- Enemies from `art-candidates/alien-colony/enemy-manifest.json`: Spire
  Warden (boarder skin on all six wave elites) and Volt Orb (drone skin).

## Texture keys

- `spireAlloy` 128x28 (pale hull, gold stripe, chevron notches — new
  silhouette vs `issHull`).
- `spireWarden` 40x56 (cyan lens), `voltOrb` 48x48 (gold arcs, unmarked).
- Background type `spire`: stars, ringed planet, gold spire, fin
  silhouettes, alloy ridge with gold markers.

## Hazard types used

`laser` offset pair, `dustDevil` plaza patrol, `drone` volt-orb sentry,
`boarder` waves [1,2,2,3,3,4] in warden skins, `liftPlatform` finale ride.

## Files changed

- `SpriteFactory.js`, `BackgroundRenderer.js`
- `levels/spire-crown.js` (new), `levels/index.js`,
  `levels/hive-warrens.js` (next-level link)
- `music/spire.js` (new, id `spire`, 144bpm), `music/index.js`
- `config/runtime-assets.cjs`, `tests/game.test.cjs`

## Play URL and results

- `http://127.0.0.1:3000/?level=10` — bot playthrough pending an idle box.
- `npm test` 89/89, eslint zero warnings, prettier clean on touched files.

## Not verified

- Full bot/human playthrough to the crown, co-op race, touch controls,
  seam strip under real parallax scroll. No debug skip used.
