# Crown encounter: Iron Vault (Level 16)

## Rule

Beam-plus-slam gate, shielded crown. A timed red beam (780ms on,
1180ms off) sweeps the approach deck before the last gap, and a
crusher slams the crown pad itself — cross on the dark, slip the
slam. The crown lands shielded: the shield drops only when Tumbler,
the boss on the crown deck, dies. The clear still comes from
touching the crown, and the vault rejoins the foundry (`NEXT_LEVEL`
14).

- Tell: the beam's on/off beat; the slam's rise; Tumbler's crouch
  and red flash.
- Safe response: cross the approach beam on the dark, hop the gap,
  plant on the pace, jump the charge late, never stand under a
  rising slam.
- Mechanic: `CROWN_SHIELD` plus the `boss` config in
  `levels/iron-vault.js`, a `laser`, and a `crusher`. The branch
  boss: a tight solo duel behind the same two gates as the finale.

## Boss: Tumbler

The wave-7 guard pair is now Tumbler, the vault's living lock: a
lockplate crab (brass pin tumblers, glowing keyway seams, shackle
horns, red lens) holding the crown pad. 12 HP charger: paces at
60px/s, telegraphs (crouch + red flash, 800ms) into a 378px charge.
Below half HP he rests much shorter and charges 20% faster, tinted
purple with an ENRAGED banner. Kill opens the shield; wounds persist
through player death.

Texture key `tumbler` (`paintTumbler` in `sprites/enemies.js`,
130x90). Config in `levels/iron-vault.js` (triggerX 9470, arena
9460-9680, boss-door checkpoint at 9450, crown floor widened to the
east wall so the arena has no kill-void, approach beam pulled west
to 9150 so charge-dodge spill never reaches it, vault beams
lengthened to 200 so the rule stays "cross on the dark"); panel brief in
`scripts/boss-review.mjs` (`BRIEFS[16]`, approach teleport
[9430, 380]).

## Files

`levels/iron-vault.js`, `sprites/enemies.js` (`paintTumbler`),
`scripts/boss-review.mjs` (brief), `tests/game.test.cjs` (wave
list, boss presence), `tests/contra-levels.test.cjs` (pad width,
hop reachability, on-deck boarder rule).

## Play

`http://127.0.0.1:3000/?level=16` — cross the beam on the dark, hop
to the pad, duel Tumbler, take the crown.
