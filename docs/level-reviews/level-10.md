# Level critic — level 10 (Spire Crown)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: checkpoint-desert (no checkpoint between x=2750 and x=6750 — 4000px gap; kind: route); flat-deck (2 deck key(s), dominant share 0.77 across 30 decks) — reclassified under the fixed rules as a visual-variety heuristic (kind: visual-variety); non-blocking, never a quality proof
- Telemetry: {"level":10,"outcome":"timeout","durationSec":310.1,"deaths":10,"deathSpots":[5566,6883,6909,10899,10875,11290,8563,11491,11459,11473],"maxX":11537,"hazardTypesSeen":["laser","dust_devil","drone","shrike","sentry","boss","boarder"],"errors":[]}
- Quality gate: ITERATE/REWORK (committed verdict, retained)
- Loop: 1
- Pilot runs: 2; repeated flaws across runs: flat (vote intersection across 2 runs; per-run telemetry not retained)

## Status (separated per 2026-11-01 audit re-derivation)

- Capture validity: partial. Timeout after 310.1s at x=11537 of crown x=11950 (97% of the route), 10 deaths, no page errors, screenshots sent, 6/6 beats retained as manifests. Local findings stand; whole-level verdicts do not.
- Completion / route coverage: partial. No completed crown route (outcome: timeout). Everything past x=11537 — including the finale (x=11750), the boss beat (x=11920), and the crown approach x=11537–11950 — is unverified in play.
- Mechanical checks: flags-raised. `checkpoint-desert` is a code-measured route flag (4000px gap, rank 1 by player impact). `flat-deck` (keys `spireAlloy`/`spireGlass`, dominant share 0.77) is a paint heuristic under the fixed rules — a justified art-direction exception in the build report rebuts it, and it never proves repetitive play.
- Quality: ITERATE. 4/4 `flat` votes (all iterate), repeated across 2 pilot runs and supported by the deck flag — corroborated under the fixed `isCorroboratedFlaw` rule — but the panel judged staged stills while the pilot traversed only x≤11537, so the boss (x=11920) and finale (x=11750) stills depict unplayed sections. The whole-level read rests on partial play.
- Fidelity: n/a. Not a news level (`fidelity`/`concept` null).
- Overall: ITERATE/REWORK. This is the committed verdict, not an approval.

## Quality panel

- Marlowe (expert reviewer): fun=1.5 fair=1.1 read=2.1 novel=1.1 pace=0.9 theme=2.0 flaw=flat -> iterate
- Vic (contra veteran): fun=1.6 fair=1.0 read=2.1 novel=1.3 pace=0.9 theme=2.2 flaw=flat -> iterate
- Sam (casual newcomer): fun=1.2 fair=1.0 read=1.8 novel=1.3 pace=0.8 theme=2.2 flaw=flat -> iterate
- Lex (speedrunner): fun=1.6 fair=0.9 read=2.1 novel=1.4 pace=0.9 theme=2.3 flaw=flat -> iterate
- Means: fun=1.46 fair=0.99 read=2.03 novel=1.25 pace=0.86 theme=2.18

## Audit re-derivation: checkpoint replay cost outranks texture count

- Observation: the old rank-1 fix repainted platforms (2 keys, 0.77 share) ahead of a measured 4000px checkpoint gap — the widest of the L8–L10 trio. Ranked by player impact instead: the gap and its replay cost go first, the corroborated `flat` vote stays as a route diagnosis, and the texture count drops to a non-blocking visual heuristic. Texture count is a visual heuristic, not a hard quality blocker.
- Checkpoint desert (rank 1): the x=2750→6750 gap is 4000px, code-measured from checkpoint data. The x=5566 death inside it replays ~2820px from x=2750; the x≈10875–11290 deaths replay ~3050–3460px from x=7830. Replay time in seconds is not retained in stored telemetry — INV-1 measures it.
- Death clusters (cited): dominant 3-death cluster at x≈11407 (spots 11290, 11459, 11473; adjacent single at 11491), nearest staged still 04-hazard-bonk.jpg (bonk beat x=11250, 157px away; binary not retained); pairs at x≈6896 (spots 6883, 6909) and x≈10887 (spots 10875, 10899); singles at 5566, 8563, 11491. Per the fixed `attributeFailure` the x≈11407 hotspot is insufficient-evidence (no per-run retention, so a cross-run repeat is unconfirmed) — a suspected hotspot, not a proven design defect. No persona named `blind`/`cheap`, so no fairness finding is attached.
- Timeout stall (unattributed): timeout after 310.1s at maxX 11537, 413px short of the crown, with 6 of 10 deaths past x=10875 — the pilot ground against the endgame without finishing. No position trace, input history, or stall data is stored, so what stopped the final 413px is unknown. Pilot failure and level-design failure are both live; INV-1 captures the cause.
- Route evidence on the `flat` read: the pilot traversed only x≤11537, so 2 of the 6 judged stills (finale x=11750, boss x=11920) depict unplayed sections; the `flat` verdict on the played stretch rests on 4 stills plus telemetry. Unlike the paint, the decks descend steadily (`platformBands` 11 down to 3), so the monotony read needs route-decision evidence, not a repaint. The cited still (02-hazard-boarder.jpg, the second beat-sheet shot per `shotEvidence`) locates the panel's read, not a causal encounter. No route-connectivity, waiting-time, or repeated-decision telemetry is stored.
- Visual variety (non-blocking): two platform keys (`spireAlloy`/`spireGlass`, dominant share 0.77) is paint context only. The old rank-1 texture fix is demoted to a heuristic entry: justify the look or repaint, with no quality gate attached.
- Static/runtime note (observation only): static analysis lists hazard types [laser, dustDevil, drone, boarder, shrike, bonk, boss] while runtime `hazardTypesSeen` unions 7 snapshot types [laser, dust_devil, drone, shrike, sentry, boss, boarder]. The runtime list is a union of 150ms poll snapshots, not contact evidence; reconcile before citing either as encounter proof.
- Evidence provenance: the six retained stills are staged-teleport beat-sheet shots (stored `shots.json` predates capture-kind labels and the fixed generator defaults them to `staged-teleport`), not gameplay frames; the JPG binaries are not retained in the repo (manifests only). No gameplay death frame exists for any of the 10 deaths. Per-run telemetry was not retained (only the final outcome plus the `flat` intersection across 2 runs), so run-to-run distribution cannot be judged. No human confirmations are stored (`human.json` absent).

