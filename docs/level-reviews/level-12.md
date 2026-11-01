# Level critic — level 12 (Crimson Womb)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: flat-deck (visual-variety heuristic: 2 deck key(s), dominant share 0.75 across 28 decks); checkpoint-desert (route: no checkpoint between x=2950 and x=6600)
- Telemetry: {"level":12,"outcome":"timeout","durationSec":310,"deaths":17,"deathSpots":[1699,2929,3181,2975,2989,2950,3163,5949,5961,4891,3195,5495,4889,5966,6013,6016,5958],"maxX":6042,"hazardTypesSeen":["dust_devil","drone","laser","sentry","shrike","boss","acid_drip","boarder"],"errors":[]}
- Quality gate: ITERATE/REWORK (committed verdict, retained)
- Loop: 1
- Pilot runs: 2; repeated flaws across runs: flat, cheap (per-run telemetry not retained; only the final outcome plus the repeatedFlaws intersection)

## Status (separated per 2026-11-01 audit re-derivation)

- Capture validity: partial. `Run: full` means the pipeline ran, not that the route was fully traversed. Timeout run, 17 deaths, no page errors, screenshots sent, 6/6 beat manifests retained (JPG binaries not in the repo). No death causes/events, no input trace, no gameplay frames, no per-run retention. Local findings stand; whole-level verdicts do not.
- Completion / route coverage: partial. No completed crown route (outcome: timeout; only `crown-collected` completes). maxX 6042 vs crownX 12050: the segment x=6042-12050 is unverified. The boss still (x=12040) and finale still (x=11850) sit beyond maxX: staged, not gameplay frames.
- Mechanical checks: flags raised. `checkpoint-desert` is code-measured route evidence (3650px gap, 15 of 17 deaths in its span). `flat-deck` is a visual-variety heuristic (never blocks quality).
- Quality: ITERATE/REWORK. 3/4 `cheap` votes (repeated across 2 runs as a label; model opinion — four personas judging one summary are four model perspectives, not four playtests), corroborated by the dominant 6-death cluster at x=5977 under the fixed `dominantDeathCluster` rule; causal attribution is unavailable, so unfairness is suspected, not proven (INV-1). 1/4 `flat` vote corroborated by repeat plus the `flat-deck` flag. The old drone-shot citation is struck as non-causal (below).
- Fidelity: n/a. Not a news level (`fidelity`/`concept` null).
- Overall: ITERATE/REWORK. This is the committed verdict, not an approval.

## Quality panel

- Marlowe (expert reviewer): fun=0.9 fair=0.7 read=1.9 novel=1.1 pace=0.4 theme=2.2 flaw=flat -> iterate
- Vic (contra veteran): fun=1.2 fair=0.8 read=1.8 novel=1.2 pace=0.5 theme=2.2 flaw=cheap -> iterate
- Sam (casual newcomer): fun=0.6 fair=0.7 read=1.6 novel=1.2 pace=0.3 theme=2.0 flaw=cheap -> iterate
- Lex (speedrunner): fun=1.0 fair=0.8 read=1.9 novel=1.2 pace=0.5 theme=2.3 flaw=cheap -> iterate
- Means: fun=0.91 fair=0.74 read=1.82 novel=1.20 pace=0.41 theme=2.16

## Audit re-derivation: death clusters (fixed chaining, r=200)

- Clusters from the 17 stored death spots: dominant n=6 near x=5977 (spots x=5949, 5958, 5961, 5966, 6013, 6016); secondary band n=4 at x=2929-2989 plus n=3 at x=3163-3195 (7 deaths in x=2929-3195); pair n=2 at x=4889-4891; singles x=1699, x=5495.
- Hazard-attribution record from stored evidence: hazard ID unavailable; cause unavailable; phase unavailable; player input unavailable; camera visibility unavailable. The runtime `hazardTypesSeen` union (dust_devil, drone, laser, sentry, shrike, boss, acid_drip, boarder) is a snapshot summary, not contact evidence, and its names do not map 1:1 to the static kit (boarder, drip, dustDevil, drone, laser, bonk, shrike, boss) — e.g. runtime `sentry` has no static counterpart — so no death can be assigned to a hazard ID.
- Struck citation: the stored `03-hazard-drone.jpg` (drone at x=1250) sits 449px from the lone x=1699 death but 4727px from the dominant x=5977 center and 1679px+ from every x=2929-3195 death — a first-shot-near-any-death stock attachment, replaced by the dominant-cluster citation above. No retained still is within 700px of x=5977. All 6 retained stills are staged-teleport beat shots (stored `shots.json` predates capture-kind labels), not gameplay frames.
- Attribution under the fixed `attributeFailure` rule reads `suspected-design-problem` (cluster + repeated label), but the "repeats across runs" half rests on the `repeatedFlaws` label intersection only — per-run death spots were not retained, so hotspot repeat is unverified. Repeated bot mistakes alone do not prove unfairness: INV-1 must confirm the hotspot across fresh starts/phases before the tell-window edit.

