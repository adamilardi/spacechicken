# Bot completion goal: baseline and next work

Goal: the playtest bot beats every shipped level with a decent finish time. This goal is still active.

## Acceptance criteria

- Every ID in `LEVEL_IDS` must be attempted, including both campaign branches and all news levels.
- Each run must collect the crown or reach the post-crown route choice through pilot inputs.
- Initial finish-time target: at most 120 simulated seconds per level, including deaths and respawns. Do not relax the target to hide slow runs.
- Verify the improved shared pilot on multiple fixed seeds; retain failed attempts and compare rendered/realtime behavior before claiming completion.

## Current evidence

The original speedrun baseline (base seed 1, incremented per level) cleared 18/26 within 180 simulated seconds. Eight timed out. Its artifacts are `/tmp/spacechicken-all-level-baseline/` and `/tmp/spacechicken-all-level-baseline.log`.

The expanded playtester now discovers every shipped level, requires completion, rejects slow finishes, and has an accelerated mode. The first pilot improvement aligns an airborne descent with an open crown instead of steering toward a nearby landing deck. After adding a physics-timed bounce climb around overhead shelves, seed 42 cleared 17/26 before combat improvements and now clears 22/26 after combat, crusher, beam, and final-alignment improvements within the fixed 120-second target; Level 4 improved from a timeout to 37.25 seconds with one death. The original seed-42 report is preserved at `/tmp/spacechicken-playtest-before-tuning.json`.

Run: `FAST=1 SCENARIO=levels PLAYTEST_OUT=/tmp/spacechicken-playtest-baseline node scripts/playtest-bot.mjs`. Accelerated level scenarios start their own server; realtime/chaos scenarios still use `SPACE_CHICKEN_URL`.

The report and per-level traces (sampled every ten simulated seconds, plus a full final snapshot) are in `/tmp/spacechicken-playtest-baseline/`.

| Level | Clear | Simulated seconds | Deaths |
| ----- | ----- | ----------------- | ------ |
| 1     | yes   | 11.3              | 0      |
| 2     | yes   | 28.8              | 1      |
| 3     | yes   | 17.7              | 0      |
| 4     | yes   | 100.7             | 5      |
| 5     | yes   | 37.2              | 3      |
| 6     | yes   | 109.2             | 1      |
| 7     | yes   | 25.4              | 0      |
| 8     | yes   | 100.8             | 1      |
| 9     | no    | 120.0             | 4      |
| 10    | yes   | 107.0             | 1      |
| 11    | yes   | 112.3             | 1      |
| 12    | no    | 120.0             | 3      |
| 13    | no    | 120.0             | 2      |
| 14    | no    | 120.0             | 2      |
| 15    | yes   | 105.5             | 0      |
| 16    | yes   | 97.5              | 3      |
| 17    | yes   | 46.9              | 1      |
| 18    | yes   | 80.6              | 8      |
| 19    | yes   | 44.0              | 0      |
| 20    | yes   | 45.9              | 1      |
| 21    | yes   | 76.7              | 4      |
| 22    | yes   | 35.4              | 2      |
| 23    | yes   | 41.3              | 2      |
| 24    | yes   | 63.4              | 1      |
| 25    | yes   | 65.6              | 2      |
| 27    | yes   | 40.8              | 0      |

## Next work

Improve `scripts/pilot-brain.mjs` using the recorded failures. Prioritize repeated early deaths (5, 11, 12), crown approach (4), and late combat/navigation stalls (8, 9, 10, 13, 14, 16). Level 3 also times out under seed 42. Seed-dependent failures matter: level 18 clears under seed 42 but timed out in the first baseline.

Inspect dense traces before changing heuristics. Keep the actual game rules and authored levels intact; fix the pilot rather than weakening the game or fabricating completion.

## Dense diagnostic findings

`/tmp/spacechicken-pilot-diagnose.mjs` instruments the existing pilot's decision branches and records half-second samples plus snapshots at deaths. Run it with level IDs as arguments; it writes `/tmp/pilot-diagnose-<id>.json`.

- Level 4 repeatedly diverted sideways from above the crown to a landing deck. Direct descent now clears, with boss avoidance taking priority. Regression tests cover the alignment and stuck-recovery interaction.
- Level 5 needed both committed spring targeting for a high shelf and a route around the shelf edge after the bounce. The retained fix clears seed 42 in 37.2 seconds with three deaths. A broad commitment rule regressed combat routes; commitment is now limited to a spring underneath a shelf over 300px above its head. Seed 7 still fails (33 deaths), so the bounce route remains timing-sensitive and is not complete.
- Level 9 repeatedly dies near x=7800 after reaching the checkpoint around x=6500. Dense snapshots are available for the hazard and landing analysis.

