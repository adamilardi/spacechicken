# Level critic — level 4 (Moonfall Citadel)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: flat-deck (1 deck key(s), dominant share 1.00 across 7 decks) — reclassified under the fixed rules as a visual-variety heuristic (kind: visual-variety); non-blocking, never a quality proof
- Telemetry: {"level":4,"outcome":"reached-crown-area","durationSec":90.1,"deaths":5,"deathSpots":[907,901,2019,2113,2469],"maxX":2483,"hazardTypesSeen":["rock","rover","drone","laser","cosmic_ray"],"errors":[]}
- Quality gate: ITERATE/REWORK (committed verdict, retained)
- Loop: 1
- Pilot runs: 2; repeated flaws across runs: flat (vote intersection across 2 runs; per-run telemetry not retained)

## Status (separated per 2026-11-01 audit re-derivation)

- Capture validity: partial. Reached-crown-area at x=2483 of crown x=2550 (97% of the route), 5 deaths, no page errors, screenshots sent, 5/5 beats retained as manifests. Local findings stand; the crown collection itself is unverified.
- Completion / route coverage: partial. No completed crown route (outcome: reached-crown-area — only crown-collected counts under the fixed rules). Everything past x=2483, including the crown grab, is unverified in play; branches/tiers visited are unrecorded, so unplayed lines stay unverified.
- Mechanical checks: flags-raised, non-blocking. The single flag is flat-deck (single `cliff` key, dominant share 1.0): a paint heuristic under the fixed rules — a justified art-direction exception in the build report rebuts it, and it never proves repetitive play.
- Quality: ITERATE. 4/4 `flat` votes (all iterate), repeated across 2 pilot runs and supported by the deck flag — corroborated under the fixed `isCorroboratedFlaw` rule — but the panel judged staged stills, and four personas judging one summary are four model perspectives, not four playtests.
- Fidelity: n/a. Not a news level (`fidelity`/`concept` null).
- Overall: ITERATE/REWORK. This is the committed verdict, not an approval.

## Quality panel

- Marlowe (expert reviewer): fun=1.6 fair=1.5 read=2.2 novel=1.8 pace=1.6 theme=2.2 flaw=flat -> iterate
- Vic (contra veteran): fun=1.6 fair=1.3 read=2.2 novel=1.8 pace=1.3 theme=2.2 flaw=flat -> iterate
- Sam (casual newcomer): fun=1.7 fair=1.5 read=2.0 novel=1.7 pace=1.8 theme=2.3 flaw=flat -> iterate
- Lex (speedrunner): fun=1.8 fair=1.4 read=2.2 novel=1.7 pace=1.9 theme=2.4 flaw=flat -> iterate
- Means: fun=1.68 fair=1.41 read=2.16 novel=1.77 pace=1.66 theme=2.27

## Audit re-derivation: visual monotony is not route monotony

- Observation: all four personas named `flat`; `repeatedFlaws` is ["flat"] across 2 runs; one mechanical flag (flat-deck) supports the vote. Under the fixed rules the `flat` finding is corroborated (4 votes ≥ 2, plus cross-run repeat, plus supporting flag) and stays — but its fix must come from route evidence, not paint.
- Visual variety (non-blocking): the single platform key (`cliff`, dominant share 1.0 across 7 platforms) is paint context only. The decks change height steadily (`platformBands` 11,10,9,8,7,6,5 — a full descent) even if the paint does not. The old rank-1 texture fix is demoted to a heuristic entry: justify the look or repaint, with no quality gate attached.
- Route evidence on the `flat` read: the pilot traversed x≤2483, so all 5 judged stills depict played sections (rover x=535, drone x=900, laser x=2370, finale x=2350). The cited still (02-hazard-rover.jpg, the second beat-sheet shot per `shotEvidence`) is a staged still whose binary is not retained — it locates the panel's read, not a causal encounter. No route-connectivity, waiting-time, or repeated-decision telemetry is stored, so the fix targets a route decision on the strength of the repeated vote, not a proven repeated stretch.
- Death clusters (cited): dominant cluster x≈2066, 2 deaths (spots 2019, 2113), between deck ≈1840 and deck ≈2220 (stored deckLayout × worldWidth 2800); secondary cluster x≈904, 2 deaths (spots 907, 901), 4px from the drone beat (x=900); plus a lone death at x=2469, 81px short of the crown. Per the fixed `attributeFailure`, the x≈2066 hotspot is insufficient-evidence (no per-run retention, so a cross-run repeat is unconfirmed) — a suspected hotspot, not a proven design defect. No persona named `blind`/`cheap`, so no fairness finding is attached.
- Replay cost: `checkpoints` is empty, so every death replays from spawn — each x≈2066 death costs ~2000px of replay. No replay-time telemetry is stored; INV-1 measures it.
- Static/runtime note (observation only): static analysis lists hazard types [rover, drone, cosmicRay, laser] while runtime `hazardTypesSeen` adds `rock`. The runtime list is a union of 150ms poll snapshots, not contact evidence; reconcile before citing either as encounter proof.
- Evidence provenance: the five retained stills are staged-teleport beat-sheet shots (stored `shots.json` predates capture-kind labels and the fixed generator defaults them to `staged-teleport`), not gameplay frames; the JPG binaries are not retained in the repo (manifests only). No gameplay death frame exists for any of the 5 deaths. Per-run telemetry was not retained (only the final outcome plus the `flat` intersection across 2 runs), so run-to-run distribution cannot be judged. No human confirmations are stored (`human.json` absent).

