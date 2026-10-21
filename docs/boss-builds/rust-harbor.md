# Crown encounter: Rust Harbor (Level 13)

## Rule

SCRAPJAW — a walking crusher-jaw — holds the crown deck between the cargo
slams. The crown lands shielded (gray tint); the shield drops when she
dies, announced by a `SCRAPJAW DOWN` banner. Wounds persist through player
death; the clear still comes from touching the crown.

- Tell: crouch and orange flash for 800ms means a 378px charge. The cargo
  slams telegraph with their own rise on a 780ms beat.
- Safe response: plant on the pace, strafe the telegraph, jump as the
  charge leaves, never stand under a rising slam.
- Mechanic: `type: 'boss'` config in `levels/rust-harbor.js` with
  `crownGuard: true`, driven by `BossDirector` (pace / telegraph /
  charge / recover, enrage below half HP). The wave-8 guard was removed:
  she gates the crown solo. Crown deck widened to scaleX 4.0 for dodge
  room.

## Paint and texture keys

New `scrapjaw` (130x90, `paintScrapjaw` in `sprites/enemies.js`,
registered in `ENEMY_SPRITES`): rusted girder frame, piston teeth,
hazard stripes, orange lens. Centered hitbox trims the fringe (never
`setOffset`).

## Files

`levels/rust-harbor.js`, `sprites/enemies.js`, `scripts/boss-review.mjs`
(brief 13 + approach), `tests/game.test.cjs` (wave list, boss assert).

## Play

`http://127.0.0.1:3000/?level=13` — climb the plank stair, cross between
slams, take the deck. Bot review (`BOT_GPU=1 node scripts/boss-review.mjs
13`): defeated in 12.2s with 0 deaths, all phases seen, Jev panel 4/4
ship (Marlowe/Vic/Sam/Lex). Playable.
