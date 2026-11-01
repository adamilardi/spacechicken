# Level critic — level 20 (Robot Dance Sync)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: skeleton-rhyme (deck layout similarity 1 to level 17 (Ticker Plunge): same width and deck x sequence under new paints)
- Telemetry: {"level":20,"outcome":"timeout","durationSec":150.1,"deaths":16,"deathSpots":[1383,1447,1355,1436,1462,1337,1441,1351,1444,1351,1428,1353,1431,1353,1439,1348],"maxX":1462,"hazardTypesSeen":["laser","drone","boulder","calibrationTech"],"errors":[]}
- Quality gate: ITERATE/REWORK
- Loop: 2 (prior top flaw: clone)
- Pilot runs: 2; repeated flaws across runs: clone
- Concept gate: PASS

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

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [clone] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "clone"; 02-hazard-drone.jpg (hazard beat: drone at x=1400)
   - Smallest fix: Change the Topology Fingerprint: new route shape plus a new finale rule; do not re-skin the copied skeleton.
   - Recheck: Re-run the full critic (npm run critic:level); "clone" must be gone and no new structural flaw may appear.
2. [skeleton-rhyme] (mechanical) owner: skills/level-creator/SKILL.md
   - Evidence: deck layout similarity 1 to level 17 (Ticker Plunge): same width and deck x sequence under new paints
   - Smallest fix: Re-lay the decks: change the world width and the deck x sequence, not just the paints. A copied x-list under new textures is still the copied skeleton.
   - Recheck: Re-run the full critic (npm run critic:level); "skeleton-rhyme" must be gone and no new structural flaw may appear.
3. [missing-elements] (fidelity) owner: skills/level-art-creator/SKILL.md
   - Evidence: fidelity flaw "missing-elements"; mechanic=2.55 visual=3.44
   - Smallest fix: Build the missing signature elements as art, props, or hazards visible at gameplay size.
   - Recheck: Re-run the full critic with NEWS_BRIEF; the fidelity gate must pass.
4. [needs-human] (fidelity) owner: human reviewer (docs/level-reviews/evidence/human.json)
   - Evidence: element:stage formation grid is low-confidence; a human must open the named screenshot in docs/level-reviews/evidence/
   - Smallest fix: Confirm or override "element:stage formation grid" against the screenshot and record it in human.json.
   - Recheck: Re-run the full critic; needsHuman must be empty for the fidelity gate.
5. [needs-human] (fidelity) owner: human reviewer (docs/level-reviews/evidence/human.json)
   - Evidence: element:transport cases is low-confidence; a human must open the named screenshot in docs/level-reviews/evidence/
   - Smallest fix: Confirm or override "element:transport cases" against the screenshot and record it in human.json.
   - Recheck: Re-run the full critic; needsHuman must be empty for the fidelity gate.

Evidence: docs/level-reviews/evidence/level-20/shots.json
