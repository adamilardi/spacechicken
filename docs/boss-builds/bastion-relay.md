# Crown encounter: Bastion Relay (Level 11)

## Rule

The crown pad is a gatehouse: two crushers slam on either side of the pad on
an alternating beat (780ms duration, 390ms offset, 280ms hold). The safe
center between the slam footprints is 176px wide with the crown in it.

- Tell: crusher blocks riding above the pad edges, alternating slams.
- Safe response: climb from deck 5 on the off-beat, stand center, take the
  crown between slams. Every landing around the pad stays legal.
- Mechanic: two `crusher` configs in `levels/bastion-relay.js`, no new
  spawner. Distinct from the L8 shield, the L9 jaw bridge, and the L10 lift:
  the timing gate IS the crown pad.

## Paint and texture keys

No new actor paint. Reuses the shipped `crusher` texture and the
`bastionDeck` crown pad. Wave runners wear `spireWarden`.

## Files

`levels/bastion-relay.js`, `tests/game.test.cjs` (crusher presence),
`tests/contra-levels.test.cjs` (pad width, hop reachability).

## Play

`http://127.0.0.1:3000/?level=11` — cross from deck 5, hold center, take the
crown. Bot reached the pad approach (x3651) but has not cleared; the gate
timing (alternating 780/390 like the verified L9 jaw doors) is unit-covered
by config assertion only. Co-op shares the pad; pause freezes the slam
tweens by scene-clock construction (not separately run).
