# Contra shrike — a bonkable cross-tier swooper for levels 8–16

The contra arc's new 8-way aim lets the chicken shoot up, diagonal-up, and
down from the air, but every bonkable in the arc is stationary or flat: the
sentry orb bobs in place, brutes walk one deck, and the Bear Raider (a news
enemy) dives straight down from a fixed hover. No arc enemy _travels_
between tiers, so the player never has to track a threat across heights.

Brief: one arc-wide bonkable sweeper. It hover-patrols the high tier,
telegraphs, swoops diagonally down onto the low tier, and climbs back. Side
view, facing right, 48x48 canvas, shown at 1x. Bonk role: gold spring-cap
read on top (the `paintBonkPad` look), floating `bonkMarker` at runtime.
Whole-sprite motion is tweens (patrol, swoop, recover); no pose frames.

## Candidates (three divergent silhouettes)

- `enemy-shrike-a`: diving falcon-drone. Swept wings, hooked beak pointing
  down-forward, tail fins. The dive verb is in the pose.
- `enemy-shrike-b`: rotor orb. Slate sphere, side propeller pods, bottom
  spike. Hovers; the spike threatens downward.
- `enemy-shrike-c`: manta ray. Full-width flat wing, curled stinger tail,
  single eye over a head hump. Glides; the tail threatens below.

## Kill notes

- Kill B: the orb body repeats the sentry orb's read at gameplay size, and
  static side propellers say "drone variant", not a new species.
- Kill C: the full-width flat wing reads as a platform edge, and the curled
  tail muddies where the lethal body sits.
- Survivor A: nothing else in the roster flies on wings, the swept-wing +
  down-hooked beak silhouette shows the swoop verb in one still, and the
  compact body keeps a clean hitbox.

Behavior spec (for the integrator): hover-patrol x from the hover center
out to homeX + sweep.range and back; every hoverMs, blink the red tell
(telegraphMs), swoop to (homeX + swoopDX, homeY + swoopDY) over swoopMs,
climb back to the hover center over recoverMs, resume the patrol. Bonkable
throughout; side contact lethal. Scene-clock timers only.
