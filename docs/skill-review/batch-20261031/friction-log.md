# Friction log — news-to-level batch 2026-10-31

Feedstock for skill improvement. Each item: what happened, skill text involved,
impact, and a concrete suggestion. Ordered by improvement value, not chronology.

## F1. Brief rows over-claim mechanics that get cut at build time

What: All 3 briefs promised mechanics cut during build (19: drip particles;
20: bonk calibration + CROWN_SHIELD adjudicator; 21: bonk signal bounce). The
fidelity panel correctly flagged resulting rows unsupported (20: 2 rows; the
agent refused to human-confirm mixed rows). The concept gate cannot catch this
(it runs pre-build); nothing re-validates brief↔level correspondence at build.

Skill: news-to-level step 2 (directing) vs step 4 (build); game-critic
fidelity "code checks first" marks scenery-only rows but not cut mechanics.

Impact: 2 of 3 levels carry permanently-unsupportable rows → fidelity FAILs
that no iterate loop can fix without re-briefing.

Suggestion: add a build-time "brief reconciliation" step: after authoring the
level, diff the fact→mechanic table against level data (hazard types present?)
and either restore the mechanic or amend the brief row + re-run concept. Or:
concept artefacts should only promise hazard types from the proven
laser/drone/roller/bonk/rescue/lift set with a named fallback.

## F2. Inventory elements without a prop pipeline become missing-elements FAILs

What: 7-line inventories yielded 2-3 missing/faint elements per level (RFI
envelopes, countdown numerals, certificate gate, H3 rocket, dishes, capture
net). The skill demands ≥3 shown (met: exactly 3 each) but Marlowe still names
missing-elements flaw for the absent ones, and signature-adjacent items (stage
grid, crater field) judge faint. There is no prop-art pipeline: bg plates get
cropped by tile framing (dishes ARE in the Phobos plate, judged missing 0.08),
and adding a prop texture requires SpriteFactory registration the skill never
describes for generated images.