## Investigation (open)

- INV-1 (death hotspots x=5977 and x=2929-3195): what kills the pilot at the dominant 6-death cluster (spots x=5949, 5958, 5961, 5966, 6013, 6016) and the secondary 7-death band (x=2929-3195)? Stored evidence has no death causes/events, no input trace, and no gameplay frames (no retained still within 700px of x=5977; JPGs not retained), and per-run retention is absent — so a bot-policy defect cannot be distinguished from a reproducible design problem.
  - Smallest next capture: bounded rerun with death events and gameplay death frames retained; record hazard id/cause/phase, input history, and camera visibility at x=5977 (plus the x=2929-3195 band) and whether the hotspots repeat across fresh starts/phases. Only propose the tell-window edit if a hotspot repeats.
  - Rerun: `TYPESAFE_API_KEY=$KEY node scripts/level-critic.mjs 12`

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [cheap] (quality, corroborated — dominant cluster; causal attribution open in INV-1) owner: skills/level-creator/SKILL.md
   - Evidence: 3/4 personas named "cheap" (repeated across 2 runs as a label); 6 deaths cluster near x=5977 (spots x=5949, 5958, 5961, 5966, 6013, 6016; fixed chaining r=200); secondary band 7 deaths at x=2929-3195, pair at x=4889-4891, singles x=1699, x=5495. No retained still within 700px of x=5977; stored 03-hazard-drone.jpg citation (x=1250, 4727px from the hotspot) struck as non-causal.
   - Smallest fix: At the x=5977 hotspot: widen the tell window or move the hazard so the death traces to a missed tell — after INV-1 confirms the hotspot repeats across fresh starts/phases with a recorded hazard cause. Do not edit for the lone x=1699 death.
   - Recheck: Re-run the full critic twice from fresh starts: deaths near x=5977 must not recur as a cluster and maxX must pass x=5977 on both runs; the rerun must retain death events with hazard id/cause/phase.
2. [flat] (quality, corroborated by repeat + flat-deck flag) owner: skills/level-creator/SKILL.md
   - Evidence: 1/4 personas named "flat" (repeated across 2 runs as a label); flat-deck: 2 deck keys, dominant share 0.75 across 28 decks. Stored mid-shot citation (02-hazard-boarder.jpg, boarder at x=550) struck as non-causal; the deck-key measurement is the corroboration.
   - Smallest fix: Diagnose repetitive play from route evidence (connectivity, height changes, encounter choices, waiting time, repeated decisions), not paint: add a route decision or set piece to the flagged stretch, and only repaint if the build report cannot justify the look as art direction.
   - Recheck: Re-run the full critic: route evidence (not paint) must show a new decision in the flagged stretch, or the build report must carry the art-direction exception.
3. [checkpoint-desert] (mechanical, route) owner: skills/level-creator/SKILL.md
   - Evidence: no checkpoint between x=2950 and x=6600 (3650px gap); 15 of 17 deaths at x>=2950 fall in the desert span (14 strictly inside, one at the x=2950 checkpoint); checkpoint replay time unmeasured in stored evidence
   - Smallest fix: Add a checkpoint so no gap over 2500px is without one, clear of beam timing and patrol lanes.
   - Recheck: Re-run the full critic: no checkpoint gap over 2500px, and the rerun measures replay time after death at the x=5977 hotspot.
4. [flat-deck] (mechanical, visual-variety heuristic — never blocks quality) owner: skills/level-creator/SKILL.md
   - Evidence: 2 deck key(s), dominant share 0.75 across 28 decks (visual-variety heuristic)
   - Smallest fix: Visual-variety heuristic, not a quality proof: either justify the two-key look as art direction in the build report, or use at least three platform reads with no key above 80% of decks.
   - Recheck: Re-run the full critic: route evidence (not paint) must show distinct decisions, or the build report must carry the art-direction exception.

Evidence: docs/level-reviews/evidence/level-12/shots.json
