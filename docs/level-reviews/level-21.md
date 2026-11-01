# Level critic — level 21 (Phobos Sample Run)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: none
- Telemetry: {"level":21,"outcome":"crown-collected","durationSec":66.8,"deaths":1,"deathSpots":[1614],"maxX":5615,"hazardTypesSeen":["laser","drone","boulder","signalTech","rock"],"errors":[]}
- Quality gate: ITERATE/REWORK (committed verdict, retained)
- Loop: 2 (prior top flaw: missing-elements)
- Pilot runs: 2; repeated flaws across runs: none (per-run telemetry not retained; only the final outcome plus the repeatedFlaws intersection)
- Concept gate: PASS

## Status (separated per 2026-11-01 audit re-derivation)

- Capture validity: valid. `Run: full` means the pipeline ran, and this run crown-collected (66.8s, 1 death, no page errors, screenshots sent, 6 beat stills retained in-repo). Limits: the old capture records no death cause/phase/input, no gameplay frames (all six stills are staged re-entry shots — every HUD reads Time 00:00.00 / Deaths 0 — and `shots.json` predates capture-kind labels), no per-run retention (the `none` unanimity rests on the final scores plus the empty repeatedFlaws intersection only), and branches/tiers visited are unrecorded.
- Completion / route coverage: complete. Crown collected with maxX 5615 against crownX 5650; all four checkpoints (1300/2800/3350/4650) passed and every checkpoint gap is under the 2500px desert threshold, so no stretch is unverified. All six beats sit in visited vicinity — but they are staged-teleport stills, not gameplay frames.
- Mechanical checks: clear. No flags: 3 platform keys (cliff/mesa/vaultDeck, dominant share 0.46 — no visual-variety flag and it could never block quality anyway), no clone-similarity comparator fired, and the finale carries 2 hazards with 1 visible in a frozen still (no sleeping/finale-invisible flag).
- Quality: fail on the novelty news floor alone. 4/4 personas name flaw `none` with zero rework votes and zero structural votes; fun (2.20) and fairness (1.92) clear their floors, and the theme/readability/pacing news floors all pass. The single failure is novelty mean 1.33 < 1.5 floor (gap 0.17; per-persona 1.26–1.42, a tight spread, not one outlier). Model opinion on partial evidence: one retained run's scores over 4 of 6 judged beats (below) — four personas judging one summary are four model perspectives, not four playtests. Independent of fidelity: no art order moves this number.
- Fidelity: FAIL (kept separate from quality). The gate math fails on exactly two sub-conditions: needsHuman is non-empty (6 items) and the fidelity flaw label is `missing-elements` rather than `none` — everything else passes (3 shown ≥ 3, 0 contradicted, 1 non-signature unsupported ≤ 1, no signature element missing or unsupported, universe shown, mechanic 2.8 and visual 2.55+ means clear). The only `missing` element (Estrack dish array, 0.09) is non-signature, so the stock "missing signature elements" advice mislabels this failure. Fixing novelty does not fix the dish, and dish art does not raise novelty: the two blockers are independent (re-derivation below).
- Overall: ITERATE/REWORK. This is the committed verdict, not an approval.

## Quality panel

- Marlowe (expert reviewer): fun=2.1 fair=1.9 read=2.4 novel=1.3 pace=2.2 theme=2.1 flaw=none -> iterate
- Vic (contra veteran): fun=2.2 fair=1.9 read=2.5 novel=1.4 pace=2.2 theme=2.3 flaw=none -> iterate
- Sam (casual newcomer): fun=2.1 fair=1.9 read=2.3 novel=1.3 pace=2.3 theme=2.2 flaw=none -> iterate
- Lex (speedrunner): fun=2.3 fair=1.9 read=2.5 novel=1.4 pace=2.4 theme=2.3 flaw=none -> ship
- Means: fun=2.20 fair=1.92 read=2.41 novel=1.33 pace=2.27 theme=2.22
- News floor failures: novelty mean 1.33 < news floor 1.5
- Judged-beat coverage (old `selectPanelShots(..., 4)` over the 6-beat manifest): both panels judged 01-opener (x=150), 02-hazard-bonk (x=1550), 03-hazard-laser (x=2000) and 06-finale (x=5450); 04-hazard-drone (x=2500, Survey Orbiter patrol plus two rescue sample tubes in frame) and 05-hazard-roller (x=3000) were omitted from both passes. The omitted beats carry the themed enemy and the sample-carry verb — the evidence most relevant to a novelty read — so the 1.33 rests on the four beats that show the least of what the brief claims is new.

## News fidelity

