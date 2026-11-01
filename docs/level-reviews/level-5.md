# Level critic — level 5 (Specimen Wing)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: flat-deck (1 deck key(s), dominant share 1.00 across 8 decks) — reclassified under the fixed rules as a visual-variety heuristic (kind: visual-variety); non-blocking, never a quality proof
- Telemetry: {"level":5,"outcome":"crown-collected","durationSec":49.7,"deaths":3,"deathSpots":[1287,1277,1280],"maxX":2587,"hazardTypesSeen":["lab_tech","sentry","laser","specimen","acid_drip","rock","beetle","dust_devil","boulder","hopper"],"errors":[]}
- Quality gate: ITERATE/REWORK (committed verdict, retained)
- Loop: 1
- Pilot runs: 2; repeated flaws across runs: flat (vote intersection across 2 runs; per-run telemetry not retained)

## Status (separated per 2026-11-01 audit re-derivation)

- Capture validity: valid. Full run, crown collected in 49.7s, 3 deaths, no page errors, screenshots sent, 3/3 beats retained as manifests.
- Completion / route coverage: complete. Crown-collected (maxX 2587 vs crownX 2580). Single-route bot capture; branches/tiers visited are unrecorded, so unplayed lines stay unverified.
- Mechanical checks: flags-raised, non-blocking. The single flag is flat-deck (single `labDeck` key, dominant share 1.0): a paint heuristic under the fixed rules — a justified art-direction exception in the build report rebuts it, and it never proves repetitive play.
- Quality: ITERATE. 4/4 `flat` votes (all iterate), repeated across 2 pilot runs and supported by the deck flag — corroborated under the fixed `isCorroboratedFlaw` rule — but the panel judged three staged stills, and four personas judging one summary are four model perspectives, not four playtests.
- Fidelity: n/a. Not a news level (`fidelity`/`concept` null).
- Overall: ITERATE/REWORK. This is the committed verdict, not an approval.

## Quality panel

- Marlowe (expert reviewer): fun=1.5 fair=1.4 read=2.2 novel=1.3 pace=1.8 theme=1.8 flaw=flat -> iterate
- Vic (contra veteran): fun=1.6 fair=1.5 read=2.2 novel=1.2 pace=2.0 theme=2.0 flaw=flat -> iterate
- Sam (casual newcomer): fun=1.6 fair=1.5 read=1.9 novel=1.3 pace=2.1 theme=2.1 flaw=flat -> iterate
- Lex (speedrunner): fun=1.6 fair=1.4 read=2.3 novel=1.3 pace=2.1 theme=2.1 flaw=flat -> iterate
- Means: fun=1.59 fair=1.44 read=2.13 novel=1.28 pace=1.97 theme=2.02

## Audit re-derivation: a clear with a hotspot, not a paint failure

- Observation: all four personas named `flat`; `repeatedFlaws` is ["flat"] across 2 runs; one mechanical flag (flat-deck) supports the vote. Under the fixed rules the `flat` finding is corroborated (4 votes ≥ 2, plus cross-run repeat, plus supporting flag) and stays — but its fix must come from route evidence, not paint. This level cleared: the pilot collected the crown despite the panel's read.
- Visual variety (non-blocking): the single platform key (`labDeck`, dominant share 1.0 across 8 platforms) is paint context only. The decks change height (`platformBands` 12,5,6,6,7,6,5,3 — including a 12→5 drop after the opener) even if the paint does not. The old rank-1 texture fix is demoted to a heuristic entry: justify the look or repaint, with no quality gate attached.
- Route evidence on the `flat` read: full traversal (crown collected), a mid-route checkpoint (x=920), and a thin beat sheet — only 3 judged stills (opener, laser x=860, finale x=2380). The cited still (02-hazard-laser.jpg, the second beat-sheet shot per `shotEvidence`) is a staged still whose binary is not retained — it locates the panel's read, not a causal encounter. No route-connectivity, waiting-time, or repeated-decision telemetry is stored, so the fix targets a route decision on the strength of the repeated vote, not a proven repeated stretch.
- Death cluster (cited): dominant cluster x≈1281, 3 deaths (spots 1277, 1280, 1287), just past deck ≈1221 (stored deckLayout × worldWidth 2720). The checkpoint at x=920 means each hotspot death costs ~360px of replay. Per the fixed `attributeFailure`, the hotspot is insufficient-evidence (no per-run retention, so a cross-run repeat is unconfirmed) — a suspected hotspot, not a proven design defect. No persona named `blind`/`cheap`, so no fairness finding is attached. The death hotspot has no dedicated still: nearest is 02-hazard-laser.jpg (x=860, 421px away), staged, binary not retained.
- Static/runtime note (observation only): static analysis lists 3 hazard types [bonk, laser, drip] (hazardCount 8) while runtime `hazardTypesSeen` unions 10 snapshot types. The runtime list is a union of 150ms poll snapshots, not contact evidence; reconcile before citing either as encounter proof.
- Evidence provenance: the three retained stills are staged-teleport beat-sheet shots (stored `shots.json` predates capture-kind labels and the fixed generator defaults them to `staged-teleport`), not gameplay frames; the JPG binaries are not retained in the repo (manifests only). No gameplay death frame exists for any of the 3 deaths. Per-run telemetry was not retained (only the final outcome plus the `flat` intersection across 2 runs), so run-to-run distribution cannot be judged. No human confirmations are stored (`human.json` absent).

