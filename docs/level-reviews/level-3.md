# Level critic — level 3 (Orbital Gauntlet)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: none (committed generator raised no flags; the single platform key below is paint context, not a raised flag)
- Telemetry: {"level":3,"outcome":"timeout","durationSec":90,"deaths":1,"deathSpots":[141],"maxX":301,"hazardTypesSeen":["laser","drone"],"errors":[]}
- Quality gate: ITERATE/REWORK (committed verdict, retained)
- Loop: 1
- Pilot runs: 2; repeated flaws across runs: none (repeatedFlaws empty; per-run telemetry not retained)

## Status (separated per 2026-11-01 audit re-derivation)

- Capture validity: partial. Timeout at x=301 of crown x=2050 (15% of the route), 1 death, no page errors, screenshots sent, 4/4 beats retained as manifests. Local findings stand; whole-level verdicts do not.
- Completion / route coverage: partial. No completed crown route (outcome: timeout). Everything past x=301 — including the first checkpoint (x=1440), the drone beat (x=900), and the crown approach x=301–2050 — is unverified in play.
- Mechanical checks: none raised. The old generator stored zero flags. Single platform key (`stationPanel`, dominant share 1.0) is paint context only, never a quality proof.
- Quality: ITERATE. 3/4 `stale` votes (all iterate) corroborate by vote count under the fixed rules, but the panel judged mostly staged stills of unplayed sections (see below). The single `blind` vote is uncorroborated (1 vote, no repeat, no death cluster, no supporting flag) and is routed to INV-1; its stored top geometry fix is deleted.
- Fidelity: n/a. Not a news level (`fidelity`/`concept` null).
- Overall: ITERATE/REWORK. This is the committed verdict, not an approval.

## Quality panel

- Marlowe (expert reviewer): fun=1.5 fair=1.6 read=2.2 novel=1.6 pace=1.5 theme=2.1 flaw=stale -> iterate
- Vic (contra veteran): fun=1.4 fair=1.5 read=2.1 novel=1.4 pace=1.4 theme=2.1 flaw=stale -> iterate
- Sam (casual newcomer): fun=1.3 fair=1.4 read=1.8 novel=1.5 pace=1.2 theme=2.0 flaw=blind -> iterate
- Lex (speedrunner): fun=1.5 fair=1.6 read=2.2 novel=1.5 pace=1.5 theme=2.2 flaw=stale -> iterate
- Means: fun=1.45 fair=1.54 read=2.08 novel=1.50 pace=1.41 theme=2.10

## Audit re-derivation: `blind` fix removed, early stall diagnosed as far as stored evidence allows

