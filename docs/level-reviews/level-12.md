# Level critic — level 12 (Crimson Womb)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: flat-deck (2 deck key(s), dominant share 0.75 across 28 decks); checkpoint-desert (no checkpoint between x=2950 and x=6600)
- Telemetry: {"level":12,"outcome":"timeout","durationSec":310,"deaths":17,"deathSpots":[1699,2929,3181,2975,2989,2950,3163,5949,5961,4891,3195,5495,4889,5966,6013,6016,5958],"maxX":6042,"hazardTypesSeen":["dust_devil","drone","laser","sentry","shrike","boss","acid_drip","boarder"],"errors":[]}
- Quality gate: ITERATE/REWORK
- Loop: 1
- Pilot runs: 2; repeated flaws across runs: flat, cheap

## Quality panel

- Marlowe (expert reviewer): fun=0.9 fair=0.7 read=1.9 novel=1.1 pace=0.4 theme=2.2 flaw=flat -> iterate
- Vic (contra veteran): fun=1.2 fair=0.8 read=1.8 novel=1.2 pace=0.5 theme=2.2 flaw=cheap -> iterate
- Sam (casual newcomer): fun=0.6 fair=0.7 read=1.6 novel=1.2 pace=0.3 theme=2.0 flaw=cheap -> iterate
- Lex (speedrunner): fun=1.0 fair=0.8 read=1.9 novel=1.2 pace=0.5 theme=2.3 flaw=cheap -> iterate
- Means: fun=0.91 fair=0.74 read=1.82 novel=1.20 pace=0.41 theme=2.16

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [cheap] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 3/4 personas named "cheap"; deathSpots x=1699, 2929, 3181, 2975; nearest shot 03-hazard-drone.jpg
   - Smallest fix: Fix the clustered death spot: widen the tell window or move the hazard so the death traces to a missed tell.
   - Recheck: Re-run the full critic (npm run critic:level); "cheap" must be gone and no new structural flaw may appear.
2. [flat-deck] (mechanical) owner: skills/level-creator/SKILL.md
   - Evidence: 2 deck key(s), dominant share 0.75 across 28 decks
   - Smallest fix: Use at least three platform reads with no key above 80% of decks.
   - Recheck: Re-run the full critic (npm run critic:level); "flat-deck" must be gone and no new structural flaw may appear.
3. [flat] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 1/4 personas named "flat"; 02-hazard-boarder.jpg (hazard beat: boarder at x=550)
   - Smallest fix: Break the deck row: vary widths/heights and add a second route line or set piece in the flagged stretch.
   - Recheck: Re-run the full critic (npm run critic:level); "flat" must be gone and no new structural flaw may appear.
4. [checkpoint-desert] (mechanical) owner: skills/level-creator/SKILL.md
   - Evidence: no checkpoint between x=2950 and x=6600
   - Smallest fix: Add a checkpoint so no gap over 2500px is without one, clear of beam timing and patrol lanes.
   - Recheck: Re-run the full critic (npm run critic:level); "checkpoint-desert" must be gone and no new structural flaw may appear.

Evidence: docs/level-reviews/evidence/level-12/shots.json
