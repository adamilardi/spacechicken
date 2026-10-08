# Space Chicken authoring reference

Inspection map for this repository. Read the current files before editing. Numbers in shipped levels change; take them from the code, not from memory.

## Painted art

Space Chicken pictures are canvas drawings. Do not call image generation, image edit, or image-to-video. Do not add PNG, JPG, GIF, WebP, or sprite-sheet files.

A new picture is a `paint(ctx)` function. Actors and props go through `SpriteFactory.addCanvasTexture`. Places go through a `BackgroundRenderer` layout. Match the pictures already in the game:

- Keep canvases small. Chicken frames are 32×32. Expedition actors are roughly 18–128 px on a side. Paint at gameplay size. Do not paint a large plate and scale it down.
- Set `imageSmoothingEnabled` to false. Use flat fills, short strokes, and at most a couple of linear gradients.
- The silhouette has to read at the size the sprite is shown.
- A bonkable actor calls `paintBonkPad`. A shootable actor shows a contrasting lens, the way `paintBoarder` paints the cyan chest ring. Acid, boulders, dust devils, crushers, lasers, and rocks stay unmarked.
- Backgrounds are four baked parallax layers: sky, far, mid, near. Scenery stays quieter than platforms, the chicken, and hazards.
- A new background must differ from every shipped type in at least two composition devices (see the level-art-creator skill). Shipped devices, from `BackgroundRenderer.js`:
    - `space` (1, 2): sunrise gradient and glow; star bands, nebulas, planets; polygon silhouette ranges; near tower city with lit windows.
    - `station` (3): orbital frames; module structures with braces, panels, and lit windows.
    - `moon` (4): starfield bands; crater-field near layer.
    - `facility` (5): window rows and ceiling lights far; vat tanks near.
    - `mars` (6): twin moons far; butte mesas mid; dunes and rocks near.
    - `iss` (7): Earth with lands and clouds far; solar array wings mid; station modules and cupola near.
    - `colony` (8): dome and tower silhouette loops; searchlight beams; ground ridge with landing-strip glow.
    - `hive` (9): rib walls; hanging teeth with spore motes; flesh floor with teal seam and pools.
    - `spire` (10): ringed planet far; landmark gold spire with fin triangles mid; alloy slab with pale seam near.
    - `bastion` (11): enclosed ceiling with lamp cones; arch frames; blast doors, diagonal struts, chains; foreground pipe frames with floor grate.
    - `womb` (12): asymmetric gloom glow; ribcage arcs; landmark heart with vein spokes; mouth teeth top and bottom with wisps.
    - `harbor` (13): sun disc with cloud bands; irregular hull silhouettes; crane diagonals plus container stacks; pilings over water shimmer.
    - `foundry` (14): ember columns with spark drift; furnace wall with crucible mouths; ladle rail with hanging ladles; melt channel plus catwalk grate.
    - `skyhook` (15): climbing tether ribbon with climber lights and stars; gantry tower frames; anchor pylon landmark with service arms; pad slab with pipe runs.
    - `bastion` vault style (16): same renderer, sealed-bulkhead palette; bronze decks carry the new place read.
- Recoloring an existing paint is not a new actor or place. A new one needs a new silhouette.

Stage unused paints under `art-candidates/<brief-id>/` as `paint.js` modules that export `paint(ctx, width, height)`. Copy a chosen paint into `SpriteFactory.js` or `BackgroundRenderer.js` only when an integration skill or the user asks for it in the running game.

## Where the game is authored

- `Constants.js`: `GAME_CONSTANTS`.
- `levels/<name>.js`: one campaign level. Each module exports `level` with `id`, `definition`, and `content`.
- `levels/index.js`: `LEVEL_DEFINITIONS`, `LEVEL_CONTENT`, and `LEVEL_IDS`. Register a new level here.
- `levels/shared.js`: default instructions and the Dawn Run palette.
- `LevelConfig.js`: the `LevelConfig` constructor. It reads the level registry.
- `SpriteFactory.js`: `paint*` functions, `addCanvasTexture`, `createChickenFrames`, `createExpeditionSprites`.
- `BackgroundRenderer.js`: `ensureLayout`, `drawLayer`, and `create*BackgroundLayout`. Texture keys look like `space-chicken-bg-${layoutKey}_${layerId}`.
- `enemies/<type>.js`: one hazard spawn function. `enemies/index.js` maps type names to those functions.
- `WorldBuilder.js`: platforms, props, and calls into the enemy registry. Boarders stay in their own gravity group.
- `SpaceChicken.js`: `resolveHazardContact`, `setupPhaser`, `createAnimations`, pause, and the debug API.
- `GameUtils.js`: `canBonkFromAbove` and boarder steering.
- `music/<id>.js`: one track, exporting `buildTrack`. `music/score.js` holds the tone helpers.
- `music/index.js`: `MUSIC_DEFINITIONS`. `MusicConfig.js` re-exports it.
- `config/runtime-assets.cjs`: files the local server and the Cloudflare build will serve.
- `tests/game.test.cjs`: level, parallax, bonk, and boarder checks. `tests/contra-levels.test.cjs`: trilogy hop reachability, crown pads, and boarder wave placement.

`server.cjs` reads whitelisted files from disk on each request. A new file, including one under `levels/`, `enemies/`, or `music/`, must be added to `rootFiles` and the server restarted. Edits to files already on the list show up on refresh.

## Levels