- Observation: one persona (Sam) named `blind`; the other three named `stale`. `repeatedFlaws` is empty across 2 pilot runs. The flags list is empty. The single death sits at x=141 — one death is not a cluster.
- Removed finding: the old [blind] rank-1 geometry fix ("1/4 personas named blind; deathSpots x=141; nearest shot 01-opener.jpg") came from the old 700px-nearest-shot heuristic, not causal evidence. Under the fixed `isCorroboratedFlaw` rule it fails every prong: 1 vote (< 2), not in `repeatedFlaws`, death cluster count 1 (< 2 for blind/cheap), and no supporting flag exists. An uncorroborated panel claim becomes a bounded investigation, never a level edit. The finding is deleted, not relabelled, and no level change ships before INV-1 captures the encounter.
- Evidence provenance: the four retained stills are staged-teleport beat-sheet shots (stored `shots.json` predates capture-kind labels and the fixed generator defaults them to `staged-teleport`), not gameplay frames; the JPG binaries are not retained in the repo (manifests only). No gameplay death frame exists for the x=141 death. Per-run telemetry was not retained (only the final outcome plus the empty `repeatedFlaws` intersection across 2 runs), so run-to-run distribution cannot be judged. No human confirmations are stored (`human.json` absent).
- Pilot early stall (diagnosis from stored telemetry): the run timed out after 90s at maxX 301 — 1749px short of the crown — with a single death at x=141. The pilot died once near the opener, then never progressed past x≈300 in the remaining time. Stored evidence records no death cause, no input history, no position trace, and no hazard-phase data, so a bot-policy defect (bad policy at the opener, failed jump/landing timing) cannot be distinguished from a reproducible design block (impassable geometry or a pinning hazard near x≈300). The lone death with no hotspot leans bot-policy-unproven, but the stall itself is unattributed: per the fixed rules this is insufficient evidence, not a proven level defect.
- Death cluster (cited): none — a single death at x=141 forms no cluster. The nearest retained still is 01-opener.jpg at x=150 (9px away), but it is a staged still whose binary is not retained, so it cannot show the encounter.
- Route-coverage limit on the `stale` votes: the pilot traversed only x≤301, so 3 of the 4 judged stills (laser x=520, drone x=900, finale x=1850) depict sections the pilot never played. The `stale` verdict on the played stretch rests on one still plus telemetry. No named comparator sibling and no route/mechanic comparison is stored, so the "same as sibling" half of `stale` is model opinion.
- Visual variety (non-blocking): the single platform key (`stationPanel`, dominant share 1.0 across 5 platforms) is paint context under the fixed rules; it never proves repetitive play on its own. Route data shows descending bands (`platformBands` 13,12,9,7,5) — the decks do change height even if the paint does not.

## Investigation (open)

- INV-1 (early stall + allegedly blind encounter): what killed the pilot at x=141, and what holds it at/below x≈300 for the rest of the 90s? Stored evidence has no death cause/events, no input trace, no position trace, no gameplay frames, and no per-run retention, so pilot defect vs design block is undecidable.
  - Smallest next capture: bounded rerun with death events (hazard id/cause/phase at x=141), input history, a position/stall trace, and retained gameplay frames of the x≈141 encounter — including telegraph visibility in the frames before the death. Repeat across fresh starts/phases. Only if the stall or the blind read repeats in captured play may a level edit be proposed.
  - Rerun: `TYPESAFE_API_KEY=$KEY node scripts/level-critic.mjs 3`
  - Dependency: the `stale` fix is gated on INV-1 — no level change ships until the stall is attributed and the allegedly blind encounter is captured in play.

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [stale] (quality, gated on INV-1) owner: skills/level-creator/SKILL.md
   - Evidence: 3/4 personas named "stale" (all iterate; corroborated by vote count under the fixed rules); panel judged 4 staged stills but the pilot traversed only x≤301, so stills at x=520, 900, 1850 show unplayed sections; no named comparator sibling stored; timeout at maxX 301 of crown x=2050; single death at x=141 (no cluster)
   - Smallest fix: Resolve INV-1 first (capture the stall cause and the x=141 encounter; no level edit before that). Then, only on captured route evidence: replace the signature decision with a verb no named sibling teaches the same way, with teach/press/twist beats — cite the comparator sibling and the route/mechanic evidence in the build report.
   - Recheck: Re-run the full critic with route coverage past x=301: route evidence (not paint) must show the new signature decision in play, the comparator citation must be recorded, "stale" must be gone, and no new structural flaw may appear.
2. [pilot-stall] (capture/attribution, see INV-1 — no level edit) owner: scripts/level-critic.mjs
   - Evidence: timeout at maxX 301 of crown x=2050 after 90s; 1 death at x=141; hazardTypesSeen [laser, drone]; no death cause, input history, position trace, or gameplay frames retained; repeatedFlaws empty across 2 runs
   - Smallest fix: Not a level edit. Run the INV-1 capture above and attribute the stall (bot-policy defect vs reproducible design block) before any geometry or encounter change.
   - Recheck: INV-1 answered with retained death events, input/position traces, and gameplay frames; attribution recorded.

Evidence: docs/level-reviews/evidence/level-3/shots.json
