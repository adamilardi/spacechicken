# NEWS LEVELS playtest feedback — 2026-10-31

Purpose: feedback for improving the skills that generated the levels, not a level-fix pass. Reviewed all seven entries in `NEWS_LEVEL_IDS` (17–23). This review did not change game or skill source files.

## Main finding

The pipeline produces working, visually themed platformers more reliably than it produces the specific gameplay promised by its briefs. The most useful next refinement is **observable proof of the signature mechanic**: record what the player actually does, demonstrate the advertised outcome, and attempt to bypass it. More prose in the concept documents or more critic rerolls will not establish that proof.

Retain the clear platforms, familiar chicken/crown language, forgiving checkpoints, and story-specific landmarks. Prioritize mechanical identity, repeatable fairness, and reliable evidence before adding more decorative inventory.

## Evidence and limits

- Review base: commit `dd43308073ec37552782aab693910a8a80fd86075`; only the pre-existing untracked `generated_images/` directory was present before this review. At final verification, concurrent edits had appeared in the news/boss/level skills, seven build notes, and the concept critic (adding a boss-theme decision). Those edits were left untouched; no runtime level/gameplay files changed. The test result and recommendations here concern the reviewed baseline, not certification of those later edits.
- Fresh Chromium playthrough attempts use the repository pilot through the game's input API, starting at spawn, with normal simulation timing and no teleport/skip/invulnerability. Each news level receives Normal and Hard attempts at 1280×720 in separate contexts. Difficulty is checked from the live scene. Two mode suites run concurrently; times are observed wall-clock seconds, not performance benchmarks.
- The runner records positions every roughly 200ms, death locations/causes, crown-to-level-1 transitions, rescues, bonk calls, and approximate grounded lift contact. Death positions are the last sampled pre-death position, not exact collision coordinates. Zero lift-contact samples alone cannot exclude a very brief contact.
- Screenshots are from live routes, not staged camera placements. The `-0` shots can include the opening banner; later shots may include checkpoint banners or death flashes (notably level 20 normal shot 1). A flash-obscured shot is not evidence of permanently unreadable art. They are evidence of what was actually visible, not polished promotional images.
- Separate smoke tests use actual keyboard events and emulated two-finger touch at 844×390, checking movement/jump and Escape/P/button pause-resume on levels 1 and 17–23. These are opener/control checks, not full mobile clears. Co-op, gamepad, portrait playthroughs, audio synchronization, and physical-device performance remain untested.
- `npm test`: **435 passed, 0 failed**. See [test output](evidence/tests.log).
- Existing full critic results are preserved in [prior-critics.json](evidence/prior-critics.json). All seven report `screenshotsSent: true`. Those panels were **not rerun** for this review; this is fresh play telemetry plus visual/code review, not a new AI-panel shipping verdict. Source articles were not fact-checked; fidelity comments compare play with the repository briefs.
- Reproduction: `node docs/skill-review/playtest-20261031/run.mjs`; control checks: `node docs/skill-review/playtest-20261031/controls.mjs`. Optional `REVIEW_LEVELS`, `REVIEW_MODES`, and `REVIEW_OUT` select repeat runs. Re-running overwrites files in the selected output directory.

## Fresh run results