## Investigation (open)

- INV-1 (death cluster x≈1281): what kills the pilot three times at x≈1277–1287? Stored evidence has no death cause/events, no input history, no hazard-phase data, and no gameplay frames, so a mistimed encounter, an unfair hotspot, and a policy defect are all live.
  - Smallest next capture: bounded rerun with death events (hazard id/cause/phase at the hotspot), input history, checkpoint replay time, and retained gameplay frames of the x≈1277–1287 encounter — including telegraph visibility in the frames before each death. Repeat across fresh starts/phases; only if the cluster repeats in captured play may a level edit be proposed.
  - Rerun: `TYPESAFE_API_KEY=$KEY node scripts/level-critic.mjs 5`
  - Dependency: none on the `flat` fix — the hotspot and the monotony read are independent. No fairness edit ships before INV-1 answers.

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [flat] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "flat" (all iterate; corroborated: 4 votes ≥ 2, repeated across 2 runs, supporting flat-deck flag); panel judged 3 staged stills over a completed crown route (crown collected); cited still 02-hazard-laser.jpg (laser beat x=860) locates the read, not a cause; route telemetry (connectivity, waiting time, repeated decisions) not stored
   - Smallest fix: Diagnose repetitive play from route evidence, not paint: add a route decision or set piece to the flagged stretch, and only repaint if the build report cannot justify the single-key look as art direction.
   - Recheck: Re-run the full critic: route evidence (not paint) must show a new decision in the flagged stretch, or the build report must carry the art-direction exception.
2. [death-cluster-x1281] (capture/attribution, see INV-1 — no level edit) owner: scripts/level-critic.mjs
   - Evidence: 3 deaths cluster near x=1281 (spots 1277, 1280, 1287), just past deck ≈1221; checkpoint x=920 (~360px replay per hotspot death); nearest still 02-hazard-laser.jpg 421px away (staged, binary not retained); no death cause, input history, phase data, or gameplay frames retained; cross-run repeat unconfirmed (no per-run retention)
   - Smallest fix: Not a level edit. Run the INV-1 capture and attribute the hotspot (mistimed encounter vs unfair hotspot vs policy defect) before any encounter change.
   - Recheck: INV-1 answered with retained death events, input history, replay time, and gameplay frames; attribution recorded.
3. [flat-deck] (mechanical visual-variety heuristic — non-blocking) owner: skills/level-creator/SKILL.md
   - Evidence: 1 deck key(s) (`labDeck`), dominant share 1.00 across 8 decks (paint heuristic; never a quality proof)
   - Smallest fix: Visual-variety heuristic, not a quality proof: either justify the single-key look as art direction in the build report, or use at least three platform reads with no key above 80% of decks.
   - Recheck: Re-run the full critic: route evidence (not paint) must show a new decision in the flagged stretch, or the build report must carry the art-direction exception.

Evidence: docs/level-reviews/evidence/level-5/shots.json
