# Level critic — level 9 (Hive Warrens)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: checkpoint-desert (no checkpoint between x=2550 and x=6050 — 3500px gap; kind: route); flat-deck (2 deck key(s), dominant share 0.75 across 28 decks) — reclassified under the fixed rules as a visual-variety heuristic (kind: visual-variety); non-blocking, never a quality proof
- Telemetry: {"level":9,"outcome":"timeout","durationSec":280.1,"deaths":10,"deathSpots":[284,1508,1924,1805,3829,4363,4296,5302,3781,9917],"maxX":9925,"hazardTypesSeen":["brute","crusher","sentry","drone","dust_devil","shrike","boss","acid_drip","boarder"],"errors":[]}
- Quality gate: ITERATE/REWORK (committed verdict, retained)
- Loop: 1
- Pilot runs: 2; repeated flaws across runs: flat (vote intersection across 2 runs; per-run telemetry not retained)

## Status (separated per 2026-11-01 audit re-derivation)

- Capture validity: partial. Timeout after 280.1s at x=9925 of crown x=11000 (90% of the route), 10 deaths, no page errors, screenshots sent, 6/6 beats retained as manifests. Local findings stand; whole-level verdicts do not.
- Completion / route coverage: partial. No completed crown route (outcome: timeout). Everything past x=9925 — including the finale (x=10800), the boss beat (x=10990), and the crown approach x=9925–11000 — is unverified in play.
- Mechanical checks: flags-raised. `checkpoint-desert` is a code-measured route flag (3500px gap, rank 1 by player impact). `flat-deck` (keys `hiveChitin`/`hiveFang`, dominant share 0.75) is a paint heuristic under the fixed rules — a justified art-direction exception in the build report rebuts it, and it never proves repetitive play.
- Quality: ITERATE. 4/4 `flat` votes (all iterate), repeated across 2 pilot runs and supported by the deck flag — corroborated under the fixed `isCorroboratedFlaw` rule — but the panel judged staged stills while the pilot traversed only x≤9925, so the boss (x=10990) and finale (x=10800) stills depict unplayed sections. The whole-level read rests on partial play.
- Fidelity: n/a. Not a news level (`fidelity`/`concept` null).
- Overall: ITERATE/REWORK. This is the committed verdict, not an approval.

## Quality panel

- Marlowe (expert reviewer): fun=1.4 fair=1.1 read=2.0 novel=1.1 pace=0.6 theme=2.3 flaw=flat -> iterate
- Vic (contra veteran): fun=1.7 fair=1.1 read=2.1 novel=1.3 pace=0.7 theme=2.4 flaw=flat -> iterate
- Sam (casual newcomer): fun=1.3 fair=1.0 read=1.7 novel=1.2 pace=0.7 theme=2.3 flaw=flat -> iterate
- Lex (speedrunner): fun=1.6 fair=1.0 read=2.1 novel=1.3 pace=0.7 theme=2.5 flaw=flat -> iterate
- Means: fun=1.50 fair=1.07 read=1.98 novel=1.22 pace=0.68 theme=2.35

## Audit re-derivation: checkpoint replay cost outranks texture count

- Observation: the old rank-1 fix repainted platforms (2 keys, 0.75 share) ahead of a measured 3500px checkpoint gap. Ranked by player impact instead: the gap and its replay cost go first, the corroborated `flat` vote stays as a route diagnosis, and the texture count drops to a non-blocking visual heuristic. Texture count is a visual heuristic, not a hard quality blocker.
- Checkpoint desert (rank 1): the x=2550→6050 gap is 3500px, code-measured from checkpoint data. Five of the 10 deaths fall inside it (3781, 3829, 4296, 4363, 5302) and all replay from x=2550 — ~1230–2750px each; the x=9917 death replays ~3400px from x=6520. Replay time in seconds is not retained in stored telemetry — INV-1 measures it.
- Death clusters (cited): three tied 2-clusters — x≈1865 (spots 1805, 1924), x≈3805 (spots 3781, 3829; the fixed tie-break toward the most recent cluster in array order names this the dominant cluster), and x≈4330 (spots 4296, 4363; within 70px of the drone beat at x=4300); singles at 284, 1508, 5302, 9917. Per the fixed `attributeFailure` the hotspots are insufficient-evidence (no per-run retention, so a cross-run repeat is unconfirmed) — suspected hotspots, not proven design defects. No persona named `blind`/`cheap`, so no fairness finding is attached.
- Timeout stall (unattributed): timeout after 280.1s at maxX 9925, 1075px short of the crown, with the last death at x=9917 near the frontier. No position trace, input history, or stall data is stored, so where the pilot spent its 280s — and whether the frontier stopped it — is unknown. Pilot failure and level-design failure are both live; INV-1 captures the cause.
- Route evidence on the `flat` read: the pilot traversed only x≤9925, so 2 of the 6 judged stills (finale x=10800, boss x=10990) depict unplayed sections; the `flat` verdict on the played stretch rests on 4 stills plus telemetry. Unlike the paint, the decks vary in height (`platformBands` span 4–12), so the monotony read needs route-decision evidence, not a repaint. The cited still (02-hazard-boarder.jpg, the second beat-sheet shot per `shotEvidence`) locates the panel's read, not a causal encounter. No route-connectivity, waiting-time, or repeated-decision telemetry is stored.
- Visual variety (non-blocking): two platform keys (`hiveChitin`/`hiveFang`, dominant share 0.75) is paint context only. The old rank-1 texture fix is demoted to a heuristic entry: justify the look or repaint, with no quality gate attached.
- Static/runtime note (observation only): static analysis lists hazard types [bonk, crusher, drip, boarder, drone, dustDevil, shrike, boss] while runtime `hazardTypesSeen` unions 9 snapshot types [brute, crusher, sentry, drone, dust_devil, shrike, boss, acid_drip, boarder] — with naming deltas (`drip`/`acid_drip`, `dustDevil`/`dust_devil`) plus `brute`/`sentry` extras. The runtime list is a union of 150ms poll snapshots, not contact evidence; reconcile before citing either as encounter proof.
- Evidence provenance: the six retained stills are staged-teleport beat-sheet shots (stored `shots.json` predates capture-kind labels and the fixed generator defaults them to `staged-teleport`), not gameplay frames; the JPG binaries are not retained in the repo (manifests only). No gameplay death frame exists for any of the 10 deaths. Per-run telemetry was not retained (only the final outcome plus the `flat` intersection across 2 runs), so run-to-run distribution cannot be judged. No human confirmations are stored (`human.json` absent).

