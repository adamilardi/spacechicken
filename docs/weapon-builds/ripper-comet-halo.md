# Arsenal build: Ripper / Comet / Halo

## Rules kept (weapon-creator)

- Phaser stays the default; new guns are extra choices on `PHASER` levels
  only (levels 1-7 stay phaser-only).
- One fire path: everything spawns through `tryFirePhaser` via the
  `spawnPlayerBolt` helper. Shared cooldown, pool, range, and the rule that
  bolts only hurt boarders. Bonk enemies untouched.
- Switching is once per press per chicken (keyboard edge, gamepad edge,
  touch tap). Scene clock drives cooldowns, so pause freezes them.
- Unlocks grow down the campaign: 13 → +Ripper, 14 → +Comet, 15 → +Halo.
  Guns persist across the level handoff (Contra-style). HUD names the gun.

## Coverage shapes (same DPS family, different feel)

- Ripper: the widest 3-bolt fan (±200 vy) where each bolt punches through
  one alien (`pierceLeft: 1`) — wider than Hail, lighter punch.
- Comet: tight 5-bolt fan (±90 spread via the `ways` def field) where each
  bolt punches through one — the first 5-way with pierce (Tempest has
  none).
- Halo: a single fat piercing orb (`pierceLeft: 99`, 18x18 body) — the
  Nova orb's coverage with the Piercer's never-stops rule.

## Texture keys

`ripperGun`/`ripperBolt`, `cometGun`/`cometBolt`, `haloGun`/`haloOrb`.
Guns/bolt bodies match painted solids; the shared pool re-skins + resizes
bodies per shot.

## Files

`GameUtils.js` (registry + unlock/cycle helpers), `SpriteFactory.js`,
`tests/game.test.cjs` (ladder pins 13-15, cycle pins, shape pins).

## Play

On `?level=13`, `?level=14`, `?level=15`: the phaser still fires for a
pilot who never switches; G cycles down the ladder (Ripper at G x6, Comet
at G x7, Halo at G x8 from the phaser) and the new gun fires
(`boltsInFlight >= 1`, probe-verified with zero page errors). Co-op
per-chicken switching not re-probed for these guns; the path is unchanged
shared code.
