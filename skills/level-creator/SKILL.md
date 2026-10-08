---
name: space-chicken-level-creator
description: Build and verify a playable Space Chicken level from selected paints and existing hazards, ending at the crown. Use when adding a level or wiring chosen scenery. Enemy concept painting and animation are separate skills. Do not generate images.
---

# Level creator

Add a playable Space Chicken level. Read [the authoring reference](../level-creator/references/spacechicken.md) and the working tree before editing. Do not deploy.

## Inputs

Accept a `selection.json` from the selector or paths the user names. For version 1, read `level_id`, `decision_status`, `choices`, `unfilled_roles`, and `requested_revisions`. Resolve each `asset_path` from the selection file. A draft recommendation is not a choice. If the art is still ambiguous, ask once, and keep reading the level format while you wait. Do not quietly substitute a different paint.

A `paint.js` file is not a hazard yet. Use hazards that already run for the layout. Record concept actors that were not wired. Build a new actor only when the user asked for that actor in the level, and paint it with the painted-art rules.

## Author the level

Add a `levels/<name>.js` module and register it in `levels/index.js`. Set `NEXT_LEVEL` on the previous finale only when this level extends the campaign. Add a `music/<id>.js` track and register it in `music/index.js` so the level does not fall through to level 1's track. Register both new files in `config/runtime-assets.cjs` `rootFiles`, or the local server 404s them and the Cloudflare build omits them.

Give it a title, gravity, world size, kill zone, start, and crown. Open with a readable jump, introduce one hazard, then stack ideas, and leave a rest before the crown. Copy platform keys and hazard entries from an existing level module. A new background `type` needs a `create*BackgroundLayout` plus branches in `ensureLayout` and `drawLayer`. Bake height follows that level's world height. Keep `scrollFactorY` at 1.

Copy chosen platform and prop paints into `SpriteFactory.js` and register them. Point platforms at those keys. Decorations go in `props` and must not collide. Hitboxes stay on the opaque deck, not on a transparent margin. Place every boarder home over a deck: a boarder spawned over a gap falls out of the world, and on a `CROWN_SHIELD` level that free kill opens the gate early.

The route has to be finishable with normal jumps. Gaps, moving platforms, and hazards still need a landing. The crown sits on a reachable deck. A new end-of-level idea uses [the crown encounter skill](../boss-creator/SKILL.md). Updating an old level does not replace its last stretch unless the user asked.

If the new art needs a hazard the registry cannot express, add an `enemies/<name>.js` spawn function, register it in `enemies/index.js`, and clean it up on retry. Do not invent a config field that nothing reads.

## Stacked floors (contra levels)

Contra levels (8+) run on at least two stacked lines, not one flat deck. Upper lines are full run routes with their own optional hazards, reached by stairs or staggered hops and passable underneath:

- Clearance: at least 56px between an upper deck's underside and the lower deck's top (the chicken is 32px tall).
- Climbs: every upward move fits a normal single jump for the level's gravity (rise ≤ v²/2g − 5px). Drops can be any depth; there is no fall damage.
- No jump-through: bodies are solid from all sides, so climbs need stairs, staggered overlaps, or side gaps — never a jump up through a deck. Target decks give 190px+ of landing run; any touch or overlap plus a single-jumpable rise connects.
- Boarders stay on the main line: keep shelves ≥120px above patrol decks (boarder hop peaks ~112px), or station a wave up top on purpose.
- Hazard lanes stay clear: emitters, patrols, and slam footprints must clear every overlapping deck by 8px or more.
- A stacked line needs ≥32px of shared run with 56–200px of vertical separation from its neighbor; anything less is a step, not a line.
- Reachability: every deck joins one directed graph from the opener. An edge exists when decks touch or overlap with a single-jumpable rise (up) or any drop (down), or the side gap is ≤260px with a single-jumpable rise. `tests/contra-levels.test.cjs` walks the graph; new decks fail there until the graph connects.
- Two deck textures per level: the main line and the shelves/set pieces never share one paint. The accent inverts the main deck (pale edge on dark body, or dark on pale) so the second route reads at a glance. Copy-paste skeletons across levels are banned: each contra level carries one signature solid set piece (bridge, shaft, stair, trench, or tower) that no sibling level repeats.
- Checkpoints stand before gates: never inside on/off beam timing and never beside a live boarder home. A respawn must give one safe breath.
- Every shelf pays or threatens: a bypass around trouble, a drone, a bonk, or a stationed runner — never an empty plank.
- Finale beams cover every route to the crown: if a lift or shelf lets the player duck the band, the beam is decorative and must grow or move.

## Verify

Update tests that assert the level list, music ids, or background type when those lists grow. Keep the old levels covered. Run `npm test`.

Play `http://127.0.0.1:3000/?level=N` from the start to the crown. Confirm the selected paints are on screen, platforms match their art, a bonk works if you placed one, pause and a death retry, and the next level or the final clear. Check an earlier level if you touched shared builder or background code. A debug skip only proves the handoff.

Write `docs/level-builds/<level-id>.md` (create the folder if it is missing) with the assumptions, the selection paths, texture keys, hazard types used, files changed, the play URL, and what you could not verify. Name concept actors separately from the hazards that actually spawn.