| Level                 | Normal result                                                          | Hard result                                                          | Bonks N/H | Rescues N/H |
| --------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------- | --------- | ----------- |
| 17 Ticker Plunge      | [Crown; 58.8s; 1 death](evidence/level-17-normal.json)                 | [Crown; 94s; 18 deaths](evidence/level-17-hard.json)                 | 0/0       | 0/0         |
| 18 Fear Spike         | [Timeout, max x5247; 171.6s; 34 deaths](evidence/level-18-normal.json) | [Timeout, max x2203; 171.5s; 10 deaths](evidence/level-18-hard.json) | 2/6       | 0/0         |
| 19 Hubble Rescue      | [Crown; 60.4s; 0 deaths](evidence/level-19-normal.json)                | [Crown; 80.4s; 2 deaths](evidence/level-19-hard.json)                | 0/0       | 2/2         |
| 20 Robot Dance Sync   | [Timeout, max x1843; 171.7s; 17 deaths](evidence/level-20-normal.json) | [Timeout, max x5466; 171.5s; 13 deaths](evidence/level-20-hard.json) | 0/1       | 0/0         |
| 21 Phobos Sample Run  | [Crown; 88.4s; 3 deaths](evidence/level-21-normal.json)                | [Crown; 60.6s; 0 deaths](evidence/level-21-hard.json)                | 0/1       | 2/1         |
| 22 Booster Homecoming | [Crown; 64.3s; 3 deaths](evidence/level-22-normal.json)                | [Crown; 117.9s; 15 deaths](evidence/level-22-hard.json)              | 0/0       | 1/1         |
| 23 Reconnection       | [Crown; 49.9s; 1 death](evidence/level-23-normal.json)                 | [Crown; 48.1s; 1 death](evidence/level-23-hard.json)                 | 0/0       | 0/0         |

Independent repeats: [17 Hard](evidence/repeat/level-17-hard.json) cleared in 52.6s with 0 deaths; [18 Normal](evidence/repeat/level-18-normal.json) timed out at 171.6s with 23 deaths and maximum x5404. Total: **16 attempts, 11 crown clears, 5 timeouts, no page exceptions**. Every crown clear transitioned to level 1. No timed-out attempt is counted as a clear.

[Control smoke results](evidence/controls.json): all eight tested levels passed movement/jump, multitouch, Escape/P/button pause freezing and resume, with no horizontal page overflow or page exceptions. Natural death/retry cycles occurred throughout the route tests; no separate forced-death test was added.

**Review disposition: needs refinement, not a batch QA pass.** Fresh full clears remain unverified for 18 and 20. Historical critic blockers remain on 17, 19, 20, and 21. The other fresh clears demonstrate completion, not that every advertised signature mechanic is necessary or implemented.

## Feedback by level

### 17 — Ticker Plunge

**Keep:** immediately readable market-chart motif and a straightforward traversal. The bright chicken and pale platform rims separate from the dark industrial background. [Live mid-route screenshot](evidence/level-17-normal-3.jpg).

**Improve:** the route does not deliver the brief's sustained “plunge”: its main opening deck centers rise from y636 to y516, and the crown deck is y440. The chart behind the route also rises prominently from left to right in this capture, weakening the falling-market premise. More decisively, the sorted deck x-list and 6000px width exactly match levels 19 and 20. That is a measurable reuse of route structure, even though heights and hazards differ.

**Fairness follow-up:** the first Hard run clustered 17 of 18 deaths near x3521–3675, around the second Ticker Bot lane/approach; the independent Hard repeat cleared with zero deaths. Treat this as timing/pilot sensitivity requiring phase-varied reproduction, not proof of an unavoidable collision. Preserve both runs.

**Skill action:** [level-creator](../../../skills/level-creator/SKILL.md) should validate the claimed direction and route shape against geometry, and compare actual layouts across the entire batch before art integration. Acceptance: a visibly descending route with its own deck sequence and a playable final decision tied to the falling-market premise.

### 18 — Fear Spike

**Keep:** the rising route and enormous gauge give this level a clearer identity than the copied traverses. Bears are actually bonkable, and the fresh runs exercised that verb. The chevrons and red attack state communicate a different interaction from ordinary drones. [Mid-route laser and gauge](evidence/level-18-normal-3.jpg).

**Improve:** fresh attempts expose much more variability than the historical passing report suggests. The first Normal attempt had 22 deaths in the rounded x3500 bin, at the approach to the x3550 laser, despite reaching x5247 earlier. The nearby checkpoint creates a short retry cycle; it does not by itself make that cycle fair or understandable. Hard stalled much earlier. The independent Normal repeat also timed out (23 deaths, maximum x5404). The repeat had another 13 deaths in the rounded x3500 bin. Both attempts got far beyond the opener but did not reproduce the earlier crown clear.

