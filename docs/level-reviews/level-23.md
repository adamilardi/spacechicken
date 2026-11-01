# Level critic — level 23 (Reconnection)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: none
- Telemetry: {"level":23,"outcome":"crown-collected","durationSec":52.4,"deaths":1,"deathSpots":[1785],"maxX":4252,"hazardTypesSeen":["reconnectionSprite","drone","laser","acid_drip","cosmic_ray","rock"],"errors":[]}
- Quality gate: ITERATE/REWORK (stored combined verdict, not the quality panel alone — re-derivation: quality PASS, fidelity FAIL on evidence; still not an approval)
- Loop: 1
- Pilot runs: 2; repeated flaws across runs: none (per-run telemetry not retained; only the final outcome plus the repeatedFlaws intersection)
- Concept gate: PASS

## Status (separated per 2026-11-01 audit re-derivation)

- Capture validity: pipeline-ran-full. Crown collected (52.4s, 1 death, no page errors, screenshots sent, 6-beat manifest retained). Limits: the old capture records no still kinds (staged vs gameplay kind is unverified from the manifest — the retained drone still shows Time 00:00.00 with the title card, i.e. staged), no per-run retention (pilotRuns 2 but only the final outcome plus the empty repeatedFlaws intersection survives), and judged-beat coverage is partial by construction: the old `selectPanelShots(..., 4)` judged 4 of the 6 beats per panel pass, deterministically omitting the twin-satellite drone beat (see below); per-pass subsets were unrecorded (`evidenceSeen` did not exist). Evidence-set staleness: the JPG filenames on disk (02-hazard-cosmicRay / 03-hazard-drone / 04-hazard-drip / 05-setpiece-cuspArc) do not match the manifest's file list (02-setpiece-cuspArc / 03-hazard-bonk / 04-hazard-drone / 05-hazard-drip) — the disk set carries a cosmicRay beat the manifest lacks and lacks the bonk beat the manifest lists. JPGs were removed from the PR, so local filenames cannot support reviewer verification either way.
- Completion / route coverage: complete on the main route. Crown collected with maxX 4252 against crownX 4250; all three checkpoints (1300/1950/2950) passed. One death at x=1785 — a single event, not a cluster, with no cause/phase/input/visibility data in the old capture, so no fairness attribution is drawn from it. Alternate branches/tiers visited are unrecorded (old capture), so off-route sections are unverified. The finale still (x=4050) sits 200px before the crown, so the final approach is telemetry-verified, not still-verified.
- Mechanical checks: clear. No flags: 3 platform keys (labDeck/issHull/vaultDeck, dominant share 0.50 — a visual-variety heuristic that never blocks quality), no clone-similarity comparator fired (nothing to convert — no clone finding is invented), and the finale carries 3 hazards with 2 visible in a frozen still (finaleVisible true).
- Quality: PASS under the fixed rules (verified by running `panelPassed` with news floors): 4/4 personas name flaw `none`, 0 rework verdicts, fun (2.43) and fairness (1.82) clear their 1.5 floors, and all four news floors pass (novelty 1.91, theme 2.47, readability 2.25, pacing 2.42). The 3 iterate + 1 ship verdicts are four model perspectives on one retained summary, not four playtests — and with no named flaw there is no quality finding to fix. Independent of fidelity.
- Fidelity: FAIL on needs-human alone (re-derived by running the fixed `fidelityGate` with confirmed=[]). All four rows sit under the 0.8 confidence gate (0.79/0.55/0.33/0.64), so needsHuman holds all 4 rows; everything else passes (3 shown, 0 contradicted, 1 unsupported within the <=1 allowance, no signature element missing/unsupported, universe shown, mechanic 2.93 / visual 3.34 clear, flaw none). The "twin satellites" element reads missing (noul=0.28) but is NOT signature — the stored top fix's "missing signature elements" wording is wrong — and the drone beat was never shown to the panel (see investigation): "not visible in selected evidence" is distinct from "missing from the game." Stored `human.json` is agent observation (reviewerType agent, kept as-is per audit), which clears nothing under `confirmationReview` (confirmed=[], agentConfirmed=3); even counted, the gate would still fail on the unconfirmed solar-wind row.
- Overall: ITERATE/REWORK stands, on fidelity/evidence grounds only. Quality passes; no level edit is ordered before the evidence lands.

## Quality panel

