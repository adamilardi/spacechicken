# Level critic — level 23 (Reconnection)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: none
- Telemetry: {"level":23,"outcome":"crown-collected","durationSec":52.4,"deaths":1,"deathSpots":[1785],"maxX":4252,"hazardTypesSeen":["reconnectionSprite","drone","laser","acid_drip","cosmic_ray","rock"],"errors":[]}
- Quality gate: ITERATE/REWORK
- Loop: 1
- Pilot runs: 2
- Concept gate: PASS

## Quality panel

- Marlowe (expert reviewer): fun=2.4 fair=1.9 read=2.2 novel=1.9 pace=2.4 theme=2.4 flaw=none -> iterate
- Vic (contra veteran): fun=2.4 fair=1.8 read=2.4 novel=2.0 pace=2.4 theme=2.4 flaw=none -> iterate
- Sam (casual newcomer): fun=2.4 fair=1.8 read=2.1 novel=1.8 pace=2.4 theme=2.5 flaw=none -> iterate
- Lex (speedrunner): fun=2.5 fair=1.8 read=2.3 novel=2.0 pace=2.5 theme=2.5 flaw=none -> ship
- Means: fun=2.43 fair=1.82 read=2.25 novel=1.91 pace=2.42 theme=2.47

## News fidelity

- Brief: Level 23 — Reconnection (news-to-level)
- Gate: FAIL
- Element "Reconnection Sprite" [signature]: shown (noul=0.87)
- Element "twin satellites": missing (noul=0.28)
- Element "cusp funnel" [signature]: shown (noul=0.77)
- Element "magnetosphere arcs": shown (noul=0.86)
- Row "Magnetic field lines snap and explosively reconnect, releasing energy" [signature] -> supports (confidence=0.79)
- Row "Solar wind slams the magnetopause and accelerates particles" -> supports (confidence=0.55)
- Row "Twin TRACERS satellites fly in formation through the cusp" -> unsupported (confidence=0.33)
- Row "The cusp funnels field lines down to the pole" -> supports (confidence=0.64)
- Space Chicken universe: shown (noul=0.96)
- Needs human: row:Magnetic field lines snap and explosively reconnect, releasing energy; row:Solar wind slams the magnetopause and accelerates particles; row:Twin TRACERS satellites fly in formation through the cusp; row:The cusp funnels field lines down to the pole

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [missing-elements] (fidelity) owner: skills/level-art-creator/SKILL.md
   - Evidence: element "twin satellites" missing in shots (noul=0.28)
   - Smallest fix: Build the missing signature elements as art, props, or hazards visible at gameplay size.
   - Recheck: Re-shoot the beat sheet; the element must judge shown (noul >= 0.7).
2. [needs-human] (fidelity) owner: human reviewer (docs/level-reviews/evidence/human.json)
   - Evidence: row:Magnetic field lines snap and explosively reconnect, releasing energy is low-confidence; a human must open the named screenshot in docs/level-reviews/evidence/
   - Smallest fix: Confirm or override "row:Magnetic field lines snap and explosively reconnect, releasing energy" against the screenshot and record it in human.json.
   - Recheck: Re-run the full critic; needsHuman must be empty for the fidelity gate.
3. [needs-human] (fidelity) owner: human reviewer (docs/level-reviews/evidence/human.json)
   - Evidence: row:Solar wind slams the magnetopause and accelerates particles is low-confidence; a human must open the named screenshot in docs/level-reviews/evidence/
   - Smallest fix: Confirm or override "row:Solar wind slams the magnetopause and accelerates particles" against the screenshot and record it in human.json.
   - Recheck: Re-run the full critic; needsHuman must be empty for the fidelity gate.
4. [needs-human] (fidelity) owner: human reviewer (docs/level-reviews/evidence/human.json)
   - Evidence: row:Twin TRACERS satellites fly in formation through the cusp is low-confidence; a human must open the named screenshot in docs/level-reviews/evidence/
   - Smallest fix: Confirm or override "row:Twin TRACERS satellites fly in formation through the cusp" against the screenshot and record it in human.json.
   - Recheck: Re-run the full critic; needsHuman must be empty for the fidelity gate.
5. [needs-human] (fidelity) owner: human reviewer (docs/level-reviews/evidence/human.json)
   - Evidence: row:The cusp funnels field lines down to the pole is low-confidence; a human must open the named screenshot in docs/level-reviews/evidence/
   - Smallest fix: Confirm or override "row:The cusp funnels field lines down to the pole" against the screenshot and record it in human.json.
   - Recheck: Re-run the full critic; needsHuman must be empty for the fidelity gate.

Evidence: docs/level-reviews/evidence/level-23/shots.json
