# Level critic — level 20 (Robot Dance Sync)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: skeleton-rhyme (deck layout similarity 1 to level 17 (Ticker Plunge): same width and deck x sequence under new paints)
- Telemetry: {"level":20,"outcome":"timeout","durationSec":150.1,"deaths":16,"deathSpots":[1383,1447,1355,1436,1462,1337,1441,1351,1444,1351,1428,1353,1431,1353,1439,1348],"maxX":1462,"hazardTypesSeen":["laser","drone","boulder","calibrationTech"],"errors":[]}
- Quality gate: ITERATE/REWORK (committed verdict, retained)
- Loop: 2 (prior top flaw: clone)
- Pilot runs: 2; repeated flaws across runs: clone (per-run telemetry not retained; only the final outcome plus the repeatedFlaws intersection)
- Concept gate: PASS

## Status (separated per 2026-11-01 audit re-derivation)

- Capture validity: partial. `Run: full` means the pipeline ran; this run timed out (150.1s, 16 deaths, no page errors, screenshots sent, 6 beat stills retained in-repo and tracked at HEAD). Limits: the manifest and the retained set carry the same six-beat set but with a 04/05 numbering swap (`shots.json` names 04-setpiece-countdownBoard / 05-hazard-roller while the retained JPGs are 04-hazard-roller / 05-setpiece-countdownBoard; map by slug — 01/02/03/06 align by name). No death cause/phase/input, no gameplay frames (staged beat shots; `shots.json` predates capture-kind labels), no per-run retention (the `clone` repeat rests on the repeatedFlaws label intersection only).
- Completion / route coverage: early stall. Timeout at maxX 1462 (itself a death spot) with the first checkpoint at x=1750 unreached and crownX 5650 unverified: the final 4188px (x=1462–5650, ~74% of the route) are unplayed. Beats at x>=1960 (laser, countdownBoard, roller, finale) are staged stills of unvisited sections; the countdownBoard (x=2400) and roller (x=2900) beats were additionally omitted from both panel passes. Only the opener and the drone beat sit in reached vicinity.
- Mechanical checks: blocked. `skeleton-rhyme` is a code-measured three-way similarity-1.0 skeleton match across levels 17/19/20 (paired comparison below). This level owns the 19–20 differentiation, sequenced after INV-1; level 19 holds as the reference and level 17 owns its side.
- Quality: ITERATE/REWORK. 4/4 `clone` votes (all rework; repeated across 2 runs as a label; model opinion — four personas judging run summaries are four model perspectives, not four playtests), corroborated by the named-comparator mechanical flag with 4/4 clone repeated on all three skeleton-sharing levels. The panel scored a run that never passed x=1462, so the fun/fair/pacing/theme scores describe the stall, not the route. The stored drone-shot citation is struck as non-causal for the topology claim (it sits 3px from the death-cluster center, so it belongs to INV-1, not to clone).
- Fidelity: FAIL (kept separate from quality). The unison-dance "supports" (0.82) rests on stills without motion/event data (model opinion under the fixed rules, not an established reading); the signature stage grid is faint; transport cases are unclaimed plus faint; the Guinness gate is faint; 3 rows are low-confidence; the 7th inventory element (wave light beams) was never judged; stored `human.json` is batch-agent observation (reviewerType agent under the fixed `confirmationReview`), which clears nothing.
- Overall: ITERATE/REWORK. This is the committed verdict, not an approval.

## Quality panel

- Marlowe (expert reviewer): fun=0.5 fair=0.7 read=2.0 novel=0.6 pace=0.8 theme=1.4 flaw=clone -> rework
- Vic (contra veteran): fun=0.5 fair=0.7 read=1.7 novel=0.4 pace=0.8 theme=1.6 flaw=clone -> rework
- Sam (casual newcomer): fun=0.4 fair=0.6 read=1.6 novel=0.4 pace=0.7 theme=1.6 flaw=clone -> rework
- Lex (speedrunner): fun=0.4 fair=0.6 read=2.0 novel=0.4 pace=0.8 theme=1.8 flaw=clone -> rework
- Means: fun=0.44 fair=0.66 read=1.81 novel=0.44 pace=0.78 theme=1.61
- News floor failures: novelty mean 0.44 < news floor 1.5; theme mean 1.61 < news floor 2; readability mean 1.81 < news floor 2; pacing mean 0.78 < news floor 1.5

