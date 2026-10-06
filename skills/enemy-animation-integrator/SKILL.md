---
name: space-chicken-enemy-animation-integrator
description: Wire a Space Chicken enemy's painted poses or tweens into the running game and verify playback, pause, and hazard contact. Use for runtime animation. Do not generate images or change the silhouette.
---

# Enemy animation integrator

Make a supplied animation play on the live actor. Read the manifest, the paint, and [the authoring reference](../level-creator/references/spacechicken.md). Keep the chosen silhouette and the current hit rules unless the user also asked for behavior changes. Do not deploy.

## Find the owner

Read `SpriteFactory.addCanvasTexture`, `createExpeditionSprites`, `SpaceChicken.createAnimations`, and the actor's spawn function in `enemies/`. Chicken clips already occupy `createAnimations`. Enemy motion today is tweens on the sprite, plus `squashBonkTarget`.

Copy the paint into `SpriteFactory.js` and register one texture key per pose. Keys must be unique and must not replace the `chicken1` texture key or an existing hazard key. (Chicken animation clips such as `chicken-idle` are separate `anims` keys; the reserved texture key here is `chicken1`.) Call the new registration from the same create path `SpaceChicken` already uses so a refresh loads it.

## Connect it

Play poses with `anims.create` when the manifest method is `poses`. Drive tweens from the manifest when the method is `tween`. Use the scene clock so pause freezes both.

Do not restart an idle clip on every update. A one-shot returns to idle. Defeat and the bonk stun must not be overwritten by the idle loop. `squashBonkTarget` already pauses the actor's tweens for `BONK_STUN_MS`. A new looping tween has to survive that pause and resume.

The body size stays on the root sprite. A squash or a bobbing marker does not change the hitbox unless the manifest says the motion is gameplay. Facing for a patrol uses `setFlipX`, as bonk enemies already do. Do not author a second left-facing paint for that.

One hit path only. A frame event must not add another overlap beside `resolveHazardContact` or `touchBoarder`. If the painted timing cannot fit the current telegraph, say so. Do not silently retune cooldown or damage.

On death, retry, and shutdown, stop tweens and animations owned by that actor. Do not delete a global animation definition while cleaning up one sprite.

## Verify

Run `npm test`. In the browser, open the level that contains the actor and watch idle, the action, a bonk or a shot if that is the role, pause, and a retry. A debug teleport is not a playback check. Report the URL, what you saw, and any state you could not reach.
