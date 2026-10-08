# Level build: Iron Vault (Level 16)

## Assumptions

- Sealed vault branch off Crimson Womb, the Hard Corps fork:
  `PHASER: true`, skitterling waves [1,1,2,2,3,3], one volt-orb
  sentry, one `laser` beam, one `crusher` pad slam, `CROWN_SHIELD`
  (drop all six skitterlings to open it). No new hazard code; all
  actors already run.
- L12 `BRANCH: [13, 16]` keeps `NEXT_LEVEL: 13` as the default path;
  the vault sets `NEXT_LEVEL: 14` so it rejoins the foundry. Picking
  either branch unlocks the max branch level. One rescue (-2s) and
  one Comet pod (30s) per the arcade-systems rule.
- Background reuses the `bastion` renderer with a `vault` style
  (sealed-bulkhead palette) instead of new parallax code; the warm
  bronze deck keeps it distinct from Bastion Relay's gunmetal run.

## Selection paths

- `art-selections/iron-vault/selection.json` from
  `art-candidates/iron-vault/manifest.json`, candidate
  `level-iron-vault-a`: stacked deck run + bronze deck + seal prop.
- Boarders wear the shipped `skitterling` skin; the sentry wears the
  shipped `voltOrb` drone skin; shelves reuse the shipped
  `bastionGrate`. No new actor paint.

## Texture keys

- `vaultDeck` 96x24 (bronze vault plating, bright walk edge, amber
  seal lamps over dark seams). `vaultSeal` 24x48 decor seal post, no
  collision. Painted in `SpriteFactory.js`, registered in
  `createExpeditionSprites`, created at gameplay size with smoothing
  off.
- Background type `bastion`, style `vault`: sealed bulkhead palette
  (near-black top, amber lamps) through the existing bastion
  branches; no new `BackgroundRenderer` devices.

## Hazard types used

`boarder` waves [1,1,2,2,3,3], one `drone` sentry, `laser` beam,
`crusher` pad slam, `CROWN_SHIELD` gate. Two `vaultSeal` props.

## Files changed

- `SpriteFactory.js` (`vaultDeck`, `vaultSeal`)
- `levels/iron-vault.js` (new), `levels/index.js`,
  `levels/crimson-womb.js` (`BRANCH`, `branchInstructions`)
- `LevelConfig.js` (`branchInstructions`), `SpaceChicken.js`
  (branch subtitle handoff), `UIManager.js` (branch subtitle layout)
- `InputController.js` (branch offer owns keys 2/3/4; coop poll ate
  the key-2 pick — see below)
- `music/vault.js` (new, id `vault`, 138bpm), `music/index.js`
- `config/runtime-assets.cjs`, `tests/game.test.cjs`,
  `tests/contra-levels.test.cjs`, `tests/competition.test.cjs`,
  `tests/leaderboard-api.test.cjs`, `functions/api/leaderboard.js`,
  `functions/api/run.js` (campaign grows to 16)

## Key-2 pick fix

`coopKeys.keyboard` shares keycode 50 (`TWO`) with `branchKey2`, and
`JustDown` is consume-once: `InputController.poll` runs before
`updateBranchInput` every frame, so pressing 2 during the offer set
a useless `coopMode` and the vault pick never fired (key 1 always
worked). The coop-key poll now skips while `scene.awaitingBranch`
is true — the offer screen returns before `offerCoop` anyway, so no
behavior changes outside the branch. Regression test: `branch
offers keep key 2 for the vault instead of coop`.

## Play URL and results

- `http://127.0.0.1:3000/?level=16` — probes: loads playing, phaser
  on, rescue collects (rescues 1), pod grants Comet with countdown,
  shielded crown holds on touch (still level 16), zero page errors.
- `http://127.0.0.1:3000/?level=12` — wave-walk hunt clears all six
  gnawers with live bolts, crown touch raises the offer
  (`Rust Harbor` / `Iron Vault` + subtitle, screenshot-checked),
  key 2 lands level 16 playing with the handoff, zero page errors.
- `npm test` 118/118, eslint zero warnings, prettier clean on
  touched files.

## Not verified

- Full human playthrough to the vault crown, co-op race on the
  branch (P2 handoff across the pick), touch hardware pick (tap
  path), and the seam strip under real parallax scroll.
