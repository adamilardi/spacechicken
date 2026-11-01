# Level critic — level 15 (Skyhook Anchor)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: flat-deck (2 deck key(s), dominant share 0.72 across 29 decks); checkpoint-desert (no checkpoint between x=3300 and x=6300)
- Telemetry: {"level":15,"outcome":"gate-open","durationSec":186.8,"deaths":5,"deathSpots":[4425,5855,4517,4506,10013],"maxX":12269,"hazardTypesSeen":["drone","dust_devil","laser","crusher","shrike","sentry","boss","boarder"],"errors":[]}
- Quality gate: ITERATE/REWORK
- Loop: 1
- Pilot runs: 2; repeated flaws across runs: flat

## Quality panel

- Marlowe (expert reviewer): fun=1.8 fair=1.1 read=2.2 novel=1.2 pace=1.1 theme=2.1 flaw=flat -> iterate
- Vic (contra veteran): fun=2.2 fair=1.2 read=2.2 novel=1.5 pace=1.2 theme=2.4 flaw=flat -> iterate
- Sam (casual newcomer): fun=1.9 fair=1.1 read=1.9 novel=1.3 pace=1.1 theme=2.3 flaw=flat -> iterate
- Lex (speedrunner): fun=2.2 fair=1.2 read=2.2 novel=1.4 pace=1.4 theme=2.4 flaw=flat -> iterate
- Means: fun=2.03 fair=1.17 read=2.11 novel=1.37 pace=1.20 theme=2.28

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [flat-deck] (mechanical) owner: skills/level-creator/SKILL.md
   - Evidence: 2 deck key(s), dominant share 0.72 across 29 decks
   - Smallest fix: Use at least three platform reads with no key above 80% of decks.
   - Recheck: Re-run the full critic (npm run critic:level); "flat-deck" must be gone and no new structural flaw may appear.
2. [flat] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "flat"; 02-hazard-boarder.jpg (hazard beat: boarder at x=550)
   - Smallest fix: Break the deck row: vary widths/heights and add a second route line or set piece in the flagged stretch.
   - Recheck: Re-run the full critic (npm run critic:level); "flat" must be gone and no new structural flaw may appear.
3. [checkpoint-desert] (mechanical) owner: skills/level-creator/SKILL.md
   - Evidence: no checkpoint between x=3300 and x=6300
   - Smallest fix: Add a checkpoint so no gap over 2500px is without one, clear of beam timing and patrol lanes.
   - Recheck: Re-run the full critic (npm run critic:level); "checkpoint-desert" must be gone and no new structural flaw may appear.

Evidence: docs/level-reviews/evidence/level-15/shots.json
