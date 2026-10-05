---
name: space-chicken-boss-creator
description: Build a distinct Space Chicken crown encounter with a painted actor, a new way to approach the crown, and a playtest. Use for an end-of-level set piece. Do not generate images. Ordinary enemy paints stay in the enemy art skill.
---

# Crown encounter creator

Build a distinct end-of-level encounter for one Space Chicken level. The game has no boss object. The chicken still finishes by touching the crown. The encounter is the space, the actor, and the rule that make that last stretch play differently from the rest of the level.

A recolored lab tech, a bigger health pool, or a copied boarder wave is not a new encounter. Shared helpers for platforms, tweens, bonk, and the phaser can be reused. Read [the authoring reference](../level-creator/references/spacechicken.md). Do not deploy. Leave other levels' layouts alone unless the user asked to change them.

## Look at the level

Read that level's `LEVEL_DEFINITIONS` entry, `LEVEL_CONTENT`, background type, gravity, and hazards. Read how the crown is placed and how `resolveHazardContact` and, on Earthwatch, the phaser treat actors. Compare the last stretch of the other levels so this one adds a new idea.

Write a short brief and keep going on routine choices. Name the level, the painted silhouette, the display size, and the body. Name the rule the player learns, the tell, the safe response, and what touching the crown does. The rule has to change the approach: a platform that only holds after a bonk, a shootable gate, a timed beam over the last gap, a moving deck that lines up with the crown. One idea, taught once, then pressed harder. Leave a window where a jump or a shot still works. Do not cover every legal landing.

## Paint it

Paint the actor or machine with a `paint` function and register it through `SpriteFactory`, following the painted-art rules. Do not generate images. If a selected `paint.js` already exists, use that file. Do not redraw a new identity over it.

Bonk actors get `paintBonkPad`. Shootable actors get a lens and go through the phaser overlap only when this level sets `PHASER`. Unmarked hazards get neither. Animate with extra poses of the same paint or with tweens. Tie the tell to the same state that turns the hitbox on. Pause freezes that state.

Match the body to the solid pixels. Keep glows outside the hitbox. Clean up tweens, delayed calls, and spawned pieces on a fall, a retry, a skip, and shutdown. The crown must stay reachable, including in co-op if this level is raced. Award the clear once. A stunned or defeated part is not the clear.

## Verify

Add a focused test when the new rule has a state change, a timer, or a cleanup path that could strand the crown. Run `npm test`. Play `/?level=N` through the last stretch: the tell, the answer, a failure, a retry, pause, and the crown. A debug skip does not prove the stretch. Note the URL and what you did not play. Co-op and the touch controls matter when the encounter changes where the chicken stands or when it needs the phaser.

Write `docs/boss-builds/<id>.md` with the level, the rule, the texture keys, the files, how to start the level, and the check results. Say whether the encounter is playable. A paint with no placement is not a finished encounter.
