# Level critic — level 16 (Iron Vault)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: flat-deck (2 deck key(s), dominant share 0.74 across 23 decks); clone-suspect (skeleton similarity 0.788 to level 11 (Bastion Relay)); background-recycled (background type 'bastion' already used by levels 11, 17; build report must claim a new composition device); checkpoint-desert (no checkpoint between x=5560 and x=8900)
- Telemetry: {"level":16,"outcome":"reached-crown-area","durationSec":250.1,"deaths":13,"deathSpots":[2830,5105,6860,6174,7461,6403,7443,7472,6173,7461,5949,5923,6869],"maxX":9555,"hazardTypesSeen":["drone","laser","crusher","shrike","sentry","boss","boarder"],"errors":[]}
- Quality gate: ITERATE/REWORK
- Loop: 1
- Pilot runs: 2; repeated flaws across runs: clone

## Quality panel

- Marlowe (expert reviewer): fun=1.2 fair=1.0 read=2.1 novel=0.5 pace=0.8 theme=1.8 flaw=clone -> rework
- Vic (contra veteran): fun=1.3 fair=0.9 read=1.9 novel=0.4 pace=0.6 theme=1.9 flaw=clone -> rework
- Sam (casual newcomer): fun=1.1 fair=0.9 read=1.6 novel=0.3 pace=0.5 theme=1.8 flaw=clone -> rework
- Lex (speedrunner): fun=1.3 fair=0.8 read=2.0 novel=0.3 pace=0.7 theme=2.0 flaw=clone -> rework
- Means: fun=1.22 fair=0.87 read=1.91 novel=0.39 pace=0.66 theme=1.88

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [clone] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "clone"; 02-hazard-bonk.jpg (hazard beat: bonk at x=1250)
   - Smallest fix: Change the Topology Fingerprint: new route shape plus a new finale rule; do not re-skin the copied skeleton.
   - Recheck: Re-run the full critic (npm run critic:level); "clone" must be gone and no new structural flaw may appear.
2. [clone-suspect] (mechanical) owner: skills/level-creator/SKILL.md
   - Evidence: skeleton similarity 0.788 to level 11 (Bastion Relay)
   - Smallest fix: Change deck/hazard sequence and background composition until skeleton similarity drops below the clone threshold.
   - Recheck: Re-run the full critic (npm run critic:level); "clone-suspect" must be gone and no new structural flaw may appear.
3. [flat-deck] (mechanical) owner: skills/level-creator/SKILL.md
   - Evidence: 2 deck key(s), dominant share 0.74 across 23 decks
   - Smallest fix: Use at least three platform reads with no key above 80% of decks.
   - Recheck: Re-run the full critic (npm run critic:level); "flat-deck" must be gone and no new structural flaw may appear.
4. [background-recycled] (mechanical) owner: skills/level-art-creator/SKILL.md
   - Evidence: background type 'bastion' already used by levels 11, 17; build report must claim a new composition device
   - Smallest fix: Add a new composition device for the reused background and claim it in the build report.
   - Recheck: Re-run the full critic (npm run critic:level); "background-recycled" must be gone and no new structural flaw may appear.
5. [checkpoint-desert] (mechanical) owner: skills/level-creator/SKILL.md
   - Evidence: no checkpoint between x=5560 and x=8900
   - Smallest fix: Add a checkpoint so no gap over 2500px is without one, clear of beam timing and patrol lanes.
   - Recheck: Re-run the full critic (npm run critic:level); "checkpoint-desert" must be gone and no new structural flaw may appear.

Evidence: docs/level-reviews/evidence/level-16/shots.json
