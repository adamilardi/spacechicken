# Level critic — level 2 (Arcade Orbit)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: flat-deck (visual-variety heuristic: 1 deck key(s), dominant share 1.00 across 7 decks); sleeping-finale (finaleHazardCount=0, no crown gate — finale untested by play, see INV-1)
- Telemetry: {"level":2,"outcome":"timeout","durationSec":90,"deaths":5,"deathSpots":[2136,2189,2196,2203,2200],"maxX":2208,"hazardTypesSeen":["rock"],"errors":[]}
- Quality gate: ITERATE/REWORK (committed verdict, retained)
- Loop: 2 (prior recorded top flaw "clone" was the removed invented finding)
- Pilot runs: 2; repeated flaws across runs: none (repeatedFlaws empty; per-run telemetry not retained)

## Status (separated per 2026-11-01 audit re-derivation)

- Capture validity: partial. Timeout at x=2208 of crown x=2800, 5 deaths, no page errors, screenshots sent, 3/3 beats retained. Local findings stand; whole-level verdicts do not.
- Completion / route coverage: partial. No completed crown route (outcome: timeout). Sections past x=2208, including the crown approach x=2208–2800, are unverified.
- Mechanical checks: flags raised. `flat-deck` is a visual-variety heuristic (never blocks quality). `sleeping-finale` is code-measured (finaleHazardCount=0) but the finale is untested by play — maxX 2208 never neared crownX 2800.
- Quality: ITERATE/REWORK. 4/4 `flat` votes (1 rework + 3 iterate; model opinion, medium confidence by vote count plus `flat-deck` corroboration). No persona named `clone` and no clone-similarity flag exists: the stored [clone] top fix was generator-invented and is deleted (below).
- Fidelity: n/a. Not a news level (`fidelity`/`concept` null).
- Overall: ITERATE/REWORK. This is the committed verdict, not an approval.

## Quality panel

- Marlowe (expert reviewer): fun=0.7 fair=0.9 read=2.0 novel=0.9 pace=0.2 theme=1.2 flaw=flat -> rework
- Vic (contra veteran): fun=0.6 fair=0.8 read=1.7 novel=0.9 pace=0.1 theme=1.1 flaw=flat -> iterate
- Sam (casual newcomer): fun=0.6 fair=0.8 read=1.5 novel=1.1 pace=0.2 theme=1.3 flaw=flat -> iterate
- Lex (speedrunner): fun=0.6 fair=0.8 read=2.1 novel=1.0 pace=0.2 theme=1.4 flaw=flat -> iterate
- Means: fun=0.61 fair=0.84 read=1.83 novel=0.96 pace=0.18 theme=1.27

## Audit re-derivation: invented `clone` finding removed

- Observation: every persona named `flat`; none named `clone`. The flags list has no clone-similarity flag (`clone-suspect`/`skeleton-rhyme` absent). There is no named comparator level and no route/mechanic comparison evidence anywhere in the stored files.
- Removed finding: the old [clone] rank-1 fix ("1 rework verdict(s) without a named clone flaw") came from the generator's `rework -> clone` conversion, which the audit required removed and the fixed generator no longer performs. A clone claim needs a named comparator plus actual route/mechanic evidence; stored evidence has neither. The finding is deleted, not relabelled.
- Evidence provenance: the three retained stills are staged-teleport beat-sheet shots (stored `shots.json` predates capture-kind labels and the fixed generator defaults them to `staged-teleport`), not gameplay frames; the JPG binaries are not retained in the repo (manifests only). No gameplay death frame exists for any of the 5 deaths. Per-run telemetry was not retained (only the final outcome plus the empty `repeatedFlaws` intersection across 2 runs), so run-to-run distribution cannot be judged. No human confirmations are stored.
- Dominant death cluster (cited): all 5 deaths cluster near x=2185 (spots x=2136, 2189, 2196, 2200, 2203; radius-200 single cluster, center 2185). The nearest retained still is 02-mid.jpg at x=1500 — 685px away and staged, so it does not show the encounter. The run then timed out at maxX 2208, 592px short of the crown.
- Static/runtime note (observation only): static analysis reports `hazardCount=0` with no hazard types, while runtime telemetry lists `hazardTypesSeen=["rock"]` and 5 deaths occurred. Reconcile before citing either as hazard evidence (folded into INV-1); neither side alone explains the deaths.
- Visual variety (non-blocking): the single deck key (`default`, dominant share 1.0) is a visual-variety heuristic under the fixed rules; it corroborates the `flat` votes as paint evidence but never proves repetitive play on its own.

## Investigation (open)

- INV-1 (death hotspot + stall cause): what kills the pilot at x=2185 and stalls the run at maxX 2208? Stored evidence has no death causes/events, no input trace, no gameplay frames, and no per-run retention (`repeatedFlaws` empty), so a bot-policy defect cannot be distinguished from a reproducible design problem.
  - Smallest next capture: bounded rerun with death events and gameplay frames retained; record hazard id/cause/phase at x=2185 and whether the hotspot repeats across fresh starts/phases. Only propose a level edit if the hotspot repeats.
  - Rerun: `TYPESAFE_API_KEY=$KEY node scripts/level-critic.mjs 2`
  - Dependency: the `sleeping-finale` fix is gated on INV-1 — a run must first reach the finale before finale pressure can be verified in play.

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [flat] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "flat"; 02-mid.jpg staged still (mid-level set piece and hazard read); dominant death cluster: 5 deaths near x=2185 (spots x=2136, 2189, 2196, 2200, 2203), nearest retained still 02-mid.jpg at x=1500, 685px away; timeout at maxX 2208 of crown x=2800
   - Smallest fix: Diagnose repetitive play from route evidence (connectivity, height changes, encounter choices, waiting time, repeated decisions), not paint: add a route decision or set piece to the flagged stretch, and only repaint if the build report cannot justify the look as art direction.
   - Recheck: Re-run the full critic: route evidence (not paint) must show a new decision in the flagged stretch, or the build report must carry the art-direction exception.
2. [flat-deck] (mechanical, visual-variety heuristic — never blocks quality) owner: skills/level-creator/SKILL.md
   - Evidence: 1 deck key(s), dominant share 1.00 across 7 decks (visual-variety heuristic)
   - Smallest fix: Visual-variety heuristic, not a quality proof: either justify the single-key look as art direction in the build report, or use at least three platform reads with no key above 80% of decks.
   - Recheck: Re-run the full critic: route evidence (not paint) must show a new decision in the flagged stretch, or the build report must carry the art-direction exception.
3. [sleeping-finale] (mechanical, gated on INV-1) owner: skills/level-creator/SKILL.md
   - Evidence: no hazard within 900px before the crown and no crown gate (finaleHazardCount=0, code-measured); but the finale is untested by play: timeout at maxX 2208 vs crownX 2800
   - Smallest fix: Resolve INV-1 first so a run reaches the finale, then verify: only if a completed approach still shows no pressure, add finale pressure within 900px of the crown on every route to it.
   - Recheck: Re-run the full critic: the finale still must show pressure and telemetry must confirm a hazard within 900px of the crown on the taken route.

Evidence: docs/level-reviews/evidence/level-2/shots.json
