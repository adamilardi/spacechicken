# Mid-arc pro review: levels 4-8

Reviewer lens: an epic-platformer veteran grading teach-then-test, sightlines,
escalation, checkpoint honesty, and finale pressure — the Mario/Contra/Celeste
basics. Every actor must threaten or serve the route, every finale must press,
and a death must never waste minutes of proven play. Verdicts below; fixes
landed in the same pass. Level 8 was reviewed clean and left untouched.

Physics baseline: jump -330, double jump always on, bonk -520 that keeps one
air jump (`boostFromBonk` sets `jumpCount = 1`). Single-jump rise runs
~160px at gravity 330 to ~297px at gravity 180. Claims below were checked
against these numbers, not by feel.

## L4 Moonfall Citadel — verdict: staircase with no storm shape

- The seven cliffs march up a straight diagonal with an identical lift in
  every gap. Moon gravity (180) plus double jump clears any ~190px gap
  without touching a lift, so the lifts are decoration and the level's
  promise — chaining jumps through the ray storm — has no teeth.
- Drone 1 (1080->1280, y420, bob 18) sweeps through lift M3's top exit
  (1140-1260, top edge 403): its hit circle clips a rider's head and its
  48px sprite ghosts through the lift. Riding the lift into a drone is a
  blind collision.
- All three rover patrols run into their deck rock: ends at 656/1501/2286
  against rock left edges at 642/1456/2238. The rovers nose through stone
  every pass.
- The three rocks float 1-4px over their decks. The finale laser (2370,285,
  horizontal) times the M6 ride but any direct deck6->deck7 jump arcs over
  it, so the gate is decorative on the main route. Floaty double jump makes
  every positional gate bypassable; only full-column rays gate flight.
- The six rays are metronomic: intervals wander 3600/3900/3500/3300/3100/2900
  with no readable ramp, and the last 500px holds one slow ray.
- FIX: drone 1 to 900->1060 (clears M3 by 56px+, now guards the deck2->deck3
  gap air); rover ends to 615/1425/2210 (6-10px clear of the rocks); rocks to
  y599/457/320 (resting on decks); drone 2 verified 17px clear of the M5
  rider and left alone; ray intervals ramp 3600/3400/3200/3000/2800/2500 with warnings
  1100->850; +1 finale ray (2310, interval 2500, delay 1350) anti-phased
  with ray 6 (delay 100) so the last crossing threads two live columns.
- Left alone: the horizontal finale laser stays as the M6 ride garnish; the
  cosmic-ray beam only spans the top half of the world (centered on `y`),
  which is exactly the jump-arc band here, so no spawner change.

## L5 Specimen Wing — verdict: great teacher, dead back third

- The opener is the best in the arc: bonk tech 1 under the catwalk, 59px of
  clearance over deck 2 with an air jump spare, and a safe fall back to the
  460px deck 1 on a miss. First-bonk stakes stay (side touch fails, as the
  sign says), but the target is fair.
- Nothing threatens the last 1000px: after tech 2 (1620) the run is deck 6,
  the M1 ride, deck 7, and the crown, with only the specimen bobbing below
  the path as a gap net. The finale sleeps.
- FIX: specimen to (2420,235), inside the deck7->deck8 arc as the finale
  gate — hop over it or bonk it onto the crown pad (overshoot is recoverable
  with the reserved air jump); +1 drip over deck 6 (1900, interval 1500)
  reusing taught vocabulary; tech 1 patrol narrowed to 330->430 and slowed
  to 2200ms so the first spring is near-unavoidable.
- Left alone: the sentry stays as the deck2->deck3 gap net (it reinforces
  "gold heads are springs"); the deck-3 laser stays hoppable-or-timable;
  deck 7 stays empty as the breath before the finale.

## L6 Red Reach — verdict: buried crown, cluttered deck 3, sleepy finale

- The crown (3000,200) floats 4px over its pad — half-buried, against 34-58px
  everywhere else.