- Brief: Level 21 — Phobos Sample Run (news-to-level)
- Gate: FAIL
- Element "H3 rocket": shown (noul=0.94)
- Element "Phobos crater field" [signature]: faint (noul=0.44)
- Element "sample tubes" [signature]: shown (noul=0.81)
- Element "return capsule": faint (noul=0.61)
- Element "Estrack dish array": missing (noul=0.09)
- Element "Mars in sky": shown (noul=0.98)
- Row "First to orbit Phobos, sample surface, return from Mars system" [signature] -> supports (confidence=0.77)
- Row "H3 launch from Tanegashima, night liftoff over beach" -> unsupported (confidence=0.50)
- Row "Arrives Mars next summer, investigates Phobos and Deimos up close" -> supports (confidence=0.56)
- Row "ESA deep-space comms + Estrack ground stations send commands" -> supports (confidence=0.35)
- Space Chicken universe: shown (noul=0.96)
- Needs human: element:Phobos crater field; element:return capsule; row:First to orbit Phobos, sample surface, return from Mars system; row:H3 launch from Tanegashima, night liftoff over beach; row:Arrives Mars next summer, investigates Phobos and Deimos up close; row:ESA deep-space comms + Estrack ground stations send commands
- Judged-evidence coverage (audit item 5): each panel judged 4 of 6 beats (04-drone and 05-roller omitted, above), and the 7-element brief inventory was sliced to the 6 judged entries — "Tanegashima beach gantry" (codeChecks claimed:false) was never judged at all, even though white gantry truss is clearly visible in the 01/02/04/06 stills. `codeChecks` also marks the dish array claimed:false: no dish token appears in the level corpus. Under the fixed rules, "missing" below means not visible in the judged evidence — but the dish determination below goes further, because the retained evidence covers the whole route.
- Dish determination (audit question: absent, outside the selected images, or visually unclear?): functionally absent at gameplay size — recorded here BEFORE any art order. Dish pixels exist only as the right ~40% of `assets/news-phobos-sample-run/bg.png`; there is no dish prop, texture key, or corpus token (no `dish`/`estrack` match anywhere in `levels/`, `config/`, `SpaceChicken.js`, or `assets/` outside those plate pixels). In-game the plate renders as a full-world tilesprite at alpha 0.55 behind the canvas mars gradient (`SpaceChicken.js` plate block), and only its gantry + Mars regions appear in captures: no dishes are visible in any of the six retained beats spanning x=150–5450 (01/02/04/05/06 verified by direct viewing; 03 was judged by the panel, which scored the element 0.09). "Outside the selected images" is ruled out — the dishes are outside ALL six beats, judged and unjudged — and the batch-agent observer independently reports dish plate regions "cropped/illegible at gameplay size." The supported fix is therefore a dedicated dish prop at gameplay size (fix 1), not a re-shoot of the same beats.
- Faint-element reads (both corroborated by the stored agent observation, human adjudication still required): the crater field (0.44) has only dark cliff/mesa/vaultDeck decks behind it — the plate's crater foreground band is cropped by the tilesprite mapping — and the return capsule (0.61) is a generic crown sprite in 06-finale, not capsule-shaped. Whether crown-as-capsule is an acceptable read is a human call (fix 3).
- Stored observation (not a panel judgment): `evidence/level-21/human.json` (reviewer: "batch-agent (human review of loop-1 evidence)", 2026-10-31) supports all 4 rows from LEVEL DATA (tubes + crown, launch lift + gantry plate, 2 orbiter patrols, 2 laser gates) rather than from the stills, and explicitly declines the crater, capsule, H3-plate, and dish-plate reads. The fixed `confirmationReview()` maps this reviewer to reviewerType agent (matches `/agent/i`), so it clears no needs-human item and the stored `humanConfirmed: []` is correct. Note for the adjudicator: the observation cites tube 2 at x=3350, but level data places the three rescues at x=2250/2560/4550 (3350 is a checkpoint/mesa x) — verify positions against the data, not the note.

## Audit re-derivation: two independent blockers, no named flaw

- Blocker A (quality-side): novelty mean 1.33 < 1.5 news floor, with 4/4 `none` flaws, zero rework votes, and no clone-similarity flag. `panelPassed` with `news:true` is true on every clause except `newsOk`, so the floor is the entire quality failure. Context that keeps this a calibration question rather than a redesign order: the skill's own bands put copied skeletons at 1.1–1.4 and genuine departures at 1.6+, and 1.33 sits in the copied band while the code clone checks (which carry the clone case) find no match and the brief's novelty ledger claims differs-in-all-five against Moonfall/Red Reach/Orbital. With the orbiter/carry beats omitted from both panel passes and only one retained run's scores, the fixed next step is a re-judgment on the full beat sheet (INV-1) — not a reroll to escape the floor, and not a route edit on model opinion alone.
- Blocker B (fidelity-side): Estrack dish array unreadable (0.09) plus the `missing-elements` flaw label plus 6 needs-human items. The dish diagnosis is SUPPORTED (code + full-route captures + two independent observers — determination above), so unlike the novelty read it justifies a level-side order: one dedicated prop (fix 1). The flaw label overstates in one respect: no SIGNATURE element is missing (tubes shown, crater faint), so the stock "missing signature elements" text is corrected in the fix.
- Why independent: blocker A is four model scores about route/verb distinctiveness; blocker B is pixels (dish), a label, and unconfirmed low-confidence reads. Either can clear while the other stands; they share only the rerun that re-judges both.
- Lone death (not a finding): one death at x=1614, inside the x=1550→1650 bonk patrol lane and 64px from the staged 02-hazard-bonk still. Fixed `dominantDeathCluster([1614])` (verified by running the function) returns count 1, which never corroborates; fixed `attributeFailure` returns bot-policy-defect (spread deaths, no hotspot) — on a crown-collected run this is normal play variance, and it names no flaw, no cluster, and no capture for the fix contract.

