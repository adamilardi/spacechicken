# Level critic — level 4 (Moonfall Citadel)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: flat-deck (1 deck key(s), dominant share 1.00 across 7 decks)
- Telemetry: {"level":4,"outcome":"reached-crown-area","durationSec":90.1,"deaths":5,"deathSpots":[907,901,2019,2113,2469],"maxX":2483,"hazardTypesSeen":["rock","rover","drone","laser","cosmic_ray"],"errors":[]}
- Quality gate: ITERATE/REWORK
- Loop: 1
- Pilot runs: 2; repeated flaws across runs: flat

## Quality panel

- Marlowe (expert reviewer): fun=1.6 fair=1.5 read=2.2 novel=1.8 pace=1.6 theme=2.2 flaw=flat -> iterate
- Vic (contra veteran): fun=1.6 fair=1.3 read=2.2 novel=1.8 pace=1.3 theme=2.2 flaw=flat -> iterate
- Sam (casual newcomer): fun=1.7 fair=1.5 read=2.0 novel=1.7 pace=1.8 theme=2.3 flaw=flat -> iterate
- Lex (speedrunner): fun=1.8 fair=1.4 read=2.2 novel=1.7 pace=1.9 theme=2.4 flaw=flat -> iterate
- Means: fun=1.68 fair=1.41 read=2.16 novel=1.77 pace=1.66 theme=2.27

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [flat-deck] (mechanical) owner: skills/level-creator/SKILL.md
   - Evidence: 1 deck key(s), dominant share 1.00 across 7 decks
   - Smallest fix: Use at least three platform reads with no key above 80% of decks.
   - Recheck: Re-run the full critic (npm run critic:level); "flat-deck" must be gone and no new structural flaw may appear.
2. [flat] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "flat"; 02-hazard-rover.jpg (hazard beat: rover at x=535)
   - Smallest fix: Break the deck row: vary widths/heights and add a second route line or set piece in the flagged stretch.
   - Recheck: Re-run the full critic (npm run critic:level); "flat" must be gone and no new structural flaw may appear.

Evidence: docs/level-reviews/evidence/level-4/shots.json
