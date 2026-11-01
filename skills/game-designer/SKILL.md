---
name: space-chicken-game-designer
description: Design and review Space Chicken systems, pacing, and difficulty. Use for briefs, tuning, difficulty curves, and design reviews. Level scripting stays in the level skill.
---

# Game designer

Own the fun: what the player learns, when pressure rises, and where they rest. Read [the authoring reference](../level-creator/references/spacechicken.md) and the level you are judging (`LEVEL_DEFINITIONS` entry, `LEVEL_CONTENT`, gravity, hazards, crown approach) before giving notes. Do not deploy.

## Create

Write a short brief before tuning: the one idea the level teaches, where it is taught safely, where it is pressed, and where the player rests before the crown. Name the tell, the safe response, and the failure cost for each hazard or gate on the route.

Every new-level brief also carries the three creativity artefacts the critic scores (owned by [level-creator](../level-creator/SKILL.md), judged by [game-critic](../game-critic/SKILL.md)): the Novelty Ledger, the Signature Mechanic Canvas, and the Topology Fingerprint, plus two killed alternatives. A brief whose idea a shipped level already teaches the same way is sent back at brief stage — that is the cheapest critic loop there is. Design review scores briefs on the critic's six dimensions; novelty below "fresh" needs a new canvas, not stronger adjectives.

Tune with authored numbers for Normal; hard mode scales them at spawn (`applyHardModeConfig` plus the `HARD_MODE` mults). Never write separate hard numbers into level data. Level numbers are leaderboard keys: tune outliers in place, never renumber. Keep the mode ladder in `docs/GAME_MODES.md`: two modes, separate hard bests.

## Review

Play or watch the route start to crown and score it: readable opener, one idea at a time, calm window before the finale, finishable with normal jumps, crown on a reachable deck. Flag stacked hazards with no shared safe response, gates with no tell, and rests that never come. Check the campaign curve: hazard density should roughly rise across levels with dips after finales (see GB-3 in `docs/GAME_BACKLOG.md`). Anchor new levels to the shipped bands — contra 2.30–2.83 dynamics/1k px with 5–7 hazard types, news 1.0–2.2 with 3–5 types; a contra build under its band is sent back at review.

For contra-style briefs, review the **Height & Path Map** (in [level-creator](../level-creator/SKILL.md)) as a design document, not a drawing: count the tiers, check each tier's verb (same-tier gunfight, fan lane, drop-in, defended high ground, underpass fight, pressured mover, vertical set piece), and price every split — what the low road costs and pays versus the high road, and where they rejoin. Send back: a contra brief with one fighting height; a branch that dominates (safer _and_ richer _and_ shorter); boarders placed where no aim direction can answer them; a tall tier whose only climb is an untaught double jump; cross-height pressure stacked without a shared safe response. Height variety is pacing, not scenery: teach one tier change safely, press it under fire, then combine tiers before the finale.

Write findings as observed behavior plus the smallest tuning change, with file and level id. Leave implementation to the level, weapon, or programmer skill unless the fix is a one-number tune you were asked to make.

## Verify

Run `npm test` when you touch data. Record the play URL (`?level=N`), the mode (Normal/Hard), and what you could not verify.
