# Level critic — level 16 (Iron Vault)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: flat-deck (visual-variety heuristic: 2 deck key(s), dominant share 0.74 across 23 decks); clone-suspect (skeleton similarity 0.788 to level 11 (Bastion Relay)); background-recycled (visual-variety heuristic: background type 'bastion' already used by levels 11, 17); checkpoint-desert (route: no checkpoint between x=5560 and x=8900)
- Telemetry: {"level":16,"outcome":"reached-crown-area","durationSec":250.1,"deaths":13,"deathSpots":[2830,5105,6860,6174,7461,6403,7443,7472,6173,7461,5949,5923,6869],"maxX":9555,"hazardTypesSeen":["drone","laser","crusher","shrike","sentry","boss","boarder"],"errors":[]}
- Quality gate: ITERATE/REWORK (committed verdict, retained)
- Loop: 1
- Pilot runs: 2; repeated flaws across runs: clone (per-run telemetry not retained; only the final outcome plus the repeatedFlaws intersection)

## Status (separated per 2026-11-01 audit re-derivation)

- Capture validity: partial. `Run: full` means the pipeline ran, not that the route was fully traversed. Reached-crown-area run, 13 deaths, no page errors, screenshots sent, 6/6 beat manifests retained (JPG binaries not in the repo). No death causes/events, no gameplay frames, no per-run retention. Local findings stand; whole-level verdicts do not.
- Completion / route coverage: partial. No completed crown route (outcome: reached-crown-area; only `crown-collected` completes). maxX 9555 reaches crownX 9550 without a recorded collection, so crown collection is unverified. All finale stills are staged beat shots, not gameplay frames.
- Mechanical checks: flags raised. `clone-suspect` is a code-measured kit/vocabulary match (paired comparison below). `checkpoint-desert` is code-measured route evidence. `flat-deck`/`background-recycled` are visual-variety heuristics (never block quality).
- Quality: ITERATE/REWORK. 4/4 `clone` votes (all rework; repeated across 2 runs; model opinion — four personas judging one summary are four model perspectives, not four playtests), corroborated by the 0.788 mechanical flag with a named comparator. The old mid-shot citation is struck as non-causal (below).
- Fidelity: n/a. Not a news level (`fidelity`/`concept` null).
- Overall: ITERATE/REWORK. This is the committed verdict, not an approval.

## Quality panel

- Marlowe (expert reviewer): fun=1.2 fair=1.0 read=2.1 novel=0.5 pace=0.8 theme=1.8 flaw=clone -> rework
- Vic (contra veteran): fun=1.3 fair=0.9 read=1.9 novel=0.4 pace=0.6 theme=1.9 flaw=clone -> rework
- Sam (casual newcomer): fun=1.1 fair=0.9 read=1.6 novel=0.3 pace=0.5 theme=1.8 flaw=clone -> rework
- Lex (speedrunner): fun=1.3 fair=0.8 read=2.0 novel=0.3 pace=0.7 theme=2.0 flaw=clone -> rework
- Means: fun=1.22 fair=0.87 read=1.91 novel=0.39 pace=0.66 theme=1.88

## Audit re-derivation: paired 0.788 similarity with level 11 (side-by-side)

- Metric (fixed `skeletonSimilarity`, threshold 0.75): 0.788 = 0.7*(10/13 shared kit tokens) + 0.3*(5/6 shared height bands). L16-only token: `deck:vaultDeck`. L11-only tokens: `deck:bastionDeck`, `haz:roller`. No `skeleton-rhyme` flag fired (world widths differ: 10000 vs 12000). The metric ignores deck order, hazard placement and timing.

| Aspect | L16 Iron Vault (this level) | L11 Bastion Relay |
|---|---|---|
| World / decks | 10000px, 23 decks | 12000px, 25 decks |
| Deck keys | vaultDeck + bastionGrate (dom 0.74) | bastionDeck + bastionGrate (dom 0.72) |
| Hazard kit (static) | 7 types, 25 hazards (strict subset of L11) | 8 types, 36 hazards (adds roller) |
| Height bands | {6,7,8,9,10,11} | {7,8,9,10,11} |
| Deck-x grammar | opener row; doubles ~0.39/~0.51; climb 0.81->0.97 | opener row; doubles ~0.39/~0.50; climb 0.82->0.97 |
| Finale | boss gate, crown x=9550, 1/2 visible | boss gate, crown x=11660, 2/2 visible |
| Background / gravity | bastion / 300 | bastion / 300 |
| Checkpoints | 6; desert 5560->8900 | 5; desert 3451->6000 |
| Run outcome | reached-crown-area, maxX 9555, 13 deaths | gate-open, maxX 11485, 16 deaths |
| Panel | 4/4 clone, all rework, repeated | 4/4 clone, all rework, repeated |