## News fidelity

- Brief: Level 20 — Robot Dance Sync (news-to-level)
- Gate: FAIL
- Element "humanoid dancer bots" [signature]: shown (noul=0.79)
- Element "stage formation grid" [signature]: faint (noul=0.69)
- Element "transport cases": faint (noul=0.45)
- Element "LinkBots antenna mast": shown (noul=0.88)
- Element "countdown numerals": shown (noul=0.98)
- Element "Guinness certificate gate": faint (noul=0.57)
- Row "110 robots dance in unison 5m43s, wave patterns and formation switches" [signature] -> supports (confidence=0.82)
- Row "LinkBots directs fleets over 5G+WiFi, UWB +-10cm, auto gap-fill" -> supports (confidence=0.30)
- Row "Robots walk from cases, self-calibrate, no per-unit remote" -> unsupported (confidence=0.50)
- Row "Guinness adjudicator counts and certifies on site" -> supports (confidence=0.37)
- Space Chicken universe: shown (noul=0.96)
- Needs human: element:stage formation grid; element:transport cases; element:Guinness certificate gate; row:LinkBots directs fleets over 5G+WiFi, UWB +-10cm, auto gap-fill; row:Robots walk from cases, self-calibrate, no per-unit remote; row:Guinness adjudicator counts and certifies on site
- Judged-beat coverage (fixed `selectPanelShots(..., 4)` over the 6-beat manifest): both panels judged 01-opener (x=150), 02-hazard-drone (x=1400), 03-hazard-laser (x=1960) and 06-finale (x=5450); 04-setpiece-countdownBoard (x=2400) and 05-hazard-roller (x=2900) were omitted from both passes. The judged laser and finale beats are staged stills of unvisited sections (beyond maxX 1462). The "countdown numerals" shown-reading (noul=0.98) therefore rests on incidental visibility in another still, since its own setpiece beat was never judged.
- Synchrony/formation caveat: the fixed persona prompt requires motion or telemetry for synchrony and formation claims, not stills. The unison-dance "supports" (0.82) and the formation-grid readings come from staged stills only — stored telemetry has position polls but no patrol-timing/phase or event data — so they are uncorroborated model opinion, not established fidelity (INV-2). Likewise the fidelityFlaw label "missing-elements" overstates: no element reads missing (three read faint); the failure is faint/low-confidence evidence, and the 7th inventory element "wave light beams" (claimed in codeChecks) was never judged: the panel slices the inventory to six elements without processing the remainder (audit item 5).
- Stored observation (not a panel judgment): `evidence/level-20/human.json` (reviewer: batch-agent on loop-1 evidence, 2026-10-31) confirms only the dancer bots (visible in 02-hazard-drone.jpg, small at drone scale 0.05), reports no clear grid floor in the opener/finale stills and no transport cases in any beat, and disputes three panel rows as cut mechanics (rescue re-sync points, bonk calibration, CROWN_SHIELD adjudicator wave). The fixed `confirmationReview()` maps this reviewer to reviewerType agent, so it clears no needs-human item; the cut-mechanic conflicts need a human adjudicator.

## Audit re-derivation: three-way shared skeleton plus early stall at x=1337–1462

- Metric (fixed `cloneFlags`, `skeleton-rhyme` branch): similarity 1 = identical world width (6000) plus an identical 14-value normalized deck-x sequence. Heights, paints, hazards and gravity differ (below), so the match is the x-skeleton, not the whole level. Level 19 shares the same x-list (verified from its stored report), so the differentiation scope covers three levels.

