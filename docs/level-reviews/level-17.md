# Level critic — level 17 (Ticker Plunge)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: skeleton-rhyme (deck layout similarity 1 to level 19 (Hubble Rescue): same width and deck x sequence under new paints); background-recycled (background type 'bastion' already used by levels 11, 16; build report must claim a new composition device)
- Telemetry: {"level":17,"outcome":"crown-collected","durationSec":49.3,"deaths":1,"deathSpots":[5073],"maxX":5658,"hazardTypesSeen":["laser","drone","boulder","rock"],"errors":[]}
- Quality gate: ITERATE/REWORK (committed verdict, retained)
- Loop: 3 (prior top flaw: clone)
- Pilot runs: 2; repeated flaws across runs: clone (per-run telemetry not retained; only the final outcome plus the repeatedFlaws intersection)
- Concept gate: FAIL (missing: novelty-ledger, signature-mechanic-canvas, topology-fingerprint, element-inventory>=3, themed-enemy, signature-marking, scenery-only:AI data-center spending boom)

## Status (separated per 2026-11-01 audit re-derivation)

- Capture validity: valid. `Run: full` means the pipeline ran; here the traversal completed (crown-collected, 49.3s, 1 death, no page errors, screenshots sent, 5/5 beat stills retained in-repo and tracked at HEAD). Limits: no death cause/phase/input, no gameplay frames (all 5 stills are staged beat shots; stored `shots.json` predates capture-kind labels), no per-run retention. The build brief also records a prior Oct 31 capture (crown-collected, 0 deaths, mixed panel flaws), so panel votes are model perspectives on separate captures, not repeated judgments of one capture.
- Completion / route coverage: complete (main route). crown-collected with maxX 5658 at crownX 5650. Alternate branches/tiers are unrecorded in stored telemetry, so off-route sections stay unverified.
- Mechanical checks: blocked. `skeleton-rhyme` is a code-measured exact skeleton match (paired comparison below). `background-recycled` is a visual-variety heuristic (never blocks quality); the build brief already claims a composition device for it (fix 4).
- Quality: ITERATE/REWORK. 4/4 `clone` votes (all iterate; repeated across 2 runs; model opinion — four personas judging run summaries are four model perspectives, not four playtests), corroborated by the similarity-1.0 mechanical flag with a named comparator. The old drone-shot citation is struck as non-causal (below).
- Fidelity: FAIL (kept separate from quality). Gate failed on 3 low-confidence needs-human rows (no `human.json` recorded); mechanic 2.85 / visual 2.86; universe shown; no signature rows, so no signature finding is ordered.
- Overall: ITERATE/REWORK. This is the committed verdict, not an approval.

## Quality panel

- Marlowe (expert reviewer): fun=1.9 fair=1.8 read=2.3 novel=0.7 pace=2.2 theme=2.1 flaw=clone -> iterate
- Vic (contra veteran): fun=1.9 fair=1.7 read=2.4 novel=0.5 pace=2.0 theme=2.2 flaw=clone -> iterate
- Sam (casual newcomer): fun=2.0 fair=1.8 read=2.1 novel=0.5 pace=2.3 theme=2.3 flaw=clone -> iterate
- Lex (speedrunner): fun=2.0 fair=1.7 read=2.4 novel=0.5 pace=2.2 theme=2.3 flaw=clone -> iterate
- Means: fun=1.95 fair=1.73 read=2.29 novel=0.54 pace=2.16 theme=2.22
- News floor failures: novelty mean 0.54 < news floor 1.5

## News fidelity

- Brief: Level 17 — Ticker Plunge (news-to-level)
- Gate: FAIL
- Row "Value plunges, index falls" -> supports (confidence=0.34)
- Row "AI data-center spending boom" -> supports (confidence=0.70)
- Row "Panic spreads through names" -> supports (confidence=0.94)
- Row "Investors must decide: hold or exit" -> supports (confidence=0.48)
- Space Chicken universe: shown (noul=0.95)
- Needs human: row:Value plunges, index falls; row:AI data-center spending boom; row:Investors must decide: hold or exit

## Audit re-derivation: exact shared skeleton with level 19 (side-by-side)

- Metric (fixed `cloneFlags`, `skeleton-rhyme` branch): similarity 1 = identical world width (6000) plus an identical 14-value normalized deck-x sequence. Heights, paints, hazards and gravity differ (below), so the match is the x-skeleton, not the whole level.

| Aspect | L17 Ticker Plunge (this level) | L19 Hubble Rescue |
|---|---|---|
| World / decks | 6000px, 14 decks | 6000px, 14 decks |
| Deck-x sequence | [0.063,0.175,0.183,0.275,0.367,0.375,0.458,0.558,0.567,0.658,0.758,0.783,0.858,0.942] | identical (14/14) |
| Deck paints | bastionDeck + bastionGrate + vaultDeck (dom 0.57) | issHull + stationPanel + vaultDeck |
| Height bands | differ at 11/14 positions | differ at 11/14 positions |
| Hazard kit (static) | 3 types, 6 hazards (laser, drone, roller) | 4 types, 8 hazards (laser, drip, drone, roller) |
| Checkpoints | 1750, 2600, 3350, 4650 | 1750, 2600, 3500, 4650 |
| Crown | x=5650, finale visible 1/1 | x=5650 |
| Background / gravity | bastion / 300 | iss / 200 |
| Run outcome | crown-collected, maxX 5658, 1 death (x=5073) | timeout, maxX 5270, 12 deaths |
| Panel | 4/4 clone, all iterate, repeated | 4/4 clone (1 rework + 3 iterate), repeated |
| Concept gate | FAIL (no topology fingerprint claimed) | PASS |

