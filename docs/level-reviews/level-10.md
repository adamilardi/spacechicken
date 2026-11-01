# Level critic — level 10 (Spire Crown)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: flat-deck (2 deck key(s), dominant share 0.77 across 30 decks); checkpoint-desert (no checkpoint between x=2750 and x=6750)
- Telemetry: {"level":10,"outcome":"timeout","durationSec":310.1,"deaths":10,"deathSpots":[5566,6883,6909,10899,10875,11290,8563,11491,11459,11473],"maxX":11537,"hazardTypesSeen":["laser","dust_devil","drone","shrike","sentry","boss","boarder"],"errors":[]}
- Quality gate: ITERATE/REWORK
- Loop: 1
- Pilot runs: 2; repeated flaws across runs: flat

## Quality panel

- Marlowe (expert reviewer): fun=1.5 fair=1.1 read=2.1 novel=1.1 pace=0.9 theme=2.0 flaw=flat -> iterate
- Vic (contra veteran): fun=1.6 fair=1.0 read=2.1 novel=1.3 pace=0.9 theme=2.2 flaw=flat -> iterate
- Sam (casual newcomer): fun=1.2 fair=1.0 read=1.8 novel=1.3 pace=0.8 theme=2.2 flaw=flat -> iterate
- Lex (speedrunner): fun=1.6 fair=0.9 read=2.1 novel=1.4 pace=0.9 theme=2.3 flaw=flat -> iterate
- Means: fun=1.46 fair=0.99 read=2.03 novel=1.25 pace=0.86 theme=2.18

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [flat-deck] (mechanical) owner: skills/level-creator/SKILL.md
   - Evidence: 2 deck key(s), dominant share 0.77 across 30 decks
   - Smallest fix: Use at least three platform reads with no key above 80% of decks.
   - Recheck: Re-run the full critic (npm run critic:level); "flat-deck" must be gone and no new structural flaw may appear.
2. [flat] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "flat"; 02-hazard-boarder.jpg (hazard beat: boarder at x=900)
   - Smallest fix: Break the deck row: vary widths/heights and add a second route line or set piece in the flagged stretch.
   - Recheck: Re-run the full critic (npm run critic:level); "flat" must be gone and no new structural flaw may appear.
3. [checkpoint-desert] (mechanical) owner: skills/level-creator/SKILL.md
   - Evidence: no checkpoint between x=2750 and x=6750
   - Smallest fix: Add a checkpoint so no gap over 2500px is without one, clear of beam timing and patrol lanes.
   - Recheck: Re-run the full critic (npm run critic:level); "checkpoint-desert" must be gone and no new structural flaw may appear.

Evidence: docs/level-reviews/evidence/level-10/shots.json
