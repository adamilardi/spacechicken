# news-to-level batch 2026-10-31 — skill-improvement review bundle

Three random news levels (19/20/21) run through the news-to-level skill in unattended mode,
with full process capture for later skill review by a powerful agent.

## Contents

- `process-log.md` — step-by-step: what ran, timings, tool calls, failures, fallbacks
- `friction-log.md` — skill gaps, ambiguities, contradictions, improvisations (the improvement feedstock)
- `metrics.json` — counts: images, critic loops, tests, telemetry, verdicts
- Raw: `/tmp/news-batch-20261031-1605/` (news list, picks, critic logs)
- Levels: `levels/{hubble-rescue,robot-dance-sync,phobos-sample-run}.js`
- Briefs: `docs/level-builds/{19,20,21}.md`
- Reviews: `docs/level-reviews/level-{19,20,21}.md` + `evidence/level-{19,20,21}/`
- Art: `assets/news-*/`, `art-candidates/{19,20,21}/`, `art-selections/*/`

## Verdicts (loop-2 final)

| Level                | Story              | Pilot                 | Quality                                  | Fidelity                       |
| -------------------- | ------------------ | --------------------- | ---------------------------------------- | ------------------------------ |
| 19 Hubble Rescue     | NASA Hubble RFI    | crown 50.6s, 0 deaths | ITERATE (sleeping-finale, novelty floor) | FAIL (RFI envelopes missing)   |
| 20 Robot Dance Sync  | 110 dancing robots | crown 49s, 1 death    | ITERATE (stale/finale, novelty+theme)    | FAIL (missing props, cut rows) |
| 21 Phobos Sample Run | MMX Phobos launch  | crown 61.5s, 0 deaths | ITERATE (sleeping-finale 4/4, novelty)   | FAIL (H3/dishes missing)       |
