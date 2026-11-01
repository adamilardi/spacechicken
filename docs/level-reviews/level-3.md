# Level critic — level 3 (Orbital Gauntlet)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: none
- Telemetry: {"level":3,"outcome":"timeout","durationSec":90,"deaths":1,"deathSpots":[141],"maxX":301,"hazardTypesSeen":["laser","drone"],"errors":[]}
- Quality gate: ITERATE/REWORK
- Loop: 1
- Pilot runs: 2

## Quality panel

- Marlowe (expert reviewer): fun=1.5 fair=1.6 read=2.2 novel=1.6 pace=1.5 theme=2.1 flaw=stale -> iterate
- Vic (contra veteran): fun=1.4 fair=1.5 read=2.1 novel=1.4 pace=1.4 theme=2.1 flaw=stale -> iterate
- Sam (casual newcomer): fun=1.3 fair=1.4 read=1.8 novel=1.5 pace=1.2 theme=2.0 flaw=blind -> iterate
- Lex (speedrunner): fun=1.5 fair=1.6 read=2.2 novel=1.5 pace=1.5 theme=2.2 flaw=stale -> iterate
- Means: fun=1.45 fair=1.54 read=2.08 novel=1.50 pace=1.41 theme=2.10

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [blind] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 1/4 personas named "blind"; deathSpots x=141; nearest shot 01-opener.jpg
   - Smallest fix: Make the landing/hazard readable in time: move the hazard off the blind landing or add a tell/landmark before the drop.
   - Recheck: Re-run the full critic (npm run critic:level); "blind" must be gone and no new structural flaw may appear.
2. [stale] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 3/4 personas named "stale"; 02-hazard-laser.jpg (hazard beat: laser at x=520)
   - Smallest fix: Replace the signature decision with a verb no sibling teaches the same way, with teach/press/twist beats.
   - Recheck: Re-run the full critic (npm run critic:level); "stale" must be gone and no new structural flaw may appear.

Evidence: docs/level-reviews/evidence/level-3/shots.json