## Investigation (open)

- INV-1 (desert-gap deaths + timeout stall + replay-time measurement): what kills the pilot inside the x=2550–6050 gap, what holds it at/below x≈9925 for 280s, and what does each death cost in replay seconds? Stored evidence has no death cause/events, no input history, no position/stall trace, no hazard-phase data, and no gameplay frames, so mistimed encounters, unfair hotspots, and policy defects are all live.
  - Smallest next capture: bounded rerun with death events (hazard id/cause/phase at each hotspot), input history, a position/stall trace, checkpoint replay time, and retained gameplay frames of the desert-gap encounters — including the drone beat at x=4300 and telegraph visibility in the frames before each death. Repeat across fresh starts/phases; only if a cluster repeats in captured play may an encounter edit be proposed.
  - Rerun: `TYPESAFE_API_KEY=$KEY node scripts/level-critic.mjs 9`
  - Dependency: the checkpoint fix is not gated (the measured 3500px gap is sufficient evidence), but its placement should respect the INV-1 hotspot findings. No encounter/fairness edit ships before INV-1 answers.

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [checkpoint-desert] (mechanical, route) owner: skills/level-creator/SKILL.md
   - Evidence: no checkpoint between x=2550 and x=6050 (3500px gap, code-measured); 5 of 10 deaths fall inside the gap and replay ~1230–2750px from x=2550 each; x=9917 replays ~3400px from x=6520; replay time in seconds not stored (see INV-1)
   - Smallest fix: Add a checkpoint so no gap over 2500px is without one, clear of beam timing and patrol lanes.
   - Recheck: Re-run the full critic: no checkpoint gap over 2500px may remain, and the rerun must retain checkpoint replay time after death in the repaired stretch showing a lower seconds-cost than the retained run.
2. [flat] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "flat" (all iterate; corroborated: 4 votes ≥ 2, repeated across 2 runs, supporting flat-deck flag); panel judged 6 staged stills but the pilot traversed only x≤9925, so stills at x=10800, 10990 show unplayed sections; cited still 02-hazard-boarder.jpg (boarder beat x=1100) locates the read, not a cause; decks vary in height (bands 4–12) while paint does not; route telemetry (connectivity, waiting time, repeated decisions) not stored
   - Smallest fix: Diagnose repetitive play from route evidence, not paint: add a route decision or set piece to the flagged stretch, and only repaint if the build report cannot justify the two-key look as art direction.
   - Recheck: Re-run the full critic with route coverage past x=9925: route evidence (not paint) must show a new decision in the flagged stretch, or the build report must carry the art-direction exception.
3. [death-cluster-x3805] (capture/attribution, see INV-1 — no level edit) owner: scripts/level-critic.mjs
   - Evidence: three tied 2-clusters — dominant x≈3805 (spots 3781, 3829; fixed tie-break), x≈1865 (spots 1805, 1924), x≈4330 (spots 4296, 4363; within 70px of the drone beat x=4300); singles at 284, 1508, 5302, 9917; timeout at maxX 9925 after 280.1s (1075px short); no death cause, input history, position trace, phase data, replay time, or gameplay frames retained; cross-run repeat unconfirmed (no per-run retention)
   - Smallest fix: Not a level edit. Run the INV-1 capture and attribute the hotspots and the timeout stall (encounter cause vs policy defect) before any encounter change.
   - Recheck: INV-1 answered with retained death events, input history, position trace, replay time, and gameplay frames; attribution recorded.
4. [flat-deck] (mechanical visual-variety heuristic — non-blocking) owner: skills/level-creator/SKILL.md
   - Evidence: 2 deck key(s) (`hiveChitin`/`hiveFang`), dominant share 0.75 across 28 decks (paint heuristic; never a quality proof)
   - Smallest fix: Visual-variety heuristic, not a quality proof: either justify the two-key look as art direction in the build report, or use at least three platform reads with no key above 80% of decks.
   - Recheck: Re-run the full critic: route evidence (not paint) must show a new decision in the flagged stretch, or the build report must carry the art-direction exception.

Evidence: docs/level-reviews/evidence/level-9/shots.json
