# Level critic — level 6 (Red Reach)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: flat-deck (1 deck key(s), dominant share 1.00 across 7 decks) — reclassified under the fixed rules as a visual-variety heuristic (kind: visual-variety); non-blocking, never a quality proof
- Telemetry: {"level":6,"outcome":"timeout","durationSec":90.1,"deaths":1,"deathSpots":[357],"maxX":2055,"hazardTypesSeen":["rock","beetle","dust_devil","boulder","laser","hopper"],"errors":[]}
- Quality gate: ITERATE/REWORK (committed verdict, retained)
- Loop: 1
- Pilot runs: 2; repeated flaws across runs: flat (vote intersection across 2 runs; per-run telemetry not retained)

## Status (separated per 2026-11-01 audit re-derivation)

- Capture validity: partial. Timeout after 90.1s at x=2055 of crown x=3000 (68% of the route), 1 death, no page errors, screenshots sent, 5/5 beats retained as manifests. Local findings stand; whole-level verdicts do not.
- Completion / route coverage: partial. No completed crown route (outcome: timeout). Everything past x=2055 — including the laser beat (x=2400), the finale (x=2800), and the crown approach x=2055–3000 — is unverified in play.
- Mechanical checks: flags-raised, non-blocking. The single flag is flat-deck (single `mesa` key, dominant share 1.0): a paint heuristic under the fixed rules — a justified art-direction exception in the build report rebuts it, and it never proves repetitive play.
- Quality: ITERATE. 4/4 `flat` votes (all iterate), repeated across 2 pilot runs and supported by the deck flag — corroborated by vote count under the fixed `isCorroboratedFlaw` rule — but the panel judged 5 staged stills while the pilot traversed only x≤2055, so the laser (x=2400) and finale (x=2800) stills depict unplayed sections. The whole-level read rests on partial play.
- Fidelity: n/a. Not a news level (`fidelity`/`concept` null).
- Overall: ITERATE/REWORK. This is the committed verdict, not an approval.

## Quality panel

- Marlowe (expert reviewer): fun=1.1 fair=1.3 read=2.1 novel=1.4 pace=0.9 theme=1.7 flaw=flat -> iterate
- Vic (contra veteran): fun=1.2 fair=1.1 read=2.0 novel=1.6 pace=0.7 theme=1.6 flaw=flat -> iterate
- Sam (casual newcomer): fun=1.2 fair=1.3 read=1.9 novel=1.6 pace=1.0 theme=1.8 flaw=flat -> iterate
- Lex (speedrunner): fun=1.4 fair=1.3 read=2.2 novel=1.4 pace=1.3 theme=1.9 flaw=flat -> iterate
- Means: fun=1.22 fair=1.25 read=2.08 novel=1.49 pace=0.96 theme=1.76

## Audit re-derivation: a navigation stall, not a paint problem

- Observation: timeout after 90.1s at maxX 2055 — 945px short of the crown — with a single early death at x=357. Repainting platforms cannot explain or fix a navigation stall: the old rank-1 texture fix is demoted to a heuristic entry, and the stall becomes the dominant investigation. No level edit ships before INV-1 attributes it.
- Stalled stretch (as far as stored evidence allows): the frontier sits at x≈2000–2061 — the roller beat (03-hazard-roller.jpg, roller at x=2000, 55px before maxX) and the fourth deck transition (stored deckLayout × worldWidth 3080 puts deck 4 at x≈2061; maxX stops 5px short), with bands 9→8 between deck ≈1700 and deck ≈2061. No position trace is stored, so where within x≤2055 the pilot spent its 90s is unknown; what is established is that it never advanced past x=2055. Everything past that — laser x=2400, finale x=2800, crown x=3000 — is unplayed.
- Input trace: not retained. Stored evidence has no input history, no position/stall trace, no death cause, no hazard-phase data, no per-run retention, and no gameplay frames. Per audit review #1 and the fixed attribution rules, pilot failure (bad policy at the roller/deck-4 frontier, failed jump timing, oscillation short of the deck) cannot be distinguished from level-design failure (impassable gap, pinning hazard, unreadable landing). The stall is unattributed: insufficient evidence, not a proven level defect.
- Death cluster (cited): none — a single death at x=357 (early, inside the x≈200–1334 deck gap) forms no cluster. Per the fixed `attributeFailure` the lone death alone leans bot-policy-unproven (spread deaths, no hotspot); that attributes the death, not the 90s stall.
- Visual variety (non-blocking): the single platform key (`mesa`, dominant share 1.0 across 7 platforms) is paint context only. The decks change height (`platformBands` 10,11,9,8,6,5,4) even if the paint does not. Route data, not paint, must carry any monotony claim.
- Route-coverage limit on the `flat` votes: 2 of the 5 judged stills (laser x=2400, finale x=2800) depict sections the pilot never reached. The `flat` verdict on the played stretch rests on 3 stills plus telemetry, and the unplayed third of the level cannot corroborate it.
- Static/runtime note (observation only): static analysis lists hazard types [bonk, dustDevil, roller, laser] while runtime `hazardTypesSeen` unions 6 snapshot types [rock, beetle, dust_devil, boulder, laser, hopper]. The runtime list is a union of 150ms poll snapshots, not contact evidence; reconcile before citing either as encounter proof.
- Evidence provenance: the five retained stills are staged-teleport beat-sheet shots (stored `shots.json` predates capture-kind labels and the fixed generator defaults them to `staged-teleport`), not gameplay frames; the JPG binaries are not retained in the repo (manifests only). The frontier still (03-hazard-roller.jpg, x=2000) is the closest retained evidence to the stall and its binary is not retained. No gameplay frames exist at all. Per-run telemetry was not retained (only the final outcome plus the `flat` intersection across 2 runs), so run-to-run distribution cannot be judged. No human confirmations are stored (`human.json` absent).

