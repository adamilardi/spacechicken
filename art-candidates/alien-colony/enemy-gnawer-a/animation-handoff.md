# Animation handoff: enemy-gnawer-a

- Paint: `enemy-gnawer-a/paint.js`, canvas 40x48, display 40x48, pivot top-left (20, 46).
- Silhouette: ovoid body, vertical toothy maw, cyan lens at (16, 14). Colors `#3d1c4e`/`#12081e`, teeth `#e9d4ff`.
- Moving parts: legs (treadmill implied), whole-sprite hop arcs from boarder steering.
- Method: tween (existing boarder motion). No new poses. Lens ring is the bolt target.
- Hidden structure unknown. Corners transparent (alpha pass).
