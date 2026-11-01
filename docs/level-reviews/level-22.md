# Level critic — level 22 (Booster Homecoming)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: none
- Telemetry: {"level":22,"outcome":"crown-collected","durationSec":36.4,"deaths":0,"deathSpots":[],"maxX":3535,"hazardTypesSeen":["drone","laser","boulder","acid_drip","rock"],"errors":[]}
- Quality gate: STALE PASS (committed PASS inconsistent under current confirmation rules — revalidation required, not an approval)
- Loop: 7 (prior top flaw: cheap) — LOOP LIMIT REACHED: hand to the user, do not lower the gate. Stop-rule provenance is recorded in the handoff below; the count conflates design revisions with calibration reruns (unrecoverable breakdown).
- Pilot runs: 2; repeated flaws across runs: none (per-run telemetry not retained; only the final outcome plus the repeatedFlaws intersection)
- Concept gate: PASS

## Status (separated per 2026-11-01 audit re-derivation)

- Capture validity: stale-but-valid. `Run: full` means the pipeline ran, and this run crown-collected (36.4s, 0 deaths, no page errors, screenshots sent, 5 beat stills retained in-repo). Limits: the old capture records no still kinds (`shots.json` predates capture-kind labels, so staged vs gameplay kind is unverified from the manifest), no per-run retention (the vote unanimity rests on the final scores plus the empty repeatedFlaws intersection only), and judged-beat coverage is unrecorded (the old `selectPanelShots(..., 4)` judged at most 4 of the 5 beats; which beat was omitted is not in stored evidence).
- Completion / route coverage: complete on the main route. Crown collected with maxX 3535 against crownX 3520; all three checkpoints (1050/2300/3020) passed. Alternate branches/tiers visited are unrecorded (old capture), so off-route sections are unverified. The finale still (x=3320) sits 200px before the crown, so the final approach is telemetry-verified, not still-verified.
- Mechanical checks: clear. No flags: 3 platform keys (harborDeck/skyhookPanel/vaultDeck, dominant share 0.55 — a visual-variety heuristic that never blocks quality), no clone-similarity comparator fired, and the finale carries 5 hazards with 5 visible in a frozen still. Zero deaths, so no death cluster exists to cite.
- Quality: PASS under the fixed rules (verified by running `panelPassed`): 4/4 personas name flaw `none` with 4 ship verdicts; fun (2.44) and fairness (1.99) clear their 1.5 floors and all four news floors pass. Boundary note: novelty mean is exactly 1.50 (per-persona 1.43/1.48/1.49/1.60 — three of four below the floor), so the pass rests on the mean and a re-judgment could tip either way; recorded as a repeatability limitation, not a failure. Model opinion on partial evidence: one retained run's scores over an unrecorded 4-of-5-beat subset — four personas judging one summary are four model perspectives, not four playtests. Independent of fidelity.
- Fidelity: FAIL on needs-human alone (re-derived by running the fixed `fidelityGate` with confirmed=[]). All four rows sit under the 0.8 confidence gate (0.70/0.44/0.68/0.26), so needsHuman holds all 4 rows; everything else passes (4 shown, 0 contradicted, 0 unsupported, no signature element missing/unsupported, universe shown, mechanic 2.69 / visual 3.62 clear, flaw none). The stored gate passed only because the old generator counted the 4 agent confirmations as human proof (re-running the gate with those keys returns passed:true). Stored `human.json` is agent observation (reviewerType agent, kept as-is per audit), which clears nothing under `confirmationReview`.
- Overall: STALE PASS. The committed PASS is inconsistent under current confirmation rules (`validateStoredPass` reports 2 issues, below) and re-derives as failing; revalidation required — not an approval.

## Quality panel

- Marlowe (expert reviewer): fun=2.4 fair=2.0 read=2.3 novel=1.4 pace=2.5 theme=2.1 flaw=none -> ship
- Vic (contra veteran): fun=2.5 fair=2.0 read=2.5 novel=1.5 pace=2.5 theme=2.2 flaw=none -> ship
- Sam (casual newcomer): fun=2.4 fair=2.0 read=2.3 novel=1.5 pace=2.5 theme=2.2 flaw=none -> ship
- Lex (speedrunner): fun=2.6 fair=1.9 read=2.5 novel=1.6 pace=2.7 theme=2.2 flaw=none -> ship
- Means: fun=2.44 fair=1.99 read=2.39 novel=1.50 pace=2.53 theme=2.18
- Judged-beat coverage (old `selectPanelShots(..., 4)` over the 5-beat manifest): at most 4 of the 5 beats (opener x=150, drone x=1250, laser x=2200, roller x=2680, finale x=3320) were judged per panel pass, and stored evidence records neither the subset nor per-beat judgments (`evidenceSeen` did not exist). The rerun batches all 5 beats.

## News fidelity