**Skill action:** [qa-reviewer](../../../skills/qa-reviewer/SKILL.md) and [game-critic](../../../skills/game-critic/SKILL.md) should require multiple fresh-start/respawn phases for a tight gate, report worst-case and clustered retries, and retain failed runs beside passes. Investigate the x3550 beam and Hard's early traversal separately; do not blindly retune the bears because an older report named them. Acceptance: repeatable crossing evidence, including failed attempt → readable correction → success, in both modes. A bot timeout is a reproducibility concern, not proof a human cannot finish.

### 19 — Hubble Rescue

**Keep:** the Hubble body, solar arrays, servicing arm silhouettes, and tug sprite form a recognizable place. Optional crew rescues read clearly as interactable cages. [Live servicing area](evidence/level-19-normal-3.jpg).

**Improve:** the Normal crown clear collected two rescues and recorded no grounded lift samples. Combined with the reachable rising static platforms, this fails to demonstrate the claimed “reboost-ride” as the route's defining action. The instruction can say “ride,” but the verification must actually show a ride. The large background gantry/arrays also compete with the playable surfaces, even though their bright edges remain distinguishable.

**Skill action:** require a safe first lift encounter, a pressured second use, and a finale that changes or completes the reboost action. If lifts and servicing tasks are intentionally optional, describe them that way. Remove the shared 17/20 deck skeleton before spending another loop on small fidelity props. Acceptance: telemetry shows lift boarding and meaningful vertical transport; a direct static-platform bypass either fails safely or is documented as an intentional alternate route.

### 20 — Robot Dance Sync

**Keep:** humanoid silhouettes and the countdown display give the stage a different visual subject, as visible in the existing staged critic shots ([dancer](../../level-reviews/evidence/level-20/02-hazard-drone.jpg), [countdown](../../level-reviews/evidence/level-20/05-setpiece-countdownBoard.jpg)); these two are historical evidence, not fresh route captures. The existing bonk helpers provide an additional interaction beyond avoiding drones.

**Improve:** “110 robots in unison” currently becomes two dancer drones at x1400 and x3650, separated by 2250px. Equal 1200ms patrol durations are not enough to make a visible ensemble or let the player learn a shared beat. The supposed formation grid shares the 17/19 deck x-list. The brief's Novelty Ledger and Signature Canvas still mention an adjudicator wave even though the implemented finale and the first fact→mechanic table were amended to a laser/roller gauntlet. There are no rescue placements despite the table's “checkpoint rescue” wording.

**Fresh play concern:** Normal timed out after 171.7s with 17 deaths and maximum x1843, with most retries near x1200–1500, so its later formation/finale were not verified by that attempt. Hard also timed out (13 deaths, maximum x5466); 12 of its deaths fell in the rounded x1200–1400 bins. It reached the final approach late in its budget, so this does not establish a blocked finale. Treat the repeated early dancer/calibration crossing losses as a separate playability issue from the missing ensemble concept.

**Skill action:** [news-to-level](../../../.agents/skills/news-to-level/SKILL.md) and [enemy-animation-creator](../../../skills/enemy-animation-creator/SKILL.md) should require one visible, learnable synchronized group, a clear phase cue, then a formation change that alters the safe route. Reconcile the whole brief and player instructions, not just the first table. Acceptance: a short live clip shows several dancers together; the player can predict and exploit the group beat. Audio synchronization remains unverified in this review.

### 21 — Phobos Sample Run

**Keep:** low gravity supports the orbital setting, and the rocket/planet imagery distinguishes this level from the station interiors.

**Improve:** “sample-carry” is not implemented as a required carry/delivery objective. Samples are ordinary rescue cages: `collectGem` uses rescue count for a time bonus and does not require samples to finish. No distinct carrying/delivery state is established. Fresh crown clears collected only 2/3 rescues in Normal and 1/3 in Hard; neither attempt recorded lift contact. The live collection screenshot says “CREW SAVED — Run time −2s,” explicitly teaching a crew/time-bonus reward rather than sample delivery. See [collection feedback](evidence/level-21-normal-4.jpg). The layout's claimed “loop-back” is not demonstrated merely by a dip followed by a rise in a predominantly rightward route.

