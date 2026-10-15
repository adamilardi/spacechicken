# Space Chicken game backlog

Product ideas for the game itself: modes, levels, systems, difficulty. This is distinct from [skills/PRODUCT_BACKLOG.md](../skills/PRODUCT_BACKLOG.md), which tracks the skill set, and from [HUMAN_FEEDBACK.md](HUMAN_FEEDBACK.md), which logs verbatim player feedback.

Priorities: **P0** blocks correct play; **P1** high value, do next; **P2** nice to have.

## P1 — do next

None currently — GB-1 and GB-2 are done; next P1 comes from playtesting or new requests.

## P2 — nice to have

- **GB-3 Add a static difficulty scorer.** A design-time check scoring each level (hazard density per 500px window, wave counts, gates): assert calm windows before finales and a roughly rising campaign curve. Tune outliers in place — never renumber levels, since level numbers are leaderboard keys.
- **GB-4 State the recovery rule.** Every checkpoint must be clearable from zero: base phaser, no temp gun, no rescue bonus. True by construction today (pods are optional); document it in the level-creator skill and add one assertion to the polish tests.
- Deliberately not planned: dynamic rank (Garegga-style adaptive difficulty). Fixed rules are a feature for leaderboard comparability; modes set the range instead.

## Done

- **GB-2 Define the mode ladder before building hard mode.** Completed 2026-10-09: [GAME_MODES.md](GAME_MODES.md) approved (two modes, separate hard bests, `H`/gamepad-`B` toggle).
- **GB-1 Add a hard difficulty mode.** Completed 2026-10-09: title toggle (button/`H`/gamepad `B`, persisted), timer/speed remix (`HARD_MODE` mults, physics untouched), `HARD` HUD/banner markers, separate local + D1 leaderboards. Deploy order: run the `schema.sql` migration first, then deploy.
