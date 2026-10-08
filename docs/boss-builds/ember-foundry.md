# Crown encounter: Ember Foundry (Level 14)

## Rule

Tram-plus-beam gate, no shield. An ore tram ferries the player over the
wide penultimate gap, and a timed ember beam (780ms on, 1180ms off) sweeps
the last gap before the pad — cross on the dark. An earlier beam over the
mid-level gap teaches the rule once before the finale presses it. The clear
still comes from touching the crown.

- Tell: the beam's on/off beat; the tram's arrival under the edge.
- Safe response: ride the tram up, wait the dark beat at the gap edge, hop
  to the pad. Double jump clears over the beam as a hard alternative.
- Mechanic: two moving `liftPlatform` entries plus two `laser` configs in
  `levels/ember-foundry.js`. First finale that pairs a ride with a beam:
  L9 is a beam over static decks, L10 a lift with no beam.

## Paint and texture keys

No new actor paint. Beams tint `0xff6a2a`. Trams reuse `liftPlatform`.
Wave runners wear `gnawer`.

## Files

`levels/ember-foundry.js`, `tests/game.test.cjs` (movers present, laser
present, shield false), `tests/contra-levels.test.cjs` (pad width, hop
reachability through the static mover positions, on-deck boarder rule).

## Play

`http://127.0.0.1:3000/?level=14` — ride the trams, cross the last beam on
the dark, take the crown. Screenshot-probed: finale renders with zero page
errors. Full playthrough not yet run; the graph test covers only the static
mover positions, so the ride at live tween offsets still wants a human run.