**Skill action:** [news-to-level](../../../.agents/skills/news-to-level/SKILL.md)/[level-creator](../../../skills/level-creator/SKILL.md) should distinguish story-flavored collectibles from a signature objective. Either implement sample acquisition, explicit cargo state, and delivery validation, or honestly brief an optional collection route. Acceptance: approaching the return capsule without the required sample has a defined response; collecting it changes visible state; delivery completes that state. Do not count an existing bonus mechanic as a new carry mechanic just by renaming it.

### 22 — Booster Homecoming

**Keep:** the compact 3800px climb-then-descent is a stronger translation of a story into route shape. The low final crown deck makes the landing a real destination; the crown-deck roller gives the arrival pressure. This is a better structural reference for future news levels than the repeated 6000px template. [Live ascent/apogee view](evidence/level-22-normal-2.jpg).

**Improve:** the brief calls the destination a “moving-target deck,” but the crown deck is static; the moving object there is the roller. Reconcile that wording before asking fidelity judges to approve it. A hard vertical background join is visible near screen x428 in [the live apogee approach](evidence/level-22-normal-3.jpg); the full-world `tileSprite` makes plate-edge continuity an integration concern. Ask the art skill to preview a complete scroll, not only one frame. Make the landing-burn/controlled-descent skill explicit in the teach and press beats rather than relying on ordinary jumps to imply it.

**Hard follow-up:** the clear took 117.9s and 15 deaths, including eight in the rounded x1300 bin near the first satellite patrol. Inspect that early approach under different phases before changing the otherwise successful descent concept.

**Skill action:** preserve the flight-profile topology and short length. Verify the descent with live approach footage and landing-state telemetry. Do not inflate the level or add a boss merely to improve novelty scores.

### 23 — Reconnection

**Keep:** split upper/lower routes, magnetic arcs, and bonkable sprites are a promising basis for translating reconnection into movement.

**Improve:** the player instructions still promise “staggered beams,” while the level contains one laser. The build note acknowledges removing the second beam but still says “Nothing cut.” The brief also promises gaps that cannot be crossed without a sprite bounce; the fresh Normal run reached the crown in 49.9s with one death and **zero bonks**; Hard also cleared in 48.1s with one death and **zero bonks**. Both directly demonstrate a no-bonk completion route. Visible sprites alone cannot establish that the bounce is the bridge. See [live route](evidence/level-23-normal-2.jpg) and [late approach](evidence/level-23-normal-4.jpg).

**Skill action:** require one safely taught, demonstrably useful bonk crossing before combining it with the ray hazards. Check a no-bonk route and classify it as intentional or accidental. Reconcile the tutorial text, Signature Canvas, and final brief with the one-beam implementation. Acceptance: capture the actual bounce crossing and resulting landing; still images of an orb beside a gap are insufficient.

## Highest-value changes to the skills

