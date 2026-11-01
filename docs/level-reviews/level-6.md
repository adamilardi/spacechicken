# Level critic — level 6 (Red Reach)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: flat-deck (1 deck key(s), dominant share 1.00 across 7 decks)
- Telemetry: {"level":6,"outcome":"timeout","durationSec":90.1,"deaths":1,"deathSpots":[357],"maxX":2055,"hazardTypesSeen":["rock","beetle","dust_devil","boulder","laser","hopper"],"errors":[]}
- Quality gate: ITERATE/REWORK
- Loop: 1
- Pilot runs: 2; repeated flaws across runs: flat

## Quality panel

- Marlowe (expert reviewer): fun=1.1 fair=1.3 read=2.1 novel=1.4 pace=0.9 theme=1.7 flaw=flat -> iterate
- Vic (contra veteran): fun=1.2 fair=1.1 read=2.0 novel=1.6 pace=0.7 theme=1.6 flaw=flat -> iterate
- Sam (casual newcomer): fun=1.2 fair=1.3 read=1.9 novel=1.6 pace=1.0 theme=1.8 flaw=flat -> iterate
- Lex (speedrunner): fun=1.4 fair=1.3 read=2.2 novel=1.4 pace=1.3 theme=1.9 flaw=flat -> iterate
- Means: fun=1.22 fair=1.25 read=2.08 novel=1.49 pace=0.96 theme=1.76

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [flat-deck] (mechanical) owner: skills/level-creator/SKILL.md
   - Evidence: 1 deck key(s), dominant share 1.00 across 7 decks
   - Smallest fix: Use at least three platform reads with no key above 80% of decks.
   - Recheck: Re-run the full critic (npm run critic:level); "flat-deck" must be gone and no new structural flaw may appear.
2. [flat] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "flat"; 02-hazard-dustDevil.jpg (hazard beat: dustDevil at x=1540)
   - Smallest fix: Break the deck row: vary widths/heights and add a second route line or set piece in the flagged stretch.
   - Recheck: Re-run the full critic (npm run critic:level); "flat" must be gone and no new structural flaw may appear.

Evidence: docs/level-reviews/evidence/level-6/shots.json
