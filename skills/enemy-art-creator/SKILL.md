---
name: space-chicken-enemy-art-creator
description: Paint a Space Chicken enemy in the existing canvas style and write an animation handoff. Use for a new hazard or actor silhouette. Do not generate images. Animation and level placement are separate skills.
---

# Enemy art creator

Paint a new Space Chicken actor with the same canvas style as the actors already in the game. Read [the authoring reference](../level-creator/references/spacechicken.md). Creating a picture does not add a level placement, a new hit rule, or a deploy.

## Look at the current pictures

Read `SpriteFactory.js` paints for the nearest role: bonk actors (`paintLabTech`, `paintSentryOrb`, `paintBeetle`, `paintHopper`), the shootable boarder (`paintBoarder`), and unmarked hazards (`paintAcidDrop`, `paintBoulder`, `paintDustDevil`, `paintCrusher`). Note canvas size, facing, and whether the actor wears `paintBonkPad` or a lens.

Decide the role before painting. A bonk actor is stomped from above. A shootable actor is a phaser target. An unmarked hazard is only lethal. State the camera as side view, facing right, at the size it will appear on a platform.

## Paint, do not generate

Write `paint.js` that exports `paint(ctx, width, height)`. Follow the painted-art rules in the authoring reference. Do not call image generation or add a raster file.

Give each design a stable id such as `enemy-vat-lurker-a`. Make a small batch when the user does not ask for a count. Vary the silhouette, not only the fill colors. Keep part count, markings, and asymmetry stable across revisions. Keep earlier revisions on disk.

Draw a neutral standing pose with separated parts and padding for later motion. Leave out motion blur, muzzle flashes, and speed lines. The canvas starts transparent. Sample a corner pixel and confirm alpha before calling the picture done.

## Handoff

For each candidate write `animation-handoff.md` with:

- Id, `paint.js` path, canvas size, display size, and a top-left pixel pivot.
- The silhouette, colors, and parts later frames must keep.
- Which parts move. Name joints and the muzzle or contact point when they are visible. Call hidden structure unknown.
- A method: another pose of this paint function when the outline changes, a tween when the whole sprite slides or bobs, or a separate effect for drips and sparks. Whole-sprite flashing is not an action that needs moving parts.

The handoff is not the animation. Do not add frame loops unless the user asks.

## Deliver

Stage under `art-candidates/<brief-id>/`. Write `brief.md`, each `paint.js`, a tiny preview HTML that draws the canvas at 1x and 3x on black and on white, `animation-handoff.md`, and `manifest.json`.

```json
{
    "schema_version": 1,
    "brief_id": "acid-bay",
    "kind": "enemy",
    "brief_path": "brief.md",
    "candidates": [
        {
            "id": "enemy-vat-lurker-a",
            "title": "Vat lurker",
            "status": "painted",
            "summary": "A squat glass-bellied crawler with a gold spring-cap.",
            "assets": [
                {
                    "role": "canonical-default-view",
                    "path": "enemy-vat-lurker-a/paint.js",
                    "width_px": 48,
                    "height_px": 56,
                    "alpha": true,
                    "readiness": "concept"
                }
            ],
            "preview_paths": ["enemy-vat-lurker-a/preview.html"],
            "spec": {
                "camera": "side-view",
                "facing": "right",
                "role": "bonk",
                "palette": ["#39c46a", "#ffd54a"],
                "target_display": "48x56",
                "anchor": { "space": "pixels", "origin": "top-left", "x": 24, "y": 52 }
            },
            "animation_handoff_path": "enemy-vat-lurker-a/animation-handoff.md",
            "checks": { "dimensions": "pass", "alpha": "pass", "silhouette": "unverified" },
            "limitations": []
        }
    ]
}
```

Paths are relative to the manifest. `status` is `painted` or `spec-only`. `readiness` is `concept` or `verified`. Checks are `pass`, `fail`, `unverified`, or `not-applicable`. Use `enemy-manifest.json` when `manifest.json` is already a level manifest. Do not register the texture or edit `LevelConfig.js` in this task.
