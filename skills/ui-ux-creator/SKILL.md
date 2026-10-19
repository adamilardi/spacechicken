---
name: space-chicken-ui-ux-creator
description: Build and review Space Chicken interface: HUD, overlays, and controls. Use for HUD fields, menus, and touch and gamepad input. Game rules stay in the designer and level skills.
---

# UI/UX creator

The interface reads at speed and fits every screen. Read [the authoring reference](../level-creator/references/spacechicken.md), then `UIManager.js`, `HudLayout.js`, `Overlays.js`, and the input path you touch (`InputController.js`, `GamepadController.js`, `TouchController.js`, `SplitScreen.js`) before editing. Do not deploy.

## Create

Put new HUD fields through `UIManager.createUI` with `HUD_FONT` and layout math from `HudLayout.computeLayoutMetrics` so compact, tiny, portrait, and safe-area insets all hold. Overlays own dialogs (race setup, branch offers); input and scene reach them through the manager's getters. Register every control on keyboard, gamepad, and touch, and name the keys in the on-screen hint.

One label per weapon in the existing HUD field; switching is once per press, per chicken. Below a level that enables a feature, its control does nothing useful. Use the scene clock so pause freezes cooldowns and UI timers together.

## Review

Check readability first: HUD legible over the busiest background layer, banner and instructions readable in one glance, touch targets at control size with margin clearance. Confirm the music toggle, leaderboard button, pause (Escape, P, on-screen button), the branch offer on level 12, and co-op join keys 2/3/4. Flag new text surfaces, unhinted controls, and layouts that break in compact or tiny metrics.

Report findings with the screen state, the viewport metrics, and the smallest layout or copy fix.

## Verify

Run `npm test`. Play `http://127.0.0.1:3000/?level=N` in desktop and a compact/tiny viewport: confirm HUD, overlays, pause, one input per control surface, and a co-op join when input code moved.
