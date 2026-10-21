# Crown encounter: Hive Warrens (Level 9)

## Rule

The HIVE MOTHER nests on the crown deck (x10990) and births gnawers: adds only,
never a charge. She sits the whole
fight behind a screen of her young. Two gnawers at most, one every
6s (4.2s enraged past half HP). Her body is lethal to touch; her
10 HP bar burns down under flat phaser fire. Kill order is the
player's call: burn her lens through the gaps or duel the young
first.

- Tell: 600ms summonTell crouch + glow before each birth; the young
  spawn 90px to her open side (never on the challenger).
- Safe response: hold the deck, keep bolts on her lens, hop or duel
  the hopping young. Nothing crosses the deck at you.
- The crown shield opens when she dies; her young dissolve with her.

## Paint and texture keys

`hiveMother` (brood-sac lens, jaw fringe) on the `hiveChitin` deck;
summoned `gnawer` boarders. Boss HP bar via the shared boss UI.

## Files

`levels/hive-warrens.js` (boss entry, deck, instructions),
`BossDirector.js` + `enemies/boss.js` (framework), `sprites/enemies.js`
(`paintHiveMother`).

## Play

`http://127.0.0.1:3000/?level=9` — climb the fang shaft, hold the deck,
burn the Mother. Panel report: `docs/boss-reviews/level-9.json`.
