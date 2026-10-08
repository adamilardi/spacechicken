# Level build: Bastion Relay (Level 11)

## Assumptions

- Contra Base 1: `PHASER: true`, alternating 616/586 ridge decks with 206px
  gaps (same jump unit as Colony Drop), warden waves [1,1,2,2,3,3], an offset
  red laser gate pair, one volt-orb sentry, one roller mine. No new hazard
  code; all actors already run.
- Crown pad (3.6x) with the gatehouse finale (boss-creator): two alternating
  crushers slam on either side of the pad; the safe center is 176px wide.
  See `docs/boss-builds/bastion-relay.md`.
- Spire Crown `NEXT_LEVEL` now points at 11; 11 points at 12 (chain 10-12).
- Tempest (weapon-creator): 5-way fan unlocked here through the single
  `tryFirePhaser` path; G swaps, HUD names the gun. See
  `docs/weapon-builds/tempest-hail.md`.

## Selection paths

- `art-selections/bastion-relay/selection.json` (delegated/agent) from
  `art-candidates/iron-womb/manifest.json`, candidate
  `level-bastion-relay-a`: layout, deck, pylon prop.
- Wave runners wear the shipped `spireWarden` boarder skin; the sentry wears
  the shipped `voltOrb` drone skin. No new actor paint.

## Texture keys

- `bastionDeck` 96x24 (pale walkable edge, cyan underlight, alert dots),
  `bastionPylon` 20x48 decor-only. Painted in `SpriteFactory.js`, registered
  in `createExpeditionSprites`, created at gameplay size with smoothing off.
- Background type `bastion`: enclosed corridor (ceiling lamps, arch frames,
  blast doors, diagonal struts, chains, foreground pipe frames, floor grate)
    - branches in `ensureLayout`/`drawLayer`. Composition reworked off the
      ridge-and-strip default per the skill's distinct-composition rule.

## Hazard types used

`boarder` waves [1,1,2,2,3,3], `laser` offset pair, `drone` patrol, `roller`
patrol+spin, `crusher` gatehouse pair. Props are images, no collision.

## Files changed

- `SpriteFactory.js`, `BackgroundRenderer.js`, `GameUtils.js` (tempest def),
  `SpaceChicken.js` (5-way fan branch)
- `levels/bastion-relay.js` (new), `levels/index.js`,
  `levels/spire-crown.js` (next-level link)
- `music/bastion.js` (new, id `bastion`, 140bpm), `music/index.js`
- `config/runtime-assets.cjs`, `tests/game.test.cjs`,
  `tests/contra-levels.test.cjs`

## Play URL and results

- `http://127.0.0.1:3000/?level=11` — bot: 0/1 wins, 11 deaths, reached
  x3651 (crown-pad approach). Control runs show the pilot is the limit, not
  the level: L8 (a previous 0-death bot win) also failed twice on this box
  (8-9 deaths), and L7 never bot-cleared either.
- In-browser probes: Tempest 5-fan + HUD label screenshot-verified;
  background layers render with no page errors.
- `npm test` 98/98, eslint zero warnings, prettier clean on touched files.

## Not verified

- Full bot/human playthrough to the crown, co-op race, touch controls, and
  the seam strip under real parallax scroll. No debug skip used.
