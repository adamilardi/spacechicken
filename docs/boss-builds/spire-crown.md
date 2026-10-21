# Crown encounter: Spire Crown (Level 10)

## Rule

WARDEN PRIME holds the crown deck (410px alloy, x11745-12155): a
swift charger, the spire's duelist. She paces at 60px/s, telegraphs
800ms (crouch + red tint), and charges 378px at 420px/s every 2.6s
(1.6s enraged past half HP). 12 HP behind the crown shield; the
shield opens when she dies. The wave-7 warden moved down to guard
the lift boarding (x11400) so the deck duel stays one-on-one.

- Tell: telegraph crouch + tint + thud; the charge runs flat.
- Safe response: hold fire on the pace, jump late over the charge,
  never stand in the lane. Low gravity stretches every arc.
- The crown hangs over the deck east end; grab it after the kill.

## Paint and texture keys

`wardenPrime` (130x90: gold plume, helm band, alloy cuirass, cyan
lens, pauldrons, tassets) on the `spireAlloy` deck. Boss HP bar via
the shared boss UI.

## Files

`levels/spire-crown.js` (boss entry, shield, instructions),
`BossDirector.js` + `enemies/boss.js` (framework), `sprites/enemies.js`
(`paintWardenPrime`).

## Play

`http://127.0.0.1:3000/?level=10` — ride the lift, duel the Prime,
take the crown. Panel report: `docs/boss-reviews/level-10.json`.
