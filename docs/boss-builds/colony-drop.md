# Crown encounter: Colony Drop (Level 8)

## Rule

The crown lands shielded (gray tint). Touching it early only rattles the
camera. The shield drops when every released skitterer is dead, announced
by a `CROWN OPEN` banner and a gold burst. The clear still comes from
touching the crown — a stunned wave is not the clear.

- Tell: gray crown + live skitterers converging on the pad.
- Safe response: hold the pad at bolt range, sweep the wave, then walk in.
- Mechanic: `CROWN_SHIELD` definition flag → `LevelConfig.crownShield` →
  `armCrownShield` / `breakCrownShield` / `liveBoarderCount` in
  `SpaceChicken.js`, gated in `collectGem`, released in `defeatBoarder`.
  Unreleased future waves never block (only arrived boarders count), so the
  gate cannot strand the crown; death re-arms the wave and the shield
  together, with the standard 700ms boarder grace on respawn.

## Paint and texture keys

No new actor paint. Shield state reuses the shipped `crown` texture
(gray tint while held) plus the standard collect burst. Boarders wear the
new `skitterling` skin with its cyan lens.

## Files

`levels/colony-drop.js`, `LevelConfig.js`, `SpaceChicken.js`,
`tests/game.test.cjs` (shield gate test).

## Play

`http://127.0.0.1:3000/?level=8` — clear all six skitterers, watch the
banner, take the crown. Covered by unit test; full bot playthrough pending
an idle box. Co-op shares the wave pool and the gate. Pause freezes bolts
and cooldowns by scene-clock construction (not separately run).