- Deliberate campaign reuse (plausible): shared `bastion` background across levels 11/16/17 plus boss-gated crown finales and gravity 300 read as a bastion-arc grammar. The arc itself may stay.
- Duplicate experience (supported): this level's 7-type static kit is a strict subset of L11's 8-type kit, the shared bastionGrate key sits under the same 2-key dominant structure, deck-x grammar is near-identical (opener row, stacked doubles, parallel late climb), 5/6 height bands are shared — and 4/4 `clone` votes fired on BOTH levels, repeated across runs. The match survives the vaultDeck/bastionDeck paint swap, so it is structural, not a reskin read.
- Recommendation (single, shared with the level-11 review): this level changes; level 11 holds as the bastion-kit reference. Rationale: (1) campaign order — L11 establishes the identity first; (2) subset relation — L16 is the reduced echo (fewer decks/hazards/props, sub-kit); (3) smallest total change — this level already needs route work for its 3340px checkpoint desert, so differentiation folds into that rework. Level 11 is NOT independently ordered to redesign.
- Struck citation: the stored `02-hazard-bonk.jpg` (bonk at x=1250) sat 6209px from the x=7459 death hotspot and 1580px from the nearest death — non-causal stock attachment, replaced by the comparator evidence above. All 6 retained stills are staged-teleport beat shots (stored `shots.json` predates capture-kind labels), not gameplay frames.
- Merge note: the old separate `[clone-suspect]` fix entry is merged into `[clone]` below (one cause, combined evidence); the flag stays in the flags list as the code measurement.

## Investigation (open)

- INV-1 (death toll across the checkpoint desert): what kills the pilot between x=5923 and x=7472 (11 of 13 deaths inside the 5560->8900 desert; dominant radius-200 cluster is 4 deaths at x=7459, spots x=7443, 7461, 7461, 7472)? Stored evidence has no death causes/events, no input trace, and no gameplay frames (nearest retained still 06-finale.jpg at x=9350 is 1891px away; JPGs not retained), and per-run retention is absent — so a bot-policy defect cannot be distinguished from a reproducible design problem.
  - Smallest next capture: bounded rerun with death events and gameplay death frames retained; record hazard id/cause/phase across x=5923-7472 and whether the toll repeats across fresh starts/phases. The same rerun can confirm crown collection (maxX already reaches crownX). Only propose a level edit if the toll repeats.
  - Rerun: `TYPESAFE_API_KEY=$KEY node scripts/level-critic.mjs 16`

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [clone] (quality, corroborated — this level owns the differentiation; level 11 holds) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "clone" (all rework; repeated across 2 runs) AND skeleton similarity 0.788 to level 11 (Bastion Relay): 10/13 shared kit tokens + 5/6 shared height bands, with this level's 7-type static kit a strict subset of L11's 8-type kit; paired deck-x grammar (opener row, stacked doubles at ~0.39/~0.51, parallel late climb 0.81->0.97); full side-by-side in the re-derivation section above
   - Smallest fix: Change L16's Topology Fingerprint: a new deck sequence and height grammar plus a hazard-kit identity distinct from L11's and a distinct finale/composition device; do not re-skin the copied skeleton. L11 holds as the reference (see docs/level-reviews/level-11.md); fold this into the checkpoint-desert route work below where possible.
   - Recheck: Re-run the full critic: skeleton similarity to L11 must sit below the 0.75 clone threshold and the panel must stop naming "clone" with no new structural flaw; then re-run L11's critic to confirm the pair reads distinct.
2. [checkpoint-desert] (mechanical, route) owner: skills/level-creator/SKILL.md
   - Evidence: no checkpoint between x=5560 and x=8900 (3340px gap); 11 of 13 deaths fall inside the gap (x=5923-7472 spread); checkpoint replay time unmeasured in stored evidence
   - Smallest fix: Add a checkpoint so no gap over 2500px is without one, clear of beam timing and patrol lanes.
   - Recheck: Re-run the full critic: no checkpoint gap over 2500px, and the rerun measures replay time after death across the x=5923-7472 toll.
3. [flat-deck] (mechanical, visual-variety heuristic — never blocks quality) owner: skills/level-creator/SKILL.md
   - Evidence: 2 deck key(s), dominant share 0.74 across 23 decks (visual-variety heuristic)
   - Smallest fix: Visual-variety heuristic, not a quality proof: either justify the two-key look as art direction in the build report, or use at least three platform reads with no key above 80% of decks.
   - Recheck: Re-run the full critic: route evidence (not paint) must show distinct decisions, or the build report must carry the art-direction exception.
4. [background-recycled] (mechanical, visual-variety heuristic — never blocks quality) owner: skills/level-art-creator/SKILL.md
   - Evidence: background type 'bastion' already used by levels 11, 17; build report must claim a new composition device (visual-variety heuristic)
   - Smallest fix: Claim the bastion-arc composition device for this level in the build report (what distinguishes its bastion read from levels 11/17), or introduce one as part of the differentiation above.
   - Recheck: Re-run the full critic: the build report claims a composition device for the reused background, or the background reads distinct.

Evidence: docs/level-reviews/evidence/level-16/shots.json
