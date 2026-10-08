# Level build: Crimson Womb (Level 12)

## Assumptions

- Alien's Lair: `PHASER: true`, low drip run into a 30/90px stepped climb
  (every rise single-jumpable at gravity 300), gnawer waves [1,2,2,3,3,4],
  drip alley, dust-devil patrol, spore-floater sentry, spore-beam over the
  last gap. No new hazard code; all actors already run.
- Heart-gate finale (boss-creator), two-phase: `CROWN_SHIELD` (drop all six
  gnawers to open it) plus the timed beam crossing; crown touch is the clear.
  See `docs/boss-builds/crimson-womb.md`.
- Bastion Relay `NEXT_LEVEL` points at 12; 12 points at null. Full chain
  1..12, all with distinct music.
- Hail (weapon-creator): spread-plus-pierce fan unlocked here through the
  single `tryFirePhaser` path; G swaps, HUD names the gun. See
  `docs/weapon-builds/tempest-hail.md`.

## Selection paths

- `art-selections/crimson-womb/selection.json` (delegated/agent) from
  `art-candidates/iron-womb/manifest.json`, candidate
  `level-crimson-womb-b`: layout + flesh deck.
- Wave runners wear the shipped `gnawer` boarder skin; the sentry wears the
  shipped `sporeFloater` drone skin. No new actor paint.

## Texture keys

- `wombFlesh` 96x24 (bone walkable edge, vein dots over dark flesh). Painted
  in `SpriteFactory.js`, registered in `createExpeditionSprites`, created at
  gameplay size with smoothing off.
- Background type `womb`: living throat (ribcage arcs, landmark heart with
  vein spokes, mouth teeth top and bottom, wisps) + branches in
  `ensureLayout`/`drawLayer`. Composition reworked off the ridge-and-strip
  default per the skill's distinct-composition rule.

## Hazard types used

`boarder` waves [1,2,2,3,3,4], `drip` alley, `dustDevil` patrol, `drone`
sentry, `laser` spore-beam, `CROWN_SHIELD` gate. No props.

## Files changed

- `SpriteFactory.js`, `BackgroundRenderer.js`, `GameUtils.js` (hail def)
- `levels/crimson-womb.js` (new), `levels/index.js`,
  `levels/bastion-relay.js` (next-level link, same change)
- `music/womb.js` (new, id `womb`, 118bpm), `music/index.js`
- `config/runtime-assets.cjs`, `tests/game.test.cjs`,
  `tests/contra-levels.test.cjs` (incl. the new on-deck boarder rule, written
  after a gap-spawned gnawer opened this level's shield for free)

## Play URL and results

- `http://127.0.0.1:3000/?level=12` — bot: 0/2 wins, 34-36 deaths, never past
  x1390. The pilot is drip-blind (distilled from boarder-only traces) and
  never bot-cleared L7 either, so this reads as pilot ceiling, not level
  unfairness: every hop is unit-tested single-jumpable and the drip alley
  runs a generous 1600ms alternating rhythm.
- In-browser probes: Hail fan + HUD label screenshot-verified; shield stays
  shut at spawn and the wave-1 gnawer holds its deck (screenshot-verified);
  background layers render with no page errors.
- `npm test` 98/98, eslint zero warnings, prettier clean on touched files.

## Not verified

- Full bot/human playthrough to the crown, co-op race, touch controls, and
  the seam strip under real parallax scroll. No debug skip used.
