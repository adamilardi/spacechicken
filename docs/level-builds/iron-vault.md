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

## Retune: Vault Stack combat ascent (2026-11-09)

Static critic flagged `clone-suspect` (skeleton 0.788 vs level 11),
`background-recycled`, `checkpoint-desert` (5560→8900). This retune
replaces the flat x≈5500–6900 run with three ascending combat chambers.

### Topology Fingerprint

`vault stair opener + ascending combat stack (3 chambers) + high
traverse + Tumbler finale`. The route climbs ~280px through chambers
A→B→C (x 5508–7273), clearing two threat types per chamber, then drops
onto the existing high line for the finale. Deliberately not a shaft
(L11's new shape) or a stair (13/15): rooms with fights, joined by
short steps.

Killed layouts: (a) single tall shaft — too close to L11's relay
shaft in the same batch; (b) lift ride between chambers — owned mover
verbs (10/14).

### Signature Mechanic Canvas

Verb: **clear the room, take the stairs** — each chamber's fight
(boarder pair + second threat) guards its exit step. Teach: chamber A,
two wardens on a wide deck with the sentry drone passing over. Press:
chamber B adds a timed gate laser to the pair. Twist: chamber C pairs
its warden with a patrolling drone, then the exit drop skips the old
flat line. Classification: mandatory — the stack is the only route.

### Height & Path Map (g300, single-jump rise 176px)

| Tier/landing | Deck-top y | x span    | Climb in (rise)    | Fight there                |
| ------------ | ---------- | --------- | ------------------ | -------------------------- |
| Chamber A    | 548        | 5508–5892 | 235px jump-drop in | warden pair + sentry drone |
| Step S1      | 478        | 5954–6146 | 62px gap, rise 70  | crossing fire from B       |
| Chamber B    | 408        | 6227–6573 | 81px gap, rise 70  | warden pair + gate laser   |
| Step S2      | 333        | 6654–6846 | 81px gap, rise 75  | crossing fire from C       |
| Chamber C    | 268        | 6927–7273 | 81px gap, rise 65  | warden + patrol drone      |
| Exit drop    | 488        | 7211–7749 | overlap drop 220   | crusher carry-over         |

Landing runs ≥190px; steps clear patrol runs (no tier overlaps the
patrol below it); hazard lanes clear decks by 8px+.

### Changes

- Removed flat decks (5560,520), (6200,500), (6840,520) and the
  conflicting grate (6380,366); added A/S1/B/S2/C per the map.
- Fights: warden pairs in A and B, warden + patrol drone in C, gate
  laser in B (wave 6); comet pod moved into chamber B.
- Checkpoints: moved (5560,492) to (5200,480), added chamber C
  (6950,240); worst gap now 6950→8900 = 1950px.
- Instructions teach the chamber fights and the climb.

### Verification

- Static critic: clone-suspect CLEARED, checkpoint-desert CLEARED.
  Remaining: `flat-deck` and `background-recycled` (non-blocking).
- Mechanical critic (panel unavailable, `critic: mechanical-only`):
  pilot fought through the whole stack to x=7910 (past chamber C),
  27 deaths, zero page errors. Stack deaths (B/C rooms) show the
  intended pressure; route never blocks (graph-connected, drops land).
- Exit maneuver verified with live input+physics: walk off C lands
  grounded on the 7480 deck (7431,421).
- Staged stack screenshot (/tmp/stack-16.png): ascending bronze
  chambers, B gate laser with comet pod, patrol drone all read.
- Full gate green (547 tests, lint, format).
