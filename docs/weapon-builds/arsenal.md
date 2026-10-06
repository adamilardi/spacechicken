# Arsenal build: Scatter / Piercer / Nova

## Rules kept (weapon-creator)

- Phaser stays the default; new guns are extra choices on `PHASER` levels
  only (Earthwatch stays phaser-only).
- One fire path: everything spawns through `tryFirePhaser` via the
  `spawnPlayerBolt` helper. Shared 220ms cooldown, pool of 10, 820px range,
  bolts hurt boarders only. Bonk enemies untouched.
- Switching is once per press per chicken (keyboard edge, gamepad button-3
  edge, touch tap). Scene clock drives cooldowns, so pause freezes them.
- Unlocks grow down the campaign: 8 → Scatter, 9 → +Piercer, 10 → +Nova.
  Guns persist across the level handoff (Contra-style) and reset on full
  restart. HUD names the gun in the level field (`Level 8 · Scatter`).

## Coverage shapes (same DPS, different feel)

- Scatter: 3-bolt fan (straight, ±140 vy), eats pool faster.
- Piercer: thin bolt, `pierceLeft` passes through a wave.
- Nova: wide 16px orb, same speed, fatter hitbox.

## Texture keys

`scatterGun`/`scatterBolt`, `piercerGun`/`piercerBolt`,
`novaGun`/`novaOrb`, touch `weaponBtn`. Guns/bolt bodies match painted
solids; the shared pool re-skins + resizes bodies per shot.

## Files

`GameUtils.js` (registry + unlock/cycle helpers), `SpriteFactory.js`,
`SpaceChicken.js` (fire branch, pierce, switch, persist, HUD hook),
`UIManager.js` (label + touch button), `InputController.js` (pad edges),
level instructions (G hint), `tests/game.test.cjs`.

## Play

- L8 scatter volley + HUD label: screenshot-verified live.
- L10 piercer thin bolt + double-G cycle: screenshot-verified live.
- Bot campaign clears on 8/9/10 with default phaser (never-switch path).
- Non-phaser level: switch control does nothing (unit-tested).
- Co-op: split-screen ran clean; P2 cycles independently (unit-tested).
- Not run: touch button (no hardware; mirrors bolt button), gamepad
  switch edges (no hardware), pause-cooldown (true by scene-clock
  construction).
