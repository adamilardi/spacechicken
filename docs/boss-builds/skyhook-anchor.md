# Crown encounter: Skyhook Anchor (Level 15)

## Rule

Gauntlet finale. The anchor lift ferries the player up the last wall, a
timed beam (780ms on, 1180ms off) sweeps the pad approach, a crusher slams
the pad itself, and the crown lands shielded (gray tint): the shield drops
only when every arrived warden is dead, announced by a `CROWN OPEN` banner.
The clear still comes from touching the crown, and `NEXT_LEVEL` is null.

- Tell: gray crown plus converging wardens, the lift's arrival, the beam's
  on/off beat, the slam's drop.
- Safe response: sweep the waves down the climb, ride the lift, cross the
  beam on the dark, slip the single slam, take the crown. Each phase has a
  standing window; nothing overlaps the lift boarding.
- Mechanic: `CROWN_SHIELD` definition flag plus a moving `liftPlatform`,
  a `laser`, and a `crusher` config in `levels/skyhook-anchor.js`. The
  everything finale: every earlier gate idea appears once.

## Paint and texture keys

No new actor paint. Shield state reuses the shipped `crown` texture (gray
tint while held). Beam tints `0x7df9ff`. Lift reuses `liftPlatform`, slam
reuses the shipped crusher. Wave runners wear `spireWarden`.

## Files

`levels/skyhook-anchor.js`, `tests/game.test.cjs` (shield flag, mover,
laser, crusher presence), `tests/contra-levels.test.cjs` (pad width, hop
reachability, on-deck boarder rule).

## Play

`http://127.0.0.1:3000/?level=15` — clear all eight wardens, ride the lift,
cross the beam on the dark, slip the slam, take the crown. Probe-verified:
the shielded crown holds on touch (still level 15) and the finale renders
with zero page errors. Full playthrough and the final-clear screen are not
yet run; co-op shares the wave pool and the gate.
