# Level critic — level 8 (Colony Drop)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: flat-deck (2 deck key(s), dominant share 0.72 across 25 decks); checkpoint-desert (no checkpoint between x=3350 and x=6050)
- Telemetry: {"level":8,"outcome":"gate-open","durationSec":271.2,"deaths":18,"deathSpots":[2961,2983,2965,2855,2975,2897,2953,2465,3701,3350,3227,3350,3409,5358,8929,7457,8887,11737],"maxX":11775,"hazardTypesSeen":["drone","boulder","sentry","shrike","boss","boarder"],"errors":[]}
- Quality gate: ITERATE/REWORK
- Loop: 1
- Pilot runs: 2; repeated flaws across runs: flat

## Quality panel

- Marlowe (expert reviewer): fun=1.6 fair=1.1 read=2.3 novel=1.2 pace=1.0 theme=2.2 flaw=flat -> iterate
- Vic (contra veteran): fun=1.9 fair=1.1 read=2.2 novel=1.3 pace=1.1 theme=2.4 flaw=flat -> iterate
- Sam (casual newcomer): fun=1.6 fair=1.1 read=1.9 novel=1.2 pace=0.9 theme=2.3 flaw=flat -> iterate
- Lex (speedrunner): fun=1.7 fair=1.1 read=2.3 novel=1.4 pace=1.1 theme=2.4 flaw=flat -> iterate
- Means: fun=1.70 fair=1.10 read=2.15 novel=1.29 pace=1.03 theme=2.33

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [flat-deck] (mechanical) owner: skills/level-creator/SKILL.md
   - Evidence: 2 deck key(s), dominant share 0.72 across 25 decks
   - Smallest fix: Use at least three platform reads with no key above 80% of decks.
   - Recheck: Re-run the full critic (npm run critic:level); "flat-deck" must be gone and no new structural flaw may appear.
2. [flat] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "flat"; 02-hazard-boarder.jpg (hazard beat: boarder at x=700)
   - Smallest fix: Break the deck row: vary widths/heights and add a second route line or set piece in the flagged stretch.
   - Recheck: Re-run the full critic (npm run critic:level); "flat" must be gone and no new structural flaw may appear.
3. [checkpoint-desert] (mechanical) owner: skills/level-creator/SKILL.md
   - Evidence: no checkpoint between x=3350 and x=6050
   - Smallest fix: Add a checkpoint so no gap over 2500px is without one, clear of beam timing and patrol lanes.
   - Recheck: Re-run the full critic (npm run critic:level); "checkpoint-desert" must be gone and no new structural flaw may appear.

Evidence: docs/level-reviews/evidence/level-8/shots.json
