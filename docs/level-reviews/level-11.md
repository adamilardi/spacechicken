# Level critic — level 11 (Bastion Relay)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: flat-deck (visual-variety heuristic: 2 deck key(s), dominant share 0.72 across 25 decks); clone-suspect (skeleton similarity 0.788 to level 16 (Iron Vault)); background-recycled (visual-variety heuristic: background type 'bastion' already used by levels 16, 17); checkpoint-desert (route: no checkpoint between x=3451 and x=6000)
- Telemetry: {"level":11,"outcome":"gate-open","durationSec":284.2,"deaths":16,"deathSpots":[2499,2459,3469,4488,5192,5179,9301,8939,8981,8912,9027,9024,8976,9059,8176,8923],"maxX":11485,"hazardTypesSeen":["laser","drone","boulder","boss","crusher","shrike","sentry","boarder"],"errors":[]}
- Quality gate: ITERATE/REWORK (committed verdict, retained)
- Loop: 1
- Pilot runs: 2; repeated flaws across runs: clone (per-run telemetry not retained; only the final outcome plus the repeatedFlaws intersection)

## Status (separated per 2026-11-01 audit re-derivation)

- Capture validity: partial. `Run: full` means the pipeline ran, not that the route was fully traversed. Gate-open run, 16 deaths, no page errors, screenshots sent, 6/6 beat manifests retained (JPG binaries not in the repo). No death causes/events, no gameplay frames, no per-run retention. Local findings stand; whole-level verdicts do not.
- Completion / route coverage: partial. No completed crown route (outcome: gate-open; only `crown-collected` completes). maxX 11485 vs crownX 11660: the crown-collection segment x=11485-11660 is unverified. The boss still (x=11640, beyond maxX) is staged, not a gameplay frame.
- Mechanical checks: flags raised. `clone-suspect` is a code-measured kit/vocabulary match (paired comparison below). `checkpoint-desert` is code-measured route evidence. `flat-deck`/`background-recycled` are visual-variety heuristics (never block quality).
- Quality: ITERATE/REWORK. 4/4 `clone` votes (all rework; repeated across 2 runs; model opinion — four personas judging one summary are four model perspectives, not four playtests), corroborated by the 0.788 mechanical flag with a named comparator. The old mid-shot citation is struck as non-causal (below).
- Fidelity: n/a. Not a news level (`fidelity`/`concept` null).
- Overall: ITERATE/REWORK. This is the committed verdict, not an approval.

## Quality panel

- Marlowe (expert reviewer): fun=1.1 fair=0.9 read=2.1 novel=0.5 pace=1.0 theme=1.8 flaw=clone -> rework
- Vic (contra veteran): fun=1.3 fair=0.8 read=1.9 novel=0.3 pace=0.9 theme=1.9 flaw=clone -> rework
- Sam (casual newcomer): fun=1.0 fair=0.7 read=1.6 novel=0.3 pace=0.7 theme=1.8 flaw=clone -> rework
- Lex (speedrunner): fun=1.1 fair=0.7 read=2.0 novel=0.3 pace=0.8 theme=2.0 flaw=clone -> rework
- Means: fun=1.12 fair=0.79 read=1.92 novel=0.35 pace=0.84 theme=1.89

## Audit re-derivation: paired 0.788 similarity with level 16 (side-by-side)

- Metric (fixed `skeletonSimilarity`, threshold 0.75): 0.788 = 0.7*(10/13 shared kit tokens) + 0.3*(5/6 shared height bands). L11-only tokens: `deck:bastionDeck`, `haz:roller`. L16-only token: `deck:vaultDeck`. No `skeleton-rhyme` flag fired (world widths differ: 12000 vs 10000). The metric ignores deck order, hazard placement and timing.

| Aspect | L11 Bastion Relay (this level) | L16 Iron Vault |
|---|---|---|
| World / decks | 12000px, 25 decks | 10000px, 23 decks |
| Deck keys | bastionDeck + bastionGrate (dom 0.72) | vaultDeck + bastionGrate (dom 0.74) |
| Hazard kit (static) | 8 types, 36 hazards (adds roller) | 7 types, 25 hazards (strict subset of L11) |
| Height bands | {7,8,9,10,11} | {6,7,8,9,10,11} |
| Deck-x grammar | opener row; doubles ~0.39/~0.50; climb 0.82->0.97 | opener row; doubles ~0.39/~0.51; climb 0.81->0.97 |
| Finale | boss gate, crown x=11660, 2/2 visible | boss gate, crown x=9550, 1/2 visible |
| Background / gravity | bastion / 300 | bastion / 300 |
| Checkpoints | 5; desert 3451->6000 | 6; desert 5560->8900 |
| Run outcome | gate-open, maxX 11485, 16 deaths | reached-crown-area, maxX 9555, 13 deaths |
| Panel | 4/4 clone, all rework, repeated | 4/4 clone, all rework, repeated |

