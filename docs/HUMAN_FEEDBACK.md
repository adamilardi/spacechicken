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

## 2026-10-21 — Enemy AI — terrible, makes no sense

- Feedback: “The enemy AI is terrible. makes no sense.”
- Context: relayed in chat alongside rescue, hard-mode, and controls notes; no level named.
- Disposition: implemented — idle boarders now pace around home instead of standing still, nearby pack-mates join a fight via a latched pack alert, and trailing boarders slow instead of freezing mid-chase, so packs press the attack in a column. Verified live on level 8 (patrol, alert join, zero frozen-chase samples) plus unit tests. Skill: [SCB-7](../skills/PRODUCT_BACKLOG.md).

## 2026-10-21 — Rescues — need a “rescue me” bubble

- Feedback: “The people you rescue need a text bubble saying rescue me or at least the first person.”
- Context: relayed in chat; caged crew previously had no callout.
- Disposition: implemented — every rescue cage carries a floating “RESCUE ME!” callout that hides on collect. Verified live on level 8 (screenshot) plus unit tests. Skill: [SCB-7](../skills/PRODUCT_BACKLOG.md).

## 2026-10-21 — Hard mode — not hard at all

- Feedback: “hard mode is NOT hard at all”
- Context: relayed in chat; the old mults were mild (boarders 1.15x, patrols 0.85x).
- Disposition: implemented — hard mults retuned (boarders 1.45x and outrun the chicken, aggro 1.4x new, patrols/crushers 0.65x, laser off-windows 0.45x, bombs 1.5x/0.6x, bosses 1.35x/0.62x, post-death grace halved). Physics, HP, jumps, and checkpoints untouched per the mode ladder. Verified live (276px/s chases, 380px+ aggro, HARD HUD) plus a guardrail unit test. Skill: [SCB-7](../skills/PRODUCT_BACKLOG.md).

## 2026-10-21 — Keyboard controls — WASD plus right-hand shoot and jump

- Feedback: “the keyboard controls to fire are weird i need wasd to move and my other hand should shoot and jump”
- Context: relayed in chat; fire was F (left hand) or J (which also toggled jump style on the title screen).
- Disposition: implemented — right-hand pair is now J to fire, K to jump (Space/↑/W still jump; F still fires as an alt), and the title-screen jump-style toggle moved from J to T. Title controls, coach banner, race dialog, and level instructions updated. Verified live (K jump, J fire, T/H toggles) plus unit tests. Skill: [SCB-7](../skills/PRODUCT_BACKLOG.md).

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
