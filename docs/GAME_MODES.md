# Space Chicken mode ladder

Status: **Approved** 2026-10-09. Implements [GB-2](GAME_BACKLOG.md); GB-1 (hard mode build) specs against these decisions.

## Modes

Two modes only. No Easy: levels 1–3 already teach gently, and double jump plus checkpoints keep Normal accessible.

| Mode   | Job                                                  | Default | Leaderboards   |
| ------ | ---------------------------------------------------- | ------- | -------------- |
| Normal | The intended experience. Fixed rules, full campaign. | Yes     | Eligible       |
| Hard   | A remix for veterans: faster, denser, same physics.  | No      | Separate bests |

## Decisions

1. **Hard remixes, never multiplies.** Faster hazard timers (shorter laser off-windows, quicker drips and crushers), faster patrols and boarders, possibly an extra boarder per wave. Never HP sponges (boarders already die in one bolt), never jump-physics changes, never removed checkpoints. Exact numbers land in the GB-1 spec.
2. **Hard runs get separate bests.** Local `spaceChickenHardBest${level}` keys plus a D1/API scope split so hard records never mix with Normal ones. The GB-1 spec details the server side.
3. **Selection lives on the title screen**, mirroring the jump-style toggle: a `DIFFICULTY` button (`Now: Normal` / `Now: Hard`), persisted to localStorage, default Normal. Keyboard shortcut `H`; gamepad `B` (the only free title-screen button); touch taps the button.
4. **Assists are not modes.** Jump style, checkpoints, and touch controls never affect eligibility and are never gated by mode.
5. **Hard is always visible.** The level banner and HUD level field carry a `HARD` marker so recordings and screenshots are unambiguous.
6. **Hard is global, not per-level.** All 16 levels playable; combines freely with co-op race (already ineligible, just harder).

## Sign-off record (2026-10-09)

- [x] Two modes, no Easy.
- [x] Separate hard bests (not ineligible).
- [x] Gamepad `B` toggles difficulty on the title screen.
- [x] `H` key toggles difficulty on the title screen (uncontested).