| Priority | Owner                                                                                                                                                          | Proposed requirement                                                                                                                   | Evidence that would satisfy it                                                                                                                                   |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | [news-to-level](../../../.agents/skills/news-to-level/SKILL.md), [level-creator](../../../skills/level-creator/SKILL.md)                                       | Every signature claim has a runtime observable and a bypass test. Separate mandatory mechanics, optional rewards, and visual metaphor. | A ride, bounce, cargo delivery, or rhythm crossing is recorded; crown-without-signature behavior is intentional and documented.                                  |
| P1       | [level-creator](../../../skills/level-creator/SKILL.md)                                                                                                        | Validate the authored topology against the concept and all batch siblings before art polish.                                           | Coordinate/route comparison catches 17/19/20's exact x-list; “descent,” “loop,” and “funnel” have measurable geometry and demonstrated routes.                   |
| P1       | [qa-reviewer](../../../skills/qa-reviewer/SKILL.md), [game-critic](../../../skills/game-critic/SKILL.md)                                                       | Keep a small suite of fresh runs across both modes and timing phases; never substitute the best result for the distribution.           | Death clusters, timeouts, corrections, and passes remain linked to the same revision. Repeat a hotspot before labeling it unfair.                                |
| P1       | [game-critic](../../../skills/game-critic/SKILL.md)                                                                                                            | Bind manual confirmations to evidence and identify the reviewer honestly.                                                              | Confirmation includes revision/shot hash, named claim, reviewer identity/type, and observed basis; geometry/art changes invalidate stale confirmations.          |
| P2       | [news-to-level](../../../.agents/skills/news-to-level/SKILL.md), [story-writer](../../../skills/story-writer/SKILL.md)                                         | Reconcile every player-facing promise and concept section with the final build.                                                        | No “staggered beams” with one beam, “moving deck” with a static deck, or removed adjudicator wave left in the canvas.                                            |
| P2       | [enemy-animation-creator](../../../skills/enemy-animation-creator/SKILL.md), [enemy-animation-integrator](../../../skills/enemy-animation-integrator/SKILL.md) | Judge story behavior in motion, at gameplay scale.                                                                                     | The dance ensemble is visible together and follows a readable phase; themed animation does more than move a new texture along an old patrol.                     |
| P2       | [level-art-creator](../../../skills/level-art-creator/SKILL.md), [level-art-selector](../../../skills/level-art-selector/SKILL.md)                             | Budget contrast and meaning on the actual route, not just the full generated plate.                                                    | The player distinguishes solids, decoration, threats, and objective items at gameplay size; samples look like samples; landmark crops still convey the story.    |
| P2       | [game-critic](../../../skills/game-critic/SKILL.md)                                                                                                            | Make evidence coverage follow signature beats before generic hazard types.                                                             | Teach/press/twist and alternate-route samples are captured in motion; prop/landmark coverage is not lost because generic hazard beats filled the screenshot cap. |
| P2       | [producer](../../../skills/producer/SKILL.md), [game-critic](../../../skills/game-critic/SKILL.md)                                                             | Preserve immutable run history and enforce iteration limits outside narrative instructions.                                            | A canonical final status links to a specific run; reaching the retry limit stops automated scoring rather than merely annotating `loopExceeded`.                 |

Several of these requirements already exist in prose. In particular, the current skills already forbid copied skeletons and require brief reconciliation. The failure here is enforcement and evidence, so prefer executable checks and explicit handoff records over repeating those instructions more strongly.

## Critic/workflow findings

- The latest stored full-panel reports pass **18, 22, 23** and fail **17, 19, 20, 21**. These are historical gate results, not this review's endorsements. For example, level 22's build note ends at an ITERATE outcome while its JSON is a PASS at loop 7 with `loopExceeded: true`. Level 21's older notes emphasize an empty finale, but its current report's quality personas all name `none`; the remaining gate failure is fidelity. Refinement agents should not chase stale findings.
- `loadHumanConfirmations` accepts an array of claim strings without binding them to a revision or screenshot hash. Level 23's checked-in confirmation labels its reviewer “agent human-review (screenshots opened).” Agent visual review is useful, but it should not silently stand in for the skill's explicit human-confirmation requirement. This review adds no human confirmations.
- The current shot planner prioritizes first occurrences of hazard types, limits pre-finale candidates, and then fits props into remaining slots. That can miss signature use or an alternate route. A frozen object-presence shot can support visual fidelity; it cannot establish synchrony, cargo delivery, necessary lift use, or bonk-dependent reachability.
- Keep the 435 passing tests as a runtime/structural safety net. They do not establish fun, narrative fidelity, or robust first-time play. Similarly, three texture keys do not automatically mean three meaningful platform shapes.

## Suggested next refinement experiment

Start with **Phobos's sample objective** as a narrowly scoped skill experiment: state the intended collect/deliver behavior, implement it, add the negative crown-without-sample check, and record the successful delivery. This directly tests whether the pipeline can turn a story fact into a real rule. Next, rebuild one of 17/19/20 from a distinct route sketch and compare the result with its two siblings. Keep Booster Homecoming's compact topology as a positive reference and Fear Spike's repeated runs as a robustness case.

Do not fix every level at once. Use one focused change per experiment, retain before/after runs, and judge success by observable play rather than a small movement in a model's novelty score.