Ids are the keys of `LEVEL_DEFINITIONS`. The next id is one past the current max. Set `NEXT_LEVEL` on the previous last level only when the new level joins the campaign chain. `/?level=N` opens a level without renumbering earlier ones. A level can fork with `BRANCH: [a, b]`: the crown offers both paths (tap or keys 1/2), `NEXT_LEVEL` stays the default path, and the branch level's own `NEXT_LEVEL` rejoins the chain. Only one fork ships: 12 offers 13 or 16, and 16 points at 14. `branchInstructions` content sets the offer subtitle.

Each definition carries title, gravity, world size, kill zone, start, crown, bomb speed, and `NEXT_LEVEL`. `PHASER: true` is what turns the space phaser on. Content for that id lives on the same level module: background `type`, platform `key`, floor, moving platforms, rocks, and `dynamic` hazards.

The run ends when a chicken overlaps the crown. There is no boss object and no segment graph. Shipped places, in order: Dawn Run (`space`), Arcade Orbit (`space`), Orbital Gauntlet (`station`), Moonfall Citadel (`moon`), Specimen Wing (`facility`), Red Reach (`mars`), Earthwatch (`iss`, phaser on), Colony Drop (`colony`, phaser on), Hive Warrens (`hive`, phaser on), Spire Crown (`spire`, phaser on), Bastion Relay (`bastion`, phaser on), Crimson Womb (`womb`, phaser on), Rust Harbor (`harbor`, phaser on), Ember Foundry (`foundry`, phaser on), Skyhook Anchor (`skyhook`, phaser on), Iron Vault (`bastion` vault style, phaser on, branch off 12 rejoining 14). World height is per level. Do not assume 700. Levels 8-16 are the contra-style run-and-gun arc; crown gates vary per level (8: `CROWN_SHIELD` wave clear, 9: spore-beam, 10: lift ride, 11: gatehouse crushers, 12: shield plus beam, 13: slams plus shield, 14: tram ride plus beam, 15: lift plus beam plus slam plus shield, 16: beam plus slam plus shield).

Platforms use a texture key such as `cliff`, `stationPanel`, `labDeck`, `mesa`, or `issHull`. The floor and static platforms are created in `WorldBuilder`. A decorative prop is not solid unless it is also a platform.

## Hazards

`enemies/index.js` dispatches `laser`, `drone`, `rover`, `cosmicRay`, `bonk`, `crusher`, `drip`, `roller`, and `dustDevil`. Anything else becomes a generic moving sprite. Boarders are not in that map. They are built by `setupBoarders` into their own gravity group.

`resolveHazardContact` boosts a chicken that falls onto a `bonkable` actor and fails the run on a side hit. Bonk tuning is `BONK_JUMP_VELOCITY_Y`, `BONK_MIN_FALL_SPEED`, and `BONK_STUN_MS`. Boarders are shootable, not bonkable. Touching one fails the run unless a bolt defeats them first.

A new hazard type needs an `enemies/` spawn module, a `DYNAMIC_SPAWNERS` entry, a body that matches the painted solid, and cleanup on death, retry, and scene restart. Pause freezes physics and tweens with the scene. Do not use wall-clock timers for attack or stun timing.

## Weapon

The space phaser is the only player weapon. `setupPhaser` runs when `levelConfig.phaser` is set. `tryFirePhaser` is the only place that creates a bolt. Bolts overlap the boarder group in `phaserHitsBoarder`. They do not damage bonk enemies or other hazards.

Player 1 fires with F or J, gamepad button 2, or the touch bolt button. Player 2 fires with the co-op phaser key or that player's gamepad button 2. The gun sprite is `spacePhaser`. The shot is `phaserBolt`. Cooldown, speed, range, and pool size are the `PHASER_*` constants. Both chickens carry their own `lastPhaserAt`.

A new weapon uses this fire path and a painted texture. Pilots who never switch keep the phaser. Levels without `PHASER` do not show a gun. The contra arc unlocks more guns per level via `weaponsForLevel` in `GameUtils.js`: 8 adds Scatter, 9 adds Piercer, 10 adds Nova, 11 adds Tempest (5-way fan via the `ways` def field), 12 adds Hail (spread plus pierce), 13 adds Ripper (widest 3-fan plus pierce 1), 14 adds Comet (tight 5-way plus pierce 1), 15 adds Halo (piercing orb), 16 keeps the full rack. G swaps, the HUD names the gun, and the choice persists across the level handoff.

## Animation

Chicken motion is extra canvas frames from `drawChicken`, registered in `createAnimations` as `chicken-idle`, `chicken-walk`, `chicken-jump`, `chicken-fall`, and `chicken-jetpack`. Enemy motion is mostly tweens in the enemy spawn modules (patrol, bob, laser pulse, crusher slam) plus the bonk squash in `squashBonkTarget`.

New actor frames are more poses of the same paint function, with a stable canvas and pivot. Tweens and code motion cover sliding, bobbing, flipping, and recoil. Do not generate pose images.

## Checks

`npm test` runs `tests/*.test.cjs`. `npm run check` is tests, eslint with zero warnings, and prettier. Play a level at `http://127.0.0.1:3000/?level=N` after `npm start`. `?debug=1` enables `window.__spaceChickenDebug` (`ready`, `goToLevel`, `skipLevel`). N skips a level only in that debug mode. `window.__spaceChickenTest` is the playtest action API.

Co-op is keys 2, 3, and 4. It is a split-screen race and is not leaderboard-eligible. Pause is Escape, P, and the on-screen button.

These skills stop at local edits and checks. Deploy only when the user asks, using `AGENTS.md`.
