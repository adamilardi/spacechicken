# Animation handoff: enemy-skitterling-a

- Paint: `enemy-skitterling-a/paint.js`, canvas 40x48, display 40x48, pivot top-left (20, 44).
- Silhouette: low magenta carapace ellipse, 6 leg strokes, 4 dorsal spikes, right jaw wedge. Colors `#5e1440`/`#d63c8c`/`#ff9ac2`, cyan lens ring at (20, 27).
- Moving parts: legs (treadmill implied by boarder steering; no jointed frames needed), whole-sprite hop arcs from boarder steering.
- Method: tween (existing boarder patrol/steer motion). No new poses. Muzzle/contact: lens ring is the bolt target, not a firing point.
- Hidden structure unknown. Corners transparent (alpha pass).
