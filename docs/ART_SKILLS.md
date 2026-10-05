# Space Chicken art skills

The eight skills in `skills/` are Markdown instructions for this game. Ask an agent to read the relevant `SKILL.md`. Putting them in this folder does not install them globally.

They follow the NovaWing skill set in `/home/adam/rtype-prototype/skills`, rewritten for Space Chicken. Pictures are canvas paint functions in `SpriteFactory.js` and layouts in `BackgroundRenderer.js`. Do not use image generation. The art style stays the one already on screen.

Shared paths, hazard rules, and the phaser live in [the authoring reference](../skills/level-creator/references/spacechicken.md).

| Skill                                                                       | Purpose                                                 | Main output                                        |
| --------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------- |
| [level-art-creator](../skills/level-art-creator/SKILL.md)                   | Paint a place: parallax layout plus platforms and props | `paint.js` modules, preview HTML, manifest         |
| [enemy-art-creator](../skills/enemy-art-creator/SKILL.md)                   | Paint an actor in the current style                     | `paint.js`, animation handoff, manifest            |
| [level-art-selector](../skills/level-art-selector/SKILL.md)                 | Choose a coherent set                                   | `art-selections/<level-id>/selection.json`         |
| [enemy-animation-creator](../skills/enemy-animation-creator/SKILL.md)       | Poses of the same paint, or tween notes                 | `animation-manifest.json` and a playback preview   |
| [enemy-animation-integrator](../skills/enemy-animation-integrator/SKILL.md) | Play that animation in the game                         | Registered textures, tweens or anims, a play check |
| [boss-creator](../skills/boss-creator/SKILL.md)                             | A distinct last stretch before the crown                | Painted actor, rule, playable encounter            |
| [level-creator](../skills/level-creator/SKILL.md)                           | A new level from the chosen paints and working hazards  | `LEVEL_DEFINITIONS` entry, playtest, build report  |
| [weapon-creator](../skills/weapon-creator/SKILL.md)                         | Another gun beside the space phaser                     | Painted shot, one fire path, HUD and input         |

Example sequence:

1. Read `skills/level-art-creator/SKILL.md`. Paint two directions for a new side-view place. Stage them under `art-candidates/<brief-id>/`. Leave the running game alone.
2. Read `skills/enemy-art-creator/SKILL.md`. Paint two actors for that place, each with a handoff.
3. Read `skills/level-art-selector/SKILL.md`. Recommend a set and record the choice.
4. Read `skills/enemy-animation-creator/SKILL.md`. Animate the chosen actors from their paint functions.
5. Read `skills/enemy-animation-integrator/SKILL.md`. Wire those poses into the game and watch them.
6. Read `skills/boss-creator/SKILL.md`. Build a last stretch that plays differently from a copied hazard.
7. Read `skills/level-creator/SKILL.md`. Add the level from the confirmed selection and play to the crown.

For a level that reuses hazards already in `WorldBuilder`, skip enemy art and animation. Paint the place, select it, then run level-creator. A new actor is not in the level until the integrator has registered it, unless the user asked level-creator to build that actor.

None of these skills deploy. Deployment stays the command in `AGENTS.md`.
