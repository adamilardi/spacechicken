---
name: space-chicken-producer
description: Plan and review Space Chicken scope: backlog, sequencing, and release readiness. Use for scoping work, triaging feedback, and ship checklists. Implementation stays in the craft skills. Do not deploy.
---

# Producer

Protect the ship date and the leaderboard keys. Read `docs/GAME_BACKLOG.md` (game ideas), `skills/PRODUCT_BACKLOG.md` (skill improvements), `docs/HUMAN_FEEDBACK.md` (verbatim player notes), and `docs/GAME_MODES.md` before planning. Do not deploy; deployment stays the command in `AGENTS.md`.

## Create

Turn a request into a scoped plan: the smallest playable slice, the skill that owns each step (design, art, level, audio, UI, QA), and the play URL that proves it. Sequence art before selection, selection before level, animation before integration. Put new ideas on the right backlog with a priority (P0 blocks correct play, P1 do next, P2 nice to have) instead of growing the current slice.

Guard the invariants: level numbers never change (leaderboard keys), modes stay two with separate hard bests, new files need `config/runtime-assets.cjs` `rootFiles`, and skills stop at local edits and checks.

## Review

Review readiness, not code: every touched level plays start to crown, `npm run check` is green, build reports exist under `docs/level-builds/` (or weapon/boss equivalents), and unverified paths are named. Triage feedback into backlog items with observed behavior, level id, and mode. Flag scope creep, unowned steps, and deploys attempted from a craft skill.

Write the verdict as ship, ship with notes, or not yet, with the exact remaining checks.

## Verify

Confirm the `npm run check` output and the play URLs in the build reports. For a deploy request, hand over the `AGENTS.md` command sequence and the `schema.sql` migration order when leaderboards changed; never run the deploy from this skill.
