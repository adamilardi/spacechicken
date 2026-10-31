---
name: news-to-level
description: Turn a real news story picked in the terminal into a playable Space Chicken level by chaining this repo's art and level skills.
---

# News to Level

The only in-game news UI is the title screen's NEWS LEVELS section, which lists every level whose `content.news` marker is set. This skill is otherwise the product: a Muse (Spark harness) workflow run on the command line in this repo. The agent fetches real news with web search, the user picks a story (or asks for a random one), and the agent generates the art and the level by invoking this repo's existing skills, then proves it plays.

Run it by opening Muse in this repo and saying: "run news-to-level", "make a level from today's news", or "surprise me with a news level".

## 1. Get today's news (Spark + web search)

Use web search to find 5–6 recent, reputable headlines (prefer the last 24 hours; favor non-graphic stories). For each, verify the link actually resolves and note headline, outlet, publication time, and URL. If web search is unavailable, fetch a news RSS feed with `curl` (e.g. BBC or NASA) and parse the same fields. Never invent a headline, date, or citation.

Present the list in the terminal, numbered, one line each: headline — outlet, time. Then stop and let the user pick a number.

- If the user picks one, use it.
- If the user says "random", "surprise me", or gives no pick, choose one with `shuf -i 1-N -n 1` (or `$RANDOM`) and announce which story chance picked.
- If the user pastes a headline, URL, or speaks a topic ("today's space news as a low-gravity boss fight"), treat that text as the story instead of listing.

### Unattended mode ("surprise me" / auto)

With no human to filter the list, run `node scripts/news-used-stories.mjs` first, exclude every already-used story it lists, and pick from the remainder with `shuf`. A tragedy/disaster pick must declare an abstract rescue/logistics objective up front or be skipped for the next pick — never build it as combat against victims.

Re-fetch the chosen article and extract only facts: what happened, where/when, the forces and motion involved (rising water, low gravity, heat, collapse, speed), who needs rescuing or what must be reached, and the scale. Keep facts and invented fiction visibly separate. For tragedies or disasters, design abstract rescue/logistics mechanics — never victims as enemies.

## 2. Direct it in the terminal (before touching files)

Print a mapping table with at least three rows where the story changes gameplay, not just scenery:

| Story fact       | Gameplay it becomes                                                  | Why      |
| ---------------- | -------------------------------------------------------------------- | -------- |
| (quote the fact) | gravity / hazard type+timing / objective / topology / enemy behavior | one line |

Examples: orbital rescue → gravity 150 + drone patrols + rescue cages; river flood → rising-water harbor decks + drip hazards + escape objective. Then name the level slug, biome, and boss idea if any. One short user confirmation is enough to proceed; if they said "surprise me", proceed without asking again.

Mark the signature items in the brief before anything is built: add a `Signature elements: a, b` line naming a subset of the element inventory (below), and mark the signature fact→mechanic row by suffixing its fact cell with ` (signature)`. The fidelity critic parses exactly these marks; an unmarked brief fails closed.

