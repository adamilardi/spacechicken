# Level critic — level 21 (Phobos Sample Run)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: none
- Telemetry: {"level":21,"outcome":"crown-collected","durationSec":66.8,"deaths":1,"deathSpots":[1614],"maxX":5615,"hazardTypesSeen":["laser","drone","boulder","signalTech","rock"],"errors":[]}
- Quality gate: ITERATE/REWORK
- Loop: 2 (prior top flaw: missing-elements)
- Pilot runs: 2
- Concept gate: PASS

## Quality panel

- Marlowe (expert reviewer): fun=2.1 fair=1.9 read=2.4 novel=1.3 pace=2.2 theme=2.1 flaw=none -> iterate
- Vic (contra veteran): fun=2.2 fair=1.9 read=2.5 novel=1.4 pace=2.2 theme=2.3 flaw=none -> iterate
- Sam (casual newcomer): fun=2.1 fair=1.9 read=2.3 novel=1.3 pace=2.3 theme=2.2 flaw=none -> iterate
- Lex (speedrunner): fun=2.3 fair=1.9 read=2.5 novel=1.4 pace=2.4 theme=2.3 flaw=none -> ship
- Means: fun=2.20 fair=1.92 read=2.41 novel=1.33 pace=2.27 theme=2.22
- News floor failures: novelty mean 1.33 < news floor 1.5

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

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [missing-elements] (fidelity) owner: skills/level-art-creator/SKILL.md
   - Evidence: fidelity flaw "missing-elements"; mechanic=2.8 visual=3.55
   - Smallest fix: Build the missing signature elements as art, props, or hazards visible at gameplay size.
   - Recheck: Re-run the full critic with NEWS_BRIEF; the fidelity gate must pass.
2. [missing-elements] (fidelity) owner: skills/level-art-creator/SKILL.md
   - Evidence: element "Estrack dish array" missing in shots (noul=0.09)
   - Smallest fix: Build the missing signature elements as art, props, or hazards visible at gameplay size.
   - Recheck: Re-shoot the beat sheet; the element must judge shown (noul >= 0.7).
3. [needs-human] (fidelity) owner: human reviewer (docs/level-reviews/evidence/human.json)
   - Evidence: element:Phobos crater field is low-confidence; a human must open the named screenshot in docs/level-reviews/evidence/
   - Smallest fix: Confirm or override "element:Phobos crater field" against the screenshot and record it in human.json.
   - Recheck: Re-run the full critic; needsHuman must be empty for the fidelity gate.
4. [needs-human] (fidelity) owner: human reviewer (docs/level-reviews/evidence/human.json)
   - Evidence: element:return capsule is low-confidence; a human must open the named screenshot in docs/level-reviews/evidence/
   - Smallest fix: Confirm or override "element:return capsule" against the screenshot and record it in human.json.
   - Recheck: Re-run the full critic; needsHuman must be empty for the fidelity gate.
5. [needs-human] (fidelity) owner: human reviewer (docs/level-reviews/evidence/human.json)
   - Evidence: row:First to orbit Phobos, sample surface, return from Mars system is low-confidence; a human must open the named screenshot in docs/level-reviews/evidence/
   - Smallest fix: Confirm or override "row:First to orbit Phobos, sample surface, return from Mars system" against the screenshot and record it in human.json.
   - Recheck: Re-run the full critic; needsHuman must be empty for the fidelity gate.

Evidence: docs/level-reviews/evidence/level-21/shots.json
