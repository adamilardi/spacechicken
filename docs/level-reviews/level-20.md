# Level critic — level 20 (Robot Dance Sync)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: skeleton-rhyme (deck layout similarity 1 to level 17 (Ticker Plunge): same width and deck x sequence under new paints)
- Telemetry: {"level":20,"outcome":"crown-collected","durationSec":85.9,"deaths":4,"deathSpots":[1423,1663,1441,5178],"maxX":5615,"hazardTypesSeen":["laser","drone","boulder","calibrationTech","rock"],"errors":[]}
- Quality gate: ITERATE/REWORK
- Loop: 1
- Pilot runs: 2; repeated flaws across runs: clone
- Concept gate: PASS

## Quality panel

- Marlowe (expert reviewer): fun=1.4 fair=1.3 read=2.2 novel=0.7 pace=1.8 theme=1.7 flaw=clone -> rework
- Vic (contra veteran): fun=1.7 fair=1.3 read=2.1 novel=0.4 pace=1.8 theme=1.8 flaw=clone -> rework
- Sam (casual newcomer): fun=1.7 fair=1.4 read=2.0 novel=0.4 pace=2.0 theme=1.9 flaw=clone -> iterate
- Lex (speedrunner): fun=1.5 fair=1.3 read=2.2 novel=0.5 pace=2.0 theme=2.0 flaw=clone -> rework
- Means: fun=1.58 fair=1.33 read=2.12 novel=0.49 pace=1.90 theme=1.87
- News floor failures: novelty mean 0.49 < news floor 1.5; theme mean 1.87 < news floor 2

## News fidelity

- Brief: Level 20 — Robot Dance Sync (news-to-level)
- Gate: FAIL
- Element "humanoid dancer bots" [signature]: shown (noul=0.78)
- Element "stage formation grid" [signature]: faint (noul=0.68)
- Element "transport cases": faint (noul=0.51)
- Element "LinkBots antenna mast": shown (noul=0.86)
- Element "countdown numerals": shown (noul=0.97)
- Element "Guinness certificate gate": missing (noul=0.28)
- Row "110 robots dance in unison 5m43s, wave patterns and formation switches" [signature] -> supports (confidence=0.82)
- Row "LinkBots directs fleets over 5G+WiFi, UWB +-10cm, auto gap-fill" -> supports (confidence=0.22)
- Row "Robots walk from cases, self-calibrate, no per-unit remote" -> unsupported (confidence=0.44)
- Row "Guinness adjudicator counts and certifies on site" -> supports (confidence=0.31)
- Space Chicken universe: shown (noul=0.97)
- Human confirmed: element:humanoid dancer bots
- Needs human: element:stage formation grid; element:transport cases; row:LinkBots directs fleets over 5G+WiFi, UWB +-10cm, auto gap-fill; row:Robots walk from cases, self-calibrate, no per-unit remote; row:Guinness adjudicator counts and certifies on site

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
   - Evidence: fidelity flaw "missing-elements"; mechanic=2.48 visual=3.39
   - Smallest fix: Build the missing signature elements as art, props, or hazards visible at gameplay size.
   - Recheck: Re-run the full critic with NEWS_BRIEF; the fidelity gate must pass.
4. [missing-elements] (fidelity) owner: skills/level-art-creator/SKILL.md
   - Evidence: element "Guinness certificate gate" missing in shots (noul=0.28)
   - Smallest fix: Build the missing signature elements as art, props, or hazards visible at gameplay size.
   - Recheck: Re-shoot the beat sheet; the element must judge shown (noul >= 0.7).
5. [needs-human] (fidelity) owner: human reviewer (docs/level-reviews/evidence/human.json)
   - Evidence: element:stage formation grid is low-confidence; a human must open the named screenshot in docs/level-reviews/evidence/
   - Smallest fix: Confirm or override "element:stage formation grid" against the screenshot and record it in human.json.
   - Recheck: Re-run the full critic; needsHuman must be empty for the fidelity gate.

Evidence: docs/level-reviews/evidence/level-20/shots.json
