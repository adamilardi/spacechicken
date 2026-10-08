# Diversity pass: contra arc (Levels 8-15)

## Why

Every contra level read as one repeated deck texture, and several shared
copy-paste skeletons (11 matched 8 almost deck for deck; 13-15 shared one
family). Research: Contra NES walkthroughs (GameFAQs) show stages built
from alternating set pieces inside each biome — bridges over gaps, vertical
waterfall climbs, trenches and roadways you drop into, stairs and ledges,
upper/lower route splits, turrets on both sides, multi-part gates. This
pass translates that vocabulary into the engine: a second ACCENT deck
texture per level for shelves and set pieces, one signature solid set
piece per level, and decor props where levels had none.

## What changed per level

- L8 Colony Drop: shelves + new girder bridge (3156,586) in `colonyGirder`;
  +2 beacons. Set piece: bridge.
- L9 Hive Warrens: shelves + new shaft step (3350,340) in `hiveFang`; +3
  `hiveSac` props (first props). Set piece: fang shaft climb.
- L10 Spire Crown: shelves + new stair (2620,380) in `spireGlass`; +2
  `spireFin` props (first props). Set piece: glass stair.
- L11 Bastion Relay: shelves + new trench dip (1650,660) in `bastionGrate`;
  +2 pylons. Set piece: trench (breaks the L8 skeleton clone).
- L12 Crimson Womb: shelves + new marrow bridge (3830,340) in `wombBone`;
  +3 `wombEye` props (first props); finale beam lengthened (120->140) so
  it still guards the bridged crossing. Set piece: bridge.
- L13 Rust Harbor: shelves + new stair (3450,470) in `harborPlank`; +2
  lamps. Set piece: container stair.
- L14 Ember Foundry: shelves + new two-deck vent tower (3300,440/380) in
  `foundryChain`; +2 vents. Set piece: tower.
- L15 Skyhook Anchor: shelves + new stair (3700,356) in `skyhookPanel`; +2
  clamps. Set piece: pylon stair.

Instructions name each set piece. No hazard, wave, checkpoint, or crown
moves; no new hazard code.

## Art pipeline

- Brief + 8 candidates + previews + manifest under
  `art-candidates/contra-diversity/` (accent decks; sac/fin/eye props).
- Delegated revision selections:
  `art-selections/<level>/selection-diversity.json` for all eight levels.
- Ports: 11 `paint*` functions + `createExpeditionSprites` registration in
  `SpriteFactory.js`. No new files, so no `runtime-assets.cjs` change.

## Rules

New permanent rule in `skills/level-creator/SKILL.md`: two deck textures
per contra level (accent inverts the main deck), one signature set piece
per level, no skeleton clones.

## Verification

- `npm test` 111/111 (graph test walks every new deck; on-deck, wave, pad,
  and checkpoint rules still hold). `tests/contra-levels.test.cjs` knows
  the 8 accent sizes; `tests/game.test.cjs` asserts accent + new-prop
  presence.
- eslint zero warnings; prettier clean on touched files.
- In-game probes 32/32: levels 8-15 load playing, set-piece teleports
  render, zero page errors; all 8 candidate previews paint with zero page
  errors.

## Not verified

- Full human playthroughs over the new pieces, co-op, touch, seams under
  real parallax scroll.
