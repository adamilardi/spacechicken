---
name: space-chicken-level-art-selector
description: Compare Space Chicken paint candidates and record the set for a level. Use when choosing scenery and enemies from existing briefs. Do not generate images or build the level.
---

# Level art selector

Help choose a coherent set of painted scenery and actors. Read [the authoring reference](../level-creator/references/spacechicken.md). This skill records a choice. It does not paint new art, edit the running game, or deploy.

## Compare

Read the level brief and the candidate manifests or `art-candidates/` folders. Manifests are named `manifest.json`, `enemy-manifest.json`, or `level-manifest.json`; check all three names before concluding a folder has no manifest. For each manifest, read `schema_version`, `kind`, and each candidate's `id`, `assets`, `preview_paths`, `spec`, `checks`, `limitations`, and `animation_handoff_path`. Resolve paths from the manifest's folder.

If two candidates share an id, qualify them with the manifest path. If a shipped paint has no manifest, catalog it in the selection folder with its `SpriteFactory` or `BackgroundRenderer` function name and leave the source file as it is.

Open `paint.js` and the preview HTML. A spec-only entry can be discussed. It cannot fill a selected slot. Compare:

- Side view, facing, scale, and palette against the chicken and the nearest shipped level.
- Whether platforms read as solid and decorations do not.
- Coverage: background layout, walkable surfaces, ordinary hazards, and a crown approach. A strong sky does not fill the platform slot.
- Bonk pads on bonk actors, a lens on shootable actors, and no marker on lethal hazards.
- Animation handoffs that name a pose-of-the-same-paint or a tween, with a stable pivot.

Say what is still concept work. A chosen direction can stay `needs-work`.

## Record the choice

Show a short table of ids, preview links, and limits, plus one recommended set. If the user already chose, record that. If they asked you to choose, set the decision to delegated. A recommendation is not a confirmation.

Do not swap in a different paint or quietly rewrite the chosen one. Note requested revisions on their own. Each role can come from a different candidate. Record the exact path.

Write `art-selections/<level-id>/selection.json` and `selection.md`. Use a new revision instead of overwriting an older selection. Paths in the file are relative to the selection folder.

```json
{
    "schema_version": 1,
    "level_id": "acid-bay",
    "decision_status": "draft",
    "decision_by": null,
    "brief_path": "../../art-candidates/acid-bay/brief.md",
    "choices": [
        {
            "role": "platform",
            "source_manifest": "../../art-candidates/acid-bay/manifest.json",
            "candidate_id": "level-acid-bay-a",
            "asset_path": "../../art-candidates/acid-bay/level-acid-bay-a/grate.js",
            "reason": "The grate top reads as a landing edge next to the chicken.",
            "production_status": "needs-work",
            "remaining_work": ["Check the repeated seam in game."],
            "animation_handoff_path": null
        }
    ],
    "unfilled_roles": ["ordinary-enemy"],
    "requested_revisions": [],
    "alternates": [],
    "notes": "Recommendation waiting on the user."
}
```

Use `decision_status: confirmed` only after an explicit user choice or an explicit request to decide. Set `decision_by` to `user` or `agent-delegated`. `production_status` is `ready`, `needs-work`, or `unverified`. Check that the chosen `paint.js` files exist and the roles match. Finish with the set, anything still open, and the file links.
