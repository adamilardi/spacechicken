# Level critic — level 18 (Fear Spike)

- Run: full
- Screenshots sent to critic: true
- Mechanical flags: none
- Telemetry: {"level":18,"outcome":"crown-collected","durationSec":94.4,"deaths":5,"deathSpots":[1369,5332,5305,5332,5340],"maxX":5691,"hazardTypesSeen":["laser","bearRaider","crusher","rock"],"errors":[]}
- Quality gate: ITERATE/REWORK (committed verdict, retained)
- Loop: 1
- Pilot runs: 2; repeated flaws across runs: cheap (per-run telemetry not retained; only the final outcome plus the repeatedFlaws intersection)
- Concept gate: PASS

## Status (separated per 2026-11-01 audit re-derivation)

- Capture validity: valid. `Run: full` means the pipeline ran; here the traversal completed (crown-collected, 94.4s, 5 deaths, no page errors, screenshots sent, 5/5 beat stills retained in-repo and tracked at HEAD). Limits: no death cause/phase/input, no gameplay frames (all 5 stills are staged beat shots; stored `shots.json` predates capture-kind labels), no per-run retention (the `cheap` repeat rests on the repeatedFlaws label intersection only).
- Completion / route coverage: complete (main route). crown-collected with maxX 5691 at crownX 5700. Alternate branches/tiers are unrecorded in stored telemetry, so off-route sections stay unverified.
- Mechanical checks: clean. No mechanical flags.
- Quality: ITERATE/REWORK. 4/4 `cheap` votes (all iterate; repeated across 2 runs as a label; model opinion — four personas judging run summaries are four model perspectives, not four playtests), corroborated by the 4-death hotspot at x=5327. The old crusher-shot citation is struck as non-causal (below).
- Fidelity: FAIL (kept separate from quality). The fidelity panel never ran (`fidelity-panel-unavailable`) — an infrastructure/evidence issue, not a human-review task. Stored `human.json` is build-agent eyeball observation, not a panel judgment, and does not clear the gate.
- Overall: ITERATE/REWORK. This is the committed verdict, not an approval.

## Quality panel

- Marlowe (expert reviewer): fun=2.2 fair=1.5 read=2.4 novel=1.8 pace=2.4 theme=2.3 flaw=cheap -> iterate
- Vic (contra veteran): fun=2.4 fair=1.5 read=2.5 novel=1.8 pace=2.5 theme=2.5 flaw=cheap -> iterate
- Sam (casual newcomer): fun=2.1 fair=1.3 read=2.0 novel=1.8 pace=2.4 theme=2.3 flaw=cheap -> iterate
- Lex (speedrunner): fun=2.3 fair=1.3 read=2.3 novel=1.9 pace=2.5 theme=2.4 flaw=cheap -> iterate
- Means: fun=2.25 fair=1.41 read=2.29 novel=1.82 pace=2.44 theme=2.39

## News fidelity

- Brief: Level 18 — Fear Spike (news-to-level)
- Gate: FAIL
- Infrastructure/evidence issue: fidelity-panel-unavailable — the fidelity panel never judged this level (no key, images off, size limit, or no screenshots captured). Restore the evidence path and re-run the full critic with TYPESAFE_API_KEY set; do not ask a human to stand in for the missing panel.
- Stored observation (not a panel judgment): `evidence/level-18/human.json` (reviewer: build agent eyeball on evidence shots, 2026-10-31) confirms the VIX row, Intel/Reddit row, third-correction row, closing bell, candlesticks and doubts row from the stills plus level data, and leaves dead-cat bounce shafts unconfirmed. Preserved as agent observation; the gate still needs a real panel pass.

## Audit re-derivation: dominant death hotspot at x=5327

- Cluster (fixed `dominantDeathCluster`, radius 200): deaths [1369, 5332, 5305, 5332, 5340] sort into a lone death at x=1369 and a 4-death cluster at spots x=5305, 5332, 5332, 5340, center x=5327 (verified by running the fixed function). The lone x=1369 death is not a cluster and supports no diagnosis on its own.
- Retained stills vs the hotspot (from `evidence/level-18/shots.json`): 01-opener x=150 (5177px off), 02-hazard-crusher x=800 (4527px off), 03-hazard-laser x=1650 (3677px off), 04-setpiece-closingBell x=5850 (523px off), 05-finale x=5500 (173px off). All 5 are staged beat stills, not gameplay frames.
- Struck citation: the stored `02-hazard-crusher.jpg` (crusher at x=800) sits 4527px from the hotspot and was attached via the first death (x=1369), not the 4-death cluster — non-causal stock attachment. The fixed rule cites the dominant cluster and the first retained still within 700px of its center: `04-setpiece-closingBell.jpg` (staged still). No retained still centers on x=5327, so the encounter cause stays open (INV-1).

## Investigation (open)

- INV-1 (death hotspot x=5327, lone death x=1369): what kills the pilot 4x at the hotspot and once at x=1369? Stored evidence has no death causes/events, no input trace, no hazard-phase data, and no gameplay frames (cited still 523px from the hotspot center; distance-closest 173px off; all stills staged), and per-run retention is absent — so a bot-policy defect cannot be distinguished from a reproducible design problem.
  - Smallest next capture: bounded rerun with death events and gameplay death frames retained; record hazard id/cause/phase, input history, and camera visibility at x=5327 and whether the hotspot repeats across fresh starts/phases. The same rerun restores the fidelity panel. Only propose the tell-window edit if the hotspot repeats in captured play.
  - Rerun: `TYPESAFE_API_KEY=$KEY NEWS_BRIEF=docs/level-builds/18.md node scripts/level-critic.mjs 18`

## Fix contract

Fix only the top fix, then re-run the full critic. One fix per loop.

1. [fidelity-panel-unavailable] (infrastructure — leads: missing evidence blocks every other judgment) owner: infrastructure (panel/capture rerun)
   - Evidence: fidelity-panel-unavailable: the fidelity panel never judged this level (no key, images off, size limit, or no screenshots captured)
   - Smallest fix: Restore the evidence path and re-run the full critic: set TYPESAFE_API_KEY, re-capture the beat sheet, and confirm the panel runs. Do not ask a human to stand in for the missing panel.
   - Recheck: Re-run the full critic; the fidelity panel must run and judge the full beat sheet.
2. [cheap] (quality, corroborated — 4 votes plus the repeated 4-death hotspot) owner: skills/level-creator/SKILL.md
   - Evidence: 4/4 personas named "cheap"; 4 deaths cluster near x=5327 (spots x=5305, 5332, 5332, 5340); nearest shot 04-setpiece-closingBell.jpg (staged still)
   - Smallest fix: Fix the clustered death spot: widen the tell window or move the hazard so the death traces to a missed tell.
   - Recheck: Re-run the full critic twice from fresh starts: deaths near x=5327 must not recur as a cluster and maxX must pass x=5327 on both runs.

Evidence: docs/level-reviews/evidence/level-18/shots.json
