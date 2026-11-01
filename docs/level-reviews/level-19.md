# Level critic — level 19 (Hubble Rescue)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: skeleton-rhyme (deck layout similarity 1 to level 17 (Ticker Plunge): same width and deck x sequence under new paints)
- Telemetry: {"level":19,"outcome":"timeout","durationSec":150.2,"deaths":12,"deathSpots":[3707,2877,2933,4907,5220,4889,4935,5235,5251,5241,4942,4905],"maxX":5270,"hazardTypesSeen":["laser","drone","boulder","acid_drip"],"errors":[]}
- Quality gate: ITERATE/REWORK
- Loop: 2 (prior top flaw: clone)
- Pilot runs: 2; repeated flaws across runs: clone
- Concept gate: PASS

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

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [clone] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "clone"; 02-setpiece-rfiEnvelope.jpg (set piece: rfiEnvelope at x=950)
   - Smallest fix: Change the Topology Fingerprint: new route shape plus a new finale rule; do not re-skin the copied skeleton.
   - Recheck: Re-run the full critic (npm run critic:level); "clone" must be gone and no new structural flaw may appear.
2. [skeleton-rhyme] (mechanical) owner: skills/level-creator/SKILL.md
   - Evidence: deck layout similarity 1 to level 17 (Ticker Plunge): same width and deck x sequence under new paints
   - Smallest fix: Re-lay the decks: change the world width and the deck x sequence, not just the paints. A copied x-list under new textures is still the copied skeleton.
   - Recheck: Re-run the full critic (npm run critic:level); "skeleton-rhyme" must be gone and no new structural flaw may appear.
3. [missing-elements] (fidelity) owner: skills/level-art-creator/SKILL.md
   - Evidence: fidelity flaw "missing-elements"; mechanic=2.45 visual=3.49
   - Smallest fix: Build the missing signature elements as art, props, or hazards visible at gameplay size.
   - Recheck: Re-run the full critic with NEWS_BRIEF; the fidelity gate must pass.
4. [missing-elements] (fidelity) owner: skills/level-art-creator/SKILL.md
   - Evidence: element "capture net" missing in shots (noul=0.14)
   - Smallest fix: Build the missing signature elements as art, props, or hazards visible at gameplay size.
   - Recheck: Re-shoot the beat sheet; the element must judge shown (noul >= 0.7).
5. [needs-human] (fidelity) owner: human reviewer (docs/level-reviews/evidence/human.json)
   - Evidence: element:reboost flame is low-confidence; a human must open the named screenshot in docs/level-reviews/evidence/
   - Smallest fix: Confirm or override "element:reboost flame" against the screenshot and record it in human.json.
   - Recheck: Re-run the full critic; needsHuman must be empty for the fidelity gate.

Evidence: docs/level-reviews/evidence/level-19/shots.json