| Aspect | L17 Ticker Plunge | L19 Hubble Rescue | L20 Robot Dance Sync (this level) |
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
- Recommendation (single): this level OWNS the 19–20 differentiation, SEQUENCED after the navigation investigation (INV-1): the stall fix may already reshape the route, and ordering a full re-lay of a ~74%-unverified route is premature. Level 19 holds as the reference (concept PASS with claimed identity; deepest verified traversal of the triple, maxX 5270); level 17 owns its differentiation (see level-17 review). This review orders NO redesign on L17 or L19.
- Stall (fixed `dominantDeathCluster`, radius 200, verified by running the function): all 16 deaths fall in x=1337–1462 (span 125px), center x=1397, with maxX 1462 itself a death spot — the pilot never passed x=1462 in 150.1s and never reached the first checkpoint at x=1750. This is a separate playability failure from the topology reuse: even a unique skeleton would still stall here. The nearest manifest beat to the cluster center is 02-hazard-drone at x=1400 (3px off; staged still, retained under the matching name).
- Struck citation: the stored `02-hazard-drone.jpg` (hazard beat at x=1400) shows one patrol, not a skeleton — non-causal stock attachment for the clone claim, replaced by the comparator evidence above. Its 3px adjacency to the death-cluster center makes it INV-1 evidence instead.

## Investigation (open)

- INV-1 (early stall at x=1337–1462): what kills the pilot 16x inside a 125px span and caps the run at maxX 1462, short of the first checkpoint at x=1750? Stored evidence has no death causes/events, no input trace, no hazard-phase data, and no gameplay frames (nearest still is the staged drone beat, 3px from the cluster center but a teleported still, not play), and per-run retention is absent — so a bot-policy defect (e.g. drone/laser mistiming) cannot be distinguished from a reproducible design problem. The panel's fun/fair/pacing/theme scores describe this stall, not the unvisited route.
  - Smallest next capture: bounded rerun with death events and gameplay death frames retained; record hazard id/cause/phase, input history, and camera visibility at x≈1397 and whether the stall repeats across fresh starts/phases. The same rerun re-judges the full beat sheet and 7-element inventory. Only propose a level edit if the stall repeats in captured play.
  - Rerun: `TYPESAFE_API_KEY=$KEY NEWS_BRIEF=docs/level-builds/20.md node scripts/level-critic.mjs 20`
- INV-2 (synchrony/formation without motion data): do the patrol-drone waves actually move in unison with wave patterns and formation switches, and does the stage formation grid read at gameplay size? The "supports" (0.82) on the unison row and the faint grid reading (0.69) come from frozen stills; stored telemetry carries no patrol-timing/phase or event data, and the grid's setpiece context was partly outside the judged beats.
  - Smallest next capture: in the INV-1 rerun, retain drone-patrol timing/phase telemetry (or motion frames across phases) plus a beat covering the grid floor at gameplay size; re-judge the unison and formation rows from that evidence. Order no new art before the motion evidence lands.
  - Rerun: `TYPESAFE_API_KEY=$KEY NEWS_BRIEF=docs/level-builds/20.md node scripts/level-critic.mjs 20`

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [navigation:early-stall] (investigation — leads: ~74% of route unverified, gates every other judgment) owner: investigation (capture rerun)
   - Evidence: timeout 150.1s at maxX 1462 (itself a death spot); 16 deaths cluster near x=1397, all within x=1337–1462; first checkpoint x=1750 unreached, crown x=5650 unverified; nearest manifest beat 02-hazard-drone.jpg x=1400 (3px off; staged still, retained under the matching name); no death causes/inputs/phases, no gameplay frames, no per-run retention
   - Smallest fix: Investigate before editing: bounded capture rerun with death events and gameplay death frames retained; record hazard id/cause/phase, input history, and camera visibility at x≈1397 across fresh starts/phases; only propose a level edit if the stall repeats.
   - Recheck: Re-run the full critic twice from fresh starts: maxX must pass x=1462 to checkpoint x=1750 and beyond, and deaths near x=1397 must not recur as a cluster, on both runs.
