# Level critic — level 5 (Specimen Wing)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: flat-deck (1 deck key(s), dominant share 1.00 across 8 decks)
- Telemetry: {"level":5,"outcome":"crown-collected","durationSec":49.7,"deaths":3,"deathSpots":[1287,1277,1280],"maxX":2587,"hazardTypesSeen":["lab_tech","sentry","laser","specimen","acid_drip","rock","beetle","dust_devil","boulder","hopper"],"errors":[]}
- Quality gate: ITERATE/REWORK
- Loop: 1
- Pilot runs: 2; repeated flaws across runs: flat

## Quality panel

- Marlowe (expert reviewer): fun=1.5 fair=1.4 read=2.2 novel=1.3 pace=1.8 theme=1.8 flaw=flat -> iterate
- Vic (contra veteran): fun=1.6 fair=1.5 read=2.2 novel=1.2 pace=2.0 theme=2.0 flaw=flat -> iterate
- Sam (casual newcomer): fun=1.6 fair=1.5 read=1.9 novel=1.3 pace=2.1 theme=2.1 flaw=flat -> iterate
- Lex (speedrunner): fun=1.6 fair=1.4 read=2.3 novel=1.3 pace=2.1 theme=2.1 flaw=flat -> iterate
- Means: fun=1.59 fair=1.44 read=2.13 novel=1.28 pace=1.97 theme=2.02

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [flat-deck] (mechanical) owner: skills/level-creator/SKILL.md
   - Evidence: 1 deck key(s), dominant share 1.00 across 8 decks
   - Smallest fix: Use at least three platform reads with no key above 80% of decks.
   - Recheck: Re-run the full critic (npm run critic:level); "flat-deck" must be gone and no new structural flaw may appear.
2. [flat] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "flat"; 02-hazard-laser.jpg (hazard beat: laser at x=860)
   - Smallest fix: Break the deck row: vary widths/heights and add a second route line or set piece in the flagged stretch.
   - Recheck: Re-run the full critic (npm run critic:level); "flat" must be gone and no new structural flaw may appear.

Evidence: docs/level-reviews/evidence/level-5/shots.json