## Investigation (open)

- INV-1 (dominant death cluster x≈2066): what kills the pilot at x≈2019–2113? Stored evidence has no death cause/events, no input history, no hazard-phase data, and no gameplay frames, so a mistimed encounter, an unfair hotspot, and a policy defect are all live.
  - Smallest next capture: bounded rerun with death events (hazard id/cause/phase at the hotspot), input history, checkpoint replay time, and retained gameplay frames of the x≈2019–2113 encounter — including telegraph visibility in the frames before each death. Repeat across fresh starts/phases; only if the cluster repeats in captured play may a level edit be proposed.
  - Rerun: `TYPESAFE_API_KEY=$KEY node scripts/level-critic.mjs 4`
  - Dependency: none on the `flat` fix — the hotspot and the monotony read are independent. No fairness edit ships before INV-1 answers.

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [death-cluster-x2066] (investigation, see INV-1 — no level edit) owner: scripts/level-critic.mjs
   - Evidence: 2 deaths cluster near x=2066 (spots 2019, 2113); secondary 2-cluster at x≈904 (drone beat x=900); lone death x=2469; no checkpoints (spawn replay, ~2000px per hotspot death); no death cause, input history, phase data, or gameplay frames retained; cross-run repeat unconfirmed (no per-run retention)
   - Smallest fix: Not a level edit. Run the INV-1 capture and attribute the hotspot (mistimed encounter vs unfair hotspot vs policy defect) before any encounter change.
   - Recheck: INV-1 answered with retained death events, input history, replay time, and gameplay frames; attribution recorded.
2. [flat] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "flat" (all iterate; corroborated: 4 votes ≥ 2, repeated across 2 runs, supporting flat-deck flag); panel judged 5 staged stills of played sections (pilot reached x=2483 of crown x=2550); cited still 02-hazard-rover.jpg (rover beat x=535) locates the read, not a cause; route telemetry (connectivity, waiting time, repeated decisions) not stored
   - Smallest fix: Diagnose repetitive play from route evidence, not paint: add a route decision or set piece to the flagged stretch, and only repaint if the build report cannot justify the single-key look as art direction.
   - Recheck: Re-run the full critic: route evidence (not paint) must show a new decision in the flagged stretch, or the build report must carry the art-direction exception.
3. [flat-deck] (mechanical visual-variety heuristic — non-blocking) owner: skills/level-creator/SKILL.md
   - Evidence: 1 deck key(s) (`cliff`), dominant share 1.00 across 7 decks (paint heuristic; never a quality proof)
   - Smallest fix: Visual-variety heuristic, not a quality proof: either justify the single-key look as art direction in the build report, or use at least three platform reads with no key above 80% of decks.
   - Recheck: Re-run the full critic: route evidence (not paint) must show a new decision in the flagged stretch, or the build report must carry the art-direction exception.

Evidence: docs/level-reviews/evidence/level-4/shots.json
