---
name: space-chicken-game-critic
description: Score a Space Chicken level for fun, fairness, readability, novelty, pacing, theme, and — for news levels — faithfulness to the source story, then gate it ship / iterate / rework. Screenshots are captured and sent to the critic panel as image evidence. Use after every level, art set, or boss build, and whenever a skill says "run the critic". This is the quality gate the level chain answers to.
---

# Game critic

The critic is not a vibe. It is a run: mechanical checks computed in code, a real play capture, screenshots, and a four-persona panel (Jev) that scores only what the evidence shows. Every level creation ends here. A level that has not passed the critic is a draft, however green `npm test` is — tests prove it does not crash; the critic proves it is worth shipping.

Read [the authoring reference](../level-creator/references/spacechicken.md) and the build report under review (`docs/level-builds/<level-id>.md`). Do not deploy. Fixes belong to the owning skill (level, art, boss, enemy); the critic only scores, names the flaw, and re-scores.

## The three runs

Run the cheapest run that can fail the work. Later runs include the earlier evidence.

| Run                          | When                                                                              | Evidence                                                                                                                                                                                                     | Can pass a level?                                   |
| ---------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| Concept critic               | After the director table / design brief, before art or code (level may not exist) | Novelty Ledger + Signature Mechanic Canvas + Topology Fingerprint scored against the three nearest shipped levels; ≥3 fact→mechanic rows that are not scenery-only; element inventory ≥3; themed enemy named | No — it can only kill or redirect a concept cheaply |
| Art critic                   | After selection, before level build                                               | `npm run critic:art -- <selection.json>`: gameplay-size previews + file/alpha/plate checks + manual checklist (devices, landmark, silhouette)                                                                | No — it can only send art back                      |
| Play critic (the critic run) | After the level plays start to crown                                              | `scripts/level-critic.mjs` capture: telemetry, death spots, screenshots, mechanical flags, persona panel                                                                                                     | Yes — this is the ship gate                         |

News levels run all three. A tuning pass on a shipped level runs the Play critic only. Skipping a run because "it looks fine" is a failed run: record `critic: skipped (<reason>)` in the build report and treat the level as unverified.

## Run it

```bash
npm run critic:concept -- --brief docs/level-builds/<id>.md  # concept gate; works before the level exists
npm run critic:art -- art-selections/<id>/selection.json  # art gate: gameplay-size previews + checks + manual checklist
npm run critic:level -- <id>            # full run: capture + screenshots + panels (needs TYPESAFE_API_KEY)
npm run critic:level:static -- <id>     # mechanical checks only, no browser, no key
# News levels: the brief is mandatory — headline, facts, element inventory, fact→mechanic table
NEWS_BRIEF=docs/level-builds/<level-id>.md npm run critic:level -- <id>
LEVEL=<id> npm run jev:playtest         # optional extra seeded plays feeding the same report
node scripts/boss-review.mjs <id>       # crown encounters 8-16 also need the boss panel
```

The script writes `docs/level-reviews/level-<id>.json` (machine verdict) and `docs/level-reviews/level-<id>.md` (human report) and exits `0` pass, `2` iterate/rework, `1` error. Without a TypeSafe key it still runs every mechanical check and the capture, marks `panel: unavailable`, and can return at most **mechanical pass** — never a ship verdict. Say which happened; never claim a panel ran when it did not.

`critic:concept` checks the brief alone — Novelty Ledger, Signature Mechanic Canvas, Topology Fingerprint, ≥3 fact→mechanic rows that are not scenery-only, element inventory ≥3, a named themed enemy, and an explicit boss-theme decision (`Boss theme: …` or `Boss theme: none — …`) — and fails if any is missing or scenery-only. News `critic:level` runs also assess the concept gate automatically; a concept failure fails the whole run. A brief declaring a boss theme must also pass `node scripts/boss-review.mjs <id>` at play time; the boss panel, not this gate, judges whether the encounter fights.

## Screenshots go to the critic (not just to disk)

Screenshots are evidence the panel actually sees, not decoration in a report. The full run captures a beat sheet derived from level data at 1280×720 — not fixed thirds — and sends the images themselves to Jev in the same request as the text state:

- Beats: `01-opener` (spawn view), one beat per distinct hazard / themed-enemy type at its first spawn (`02-…`, `03-…`), one per signature set piece, `finale` (crown approach), plus any death-spot revisit the telemetry names.
- Files land in `docs/level-reviews/evidence/level-<id>/` with a `shots.json` manifest (beat, camera/player position, what the shot must prove). The report links every verdict claim to a shot file.
- Sending (quality panel): the SDK now provides `image()`, so quality-panel shots go through `image()`; each shot is referenced once from `state.shots[]` so every readability question judges the same pictures. Keep to at most 4 shots per request, JPEG, each side 280–1568px — split the beat sheet across requests rather than shrinking shots below legibility.
- Sending (fidelity panel): fidelity still uses the raw HTTP base64 path (base64 `assets` map, `TypeSafe-Danger-Zone-Images: true` header; see `scripts/level-critic.mjs` `sendScreenshots`). If the image request is rejected (no key, images off, size limit), the run marks `screenshots_sent: false`, falls back to text-only scoring, and caps Readability and Fidelity at **unverified** — a level may not ship on filenames the critic never saw. Record which path ran.

## What gets scored

Six dimensions, each 0–4, scored per persona from the evidence only. Anchors are in `scripts/level-critic.mjs` (`SCORE_LEVELS`); the short form:

- **Fun** — decisions per minute. Long empty runs, waiting, and one-note loops cap at 2.
- **Fairness** — every death traces to a missed tell. Blind landings, respawns inside timing, and beams that guard only one route cap at 2.
- **Readability** — a first-time player reads the next move at gameplay size: platforms read solid, hazards telegraph, the themed objects are recognisable without the instructions paragraph.
- **Novelty** — this level's topology, signature mechanic, and finale rule vs the shipped roster. Sharing the skeleton, the deck set, or the finale rule with a sibling caps at 2 (see the clone rules in level-creator).
- **Pacing** — teach → press → rest → finale escalation, honest checkpoints, no dead shelves, no sleeping finale.
- **Theme** — fiction, look, hazards, and objective reinforce each other. A palette swap over a generic run caps at 2.

Plus one **flaw** choice per persona from the taxonomy: `none`, `flat`, `clone`, `sleeping-finale`, `sponge`, `cheap`, `empty-route`, `blind`, `stale`, `off-theme`, `unreadable`. And a **verdict**: `ship`, `iterate`, `rework`.

The panel is four personas, same cast as the boss panel: Marlowe (expert reviewer, the critic of record), Vic (contra veteran), Sam (casual newcomer), Lex (speedrunner). Each scores as that player, from telemetry and screenshots — never as the designer defending the level.

## Mechanical checks (code speaks first)

The script computes these before any persona sees the level, and personas must confirm or rebut each flag from the numbers. A confirmed mechanical flag cannot be averaged away by high fun scores.

- `flat-deck` — one platform key carries >80% of decks, or fewer than three platform reads.
- `clone-suspect` — skeleton similarity to any shipped level above the threshold (platform band sequence + hazard sequence + background type).
- `skeleton-rhyme` — the sorted deck x sequence and world width match a shipped level (≥0.85 at the same width and deck count) even under different paints. This is the copied-template case the kit-based clone check misses: levels 17/19/20 share one x-list and score 1.00 against each other.
- `background-recycled` — a shipped background `type` reused with no new composition device claimed in the build report.
- `low-hazard-variety` — fewer than two hazard types outside the tutorial levels, or every hazard is a reskin of one behaviour.
- `empty-route` — a shelf, bridge, or upper line with nothing that pays or threatens.
- `sleeping-finale` — no hazard, gate, or boss pressure in the last stretch before the crown.
- `finale-invisible` — hazards exist within 900px of the crown but none can appear in a frozen finale still (a lone timed beam caught off-phase, or pressure outside the crown frame). Personas judge finale pressure from the still plus `finaleHazardCount`/`finaleVisible` in the level state; this flag is the level-side fix, not a panel error.
- `checkpoint-desert` — a gap over 2500px without a checkpoint on long levels, or a checkpoint inside beam timing / under a patrol lane.
- `blind-landing` — a required drop or jump whose landing deck is off-screen with a hazard on it.

## News fidelity critic (news levels only, mandatory)

A news level makes a factual promise: this place _is_ that story. The fidelity critic verifies the promise the way a citation check verifies a quote — code extracts the claims, the panel judges each claim against screenshot evidence, and low-confidence judgments go to a human instead of passing silently.

