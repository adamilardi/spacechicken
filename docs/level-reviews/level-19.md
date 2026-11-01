# Level critic — level 19 (Hubble Rescue)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: skeleton-rhyme (deck layout similarity 1 to level 17 (Ticker Plunge): same width and deck x sequence under new paints)
- Telemetry: {"level":19,"outcome":"timeout","durationSec":150.2,"deaths":12,"deathSpots":[3707,2877,2933,4907,5220,4889,4935,5235,5251,5241,4942,4905],"maxX":5270,"hazardTypesSeen":["laser","drone","boulder","acid_drip"],"errors":[]}
- Quality gate: ITERATE/REWORK (committed verdict, retained)
- Loop: 2 (prior top flaw: clone)
- Pilot runs: 2; repeated flaws across runs: clone (per-run telemetry not retained; only the final outcome plus the repeatedFlaws intersection)
- Concept gate: PASS

## Status (separated per 2026-11-01 audit re-derivation)

- Capture validity: partial. `Run: full` means the pipeline ran; this run timed out (150.2s, 12 deaths, no page errors, screenshots sent, 6 beat stills retained in-repo and tracked at HEAD). Limits: the retained set does not match the judged manifest — `shots.json` names 02-setpiece-rfiEnvelope / 03-hazard-drip / 04-hazard-laser / 05-hazard-drone while the retained JPGs are 02-hazard-drip / 03-hazard-laser / 04-hazard-roller / 05-setpiece-rfiEnvelope (only 01-opener and 06-finale align by name; the judged drone beat at x=3250 has no retained counterpart and a roller still is retained without a manifest entry), so the judged middle beats cannot be visually verified from retained files by name. No death cause/phase/input, no gameplay frames (staged beat shots; `shots.json` predates capture-kind labels), no per-run retention (the `clone` repeat rests on the repeatedFlaws label intersection only).
- Completion / route coverage: partial (main route). Timeout at maxX 5270 with crownX 5650: the final 380px (finale approach plus crown) are unplayed, and the 06-finale still (x=5450) is a staged still of an unreached section. Alternate branches/tiers are unrecorded in stored telemetry, so off-route sections stay unverified.
- Mechanical checks: blocked. `skeleton-rhyme` is a code-measured three-way similarity-1.0 skeleton match across levels 17/19/20 (paired comparison below). This level holds as the reference; levels 17 and 20 own their differentiation.
- Quality: ITERATE/REWORK. 4/4 `clone` votes (1 rework + 3 iterate; repeated across 2 runs as a label; model opinion — four personas judging run summaries are four model perspectives, not four playtests), corroborated by the named-comparator mechanical flag with 4/4 clone repeated on all three skeleton-sharing levels. The stored setpiece-shot citation is struck as stale/non-causal (below).
- Fidelity: FAIL (kept separate from quality). One non-signature element reads missing, one element faint, two rows unsupported (one signature); 4 needs-human items; the 7th inventory element (altitude gate 600km) was never judged; stored `human.json` is batch-agent observation (reviewerType agent under the fixed `confirmationReview`), which clears nothing; the panel/agent conflict on the RFI envelopes is open.
- Overall: ITERATE/REWORK. This is the committed verdict, not an approval.

## Quality panel

- Marlowe (expert reviewer): fun=1.2 fair=1.0 read=2.0 novel=0.6 pace=1.5 theme=2.1 flaw=clone -> rework
- Vic (contra veteran): fun=1.5 fair=1.0 read=2.1 novel=0.5 pace=1.6 theme=2.3 flaw=clone -> iterate
- Sam (casual newcomer): fun=1.3 fair=1.0 read=1.8 novel=0.6 pace=1.7 theme=2.4 flaw=clone -> iterate
- Lex (speedrunner): fun=1.3 fair=1.0 read=2.1 novel=0.6 pace=1.6 theme=2.4 flaw=clone -> iterate
- Means: fun=1.34 fair=0.99 read=2.00 novel=0.57 pace=1.60 theme=2.28
- News floor failures: novelty mean 0.57 < news floor 1.5

## News fidelity

