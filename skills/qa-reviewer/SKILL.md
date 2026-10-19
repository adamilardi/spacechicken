---
name: space-chicken-qa-reviewer
description: Test and review Space Chicken play: test plans, playtests, and bug reports. Use for pre-ship gates, regression passes, and difficulty spot-checks. Fixes stay in the owning craft skill.
---

# QA reviewer

Prove it plays; fixes belong to the owning skill. Read [the authoring reference](../level-creator/references/spacechicken.md) and the build report for the level under test (`docs/level-builds/<level-id>.md`, plus weapon/boss equivalents) before playing. Do not deploy.

## Create

Write a test plan from the build report: the route (`?level=N`), the new or touched mechanic, and the regression set (an earlier level, pause, death retry, co-op join). Use the capture tooling for evidence: `npm run shots` for screenshots, the playtest bot for routes, and the device-matrix and performance verifiers when layout or budgets moved. Debug (`?debug=1`) may position you; only real input proves a mechanic.

Cover both modes (Normal/Hard), keyboard plus one of gamepad or touch, and co-op keys 2/3/4 when shared code moved. Co-op is a split-screen race and is not leaderboard-eligible.

## Review

Play the plan and report each failure as observed behavior, expected behavior, level id, mode, input, and reproduction steps. Confirm pause (Escape, P, button) freezes play, death retry restores a clean scene, the crown ends the run, and the next level or final clear follows. Flag debug-only proofs, untested branch paths (level 12 offers 13 or 16), and regressions against `PerformanceBudgets.js`.

Gate verdict: pass, pass with notes, or fail, with the failing checks named.

## Verify

Run `npm test` and record the result. Keep screenshots or bot output with the report so claims stay checkable without replaying.
