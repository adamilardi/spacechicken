# Level critic — level 7 (Earthwatch)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: flat-deck (1 deck key(s), dominant share 1.00 across 6 decks); low-hazard-variety (hazard types [boarder] over 3960px)
- Telemetry: {"level":7,"outcome":"crown-collected","durationSec":36.2,"deaths":0,"deathSpots":[],"maxX":3643,"hazardTypesSeen":["boarder","drone","boulder","sentry","shrike","boss"],"errors":[]}
- Quality gate: ITERATE/REWORK
- Loop: 1
- Pilot runs: 2; repeated flaws across runs: flat

## Quality panel

- Marlowe (expert reviewer): fun=1.2 fair=1.8 read=2.2 novel=1.0 pace=1.4 theme=1.5 flaw=flat -> rework
- Vic (contra veteran): fun=1.1 fair=1.7 read=2.1 novel=1.3 pace=1.1 theme=1.5 flaw=flat -> rework
- Sam (casual newcomer): fun=1.3 fair=2.0 read=2.0 novel=1.4 pace=1.6 theme=1.7 flaw=flat -> iterate
- Lex (speedrunner): fun=1.3 fair=1.9 read=2.2 novel=1.4 pace=1.5 theme=1.6 flaw=flat -> rework
- Means: fun=1.25 fair=1.85 read=2.10 novel=1.26 pace=1.37 theme=1.56

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [clone] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 3 rework verdict(s) without a named clone flaw
   - Smallest fix: Change the Topology Fingerprint: new route shape plus a new finale rule; do not re-skin the copied skeleton.
   - Recheck: Re-run the full critic (npm run critic:level); "clone" must be gone and no new structural flaw may appear.
2. [flat-deck] (mechanical) owner: skills/level-creator/SKILL.md
   - Evidence: 1 deck key(s), dominant share 1.00 across 6 decks
   - Smallest fix: Use at least three platform reads with no key above 80% of decks.
   - Recheck: Re-run the full critic (npm run critic:level); "flat-deck" must be gone and no new structural flaw may appear.
3. [flat] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "flat"; 02-hazard-boarder.jpg (hazard beat: boarder at x=700)
   - Smallest fix: Break the deck row: vary widths/heights and add a second route line or set piece in the flagged stretch.
   - Recheck: Re-run the full critic (npm run critic:level); "flat" must be gone and no new structural flaw may appear.
4. [low-hazard-variety] (mechanical) owner: skills/level-creator/SKILL.md
   - Evidence: hazard types [boarder] over 3960px
   - Smallest fix: Add a second hazard behaviour; a reskin of the same behaviour does not count.
   - Recheck: Re-run the full critic (npm run critic:level); "low-hazard-variety" must be gone and no new structural flaw may appear.

Evidence: docs/level-reviews/evidence/level-7/shots.json
