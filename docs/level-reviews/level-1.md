# Level critic — level 1 (Dawn Run)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: none
- Telemetry: {"level":1,"outcome":"crown-collected","durationSec":23.5,"deaths":0,"deathSpots":[],"maxX":1799,"hazardTypesSeen":["rock"],"errors":[]}
- Quality gate: ITERATE/REWORK (committed verdict, retained)
- Loop: 2
- Pilot runs: 2; repeated flaws across runs: sleeping-finale

## Status (separated per 2026-11-01 audit re-derivation)

- Capture validity: valid. Full run, crown collected in 23.5s, 0 deaths, no page errors, screenshots sent, 3/3 beats retained.
- Completion / route coverage: crown route complete (maxX 1799 vs crownX 1800, outcome crown-collected). Single-route bot capture; unplayed branches/tiers stay unverified.
- Mechanical checks: PASS. No flags. The finale check exempts this level by rule (`finaleFlags` returns [] when crownX <= 2000; here crownX=1800), so `finaleHazardCount=0` raises no mechanical flag.
- Quality: ITERATE. 4/4 `sleeping-finale` votes, repeated across 2 pilot runs (model opinion, medium confidence by repetition; no mechanical corroboration). Prescription gated on campaign-role rationale, see below.
- Fidelity: n/a. Not a news level (`fidelity`/`concept` null).
- Overall: ITERATE/REWORK. This is the committed verdict, not an approval; the easy ending may still be intentional once the role rationale is recorded.

## Quality panel

- Marlowe (expert reviewer): fun=1.3 fair=2.4 read=2.4 novel=1.0 pace=0.6 theme=1.5 flaw=sleeping-finale -> iterate
- Vic (contra veteran): fun=1.1 fair=1.9 read=2.5 novel=0.9 pace=0.4 theme=1.4 flaw=sleeping-finale -> iterate
- Sam (casual newcomer): fun=1.5 fair=2.3 read=2.3 novel=1.0 pace=0.7 theme=1.5 flaw=sleeping-finale -> iterate
- Lex (speedrunner): fun=1.3 fair=2.3 read=2.6 novel=0.9 pace=0.9 theme=1.5 flaw=sleeping-finale -> iterate
- Means: fun=1.33 fair=2.23 read=2.43 novel=0.94 pace=0.64 theme=1.46

## Audit re-derivation: `sleeping-finale` vs campaign role

- Observation: the finale still shows no pressure and level data confirms `finaleHazardCount=0` within 900px of the crown. Clean tutorial clear otherwise: 0 deaths, no stalls, no death clusters to cite.
- Evidence provenance: the three retained stills are staged-teleport beat-sheet shots (capture teleports the camera after the play sample; stored `shots.json` predates capture-kind labels and the fixed generator defaults them to `staged-teleport`), not gameplay frames. No gameplay death frames exist (0 deaths). Per-run telemetry was not retained (only the `sleeping-finale` intersection across 2 runs), so run-to-run distribution cannot be judged from stored files. No human confirmations are stored.
- Mechanical/data position: no flag corroborates the panel — the short-level exemption (crownX 1800 <= 2000) applies by design, and there are no deaths, stalls, or clusters.
- Campaign role: the critic skill anchors its playable floors to "shipped level 1, a finished tutorial" and tolerates a `sleeping-finale` dissent on "a level with no finale by design" (skills/game-critic/SKILL.md). Whether Dawn Run has no finale by design is a design-intent question the stored evidence cannot settle. An easy ending here can be intentional; prescribing pressure first would edit toward the evaluator rather than the player.
- Static/runtime note (observation only): static analysis reports `hazardCount=0` while runtime telemetry lists `hazardTypesSeen=["rock"]`. Reconcile before citing either as hazard evidence; neither affects the finale diagnosis.
- Visual variety (non-blocking): single platform key (`default`, dominant share 1.0) raised no flag, and visual-variety heuristics never block quality under the fixed rules.

## Investigation (open)

- INV-1 (campaign-role rationale): the level author records whether Dawn Run ships with no finale by design (tutorial role, easy ending intentional) or whether its role demands escalation. No new capture is needed to decide this — telemetry is already a clean full clear. Smallest next step is the design rationale, not a level edit.
  - If intentional: keep the level, recalibrate the tutorial-finale expectation instead of editing.
  - If escalation is required: add finale pressure within 900px of the crown on every route to it, then re-run.
  - Rerun (after the rationale): `TYPESAFE_API_KEY=$KEY node scripts/level-critic.mjs 1`

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [sleeping-finale] (quality, gated on INV-1) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "sleeping-finale" (repeated across 2 runs); 03-finale.jpg staged still (crown approach and finale pressure); crownX=1800; mechanical flags none (short-level exemption applies)
   - Smallest fix: Record L1's campaign-role rationale first (INV-1): confirm whether Dawn Run has no finale by design. Only if the role demands escalation, add finale pressure within 900px of the crown on every route to it.
   - Recheck: Rationale recorded. If pressure was added, re-run the full critic; "sleeping-finale" must be gone and no new structural flaw may appear. If the easy ending is intentional, no level edit; recalibrate instead.

Evidence: docs/level-reviews/evidence/level-1/shots.json
