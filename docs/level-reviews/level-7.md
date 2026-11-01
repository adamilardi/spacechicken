# Level critic — level 7 (Earthwatch)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: flat-deck (visual-variety heuristic: 1 deck key(s), dominant share 1.00 across 6 decks); low-hazard-variety (static [boarder] over 3960px — contradicted by the 6-type runtime union, see INV-1)
- Telemetry: {"level":7,"outcome":"crown-collected","durationSec":36.2,"deaths":0,"deathSpots":[],"maxX":3643,"hazardTypesSeen":["boarder","drone","boulder","sentry","shrike","boss"],"errors":[]}
- Quality gate: ITERATE/REWORK (committed verdict, retained)
- Loop: 1
- Pilot runs: 2; repeated flaws across runs: flat

## Status (separated per 2026-11-01 audit re-derivation)

- Capture validity: valid. Full traversal to the crown (crown-collected in 36.2s, 0 deaths, no page errors, screenshots sent, 3/3 beats retained).
- Completion / route coverage: complete. Crown collected (maxX 3643 vs crownX 3640). Branches/tiers visited are unrecorded in stored telemetry, so unplayed branches/tiers stay unverified.
- Mechanical checks: flags raised. `flat-deck` is a visual-variety heuristic (never blocks quality). `low-hazard-variety` is code-measured static-side but contradicted runtime-side — gated on reconciliation INV-1; no new behaviour is prescribed until then.
- Quality: ITERATE/REWORK. 4/4 `flat` votes (3 rework + 1 iterate), repeated across 2 pilot runs (model opinion, medium confidence by vote count, repetition, and `flat-deck` corroboration). No persona named `clone` and no clone-similarity flag exists: the stored [clone] top fix was generator-invented and is deleted (below).
- Fidelity: n/a. Not a news level (`fidelity`/`concept` null).
- Overall: ITERATE/REWORK. This is the committed verdict, not an approval.

## Quality panel

- Marlowe (expert reviewer): fun=1.2 fair=1.8 read=2.2 novel=1.0 pace=1.4 theme=1.5 flaw=flat -> rework
- Vic (contra veteran): fun=1.1 fair=1.7 read=2.1 novel=1.3 pace=1.1 theme=1.5 flaw=flat -> rework
- Sam (casual newcomer): fun=1.3 fair=2.0 read=2.0 novel=1.4 pace=1.6 theme=1.7 flaw=flat -> iterate
- Lex (speedrunner): fun=1.3 fair=1.9 read=2.2 novel=1.4 pace=1.5 theme=1.6 flaw=flat -> rework
- Means: fun=1.25 fair=1.85 read=2.10 novel=1.26 pace=1.37 theme=1.56

## Audit re-derivation: invented `clone` finding removed, hazard variety reconciled

- Observation: every persona named `flat`; none named `clone`. The flags list has no clone-similarity flag (`clone-suspect`/`skeleton-rhyme` absent). There is no named comparator level and no route/mechanic comparison evidence anywhere in the stored files.
- Removed finding: the old [clone] rank-1 fix ("3 rework verdict(s) without a named clone flaw") came from the generator's `rework -> clone` conversion, which the audit required removed and the fixed generator no longer performs. A clone claim needs a named comparator plus actual route/mechanic evidence; stored evidence has neither. The finding is deleted, not relabelled.
- Evidence provenance: the three retained stills are staged-teleport beat-sheet shots (stored `shots.json` predates capture-kind labels and the fixed generator defaults them to `staged-teleport`), not gameplay frames; the JPG binaries are not retained in the repo (manifests only). No deaths occurred, so no death frames exist. Per-run telemetry was not retained (only the final outcome plus the `flat` intersection across 2 runs), so run-to-run distribution cannot be judged. No human confirmations are stored.
- Death clusters: none to cite — 0 deaths, clean full clear in 36.2s.
- Static/runtime hazard reconciliation (INV-1): static analysis says one behaviour (`hazardTypes [boarder]`, 8 boarders, `hasBoss=false`) over 3960px, which fires the variety flag mechanically (worldWidth > 3000 with < 2 types). Runtime telemetry saw six types (`boarder, drone, boulder, sentry, shrike, boss`) — including `boss` with `hasBoss=false`, so at least one side misattributes. The runtime value is a unioned snapshot summary, not contact evidence, and no hazard ids/phases were retained. Prescribing "another behaviour" on the static side alone would edit toward the evaluator; the contradiction must be resolved first.
- Visual variety (non-blocking): the single deck key (`issHull`, dominant share 1.0) is a visual-variety heuristic under the fixed rules; it corroborates the `flat` votes as paint evidence but never proves repetitive play on its own. Data support for the route read: 5 of 6 decks sit in band 10 (`platformBands` 10,10,10,10,10,8) — a genuinely flat row, not just flat paint.

## Investigation (open)

- INV-1 (hazard-variety reconciliation): do 6 hazard behaviours actually appear in L7 play, or is the static single-boarder extraction right? Either the runtime union is polluted (non-level actors in the snapshot) or the static extraction misses spawns the level runs; stored evidence cannot decide.
  - Smallest next capture: bounded rerun with hazard id/phase/telegraph retention; compare snapshot hazard ids against static placement ids. A level edit (second behaviour) only if a single behaviour is confirmed in play.
  - Rerun: `TYPESAFE_API_KEY=$KEY node scripts/level-critic.mjs 7`
  - Dependency: the `low-hazard-variety` fix is gated on INV-1 — no new behaviour is prescribed until reconciliation lands.

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [flat] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "flat" (repeated across 2 pilot runs); 02-hazard-boarder.jpg staged still (hazard beat: boarder at x=700); full clear in 36.2s with 0 deaths, no death clusters to cite; data support: all 6 decks share issHull and 5 of 6 sit in band 10 (platformBands 10,10,10,10,10,8)
   - Smallest fix: Diagnose repetitive play from route evidence (connectivity, height changes, encounter choices, waiting time, repeated decisions), not paint: add a route decision or set piece to the flagged stretch, and only repaint if the build report cannot justify the look as art direction.
   - Recheck: Re-run the full critic: route evidence (not paint) must show a new decision in the flagged stretch, or the build report must carry the art-direction exception.
2. [flat-deck] (mechanical, visual-variety heuristic — never blocks quality) owner: skills/level-creator/SKILL.md
   - Evidence: 1 deck key(s), dominant share 1.00 across 6 decks (visual-variety heuristic)
   - Smallest fix: Visual-variety heuristic, not a quality proof: either justify the single-key look as art direction in the build report, or use at least three platform reads with no key above 80% of decks.
   - Recheck: Re-run the full critic: route evidence (not paint) must show a new decision in the flagged stretch, or the build report must carry the art-direction exception.
3. [low-hazard-variety] (mechanical, gated on INV-1) owner: skills/level-creator/SKILL.md
   - Evidence: static hazard types [boarder] over 3960px (8 boarders, hasBoss=false) CONTRADICTED by runtime hazardTypesSeen [boarder, drone, boulder, sentry, shrike, boss]: 6 types including boss with hasBoss=false; runtime value is a unioned snapshot summary, not contact evidence; no hazard ids/phases retained
   - Smallest fix: Resolve INV-1 first: do not add a second hazard behaviour until the static/runtime contradiction is reconciled. Only if reconciliation confirms a single behaviour in play, add a second hazard behaviour (a reskin of the same behaviour does not count).
   - Recheck: Reconciliation recorded. If a behaviour was added, re-run the full critic: the variety flag must clear with matching static/runtime evidence and no new structural flaw may appear.

Evidence: docs/level-reviews/evidence/level-7/shots.json