- Brief: Level 22 — Booster Homecoming (news-to-level)
- Gate: FAIL (re-derived; stored gate passed only on agent confirmations — see below)
- Element "Falcon booster" [signature]: shown (noul=0.93)
- Element "Starlink satellite": shown (noul=0.92)
- Element "droneship deck" [signature]: shown (noul=0.85)
- Element "launch tower gantry": shown (noul=0.94)
- Row "Booster B1093 falls back and lands on a droneship 8.5 minutes after liftoff" [signature] -> supports (confidence=0.70)
- Row "27 Starlink satellites climb to orbit" -> supports (confidence=0.44)
- Row "Halloween-eve night launch over the coast" -> supports (confidence=0.68)
- Row "700th launch milestone, recovery crew waits on the droneship" -> supports (confidence=0.26)
- Space Chicken universe: shown (noul=0.98)
- Needs human: row:Booster B1093 falls back and lands on a droneship 8.5 minutes after liftoff; row:27 Starlink satellites climb to orbit; row:Halloween-eve night launch over the coast; row:700th launch milestone, recovery crew waits on the droneship
- Stored observation (not a panel judgment, clears nothing): `evidence/level-22/human.json` (reviewer: "agent human-review (screenshots opened)", reviewerType: "agent", 2026-10-31) supports all 4 rows from two stills plus level-data cross-checks (descent topology, drones, rescues). The fixed `confirmationReview()` maps this to confirmed=[] / agentConfirmed=4 with the issue "confirmations are not from a named human reviewer (reviewerType)". Basis limitation: the reasoning cites "06-finale.jpg", which is not in the retained 5-shot manifest (01–05 with 05-finale.jpg) — the finale read must be re-done against 05-finale.jpg. The reviewer is NOT relabelled.

## Audit re-derivation: stale PASS, one fidelity blocker, loop-7 provenance

- Stale-pass issues (from running the fixed `validateStoredPass` against the stored report + human.json): (1) `stored PASS claims 4 human confirmation(s) but evidence human.json has reviewerType "agent": treat as inconsistent/stale and revalidate`; (2) `stored PASS at loop 7 has no handoff record explaining the stop-rule history`. All 4 confirmed keys match current claims (no unmatched-confirmation issue), and the crown route is complete (no partial-route issue) — the staleness is confirmations + stop-rule history only.
- Gate math (fixed `fidelityGate`, verified by running it): with confirmed=[] the gate returns passed:false with needsHuman=[4 rows] — every other clause passes. With the 4 agent keys it returns passed:true, reproducing the stored gate exactly. The stored PASS therefore depended entirely on counting agent evidence as human proof.
- Loop-7 provenance (handoff record, now in JSON): the stored loop 7 was counted by the old `nextLoopInfo` rule (every non-passing report +1), so it conflates design revisions with calibration reruns — the breakdown is unrecoverable from stored evidence (no `runs[]`, no `analysisHash` history, no prior reports retained). The three-iteration stop rule was exceeded at loop 4, yet iteration continued to a loop-7 PASS with the LOOP LIMIT warning attached to a passing verdict. Under the fixed rule (`nextRevisionLoop`) only design revisions advance the loop, calibration reruns hold it, and this stale PASS revalidates at loop 7; do not lower the gate to escape the loop.
- No other findings: no clone-similarity flag exists to convert (nothing invented); 0 deaths leave no cluster to attribute; novelty 1.50 is exactly on its floor (repeatability note above, not a failure); quality and fidelity blockers are independent (fixing one never moves the other).

## Investigation (open)

- INV-1 (human confirmation of the 4 rows + bounded rerun): do the four low-confidence rows (0.70/0.44/0.68/0.26) read as supports to a named human reviewer on the retained stills? The stored agent observation supports all four but cannot clear needs-human, and its finale basis must be re-done against 05-finale.jpg. No level edit is ordered before the confirmation lands.
  - Smallest next capture: a human opens the five retained stills, confirms or overrides each row key, and records the judgments in human.json with reviewerType human and per-claim shot basis; then a bounded rerun under the fixed generator re-judges the full 5-beat sheet with `evidenceSeen` recorded (also re-testing the exact-on-floor novelty read).
  - Rerun: `TYPESAFE_API_KEY=$KEY NEWS_BRIEF=docs/level-builds/22.md node scripts/level-critic.mjs 22`

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [needs-human] (fidelity — the sole blocker; stored PASS depended entirely on agent evidence) owner: human reviewer (docs/level-reviews/evidence/level-22/human.json)
   - Evidence: row:Booster B1093 falls back and lands on a droneship 8.5 minutes after liftoff AND row:27 Starlink satellites climb to orbit AND row:Halloween-eve night launch over the coast AND row:700th launch milestone, recovery crew waits on the droneship are low-confidence (0.70/0.44/0.68/0.26, all < 0.8 gate) and unconfirmed: the stored humanConfirmed rested on reviewerType agent evidence, which the fixed confirmationReview rejects (confirmed=[], agentConfirmed=4 preserved separately); re-running the fixed fidelityGate with confirmed=[] returns passed:false with needsHuman=[4 rows], and with the agent keys returns passed:true. Agent basis limitation: the observation cites 06-finale.jpg, absent from the retained 5-shot manifest (finale is 05-finale.jpg).
   - Smallest fix: A human confirms or overrides each of the 4 row keys against the retained stills (finale read against 05-finale.jpg, noting the 06/05 discrepancy) and records the judgments in human.json with reviewerType human and per-claim shot basis; do not relabel the stored agent observation.
   - Recheck: Re-run the full critic with NEWS_BRIEF; needsHuman must be empty for the fidelity gate (and the rerun re-tests the exact-1.50 novelty read).

Evidence: docs/level-reviews/evidence/level-22/shots.json
