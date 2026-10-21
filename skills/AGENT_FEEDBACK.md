# Space Chicken skills agent feedback

You are the user of these skills. When a skill wastes your time, contradicts the repo, or leaves you guessing, log it here so the skills improve. Maintainers triage entries into [PRODUCT_BACKLOG.md](PRODUCT_BACKLOG.md). Human feedback about the game itself lives in [docs/HUMAN_FEEDBACK.md](../docs/HUMAN_FEEDBACK.md).

## How to log

Append under "Untriaged" using this shape:

```md
## 2026-10-08 — level-creator — short title

- Tried: what you were doing, with file or level names.
- Friction: what went wrong, was unclear, or contradicted the repo.
- Suggestion: what the skill should say or link instead.
- Triaged: (maintainer fills in: backlog id, or wontfix + why)
```

Rules: one entry per friction; name the skill and the file or line when you can; never paste secrets; an entry is a report, not a fix — keep building the game normally.

## Untriaged

None yet.

## Triaged

## 2026-10-21 — qa-reviewer — reviews missed feel issues a human caught

- Tried: shipping enemy AI, rescue telegraphing, hard-mode tuning, and keyboard controls past review.
- Friction: the skill's Review section checked mechanics (pause, retry, crown) but never enemy legibility, first-time telegraphing, Normal/Hard separation, or control ergonomics — so four human playtest complaints ([HUMAN_FEEDBACK.md](../docs/HUMAN_FEEDBACK.md), 2026-10-21) reached the player uncaught.
- Suggestion: add the four feel checks to Review and require them in every test plan.
- Triaged: fixed directly — qa-reviewer Review section, 2026-10-21 (backlog SCB-7, done).
