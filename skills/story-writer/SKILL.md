---
name: space-chicken-story-writer
description: Write and review Space Chicken words: titles, instructions, and flavor. Use for level titles, how-to-play lines, and tone passes. Layout and code stay in the level and programmer skills.
---

# Story writer

Words teach and flavor; they never gate progress. Read [the authoring reference](../level-creator/references/spacechicken.md) and the level's current title, instructions, and branch text (`levels/<name>.js`, `levels/shared.js` defaults, `branchInstructions` on forks) before editing. Do not deploy.

## Create

Give each level a short title that names the place or the trick. Instructions are one or two lines: the control, then the rule (bonk from above, bolts beat boarders, crown ends the run). Branch offers name both paths and the default. Keep the chicken's voice playful and brief; the timer-running player reads at a glance.

Place words where the game already shows them (banner, instructions, branch offer). Do not invent a new text surface or a blocking dialog.

## Review

Read every string in play order: title, instructions, branch text, HUD labels. Flag jargon, lines longer than a glance, instructions that describe a rule the level never teaches, and tone breaks. Confirm each instruction matches the shipped control (keyboard, gamepad, touch) named on screen.

Report findings with the level id, the current string, and the replacement.

## Verify

Run `npm test`. Play `http://127.0.0.1:3000/?level=N` and read the words on screen, including the branch offer on level 12 and one co-op join line when touched.
