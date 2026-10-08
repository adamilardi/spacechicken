# Crown encounter: Rust Harbor (Level 13)

## Rule

Cargo-slam gate. Twin crushers (780ms slam, second offset 390ms) pound the
crown pad, and the crown lands shielded (gray tint): the shield drops only
when every arrived skitterling is dead, announced by a `CROWN OPEN` banner.
The clear still comes from touching the crown.

- Tell: gray crown plus converging skitterlings, then the alternating slam
  beat over the pad.
- Safe response: sweep the waves down the climb, pick the gap between
  slams, hop to the pad. The pad is 288px wide with the slams 140px apart,
  so a standing gap always exists.
- Mechanic: `CROWN_SHIELD` definition flag (same path as L8/L12) plus two
  `crusher` configs in `levels/rust-harbor.js`. First slam-plus-shield
  pairing: L11 is slams only, L12 is shield plus beam.

## Paint and texture keys

No new actor paint. Shield state reuses the shipped `crown` texture (gray
tint while held). Slams reuse the shipped crusher. Wave runners wear
`skitterling`.

## Files

`levels/rust-harbor.js`, `tests/game.test.cjs` (shield flag, crusher
presence), `tests/contra-levels.test.cjs` (pad width, hop reachability,
on-deck boarder rule).

## Play

`http://127.0.0.1:3000/?level=13` — clear all eight skitterlings, cross
between slams, take the crown. Screenshot-probed: finale renders with zero
page errors. Full playthrough not yet run; co-op shares the wave pool and
the gate.
