# Level critic — level 14 (Ember Foundry)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: checkpoint-desert (no checkpoint between x=2950 and x=6250 — 3300px gap; kind: route); flat-deck (2 deck key(s), dominant share 0.69 across 29 decks) — reclassified under the fixed rules as a visual-variety heuristic (kind: visual-variety); non-blocking, never a quality proof
- Telemetry: {"level":14,"outcome":"gate-open","durationSec":146,"deaths":3,"deathSpots":[7603,8770,9979],"maxX":12288,"hazardTypesSeen":["drone","dust_devil","sentry","laser","shrike","boss","boarder"],"errors":[]}
- Quality gate: ITERATE/REWORK (committed verdict, retained)
- Loop: 1
- Pilot runs: 2; repeated flaws across runs: flat (vote intersection across 2 runs; per-run telemetry not retained)

## Status (separated per 2026-11-01 audit re-derivation)

- Capture validity: partial. Gate-open after 146s at x=12288 of crown x=12400, 3 deaths, no page errors, screenshots sent, 6/6 beats retained as manifests. Local findings stand; whole-level verdicts do not.
- Completion / route coverage: partial. No completed crown route (outcome: gate-open; only `crown-collected` completes). The crown approach x=12288–12400 plus the collection event is unverified in play, and the boss beat (x=12400) depicts an unplayed section.
- Mechanical checks: flags-raised. `checkpoint-desert` is a code-measured route flag (3300px gap, rank 1 by player impact). `flat-deck` (keys `foundryDeck`/`foundryChain`, dominant share 0.69) is a paint heuristic under the fixed rules — a justified art-direction exception in the build report rebuts it, and it never proves repetitive play.
- Quality: ITERATE. 4/4 `flat` votes (all iterate), repeated across 2 pilot runs and supported by the deck flag — corroborated under the fixed `isCorroboratedFlaw` rule — but the panel judged staged stills, one of which (boss x=12400) shows an unplayed section. Fairness means 1.37–1.43 are low, yet no persona named a fairness flaw and the deaths form no cluster, so unfairness is suspected, not proven (INV-1).
- Fidelity: n/a. Not a news level (`fidelity`/`concept` null).
- Overall: ITERATE/REWORK. This is the committed verdict, not an approval.

## Quality panel

- Marlowe (expert reviewer): fun=1.8 fair=1.4 read=2.2 novel=1.1 pace=0.9 theme=2.2 flaw=flat -> iterate
- Vic (contra veteran): fun=2.2 fair=1.4 read=2.4 novel=1.3 pace=1.1 theme=2.4 flaw=flat -> iterate
- Sam (casual newcomer): fun=1.9 fair=1.4 read=2.0 novel=1.1 pace=1.1 theme=2.4 flaw=flat -> iterate
- Lex (speedrunner): fun=2.2 fair=1.4 read=2.3 novel=1.3 pace=1.3 theme=2.5 flaw=flat -> iterate
- Means: fun=2.02 fair=1.40 read=2.22 novel=1.23 pace=1.07 theme=2.37

## Audit re-derivation: gate-open leaves the crown approach unverified

- Observation: the old rank-1 fix repainted platforms (2 keys, 0.69 share) for a run that opened the gate but never collected the crown. Ranked by player impact instead: the measured checkpoint gap and its replay cost go first, the corroborated `flat` vote stays as a route diagnosis, and the texture count drops to a non-blocking visual heuristic. Gate-open does not verify the crown approach.
- Crown approach (unverified): outcome `gate-open` means the boss shield went down, not that the crown was collected. maxX 12288 stops 112px short of crownX 12400, so the approach x=12288–12400 plus the collection event is unplayed. The boss beat still (x=12400) therefore depicts an unplayed section; the finale still (x=12200) sits inside the traversed range but is a staged-teleport beat shot, not a gameplay frame. INV-1 continues past gate-open to collection.
- Checkpoint desert (rank 1): the x=2950→6250 gap is 3300px, code-measured from checkpoint data. None of the 3 deaths falls inside the gap — the pilot crossed it — but the gap exceeds the 2500px rule on its own measurement. The actual deaths replay ~1353px (7603 from x=6250), ~570px (8770 from x=8200), and ~1779px (9979 from x=8200). Replay time in seconds is not retained in stored telemetry — INV-1 measures it.
- Death spread (cited, no cluster): under the fixed `dominantDeathCluster` rule (chaining r=200) the 3 spots are three singles — 7603, 8770, 9979 — with no hotspot; the fixed tie-break toward the most recent spot in array order names x=9979, count 1, which never corroborates. No persona named `blind`/`cheap`, so the low fairness scores (1.37–1.43) are model opinion without a fairness finding attached. Per the fixed `attributeFailure` the spread reads as bot-policy-defect, but with no death causes, no input trace, no gameplay frames, and no per-run retention, a policy defect cannot be distinguished from encounter causes — suspected attribution, not proven. INV-1 captures the causes.
- Route/tier use (audited from stored telemetry): no position trace, input history, or tier-visit record is stored, so the route line the pilot took and whether it used multiple tiers are unverified. What the level offers is height variation — `platformBands` span 5–11 across the 29 decks — plus 3 moving platforms (`movingCount`), but their use in play is unrecorded. The `flat` verdict therefore needs route-decision evidence, not a repaint. The cited still (02-hazard-boarder.jpg, the second beat-sheet shot per `shotEvidence`) locates the panel's read, not a causal encounter.
- Visual variety (non-blocking): two platform keys (`foundryDeck`/`foundryChain`, dominant share 0.69) is paint context only. The old rank-1 texture fix is demoted to a heuristic entry: justify the look or repaint, with no quality gate attached.
- Static/runtime note (observation only): static analysis lists hazard types [boarder, drone, dustDevil, bonk, laser, shrike, boss] while runtime `hazardTypesSeen` unions 7 snapshot types [drone, dust_devil, sentry, laser, shrike, boss, boarder] — with a naming delta (`dustDevil`/`dust_devil`) plus a `sentry` extra and a static-only `bonk`. The runtime list is a union of 150ms poll snapshots, not contact evidence; reconcile before citing either as encounter proof.
- Evidence provenance: the six retained stills are staged-teleport beat-sheet shots (stored `shots.json` predates capture-kind labels and the fixed generator defaults them to `staged-teleport`), not gameplay frames; the JPG binaries are not retained in the repo (manifests only). No gameplay death frame exists for any of the 3 deaths, and which beats each panel judged is not recorded. Per-run telemetry was not retained (only the final outcome plus the `flat` intersection across 2 runs), so run-to-run distribution cannot be judged. No human confirmations are stored (`human.json` absent).

