# Iron Front momentum tuning — 2026-11-14

Scope: existing campaign levels 8–16, Normal authored values (Hard uses existing scaling). Preserve their topology, art, enemy count and length. The Crimson Heart also receives a pulse-leap tuning pass after its isolated boss test exposed a 1.3-second defeat.

Design: keep running, choose high ground for heavy fire, and recover near the failed encounter. Teach aimed fire in the existing openers; press it with the existing upper/lower boarder pairs. Late-wave release lines should announce nearby opponents rather than opponents several screens away. A heavy-gun pod on each final defended upper route pays for climbing and feeds the finale. A missed jump or attack still kills, but added solid-ground checkpoints cap the largest replay stretches at 2,500px. Route hazard tells and safe responses remain unchanged; the Heart’s wind-up and new response are documented in its boss report.

Evidence before editing: checkpoint gaps reached 4,000px (Spire Crown) and 3,730px (Hive Warrens). Colony Drop's wave 7 released at x=6,700 with homes through x=9,700. Iron Vault's wave 6 released at x=5,300 with homes through x=8,290. Those distant enemies receive the same announcement as the local fight. Split wide waves into nearby groups without adding enemies or changing their homes.

This is a tuning pass, not a new-level build. Existing Height & Path Maps and layouts remain the baseline. Upper rewards are optional; the low road remains the faster route, and the high road requires climbing into the existing defended shelves. No mandatory new verb is claimed. Art selection and texture keys are unchanged.

## Verification

Tests: 558 passing after the boss and critic-request changes; final lint/format verification follows report generation. Fixed-step pilot: all nine levels collected their crowns, seed 42, 0–5 deaths, zero browser errors. This is one route/seed per level, not exhaustive branch coverage. Full play critic and boss-review findings are recorded below. A crown run on one route does not validate every branch; unplayed branches remain unverified. No deployment requested.

## Tuning inventory

| Level             | Longest checkpoint gap | Reinforcement groups | Final upper-route reward |
| ----------------- | ---------------------: | -------------------: | ------------------------ |
| 8 Colony Drop     |                 1900px |                    9 | piercer at (9300, 408)   |
| 9 Hive Warrens    |                 2018px |                    8 | hail at (9190, 236)      |
| 10 Spire Crown    |                 2088px |                   10 | comet at (10040, 126)    |
| 11 Bastion Relay  |                 2320px |                    8 | tempest at (9940, 352)   |
| 12 Crimson Womb   |                 2252px |                    8 | ripper at (10270, 146)   |
| 13 Rust Harbor    |                 1950px |                    9 | comet at (11020, 232)    |
| 14 Ember Foundry  |                 1950px |                    9 | halo at (10870, 232)     |
| 15 Skyhook Anchor |                 2092px |                    9 | tempest at (10920, 232)  |
| 16 Iron Vault     |                 2180px |                    9 | halo at (8230, 292)      |

The first Colony Drop play review completed twice (9 and 7 deaths), with a boss-approach cluster on the second run. Added a final recovery point at (10970, 532), on the existing approach deck, shortening the boss runback by 770px. This reduces failure cost; it does not claim to fix the boss attack or prove the cluster unfair. The final full rerun uses this checkpoint.

## Follow-up after play evidence

- [Crimson Heart pulse leap](../boss-builds/12.md): first test of the revised fight lasted 12.9s with one death and a boss defeat, versus 1.3s and no attack in the prior test. All four movement phases were observed. Panel still ITERATE (stale); this is not a release approval.
- Critic requests now sample the input history explicitly (boundary inputs and the last input before each death), preserving full raw history in the saved run. This addresses repeated service `max_tokens_exceeded` failures; all deaths, stalls, completion, and route coverage are still sent unchanged. A regression test verifies retention and bounded request size.

Further observed fixes: Broodmother’s isolated test took 107.4s with one death; the full-level review also clustered deaths at the final approach. Widened the existing crown deck from 345.6px to 537.6px, reducing the last edge gap from about 236px to 140px and giving room to land and dodge. Boss HP and charge timing remain intact. Scrapjaw’s isolated test ended in 5.2s before a charge; shortened its opening wait from 4000ms to 600ms while preserving the 800ms telegraph and 12 HP. Both require fresh post-change reviews.

## Final boss checks

- Broodmother, wider deck: defeated in 9.6s, zero deaths, pace/telegraph/charge/recover seen. Prior isolated narrow-deck run: 107.4s and one death. This single pair is evidence of a better approach, not a general timing guarantee. Panel still ITERATE (pushover); we did not add HP solely to exceed its ten-second heuristic.
- Scrapjaw, earlier wind-up: defeated in 12.2s with one death; charge and recovery now seen. Prior run: 5.2s and no completed attack. Panel still ITERATE (stale).
- See [fixed-step results](contra-momentum-fast.json) and [original-data comparison](contra-momentum-baseline.json). The comparison serves HEAD level modules to the browser while keeping the same current shared runtime and pilot. No working files are reverted.

## Same-seed traversal comparison

Single fixed-step pilot, seed 42; the 300s cap applies separately to each level. Original levels cleared 8/9 with 41 deaths; tuned levels cleared 9/9 with 22 deaths. This does not prove every human route or mode is easier, and more combat decisions need not mean a shorter run.

| Level | Original result / deaths / simulated seconds | Tuned result / deaths / simulated seconds |
| ----- | -------------------------------------------- | ----------------------------------------- |
| 8     | crown-collected / 1 / 98.4s                  | crown-collected / 2 / 100.0s              |
| 9     | crown-collected / 4 / 112.5s                 | crown-collected / 4 / 113.9s              |
| 10    | crown-collected / 0 / 96.8s                  | crown-collected / 0 / 105.4s              |
| 11    | budget-exhausted / 17 / 300.0s               | crown-collected / 2 / 126.9s              |
| 12    | crown-collected / 6 / 150.0s                 | crown-collected / 5 / 140.0s              |
| 13    | crown-collected / 2 / 118.9s                 | crown-collected / 0 / 104.0s              |
| 14    | crown-collected / 1 / 124.3s                 | crown-collected / 3 / 131.8s              |
| 15    | crown-collected / 6 / 160.9s                 | crown-collected / 2 / 113.0s              |
| 16    | crown-collected / 4 / 99.3s                  | crown-collected / 4 / 99.3s               |

## Scope and remaining validation

All changes are local; nothing was deployed. Gameplay edits are confined to the nine Iron Front modules. Existing unrelated workspace edits were preserved, including shared rendering, Red Reach, and pilot changes. The matching game tests were updated without replacing their unrelated working-tree changes.

Coverage limits: Normal difficulty, one seed and one pilot-selected route in the fixed-step comparison. Alternate branches, Hard, co-op, touch feel, and human enjoyment remain unverified. Rendered critic outcomes differ substantially from the fixed-step runs; preserve both rather than claiming that either invalidates the other. The quality panels are still ITERATE, and the existing boss repertoire still has repetition. This is an implemented pacing/reward and selected-boss pass, not a full campaign quality approval.

## Later user direction: epic bosses

The user subsequently requested “Make the bosses MORE EPIC”. The later [epic boss pass](../boss-builds/contra-epic.md) supersedes the earlier boss tuning numbers and adds named second phases, protected opening tells, attack sequences, spectacle, synth stings, and an adaptive segmented health bar. The original-data comparison above remains evidence for the earlier momentum candidate; current completion evidence lives in `docs/boss-builds/epic-routes.json`.
