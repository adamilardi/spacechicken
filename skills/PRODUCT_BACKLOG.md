# Space Chicken skills product backlog

This backlog tracks improvements to the skill set in `skills/` — the skills are the product here, not the game. Items come from cross-repo reviews and the agent feedback log ([AGENT_FEEDBACK.md](AGENT_FEEDBACK.md)). Triaged feedback links to the item id below.

Priorities: **P0** blocks correct production (a skill leads agents to broken output); **P1** high value, do next; **P2** nice to have.

Seeded from the cross-repo skills review, 2026-10-08.

## P1 — do next

- **SCB-1 Port the QA skills (reviewer + personas).** NovaWing's `game-reviewer` and `persona-panel` already document Space Chicken's capture tooling, but live only in `/home/adam/rtype-prototype/skills`. Level reviews here are ad hoc (`docs/level-builds/contra-pass.md`, `*-proreview.md`). Copy and adapt: entry routes (`?level=N`, seeded suite), gate section, persona sessions rewritten for jumps, bonk, phaser, and the co-op race. (Mirrors NVB-4.)
- **SCB-2 Reconcile weapon-creator with the contra gun rack.** The 9-gun rack (`weaponsForLevel`: Scatter through Halo) is documented only in `level-creator/references/spacechicken.md`; the weapon skill still describes "an extra choice". Promote rack rules, switch persistence, and per-level unlocks into the skill so agents don't under-build.
- **SCB-3 Add evidence folders to level build reports.** Follow NovaWing's `docs/level-builds/evidence/` (screenshots + JSON per level) so contra-arc claims stay checkable without replaying.

## P2 — nice to have

- **SCB-4 Validate composition devices mechanically.** `composition_devices` is already a manifest field; add a small check script that flags a background reusing a shipped device pair, mirroring NovaWing's novelty checker.
- **SCB-5 Standardize manifest filenames.** The selector tolerates `manifest.json`, `level-manifest.json`, and `enemy-manifest.json`; pick one per kind and migrate old folders.
- **SCB-6 Link these backlogs from `docs/ART_SKILLS.md`.** One line so agents discover the backlog and the feedback log.

## Done

None yet — move finished items here with the completion date.
