# Space Chicken role skills

Creation and review helpers for each game-dev role. Like the art skills, these are Markdown instructions in `skills/`; ask an agent to read the relevant `SKILL.md`. Putting them in this folder does not install them globally. The art and pipeline skills are indexed in [ART_SKILLS.md](ART_SKILLS.md).

| Skill                                                 | Purpose                                           | Main output                                   |
| ----------------------------------------------------- | ------------------------------------------------- | --------------------------------------------- |
| [game-designer](../skills/game-designer/SKILL.md)     | Briefs, tuning, difficulty curve, design reviews  | Brief, tuning notes, review findings          |
| [game-programmer](../skills/game-programmer/SKILL.md) | Architecture, bug fixes, performance, code review | Patch, review findings, check output          |
| [audio-creator](../skills/audio-creator/SKILL.md)     | Level tracks, effects, pipeline, mix passes       | `music/<id>.js` track, synth calls, mix notes |
| [story-writer](../skills/story-writer/SKILL.md)       | Titles, instructions, branch text, tone passes    | Strings in level data, copy review            |
| [producer](../skills/producer/SKILL.md)               | Scoping, backlog, sequencing, ship checklists     | Plan, backlog items, ship verdict             |
| [qa-reviewer](../skills/qa-reviewer/SKILL.md)         | Test plans, playtests, bug reports, ship gates    | Test plan, bug reports, gate verdict          |
| [ui-ux-creator](../skills/ui-ux-creator/SKILL.md)     | HUD, overlays, touch and gamepad input            | HUD/overlay patch, layout review              |
| [game-critic](../skills/game-critic/SKILL.md)         | Level quality + news-fidelity scoring, ship gate  | `docs/level-reviews/level-<id>.md` report     |

## Role coverage

Every game-dev role maps to at least one skill. New role skills carry the role; existing pipeline skills carry the build step.

- Game designer: `game-designer`
- Level designer: `game-designer` for the design, `level-creator` and `boss-creator` for the build
- Programmer: `game-programmer`
- Artist: `level-art-creator`, `enemy-art-creator`, `level-art-selector`
- Animator: `enemy-animation-creator`, `enemy-animation-integrator`
- Audio engineer: `audio-creator`
- Writer: `story-writer`
- Producer: `producer`
- QA tester: `qa-reviewer`
- Critic: `game-critic` (every level creation ends in its Play critic run; news levels also pass its fidelity gate)
- UI/UX: `ui-ux-creator`

None of these skills deploy. Deployment stays the command in `AGENTS.md`.
