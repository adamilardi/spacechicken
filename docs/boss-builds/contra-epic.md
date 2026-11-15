# Iron Front — epic boss pass

User direction: “Make the bosses MORE EPIC”. Continue the existing level-momentum pass; no deployment.

Design: retain readable route geometry and existing actor silhouettes, but give all nine campaign bosses a named second phase with a changed attack sequence. At half health, a short visible phase shift stops the boss, then a fully telegraphed opening attack breaks its temporary armor. This prevents a point-blank volley from skipping the second phase without inflating health into a long damage sponge. Wounds and phase progression survive death retries. News bosses retain their existing behavior unless they opt into phaseTwo.

Presentation: colored energy/spark bursts on arrival and transformation, brief charge trails, a segmented boss health bar with a clear halfway marker, synthesized arrival/phase/defeat stings, and a larger defeat burst. No camera takeover, forced zoom, or full-screen flashes; the player retains movement and can see landing zones. All effects follow the scene clock, existing particle lifecycle and pause behavior. Silhouette and collision scale stay unchanged.

Attack tells: red for a ground rush (jump); cyan for a vault (move under); gold for summons (shoot the adds). Every second phase gets a full tell before contact pressure resumes. Existing summon grace stays intact and the living-add cap is enforced when spawning a batch.

| Boss          | Second-phase idea                                                           |
| ------------- | --------------------------------------------------------------------------- |
| Broodmother   | Brood Fury: charges backed by one skitterling                               |
| Hive Mother   | Hive Eruption: short vaults with a two-gnawer brood                         |
| Warden Prime  | Skybreaker: alternating rush and vault                                      |
| Gatekeeper    | Siege Protocol: two rushes then a vault, guarded by wardens                 |
| Crimson Heart | Pulse Storm: two pulse leaps then a ground rush                             |
| Scrapjaw      | Breaker Rage: ground rushes punctuated by a vault through the crusher arena |
| Embermaw      | Furnace Overload: vaults over the flame lane, with capped gnawer pressure   |
| Highroost     | Storm Crown: longer vaults between summon beats                             |
| Tumbler       | Vault Breach: a short vault then two rushes across the locked arena         |

These are explicit per-boss attack sequences within the shared state machine, not claims of nine new arena mechanisms. Existing crown decks and their separate hazards keep their level identity. Tests must cover phase entry once, temporary armor ending on the first real attack, reset behavior, sequence advancement, unchanged legacy bosses, paused effects, and capped summons. Play checks must include both phases and crown collection; automated quality approval remains separate from completion.

## Verified implementation

- All nine isolated arena approaches defeated their boss, reached phase two, and observed an actual second-phase attack. All nine full routes then collected their crowns. These are fixed-step Normal runs, seed 42; they do not certify Hard, every route, or co-op.
- Gameplay screenshots under `.bot-runs/epic-bosses/` show transformations, second-phase leaps/rushes and defeats. They are arena play captures after a debug approach placement, not natural full-route screenshots.
- Pause checks at 1280×720, 800×450, 640×360 and 390×844 froze boss position, phase and scene time. Desktop/phone HUD bounds are in [epic-ui.json](epic-ui.json). The phone check is staged to inspect layout, not a combat clear.
- Presentation uses existing `particleSoft`/`particleSpark` textures plus short scene-owned graphics rings. Collision scale is unchanged. Rings and delayed echoes respect teardown; audio goes through the existing synth and suspend/resume path. Human listening quality remains unverified.

| Level | Arena seconds / deaths | Full-route seconds / deaths | Second-phase attacks seen in arena |
| ----- | ---------------------- | --------------------------- | ---------------------------------- |
| 8     | 14.8s / 0              | 113s / 3                    | charge, summon                     |
| 9     | 7.8s / 0               | 125.5s / 4                  | leap                               |
| 10    | 9.5s / 0               | 102.5s / 0                  | charge, leap                       |
| 11    | 9.3s / 0               | 138.4s / 2                  | charge, summon                     |
| 12    | 14.3s / 2              | 140s / 5                    | leap                               |
| 13    | 22.3s / 2              | 118.3s / 0                  | charge, leap                       |
| 14    | 12.3s / 1              | 147.5s / 3                  | leap, summon                       |
| 15    | 15.3s / 0              | 112.8s / 1                  | leap, summon                       |
| 16    | 16.5s / 4              | 114.7s / 7                  | leap                               |

Sources: [arena telemetry](epic-arenas.json), [route telemetry](epic-routes.json). The three-attack sequences are authored and unit-tested, but a fast kill or retry can end a fight before its entire sequence plays; the table reports what actually happened.

## Critic boundary

All nine post-change boss panels ran against the current authored phase-two data. They remain ITERATE, primarily for shared attack-family repetition; completion is not a quality pass. Their reports are `docs/boss-reviews/level-8.json` through `level-16.json`. Full rendered level-critic reports from the earlier momentum pass do not certify this later shared boss change. Current full-route completion is established by the fixed-step runs above. No deployment was made.

Final checks: 561 tests pass; eslint reports zero warnings. Generated telemetry reports were normalized with Prettier. The final repository check covers tests, lint, and formatting. No new game assets or runtime imports were added, so the existing asset registry remains sufficient.