Skill: news-to-level steps 2-3 (inventory ≥3, "at least three as art/props/
hazards") + fidelity gate (shown≥3 AND flaw none AND needs-human empty).

Impact: fidelity FAIL is near-structural for batch-built levels; the "≥3"
promise and the "flaw none" requirement contradict when inventories list 6-7.

Suggestion: (a) cap inventories at 4-5 with a "every item gets an owner
(bg-plate region with beat coverage / prop texture / hazard / instructions)"
rule; (b) document a generated-prop path (register + place + beat coverage);
(c) reconcile the gate: missing non-signature elements beyond the 3rd shown
should downgrade to a warning unless Marlowe's flaw is otherwise clean.

## F3. sleeping-finale despite in-data finale pressure (panel perception gap)

What: All 3 levels place laser + roller within 250-650px of the crown (inside
the 900px contract), yet sleeping-finale was named in 9/12 persona votes. The
finale stills show the laser thin/off-phase and the roller distant; the pilot
crowns with ~0 deaths, reinforcing "no pressure."

Skill: game-critic sleeping-finale mechanical check (absent here — no flag)
vs persona perception; fix contract "add pressure within 900px" (already true).

Impact: quality ITERATE that the contracted fix cannot address; agent cannot
distinguish "add more" from "panel can't see it."

Suggestion: make the finale beat a 2-shot (approach + crown-tight) and have
the panel judge pressure from telemetry (hazard proximity events in last 900px)
as well as pixels. Or define sleeping-finale mechanically (no hazard whose
span intersects [crownX-900, crownX]) and let personas rebut only with
timestamps.

## F4. Novelty floor <1.8 fails all batch levels (calibration)

What: novelty means 1.10-1.24 across all loops/levels (structure: 6000px
traverse, 13-14 decks, laser/drone/roller). Mechanical clone-suspect never
fired. Ticker-plunge note records the same conclusion for shipped level 1
(novelty ~0.9): "the panel gate looks systematically unpassable."

Skill: NEWS_FLOORS novelty 1.8 anchored to level 18.

Impact: every news level needs a documented exception or endless loops; the
batch stopped at loop 2-3 with the same finding for the 4th-6th time.

Suggestion: recalibrate the novelty floor against recent news passes, or split
it (topology-novelty vs skin-novelty) so a new fingerprint + new actor can
pass even when the traverse skeleton rhymes. At minimum, record the
mechanical-clone-pass + panel-novelty-fail combination as a known divergence
with a stop rule (2 loops) instead of an open iterate.

## F5. Art critic has no runnable entry point

What: news-to-level step 3 requires "run the Art critic … record its verdict,"
but game-critic defines only concept/play runs with script commands; no
`critic:art` script exists. The agent ran a manual checklist and recorded PASS.

Impact: unscripted gate → inconsistent rigor across runs; cannot cite evidence.

Suggestion: add `npm run critic:art -- <selection>` (gameplay-size renders +
catalog distance vs shipped devices + palette check), or downgrade the step to
"manual art checklist" with the exact checklist in the skill.

## F6. Drone scale couples visibility to lethality (no guidance)

What: loop-2 bumped dancerBot 0.05→0.08 for signature visibility (faint 0.45 →
shown 0.74) and the pilot went 0→17 deaths (hitbox radius 24→38px blocked the
jump line). Required a loop-3 reposition. The skill never relates texture scale
to hitbox math (radius = displayWidth\*0.25).

Impact: 1 wasted loop + regression risk on any visibility fix.

Suggestion: document the scale↔hitbox coupling in enemy-animation-integrator
with a rule (visibility bumps >25% require re-checking jump-line clearance in
data before re-running), or add a test that asserts drone hitboxes clear the
deck-adjacency graph edges.

## F7. needs-human key exactness is brittle

What: human.json keys must exactly match `element:`/`row:` + parsed text
(post-signature-strip). The agent had to cross-check report strings against
brief cells by hand. A trailing-space or strip mismatch silently no-ops (keys
just don't match; no warning).

Impact: low this run (all confirms counted), but a silent failure mode.

Suggestion: script warns on human.json keys matching nothing in the current
brief parse, and prints normalized keys in the report's needs-human list
(copy-pasteable).

## F8. Batch growth trips repo gates (max-lines)

What: LEVEL_IDS 18→21 pushed a test function and create() over the 200-line
warn cap (via prettier reformats), failing `npm run check` with --max-warnings=0.
Fixed with module-scope consts (ALL_LEVEL_IDS, NEWS_PLATES).

Impact: minor; but every future level addition re-risks it.

Suggestion: level-creator skill should note "if the registry growth trips
max-lines, extract module-scope consts" — or the repo should exempt registry
tables. Not news-skill-specific; belongs in level-creator.

## F9. News-level combat assumptions (PHASER/boarder/CROWN_SHIELD)

What: all 3 briefs assumed PHASER-on contra mechanics (20: adjudicator shield
wave). Shipped news precedent (17/18) is PHASER-off, NEXT_LEVEL 1, token
boarder wave. CROWN_SHIELD without a phaser is uncleareable, forcing the cut
that later cost a fidelity row (F1).

Skill: news-to-level step 4 doesn't state the news combat profile; the agent
inferred it from 17/18.

Impact: brief→build mismatch baked in at directing time.

Suggestion: one line in step 4: "news levels are PHASER-off, NEXT_LEVEL 1;
do not brief shield-wave/clear mechanics unless adding PHASER deliberately."

## F10. Minor: misc papercuts

- `scripts/news-used-stories.mjs` matches localhost level URLs as "stories";
  used-list is noisy (18 entries, 2 real). Filter to http(s) non-localhost or
  Story:-line URLs.
- Enemy magenta-keying needed `sharp` discovery (no PIL/convert/ffmpeg); skill
  says "chroma-key it in code" with no command. A one-liner script
  (`scripts/key-enemy.mjs <in> <out>`) would remove 20 minutes.
- Ticker-style bg plates include painted characters/crowns that double with
  live sprites; add "no characters, no crowns" to the plate prompt template
  (2 of 3 plates ignored the no-characters clause).
- Playwright/Chromium discovery and critic pilot budgets all worked first try;
  no friction. Pilot skill variance noted (20: 45.9s/0-death vs 150s/timeout
  across loops — but loop-2 had a real cause; see F6).
