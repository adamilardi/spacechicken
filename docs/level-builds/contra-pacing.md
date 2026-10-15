# Contra arc pacing pass — 2026-10-11

Request: review the Contra-style levels and make them more fun. This pass covers levels 8–16 and preserves the pre-existing working-tree changes, geometry, canvas artwork, weapons, campaign numbering, and finale layouts. No deployment.

## Review and changes

The shared wave thresholds released reinforcements long before some encounters and almost directly beside the player in the short vault branch. Each level now authors `content.boarderWaves`, passed through `LevelConfig` to `BoarderDirector`. Every reinforcement has at least 300px of approach; the first wave remains present at the start. Trigger positions follow each level's existing encounter locations without waiting for previous waves to die.

Each level has a second, optional gun pod on an upper route. These preview that level's signature gun (or Comet in the vault), while the existing main-route pod remains available. No weapon is required to finish; the base phaser still defeats every boarder. Colony gains two safe checkpoints at x=1900 and x=3350. Foundry and Skyhook lose their copied opening drip pairs so the first fight has room to breathe; Foundry builds toward beams and trams, while Skyhook builds toward its lift and mixed final hazards. Harbor and Womb keep their low-route drips.

Two correctness problems undermined combat: the crown shield counted only arrived enemies, so an opening-wave clear could open it prematurely, and the 140px reinforcement drop could land a lower-route enemy on an overhead shelf. The shield now waits for every authored boarder to be defeated; reinforcement entry clears actual platform collision bodies. After reaching a checkpoint, earned boarder defeats survive death/retry so the corrected shield does not require repeating completed fights behind the checkpoint. Surviving enemies reset, and a fresh run without a checkpoint resets defeats as before.

## Assets and files

No selection file or new art was needed: this reuses running assets, as allowed by the level-creator skill. Deck textures remain colonyDeck/colonyGirder, hiveChitin/hiveFang, spireAlloy/spireGlass, bastionDeck/bastionGrate, wombFlesh/wombBone, harborDeck/harborPlank, foundryDeck/foundryChain, skyhookDeck/skyhookPanel, and vaultDeck/bastionGrate. Enemy textures and animations are unchanged. Existing hazard types remain boarder, bonk, crusher, laser, drone, roller, drip, and dustDevil; no concept actors were introduced.

Edited: `BoarderDirector.js`, `LevelConfig.js`, the nine Contra level modules, `tests/contra-levels.test.cjs`, `tests/level-polish.test.cjs`, the pod counts in `tests/game.test.cjs`, `docs/HUMAN_FEEDBACK.md`, and this report. Added `tests/contra-pacing.test.cjs` for wave approach distance, runtime trigger selection, unreleased shield enemies, checkpoint kill preservation, and overhead spawn clearance.

## Verification

- `npm run check`: passed tests, zero-warning lint, and formatting.
- `npm run build:cloudflare`: passed.
- Existing geometry/reward checks cover all nine levels, including the additional pods and Colony checkpoints.
- Play URLs: `http://127.0.0.1:3000/?level=8` through `?level=16`; earlier-level regression at `?level=7`.
- A 45-second normal-input Colony pilot reached the crown area, died twice, and recovered at both new checkpoints. It did not clear the shield; the pilot can skip enemies and is not evidence of a complete combat clear.
- A browser sweep ran 35 seconds of normal pilot input per level on levels 7–16. Levels 7–9 and 11–16 had no page errors and passed pause plus forced-death recovery. Spire's first pause check raced a death transition, so the harness was corrected to wait for recovery and that level was repeated separately.
- Browser artifacts and raw results are in `/tmp/space-chicken-contra-review/`; screenshots for Colony and Foundry were visually inspected. These short automated runs did not establish start-to-crown completion for every level, bonk coverage, or every next-level handoff. Human combat playtesting remains the validation gap; no claim of measured enjoyment improvement is made.
- Spire's isolated repeat passed pause and death recovery with no page errors. Recovery was checked when the body re-enabled, within the grace window; waiting 1.5 seconds instead can observe a subsequent hit against the idle pilot. All ten sampled levels therefore passed the runtime pause/recovery checks, but none of these samples demonstrated a full crown clear.
