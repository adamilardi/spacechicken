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

## 2026-10-31 — playtest batch — P1/P2 skill improvements

- Tried: externally-run keyboard/touch bot playtests of levels 17-23 with screenshots, telemetry, and mode checks (`docs/skill-review/playtest-20261031/feedback.md`).
- Friction: signature mechanics unverified or bypassable (optional lifts sold as mandatory, bonk bridges crownable with zero bonks, renamed rescue bonuses), topology words contradicting deck geometry, single-run verdicts substituted for distributions, agent confirmations standing in for human ones, synchronized stories judged from stills, route contrast judged on empty plates, and canonical level status scattered across prose.
- Suggestion: per-item rules in the feedback file, preferring executable checks.
- Triaged: fixed same day — Signature proof + bypass tests and measurable topology geometry (level-creator, news-to-level), distribution judging and bound human confirmations with `confirmationReview` enforcement (game-critic, qa-reviewer), signature-first beat planning (`planBeats`), ensemble motion verdicts (enemy-animation-creator/integrator), route contrast budgets (level-art-creator/selector), promise audit (story-writer), canonical status + loop enforcement (producer). Proof: tests/level-critic.test.cjs (confirmationReview, planBeats priority).

## 2026-10-31 — news-to-level batch — F1-F10 skill frictions

- Tried: three unattended news levels (19 Hubble Rescue, 20 Robot Dance Sync, 21 Phobos Sample Run) end to end.
- Friction: ten items logged in `docs/skill-review/batch-20261031/friction-log.md` — cut brief mechanics, oversized inventories with no prop pipeline, invisible finale pressure, an unpassable novelty floor, a missing art-critic entry point, drone scale↔hitbox coupling, brittle human-confirm keys, registry max-lines, and unstated news combat profile.
- Suggestion: per-item fixes in the friction log.
- Triaged: fixed — SCB-8 in [PRODUCT_BACKLOG.md](PRODUCT_BACKLOG.md), completed 2026-10-31 including `skeleton-rhyme`/`finale-invisible` critic flags and proof levels 22-23.

## 2026-10-21 — qa-reviewer — reviews missed feel issues a human caught

- Tried: shipping enemy AI, rescue telegraphing, hard-mode tuning, and keyboard controls past review.
- Friction: the skill's Review section checked mechanics (pause, retry, crown) but never enemy legibility, first-time telegraphing, Normal/Hard separation, or control ergonomics — so four human playtest complaints ([HUMAN_FEEDBACK.md](../docs/HUMAN_FEEDBACK.md), 2026-10-21) reached the player uncaught.
- Suggestion: add the four feel checks to Review and require them in every test plan.
- Triaged: fixed directly — qa-reviewer Review section, 2026-10-21 (backlog SCB-7, done).
