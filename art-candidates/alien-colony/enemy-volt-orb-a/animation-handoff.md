# Animation handoff: enemy-volt-orb-a

- Paint: `enemy-volt-orb-a/paint.js`, canvas 48x48, display 48x48, pivot top-left (24, 44).
- Silhouette: dark orb, gold arc strokes, pale core, side fins. Colors `#1c2430`/`#ffe14a`/`#d9fbff`.
- Moving parts: whole sprite only (bob/patrol tween, spin optional).
- Method: tween (existing drone patrol/bob/spin config). No new poses.
- Hidden structure unknown. Corners transparent (alpha pass).
