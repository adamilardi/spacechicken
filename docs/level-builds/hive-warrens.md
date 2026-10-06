# Level build: Hive Warrens (Level 9)

## Assumptions

- Contra tunnel climb: `PHASER: true`, bonk-brute spring to the catwalk,
  alternating crusher jaw doors, drip alley, gnat waves, spore-beam crown
  guard. No new hazard code; all actors already run.
- Bounce math verified on paper: brute launch (-520 at gravity 320) peaks
  422px; catwalk sits 182px up; landings happen on descent inside widened
  decks. Every gap is single-jumpable; double jump is backup.
- Earthwatch-style chain: Colony Drop `NEXT_LEVEL` now points at 9;
  9 pointed at null until Spire Crown landed (now 10).

## Selection paths

- `art-selections/hive-warrens/selection.json` (confirmed/user) from
  `art-candidates/alien-colony/manifest.json`, candidate
  `level-hive-warrens-b`: layout + chitin deck.
- Enemies from `art-candidates/alien-colony/enemy-manifest.json`: Hive
  Brute (bonk spring, replaces the draft beetle) and Gnawer (boarder skin
  on all six wave runners). Brute body matched to painted solid (46x36).

## Texture keys

- `hiveChitin` 96x24 (teal walkable edge, chitin arcs, glow sacs).
- `hiveBrute` 56x48 (gold spring-cap), `gnawer` 40x48 (cyan lens).
- Background type `hive`: ribs/motes/teeth/pools layout + four-layer
  renderer (flesh floor with teal seam).

## Hazard types used

`bonk` (brute spring + mid-air sentry-orb spring), `crusher` alternating
slams, `drip` alley, `boarder` waves [1,2,2,3,3,4] in gnawer skins,
`laser` spore-beam over the crown approach.

## Files changed

- `SpriteFactory.js`, `BackgroundRenderer.js`, `enemies/boarder.js`
  (per-config skin key)
- `levels/hive-warrens.js` (new), `levels/index.js`,
  `levels/colony-drop.js` (next-level link)
- `music/hive.js` (new, id `hive`, 126bpm), `music/index.js`
- `config/runtime-assets.cjs`, `tests/game.test.cjs`

## Play URL and results

- `http://127.0.0.1:3000/?level=9` — bot playthrough pending an idle box
  (earlier trial under load 11+ returned 18 deaths and is not trusted).
- `npm test` 89/89, eslint zero warnings, prettier clean on touched files.

## Not verified

- Full bot/human playthrough to the crown, co-op race, touch controls,
  seam strip under real parallax scroll. No debug skip used.