## Investigation (open)

- INV-1 (navigation stall at the x≈2000–2061 frontier): what holds the pilot at/below x≈2055 for 90s with only one early death? Stored evidence has no input trace, no position trace, no death cause, and no gameplay frames, so pilot failure and level-design failure are both live.
  - Smallest next capture: bounded rerun with input history, a position/stall trace, death events (hazard id/cause/phase for the x=357 death), and retained gameplay frames of the roller/deck-4 frontier — including roller phase, the deck-4 landing, and telegraph visibility in the frames around the stall. Repeat across fresh starts/phases; only if the stall repeats in captured play may a level edit be proposed.
  - Rerun: `TYPESAFE_API_KEY=$KEY node scripts/level-critic.mjs 6`
  - Dependency: the `flat` fix is gated on INV-1 — no level change ships until the stall is attributed and the frontier encounter is captured in play.

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [flat] (quality, gated on INV-1) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "flat" (all iterate; corroborated by vote count: 4 votes ≥ 2, repeated across 2 runs, supporting flat-deck flag); panel judged 5 staged stills but the pilot traversed only x≤2055, so stills at x=2400, 2800 show unplayed sections; timeout at maxX 2055 of crown x=3000; single death at x=357 (no cluster)
   - Smallest fix: Resolve INV-1 first (capture the stall cause and the x≈2000–2061 frontier encounter; no level edit before that). Then, only on captured route evidence: diagnose repetitive play from route evidence, not paint — add a route decision or set piece to the flagged stretch, and only repaint if the build report cannot justify the single-key look as art direction.
   - Recheck: Re-run the full critic with route coverage past x=2055: route evidence (not paint) must show a new decision in the flagged stretch, or the build report must carry the art-direction exception.
2. [pilot-stall] (capture/attribution, see INV-1 — no level edit) owner: scripts/level-critic.mjs
   - Evidence: timeout at maxX 2055 of crown x=3000 after 90.1s (945px short); frontier at x≈2000–2061 (roller beat x=2000, deck 4 at x≈2061); 1 death at x=357 (no cluster); hazardTypesSeen [rock, beetle, dust_devil, boulder, laser, hopper]; no input history, position trace, death cause, phase data, or gameplay frames retained; repeatedFlaws ["flat"] across 2 runs (no per-run retention)
   - Smallest fix: Not a level edit. Run the INV-1 capture and attribute the stall (bot-policy defect vs reproducible design block) before any geometry or encounter change.
   - Recheck: INV-1 answered with retained input/position traces, death events, and gameplay frames; attribution recorded.
3. [flat-deck] (mechanical visual-variety heuristic — non-blocking) owner: skills/level-creator/SKILL.md
   - Evidence: 1 deck key(s) (`mesa`), dominant share 1.00 across 7 decks (paint heuristic; never a quality proof)
   - Smallest fix: Visual-variety heuristic, not a quality proof: either justify the single-key look as art direction in the build report, or use at least three platform reads with no key above 80% of decks.
   - Recheck: Re-run the full critic: route evidence (not paint) must show a new decision in the flagged stretch, or the build report must carry the art-direction exception.

Evidence: docs/level-reviews/evidence/level-6/shots.json
