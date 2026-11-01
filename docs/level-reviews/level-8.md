# Level critic — level 8 (Colony Drop)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: checkpoint-desert (no checkpoint between x=3350 and x=6050 — 2700px gap; kind: route); flat-deck (2 deck key(s), dominant share 0.72 across 25 decks) — reclassified under the fixed rules as a visual-variety heuristic (kind: visual-variety); non-blocking, never a quality proof
- Telemetry: {"level":8,"outcome":"gate-open","durationSec":271.2,"deaths":18,"deathSpots":[2961,2983,2965,2855,2975,2897,2953,2465,3701,3350,3227,3350,3409,5358,8929,7457,8887,11737],"maxX":11775,"hazardTypesSeen":["drone","boulder","sentry","shrike","boss","boarder"],"errors":[]}
- Quality gate: ITERATE/REWORK (committed verdict, retained)
- Loop: 1
- Pilot runs: 2; repeated flaws across runs: flat (vote intersection across 2 runs; per-run telemetry not retained)

## Status (separated per 2026-11-01 audit re-derivation)

- Capture validity: partial. Gate-open after 271.2s at maxX 11775 (crown x=11700 passed in x terms), 18 deaths, no page errors, screenshots sent, 6/6 beats retained as manifests. Local findings stand; the crown collection itself is unverified.
- Completion / route coverage: partial. No completed crown route (outcome: gate-open — only crown-collected counts under the fixed rules). The crown grab is unverified in play; branches/tiers visited are unrecorded, so unplayed lines stay unverified.
- Mechanical checks: flags-raised. `checkpoint-desert` is a code-measured route flag (2700px gap, rank 1 by player impact). `flat-deck` (keys `colonyDeck`/`colonyGirder`, dominant share 0.72) is a paint heuristic under the fixed rules — a justified art-direction exception in the build report rebuts it, and it never proves repetitive play.
- Quality: ITERATE. 4/4 `flat` votes (all iterate), repeated across 2 pilot runs and supported by the deck flag — corroborated under the fixed `isCorroboratedFlaw` rule — but the panel judged staged stills, and four personas judging one summary are four model perspectives, not four playtests.
- Fidelity: n/a. Not a news level (`fidelity`/`concept` null).
- Overall: ITERATE/REWORK. This is the committed verdict, not an approval.

## Quality panel

- Marlowe (expert reviewer): fun=1.6 fair=1.1 read=2.3 novel=1.2 pace=1.0 theme=2.2 flaw=flat -> iterate
- Vic (contra veteran): fun=1.9 fair=1.1 read=2.2 novel=1.3 pace=1.1 theme=2.4 flaw=flat -> iterate
- Sam (casual newcomer): fun=1.6 fair=1.1 read=1.9 novel=1.2 pace=0.9 theme=2.3 flaw=flat -> iterate
- Lex (speedrunner): fun=1.7 fair=1.1 read=2.3 novel=1.4 pace=1.1 theme=2.4 flaw=flat -> iterate
- Means: fun=1.70 fair=1.10 read=2.15 novel=1.29 pace=1.03 theme=2.33

## Audit re-derivation: checkpoint replay cost outranks texture count

- Observation: the old rank-1 fix repainted platforms (2 keys, 0.72 share) ahead of a measured 2700px checkpoint gap. Ranked by player impact instead: the gap and its replay cost go first, the corroborated `flat` vote stays as a route diagnosis, and the texture count drops to a non-blocking visual heuristic. Texture count is a visual heuristic, not a hard quality blocker.
- Checkpoint desert (rank 1): the x=3350→6050 gap is 2700px, code-measured from checkpoint data. Replay costs in distance: each of the 7 deaths near x≈2941 replays ~1040px from x=1900; the x=5358 death inside the gap replays ~2000px from x=3350; the late pair at x≈8887–8929 replays ~2270–2310px from x=6620; the x=11737 death replays ~1540px from x=10200. Replay time in seconds is not retained in stored telemetry — INV-1 measures it.
- Death clusters (cited): dominant 7-death cluster at x≈2941 (spots 2855, 2897, 2953, 2961, 2965, 2975, 2983), nearest staged still 04-hazard-bonk.jpg (bonk beat x=2800, 141px away; binary not retained); secondary 4-cluster at x≈3334 (spots 3227, 3350, 3350, 3409); pair at x≈8908 (spots 8887, 8929); singles at 2465, 3701, 5358, 7457, 11737. Per the fixed `attributeFailure` the x≈2941 hotspot is insufficient-evidence (no per-run retention, so a cross-run repeat is unconfirmed) — a suspected hotspot, not a proven design defect. No persona named `blind`/`cheap`, so no fairness finding is attached.
- Route evidence on the `flat` read: the pilot traversed x≤11775, so all 6 judged stills depict played x-range. Data support beyond paint: 17 of 25 decks sit in band 10 (`platformBands` mostly 10 with dips to 8/9) — a flat row as well as flat paint. The cited still (02-hazard-boarder.jpg, the second beat-sheet shot per `shotEvidence`) locates the panel's read, not a causal encounter. No route-connectivity, waiting-time, or repeated-decision telemetry is stored, so the fix targets a route decision on the strength of the repeated vote, not a proven repeated stretch.
- Visual variety (non-blocking): two platform keys (`colonyDeck`/`colonyGirder`, dominant share 0.72) is paint context only. The old rank-1 texture fix is demoted to a heuristic entry: justify the look or repaint, with no quality gate attached.
- Static/runtime note (observation only): static analysis lists hazard types [boarder, drone, roller, bonk, shrike, boss] while runtime `hazardTypesSeen` unions 6 snapshot types [drone, boulder, sentry, shrike, boss, boarder]. The runtime list is a union of 150ms poll snapshots, not contact evidence; reconcile before citing either as encounter proof.
- Evidence provenance: the six retained stills are staged-teleport beat-sheet shots (stored `shots.json` predates capture-kind labels and the fixed generator defaults them to `staged-teleport`), not gameplay frames; the JPG binaries are not retained in the repo (manifests only). No gameplay death frame exists for any of the 18 deaths. Per-run telemetry was not retained (only the final outcome plus the `flat` intersection across 2 runs), so run-to-run distribution cannot be judged. No human confirmations are stored (`human.json` absent).

