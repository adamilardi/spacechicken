---
name: space-chicken-enemy-animation-creator
description: Animate a painted Space Chicken enemy with more poses of the same paint function or with tween parameters. Use for animation production. Runtime wiring belongs to the integrator skill. Do not generate images.
---

# Enemy animation creator

Animate a chosen paint without changing its identity. Read [the authoring reference](../level-creator/references/spacechicken.md). Work in the candidate's `animation/` folder. Do not change combat rules or deploy.

## Start from the paint

Read `animation-handoff.md`, `paint.js`, and the manifest. Resolve paths from the manifest. If nobody has chosen a design, ask which candidate, and draft the action list without inventing a new silhouette.

The view is side-on. Facing is usually right, and patrol code flips the sprite. Record the gameplay display size, the root pivot, body bounds, and the actions that match real behavior: idle, a telegraph, the attack, recovery, a bonk squash, or a defeat. Skip states the actor does not need.

## How to move it

- Pose frames: add a pose argument to the same paint function, the way `drawChicken` takes wing and leg angles. Export one function and a list of pose names. Keep the canvas size, scale, and pivot identical on every pose. Do not recrop each frame to its visible pixels.
- Tweens: for a rigid slide, bob, spin, or recoil, write duration, easing, and the property that moves. Gameplay still owns the body's position when the actor is a hazard.
- A separate paint for a drip, spark, or muzzle flash when that effect has its own timing.

Do not generate images. Do not trace over a generated picture. If the paint function cannot show the pose, extend that function. Report a missing pose instead of substituting a new design.

Attacks need a tell, an active moment, and a recovery. Looping poses must meet. One-shot poses must say what plays next. Note the frame where a projectile or a hit should start. That note does not change the game's timers by itself.

## Preview and handoff

Preview at gameplay size on black and on white. Check alpha, clipped feet, a drifting pivot, a changed palette, and a loop that pops. A contact sheet of stills is not playback. The preview HTML should cycle the poses on the timing you chose.

Write `animation-manifest.json` next to the paints:

- Version, candidate id, source `paint.js`, canvas size, display size, root pivot, body bounds.
- Each state: method (`poses` or `tween`), ordered pose names or tween fields, durations, and whether it loops.
- Event times, such as when a slam is dangerous.

Paths are relative to the manifest. Point at [the integrator](../enemy-animation-integrator/SKILL.md) for wiring. Say which states were previewed and that they are not in the game yet.