2. [clone] (quality, corroborated — this level OWNS the 19–20 differentiation, SEQUENCED after INV-1) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "clone" (all rework; repeated across 2 runs as a label) AND three-way deck layout similarity 1 across levels 17/19/20: identical world width 6000 and identical 14-value deck-x sequence under new paints (labDeck/bastionGrate/vaultDeck here), 4/4 clone with repetition on all three levels, novelty mean 0.44 < 1.5 floor (theme/readability/pacing floors also miss, but from a stalled capture); full side-by-side in the re-derivation section above (single cause shared with fix 3; the stored drone-shot citation is struck as non-causal for topology and reassigned to INV-1)
   - Smallest fix: AFTER INV-1 resolves: change L20's Topology Fingerprint — a new deck sequence and height grammar plus a route/finale identity distinct from L19's; do not re-skin the copied skeleton. The stall fix may already reshape the route — fold the differentiation into that edit. L19 holds as the reference; L17 owns its side (see level-17 review). This review orders no redesign on L17 or L19.
   - Recheck: Re-run the full critic: the clone-similarity flag must clear and no persona may name clone from the new route/mechanic evidence, with no new structural flaw.
3. [skeleton-rhyme] (mechanical, blocking — code measurement for the same cause as fix 2, same sequencing) owner: skills/level-creator/SKILL.md
   - Evidence: deck layout similarity 1 to level 17 (Ticker Plunge): same width and deck x sequence under new paints (level 19 shares the same x-list; three-way match)
   - Smallest fix: Re-lay the decks — change the world width and the deck x sequence, not just the paints — as part of the post-INV-1 route work, not before. A copied x-list under new textures is still the copied skeleton.
   - Recheck: Re-run the full critic after INV-1 and the re-lay; "skeleton-rhyme" must be gone and no new structural flaw may appear.
4. [faint-elements] (fidelity — faint elements plus low-confidence rows; human confirmations and motion capture first) owner: skills/level-art-creator/SKILL.md
   - Evidence: signature stage formation grid faint (0.69); transport cases unclaimed in codeChecks (claimed:false) plus faint (0.45); Guinness certificate gate faint (0.57); LinkBots row supports (0.30), cases row unsupported (0.50), adjudicator row supports (0.37) — all needs-human; agent observation reports the rescue re-sync, bonk-calibration, and CROWN_SHIELD adjudicator mechanics cut, conflicting with the panel's supports readings; countdown numerals shown (0.98) rests on incidental visibility (its x=2400 setpiece beat was omitted from both panels and unvisited); unison-dance supports (0.82) has no motion/event basis (INV-2); 7th inventory element "wave light beams" never judged; nothing reads missing so the stock "missing-elements" label overstates
   - Smallest fix: Human confirmations first (fix 5), plus motion/event capture for the synchrony rows (INV-2); determine absent/outside-judged-images/unclear per element before any art order. Build or clarify only human-confirmed gaps, and re-judge the full 7-element inventory with a beat covering each element's location.
   - Recheck: Re-run the full critic with NEWS_BRIEF; the fidelity gate must pass with synchrony rows judged from motion/event evidence and every inventory element judged from a beat covering its location.
5. [needs-human] (fidelity) owner: human reviewer (docs/level-reviews/evidence/human.json)
   - Evidence: element:stage formation grid AND element:transport cases AND element:Guinness certificate gate AND row:LinkBots AND row:cases/calibration AND row:adjudicator are low-confidence (needs-human); stored human.json is batch-agent observation (reviewerType agent under the fixed confirmationReview), which clears nothing; cut-mechanic conflicts with the panel's supports readings need adjudication
   - Smallest fix: A human confirms or overrides each low-confidence item, adjudicates the cut-mechanic conflicts against the retained stills and level data, and records the judgments in human.json with a human reviewer name.
   - Recheck: Re-run the full critic; needsHuman must be empty for the fidelity gate.

Evidence: docs/level-reviews/evidence/level-20/shots.json
