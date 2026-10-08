# Iron Womb duology — art brief

Side-view run-and-gun pair that extends the campaign past Spire Crown (10).
Both are `PHASER: true` contra-style levels: face the wave, press F/J,
gamepad button 2, or the touch bolt button. Run ends at the crown; no boss
object. Per `skills/level-creator/references/spacechicken.md`, bolts only hurt
actors in the boarder overlap, bonkables need a top-down stomp.

## Candidates (one place per level)

- `level-bastion-relay-a` — Level 11 BASTION RELAY. Contra Base 1: steel-blue
  tech corridors, wall panels, girder silhouettes, red alert lights, pale deck
  with a cyan underlight. World ~4200x760, gravity ~300.
- `level-crimson-womb-b` — Level 12 CRIMSON WOMB. Alien's Lair: deep red flesh
  folds, vein sacs, bone-white deck edge over dark mottled flesh.
  World ~4400x780, gravity ~300.

Background `type` tokens (`bastion`, `womb`) are free: shipped types are
`space`, `station`, `moon`, `facility`, `mars`, `iss`, `colony`, `hive`,
`spire`. `scrollFactorY` stays 1. Distant paint stays quieter than the
chicken, hazards, and platform top edges. Motion is runtime parallax only;
pause freezes it. Seams: unverified until the repeated strip in each preview
is eyeballed.

## Platforms (solid) vs props (decor only)

- Solid: `deck.js` in each candidate — 96x24, opaque top deck, hitbox on the
  opaque deck, no transparent margin tricks.
- Decor only: `pylon.js` (bastion wall sconce, 20x48). No collision. Thin and
  tall, never deck-shaped.

## Monsters / weapons (concept, not wired here)

Reuse shipped actors with colony skins: Bastion wardens wear `spireWarden`,
sentries wear `voltOrb`; Womb swarm wears `gnawer`, sentries wear
`sporeFloater`. No new spawner needed for the places themselves.

Weapons (extras on `PHASER` levels, phaser stays default, one fire path
through `tryFirePhaser`, per-chicken `lastPhaserAt`, HUD label only):

1. Tempest (L11): true Contra spread — 5-way fan.
2. Hail (L12): fan shots that punch through two aliens (spread + pierce).

Paint + switch + HUD belong to `weapon-creator`.

## Crown encounters (boss-creator goes here later)

- L11: gatehouse — two alternating crushers slam on either side of the crown
  pad; stand center, cross between slams.
- L12: heart gate — two-phase: `CROWN_SHIELD` (drop every gnawer to open it)
  plus a timed beam over the last gap; crown touch is the clear.

## Music

New `music/bastion.js`, `music/womb.js` tracks will be added in level-creator
so no level falls through to level 1's track.
