# Level critic — level 2 (Arcade Orbit)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: flat-deck (1 deck key(s), dominant share 1.00 across 7 decks); sleeping-finale (no hazard within 900px before the crown and no crown gate)
- Telemetry: {"level":2,"outcome":"timeout","durationSec":90,"deaths":5,"deathSpots":[2136,2189,2196,2203,2200],"maxX":2208,"hazardTypesSeen":["rock"],"errors":[]}
- Quality gate: ITERATE/REWORK
- Loop: 2 (prior top flaw: clone)
- Pilot runs: 2

## Quality panel

- Marlowe (expert reviewer): fun=0.7 fair=0.9 read=2.0 novel=0.9 pace=0.2 theme=1.2 flaw=flat -> rework
- Vic (contra veteran): fun=0.6 fair=0.8 read=1.7 novel=0.9 pace=0.1 theme=1.1 flaw=flat -> iterate
- Sam (casual newcomer): fun=0.6 fair=0.8 read=1.5 novel=1.1 pace=0.2 theme=1.3 flaw=flat -> iterate
- Lex (speedrunner): fun=0.6 fair=0.8 read=2.1 novel=1.0 pace=0.2 theme=1.4 flaw=flat -> iterate
- Means: fun=0.61 fair=0.84 read=1.83 novel=0.96 pace=0.18 theme=1.27

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [clone] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 1 rework verdict(s) without a named clone flaw
   - Smallest fix: Change the Topology Fingerprint: new route shape plus a new finale rule; do not re-skin the copied skeleton.
   - Recheck: Re-run the full critic (npm run critic:level); "clone" must be gone and no new structural flaw may appear.
2. [flat-deck] (mechanical) owner: skills/level-creator/SKILL.md
   - Evidence: 1 deck key(s), dominant share 1.00 across 7 decks
   - Smallest fix: Use at least three platform reads with no key above 80% of decks.
   - Recheck: Re-run the full critic (npm run critic:level); "flat-deck" must be gone and no new structural flaw may appear.
3. [flat] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "flat"; 02-mid.jpg (mid-level set piece and hazard read)
   - Smallest fix: Break the deck row: vary widths/heights and add a second route line or set piece in the flagged stretch.
   - Recheck: Re-run the full critic (npm run critic:level); "flat" must be gone and no new structural flaw may appear.
4. [sleeping-finale] (mechanical) owner: skills/level-creator/SKILL.md
   - Evidence: no hazard within 900px before the crown and no crown gate
   - Smallest fix: Add finale pressure within 900px of the crown on every route to it.
   - Recheck: Re-run the full critic (npm run critic:level); "sleeping-finale" must be gone and no new structural flaw may appear.

Evidence: docs/level-reviews/evidence/level-2/shots.json