- Brief: Level 19 — Hubble Rescue (news-to-level)
- Gate: FAIL
- Element "Hubble tube" [signature]: shown (noul=0.85)
- Element "solar arrays": shown (noul=0.96)
- Element "servicing arms" [signature]: shown (noul=0.90)
- Element "RFI proposal envelopes": shown (noul=0.94)
- Element "capture net": missing (noul=0.14)
- Element "reboost flame": faint (noul=0.49)
- Row "Hubble decayed 583km to 470km, will plunge 2033/34" -> unsupported (confidence=0.34)
- Row "NASA RFI seeks commercial capture + boost to >=600km, must not harm HST" [signature] -> unsupported (confidence=0.40)
- Row "No onboard propulsion, solar activity shifts reentry" -> supports (confidence=0.89)
- Row "Contractor provides servicing spacecraft, mission by 2032" -> supports (confidence=0.73)
- Space Chicken universe: shown (noul=0.97)
- Needs human: element:reboost flame; row:Hubble decayed 583km to 470km, will plunge 2033/34; row:NASA RFI seeks commercial capture + boost to >=600km, must not harm HST; row:Contractor provides servicing spacecraft, mission by 2032
- Judged-beat coverage (fixed `selectPanelShots(..., 4)` over the 6-beat manifest): both panels judged 01-opener (x=150), 02-setpiece-rfiEnvelope (x=950), 03-hazard-drip (x=1400) and 06-finale (x=5450); 04-hazard-laser (x=1960) and 05-hazard-drone (x=3250) were omitted from both passes. The judged finale is a staged still of an unreached section (beyond maxX 5270); the x=1400–5450 stretch is otherwise unseen by either panel.
- Coverage caveat: "capture net" reads missing (noul=0.14) but its location coverage is unknown from stored evidence — "not visible in the judged shots" is not "missing from the game" under the fixed prompt. The 7th inventory element "altitude gate 600km" (claimed in codeChecks) was never judged: the panel slices the inventory to six elements without processing the remainder (audit item 5).
- Stored observation (not a panel judgment): `evidence/level-19/human.json` (reviewer: batch-agent on loop-1 evidence, 2026-10-31) confirms the three needs-human rows from level data plus stills, but disputes the solar-row basis (drip particles cut), leaves capture net and reboost flame unconfirmed, and reports the RFI envelopes absent — contradicting the panel's shown (noul=0.94). The fixed `confirmationReview()` maps this reviewer to reviewerType agent, so it clears no needs-human item; the envelope conflict needs a human adjudicator.

## Audit re-derivation: three-way shared skeleton plus late death clusters

- Metric (fixed `cloneFlags`, `skeleton-rhyme` branch): similarity 1 = identical world width (6000) plus an identical 14-value normalized deck-x sequence. Heights, paints, hazards and gravity differ (below), so the match is the x-skeleton, not the whole level. Level 20 shares the same x-list (verified from its stored report), so the differentiation scope covers three levels.

| Aspect | L17 Ticker Plunge | L19 Hubble Rescue (this level) | L20 Robot Dance Sync |
|---|---|---|---|
| World / decks | 6000px, 14 decks | 6000px, 14 decks | 6000px, 14 decks |
| Deck-x sequence | [0.063,0.175,0.183,0.275,0.367,0.375,0.458,0.558,0.567,0.658,0.758,0.783,0.858,0.942] | identical (14/14) | identical (14/14) |
| Deck paints | bastionDeck + bastionGrate + vaultDeck (dom 0.57) | issHull + stationPanel + vaultDeck (dom 0.57) | labDeck + bastionGrate + vaultDeck (dom 0.57) |
| Height bands | differ pairwise (L17–L19 11/14, L19–L20 11/14, L17–L20 5/14) | differ pairwise (L17–L19 11/14, L19–L20 11/14, L17–L20 5/14) | differ pairwise (L17–L19 11/14, L19–L20 11/14, L17–L20 5/14) |
| Hazard kit (static) | 3 types, 6 hazards (laser, drone, roller) | 4 types, 8 hazards (laser, drip, drone, roller) | 4 types, 8 hazards (laser, drone, roller, bonk) |
| Checkpoints | 1750, 2600, 3350, 4650 | 1750, 2600, 3500, 4650 | 1750, 2600, 3350, 4650 |
| Crown | x=5650, finale visible 1/1 | x=5650, finale visible 1/2 | x=5650, finale visible 1/2 |
| Background / gravity | bastion / 300 | iss / 200 | facility / 240 |
| Run outcome | crown-collected, maxX 5658, 1 death (x=5073) | timeout, maxX 5270, 12 deaths | timeout, maxX 1462, 16 deaths |
| Panel | 4/4 clone, all iterate, repeated | 4/4 clone (1 rework + 3 iterate), repeated | 4/4 clone, all rework, repeated |
| Concept gate | FAIL (no topology fingerprint claimed) | PASS | PASS |