## Investigation (open)

- INV-1 (novelty calibration on the full beat sheet): does the 1.33 novelty read survive when both panels judge all six beats, including the omitted 04-drone (Survey Orbiter + sample tubes) and 05-roller evidence? Stored scores come from one retained run over 4 judged beats with no clone-flag corroboration, and the omitted beats carry the brief's claimed new verb and themed enemy. No redesign is ordered before this re-judgment lands.
  - Smallest next capture: bounded rerun under the fixed generator (`batchPanelShots` over all 6 beats, `batchInventory` over all 7 elements so the gantry is judged too); record per-run scores with `evidenceSeen`. Only if the floor miss repeats with named route/mechanic evidence does a distinctiveness conversation begin.
  - Rerun: `TYPESAFE_API_KEY=$KEY NEWS_BRIEF=docs/level-builds/21.md node scripts/level-critic.mjs 21`

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [missing-elements] (fidelity, corroborated — supported diagnosis, not a coverage gap) owner: skills/level-art-creator/SKILL.md
   - Evidence: fidelity flaw "missing-elements" (mechanic=2.8 visual=3.55) AND element "Estrack dish array" missing in judged shots (noul=0.09); determination recorded before this order: no dish prop/texture/corpus token exists (codeChecks claimed:false; no dish/estrack match in levels/config/SpaceChicken/assets outside bg-plate pixels), dish pixels live only in the right ~40% of bg.png rendered at alpha 0.55, and no dishes appear in any of the six retained beats spanning x=150–5450 (01/02/04/05/06 viewed directly, 03 judged by the panel; batch-agent observer independently reports plate regions cropped/illegible) — functionally absent at gameplay size, not merely outside the selected images. NOTE: the dish is NON-signature — no signature element is missing (tubes shown 0.81, crater faint 0.44) — so the stock "missing signature elements" text is corrected here.
   - Smallest fix: Build ONE dedicated Estrack dish-array prop (or hazard read) at gameplay size with opener/finale-adjacent coverage, following the h3Rocket precedent (props at x=400 and x=5450); do not re-map the whole plate to chase the cropped region.
   - Recheck: Re-shoot the beat sheet and re-judge with NEWS_BRIEF; the dish element must read shown (noul >= 0.7) from a beat covering the prop location, with no new flaw.
2. [novelty-calibration] (investigation — quality-side blocker, same rerun, no level edit) owner: investigation (capture/panel rerun)
   - Evidence: novelty mean 1.33 < 1.5 floor is the SOLE quality-side failure (4/4 flaw none, 0 rework, 0 structural, fun/fair plus theme/readability/pacing floors pass, no clone flags); scores rest on one retained run over 4/6 judged beats with the Survey Orbiter + sample-carry beats (04/05) omitted, and 1.33 sits in the skill's copied-skeleton band (1.1–1.4) without code corroboration.
   - Smallest fix: Calibrate before editing: bounded rerun judging the FULL 6-beat sheet and 7-element inventory (INV-1); order no redesign before the re-judgment lands.
   - Recheck: Novelty is re-judged from the full beat sheet on a fresh run with evidenceSeen recorded; a distinctiveness edit is considered only if the miss repeats with named route/mechanic evidence.
3. [needs-human] (fidelity) owner: human reviewer (docs/level-reviews/evidence/human.json)
   - Evidence: element:Phobos crater field AND element:return capsule AND row:First to orbit Phobos, sample surface, return from Mars system AND row:H3 launch from Tanegashima, night liftoff over beach AND row:Arrives Mars next summer, investigates Phobos and Deimos up close AND row:ESA deep-space comms + Estrack ground stations send commands are low-confidence (needs-human); stored human.json is batch-agent observation (reviewerType agent under the fixed confirmationReview), which clears nothing; the agent's row support comes from level data with a tube-2 position discrepancy (x=3350 cited vs x=2250/2560/4550 in data) that needs adjudication against the stills and the data.
   - Smallest fix: A human confirms or overrides each low-confidence item against the retained stills and level data, adjudicates the data-vs-still conflicts, and records the judgments in human.json with a human reviewer name.
   - Recheck: Re-run the full critic; needsHuman must be empty for the fidelity gate.

Evidence: docs/level-reviews/evidence/level-21/shots.json
