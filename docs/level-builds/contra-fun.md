# Contra fun pass — 2026-10-18

Request: make the contra levels more fun and impress the contra critic
(the Contra veteran lens in `contra-proreview.md`: sightlines, route
choice, escalation, checkpoint honesty, finale fairness). Data-only
tuning across levels 8–16; no art, engine, weapon, numbering, or finale
layout changes. No deployment.

## Briefs (one idea per level)

- L8 Colony Drop — "face them and fire." Teach on the flat beachhead,
  press at the girder bridge, rest on the 10350/10970 decks.
- L9 Hive Warrens — "stomp and climb." Beetle opener teaches; crushers,
  drips, and the fang shaft press; crown deck rests after the last
  checkpoint.
- L10 Spire Crown — "cross on the dark, ride the lift." Beam pairs
  teach mid-level; wardens on the steps press; the lift ride is the
  finale, with a sentry skip-line for the bold.
- L11 Bastion Relay — "breach the gatehouse." Red gates teach; mid
  gates, crushers, and the trench press; a sentry gate offers stomp
  (skip the slams) or jump (face the gatehouse).
- L12 Crimson Womb — "the heart defends itself." Swarm teach, marrow
  bridge press, shield-plus-beam finale; the branch level earns its
  choice with the densest gate of the act.
- L13 Rust Harbor — "climb the yard." Plank stair climb with a wave-4
  pair fight; slam-plus-shield finale unchanged (already praised).
- L14 Ember Foundry — "ride the trams, read the beams." Tram gaps
  teach; the chain tower (new sentry over the rescue) presses
  vertically; beam-plus-pair finale.
- L15 Skyhook Anchor — "everything finale." Unchanged lift-plus-beam-
  plus-slam-plus-shield; new sentry skip-line trades the lift wait
  for a hot pad landing.
- L16 Iron Vault — "short and dense." Pay-and-threaten grate shelf;
  beam-plus-slam-plus-pair shield finale.

## Changes

Every level gains a fifth checkpoint standing before its finale (old
last checkpoints sat 4000–5000px behind the crown, so a finale death
replayed half the level):

- L8 (10200,588) · L9 (10250,420) · L10 (11350,220) · L11 (10900,500) ·
  L12 (11200,270) · L13 (11750,390) · L14 (11800,390) · L15 (11850,380) ·
  L16 (8900,450). All rest on decks, clear boarder homes by 150px+,
  dodge drone/devil lanes, and stand before beam/crusher gates.
  Checkpoints also sit outside the 380px initial chaser-aggro box of
  every nearby home (L8's last wave-7 runner and L13's last wave-7
  runner were pulled back to 9700 and 11350 for this), so a finale
  retry never respawns into an already-aggroed camper.

New fights (wave triggers untouched; 300px approach kept):

- L8: wave-4 becomes a bridge pair (+3800 skitterling) for the first
  SCATTER fan moment; wave-7's last runner pulls back to 9700 so the
  rest decks breathe and the finale checkpoint sits outside chaser
  aggro; wave-8 gains a pad escort beside the crown guard.
- L9: wave-7 gains a pad-steps escort (10800) ahead of the guard.
- L12: wave-7 gains a pad escort (11920) behind the finale beam.
- L13: wave-4 gains a stair partner (3900 plank) for the climb fight;
  wave-7's last runner pulls back to 11350 to keep the finale
  checkpoint outside chaser aggro.
- L14: wave-8 gains a pad escort (12270) beside the guard.
- L16: wave-7 gains a pad escort (9420) beside the crown guard.

New bonk toys (all `sentryOrb`, no new paint; each guards a reward or
opens a skip line):

- L8 shelf2 rescue guard (2800,428) — stomp launches past the bridge.
- L10 lift skip (11250,210) — stomp flies to the crown deck.
- L11 gate choice (11100,500) — stomp skips the crusher gatehouse.
- L12 bridge guard (3830,280) — stomp skips the wave-4 approach.
- L14 tower guard (3300,300) — stomp climbs past the chain tower.
- L15 lift skip (11750,330) — stomp trades the lift for a hot landing.
- L16 shelf guard (1250,420) — shelf pays (rescue) and threatens.

L9 and L13 already had rich bonk sets and were left alone.

## Files

Edited: the nine `levels/*.js` contra modules, `tests/game.test.cjs`
(wave-pin snapshots for 8/9/12/13/14/16; the checkpoint test now
asserts ≥4 ordered checkpoints instead of exactly 4),
`tests/level-polish.test.cjs` (new rule: every contra finale stands
within 2000px of the last checkpoint). No pod/rescue counts or first
guns changed.

## Verification

- Full suite: 216/216 pass (was 215; +1 polish rule). Zero-warning
  lint and prettier clean on touched files.
- Browser: every level loads with no page errors; teleported
  spot-checks of each new fight, sentry, and finale with screenshots
  in `/tmp/lb-fun/` (bridge hold, shelf BONK, wave-8 pairs, tower,
  stair, skips, vault finale). Two teleports landed directly on new
  sentries and died cleanly, proving side contact is lethal and retry
  restores the scene.
- Play URLs: `http://127.0.0.1:3000/?level=8` through `?level=16`.
- Not verified: full start-to-crown combat clears of each tuned
  level; whether the new pairs/escorts feel pressing vs. grinding
  still needs human play. No claim of measured enjoyment improvement
  is made beyond the critic's checklist.
