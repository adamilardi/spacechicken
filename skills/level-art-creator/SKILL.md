---
name: space-chicken-level-art-creator
description: Paint Space Chicken level scenery in the existing canvas style, including a parallax layout and platform or prop paints. Use for a new place's look. Do not generate images. Level scripting and enemy design are separate skills.
---

# Level art creator

Paint scenery that can sit behind a Space Chicken level. Read [the authoring reference](../level-creator/references/spacechicken.md). This task stages paints. It does not add a campaign level or deploy.

## Read the place

Read the user's brief and the nearest `create*BackgroundLayout` in `BackgroundRenderer.js`, plus the platform paints in `SpriteFactory.js` (`paintLabDeck`, `paintMesa`, `paintIssHull`, cliff, station panel). Record theme, palette, world height, and which edges the chicken stands on.

The view is a side-scrolling platformer. Background layers are sky, far, mid, and near. They scroll horizontally. `scrollFactorY` stays 1 so the floor does not tear away from the platforms. Keep distant paint quieter than the chicken, hazards, and platform edges.

## What to paint

A background layout alone is not a place. Also paint the solid surfaces the chicken lands on, and any prop that is only decoration. Say which is which.

- A surface needs a top edge that reads as walkable at gameplay size, in the same flat style as `labDeck`, `mesa`, and `issHull`.
- A decoration has no collision. Do not paint a platform-shaped slab and call it scenery. That is how the removed Specimen Wing crusher was confused with a lab deck.
- Name the background `type` token you would add later (`facility`, `mars`, `iss` are taken). The layout function should fill four layers across the level's world width and height.
- Motion is runtime: parallax on the baked layers, and a tween only when a prop actually moves. A still paint is not an animation. State scroll behavior and that pause must freeze it.
- Plan seams by drawing a repeated strip in the preview. Do not claim a layer tiles until that strip has been looked at.

Write each picture as `paint.js` exporting `paint(ctx, width, height)`, or as a layout module exporting a function that records draw operations the way `BackgroundRenderer` does. Follow the painted-art rules. Do not call image generation or add a raster file.

Offer distinct silhouettes when the user wants alternatives. Use ids such as `level-acid-bay-a`. Start with a small batch when they do not give a count. Put no labels in the paint. Labels belong on the preview page.

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
