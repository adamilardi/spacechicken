# Level polish sweep: all 16 levels (October 2026)

Static sweep over every shipped level with the pro-review lens
(checkpoint honesty, lane clashes, dead shelves, finale gates,
teach-then-test), plus a text pass over instructions. No new hazards,
art, or engine code; all edits are level data and instruction strings.

## Fixes landed

- L3 Orbital Gauntlet: drone 1 patrol end 1120->1090. The 48px sprite
  ghosted 22px over the M3 tram's left edge at full extension, clipping
  a rider's head height. Now 8px clear by sprite.
- L7 Earthwatch: wave-2 home 2040->1970 (still on deck 2, still past
  the wave-2 release). Checkpoint 1 clearance 110->180px.
- L11 Bastion Relay: wave-2 home 1800->2250. Checkpoint 1 sat at dx=0
  directly under the home — the tightest respawn in the game, missed
  when the checkpoint moved out of the beam gate. The pair now sits at
  2100/2250 past the gate, shootable from before it. Wave-3 home
  3550->3620 (checkpoint 2 clearance 99->169px, still on deck 5 and
  68px clear of crusher 1). Pylon 3700->3670, out of crusher 1's
  64px-wide slam footprint (dx 20->50).
- L13 Rust Harbor / L14 Ember Foundry / L15 Skyhook Anchor: the deck-3
  drone rises 40px (480->440 on 13, 476->436 on 14/15). Checkpoint 1
  sat at dx=0 under the patrol start with 80px of separation — the
  same class as the L10/L12 fixes. Now 120px below the lane; the drone
  still sits inside the jump arc over deck 3's right end, so it keeps
  its guard role. (A gap-guard move was rejected on 14: the ore tram
  already rides that gap, and the drone would clip its rider zone.)
- L16 Iron Vault: checkpoint 2 2250->2320 (clearance to the wave-2
  home 100->170px, 123px clear of the finale beam, still on deck 4).
- L1/L2 shared instructions: the double jump was never taught in text,
  and the L1 crown sits ~172px of effective rise off the floor — at
  the single-jump limit. Both keyboard and touch strings now name the
  mid-air second press.
- L8/L9/L10 instructions: added the missing "New gun" callouts to
  match L11+, per the `weaponsForLevel` ladder — SCATTER (3-bolt fan),
  PIERCER (thin bolt through the wave), NOVA (wide orb, fat hitbox).
  Keyboard and touch strings.

## Checked and left alone

- L8 wave-2 home over the deck2/deck3 gap: blessed exemption, unchanged.
- "Dead shelf" flags on L9/L10/L13 (fang 3350, glass 2620, planks
  3900/3450) are required stairs on the main route, not optional
  shelves; the L13 plank also sits between wave-4 homes and the
  crusher finale. The pay-or-threaten rule holds.
- L3 crown floats with no pad: grabbed from deck 5's right end / the
  M4 lift, within a normal jump. By design.
- L6's 827px canyon gap still demands the beetle bonk (documented).
- L9's spore-beam: the fang-to-deck climb passes under the band, and
  the beam punishes overshoot rather than gating the crossing. Left
  for a playtest to confirm; see backlog.
- L13/14/15 share the mid skeleton (same decks, drone, dust devil,
  wave pins). Plays differently per finale; a diversity pass is
  backlog, not this sweep.
- L16's shelf route can arc over the finale beam with a full double
  jump — a L10-style skill bypass with a stationed boarder as the
  price, not a decorative beam.

## Tests

- New `tests/level-polish.test.cjs`: checkpoints clear every boarder
  home by 150px (levels 7, 9-16), checkpoints never sit under a
  drone/dust-devil lane, props clear crusher footprints by 40px, and
  drones clear lift rider zones by sprite (all levels — generalizes
  the old L4-only check). All four failed on the pre-fix data and
  pass now.
- `skills/level-creator/SKILL.md` checkpoint rule now names the 150px
  / lane / footprint clearances and the test file.
- Full gate: `npm run check` (tests + eslint zero warnings + prettier).

## Backlog ideas (not fixed here)

1. Bot-verify the L9 finale beam: confirm the climb timing reads and
   the beam is more than overshoot insurance.
2. Diversity pass for the 13/14/15 mid skeleton, in the style of the
   L8/L11 trench split.
3. L8 checkpoints: the mid-arc review left 8 checkpoint-less; add a
   pair in the L7 style if playtesting says the shield grind punishes.
4. L1 crown margin: 9px over the comfortable single-jump rise. The
   double-jump text covers it; lower the crown 20px if new-player
   data still shows misses.
5. Skills backlog `skills/PRODUCT_BACKLOG.md` SCB-1..SCB-6 still open
   (QA skill ports, weapon-creator rack rules, evidence folders).
