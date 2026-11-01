# Animation handoff — enemy-shrike-a (survivor)

- Id: `enemy-shrike-a`; paint: `enemy-shrike-a/paint.js`; canvas 48x48,
  display 48x48 (1x); pivot top-left (24, 44).
- Silhouette: swept-wing falcon-drone facing right; rust body `#b33a2a`,
  cream belly `#f2d8a8`, dark wings `#7d2a1d` / `#5e1f16`, amber hooked beak
  `#ffb15a` pointing down-forward, gold spring-cap bonk read on top.
  Later frames keep: wing sweep, beak hook, cap, eye.
- Moving parts: none inside the sprite. Method: **tween**. The whole sprite
  slides (hover patrol x from the hover center out to homeX + sweep.range
  and back, diagonal swoop, recover climb) and bobs; the telegraph is
  whole-sprite red blink (not a pose change). Facing flips with `setFlipX`
  on patrol direction and swoop sign — no second paint.
- Contact point: whole body lethal on side contact, bonkable from above
  (gold cap + floating `bonkMarker`). Hitbox stays on the root sprite:
  34x30 centered. Hidden structure: unknown.
- Timing (level-overridable): hoverMs 1600, telegraphMs 450 (3 blinks),
  swoopMs 520, recoverMs 900, sweep { range 70, duration 1800 }.
