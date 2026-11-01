# Level critic — level 13 (Rust Harbor)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: flat-deck (visual-variety heuristic: 2 deck key(s), dominant share 0.71 across 28 decks); checkpoint-desert (route: no checkpoint between x=3300 and x=6400)
- Telemetry: {"level":13,"outcome":"timeout","durationSec":320.1,"deaths":44,"deathSpots":[4203,4332,4445,3391,4359,4401,4215,3397,4383,3376,4272,4228,4223,4559,4394,4205,4527,4228,4573,3375,3402,3404,4351,3393,4311,4407,4221,4208,4559,4195,4226,4344,4527,4564,3416,4556,3401,3416,3394,3409,4537,3378,4218,4556],"maxX":4612,"hazardTypesSeen":["sentry","drone","dust_devil","crusher","shrike","boss","acid_drip","boarder"],"errors":[]}
- Quality gate: ITERATE/REWORK (committed verdict, retained)
- Loop: 1
- Pilot runs: 2; repeated flaws across runs: cheap (per-run telemetry not retained; only the final outcome plus the repeatedFlaws intersection)

## Status (separated per 2026-11-01 audit re-derivation)

- Capture validity: partial. `Run: full` means the pipeline ran, not that the route was fully traversed. Timeout run, 44 deaths, no page errors, screenshots sent, 6/6 beat manifests retained (JPG binaries not in the repo). No death causes/events, no input trace, no gameplay frames, no per-run retention. Local findings stand; whole-level verdicts do not.
- Completion / route coverage: partial. No completed crown route (outcome: timeout; only `crown-collected` completes). maxX 4612 vs crownX 12450: the pilot never clears the hotspot band, and the segment x=4612-12450 is unverified. The boss still (x=12440) and finale still (x=12250) sit beyond maxX: staged, not gameplay frames.
- Mechanical checks: flags raised. `checkpoint-desert` is code-measured route evidence (3100px gap, all 44 deaths inside it). `flat-deck` is a visual-variety heuristic (never blocks quality).
- Quality: ITERATE/REWORK. 3/4 `cheap` votes (repeated across 2 runs as a label; model opinion — four personas judging one summary are four model perspectives, not four playtests), corroborated by the dominant 19-death cluster at x=4269 under the fixed `dominantDeathCluster` rule; causal attribution is unavailable, so unfairness is suspected, not proven (INV-1). 1/4 `flat` vote corroborated by the `flat-deck` flag only (not repeated). The old first-deaths citation is struck as non-causal (below).
- Fidelity: n/a. Not a news level (`fidelity`/`concept` null).
- Overall: ITERATE/REWORK. This is the committed verdict, not an approval.

## Quality panel

- Marlowe (expert reviewer): fun=0.7 fair=0.7 read=2.1 novel=0.9 pace=0.3 theme=1.8 flaw=flat -> iterate
- Vic (contra veteran): fun=0.8 fair=0.7 read=1.9 novel=1.0 pace=0.5 theme=2.0 flaw=cheap -> iterate
- Sam (casual newcomer): fun=0.5 fair=0.6 read=1.8 novel=0.9 pace=0.4 theme=2.0 flaw=cheap -> iterate
- Lex (speedrunner): fun=0.7 fair=0.7 read=2.1 novel=1.0 pace=0.4 theme=2.1 flaw=cheap -> iterate
- Means: fun=0.68 fair=0.69 read=1.99 novel=0.94 pace=0.42 theme=1.98

## Audit re-derivation: death clusters (fixed chaining, r=200)

- Clusters from the 44 stored death spots: dominant n=19 near x=4269 (spots x=4195, 4203, 4205, 4208, 4215, 4218, 4221, 4223, 4226, 4228, 4228, 4272, 4311, 4332, 4344, 4351, 4359, 4383, 4394); n=13 at x=3375-3416; n=12 at x=4401-4573. Maximum progress x=4612 sits just past the last cluster: the pilot dies inside the x=3375-4573 band on all 44 deaths and never reaches mid-route.
- Hazard-attribution record from stored evidence: hazard ID unavailable; cause unavailable; phase unavailable; player input unavailable; camera visibility unavailable. The runtime `hazardTypesSeen` union (sentry, drone, dust_devil, crusher, shrike, boss, acid_drip, boarder) is a snapshot summary, not contact evidence, and its names do not map 1:1 to the static kit (boarder, drip, bonk, drone, dustDevil, crusher, shrike, boss) — e.g. runtime `sentry` has no static counterpart — so no death can be assigned to a hazard ID.
- Struck citation: the stored fix cited the first four death spots (x=4203, 4332, 4445, 3391) spanning all three clusters with no shot at all — replaced by the dominant-cluster citation above. No retained still is within 700px of any cluster (gameplay stills end at x=1900; boss/finale staged at x=12440/x=12250). All 6 retained stills are staged-teleport beat shots (stored `shots.json` predates capture-kind labels), not gameplay frames.
- Attribution under the fixed `attributeFailure` rule reads `suspected-design-problem` (cluster + repeated label), but the "repeats across runs" half rests on the `repeatedFlaws` label intersection only — per-run death spots were not retained, so hotspot repeat is unverified. Repeated bot mistakes alone do not prove unfairness: INV-1 must confirm the hotspots across fresh starts/phases before the tell-window edit.

