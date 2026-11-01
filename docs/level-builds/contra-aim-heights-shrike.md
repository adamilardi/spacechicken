# Contra aim + heights + shrike pass — 2026-10-31

Request: update the contra-style levels with the new shooting mechanic, new
enemies, and heights. Data-only retune across levels 8–16 plus one new
arc-wide enemy, following the `contra-fun.md` precedent (no art, engine,
weapon, numbering, or finale changes). No deployment.

## What the "new shooting mechanic" is

The working tree already carries the Contra-style 8-way aim: `aimVector`
(`GameUtils.js`) resolves forward / up / diagonal-up while moving /
down-aimed fire while airborne (grounded down-aim still fires forward — no
crouch), fans spread perpendicular to the aim, bolts expire by distance in
any direction, and Up/W aim instead of jumping while fire is held
(`CombatSystem.syncChickenAim`, `InputController.syncAimHeld`,
`tests/aim.test.cjs`). The levels were authored for horizontal-only fire,
so this pass teaches the aim and gives it targets at every height.

## The new enemy: Shrike

A bonkable cross-tier swooper, one species for the whole arc, painted in
the shipped canvas style (48×48 falcon-drone, swept wings, down-hooked
amber beak, gold spring-cap + floating `bonkMarker`).

- Art: `art-candidates/contra-shrike/` — `brief.md`, three divergent
  paints (B rotor-orb and C manta killed with reasons, A survives),
  `preview.html` (1×/3× on black/white, corner alphas 0,0,0,0 verified in
  headless Chromium), `animation-handoff.md` (tween method), `manifest.json`.
- Integration: `paintShrike` in `sprites/enemies.js` + `ENEMY_SPRITES`
  registration; `enemies/shrike.js` spawn (bonkable, 34×30 body,
  scene-clock timers via `dynamicHazardEvents`, `tagTestEntity`);
  registered in `enemies/index.js` and `config/runtime-assets.cjs`;
  hard-mode case in `applyHardModeConfig` (hover/telegraph/sweep scale).
- Behavior, distinct from the Bear Raider's stationary vertical dive: the
  shrike hover-patrols (x home → home+range and back), blinks the red tell,
  swoops diagonally to (home+swoopDX, home+swoopDY), climbs back, and
  resumes the patrol. No telegraph audio (no generic tell sound exists;
  the blink is the tell).

## Per-level changes (geometry untouched)

No deck, wave-trigger, boss, finale, width, or checkpoint moved: the
reachability graph is identical, so there is no new Height & Path Map —
only tier _content_ changed. Every moved boarder keeps its wave and its
array position, so all wave-pin snapshots pass unmodified.

| Lv  | High-tier boarders (moved, same wave)                                                              | Cross-tier drones                       | Shrikes                                              |
| --- | -------------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------- |
| 8   | 6: w1 1300, w2 1600, w3 3100, w5 4600, w6 5950, w7 9360 (girders; also fixes L8's two gap-hangers) | 5 (all ground-lane drones gain a y leg) | 2: bridge gap (3400,380), rest approach (9900,420)   |
| 9   | 3: w2 2350, w5 5950, w6 9200 (fangs; w6 guards the fang rescue)                                    | 2                                       | 2: low tunnel (1950,545), shaft (9900,330)           |
| 10  | 3: w2 1900, w5 6400, w6 10050 (glass; both guard rescues)                                          | 3                                       | 2: glass stair (2100,290), sky bridge (7600,180)     |
| 11  | 4: w1 1300, w4 4650, w5 6100, w6 10000 (grates; two guard rescues)                                 | 4                                       | 2: gate approach (2400,360), crusher gate (8900,330) |
| 12  | 4: w2 1300, w3 2600, w5 6480, w6 10330 (bones)                                                     | 5                                       | 2: marrow bridge (4400,320), high bones (8150,140)   |
| 13  | 4: w1 1150, w2 2450, w6 7100, w7 11080 (planks; three guard rescues)                               | 3                                       | 2: yard stair (3350,320), plank bridge (9500,300)    |
| 14  | 4: w1 1150, w2 2450, w6 7000, w7 10930 (chains; two guard rescues)                                 | 5                                       | 2: vent tower (3550,250), tram gap (7300,350)        |
| 15  | 4: w1 1150, w2 2450, w6 5650, w7 10980 (panels; two guard rescues)                                 | 5                                       | 2: halo pod (3900,240), anchor approach (9600,300)   |
| 16  | 4: w1 1000, w2 2150, w5 3900, w6 8290 (grates; one guards a rescue)                                | 4                                       | 2: vault stair (1900,420), seal run (7700,340)       |

Totals: 36 boarders stationed on upper tiers, 36 drone patrols extended
across tiers (x+y legs, all clearing decks by 8px+ by construction), 18
shrikes. Every level keeps ≥2.2 dynamics/1000px with ≥5 hazard types (L8:
31 dynamics = 2.58, 6 types). All instructions + touch instructions teach
the aim for their level (L8 carries the full teach: Up/W aim up while
firing, Down/S fires down from the air, Space/K always jump, stick-Y/▲▼).

Placement rules honored per move: wave-1 feet above the deck top (new
test, see below), drop-in homes at/above the tier deck top, 300px wave
approach on x, 150px checkpoint clearance, checkpoint/drone-lane rule,
swoop endpoints clear of decks, swoop lanes off checkpoints.

## Bug found and fixed in play

Wave-1 boarders spawn standing at their home; my first high homes sat
10px above the deck top, embedding the 36px body 8px into the deck — the
boarder fell straight through to the ground (traced live:
1300,430 → 556). Fix: all six wave-1 high homes raised so the feet start
10px above the deck top (e.g. L8 1300,412 → settles to 422 on the girder
and patrols in-span). Pinned by the new test
`wave-1 boarders spawn with feet above their deck`. Later waves were never
affected (they drop in from above); a wave-2 high landing was traced live
to confirm (1600,308 → girder 422, then paces the tier tracking the
player below — the designed cross-height fight).

## Verification

- `npm run check`: 450/450 tests pass (was 449; +1 shrike/tier guard,
  +1 wave-1 feet guard, +1 shrike body test, +art-clarity shrike case),
  eslint zero warnings, prettier clean.
- Browser (local server, headless Chromium): all 9 levels load with zero
  page errors; 37 teleports (opener + every shrike + high guards) with
  screenshots in `/tmp/contra-aim/`; shrike full-beat position trace
  (sweep → telegraph hold → swoop 3505,495 → recover → patrol); pause
  freezes / resume restarts the shrike; death retry restores a clean
  scene with both shrikes; **real-input aim-up kill** of the L8 girder
  guard (Up+J, deaths 0, guard confirmed defeated); **real-contact shrike
  bonk** (drop from 40px above, bounced 340 → 75, deaths 0); vertical
  bolt volley photographed.
- Note: headless wall-clock runs the game at ~1/3 speed, so play waits
  were scaled; mechanics, not timing, were asserted.

## Not verified

- Full start-to-crown clears of each retuned level (same bar as the
  contra-fun pass: teleports + partial real play, not full clears).
- Whether the new pairs/pressure feel pressing vs. grinding needs human
  play; density is reported, enjoyment is not claimed.
- The level critic was not run (retune, not a new level — same precedent
  as contra-fun). Concept actors: none; every new placement spawns.
- Play URLs: `http://127.0.0.1:3000/?level=8` through `?level=16`
  (after `npm start`).
