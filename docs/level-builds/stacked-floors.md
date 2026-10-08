# Stacked floors: contra levels 8-12 (October 2026)

Response to playtest feedback that the contra levels were too flat and
simple. Every level from Colony Drop to Crimson Womb now runs on at least
two stacked lines: upper shelves are full run routes with under-passages,
reached by stairs or staggered hops. No new hazards, art, or engine code;
all edits are level data plus the skill rule and test that lock the pattern
in.

## What changed per level

- Colony Drop (8): high road west (x1400, over deck 2, drops to deck 3) and
  high road east (x2950, over deck 4, drops to deck 5). Both clear the drone
  lane and the roller passes underneath.
- Hive Warrens (9): opener terrace (x250, alternate route to the catwalk
  that keeps clear of the bonk-launch line) and a high road over decks 5-6
  (x2450, clears the wave-2 patrol and the sentry orb).
- Spire Crown (10): bridge over the laser hall (x1850, beams pass 11px
  under it, entered from deck 5) and a shelf over the devil plaza (x2400,
  devil patrols underneath).
- Bastion Relay (11): same high-road pair as 8 (x1400, x2950), clearing the
  laser gate, roller, drone, and gatehouse.
- Crimson Womb (12): high road west (x1250, over deck 2 toward deck 3) and
  high road mid (x2550, over deck 4 toward deck 5, devil clears it by 8px).

Design constants (now in the level-creator skill): ≥56px under-clearance,
every climb single-jumpable for the level's gravity, shelves ≥120px above
boarder patrols so ground waves stay down (boarder hop peaks ~112px),
hazard lanes clear overlapping decks by ≥8px. Emergent note: wave reinfor-
cements drop from above and can land on shelves, contesting the high road —
verified live on level 10, and very Contra.

## Skill and test changes

- `skills/level-creator/SKILL.md`: new "Stacked floors (contra levels)"
  section with the clearance/climb/no-jump-through/boarder/hazard-lane rules
  and the reachability-graph contract.
- `tests/contra-levels.test.cjs`: the linear hop check is now a directed
  reachability graph (overlap/touch + single-jumpable rise, or ≤260px side
  gap) walked by BFS from the opener, plus a stacked-line assertion (≥32px
  shared run, 56–200px separation). Failed on all five levels before the
  redesign; green after. Writing it caught a real bug in the first draft of
  the rule (too strict on overlapping climbs, proven by level 8's own crown
  approach).

## Verification and results

- `npm test` 110/110, eslint zero warnings, prettier clean on touched files.
- Teleport probes (debug-only): stood the chicken on the new shelves of
  8/9/10/12, screenshot-verified, zero page errors. Checkpoint + respawn
  flow also observed working mid-probe.
- Bot, level 8, TRIALS=2: 0/2 wins (9 deaths). Bot record on level 8 across
  all versions is now 3/9 with an unchanged main line, so the pilot is a
  coin flip at n=2 and cannot discriminate level versions. The redesign is
  carried by the reachability graph, jump math, and screenshot probes, not
  by the bot. A human playthrough of 8-12 remains the real gate.

## Not verified

- Full human playthrough to any redesigned crown, co-op race on the new
  shelves, touch controls, and seam strips under real parallax scroll.
