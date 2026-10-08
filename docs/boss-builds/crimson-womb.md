# Crown encounter: Crimson Womb (Level 12)

## Rule

Two-phase heart gate. Phase one: the crown lands shielded (gray tint) and the
shield drops only when every arrived gnawer is dead, announced by a
`CROWN OPEN` banner. Phase two: a timed spore-beam (780ms on, 1180ms off)
sweeps the last gap before the pad — cross on the dark. The clear still comes
from touching the crown.

- Tell: gray crown + converging gnawers, then the beam's on/off beat.
- Safe response: sweep the waves down the climb, wait the dark beat at the
  gap edge, hop to the pad. Double jump clears over the beam as a hard
  alternative.
- Mechanic: `CROWN_SHIELD` definition flag (same path as L8) plus a `laser`
  config in `levels/crimson-womb.js`. First two-phase finale: L8 is shield
  only, L9 beam only.

## Paint and texture keys

No new actor paint. Shield state reuses the shipped `crown` texture (gray
tint while held). Beam tints `0xff5a8a`. Wave runners wear `gnawer`.

## Files

`levels/crimson-womb.js`, `tests/game.test.cjs` (shield flag, laser
presence), `tests/contra-levels.test.cjs` (pad width, hop reachability,
on-deck boarder rule).

## Play

`http://127.0.0.1:3000/?level=12` — clear all six gnawers, cross the beam on
the dark, take the crown. Screenshot-verified: shield holds at spawn with
the wave-1 gnawer alive on its deck (an earlier gap-spawned placement opened
the gate for free and was fixed). Full playthrough not yet run; co-op shares
the wave pool and the gate.