## Investigation (open)

- INV-1 (dominant death cluster x≈2941 + replay-time measurement): what kills the pilot 7× at x≈2855–2983, and what does each death cost in replay seconds? Stored evidence has no death cause/events, no input history, no hazard-phase data, and no gameplay frames, so a mistimed encounter, an unfair hotspot, and a policy defect are all live.
  - Smallest next capture: bounded rerun with death events (hazard id/cause/phase at the hotspot), input history, checkpoint replay time, and retained gameplay frames of the x≈2855–2983 encounter — including telegraph visibility in the frames before each death and the bonk beat at x=2800. Repeat across fresh starts/phases; only if the cluster repeats in captured play may an encounter edit be proposed.
  - Rerun: `TYPESAFE_API_KEY=$KEY node scripts/level-critic.mjs 8`
  - Dependency: the checkpoint fix is not gated (the measured 2700px gap is sufficient evidence), but its placement should respect the INV-1 hotspot finding. No encounter/fairness edit ships before INV-1 answers.

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [checkpoint-desert] (mechanical, route) owner: skills/level-creator/SKILL.md
   - Evidence: no checkpoint between x=3350 and x=6050 (2700px gap, code-measured); 18 deaths replay from the last-passed checkpoint — 7-cluster at x≈2941 replays ~1040px from x=1900 each, x=5358 replays ~2000px from x=3350, x≈8887–8929 replays ~2270–2310px from x=6620; replay time in seconds not stored (see INV-1)
   - Smallest fix: Add a checkpoint so no gap over 2500px is without one, clear of beam timing and patrol lanes.
   - Recheck: Re-run the full critic: no checkpoint gap over 2500px may remain, and the rerun must retain checkpoint replay time after death in the repaired stretch showing a lower seconds-cost than the retained run.
2. [flat] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "flat" (all iterate; corroborated: 4 votes ≥ 2, repeated across 2 runs, supporting flat-deck flag); panel judged 6 staged stills of played sections (pilot reached maxX 11775); cited still 02-hazard-boarder.jpg (boarder beat x=700) locates the read, not a cause; data support: 17 of 25 decks in band 10; route telemetry (connectivity, waiting time, repeated decisions) not stored
   - Smallest fix: Diagnose repetitive play from route evidence, not paint: add a route decision or set piece to the flagged stretch, and only repaint if the build report cannot justify the two-key look as art direction.
   - Recheck: Re-run the full critic: route evidence (not paint) must show a new decision in the flagged stretch, or the build report must carry the art-direction exception.
3. [death-cluster-x2941] (capture/attribution, see INV-1 — no level edit) owner: scripts/level-critic.mjs
   - Evidence: 7 deaths cluster near x=2941 (spots 2855, 2897, 2953, 2961, 2965, 2975, 2983); nearest staged still 04-hazard-bonk.jpg (x=2800, binary not retained); secondary 4-cluster x≈3334, pair x≈8908, singles at 2465, 3701, 5358, 7457, 11737; no death cause, input history, phase data, replay time, or gameplay frames retained; cross-run repeat unconfirmed (no per-run retention)
   - Smallest fix: Not a level edit. Run the INV-1 capture and attribute the hotspot (mistimed encounter vs unfair hotspot vs policy defect) before any encounter change.
   - Recheck: INV-1 answered with retained death events, input history, replay time, and gameplay frames; attribution recorded.
4. [flat-deck] (mechanical visual-variety heuristic — non-blocking) owner: skills/level-creator/SKILL.md
   - Evidence: 2 deck key(s) (`colonyDeck`/`colonyGirder`), dominant share 0.72 across 25 decks (paint heuristic; never a quality proof)
   - Smallest fix: Visual-variety heuristic, not a quality proof: either justify the two-key look as art direction in the build report, or use at least three platform reads with no key above 80% of decks.
   - Recheck: Re-run the full critic: route evidence (not paint) must show a new decision in the flagged stretch, or the build report must carry the art-direction exception.

Evidence: docs/level-reviews/evidence/level-8/shots.json
