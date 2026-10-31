# Animation handoff: enemy-bear-raider-b

- Id: enemy-bear-raider-b; source: enemy/enemy-bear-raider-b.png (raw 1920x1280,
  production cutout assets/news-fear-spike/bear-raider.png 1020x1032 RGBA).
- Display size: ~52px wide (scale 0.05). Pivot: sprite center; body is the orb.
- Silhouette to keep: bear orb, spring bonk pad on top, red candlestick spike
  ring, cyan eye. Pad must stay on top in every state (bonk affordance).
- Moving parts: none drawn — all motion is whole-sprite tweens. Telegraph is a
  red tint flash (whole-sprite flashing, not a pose).
- Method: tween. States: hover-bob (loop, y +-6px, 1200ms sine), telegraph
  (300ms red flash, one-shot), dive (420ms ease-in down to trigger depth,
  gameplay motion on the body), recover (900ms ease-out back to hover),
  bonk-squash (squashBonkTarget, stun pause, tweens resume after).
- Hit frame: dive active window = the whole dive tween; side contact during any
  state is lethal, top contact bonks per resolveHazardContact.
- Hidden structure: unknown (generated raster).