Then write the level's three creativity artefacts (see `skills/level-creator/SKILL.md`): the Novelty Ledger against the three nearest shipped levels, the Signature Mechanic Canvas (the story's strongest force becomes the taught verb — a crash _falls_, a flood _rises_, a rescue _carries_), and the Topology Fingerprint (the route's shape embodies the story: a plunge descends, a blackout darkens room by room). Run the **Concept critic** before art with `npm run critic:concept -- --brief docs/level-builds/<id>.md` (see `skills/game-critic/SKILL.md`) — it works before the level exists and checks the Novelty Ledger, Signature Mechanic Canvas, Topology Fingerprint, ≥3 fact→mechanic rows that are not scenery-only, element inventory ≥3, and a named themed enemy. If the concept scores as a clone or the mechanics are scenery-only, re-direct now while it is still words. News `critic:level` runs also assess this gate automatically; a concept failure fails the whole run. Record the concept verdict in the build note.

Before designing, list the story's **element inventory**: the concrete nouns a player should recognize on screen (for an AI-market crash: dollar signs, GPU cards, server racks, plunging chart lines, margin-call bells), on one `Element inventory:` line, with the `Signature elements:` line as a subset of it. The finished level must show at least **three** of them as art, props, or hazards — a palette swap is not theming. Also name the **themed enemy** here: every news level gets at least one enemy actor whose look and behavior come from the story (panic-selling bot, flood debris drone, rescue-digger), never only reskinned generic hazards. If no existing hazard can carry it, the enemy steps below are mandatory, not skippable.

## 3. Generate the art with Muse Image + the repo's skills (do not skip to code)

Read and follow each skill file, in this order, doing the work it describes. Art for this workflow is **generated images** (the `muse.image_generation` tool), style-anchored to the shipped game; canvas paint is the fallback only when image generation fails twice.

Style anchor for every prompt: screenshot or describe the nearest shipped level first, then prompt with its exact palette, flat side-view style, chunky readable silhouettes, small gameplay scale, and "Space Chicken universe: a chicken with a jetpack, golden crown, cosmic platformer". Never prompt for a photorealistic or off-style look.

1. `skills/level-art-creator/SKILL.md` — generate the place: one wide background plate, plus platform/prop concepts. Save finals under `assets/news-<slug>/` (copy them out of `generated_images/`), candidates under `art-candidates/<brief-id>/`.
2. `skills/enemy-art-creator/SKILL.md` — generate the themed enemy named in step 2, isolated on a flat solid background so it can be cut out (chroma-key it in code, or regenerate asking for a clean cutout look), with its animation handoff. This step is required: a news level with zero story-themed enemies fails the brief. Reuse an existing hazard's _behavior_ if it fits, but the actor's look must be the story's.
3. `skills/level-art-selector/SKILL.md` — choose a coherent set and record `art-selections/<level-id>/selection.json`, including the final image paths as `asset_path`s. Creativity scoring applies: a set that is a palette swap over a shipped place is rejected here, however coherent. Run the **Art critic** on the selected previews at gameplay size and record its verdict with the selection; art the critic cannot distinguish from a shipped level goes back to step 1, not into the build.
4. `skills/enemy-animation-creator/SKILL.md` then `skills/enemy-animation-integrator/SKILL.md` — generate pose frames of the same actor (identical silhouette, palette, canvas and pivot per frame) or tween specs, then wire them in as real Phaser textures/anims.
5. `skills/boss-creator/SKILL.md` — only when the story's climax earns a distinct final encounter.

Generated files do not exist to the game until they are wired: register every final image in `config/runtime-assets.cjs` `rootFiles`, load it in the scene preload (`this.load.image(...)`), and confirm it renders at gameplay size before calling the art done. An image left in `generated_images/` is not game art.

## 4. Build the level with the level skill

Read and follow `skills/level-creator/SKILL.md` and its reference `skills/level-creator/references/spacechicken.md`. It owns the real deliverables: a `levels/<slug>.js` module registered in `levels/index.js`, its music registration, and `config/runtime-assets.cjs` entries. Apply the director table from step 2 as the level's gravity, hazards, objective, and topology — that table is the design input, the skill is the builder. Do not hand-roll a parallel level format, do not execute model-written code outside these files, and do not add any news UI beyond the title-screen section (set `content.news` and the section picks the level up).

Layout must not be a row of identical flat decks. Require: at least **three platform shapes/reads** (e.g. wide deck, narrow perch, stair run, angled/sloped-look set piece, vertical shaft or bridge), varied deck widths and heights, the story's signature set piece from the element inventory built as solid geometry, and the themed enemy placed where the player must deal with it (not decoration at the edge). Flat-and-same is a failed build: revise before playtesting.

## 5. Prove it plays, pass the critic, then report

1. Run `npm test` and fix what the new level breaks (reachability and polish tests are the contract — fix the level, not the test).
2. Play it for real: `node server.cjs`, open `http://127.0.0.1:3000/?level=<new id>`, and play from spawn to the crown (or drive it with the repo's bot scripts). A debug skip is not a playthrough.
3. **Run the critic — the level is not done without a pass:**
    ```bash
    NEWS_BRIEF=docs/level-builds/<level-id>.md npm run critic:level -- <id>
    ```
    The run captures pilot telemetry and a screenshot beat sheet, **sends the screenshots to the critic panel as image evidence**, and scores both quality (fun/fairness/readability/novelty/pacing/theme) and **news fidelity**: each element-inventory item is judged visible/faint/missing from the shots, each fact→mechanic row is judged supported/contradicted/unsupported, and mechanic + visual fidelity must both clear the gate (see `skills/game-critic/SKILL.md`). A signature element that is missing, or faint/low-confidence and unconfirmed, fails the fidelity gate, and any unconfirmed `needs-human` blocks ship. The fidelity panel also judges the Space Chicken universe — jetpack chicken, crown goal, and readable hazard language visible in the shots — and a universe failure/flaw blocks like a missing signature element. On iterate, fix only the top contracted fix (see the report's `## Fix contract`) and re-run the full critic; on rework, return to step 2's artefacts. Maximum three loops. Without a TypeSafe key the run is mechanical-only: report `critic: mechanical-only` and never claim fidelity was judged.
4. Report in the terminal: the story (headline, outlet, time, URL), the fact→mechanic table, the files the skills produced, the play result, the critic report link (`docs/level-reviews/level-<id>.md`) with its quality and fidelity verdicts, and the URL to replay it. The report must name which three story elements the _critic_ marked shown (with their screenshot files, signatures flagged), the universe-check verdict, and which enemy is the themed one. If a step failed (wire down, skill missing, test red, panel unavailable), say which and what fallback was used — never claim a step ran when it didn't.

## Guardrails

- The repo stays the game; this skill only adds levels through the existing pipeline. No deployment unless the user asks.
- Same story in the morning briefing should be reproducible: record the story URL and the mechanic table in the level-build note the level-creator skill requires (`docs/level-builds/<level-id>.md`).
- Preserve unrelated working-tree changes. Do not publish, open-source, or post about this concept without the user's approval.
