---
name: space-chicken-level-creator
description: Build and verify a playable, non-clone Space Chicken level from selected paints and existing hazards, ending at the crown, then pass the game critic. Use when adding a level or wiring chosen scenery. Enemy concept art and animation are separate skills.
---

# Level creator

Add a playable Space Chicken level that no shipped level could be mistaken for. Read [the authoring reference](../level-creator/references/spacechicken.md), [the game critic](../game-critic/SKILL.md), and the working tree before editing. Do not deploy.

Creativity here is not a mood; it is three artefacts the critic scores. No artefact, no build: a level pitched as "like Level 8 but greener" is rejected before art starts.

## Inputs

Accept a `selection.json` from the selector or paths the user names. For version 1, read `level_id`, `decision_status`, `choices`, `unfilled_roles`, and `requested_revisions`. Resolve each `asset_path` from the selection file. A draft recommendation is not a choice. If the art is still ambiguous, ask once, and keep reading the level format while you wait. Do not quietly substitute a different paint.

A `paint.js` file is not a hazard yet. Use hazards that already run for the layout. Record concept actors that were not wired. Build a new actor only when the user asked for that actor in the level, and paint it with the painted-art rules.

## Design before code (the three artefacts)

Write these in the build report first and run the Concept critic (see [game-critic](../game-critic/SKILL.md)) before touching `levels/`:

1. **Novelty Ledger** — a table against the three nearest shipped levels (nearest by theme, gravity, and campaign position) with one row each for background devices, topology, signature mechanic, hazard pairing, and finale rule. The new level must differ in at least three rows, including topology and at least one of {signature mechanic, finale rule}. "Different colour" never counts as a row difference. The critic's `clone-suspect` / `background-recycled` checks enforce the ledger; do not argue with a flag by editing the ledger after the fact.
2. **Signature Mechanic Canvas** — one verb this level teaches that no sibling teaches the same way. Name the verb, the safe teach beat (first use, survivable), the press beat (combined with a known verb), the twist (finale form), and the tell. Examples already owned — do not re-teach them as your signature: bonk-spring chains (5), lift timing (10), beam-dark crossing (10/14), shield-wave clear (8), tram riding (14). Your canvas may reuse a hazard type, but the _decision_ it demands must be new (e.g. "shoot while falling", "wait on a moving deck under fire", "bonk to change a gate's state").
3. **Topology Fingerprint** — one line naming the route shape and a sketch of its height profile. Banned as a fingerprint: `flat left-to-right line at one height` (that is the retired default, whatever the palette). Owned shapes to not copy wholesale: beachhead decks (8), fang shaft (9), glass stair (10), trench dip (11), marrow bridge (12), container stair (13), vent tower (14), pylon stair (15). Pick an unowned combination — descent, loop-back, split-rejoin, tower, sink-and-rise, bridge-cross, gauntlet rooms — and build the decks to match the sketch, not the other way round.

Sketch **three divergent layouts** on paper (different fingerprints, not three widths of one row), kill two with one-line reasons recorded in the build report, and build the survivor. Refining only the first idea you had is how clones happen.

## Author the level

Add a `levels/<name>.js` module and register it in `levels/index.js`. Set `NEXT_LEVEL` on the previous finale only when this level extends the campaign. A news level sets `content.news = { outlet, headline }` (real outlet and headline from the story — never invented) and stays out of the campaign chain; the marker puts it in `NEWS_LEVEL_IDS` and the title screen's NEWS LEVELS section automatically. A news brief that declares `Combat profile: contra` (a fight-shaped story; boss-themed stories usually do) is built contra-style despite staying out of the chain: `PHASER: true`, stacked floors under the contra rules below, the gun rack for its position, real boarder waves, and a crown encounter finale when the brief declares a boss theme. A news level without that declaration stays PHASER-off with a token wave. Add a `music/<id>.js` track and register it in `music/index.js` so the level does not fall through to level 1's track. Tracks and any new effect (one call site per game event, e.g. a themed telegraph tell) follow [the audio creator](../audio-creator/SKILL.md). Register both new files in `config/runtime-assets.cjs` `rootFiles`, or the local server 404s them and the Cloudflare build omits them.

Give it a title, gravity, world size, kill zone, start, and crown. Open with a readable jump, introduce one hazard, then stack ideas, and leave a rest before the crown. Every level ships at least one enemy actor placed on the route, and a themed brief's enemy must be that brief's themed actor, wired through the integrator — hazard-only levels with no enemy fail the brief. Vary the route: mix deck widths, heights, and at least three platform reads (wide deck, narrow perch, stair, bridge, shaft, or sloped-look set piece); a single repeated flat deck across the whole level is a draft, not a level. Copy _field shapes_ (keys, hazard entry syntax) from an existing level module — never its deck sequence, hazard sequence, or set-piece placement; the critic compares those sequences. A new background `type` needs a `create*BackgroundLayout` plus branches in `ensureLayout` and `drawLayer`. Bake height follows that level's world height. Keep `scrollFactorY` at 1.

