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

## Retune: Relay Shaft combat ascent (2026-11-09)

Static critic flagged `clone-suspect` (skeleton 0.788 vs level 16),
`background-recycled`, `checkpoint-desert` (7280→10900). This retune
replaces the flat x≈7000–8300 run with a vertical fight-and-climb shaft.

### Topology Fingerprint

`trench dip + relay-shaft combat ascent + gatehouse finale`. The route
climbs ~370px inside a ~900px-wide shaft (x 6956–7894), fighting one
warden per landing under a crossing drone, then drops back to the deck
line for the existing finale. Start deck top 568, crown deck top 528.

Killed layouts: (a) lift ride up the shaft — owned mover verbs (10/14),
less contra than climbing under fire; (b) broad switchback stair —
rhymes with the 13/15 stairs in both plan and silhouette.

### Signature Mechanic Canvas

Verb: **climb while clearing** — each landing must be fought (stationed
warden) before the next jump, with a drone crossing all three heights.
Teach: L1 warden on a 230px landing, drone passing high. Press: L2+L3
with the drone crossing the jump lines. Twist: exit drop onto a guarded
deck (E1 warden) under the existing exit drone. Classification:
mandatory — the shaft is the only route (no bypass; low line removed).

### Height & Path Map (g300, single-jump rise 176px)

| Tier/landing | Deck-top y | x span    | Climb in (rise)        | Fight there             |
| ------------ | ---------- | --------- | ---------------------- | ----------------------- |
| Shaft base   | 568        | 6956–7244 | run on from 6750 deck  | crusher pair carry-over |
| L1 grate     | 440        | 7265–7495 | 21px step-up, rise 128 | stationed warden        |
| L2 grate     | 318        | 7035–7265 | touch edge, rise 122   | stationed warden        |
| L3 grate     | 196        | 7315–7565 | 50px gap, rise 122     | shaft drone crossing    |
| Exit E1      | 458        | 7606–7894 | 41px drop-leap         | stationed warden        |
| Exit E2      | 528        | 8085–8315 | 210px drop, rise −70   | exit drone carry-over   |

Underside clearances ≥98px on overlaps; landing runs ≥210px; drone lane
clears decks by 8px+. No tier above a boarder patrol overlaps its run.

### Changes

- Removed flat decks (7280,580), (7920,560) and grate (8100,426).
- Added base + L1/L2/L3 + E1/E2 per the map; wardens on L1/L2/E1
  (wave 6), one shaft-crossing drone, tempest pod moved onto L3,
  roller moved to the 8560 deck.
- Checkpoints: shaft top (7520,168) and (9840,512); worst gap now
  7520→9840 = 2320px. Both clear of lanes, beams, and boarder homes.
- Instructions teach the shaft climb and landing fights.

### Verification

- Static critic: clone-suspect CLEARED (0.788 → below threshold vs all
  levels), checkpoint-desert CLEARED. Remaining: `flat-deck` and
  `background-recycled` (visual-variety heuristics, never block).
- Mechanical critic (panel unavailable — Jev 400s on full payloads, so
  `critic: mechanical-only`): pilot reached x=7638 (E1, shaft exit),
  37 deaths, zero page errors. Deaths cluster at the pre-existing
  crusher pair and the shaft exit drop (timed drone crossing — the
  taught twist; pilot mistimes it, humans read it from the briefing).
- Exit maneuver verified with live input+physics: run off L3 lands
  grounded on E1 (7743,400).
- Staged shaft screenshot (/tmp/shaft-11.png): zigzag landings,
  stationed wardens, tempest pod on L3, crossing drone all read.
- Full gate green (547 tests, lint, format).
