# Level critic — level 24 (Clutch Crown)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: none
- Telemetry: {"level":24,"outcome":"gate-open","durationSec":71.6,"deaths":2,"deathSpots":[2977,2727],"maxX":6020,"hazardTypesSeen":["laser","drone","boss","boarder"],"errors":[]}
- Quality gate: ITERATE/REWORK
- Loop: 4 (prior top flaw: missing-elements) — LOOP LIMIT REACHED: hand to the user, do not lower the gate
- Pilot runs: 2; repeated flaws across runs: cheap
- Concept gate: PASS

## Quality panel

- Marlowe (expert reviewer): fun=2.0 fair=1.5 read=2.3 novel=1.5 pace=2.0 theme=2.2 flaw=cheap -> iterate
- Vic (contra veteran): fun=2.1 fair=1.4 read=2.2 novel=1.5 pace=2.0 theme=2.4 flaw=none -> iterate
- Sam (casual newcomer): fun=2.1 fair=1.4 read=2.0 novel=1.5 pace=2.0 theme=2.3 flaw=cheap -> iterate
- Lex (speedrunner): fun=2.3 fair=1.5 read=2.2 novel=1.5 pace=2.2 theme=2.4 flaw=cheap -> iterate
- Means: fun=2.14 fair=1.43 read=2.17 novel=1.49 pace=2.06 theme=2.31
- News floor failures: novelty mean 1.49 < news floor 1.5

## News fidelity

- Brief: Level 24 — Clutch Crown (news-to-level, boss theme)
- Gate: FAIL
- Element "Champion King" [signature]: shown (noul=0.89)
- Element "chessboard ranks" [signature]: shown (noul=0.72)
- Element "knight piece": shown (noul=0.97)
- Element "rapid clock": faint (noul=0.46)
- Row "Sindarov's attacking victory over the reigning star decided the showdown" [signature] -> supports (confidence=0.26)
- Row "He overturned a 2.5-point deficit on the final day" -> unsupported (confidence=0.94)
- Row "18 rapid games over three days against four elite rivals" -> supports (confidence=0.49)
- Row "The Geneva title match against Gukesh is next" -> unsupported (confidence=0.26)
- Space Chicken universe: shown (noul=0.92)
- Needs human: element:rapid clock; row:Sindarov's attacking victory over the reigning star decided the showdown; row:18 rapid games over three days against four elite rivals; row:The Geneva title match against Gukesh is next

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [cheap] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 3/4 personas named "cheap"; deathSpots x=2977, 2727; nearest shot 04-hazard-drone.jpg
   - Smallest fix: Fix the clustered death spot: widen the tell window or move the hazard so the death traces to a missed tell.
   - Recheck: Re-run the full critic (npm run critic:level); "cheap" must be gone and no new structural flaw may appear.
2. [needs-human] (fidelity) owner: human reviewer (docs/level-reviews/evidence/human.json)
   - Evidence: element:rapid clock is low-confidence; a human must open the named screenshot in docs/level-reviews/evidence/
   - Smallest fix: Confirm or override "element:rapid clock" against the screenshot and record it in human.json.
   - Recheck: Re-run the full critic; needsHuman must be empty for the fidelity gate.
3. [needs-human] (fidelity) owner: human reviewer (docs/level-reviews/evidence/human.json)
   - Evidence: row:Sindarov's attacking victory over the reigning star decided the showdown is low-confidence; a human must open the named screenshot in docs/level-reviews/evidence/
   - Smallest fix: Confirm or override "row:Sindarov's attacking victory over the reigning star decided the showdown" against the screenshot and record it in human.json.
   - Recheck: Re-run the full critic; needsHuman must be empty for the fidelity gate.
4. [needs-human] (fidelity) owner: human reviewer (docs/level-reviews/evidence/human.json)
   - Evidence: row:18 rapid games over three days against four elite rivals is low-confidence; a human must open the named screenshot in docs/level-reviews/evidence/
   - Smallest fix: Confirm or override "row:18 rapid games over three days against four elite rivals" against the screenshot and record it in human.json.
   - Recheck: Re-run the full critic; needsHuman must be empty for the fidelity gate.
5. [needs-human] (fidelity) owner: human reviewer (docs/level-reviews/evidence/human.json)
   - Evidence: row:The Geneva title match against Gukesh is next is low-confidence; a human must open the named screenshot in docs/level-reviews/evidence/
   - Smallest fix: Confirm or override "row:The Geneva title match against Gukesh is next" against the screenshot and record it in human.json.
   - Recheck: Re-run the full critic; needsHuman must be empty for the fidelity gate.

Evidence: docs/level-reviews/evidence/level-24/shots.json
