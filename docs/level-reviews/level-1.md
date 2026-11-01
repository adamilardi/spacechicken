# Level critic — level 1 (Dawn Run)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: none
- Telemetry: {"level":1,"outcome":"crown-collected","durationSec":23.5,"deaths":0,"deathSpots":[],"maxX":1799,"hazardTypesSeen":["rock"],"errors":[]}
- Quality gate: ITERATE/REWORK
- Loop: 2
- Pilot runs: 2; repeated flaws across runs: sleeping-finale

## Quality panel

- Marlowe (expert reviewer): fun=1.3 fair=2.4 read=2.4 novel=1.0 pace=0.6 theme=1.5 flaw=sleeping-finale -> iterate
- Vic (contra veteran): fun=1.1 fair=1.9 read=2.5 novel=0.9 pace=0.4 theme=1.4 flaw=sleeping-finale -> iterate
- Sam (casual newcomer): fun=1.5 fair=2.3 read=2.3 novel=1.0 pace=0.7 theme=1.5 flaw=sleeping-finale -> iterate
- Lex (speedrunner): fun=1.3 fair=2.3 read=2.6 novel=0.9 pace=0.9 theme=1.5 flaw=sleeping-finale -> iterate
- Means: fun=1.33 fair=2.23 read=2.43 novel=0.94 pace=0.64 theme=1.46

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [sleeping-finale] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "sleeping-finale"; 03-finale.jpg (crown approach and finale pressure); crownX=1800
   - Smallest fix: Add finale pressure within 900px of the crown on every route to it.
   - Recheck: Re-run the full critic (npm run critic:level); "sleeping-finale" must be gone and no new structural flaw may appear.

Evidence: docs/level-reviews/evidence/level-1/shots.json
