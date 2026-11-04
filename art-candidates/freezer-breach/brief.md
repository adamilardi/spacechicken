# Art brief: freezer-breach (Level 27 — Cold Chain Down)

Story: BBC Nov 3 2026 — hackers drove supermarket freezer temps to 50C across 10 European countries; food discarded, shelves emptied.

## Place directions (three divergent, two killed)

A. `plate-a-aisle-vista.jpg` — one-point-perspective freezer corridor with a thermometer wall display. KILLED: perspective corridor will not tile under a side-view tileSprite and fights the side-view play; the thermometer wall is kept as a prop idea.
B. `plate-b-vault-fan.jpg` — enclosed cold vault with a giant coolant-fan landmark, ribbed walls, frost pipes. KILLED: strong landmark but no aisle cases — the signature stair element is absent, and the enclosure reads as foundry/bastion without the retail subject.
C. `plate-c-gantry-cases.jpg` — SURVIVOR. Side-view glass-door freezer case row over chest freezers, gantry truss diagonals above, control-room booth landmark at one end, skylight band. Matches the topology beat for beat (aisle stairs -> gantry traverse -> control-room crown) and tiles horizontally via the repeating case row.

Survivor composition devices: sky = skylight band glow (asymmetric); far = cold cosmic dark; mid = gantry truss diagonals + control-booth landmark; near = glass-door case row + chest row; rhythm = even case loop. Two differences vs every shipped type: (1) retail refrigeration subject (glass-door cases, chest freezers) exists nowhere in the roster; (2) gantry diagonals over a case row with a control-booth landmark.

Platforms: no new deck paint — aisle stairs use `stationPanel`, the gantry uses `bastionGrate`, the roof vault uses `vaultDeck` (three shipped reads; the freezer-case prop beside each stair carries the signature read).

## Enemy silhouettes (three divergent, two killed)

a. `defroster-drone.png` (final in assets/news-freezer-breach/) — SURVIVOR. Squat wall-fan unit, round grille face, red heater-coil strip along the base. Chunky asymmetric silhouette; coils read at 52px.
b. `enemy-b-coil-orb.jpg` — round ducted-fan pod with coil ring and eye. KILLED: round silhouette risks reading as a generic orb droid next to shipped sentry orbs.
c. `enemy-c-vent-wedge.png` — triangular vent wedge with coil fins and hover rings. KILLED: busy at 1x; hover rings add noise that keys poorly at gameplay size.

## Props (generated-prop path, all final in assets/news-freezer-breach/)

- `thermo-prop.png` — wall thermometer panel, needle pinned in the red, warning lights (128x181).
- `freezer-case-prop.png` — tall glass-door freezer cabinet (160x244).
- `shelf-prop.png` — empty shelves with price tags (192x222).
- `crate-prop.png` — spoiled-food dumpster with crates and hazard bin (256x150).

All cutouts magenta-keyed via scripts/key-enemy.mjs, trimmed, downscaled to gameplay resolution.
