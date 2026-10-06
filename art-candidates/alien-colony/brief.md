# Alien colony trilogy — art brief

Side-view run-and-gun trilogy that extends the campaign past Earthwatch (7).
All three are `PHASER: true` contra-style levels: face the wave, press F/J,
gamepad button 2, or the touch bolt button. Run ends at the crown; no boss
object. Per `skills/level-creator/references/spacechicken.md`, bolts only hurt
actors in the boarder overlap, bonkables need a top-down stomp.

## Candidates (one place per level)

- `level-colony-drop-a` — Level 8 COLONY DROP beachhead. Dusty violet dusk,
  dome silhouettes, landing-pad deck. World ~4200x760, gravity ~300.
- `level-hive-warrens-b` — Level 9 HIVE WARRENS. Teal womb + purple chitin,
  low tunnels, springy chitin deck. World ~3800x860, gravity ~320.
- `level-spire-crown-c` — Level 10 SPIRE CROWN finale. Black-gold spire,
  pale alloy deck with chevron notches. World ~4400x780, gravity ~280.

Background `type` tokens (`colony`, `hive`, `spire`) are free: shipped types
are `space`, `station`, `moon`, `facility`, `mars`, `iss`.
`scrollFactorY` stays 1. Distant paint stays quieter than the chicken,
hazards, and platform top edges. Motion is runtime parallax only; pause
freezes it. Seams: unverified until the repeated strip in each preview is
eyeballed.

## Platforms (solid) vs props (decor only)

- Solid: `deck.js` in each candidate — 96x24 (spire 128x28), opaque top deck,
  hitbox on the opaque deck, no transparent margin tricks.
- Decor only: `beacon.js` (colony landing light, 24x44). No collision.
  A slab painted as scenery would repeat the removed Specimen Wing crusher
  confusion — so props are thin/tall, never deck-shaped.

## Monsters / weapons (concept, not wired here)

Shootable boarders: Skitterling, Spore Charger, Wisp Wing, Spire Warden.
Bonkable: Hive Brute (gold-cap marker via `paintBonkPad`, like
`paintBeetle` in `SpriteFactory.js`). Reuse shipped `drone`, `roller`,
`laser`, `drip`, `crusher`, `dustDevil` with colony tints — no new spawner
needed for the place itself.

Weapons (all extras on `PHASER` levels, phaser stays default, one fire path
through `tryFirePhaser`, per-chicken `lastPhaserAt`, HUD label only):

1. Scatter Clutch (L8), 2. Hive Piercer (L9), 3. Crown Nova (L10).
   Paint + switch + HUD belong to `weapon-creator`; enemy poses to
   `enemy-art-creator` / `enemy-animation-creator`.

## Crown encounters (boss-creator goes here later)

- L8: shootable gate — 3 lens nodes drop a shield over the crown pad.
- L9: timed spore-beam over the last gap — tell is the lens glow, safe
  window is the off-beat.
- L10: moving alloy deck lines up with the crown spire; stunned parts are
  never the clear, crown touch is.

## Music

New `music/colony.js`, `music/hive.js`, `music/spire.js` tracks will be added
in level-creator so no level falls through to level 1's track.
