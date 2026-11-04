# Animation handoff: enemy-defrost-a (Defroster drone)

- Id: enemy-defrost-a. Source: assets/news-freezer-breach/defroster-drone.png (160x130 RGBA, magenta-keyed).
- Canvas size 160x130, display size ~72x58 (scale 0.45 in level data), pivot top-left (80, 65) = sprite center.
- Silhouette: squat steel fan-box, round grille face on the right, red heater-coil strip along the base, small top fins. Colors: frost steel #7fa8c9, coil red #ff3b30. Parts later frames must keep: grille face, coil strip, box outline.
- Moving parts: whole-sprite patrol slide + vertical bob (tween); coil strip is a static glow (whole-sprite flash is not a motion state). Facing flips via setFlipX in patrol code; no left-facing paint.
- Method: tween (enemies/drone.js patrol + bob). No pose frames — the shipped drone tween path, same as prior news drone integrations.
- States: patrol (x/y tween, loops), bob (y sine, loops), defeat (handled by hazard contact / pilot capture, no custom frames).
