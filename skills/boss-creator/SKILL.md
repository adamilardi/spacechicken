---
name: space-chicken-boss-creator
description: Build a distinct Space Chicken crown encounter with a painted actor, a new way to approach the crown, and a playtest. Use for an end-of-level set piece. Ordinary enemy art stays in the enemy art skill.
---

# Crown encounter creator

Build a distinct end-of-level encounter for one Space Chicken level. The game has no boss object. The chicken still finishes by touching the crown. The encounter is the space, the actor, and the rule that make that last stretch play differently from the rest of the level.

A recolored lab tech, a bigger health pool, or a copied boarder wave is not a new encounter. Shared helpers for platforms, tweens, bonk, and the phaser can be reused. Read [the authoring reference](../level-creator/references/spacechicken.md) and the boss roster in `scripts/boss-review.mjs` (`BRIEFS`). Do not deploy. Leave other levels' layouts alone unless the user asked to change them.

**Novelty against the roster.** Most shipped bosses share pace → telegraph → charge. That rule is owned. Before painting, name in the build brief which roster rule yours does _not_ use as its core, or how its core decision differs (positioning, timing window, adds, arena state). An encounter whose only novelty is HP, speed, or tint is `stale` by definition and the boss panel caps its fun at 2. Give the encounter one arena interaction no sibling has (a gate the fight opens/closes, a deck that moves, a hazard the boss arms) so the _space_ fights differently, not only the actor.

**News boss themes.** When a news brief declares a boss theme (see the boss theme test in the news-to-level skill), this encounter is mandatory, and the actor is the story's dominant adversary — its silhouette, tell, and rule come from the article, not from the contra roster. News bosses usually ship with `Combat profile: contra` (phaser on) so the player fights the encounter; a phaser-off news boss must state its fight rule (bonk, armed arena hazard) in the brief, and the boss panel judges whether that answer plays. Disaster stories keep the boss abstract (the storm, the fire front) — never a victim.

## Look at the level

Read that level's `LEVEL_DEFINITIONS` entry, `LEVEL_CONTENT`, background type, gravity, and hazards. Read how the crown is placed and how `resolveHazardContact` and, on Earthwatch, the phaser treat actors. Compare the last stretch of the other levels so this one adds a new idea.

Write a short brief and keep going on routine choices. Name the level, the painted silhouette, the display size, and the body. Name the rule the player learns, the tell, the safe response, and what touching the crown does. The rule has to change the approach: a platform that only holds after a bonk, a shootable gate, a timed beam over the last gap, a moving deck that lines up with the crown. One idea, taught once, then pressed harder. Leave a window where a jump or a shot still works. Do not cover every legal landing.

**Arena heights (contra levels).** The arena uses the level's tiers, not a flat pit: name in the brief which heights the fight occupies (boss tier, the player's firing tiers, any add tier), how the player changes height mid-fight (stairs, lift, drop-in), and how each height stays pressured — adds or a static hazard on the tier the boss is not covering, so camping one height is not the whole fight. Fire aims forward/up/diagonal (down from the air), so the boss and its adds must be shootable from a tier the player can stand on along a real aim line; a boss parked where no aim direction reaches it is a dodging gate, not a gunfight. The crown approach is covered at every height the arena offers (see the finale rules in [level-creator](../level-creator/SKILL.md)): changing tier must never walk around the encounter. Keep one safe height change available while the boss telegraphs — height pressure comes from the fight, not from a climb with no safe window.

## Paint it

Put encounter behavior in that level's `levels/<name>.js` module and `LEVEL_CONTENT` entry. Add an `enemies/<name>.js` spawn function registered in `enemies/index.js` only when the encounter needs a hazard the registry cannot express. Register any new file in `config/runtime-assets.cjs` `rootFiles`.

Paint the actor or machine with a `paint` function and register it through `SpriteFactory`, following the painted-art rules. If a selected paint or generated image already exists, use that file. Do not redraw a new identity over it.

Bonk actors get `paintBonkPad`. Shootable actors get a lens and go through the phaser overlap only when this level sets `PHASER`. Unmarked hazards get neither. Animate with extra poses of the same paint or with tweens. Tie the tell to the same state that turns the hitbox on. Pause freezes that state.

Match the body to the solid pixels. Keep glows outside the hitbox. Clean up tweens, delayed calls, and spawned pieces on a fall, a retry, a skip, and shutdown. The crown must stay reachable, including in co-op if this level is raced. Award the clear once. A stunned or defeated part is not the clear.

## Verify — boss panel plus level critic

Add a focused test when the new rule has a state change, a timer, or a cleanup path that could strand the crown. Run `npm test`. Play `/?level=N` through the last stretch: the tell, the answer, a failure, a retry, pause, and the crown. A debug skip does not prove the stretch. Note the URL and what you did not play. Co-op and the touch controls matter when the encounter changes where the chicken stands or when it needs the phaser.

Then both critic gates, in this order: `node scripts/boss-review.mjs <id>` (the persona panel must PASS; add a `BRIEFS` entry for a new boss first, with its rule/tell/safe response) and `npm run critic:level -- <id>` for the whole level. An encounter that passes its boss panel but leaves the level `clone`/`stale` still iterates. Record both verdicts in the boss build report; maximum three loops, then hand the reports to the user.

Write `docs/boss-builds/<id>.md` (create the folder if it is missing) with the level, the rule, the texture keys, the files, how to start the level, and the check results. Say whether the encounter is playable. A paint with no placement is not a finished encounter.
