# Crown encounter: Bastion Relay (Level 11)

## Rule

The GATEKEEPER holds the crown deck (480px bastion deck,
x11400-11880): the first hybrid. She paces at 60px/s, telegraphs
800ms (crouch + red tint), and charges 378px at 420px/s every 2.6s
(2.0s enraged past half HP, same charge speed) — and every 12s (8.4s enraged) she births
one spireWarden (max 1 alive) with a 600ms gold summonTell. 12 HP
behind the crown shield; the shield opens when she dies and her
warden dissolves with her. The old gatehouse crusher pair is gone (the boss is
the gatehouse now); mid-level crushers stay.

- Tell: red crouch = charge; gold rear-up = birth.
- Safe response: plant on the pace, strafe the telegraph, jump as
  the charge leaves, gun down the newborn before it spreads.
- The crown hangs over the deck; grab it after the kill.

## Paint and texture keys

`gatekeeper` (130x90: relay antennae, hull dome, conduit seams,
alert-red lens, girder shoulders, treads) on the `bastionDeck`
deck. Boss HP bar via the shared boss UI.

## Files

`levels/bastion-relay.js` (boss entry, shield, deck, instructions),
`BossDirector.js` + `enemies/boss.js` (framework), `sprites/enemies.js`
(`paintGatekeeper`).

## Play

`http://127.0.0.1:3000/?level=11` — cross the base, duel the
Gatekeeper, take the crown. Panel report:
`docs/boss-reviews/level-11.json`.