- Marlowe (expert reviewer): fun=2.4 fair=1.9 read=2.2 novel=1.9 pace=2.4 theme=2.4 flaw=none -> iterate
- Vic (contra veteran): fun=2.4 fair=1.8 read=2.4 novel=2.0 pace=2.4 theme=2.4 flaw=none -> iterate
- Sam (casual newcomer): fun=2.4 fair=1.8 read=2.1 novel=1.8 pace=2.4 theme=2.5 flaw=none -> iterate
- Lex (speedrunner): fun=2.5 fair=1.8 read=2.3 novel=2.0 pace=2.5 theme=2.5 flaw=none -> ship
- Means: fun=2.43 fair=1.82 read=2.25 novel=1.91 pace=2.42 theme=2.47
- No named flaw: all four personas chose flaw `none`, so there is no quality finding to convert into a fix (and no clone-similarity flag exists to convert — none invented).
- Judged-beat coverage (old `selectPanelShots(..., 4)` over the 6-beat manifest): re-running the old selection deterministically yields 01-opener, 02-setpiece-cuspArc, 03-hazard-bonk, 06-finale — the 04-hazard-drone beat (x=2350, the twin-satellite beat) and the 05-hazard-drip beat were omitted from every panel pass. Stored evidence records no per-pass subset or per-beat judgments (`evidenceSeen` did not exist). The rerun batches all 6 beats.

## News fidelity

- Brief: Level 23 — Reconnection (news-to-level)
- Gate: FAIL (on needs-human alone — see re-derivation)
- Element "Reconnection Sprite" [signature]: shown (noul=0.87)
- Element "twin satellites" (NOT signature): missing in selected evidence (noul=0.28) — judged without the drone beat; see investigation, no rebuild ordered
- Element "cusp funnel" [signature]: shown (noul=0.77)
- Element "magnetosphere arcs": shown (noul=0.86)
- Row "Magnetic field lines snap and explosively reconnect, releasing energy" [signature] -> supports (confidence=0.79)
- Row "Solar wind slams the magnetopause and accelerates particles" -> supports (confidence=0.55)
- Row "Twin TRACERS satellites fly in formation through the cusp" -> unsupported (confidence=0.33) — judged without the drone beat, and formation/synchrony needs motion or event data, not frozen pictures
- Row "The cusp funnels field lines down to the pole" -> supports (confidence=0.64)
- Space Chicken universe: shown (noul=0.96)
- Needs human: row:Magnetic field lines snap and explosively reconnect, releasing energy; row:Solar wind slams the magnetopause and accelerates particles; row:Twin TRACERS satellites fly in formation through the cusp; row:The cusp funnels field lines down to the pole
- Stored observation (not a panel judgment, clears nothing): `evidence/level-23/human.json` (reviewer: "agent human-review (screenshots opened)", reviewerType: "agent", 2026-10-31) confirms 3 of the 4 rows from two stills plus level-data cross-checks, leaving the solar-wind row unconfirmed. The fixed `confirmationReview()` maps this to confirmed=[] / agentConfirmed=3 with the issue "confirmations are not from a named human reviewer (reviewerType)". Basis limitation: the reasoning cites "03-hazard-drone.jpg" and "06-finale.jpg" in on-disk naming, which does not match the manifest's numbering (drone is 04-hazard-drone.jpg there) — the observation was made against a different file generation than the manifest describes. The reviewer is NOT relabelled.

## Audit re-derivation: quality PASS, fidelity evidence failure, twin coverage finding

- Gate math (fixed functions, verified by running them): `panelPassed` with news floors returns true (4/4 flawless, 0 rework, 0 structural, fun/fairness above 1.5, zero news-floor failures, no clone flags, screenshots sent). `fidelityGate` with confirmed=[] returns passed:false with needsHuman=[4 rows] — every other clause passes. `confirmationReview` on the stored human.json returns confirmed=[] / agentConfirmed=3 / reviewerType agent. With the 3 agent keys the gate still returns passed:false (needsHuman=[solar-wind row]).
- Twin-satellite coverage (the audit-ordered investigation): the element "twin satellites" (non-signature) and the formation row were judged missing/unsupported by panels that never saw the 04-hazard-drone beat. The drones exist in the level: `levels/reconnection.js` places twin `starlinkSprite` drones at x=2350/2500, y=240/222 (18px vertical offset, staggered 2400/2900ms patrols across the funnel throat) — matching the brief's "twin drone pair on one shared patrol beat."
- Twin-satellite readability (retained staged still, on-disk 03-hazard-drone.jpg): both craft are visible — one mid-frame partially behind the "LEVEL 23 / Reconnection" title overlay, one right of frame — small at 0.05 scale. The still is staged (Time 00:00.00, Deaths 0, title card), not a gameplay frame, and a frozen picture cannot prove formation flight either way; that claim needs patrol/motion evidence. So the verdicts record an evidence gap, not a confirmed art defect.
- Withdrawn prescription: the stored rank-1 fix ("Build the missing signature elements...") is withdrawn — the element is not signature, and absence from the judged subset is not absence from the game. No rebuild is ordered before the bounded capture below. The single death at x=1785 is cited, not diagnosed: one event with no cause data is not a cluster.