- Deliberate campaign reuse (plausible): the shared checkpoint spine (1750/2600/4650) and crown at x=5650 read as a news-level format all three levels follow. That format may stay.
- Duplicate experience (supported): the full 14-value x-list is identical under new paints, 4/4 `clone` votes with repetition fired on ALL THREE levels, and novelty means sit at 0.54/0.57/0.44 against the 1.5 floor. The match survives the paint/height/hazard/gravity swaps, so it is structural, not a reskin read.
- Recommendation (single): this level HOLDS as the reference; level 17 owns its differentiation (see level-17 review); level 20 owns the 19–20 leg after its navigation investigation (see level-20 review). Rationale: (1) concept standing — L19's brief passed the concept gate with a claimed identity while L17's brief lacks even a topology fingerprint; (2) verified traversal — L19 reached maxX 5270, deepest of the triple, while L20's route is ~74% unverified so its redesign must wait for its playability diagnosis; (3) committed verdicts already place ITERATE/REWORK on all three. This review orders NO redesign on L17 or L20.
- Death clusters (fixed `dominantDeathCluster`, radius 200, verified by running the function): the sorted spots form a 2-cluster at x≈2905 (2877, 2933), a lone death at x=3707, a 5-death dominant cluster at x=4916 (4889, 4905, 4907, 4935, 4942), and a 4-death cluster at x≈5237 (5220, 5235, 5241, 5251). Nine of twelve deaths fall in x≈4900–5250, between checkpoint 4650 and maxX 5270. The nearest manifest beat to the dominant center is 06-finale at x=5450 (534px off; staged still of an unreached section).
- Struck citation: the stored `02-setpiece-rfiEnvelope.jpg` (set piece at x=950) names a file with no retained counterpart (the retained set carries `05-setpiece-rfiEnvelope.jpg`), sits ~4000px from the dominant cluster, and shows one prop, not a skeleton — stale, non-causal stock attachment, replaced by the comparator evidence above. The fixed rule cites the dominant cluster plus the nearest manifest beat (06-finale, staged still).

## Investigation (open)

- INV-1 (late death clusters plus timeout short of crown): what kills the pilot 9x across x≈4900–5250 (5-cluster at x=4916, 4-cluster at x≈5237) and stalls the run at maxX 5270, 380px short of the crown? Stored evidence has no death causes/events, no input trace, no hazard-phase data, and no gameplay frames (nearest manifest still 534px off and itself beyond maxX; all stills staged), and per-run retention is absent — so a bot-policy defect cannot be distinguished from a reproducible design problem. The 2-cluster at x≈2905 and the lone death at x=3707 are too thin for a diagnosis on their own.
  - Smallest next capture: bounded rerun with death events and gameplay death frames retained; record hazard id/cause/phase, input history, and camera visibility at x≈4916/5237 and whether the hotspots repeat across fresh starts/phases. The same rerun refreshes the stale shot manifest and re-judges the full 7-element inventory. Only propose a level edit if the hotspots repeat in captured play.
  - Rerun: `TYPESAFE_API_KEY=$KEY NEWS_BRIEF=docs/level-builds/19.md node scripts/level-critic.mjs 19`

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [navigation:late-death-clusters] (investigation — leads: finale unverified, missing evidence first) owner: investigation (capture rerun)
   - Evidence: timeout 150.2s at maxX 5270, crown x=5650 unverified (final 380px unplayed); 5 deaths cluster near x=4916 (spots x=4889, 4905, 4907, 4935, 4942) plus 4 near x≈5237; nearest manifest beat 06-finale.jpg x=5450 (534px off; staged still of an unreached section); no death causes/inputs/phases, no gameplay frames, no per-run retention
   - Smallest fix: Investigate before editing: bounded capture rerun with death events and gameplay death frames retained; record hazard id/cause/phase, input history, and camera visibility at x≈4916/5237 across fresh starts/phases; only propose a level edit if the hotspots repeat.
   - Recheck: Re-run the full critic twice from fresh starts: no recurring death cluster at x≈4916/5237 and maxX must pass x=5270 to the crown on both runs.