**Inputs (fail closed).** The run needs the news brief: headline, outlet, time, URL, the extracted facts, the element inventory (concrete nouns the player should recognise), and the fact→mechanic table. Sources, in order: `NEWS_BRIEF` path, else the story sections of `docs/level-builds/<level-id>.md`, else `art-selections/<level-id>/selection.json`. Parse contract: the fact→mechanic table is the build note's FIRST table (later tables like the Novelty Ledger are ignored), and the inventory is one `Element inventory:` line (a trailing `Themed enemy:` sentence is stripped). The brief must also mark its signature items: a `Signature elements: a, b` line naming a subset of the inventory, and the signature fact→mechanic row with its fact cell suffixed ` (signature)`. A news level with no brief, no inventory, no table, or no signature marking gets `fidelity: missing-brief` and cannot pass — inventing the story from the level's title is exactly the failure this critic exists to catch.

**Code checks first (no model).** Before any judgment: every inventory element is claimed by at least one art asset, prop, hazard, or instruction string; the themed enemy exists as a spawning hazard (not a concept note); each fact→mechanic row names a real level field (gravity, hazard type/timing, objective, topology) whose value differs from the default — a row that only renames scenery is marked `scenery-only` in code. Unclaimed elements and scenery-only rows are reported as facts, and the panel must confirm or rebut them.

**Panel judgments (screenshots in state).** One request carries the brief, the inventory, the table, the code-check results, and the beat-sheet screenshots (see above). Per question, one narrow judgment:

- One `noul` per inventory element (cap 6; batch the rest into a second request): "Is `<element>` recognisably visible in `shots` at gameplay size, without reading the instructions?" Probability is the answer — ≥0.7 counts as shown, 0.4–0.7 is `faint`, below 0.4 is `missing`.
- One `choice` per fact→mechanic row: does the screenshot + telemetry evidence `support`, `contradict`, or leave `unsupported` the claim that this fact became that mechanic? (The citation-check shape: a mechanic that exists in data but never appears on screen or in play is `unsupported`, not verified.)
- `score` **mechanic fidelity**: do the story's forces (falling value, rising water, low gravity, panic) drive what the player _does_, or only what the place looks like?
- `score` **visual fidelity**: could a player who knows the headline name the story from the screenshots alone?
- `choice` **fidelity flaw**: `none`, `palette-swap` (generic level, themed colours), `missing-elements`, `scenery-only` (facts decorate, none mechanise), `wrong-story` (reads as a different event), `tasteless` (tragedy/disaster turned into shooting victims — always rework).
- `noul` **universe check**: is this unmistakably Space Chicken in the shots — jetpack chicken, crown goal, and readable hazard language visible without the brief? A missing verdict blocks like a missing signature element; a faint verdict is stamped `needs-human`.

**Fidelity gate.** Pass requires: at least 3 inventory elements `shown`; no `contradicted` row; at most one `unsupported` row and it may not be the signature mechanic; mean mechanic fidelity ≥ 2.5 and visual fidelity ≥ 2.5; fidelity flaw `none` from Marlowe; and a passing universe check. A signature element that is `missing`, or `faint` / low-confidence and unconfirmed, fails the gate outright, as does a failed universe check. Every other outcome is iterate (add/strengthen the element or mechanic, re-shoot, re-run) or rework (`wrong-story`, `tasteless`, or a scenery-only table). Judgments under the confidence gate (choice confidence <0.8, or a `noul` in the faint band on a signature element) are stamped `needs-human` in the report: a human looks at the named screenshot and confirms or overrides before the level ships, and any unconfirmed `needs-human` blocks ship. Record confirmations in `docs/level-reviews/evidence/<level-id>/human.json` as `{ confirmed: [<exact needsHuman keys>], reviewer, date, reasoning }`; the gate counts confirmed rows as supports and confirmed faint elements as shown. Timing values no still can show are confirmed against the level data and tests instead, with that noted in the reasoning. Never average a `needs-human` away.

Non-news levels record `fidelity: not-applicable` and skip this section; the rest of the gate is unchanged.

## The gate

