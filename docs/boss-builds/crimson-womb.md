# Crown encounter: Crimson Womb (Level 12)

## Rule

The CRIMSON HEART — the beating heart of the womb itself — holds the crown
deck past the spore-beam gap. The crown lands shielded (gray tint); the
shield drops when she dies, announced by a `CRIMSON HEART DOWN` banner.
Wounds persist through player death; the clear still comes from touching
the crown.

- Tell: heartbeat double-thump, crouch and red flash for 800ms means a
  378px slam-charge. Pace between slams, recover after.
- Safe response: plant on the pace, strafe the telegraph, jump as the
  charge leaves, burn the lens between slams.
- Mechanic: `type: 'boss'` config in `levels/crimson-womb.js` with
  `crownGuard: true`, driven by `BossDirector` (pace / telegraph /
  charge / recover, enrage below half HP). The wave-7 guard pack was
  removed: she gates the crown solo. Crown deck widened to scaleX 4.0
  for dodge room.

## Paint and texture keys

New `crimsonHeart` (120x84, `paintCrimsonHeart` in `sprites/enemies.js`,
registered in `ENEMY_SPRITES`): twin crimson lobes, artery stubs, glow
sacs, cyan lens. Centered hitbox trims the fringe (never `setOffset`).

## Files

`levels/crimson-womb.js`, `sprites/enemies.js`, `scripts/boss-review.mjs`
(brief 12 + approach), `tests/game.test.cjs` (wave list, boss assert).

## Play

`http://127.0.0.1:3000/?level=12` — cross the beam on the dark, take the
deck. Bot review (`BOT_GPU=1 node scripts/boss-review.mjs 12`): defeated
in 8.6s with 0 deaths, all phases seen, Jev panel 4/4 ship
(Marlowe/Vic/Sam/Lex). Playable.
