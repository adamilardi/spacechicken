---
name: space-chicken-level-art-creator
description: Paint a genuinely new Space Chicken place in the existing canvas style, including a parallax layout and platform or prop paints. Use for a new place's look; generate the art as images (Muse Image) or canvas paint, style-matched to the shipped game. Level scripting and enemy design are separate skills.
---

# Level art creator

Paint scenery that can sit behind a Space Chicken level — and that no shipped place could be mistaken for. Read [the authoring reference](../level-creator/references/spacechicken.md) and the Novelty Ledger in the level's build report. This task stages paints. It does not add a campaign level or deploy.

## Read the place

Read the user's brief and the nearest `create*BackgroundLayout` in `BackgroundRenderer.js`, plus the platform paints in `SpriteFactory.js` (`paintLabDeck`, `paintMesa`, `paintIssHull`, `cliff`, `stationPanel`). Record theme, palette, world height, and which edges the chicken stands on.

The view is a side-scrolling platformer. Background layers are sky, far, mid, and near. They scroll horizontally. `scrollFactorY` stays 1 so the floor does not tear away from the platforms. Keep distant paint quieter than the chicken, hazards, and platform edges.

## Distinct composition

A new palette is not a new place. Open the shipped-background catalog in [the authoring reference](../level-creator/references/spacechicken.md) and compare layer by layer. The new background must differ from every shipped type in at least two composition devices, not just colors. Devices to compare and combine:

- Sky: plain gradient, gradient plus glow, enclosed ceiling, asymmetric glow.
- Far: even silhouette loop, arch frames, ribcage arcs, celestial bodies.
- Mid: even shape loop, irregular set pieces, one landmark, diagonals.
- Near: ground ridge, teeth top and bottom, foreground framing, grate, slab.
- Rhythm: even loop, irregular spacing, one-off landmark.

The retired default is gradient plus evenly-spaced band loops plus ground ridge plus full-width glow strip. Do not ship it again unless the brief justifies it and no shipped level in the same campaign arc uses it. Record the devices in the manifest `spec` as `composition_devices` and name the two differences in the candidate summary.

**Three directions, one survivor.** Paint three divergent directions that differ in _silhouette and rhythm_, not three palettes of one layout: e.g. enclosed ribs vs open landmark vs diagonal machine. Give each one **signature landmark** — a single large readable shape that names the place at gameplay size (the heart in `womb`, the tether in `skyhook`) — and one **set-piece silhouette** the level's signature solid will wear. Kill two directions with one-line reasons in `brief.md`; only the survivor gets platforms, props, and polish. Reusing a shipped background `type` with a new palette is not a direction: it is the `background-recycled` critic flag, and the Art critic sends it back. When a brief reuses a shipped type on purpose (branch/vault), the new composition device must be visible in the preview, not just claimed in the manifest.

**Art critic gate.** Before selection, stage the survivor's preview at gameplay size and run the Art critic ([game-critic](../game-critic/SKILL.md)): screenshot the preview, check the two-device difference and the landmark read at 1x, and record the verdict in the manifest `checks` (`novelty: pass|fail`). Art with `novelty: fail` does not go to the selector.

## What to paint

A background layout alone is not a place. Also paint the solid surfaces the chicken lands on, and any prop that is only decoration. Say which is which.

