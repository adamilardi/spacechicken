---
name: space-chicken-qa-reviewer
description: Test and review Space Chicken play: test plans, playtests, and bug reports. Use for pre-ship gates, regression passes, and difficulty spot-checks. Fixes stay in the owning craft skill.
---

# QA reviewer

Prove it plays; fixes belong to the owning skill. Read [the authoring reference](../level-creator/references/spacechicken.md) and the build report for the level under test (`docs/level-builds/<level-id>.md`, plus weapon/boss equivalents) before playing. Do not deploy.

## Create

Write a test plan from the build report: the route (`?level=N`), the new or touched mechanic, and the regression set (an earlier level, pause, death retry, co-op join). Use the capture tooling for evidence: `npm run shots` for screenshots, the playtest bot for routes, and the device-matrix and performance verifiers when layout or budgets moved. Debug (`?debug=1`) may position you; only real input proves a mechanic.

Every plan for a new or retuned level includes the critic run (`npm run critic:level -- <id>`, plus `NEWS_BRIEF=` and the fidelity gate for news levels, plus `scripts/boss-review.mjs` for crown encounters). QA confirms the critic report exists, its screenshots were actually sent (`screenshots_sent: true`), and any `needs-human` fidelity stamps were confirmed by a human opening the named screenshot. A missing or mechanical-only critic report is a gate finding, not a footnote.

Cover both modes (Normal/Hard), keyboard plus one of gamepad or touch, and co-op keys 2/3/4 when shared code moved. Co-op is a split-screen race and is not leaderboard-eligible. Every plan includes the feel checks below, even when the build report names no mechanic.

## Review

**Fresh runs, plural.** Timing, patrol phase, and player skill vary per attempt, so one clear proves almost nothing: play several fresh starts (vary start delay so patrol and tween phases differ), keep failed attempts beside passes, and report the worst case and any repeated death hotspot next to the best run. A hotspot is unfair only after it repeats across phases; a single timeout is a reproducibility flag, not a verdict. When a mechanic claims an observable (bonk count, lift contact, cargo state, synchronized crossing), record it from the run — a crown with zero bonks is the finding, whatever the brief or screenshots claim. Confirmations QA accepts as "human" name a human reviewer (`reviewerType: "human"`); agent visual review is supporting evidence, never the human check itself.

Play the plan and report each failure as observed behavior, expected behavior, level id, mode, input, and reproduction steps. Confirm pause (Escape, P, button) freezes play, death retry restores a clean scene, the crown ends the run, and the next level or final clear follows. Flag debug-only proofs, untested branch paths (level 12 offers 13 or 16), and regressions against `PerformanceBudgets.js`.

Judge feel, not just function — the four 2026-10-21 human playtest complaints reached a player first, and review should have caught them:

- Enemy legibility: every enemy visibly acts (patrol, chase, telegraph); none stand frozen mid-fight, disengage while the player watches, or kill from an unreadable state. Packs react as packs.
- First-time telegraphing: new objectives announce themselves in-world (caged crew call for rescue, coach banners name the new gun), not only in the instructions paragraph.
- Mode separation: replay one combat segment on Hard and confirm it pressures differently (faster hunters, shorter safe windows, wider aggro); Normal is the reference, not the test.
- Control ergonomics and hint accuracy: the default keyboard scheme plays two-handed (move hand plus shoot/jump hand) without same-hand contortions, and every on-screen hint (title, instructions, coach, race dialog) names keys that actually do the job today.

Gate verdict: pass, pass with notes, or fail, with the failing checks named. The verdict may not be pass while the level's critic gate (quality, plus fidelity for news levels) is iterate/rework or unrun — QA does not outvote the critic; it verifies the critic ran honestly and adds the human feel checks the panel cannot do (co-op, touch, Hard mode).

## Verify

Run `npm test` and record the result. Keep screenshots or bot output with the report so claims stay checkable without replaying.