## Investigation (open)

- INV-1 (crown approach + death causes + replay-time measurement): what happens past gate-open on x=12288–12400 and at collection, what kills the pilot at 7603/8770/9979, and what does each death cost in replay seconds? Stored evidence has no death cause/events, no input history, no position/tier trace, no hazard-phase data, and no gameplay frames, so encounter causes, unfair hotspots, and policy defects are all live — and the unplayed crown approach may hold defects no finding yet names.
  - Smallest next capture: bounded rerun that continues past gate-open to crown collection with death events (hazard id/cause/phase at each death), input history, a position/tier trace, checkpoint replay time, and retained gameplay frames of the crown approach — including telegraph visibility in the frames before each death. Repeat across fresh starts/phases; only if a hotspot repeats in captured play may an encounter edit be proposed.
  - Rerun: `TYPESAFE_API_KEY=$KEY node scripts/level-critic.mjs 14`
  - Dependency: the checkpoint fix is not gated (the measured 3300px gap is sufficient evidence). No encounter/fairness edit ships before INV-1 answers.

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [checkpoint-desert] (mechanical, route) owner: skills/level-creator/SKILL.md
   - Evidence: no checkpoint between x=2950 and x=6250 (3300px gap, code-measured); no deaths inside the gap; deaths replay ~1353px (7603 from x=6250), ~570px (8770 from x=8200), ~1779px (9979 from x=8200); replay time in seconds not stored (see INV-1)
   - Smallest fix: Add a checkpoint so no gap over 2500px is without one, clear of beam timing and patrol lanes.
   - Recheck: Re-run the full critic: no checkpoint gap over 2500px may remain, and the rerun must retain checkpoint replay time after death in the repaired stretch showing a lower seconds-cost than the retained run.
2. [flat] (quality) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "flat" (all iterate; corroborated: 4 votes ≥ 2, repeated across 2 runs, supporting flat-deck flag); panel judged 6 staged stills but the pilot traversed only x≤12288, so the boss still at x=12400 shows an unplayed section; cited still 02-hazard-boarder.jpg (boarder beat x=550) locates the read, not a cause; decks vary in height (bands 5–11) while paint does not; route telemetry (connectivity, tier use, waiting time, repeated decisions) not stored
   - Smallest fix: Diagnose repetitive play from route evidence, not paint: add a route decision or set piece to the flagged stretch, and only repaint if the build report cannot justify the two-key look as art direction.
   - Recheck: Re-run the full critic with a completed crown route: route evidence (not paint) must show a new decision in the flagged stretch, or the build report must carry the art-direction exception.
3. [death-spread-x7603-9979] (investigation, see INV-1 — no level edit) owner: scripts/level-critic.mjs
   - Evidence: three singles at 7603, 8770, 9979 (no cluster under fixed chaining r=200; tie-break names x=9979, count 1, never corroborating); fairness means 1.37–1.43 with no blind/cheap vote; gate-open at maxX 12288, crown approach x=12288–12400 unverified; no death cause, input history, position/tier trace, phase data, replay time, or gameplay frames retained; cross-run repeat unconfirmed (no per-run retention)
   - Smallest fix: Not a level edit. Run the INV-1 capture and attribute the deaths and the unverified crown approach (encounter cause vs policy defect) before any encounter change.
   - Recheck: INV-1 answered with a completed crown route plus retained death events, input history, position/tier trace, replay time, and gameplay frames; attribution recorded.
4. [flat-deck] (mechanical visual-variety heuristic — non-blocking) owner: skills/level-creator/SKILL.md
   - Evidence: 2 deck key(s) (`foundryDeck`/`foundryChain`), dominant share 0.69 across 29 decks (paint heuristic; never a quality proof)
   - Smallest fix: Visual-variety heuristic, not a quality proof: either justify the two-key look as art direction in the build report, or use at least three platform reads with no key above 80% of decks.
   - Recheck: Re-run the full critic: route evidence (not paint) must show a new decision in the flagged stretch, or the build report must carry the art-direction exception.

Evidence: docs/level-reviews/evidence/level-14/shots.json