- Deliberate campaign reuse (plausible): shared `bastion` background across levels 11/16/17 plus boss-gated crown finales and gravity 300 read as a bastion-arc grammar. The arc itself may stay.
- Duplicate experience (supported): 7 of 7/8 hazard types identical with L16's kit a strict subset of L11's, the shared bastionGrate key under the same 2-key dominant structure, near-identical deck-x grammar (opener row, stacked doubles, parallel late climb), 5/6 shared height bands — and 4/4 `clone` votes on BOTH levels, repeated across runs. The match survives the vaultDeck/bastionDeck paint swap, so it is structural, not a reskin read.
- Recommendation (single, shared with the level-16 review): level 16 changes; this level holds as the bastion-kit reference. Rationale: (1) campaign order — L11 establishes the identity first; (2) subset relation — L16 is the reduced echo (fewer decks/hazards/props, sub-kit); (3) smallest total change — L16 already needs route work for its 3340px checkpoint desert. This level is NOT independently ordered to redesign.
- Struck citation: the stored `02-hazard-boarder.jpg` (boarder at x=700) sat 8280px from the x=8980 death hotspot and 1759px from the nearest death — non-causal stock attachment, replaced by the comparator evidence above. All 6 retained stills are staged-teleport beat shots (stored `shots.json` predates capture-kind labels), not gameplay frames.
- Merge note: the old separate `[clone-suspect]` fix entry is merged into `[clone]` below (one cause, combined evidence); the flag stays in the flags list as the code measurement.

## Investigation (open)

- INV-1 (death hotspot x=8980): what kills the pilot at the 8-death cluster (spots x=8912, 8923, 8939, 8976, 8981, 9024, 9027, 9059)? Stored evidence has no death causes/events, no input trace, and no gameplay frames (nearest retained still 04-hazard-bonk.jpg at x=11100 is 2120px away; JPGs not retained), and per-run retention is absent — so a bot-policy defect cannot be distinguished from a reproducible design problem.
  - Smallest next capture: bounded rerun with death events and gameplay death frames retained; record hazard id/cause/phase at x=8980 and whether the hotspot repeats across fresh starts/phases. The same rerun covers the unverified crown segment x=11485-11660 once the pilot passes the hotspot. Only propose a level edit if the hotspot repeats.
  - Rerun: `TYPESAFE_API_KEY=$KEY node scripts/level-critic.mjs 11`

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [clone] (quality, corroborated — paired with level 16; this level holds, no independent redesign) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "clone" (all rework; repeated across 2 runs) AND skeleton similarity 0.788 to level 16 (Iron Vault): 10/13 shared kit tokens + 5/6 shared height bands; paired deck-x grammar (opener row, stacked doubles at ~0.39/~0.50, parallel late climb 0.81->0.97); full side-by-side in the re-derivation section above
   - Smallest fix: No L11 edit: L11 holds as the bastion-kit reference and level 16 owns the differentiation (see docs/level-reviews/level-16.md). After L16's revision, re-run this level's critic to confirm the pair reads distinct.
   - Recheck: Re-run the full critic after L16's revision: skeleton similarity to L16 must sit below the 0.75 clone threshold or the panel must stop naming "clone", with no new structural flaw.
2. [checkpoint-desert] (mechanical, route) owner: skills/level-creator/SKILL.md
   - Evidence: no checkpoint between x=3451 and x=6000 (2549px gap); 4 of 16 deaths fall inside the gap (x=3469, 4488, 5179, 5192); checkpoint replay time unmeasured in stored evidence
   - Smallest fix: Add a checkpoint so no gap over 2500px is without one, clear of beam timing and patrol lanes.
   - Recheck: Re-run the full critic: no checkpoint gap over 2500px, and the rerun measures replay time after death at the x=8980 hotspot.
3. [flat-deck] (mechanical, visual-variety heuristic — never blocks quality) owner: skills/level-creator/SKILL.md
   - Evidence: 2 deck key(s), dominant share 0.72 across 25 decks (visual-variety heuristic)
   - Smallest fix: Visual-variety heuristic, not a quality proof: either justify the two-key look as art direction in the build report, or use at least three platform reads with no key above 80% of decks.
   - Recheck: Re-run the full critic: route evidence (not paint) must show distinct decisions, or the build report must carry the art-direction exception.
4. [background-recycled] (mechanical, visual-variety heuristic — never blocks quality) owner: skills/level-art-creator/SKILL.md
   - Evidence: background type 'bastion' already used by levels 16, 17; build report must claim a new composition device (visual-variety heuristic)
   - Smallest fix: Claim the bastion-arc composition device for this level in the build report (what distinguishes its bastion read from levels 16/17), or introduce one; revisit after L16 differentiates.
   - Recheck: Re-run the full critic: the build report claims a composition device for the reused background, or the background reads distinct.

Evidence: docs/level-reviews/evidence/level-11/shots.json