## Investigation (open)

- INV-1 (dominant death cluster x≈11407 + endgame stall + replay-time measurement): what kills the pilot 3× at x≈11290–11473, what holds it 413px short of the crown for 310s, and what does each death cost in replay seconds? Stored evidence has no death cause/events, no input history, no position/stall trace, no hazard-phase data, and no gameplay frames, so mistimed encounters, an unfair endgame hotspot, and policy defects are all live.
  - Smallest next capture: bounded rerun with death events (hazard id/cause/phase at the hotspot), input history, a position/stall trace, checkpoint replay time, and retained gameplay frames of the x≈11290–11491 endgame encounter — including the bonk beat at x=11250 and telegraph visibility in the frames before each death. Repeat across fresh starts/phases; only if the cluster repeats in captured play may an encounter edit be proposed.
  - Rerun: `TYPESAFE_API_KEY=$KEY node scripts/level-critic.mjs 10`
  - Dependency: the checkpoint fix is not gated (the measured 4000px gap is sufficient evidence), but its placement should respect the INV-1 hotspot finding. No encounter/fairness edit ships before INV-1 answers.

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [checkpoint-desert] (mechanical, route) owner: skills/level-creator/SKILL.md
   - Evidence: no checkpoint between x=2750 and x=6750 (4000px gap, code-measured); x=5566 inside the gap replays ~2820px from x=2750; x≈10875–11290 replays ~3050–3460px from x=7830; replay time in seconds not stored (see INV-1)
   - Smallest fix: Add a checkpoint so no gap over 2500px is without one, clear of beam timing and patrol lanes.
   - Recheck: Re-run the full critic: no checkpoint gap over 2500px may remain, and the rerun must retain checkpoint replay time after death in the repaired stretch showing a lower seconds-cost than the retained run.
2. [flat] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "flat" (all iterate; corroborated: 4 votes ≥ 2, repeated across 2 runs, supporting flat-deck flag); panel judged 6 staged stills but the pilot traversed only x≤11537, so stills at x=11750, 11920 show unplayed sections; cited still 02-hazard-boarder.jpg (boarder beat x=900) locates the read, not a cause; decks descend steadily (bands 11 to 3) while paint does not; route telemetry (connectivity, waiting time, repeated decisions) not stored
   - Smallest fix: Diagnose repetitive play from route evidence, not paint: add a route decision or set piece to the flagged stretch, and only repaint if the build report cannot justify the two-key look as art direction.
   - Recheck: Re-run the full critic with route coverage past x=11537: route evidence (not paint) must show a new decision in the flagged stretch, or the build report must carry the art-direction exception.
3. [death-cluster-x11407] (investigation, see INV-1 — no level edit) owner: scripts/level-critic.mjs
   - Evidence: 3 deaths cluster near x=11407 (spots 11290, 11459, 11473; adjacent single at 11491); nearest staged still 04-hazard-bonk.jpg (x=11250, binary not retained); pairs at x≈6896 and x≈10887; singles at 5566, 8563, 11491; timeout at maxX 11537 after 310.1s (413px short); no death cause, input history, position trace, phase data, replay time, or gameplay frames retained; cross-run repeat unconfirmed (no per-run retention)
   - Smallest fix: Not a level edit. Run the INV-1 capture and attribute the hotspot and the endgame stall (encounter cause vs policy defect) before any encounter change.
   - Recheck: INV-1 answered with retained death events, input history, position trace, replay time, and gameplay frames; attribution recorded.
4. [flat-deck] (mechanical visual-variety heuristic — non-blocking) owner: skills/level-creator/SKILL.md
   - Evidence: 2 deck key(s) (`spireAlloy`/`spireGlass`), dominant share 0.77 across 30 decks (paint heuristic; never a quality proof)
   - Smallest fix: Visual-variety heuristic, not a quality proof: either justify the two-key look as art direction in the build report, or use at least three platform reads with no key above 80% of decks.
   - Recheck: Re-run the full critic: route evidence (not paint) must show a new decision in the flagged stretch, or the build report must carry the art-direction exception.

Evidence: docs/level-reviews/evidence/level-10/shots.json
