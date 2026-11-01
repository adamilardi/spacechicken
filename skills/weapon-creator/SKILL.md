---
name: space-chicken-weapon-creator
description: Add or change a Space Chicken player weapon, including its painted sprite, fire path, controls, and HUD. Use for a gun the chicken fires. Enemy attacks stay in the hazard and crown-encounter skills. Do not generate images.
---

# Weapon creator

Add a player weapon to Space Chicken and prove it in play. Read [the authoring reference](../level-creator/references/spacechicken.md) and trace `setupPhaser`, `tryFirePhaser`, and `updateCombat` before editing. Do not deploy.

## Keep the phaser as the default

The space phaser is the gun that already ships. It stays the weapon a pilot fires when they never switch. A new weapon is an extra choice on levels with `PHASER: true`, not a new rank and not a gun on every level.

Switching is once per press, per chicken. Below a level that enables weapons, the control does nothing useful. Name the selected weapon in the existing HUD field. One label is enough.

Paint the gun and the shot with `paint` functions in `SpriteFactory.js`, in the same small flat style as `paintSpacePhaser` and `paintPhaserBolt`. Do not generate images. Register the texture keys next to the current ones.

## One fire path

Send the new weapon through `tryFirePhaser` or a single branch beside it. Do not add a second function that also spawns the player's shot. Per-chicken state covers co-op: Player 1 and Player 2 already track `lastPhaserAt` separately.

Register the switch on the keyboard, the gamepad, and the touch controls, and name those keys in the on-screen hint. Preserve cooldown, pool size, range, and the rule that bolts only hurt actors the overlap names. Do not raise hazard difficulty to make the weapon feel strong. Bonk enemies stay bonk enemies unless the user asks to change that.

Use the scene clock. Pause freezes cooldown and a shot already in the air. Switching away does not reset the other weapon's cooldown.

**Aim and fans are the cross-height tools.** Every gun aims the same way (`aimVector` in `GameUtils.js`, resolved per chicken in `CombatSystem.syncChickenAim`): forward by default; hold ↑/W while firing for up (diagonal while moving), ↓/S for down while airborne (grounded down still fires forward — there is no crouch), left-stick Y or touch ▲/▼ on the other schemes. A weapon's `spread` (and `ways`) in `WEAPON_DEFS` fans **perpendicular to the aim**, so a fan weapon earns its slot by what it does across tiers in each direction: name the tier gap it is meant to clip (close tier at standoff range, or a cone swept upward), the gun it replaces for that job, and its cost at point blank where the fan is still narrow. Pods that grant fan weapons belong where the fan starts paying (the standoff lane before a two-tier fight), not beside the target. A new weapon never adds its own aim keys — aiming belongs to the one fire path, not to a gun.

## Verify

Run `npm test`. In the browser, on a level with `PHASER` and on one without:

- The new control does nothing on the level that has no weapon flag.
- On Earthwatch or the level you enabled, the phaser still fires for a pilot who never switches.
- The new weapon fires from the chicken's facing, uses its painted sprite, and hits only the actors you named. Fire it in every aim direction the level offers (forward, up, diagonal up, down from the air): bolts fly the aimed way, the gun sprite points along the aim, and fan volleys rotate around the aim without changing bolt speed. For a fan weapon, also fire it across a real tier gap in a contra level: confirm the spread clips the next tier at standoff range and stays narrow (no phantom height coverage) at point blank.
- The HUD shows the name. Pause stops the cooldown.
- In co-op, each chicken switches and fires on its own.

`?debug=1` can move you to the level. It does not replace pressing the control. Record the URL and any path you did not run.