The latest full roster still fails levels 3, 8, 9, 10, 11, 12, 13, 14, and 16 on seed 42; Level 5 also fails seed 7. Completion is not claimed.

## Latest verification

- Seed 42 full roster: 17/26 clears; no previously clearing level lost completion in the final retained variant.
- All 539 unit tests, lint, and formatting pass.
- A second-seed probe (`node /tmp/spacechicken-pilot-diagnose.mjs 5 6 --seed=7`) clears Level 6 but fails Level 5. Keep this failure visible; a single-seed gain does not satisfy the goal.
- Dense decision traces have also been collected for levels 3, 10, 11, 12, 13, 14, and 16. The temporary diagnostic script accepts `--seed=N`; per-seed artifacts use `/tmp/pilot-diagnose-<id>-seed<N>.json`.
- Two dust-devil jump experiments were removed after they worsened earlier encounters; grounded takeoff behavior is unchanged.

## Combat input improvements

The pilot can now pulse the existing weapon-switch input, select an unlocked spread weapon, and aim up/down across a tier gap. It fires during approaches instead of waiting for a narrow horizontal duel lane. The debug input passes through the same `updateWeaponSwitch` and firing paths as player input; production ignores injected bot controls. No weapon stats, unlocks, enemy health, or level rules changed.

The final seed-42 roster clears 19/26. Levels 10 and 11 now finish in 107.0s and 90.0s; Level 14 finishes in 99.5s without deaths. Failures are levels 3, 8, 9, 12, 13, 15, and 16. Level 15 is a regression compared with the bounce-only pilot and must be fixed before completion. Earlier reports are preserved at `/tmp/spacechicken-playtest-bounce-only.json` and `/tmp/spacechicken-playtest-weapon-only.json`.

The denser combat traces show Level 9 defeating its boss and approaching the open crown just before the deadline; Level 12 reaches the boss with one hit remaining; Level 13 reaches the finale late. Broadening the crown approach did not add clears and was removed. Other seed-dependent failures, including Level 5 on seed 7, remain unresolved.

All 541 tests, lint, formatting, and the production build pass. Browser checks of ordinary player input pass on levels 1 and 8 (`node scripts/verify-inputs.mjs solo`). This is still incomplete against the full goal.

## Crusher and beam planning improvements

The latest full seed-42 roster clears 21/26 within two minutes. Level 16 clears in 98.7s after the pilot walks under open crushers instead of jumping into them. A tighter Hail preference restores Level 15 (107.1s, zero deaths). The earlier 20/26 report before beam planning is preserved at `/tmp/spacechicken-playtest-hail-crusher.json`.

Level 3 clears in 17.72s with zero deaths. The pilot plans its remaining air jump over a wide beam only when the projected crossing clears the beam and a landing exists beyond it. This also clears on seed 7 and with rendering enabled on seed 42. Existing tests still enforce retreat when no landing exists beyond a dangerous beam. Level 4 still clears but slowed to 100.7s with five deaths after the beam change; retain that regression in future comparisons.

The remaining seed-42 failures are 8, 9, 12, 13, and 14. A second-seed probe clears Level 15 but still fails Level 16. Level 5's seed-7 failure also remains open. All 544 tests, lint, and formatting pass. Completion is not claimed.

## Shelf runway and rising crown alignment

The current seed-42 roster clears 22/26. Level 8 now finishes in 100.8s with one death; it also clears seed 7. Open-crown alignment now applies during the rising approach as well as the final fall, preventing the escape logic from abandoning the crown after its guards die. The prior 21/26 report is preserved at `/tmp/spacechicken-playtest-beam21.json`.

Level 13's grounded stall at x≈9067 came from a spring asking for a runway where no safe ground existed behind the player. The pilot now takes off vertically when the head is far enough away to avoid rising into its body, then approaches from above. The existing close-body hold remains intact. This advances Level 13 to its boss but still misses the deadline; seed 7 also fails it.

The remaining seed-42 failures are 9, 12, 13, and 14. Level 9 defeats the boss late and almost reaches the open crown; Level 12 repeatedly loses the final approach with the boss almost defeated; Level 13 reaches its higher boss deck late; Level 14 loses time and lives around its later gaps. Adaptive spread selection and altered boss standoff did not add clears and were removed rather than retained as speculative changes.

All 546 tests, lint, and formatting pass. The goal remains active, including the previously recorded second-seed failures on levels 5 and 16.
