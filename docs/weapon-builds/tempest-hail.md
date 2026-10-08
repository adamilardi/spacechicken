# Arsenal build: Tempest / Hail

## Rules kept (weapon-creator)

- Phaser stays the default; new guns are extra choices on `PHASER` levels
  only (levels 1-7 stay phaser-only).
- One fire path: everything spawns through `tryFirePhaser` via the
  `spawnPlayerBolt` helper. Shared 220ms cooldown, pool of 10, 820px range,
  bolts hurt boarders only. Bonk enemies untouched.
- Switching is once per press per chicken (keyboard edge, gamepad button-3
  edge, touch tap). Scene clock drives cooldowns, so pause freezes them.
- Unlocks grow down the campaign: 11 → +Tempest, 12 → +Hail. Guns persist
  across the level handoff (Contra-style) and reset on full restart. HUD
  names the gun in the level field (`Level 11 · Tempest`).

## Coverage shapes (same DPS family, different feel)

- Tempest: true Contra spread — 5-bolt fan (straight, ±75/±150 vy) via a new
  `ways` def field read in the single shots branch. Eats pool faster.
- Hail: 3-bolt fan (±120 vy) where each bolt pierces 2 aliens
  (`pierceLeft: 2`) — the first spread+pierce combination.

## Texture keys

`tempestGun`/`tempestBolt`, `hailGun`/`hailBolt`. Guns/bolt bodies match
painted solids; the shared pool re-skins + resizes bodies per shot.

## Files

`GameUtils.js` (registry + unlock/cycle helpers), `SpriteFactory.js`,
`SpaceChicken.js` (5-way fan branch), level instructions (G hint),
`tests/game.test.cjs` (unlock ladder, fan/pierce unit test through the real
fire path with a mocked bolt group).

## Play

- L11 Tempest 5-fan + HUD label: screenshot-verified live.
- L12 Hail fan + HUD label: screenshot-verified live.
- L1 started run: G and F do nothing weapon-like (screenshot-verified, no
  errors); switch-false also unit-tested.
- Non-phaser level switch: unit-tested. Co-op independent cycle:
  unit-tested (existing P2 switch test).
- Not run: full bot clears with the new guns, touch button (no hardware;
  mirrors bolt button), gamepad switch edges (no hardware), pause-cooldown
  (true by scene-clock construction).