2. [clone] (quality, corroborated — this level HOLDS as reference; L17/L20 reviews own differentiation) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "clone" (1 rework + 3 iterate; repeated across 2 runs as a label) AND three-way deck layout similarity 1 across levels 17/19/20: identical world width 6000 and identical 14-value deck-x sequence under new paints (issHull/stationPanel/vaultDeck here), 4/4 clone with repetition on all three levels, novelty mean 0.57 < 1.5 floor; full side-by-side in the re-derivation section above (single cause shared with fix 3; the stored setpiece-shot citation is struck as stale/non-causal)
   - Smallest fix: No edit ordered on L19: it holds as the reference (concept PASS with claimed identity; deepest verified traversal of the triple, maxX 5270). L17 owns its differentiation (see level-17 review); L20 owns the 19–20 leg after its navigation investigation (see level-20 review). This review orders no redesign on L17 or L20.
   - Recheck: The skeleton-rhyme pairs clear on the L17/L20 reruns; no persona may name clone of L19 from new route/mechanic evidence.
3. [skeleton-rhyme] (mechanical, blocking — code measurement for the same cause as fix 2) owner: skills/level-creator/SKILL.md
   - Evidence: deck layout similarity 1 to level 17 (Ticker Plunge): same width and deck x sequence under new paints (level 20 shares the same x-list; three-way match)
   - Smallest fix: No re-lay ordered on L19 (holds as reference). Clears when L17 and L20 differentiate their deck sequences.
   - Recheck: Re-run the full critic on L17/L20 after their differentiation; the skeleton-rhyme pairs with L19 must be gone.
4. [missing-elements] (fidelity — missing-reading plus unsupported rows; human confirmations first) owner: skills/level-art-creator/SKILL.md
   - Evidence: "capture net" missing-reading is non-signature (noul=0.14; location coverage unknown — judged beats cover x=150/950/1400 plus the staged finale, so this is "not visible in judged shots", not proven missing); reboost flame faint (0.49); decay row unsupported (0.34); signature RFI row unsupported (0.40); contractor row supports (0.73) but needs-human; signatureMissing is empty so the stock "missing signature elements" text does not apply; 7th inventory element "altitude gate 600km" never judged; panel/agent conflict on RFI envelopes (shown 0.94 vs agent "absent — no art")
   - Smallest fix: Human confirmations first (fix 5), then targeted art/mechanic work only for human-confirmed gaps; re-judge the full 7-element inventory with a beat covering each element's location. Do not build on the panel-alone missing-reading.
   - Recheck: Re-run the full critic with NEWS_BRIEF; the fidelity gate must pass with every inventory element judged from a beat covering its location.
5. [needs-human] (fidelity) owner: human reviewer (docs/level-reviews/evidence/human.json)
   - Evidence: element:reboost flame AND row:decay AND row:RFI AND row:contractor are low-confidence (needs-human); stored human.json is batch-agent observation (reviewerType agent under the fixed confirmationReview), which clears nothing; RFI-envelope panel/agent conflict open; judged 02/03 still names do not match retained JPG names, so the human must first resolve which retained still shows x≈950/1400
   - Smallest fix: A human confirms or overrides each low-confidence item, adjudicates the RFI-envelope conflict against the retained stills, and records the judgments in human.json with a human reviewer name.
   - Recheck: Re-run the full critic; needsHuman must be empty for the fidelity gate.

Evidence: docs/level-reviews/evidence/level-19/shots.json