- The dust devil (1560->1640, half-width 9) and beetle 2 (1660->1760,
  half-width 22) overlap at 1638-1649: the devil sweeps through the beetle's
  left end every pass.
- The deck-5 laser floats 14px over its deck (spans 270-350, deck top 364).
- The four climbs past the canyon are the same +80-90 step four times, deck 6
  is empty, and the hopper bobs below the last gap as a third copy of the
  gap-net idea. The finale is a staircase, not a beat.
- FIX: crown to (3000,168) (36px lift); devil to 1540->1610 and beetle 2 to
  1680->1780 (39px clear, choice landing preserved: devil timing left,
  beetle right); laser y310->324 (flush with the deck); hopper to (2870,248)
  in the deck6->deck7 arc as the finale gate (hop over, or bonk with drift
  control and the reserved air jump); canyon beetle slowed to 2100ms so the
  required stomp reads before it punishes.
- Left alone: the canyon still demands the beetle bonk (827px beats double
  jump's reach; a miss is recoverable back to deck 1); deck 6 stays empty as
  the breath before the gate; climb heights stay — the hazards now punctuate
  them (spike, choice landing, roller, laser, hopper).

## L7 Earthwatch — verdict: first combat, no safety net, flat for 3900px

- This is the combat tutorial over the longest pre-contra level, and the
  colony-drop build log already records it as the pain point (bot: 6 deaths,
  no win). Every death restarts at x150 and revives all released waves, so a
  late death wastes ~2 minutes of proven shooting. Checkpoints are the fix.
- Wave clusters sit ~440px apart against 280px aggro, so any checkpoint
  between clusters is inside somebody's aggro — accepted, same as the contra
  arc: the 700ms boarder grace plus the 820px phaser range covers the
  re-engage.
- The deck is one flat line for 3900px. Flat is right for the lesson
  (waves 1-2), but nothing ever tests it.
- FIX: checkpoints (2150,570) and (3120,570): the first sits 50px before the
  wave-3 release line so a respawn never eats a fresh drop, the second splits
  waves 3/4 evenly; split deck 3 into 2035-2540 and 2660-3084 (120px hop gap
  in the wave-3 zone, both w3 homes still on deck) so the back half tests
  shooting while hopping. Boarders cross 120px inside their 230px hop range.
- Left alone: wave pins [1,1,2,2,3,3,4,4], the shelf approach, and the
  crown-guard boarder — the finale already works.

## L8 Colony Drop — verdict: sound, no changes

- Already survived the contra pro review: pressed finale (wave-4 pair plus
  shield gate), shelves that pay (rescue) and threaten (volt orb), rest pad,
  gaps inside double-jump comfort, escalation from wave 1 to the gate. The
  epic-lens pass finds nothing new.
- Left alone: the wave-2 home over the deck2/deck3 gap stays (blessed
  exemption — the free shield progress was reviewed and accepted); no
  checkpoints (the contra arc starts them at 9; if playtesting says 8 needs
  them, add in the L7 style).

## Cross-level notes

- Fixes reuse taught verbs only: rays ramp on 4, bonks gate the finales of 5
  and 6, the phaser stays the whole of 7. No new textures, no spawner
  changes, no instruction rewrites — nothing taught changed.
- Checkpoint language: levels 1-6 and 8 restart at spawn; 7 checkpoints its
  combat tutorial; 9+ keep their pairs. A death on 7 now costs one wave
  cluster, not the level.
- Rules worth keeping: patrol ends stop 4px+ clear of rock edges; drones
  clear lift exits by sprite, not just hit circle; finale gates on floaty
  physics must be full-column (rays), never positional; every shelf pays or
  threatens (now true of the mid-arc gap nets, which were promoted to
  finale gates on 5 and 6).
- `tests/mid-arc-levels.test.cjs` locks the new geometry: ray ramp, drone
  and rover clearances, rock rests, finale-gate bands, crown lifts, the L7
  checkpoints and hop gap.
