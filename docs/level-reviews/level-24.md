# Level critic — level 24 (Clutch Crown)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: none
- Telemetry: {"level":24,"outcome":"gate-open","durationSec":44.1,"deaths":0,"deathSpots":[],"maxX":6017,"hazardTypesSeen":["laser","drone","boss"],"errors":[]}
- Quality gate: ITERATE/REWORK
- Loop: 3 (prior top flaw: sleeping-finale)
- Pilot runs: 2; repeated flaws across runs: sleeping-finale
- Concept gate: PASS

## Quality panel

- Marlowe (expert reviewer): fun=1.9 fair=1.9 read=2.3 novel=1.5 pace=1.8 theme=2.1 flaw=sleeping-finale -> iterate
- Vic (contra veteran): fun=2.0 fair=1.8 read=2.2 novel=1.6 pace=1.7 theme=2.1 flaw=sleeping-finale -> iterate
- Sam (casual newcomer): fun=2.0 fair=1.9 read=2.1 novel=1.4 pace=1.9 theme=2.2 flaw=sleeping-finale -> iterate
- Lex (speedrunner): fun=2.2 fair=1.8 read=2.2 novel=1.5 pace=2.0 theme=2.4 flaw=sleeping-finale -> iterate
- Means: fun=2.03 fair=1.86 read=2.19 novel=1.51 pace=1.84 theme=2.21

## News fidelity

- Brief: Level 24 — Clutch Crown (news-to-level, boss theme)
- Gate: FAIL
- Element "Champion King" [signature]: shown (noul=0.89)
- Element "chessboard ranks" [signature]: faint (noul=0.68)
- Element "knight piece": shown (noul=0.95)
- Element "rapid clock": missing (noul=0.39)
- Row "Sindarov's attacking victory over the reigning star decided the showdown" [signature] -> supports (confidence=0.30)
- Row "He overturned a 2.5-point deficit on the final day" -> unsupported (confidence=0.92)
- Row "18 rapid games over three days against four elite rivals" -> unsupported (confidence=0.50)
- Row "The Geneva title match against Gukesh is next" -> unsupported (confidence=0.20)
- Space Chicken universe: shown (noul=0.96)
- Needs human: element:chessboard ranks; row:Sindarov's attacking victory over the reigning star decided the showdown; row:18 rapid games over three days against four elite rivals; row:The Geneva title match against Gukesh is next

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [missing-elements] (fidelity) owner: skills/level-art-creator/SKILL.md
   - Evidence: element "rapid clock" missing in shots (noul=0.39)
   - Smallest fix: Build the missing signature elements as art, props, or hazards visible at gameplay size.
   - Recheck: Re-shoot the beat sheet; the element must judge shown (noul >= 0.7).
2. [sleeping-finale] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "sleeping-finale"; 06-finale.jpg (crown approach and finale pressure); crownX=6550
   - Smallest fix: Add finale pressure within 900px of the crown on every route to it.
   - Recheck: Re-run the full critic (npm run critic:level); "sleeping-finale" must be gone and no new structural flaw may appear.
3. [needs-human] (fidelity) owner: human reviewer (docs/level-reviews/evidence/human.json)
   - Evidence: element:chessboard ranks is low-confidence; a human must open the named screenshot in docs/level-reviews/evidence/
   - Smallest fix: Confirm or override "element:chessboard ranks" against the screenshot and record it in human.json.
   - Recheck: Re-run the full critic; needsHuman must be empty for the fidelity gate.
4. [needs-human] (fidelity) owner: human reviewer (docs/level-reviews/evidence/human.json)
   - Evidence: row:Sindarov's attacking victory over the reigning star decided the showdown is low-confidence; a human must open the named screenshot in docs/level-reviews/evidence/
   - Smallest fix: Confirm or override "row:Sindarov's attacking victory over the reigning star decided the showdown" against the screenshot and record it in human.json.
   - Recheck: Re-run the full critic; needsHuman must be empty for the fidelity gate.
5. [needs-human] (fidelity) owner: human reviewer (docs/level-reviews/evidence/human.json)
   - Evidence: row:18 rapid games over three days against four elite rivals is low-confidence; a human must open the named screenshot in docs/level-reviews/evidence/
   - Smallest fix: Confirm or override "row:18 rapid games over three days against four elite rivals" against the screenshot and record it in human.json.
   - Recheck: Re-run the full critic; needsHuman must be empty for the fidelity gate.

Evidence: docs/level-reviews/evidence/level-24/shots.json
