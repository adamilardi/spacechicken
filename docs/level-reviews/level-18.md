# Level critic — level 18 (Fear Spike)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: none
- Telemetry: {"level":18,"outcome":"crown-collected","durationSec":94.4,"deaths":5,"deathSpots":[1369,5332,5305,5332,5340],"maxX":5691,"hazardTypesSeen":["laser","bearRaider","crusher","rock"],"errors":[]}
- Quality gate: ITERATE/REWORK
- Loop: 1
- Pilot runs: 2; repeated flaws across runs: cheap
- Concept gate: PASS

## Quality panel

- Marlowe (expert reviewer): fun=2.2 fair=1.5 read=2.4 novel=1.8 pace=2.4 theme=2.3 flaw=cheap -> iterate
- Vic (contra veteran): fun=2.4 fair=1.5 read=2.5 novel=1.8 pace=2.5 theme=2.5 flaw=cheap -> iterate
- Sam (casual newcomer): fun=2.1 fair=1.3 read=2.0 novel=1.8 pace=2.4 theme=2.3 flaw=cheap -> iterate
- Lex (speedrunner): fun=2.3 fair=1.3 read=2.3 novel=1.9 pace=2.5 theme=2.4 flaw=cheap -> iterate
- Means: fun=2.25 fair=1.41 read=2.29 novel=1.82 pace=2.44 theme=2.39

## News fidelity

- Brief: Level 18 — Fear Spike (news-to-level)
- Gate: FAIL
- Needs human: fidelity-panel-unavailable

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [cheap] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "cheap"; deathSpots x=1369, 5332, 5305, 5332; nearest shot 02-hazard-crusher.jpg
   - Smallest fix: Fix the clustered death spot: widen the tell window or move the hazard so the death traces to a missed tell.
   - Recheck: Re-run the full critic (npm run critic:level); "cheap" must be gone and no new structural flaw may appear.

Evidence: docs/level-reviews/evidence/level-18/shots.json