- A surface needs a top edge that reads as walkable at gameplay size, in the same flat style as `labDeck`, `mesa`, and `issHull`.
- A decoration has no collision. Do not paint a platform-shaped slab and call it scenery. That is how the removed Specimen Wing crusher was confused with a lab deck.
- Paint more than one platform read: at least a wide deck, a narrow perch, and one shaped piece (stair run, angled/sloped silhouette, bridge, or shaft lip) so levels are not rows of identical flat slabs. Shapes are silhouettes and trims on honest rectangular hitboxes — say where the player actually stands on each.
- **Paint the heights, not just the ground.** When the brief is contra-style (a Height & Path Map with tiers), each tier gets its own deck read — main line, upper line, and any pit/shaft line differ in edge, body, or trim so height is readable before a jump — plus the vertical set piece (shaft wall, tower, bridge, stair fort) as a painted silhouette, and height cues in the background (stacked structures, hanging gear, pit depth) that agree with the real `WORLD_HEIGHT`. A tall world painted as a single-storey backdrop makes its upper tiers read as floating slabs; a tier that only its collision reveals fails the route-contrast budget below. State per paint which tier it dresses.
- When the brief is a real-world story, paint its recognizable props too (the brief's element inventory: currency signs, tools, vehicles, machines), as decorations or set dressing at gameplay size. A themed palette without the story's objects is not finished art. Props are judged from in-game screenshots at gameplay size: a prop must read at roughly 48px or larger on screen, and a region of the background plate does not count as a shown prop (tile framing crops plates — generate a dedicated prop texture through the generated-prop path in the news-to-level skill instead).
- **Route contrast budget:** along the actual route, the player, the decks they must distinguish, the Crown, and any objective or progress-bearing prop stay foreground-legible against every background they cross; broad dark or busy scenery mass sits behind critical paths, never on them. A plate that passes in isolation but swallows the Crown, a gate beam, or a sample prop on its beat fails here — judge contrast on the route at gameplay size with the game's own sprites in frame, not on the empty plate.
- Name the background `type` token you would add later (`facility`, `mars`, `iss` are taken). The layout function should fill four layers across the level's world width and height.
- Motion is runtime: parallax on the baked layers, and a tween only when a prop actually moves. A still paint is not an animation. State scroll behavior and that pause must freeze it.
- Plan seams by drawing a repeated strip in the preview. Do not claim a layer tiles until that strip has been looked at.

Write each picture as `paint.js` exporting `paint(ctx, width, height)`, or as a layout module exporting a function that records draw operations the way `BackgroundRenderer` does. Follow the art rules in the reference. A generated raster is allowed: save it under the level's asset folder, record it in the manifest, and note how it will be loaded as a texture.

Offer distinct silhouettes when the user wants alternatives. Use ids such as `level-acid-bay-a`. Start with a small batch when they do not give a count. Put no labels in the paint. Labels belong on the preview page.

## Generated plate prompt template

When the place is a generated raster (news-to-level step 3), prompt from this template so plates frame the live sprites instead of doubling them:

> Flat side-view platformer background, `<palette>`, `<composition devices>`, chunky readable silhouettes, quiet distant detail. Space Chicken universe. **No characters, no chicken, no crowns, no text, no labels** — the live sprites supply those; painted ones double and read as clutter at gameplay size.

Enemy cutouts use the same style anchor with `isolated on a flat solid magenta background` appended, then `node scripts/key-enemy.mjs <in> <out>` for the alpha. If a plate comes back with characters or crowns despite the clause, regenerate — do not ship it and crop around them.

## Deliver

Stage under `art-candidates/<brief-id>/`. Leave shipped levels alone. Write `brief.md`, paints, a preview HTML (1x on black), and `manifest.json`. If that filename is already an enemy manifest, use `level-manifest.json`.

```json
{
    "schema_version": 1,
    "brief_id": "acid-bay",
    "kind": "level",
    "brief_path": "brief.md",
    "candidates": [
        {
            "id": "level-acid-bay-a",
            "title": "Acid bay",
            "status": "painted",
            "summary": "Green vat haze over dark gantries, with grated walkways.",
            "assets": [
                {
                    "role": "background-layout",
                    "path": "level-acid-bay-a/layout.js",
                    "width_px": null,
                    "height_px": null,
                    "alpha": false,
                    "readiness": "concept",
                    "collision": null,
                    "motion": { "method": "code", "kind": "parallax", "animated_frames": false }
                },
                {
                    "role": "platform",
                    "path": "level-acid-bay-a/grate.js",
                    "width_px": 96,
                    "height_px": 24,
                    "alpha": true,
                    "readiness": "concept",
                    "collision": { "shape": "rect", "body": "top deck" },
                    "motion": { "method": "code", "kind": "static", "animated_frames": false }
                }
            ],
            "preview_paths": ["level-acid-bay-a/preview.html"],
            "spec": {
                "camera": "side-view",
                "scroll": "horizontal",
                "background_type": "acid-bay",
                "palette": ["#062016", "#39c46a"],
                "layer_order": ["sky", "far", "mid", "near"]
            },
            "checks": { "dimensions": "pass", "alpha": "pass", "seams": "unverified" },
            "limitations": []
        }
    ]
}
```

Paths are relative to the manifest. `status` is `painted` or `spec-only`. `collision` is null for a non-solid layer. Check values are `pass`, `fail`, `unverified`, or `not-applicable`. Do not edit `LevelConfig.js` or `BackgroundRenderer.js` in this task.
