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

Copy chosen platform and prop paints into `SpriteFactory.js` and register them. Point platforms at those keys. Decorations go in `props` and must not collide. Hitboxes stay on the opaque deck, not on a transparent margin.

The route has to be finishable with normal jumps. Gaps, moving platforms, and hazards still need a landing. The crown sits on a reachable deck. A new end-of-level idea uses [the crown encounter skill](../boss-creator/SKILL.md). Updating an old level does not replace its last stretch unless the user asked.

If the new art needs a hazard the registry cannot express, add an `enemies/<name>.js` spawn function, register it in `enemies/index.js`, and clean it up on retry. Do not invent a config field that nothing reads.

## Verify

Update tests that assert the level list, music ids, or background type when those lists grow. Keep the old levels covered. Run `npm test`.

Play `http://127.0.0.1:3000/?level=N` from the start to the crown. Confirm the selected paints are on screen, platforms match their art, a bonk works if you placed one, pause and a death retry, and the next level or the final clear. Check an earlier level if you touched shared builder or background code. A debug skip only proves the handoff.

Write `docs/level-builds/<level-id>.md` (create the folder if it is missing) with the assumptions, the selection paths, texture keys, hazard types used, files changed, the play URL, and what you could not verify. Name concept actors separately from the hazards that actually spawn.
