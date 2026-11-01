# Level critic — level 9 (Hive Warrens)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: flat-deck (2 deck key(s), dominant share 0.75 across 28 decks); checkpoint-desert (no checkpoint between x=2550 and x=6050)
- Telemetry: {"level":9,"outcome":"timeout","durationSec":280.1,"deaths":10,"deathSpots":[284,1508,1924,1805,3829,4363,4296,5302,3781,9917],"maxX":9925,"hazardTypesSeen":["brute","crusher","sentry","drone","dust_devil","shrike","boss","acid_drip","boarder"],"errors":[]}
- Quality gate: ITERATE/REWORK
- Loop: 1
- Pilot runs: 2; repeated flaws across runs: flat

## Quality panel

- Marlowe (expert reviewer): fun=1.4 fair=1.1 read=2.0 novel=1.1 pace=0.6 theme=2.3 flaw=flat -> iterate
- Vic (contra veteran): fun=1.7 fair=1.1 read=2.1 novel=1.3 pace=0.7 theme=2.4 flaw=flat -> iterate
- Sam (casual newcomer): fun=1.3 fair=1.0 read=1.7 novel=1.2 pace=0.7 theme=2.3 flaw=flat -> iterate
- Lex (speedrunner): fun=1.6 fair=1.0 read=2.1 novel=1.3 pace=0.7 theme=2.5 flaw=flat -> iterate
- Means: fun=1.50 fair=1.07 read=1.98 novel=1.22 pace=0.68 theme=2.35

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [flat-deck] (mechanical) owner: skills/level-creator/SKILL.md
   - Evidence: 2 deck key(s), dominant share 0.75 across 28 decks
   - Smallest fix: Use at least three platform reads with no key above 80% of decks.
   - Recheck: Re-run the full critic (npm run critic:level); "flat-deck" must be gone and no new structural flaw may appear.
2. [flat] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "flat"; 02-hazard-boarder.jpg (hazard beat: boarder at x=1100)
   - Smallest fix: Break the deck row: vary widths/heights and add a second route line or set piece in the flagged stretch.
   - Recheck: Re-run the full critic (npm run critic:level); "flat" must be gone and no new structural flaw may appear.
3. [checkpoint-desert] (mechanical) owner: skills/level-creator/SKILL.md
   - Evidence: no checkpoint between x=2550 and x=6050
   - Smallest fix: Add a checkpoint so no gap over 2500px is without one, clear of beam timing and patrol lanes.
   - Recheck: Re-run the full critic (npm run critic:level); "checkpoint-desert" must be gone and no new structural flaw may appear.

Evidence: docs/level-reviews/evidence/level-9/shots.json