## Investigation (open)

- INV-1 (twin-satellite coverage/readability — must precede any art decision): do the twins read as shown, and the formation row as supports, when the drone beat is actually judged with motion evidence? The missing/unsupported verdicts were reached without the twin beat, while level source and the retained staged still both show two craft present.
  - Smallest next capture: a bounded rerun under the fixed generator that batches the full 6-beat sheet with `evidenceSeen` recorded (drone beat included), plus drone-beat patrol/motion evidence for the formation read; a human reads the twins at gameplay size and confirms or overrides the element + formation row in human.json with reviewerType human and per-claim shot basis. Order no rebuild before this lands.
  - Rerun: `TYPESAFE_API_KEY=$KEY NEWS_BRIEF=docs/level-builds/23.md node scripts/level-critic.mjs 23`
- INV-2 (the 4 needs-human rows — the actual gate blocker): do all four rows (confidences 0.79/0.55/0.33/0.64, all < 0.8) read as supports to a named human reviewer? The stored agent observation supports 3 of 4 but cannot clear needs-human, and its file basis belongs to a different capture generation than the manifest.
  - Smallest next capture: a human opens the retained stills, confirms or overrides each of the 4 row keys, and records the judgments in human.json with reviewerType human and per-claim shot basis (adjudicating the disk/manifest filename discrepancy); then the same bounded rerun re-judges the full beat sheet.
  - Rerun: `TYPESAFE_API_KEY=$KEY NEWS_BRIEF=docs/level-builds/23.md node scripts/level-critic.mjs 23`

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [needs-human] (fidelity — the sole gate blocker) owner: human reviewer (docs/level-reviews/evidence/level-23/human.json)
   - Evidence: row:Magnetic field lines snap and explosively reconnect, releasing energy AND row:Solar wind slams the magnetopause and accelerates particles AND row:Twin TRACERS satellites fly in formation through the cusp AND row:The cusp funnels field lines down to the pole are low-confidence (0.79/0.55/0.33/0.64, all < 0.8 gate) and unconfirmed: the stored human.json holds 3 agent confirmations (solar-wind row not confirmed), which the fixed confirmationReview rejects (confirmed=[], agentConfirmed=3, reviewerType agent); re-running the fixed fidelityGate with confirmed=[] returns passed:false with needsHuman=[4 rows], and even with the agent keys it returns passed:false on the solar-wind row. Every other gate clause passes. Agent basis limitation: the observation cites on-disk filenames (03-hazard-drone.jpg) that do not match the manifest's numbering (drone is 04-hazard-drone.jpg).
   - Smallest fix: A human confirms or overrides each of the 4 row keys against the retained stills (adjudicating the disk/manifest filename discrepancy) and records the judgments in human.json with reviewerType human and per-claim shot basis; do not relabel the stored agent observation.
   - Recheck: Re-run the full critic with NEWS_BRIEF; needsHuman must be empty for the fidelity gate.
2. [missing-elements → investigation, NOT a rebuild] (fidelity — suspected evidence defect; no level edit ordered) owner: rerun + human reviewer (docs/level-reviews/evidence/level-23/human.json)
   - Evidence: element "twin satellites" (non-signature — the stored "missing signature elements" wording was wrong) judged missing (noul=0.28) and the formation row unsupported (0.33) by panels that never saw the 04-hazard-drone beat: the old selectPanelShots(..., 4) over the 6-beat manifest deterministically selected opener/setpiece-cuspArc/bonk/finale only. The twins exist in levels/reconnection.js (twin starlinkSprite drones x=2350/2500, y=240/222, staggered 2400/2900ms patrols) and both read in the retained staged drone still (one partly behind the title overlay, small at 0.05 scale); a frozen staged still cannot prove formation flight either way.
   - Smallest fix: Bounded evidence capture only — rerun the fixed generator so both panels judge the full 6-beat sheet with evidenceSeen plus drone-beat patrol/motion evidence, and have a human read the twins at gameplay size against the element + formation row. Prescribe art changes only if that capture names a readability defect with shot basis.
   - Recheck: Re-run the full critic with NEWS_BRIEF; the twin element re-judges shown (noul >= 0.7) on the drone beat, or a named readability defect with shot basis replaces this investigation.

Evidence: docs/level-reviews/evidence/level-23/shots.json