## Investigation (open)

- INV-1 (death hotspots x=4269, x=3375-3416, x=4401-4573): what kills the pilot at the dominant 19-death cluster (spots x=4195-4394, center x=4269) and the flanking clusters (13 deaths at x=3375-3416, 12 at x=4401-4573)? Stored evidence has no death causes/events, no input trace, and no gameplay frames (no retained still within 700px of any cluster; JPGs not retained), and per-run retention is absent — so a bot-policy defect cannot be distinguished from a reproducible design problem.
  - Smallest next capture: bounded rerun with death events and gameplay death frames retained; record hazard id/cause/phase, input history, and camera visibility at all three hotspots and whether they repeat across fresh starts/phases. Only propose the tell-window edit if a hotspot repeats.
  - Rerun: `TYPESAFE_API_KEY=$KEY node scripts/level-critic.mjs 13`

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [cheap] (quality, corroborated — dominant cluster; causal attribution open in INV-1) owner: skills/level-creator/SKILL.md
   - Evidence: 3/4 personas named "cheap" (repeated across 2 runs as a label); 19 deaths cluster near x=4269 (spots x=4195, 4203, 4205, 4208, 4215, 4218, 4221, 4223, 4226, 4228, 4228, 4272, 4311, 4332, 4344, 4351, 4359, 4383, 4394; fixed chaining r=200); flanking clusters 13 deaths at x=3375-3416 and 12 at x=4401-4573; maxX 4612 never clears the band. No retained still within 700px of any cluster; stored first-deaths citation struck as non-causal.
   - Smallest fix: At the x=4269 hotspot: widen the tell window or move the hazard so the death traces to a missed tell — after INV-1 confirms the hotspot repeats across fresh starts/phases with a recorded hazard cause.
   - Recheck: Re-run the full critic twice from fresh starts: deaths near x=4269 must not recur as a cluster and maxX must pass x=4269 on both runs; the rerun must retain death events with hazard id/cause/phase.
2. [flat] (quality, corroborated by the flat-deck flag only — not repeated) owner: skills/level-creator/SKILL.md
   - Evidence: 1/4 personas named "flat" (not in repeatedFlaws); flat-deck: 2 deck keys, dominant share 0.71 across 28 decks. Stored mid-shot citation (02-hazard-boarder.jpg, boarder at x=550) struck as non-causal; the deck-key measurement is the corroboration.
   - Smallest fix: Diagnose repetitive play from route evidence (connectivity, height changes, encounter choices, waiting time, repeated decisions), not paint: add a route decision or set piece to the flagged stretch, and only repaint if the build report cannot justify the look as art direction.
   - Recheck: Re-run the full critic: route evidence (not paint) must show a new decision in the flagged stretch, or the build report must carry the art-direction exception.
3. [checkpoint-desert] (mechanical, route) owner: skills/level-creator/SKILL.md
   - Evidence: no checkpoint between x=3300 and x=6400 (3100px gap); all 44 deaths fall inside the gap (spots x=3375-4573); checkpoint replay time unmeasured in stored evidence
   - Smallest fix: Add a checkpoint so no gap over 2500px is without one, clear of beam timing and patrol lanes.
   - Recheck: Re-run the full critic: no checkpoint gap over 2500px, and the rerun measures replay time after death at the x=4269 hotspot.
4. [flat-deck] (mechanical, visual-variety heuristic — never blocks quality) owner: skills/level-creator/SKILL.md
   - Evidence: 2 deck key(s), dominant share 0.71 across 28 decks (visual-variety heuristic)
   - Smallest fix: Visual-variety heuristic, not a quality proof: either justify the two-key look as art direction in the build report, or use at least three platform reads with no key above 80% of decks.
   - Recheck: Re-run the full critic: route evidence (not paint) must show distinct decisions, or the build report must carry the art-direction exception.

Evidence: docs/level-reviews/evidence/level-13/shots.json
