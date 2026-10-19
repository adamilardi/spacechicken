# Contra full-length pass: levels 8-16 (October 2026)

Request: run a full validate-and-improve loop over the contra-style levels
and grow each to a normal Contra stage length. No deployment.

## Validation: why the levels were short

Baseline measurement (player run speed 160px/s, `/tmp/contra-validate.mjs`,
read-only probe, not committed):

- Contra worlds ran 6,400-9,200px: 46-54s of pure running (36s for the Iron
  Vault branch), roughly 1.7-2 minutes of played time with combat. A normal
  Contra (NES, 1988) stage plays about 3-4 minutes across three acts plus a
  gated finale. The arc was one full act short.
- Hazard density sat at 2.3-3.3 entries per 1000px with finales that press
  (guard/crusher/beam bands intact on all nine). Openers, shelf payoffs, and
  checkpoint honesty were already reviewed clean by the diversity, pro-review,
  pacing, and polish passes, so existing geometry was left untouched except
  where the extension joins it.

## Target

+3,600px per level: one full new act inserted before each finale, finales
moved intact (the same pattern as the 2026-10-11 doubling pass). New widths:
8: 12000, 9: 11200, 10: 12400, 11: 12000, 12: 12400, 13: 12800, 14: 12800,
15: 12800, 16: 10000 (branch stays shortest). Pure-run time is now 68-77s
(59s branch), about 2.5-3.5 minutes played. Post-pass density is 2.3-3.0 per
1000px, matching each level's own baseline; the campaign curve keeps its
prior shape.

## What each new act carries

Six main-line decks (seven on Spire Crown, whose 128px alloy decks cover
less ground) plus two accent-texture shelves, all joined to the directed
reachability graph: edge gaps <=260px, every rise fits the level's own
single-jump budget, shelves stagger past a deck edge for side access. Each
act adds one boarder wave (2-4 of the level's own key, >=300px approach),
two drones, two themed ground hazards in the level's existing vocabulary
(rollers, drips, devils, crushers, beams, bonks - no new hazard code), one
checkpoint, one signature-gun pod, one rescue on a shelf, and two themed
props. Every new shelf pays (rescue) or threatens (drone/sentry). The last
~500px of each act is calm so the shifted finale approach still breathes,
and every finale (crown pad, gates, lifts, guards, branch fork) moved +3600
untouched. Two homes were relocated rather than shifted so no wave spans
two acts (L8 wave 6) and no home sits inside a slam footprint or drip line.

Per-level wave pins are now: 8: [1,1,2,2,3,3,4,5,5,6,6,7,7,7,7,8],
9: [1,2,2,3,3,4,4,5,5,5,6,6,7], 10: [1,2,2,3,3,4,4,5,5,5,6,6,6,7],
11: [1,1,2,2,3,3,4,4,5,5,5,6,6,6], 12: [1,2,2,3,3,4,4,5,5,5,6,6,6,7],
13/14/15: [1,1,2,2,3,3,4,5,5,6,6,6,7,7,7,8],
16: [1,1,2,2,3,4,5,5,5,6,6,7].

## Files

Edited the nine contra level modules (`levels/colony-drop.js`,
`hive-warrens.js`, `spire-crown.js`, `bastion-relay.js`, `crimson-womb.js`,
`rust-harbor.js`, `ember-foundry.js`, `skyhook-anchor.js`, `iron-vault.js`).
No art, engine, music, or config changes; no new files, so no
`runtime-assets.cjs` change. Tests: `tests/contra-levels.test.cjs` (width
table renamed to full stage length), `tests/game.test.cjs` (nine wave pins,
four ordered checkpoints for 8-16 with 8 newly covered, L8/L16 pod and
rescue counts). The checkpoint count grew 3->4 so death cost per section
stays constant at the new length.

## Verification

- `npm test`: 190 pass / 8 fail, identical to the pre-change baseline. The
  8 failures are pre-existing and unrelated to level data (music parser
  config, dev-server vendor 404, Cloudflare build, Jev key tests, play-bot
  pilot tests). Every level, pacing, polish, and mid-arc test passes.
- Reachability graph, crown pads, on-deck homes, checkpoint placement and
  clearances, wave approach distances, pod/rescue placement, accent decks,
  and the branch fork all hold on the new geometry.
- Prettier check passes on all touched files; repo eslint 8 is not
  installed here (only a global eslint 6, which cannot read the repo
  config), so the lint gate could not run - edits are data literals in the
  existing style.
- Post-pass density/pacing table re-measured with the same probe: lengths,
  densities, wave order, and pre-crown pressure all as designed.

## Not verified

- No in-game playthrough: this environment has no `node_modules`, no
  `vendor/` phaser build, no Playwright browsers, and no chromium, so the
  game cannot start or render here. Start-to-crown runs on 8-16, pause and
  death retry on the new acts, co-op, touch, and parallax seams all need a
  real browser. Play URLs after `npm start`:
  `http://127.0.0.1:3000/?level=8` through `?level=16`.
- Human feel of the new acts (the same open question as the doubling pass).
