# Animation handoff — enemy-spinner-a (Wrong'un Spinner)

- Id: `enemy-spinner-a`; raster: `enemy-spinner-a-keyed.png` (RGBA, magenta keyed, 74% cutout).
- Canvas: 1920x1280. Display: 48px (ball ~840px across → scale ~0.057). Pivot (top-left origin): (925, 725), ball center.
- Keep: red leather body (#c81e1e-ish), raised white double seam, angry paired eyes, trailing swirl streaks. Seam and eyes must survive every frame.
- Moving parts: whole-sprite sine weave (code tween — the signature motion); optional seam-glow tint pre-bend (runtime effect). No joints; muzzle/contact point: ball rim (roller contact).
- Method: tween for weave + rotation wobble; no new outlines needed. Hidden structure unknown.
- Integration: single texture `spinnerBall`, scaled to 48px, origin center.
