# Level critic — level 13 (Rust Harbor)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: flat-deck (2 deck key(s), dominant share 0.71 across 28 decks); checkpoint-desert (no checkpoint between x=3300 and x=6400)
- Telemetry: {"level":13,"outcome":"timeout","durationSec":320.1,"deaths":44,"deathSpots":[4203,4332,4445,3391,4359,4401,4215,3397,4383,3376,4272,4228,4223,4559,4394,4205,4527,4228,4573,3375,3402,3404,4351,3393,4311,4407,4221,4208,4559,4195,4226,4344,4527,4564,3416,4556,3401,3416,3394,3409,4537,3378,4218,4556],"maxX":4612,"hazardTypesSeen":["sentry","drone","dust_devil","crusher","shrike","boss","acid_drip","boarder"],"errors":[]}
- Quality gate: ITERATE/REWORK
- Loop: 1
- Pilot runs: 2; repeated flaws across runs: cheap

## Quality panel

- Marlowe (expert reviewer): fun=0.7 fair=0.7 read=2.1 novel=0.9 pace=0.3 theme=1.8 flaw=flat -> iterate
- Vic (contra veteran): fun=0.8 fair=0.7 read=1.9 novel=1.0 pace=0.5 theme=2.0 flaw=cheap -> iterate
- Sam (casual newcomer): fun=0.5 fair=0.6 read=1.8 novel=0.9 pace=0.4 theme=2.0 flaw=cheap -> iterate
- Lex (speedrunner): fun=0.7 fair=0.7 read=2.1 novel=1.0 pace=0.4 theme=2.1 flaw=cheap -> iterate
- Means: fun=0.68 fair=0.69 read=1.99 novel=0.94 pace=0.42 theme=1.98

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [cheap] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 3/4 personas named "cheap"; deathSpots x=4203, 4332, 4445, 3391
   - Smallest fix: Fix the clustered death spot: widen the tell window or move the hazard so the death traces to a missed tell.
   - Recheck: Re-run the full critic (npm run critic:level); "cheap" must be gone and no new structural flaw may appear.
2. [flat-deck] (mechanical) owner: skills/level-creator/SKILL.md
   - Evidence: 2 deck key(s), dominant share 0.71 across 28 decks
   - Smallest fix: Use at least three platform reads with no key above 80% of decks.
   - Recheck: Re-run the full critic (npm run critic:level); "flat-deck" must be gone and no new structural flaw may appear.
3. [flat] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 1/4 personas named "flat"; 02-hazard-boarder.jpg (hazard beat: boarder at x=550)
   - Smallest fix: Break the deck row: vary widths/heights and add a second route line or set piece in the flagged stretch.
   - Recheck: Re-run the full critic (npm run critic:level); "flat" must be gone and no new structural flaw may appear.
4. [checkpoint-desert] (mechanical) owner: skills/level-creator/SKILL.md
   - Evidence: no checkpoint between x=3300 and x=6400
   - Smallest fix: Add a checkpoint so no gap over 2500px is without one, clear of beam timing and patrol lanes.
   - Recheck: Re-run the full critic (npm run critic:level); "checkpoint-desert" must be gone and no new structural flaw may appear.

Evidence: docs/level-reviews/evidence/level-13/shots.json
