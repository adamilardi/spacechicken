# Level critic — level 17 (Ticker Plunge)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: skeleton-rhyme (deck layout similarity 1 to level 19 (Hubble Rescue): same width and deck x sequence under new paints); background-recycled (background type 'bastion' already used by levels 11, 16; build report must claim a new composition device)
- Telemetry: {"level":17,"outcome":"crown-collected","durationSec":49.3,"deaths":1,"deathSpots":[5073],"maxX":5658,"hazardTypesSeen":["laser","drone","boulder","rock"],"errors":[]}
- Quality gate: ITERATE/REWORK
- Loop: 3 (prior top flaw: clone)
- Pilot runs: 2; repeated flaws across runs: clone
- Concept gate: FAIL (missing: novelty-ledger, signature-mechanic-canvas, topology-fingerprint, element-inventory>=3, themed-enemy, signature-marking, scenery-only:AI data-center spending boom)

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

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [clone] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "clone"; 02-hazard-drone.jpg (hazard beat: drone at x=1400)
   - Smallest fix: Change the Topology Fingerprint: new route shape plus a new finale rule; do not re-skin the copied skeleton.
   - Recheck: Re-run the full critic (npm run critic:level); "clone" must be gone and no new structural flaw may appear.
2. [skeleton-rhyme] (mechanical) owner: skills/level-creator/SKILL.md
   - Evidence: deck layout similarity 1 to level 19 (Hubble Rescue): same width and deck x sequence under new paints
   - Smallest fix: Re-lay the decks: change the world width and the deck x sequence, not just the paints. A copied x-list under new textures is still the copied skeleton.
   - Recheck: Re-run the full critic (npm run critic:level); "skeleton-rhyme" must be gone and no new structural flaw may appear.
3. [concept:incomplete-brief] (concept) owner: skills/level-creator/SKILL.md
   - Evidence: build brief fails the concept gate: missing novelty-ledger, signature-mechanic-canvas, topology-fingerprint, element-inventory>=3, themed-enemy, signature-marking, scenery-only:AI data-center spending boom
   - Smallest fix: Complete the missing concept artefacts in the build brief (novelty-ledger, signature-mechanic-canvas, topology-fingerprint, element-inventory>=3, themed-enemy, signature-marking, scenery-only:AI data-center spending boom), then re-run npm run critic:concept.
   - Recheck: Concept gate passes (npm run critic:concept) before any art or build spend.
4. [background-recycled] (mechanical) owner: skills/level-art-creator/SKILL.md
   - Evidence: background type 'bastion' already used by levels 11, 16; build report must claim a new composition device
   - Smallest fix: Add a new composition device for the reused background and claim it in the build report.
   - Recheck: Re-run the full critic (npm run critic:level); "background-recycled" must be gone and no new structural flaw may appear.
5. [needs-human] (fidelity) owner: human reviewer (docs/level-reviews/evidence/human.json)
   - Evidence: row:Value plunges, index falls is low-confidence; a human must open the named screenshot in docs/level-reviews/evidence/
   - Smallest fix: Confirm or override "row:Value plunges, index falls" against the screenshot and record it in human.json.
   - Recheck: Re-run the full critic; needsHuman must be empty for the fidelity gate.

Evidence: docs/level-reviews/evidence/level-17/shots.json