Banned shortcuts (each is an automatic critic flaw, not a style choice): palette swap over a copied route; one deck texture end to end; an upper route with nothing on it; a finale with no pressure; a beam that guards only one of two routes to the crown; a themed enemy that is a renamed generic hazard with generic behaviour.

**Skeleton diversity is measured, not vibes.** The critic compares your sorted deck x sequence and world width against every shipped level (`skeleton-rhyme`, similarity ≥0.85 at the same width and deck count). Levels 17/19/20 shipped the same 6000px, 14-deck x-list under three paints and scored novelty 1.1–1.6 for it. Never start from a shipped level's deck list — not even as a "structure reference." Pick the world width from the Topology Fingerprint (towers are short and tall, gauntlets are short and dense, traverses earn their length), then lay decks from the height-profile sketch. In a batch, no two levels share a width, a deck count, and a gravity band.

**Finale pressure must photograph.** The beat sheet freezes the world, so a lone timed vertical laser caught off-phase reads as an empty crown deck and draws `sleeping-finale` no data argument can rebut (the critic flags this as `finale-invisible`). The finale contract: within the crown frame, place at least one pressure a frozen still can show — a body hazard patrolling the crown deck itself (roller, drone, crusher), a horizontal beam, a mostly-on beam (duty ≥0.6), or two staggered beams that cover each other's off-phases — on every route to the crown. A timed laser 250px away plus a distant roller does not meet it.

Copy chosen platform and prop paints into `SpriteFactory.js` and register them. Point platforms at those keys. Decorations go in `props` and must not collide. Hitboxes stay on the opaque deck, not on a transparent margin. Place every boarder home over a deck: a boarder spawned over a gap falls out of the world, and on a `CROWN_SHIELD` level that free kill opens the gate early. Checkpoints respawn onto solid decks, never over gaps. Timed-laser `offDuration` stays at 800ms or more: the pilot's walk-through gate needs `span/160*1000+350`ms of off-window (~762ms for a 66px beam span), and shorter windows hold it forever instead of failing loudly.

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
- Checkpoints stand before gates: never inside on/off beam timing, never under a drone or dust devil lane, and 150px+ clear of every boarder home. A respawn must give one safe breath. Props stay out of crusher slam footprints (40px+); drones clear lift rider zones by sprite. `tests/level-polish.test.cjs` locks all four.
- Every shelf pays or threatens: a bypass around trouble, a drone, a bonk, or a stationed runner — never an empty plank.
- Finale beams cover every route to the crown: if a lift or shelf lets the player duck the band, the beam is decorative and must grow or move.

## Verify — the critic run is part of done

Update tests that assert the level list, music ids, or background type when those lists grow. Keep the old levels covered. Run `npm test`.

If registry growth trips the repo's max-lines gate (a longer `LEVEL_IDS` table or `create()` pushing a function over the lint cap), extract module-scope consts (id tables, plate maps) rather than splitting behavior — the table growth is the cause, not the logic around it.

Play `http://127.0.0.1:3000/?level=N` from the start to the crown. Confirm the selected paints are on screen, platforms match their art, a bonk works if you placed one, pause and a death retry, and the next level or the final clear. Check an earlier level if you touched shared builder or background code. A debug skip only proves the handoff.

**Then run the critic. The level is not done without it:**

```bash
npm run critic:level -- <id>          # news levels: NEWS_BRIEF=<brief> npm run critic:level -- <id>
node scripts/boss-review.mjs <id>     # when the level has a crown encounter (8-16 pattern)
```

The run captures pilot telemetry and a screenshot beat sheet, sends the screenshots to the panel as image evidence, and writes `docs/level-reviews/level-<id>.md`. On **iterate**, fix only the top contracted fix from the report's `## Fix contract` (`fixes[0]` in the JSON: flaw, evidence, owner, `smallestFix`, `recheck`) — one fix per loop — then re-run the _full_ critic, never just the segment you changed and never the lower-ranked fixes in the same loop. On **rework**, return to the three artefacts with a new fingerprint; do not tune. Maximum three loops, then hand the report to the user. Without a TypeSafe key the run returns mechanical pass at best: record `critic: mechanical-only` and do not call the level shipped. News levels also need the fidelity gate in the same report (story elements shown, no contradicted fact→mechanic row, no `needs-human` left unconfirmed).

Write `docs/level-builds/<level-id>.md` (create the folder if it is missing) with the Novelty Ledger, Signature Mechanic Canvas, Topology Fingerprint and the two killed layouts, the assumptions, the selection paths, texture keys, hazard types used, files changed, the play URL, the critic report link with both verdicts quoted, and what you could not verify. Name concept actors separately from the hazards that actually spawn. A build report with no critic link is incomplete and the level stays a draft.
