# Contra pass: levels 8-10 (October 2026)

Small geometry pass over the contra-style trilogy, driven by a review of the
level skills plus Contra (NES, 1988) reviews and stage breakdowns. No new
hazards, art, or engine code; all edits are level data.

## What Contra reviews praise that maps here

- Relentless forward rhythm with varied ridges (Jungle is never flat), not
  long flat decks.
- Combined arms: grunts on the run line plus turrets/snipers above it, so the
  player jumps and shoots at the same time.
- Fixed power-up stations and a gun ladder (Spread/Machine/Laser). Already
  present as Scatter/Piercer/Nova via `weaponsForLevel`; this pass only makes
  sure each level's opener gives room to use the current gun.
- A distinct gated finale per stage with dodge room. Level 8 already had the
  `CROWN_SHIELD` gate; 9 and 10 had thin crown pads.
- Tough but fair: every hop must be single-jumpable, with double jump as
  backup, never as the only way up.

## Changes

- Colony Drop (8): decks 2 and 4 rise 30px, alternating 616/586 ridges so the
  beachhead has a run-and-jump rhythm. Gaps stay 206px. A trial move of the
  spore-floater sentry over deck 3 (combined arms with the wave-2 skitterers)
  was reverted after bot evidence: 0/2 wins with the pairing vs 2/2 wins with
  the sentry back over the deck-3/4 gap (x2500, patrol 2620). Crown deck
  widens 3.0x to 3.6x, and a third landing beacon marks the crown pad as a
  gate landmark.
- Hive Warrens (9): the catwalk deck drops 560 to 580, so the opening climb is
  a 162px single jump (max 170px at gravity 320) instead of a forced
  bonk-launch or double jump. The bonk brute stays as the fast line. Crown
  deck widens 2.0x to 2.8x for room under the spore-beam.
- Spire Crown (10): crown deck widens 2.6x to 3.2x, giving a finale pad worthy
  of the lift ride and the wave-4 warden.
- `tests/contra-levels.test.cjs` (new): every trilogy hop fits a normal single
  jump from the level's own gravity, the opener deck sits under the spawn,
  crown pads are wide and float just under the crown, and every boarder home
  sits at or past its wave's global release line (`BOARDER_WAVES`).
- `skills/level-creator/references/spacechicken.md`: lists levels 8-10, the
  crown gates, the weapon unlock ladder, and the new test file. It previously
  ended at Earthwatch and claimed there was no weapon ladder.

## Play URLs and results

- `http://127.0.0.1:3000/?level=8`
- `http://127.0.0.1:3000/?level=9`
- `http://127.0.0.1:3000/?level=10`
- `npm test` 97/97 (94 existing + 3 new), eslint zero warnings, prettier clean.

## Not verified

- Full bot/human playthrough to the crown on 8/9/10 after this pass (level 8
  previously bot-cleared with 0 deaths before the ridge/drone changes; 9 and 10
  were already pending an idle box). Co-op, touch controls, and parallax seams
  remain unverified, as in the original build docs.
