# Human feedback — Space Chicken game

Running log of the human's feedback about the game itself: gameplay, levels, art, difficulty, performance. The agent maintains this file — when the user gives game feedback in chat, append it below. This is distinct from [skills/AGENT_FEEDBACK.md](../skills/AGENT_FEEDBACK.md), which holds agent feedback about the skill set.

## How entries work

Append under "Open" using this shape:

```md
## 2026-10-08 — Level 9, Hive Warrens — short title

- Feedback: the user's words, lightly trimmed.
- Context: build, level, device, or session notes when known.
- Disposition: (maintainer fills in: fixed, planned, wontfix + why)
```

Rules: one entry per feedback item; keep the user's wording close to verbatim; never invent feedback; game feedback that implies a skill change also gets a pointer to the relevant [skills backlog item](../skills/PRODUCT_BACKLOG.md).

## Open

None yet.

## Resolved

## 2026-10-18 — Contra arc — more fun, impress the critic

- Feedback: “make the contra levels more fun and really impress the contra critic in my skills”
- Context: goal-driven tuning pass over levels 8–16, data-only, preserving the existing working-tree changes.
- Disposition: implemented — finale checkpoint on every level, bridge/stair/climb pair fights, seven new sentry toys (guards and skip lines), five finale escorts, and a new polish rule locking finale-checkpoint reach. Report: docs/level-builds/contra-fun.md. Human feel validation still open.

## 2026-10-11 — Contra arc — more fun

- Feedback: “Can you review the contra style levels and make then more fun?”
- Context: local review of levels 8–16, preserving the existing working-tree changes.
- Disposition: implemented a local pacing pass: per-level waves, extra upper-route weapon pods, Colony checkpoints, clearer late-arc openings, correct reinforcement lanes, and crown/checkpoint fixes. Human play feedback is still needed to judge the feel.

## 2026-10-09 — Jump feel — simple max jump by default

- Feedback: people want back the simple max jump all the time.
- Context: relayed in chat; variable jump (cut on early release) was the only behavior.
- Disposition: fixed — max jump is now the default, with a Fine control toggle on the title screen (button, J key, or gamepad D-pad up).

## 2026-10-11 — Contra arc — double length, more fun

- Feedback: “Let's make those contra levels double the length and more FUN!!!”
- Context: local extension of levels 8–16, preserving the existing working-tree changes.
- Disposition: implemented — every contra world is twice as wide with a new middle act (fresh decks and shelves, two extra waves, themed hazards, a gun pod or two, a rescue, and a third checkpoint); finales moved intact. Pilot cleared doubled Level 8 twice; all 9 load clean. Whether the new acts feel fun still needs human play.

## 2026-10-16 — Contra arc — full stage length

- Feedback: “Can you do a full level validate and improvement loop for the contra style levels. Increase the lenght of the level to a normal contra stage length”
- Context: local extension of levels 8–16, preserving the existing working-tree changes.
- Disposition: implemented — every contra world grew one more act (+3600px: 10,000–12,800px total) with a new wave, themed hazards, a gun pod, a rescue, and a fourth checkpoint; finales moved intact. Full suite matches baseline (190 pass, same 8 pre-existing infra failures); all level/pacing/polish gates green. No browser was available in the build environment, so start-to-crown playthroughs still need a real browser. Report: docs/level-builds/contra-length.md.
