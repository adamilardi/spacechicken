# Alien colony enemies — art brief

SixContra-stage actors for the colony trilogy, painted in the shipped canvas
style (small canvas, flat fills, smoothing off, side view facing right).
Two per level so each stage fields a distinct pair:

- Colony Drop: Skitterling (shootable runner), Spore Floater (lethal drone)
- Hive Warrens: Hive Brute (bonk spring), Gnawer (shootable runner)
- Spire Crown: Spire Warden (shootable elite), Volt Orb (lethal drone)

Shootable actors wear the cyan chest lens (boarder convention). Bonk actors
wear the gold spring-cap (`paintBonkPad`). Lethal drone-role actors stay
unmarked. Canvases start transparent; corners are untouched (alpha pass).
Animation is tweens (patrol/bob) plus the generic bonk squash — see each
`animation-handoff.md`. Nothing here is wired into the game yet.