- Deliberate campaign reuse (plausible): the shared checkpoint spine (1750/2600/4650) and crown at x=5650 read as a news-level format both levels follow. That format may stay.
- Duplicate experience (supported): the full 14-value x-list is identical under new paints, 4/4 `clone` votes fired on BOTH levels with repetition across runs on both, and novelty mean sits at 0.54 against the 1.5 floor. The match survives the paint/height/hazard/gravity swaps, so it is structural, not a reskin read. Level 20 shares the same x-list too (verified from its stored report), so the differentiation scope covers a three-level shared skeleton; the L19/L20 reviews own their sides.
- Recommendation (single): this level owns its differentiation; level 19 holds as the paired reference. Rationale: (1) concept standing — L19's brief passed the concept gate with a claimed identity while this brief lacks even a topology fingerprint, so L17 is the unclaimed echo; (2) committed verdict — this review already carries ITERATE/REWORK on clone; (3) scope — the missing novelty-ledger and topology-fingerprint decide the differentiation shape, which is why the concept prerequisite leads this contract. This review orders NO redesign on L19 or L20 and NO new panel before the concept prerequisite passes.
- Struck citation: the stored `02-hazard-drone.jpg` (drone at x=1400) sits 3673px from the single death at x=5073 and shows one patrol, not a skeleton — non-causal stock attachment, replaced by the comparator evidence above. All 5 retained stills are staged beat shots, not gameplay frames.

## Investigation

- None open. The single death at x=5073 (between checkpoint 4650 and crown 5650; nearest retained still 05-finale.jpg at x=5450) forms no cluster (count 1 < 2) and supports no fairness diagnosis: no toll, no stall, no repeated hotspot. The fidelity needs-human rows are human-confirmation tasks (fix 5), not captures.

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [concept:incomplete-brief] (concept, prerequisite — gates all art and build spend) owner: skills/level-creator/SKILL.md
   - Evidence: build brief fails the concept gate: missing novelty-ledger, signature-mechanic-canvas, topology-fingerprint, element-inventory>=3, themed-enemy, signature-marking, scenery-only:AI data-center spending boom
   - Smallest fix: Complete the missing concept artefacts in the build brief (novelty-ledger, signature-mechanic-canvas, topology-fingerprint, element-inventory>=3, themed-enemy, signature-marking, scenery-only:AI data-center spending boom), then re-run npm run critic:concept. The novelty-ledger and topology-fingerprint decide the differentiation scope against the L19/L20 shared skeleton before any rebuild spend.
   - Recheck: Concept gate passes (npm run critic:concept) before any art or build spend. No full redesign and no new panel before this prerequisite.
2. [clone] (quality, corroborated — this level owns the differentiation; level 19 holds) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "clone" (all iterate; repeated across 2 runs) AND deck layout similarity 1 to level 19 (Hubble Rescue): identical world width 6000 and identical 14-value deck-x sequence under new paints (bastionDeck/bastionGrate/vaultDeck vs issHull/stationPanel/vaultDeck), 4/4 clone with repetition on L19 as well, novelty mean 0.54 < 1.5 floor; full side-by-side in the re-derivation section above (single cause shared with fix 3; the stored drone-shot citation is struck as non-causal)
   - Smallest fix: After the concept prerequisite passes: change L17's Topology Fingerprint per the completed concept artefacts — a new deck sequence and height grammar plus a route/finale identity distinct from L19's; do not re-skin the copied skeleton. L19 holds as the reference; L19/L20 reviews own their sides.
   - Recheck: Re-run the full critic: the clone-similarity flag must clear and no persona may name clone from the new route/mechanic evidence, with no new structural flaw.
3. [skeleton-rhyme] (mechanical, blocking — code measurement for the same cause as fix 2) owner: skills/level-creator/SKILL.md
   - Evidence: deck layout similarity 1 to level 19 (Hubble Rescue): same width and deck x sequence under new paints
   - Smallest fix: Re-lay the decks: change the world width and the deck x sequence, not just the paints. A copied x-list under new textures is still the copied skeleton.
   - Recheck: Re-run the full critic (npm run critic:level); "skeleton-rhyme" must be gone and no new structural flaw may appear.
4. [background-recycled] (mechanical, visual-variety heuristic — never blocks quality) owner: skills/level-art-creator/SKILL.md
   - Evidence: background type 'bastion' already used by levels 11, 16; build brief already claims a composition device (full-bleed generated plunging-ticker backdrop plate at depth -20, alpha 0.55 — a device no shipped bastion level uses; levels 11/16 render bare bastion). The flag persists because the check is paint-agnostic (visual-variety heuristic).
   - Smallest fix: Visual-variety heuristic, not a quality proof: keep the claimed backdrop-plate device in the build brief as the art-direction exception, or introduce a distinct composition device as part of the differentiation above.
   - Recheck: Re-run the full critic: the build report must carry the art-direction exception for the reused background, or the background must read distinct.
5. [needs-human] (fidelity) owner: human reviewer (docs/level-reviews/evidence/human.json)
   - Evidence: row:Value plunges, index falls AND row:AI data-center spending boom AND row:Investors must decide: hold or exit are low-confidence (0.34 / 0.70 / 0.48, all need-human at <0.8); no human.json recorded; a human must open the named screenshots in docs/level-reviews/evidence/
   - Smallest fix: Confirm or override each low-confidence row against the screenshots and record the judgments in human.json.
   - Recheck: Re-run the full critic; needsHuman must be empty for the fidelity gate.

Evidence: docs/level-reviews/evidence/level-17/shots.json