**Pass (ship)** requires all of: zero `rework` votes; at least 3 of 4 personas name flaw `none` (one cosmetic dissent is tolerated — `flat`, `sponge`, `stale`, `off-theme`, `empty-route`, or `sleeping-finale` on a level with no finale by design); no structural flaw from anyone (`blind`, `cheap`, `unreadable`, `clone` — this set must stay a subset of the flaw enum, enforced by unit test); mean fun ≥ 1.5 and mean fairness ≥ 1.5; no unrebutted mechanical flag; screenshots actually sent (`screenshots_sent: true`) whenever the panel scored Readability; and, for news levels, the fidelity gate above. Boss levels must also pass `scripts/boss-review.mjs`.

Why these floors: AI judges score conservatively — shipped level 1, a finished tutorial, scores fun ~1.5, fairness ~2.6, novelty ~0.9. Absolute 2.5 floors fail shipped levels, so the gate asks instead whether any judge can name a concrete flaw, with playable floors anchored to that baseline. A level every judge calls flawless at fun ≥ 1.5 ships; a level with a named flaw iterates no matter how high its means.

News levels use stricter floors than campaign, anchored to shipped news level 18: the novelty, theme, and readability means must clear higher bars, and no dimension mean may fall below the playable floor. The report's `News floor failures:` line names each failed floor rather than reporting a bare iterate. Novelty floors at 1.5 (recalibrated 2026-10-31): the old 1.8 sat inside level 18's own run-to-run variance (1.73–1.82) and failed every traverse level ever built, while copied skeletons score 1.1–1.4 and genuine topology departures score 1.6+. Clone protection now lives in the `skeleton-rhyme` mechanical flag; the floor only separates "rhymes with the roster" from "departs from it." Do not raise it back without a shipped anchor that clears it twice.

**Iterate** — one named flaw, fixable by tuning, placement, or one new set piece. Before fixing, re-run the full Play critic once: the bot pilot's skill varies run to run (level 18: 71s/2-deaths crown one run, 120s/11-deaths timeout the next), and a lone `cheap`/`blind` verdict on a bad pilot run is instrument noise, not a level flaw. Fix only a flaw that repeats across runs or that `deathSpots` clustering (deaths within ~200px) corroborates. Every failing Play/fidelity run emits a ranked `fixes` array (see Report) and the maker skill consumes only the top fix — one fix per loop — then re-runs the full critic. Fix the smallest thing that answers that corroborated top fix, then re-run the full Play critic. Do not re-run only the happy path, and do not batch lower-ranked fixes into the same loop.

Pilot budget rule: the time budget must put nominal runs mid-range, never at the edge — `max(90, worldWidth/40)` seconds, so a level needing ~120s gets ~150s. A timeout at the budget edge with progress near the crown means the budget is tight, not that the level is broken; a timeout far from the crown names the blocker.

**Rework** — the concept itself is a clone, flat, or off-theme. Go back to the Concept critic with a new Topology Fingerprint; do not tune a rework.

Maximum three iterate loops. After the third failure, stop and hand the report to the user with the remaining flaw named — do not keep grinding scores, and do not lower the gate to escape the loop.

## Report

`docs/level-reviews/level-<id>.md` carries: level id and build-report link, the run type, telemetry (outcome, duration, deaths and their spots/causes, max progress), the screenshot beat sheet with `screenshots_sent` and the manifest link, mechanical flags with confirm/rebut per persona, the six mean scores, each persona's flaw and verdict, the gate result, and — on iterate/rework — the fix contract below. News levels add the fidelity section: brief link, per-element verdicts (shown/faint/missing with probabilities, signatures flagged), per-row support verdicts, both fidelity means, the universe-check verdict, any `needs-human` stamps with the screenshot a human must open, and the fidelity gate result. The build report (`docs/level-builds/<level-id>.md`) must link the critic report and quote both verdicts; a build report with no critic link is incomplete.

**Fix contract.** Every failing Play/fidelity run emits a ranked `fixes` array in `docs/level-reviews/level-<id>.json` and a `## Fix contract` section in the `.md`. Each fix carries `flaw`, `evidence` (shot file + x / telemetry), `owner` skill, `smallestFix`, and `recheck` (what the next run must show). Maker skills consume the top fix only — one fix per loop — then re-run the full critic; lower-ranked fixes wait for their own loop and re-ranking.

## What the critic never does

It never edits the level, never deploys, never renumbers a level, and never scores from the brief alone — no capture, no verdict. It does not accept a debug skip (`?debug=1`, teleports) as a playthrough; teleports may position the pilot, real input must cross the ground being judged.
