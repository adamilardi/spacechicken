# Brief: contra diversity pass (levels 8-15)

The contra arc reads as one repeated deck texture per level with copy-paste
skeletons. This pass gives each level a second ACCENT deck texture for its
upper shelves and set pieces, plus decor props where levels have none, in the
shipped flat canvas style. Side view, gameplay size, smoothing off. No raster
files, no labels in the paint.

Research notes (Contra NES walkthroughs, GameFAQs): stages alternate biomes
(jungle, base, waterfall, snowfield, energy zone, hangar, alien lair) and mix
set pieces inside each stage — bridges over gaps, vertical waterfall climbs,
trenches/roadways you drop into, stairs and ledges, upper/lower route splits,
turrets on both sides, multi-part gates. Our engine's translation: accent
textures mark the second route, and each level gains one signature solid set
piece (bridge, shaft, stair, trench, tower) plus framing props.

## Accents (all SOLID 96x24 decks)

- L8 colonyGirder: gunmetal girder with amber hazard chevrons (vs the pale
  colonyDeck). Set piece: girder bridge.
- L9 hiveFang: bone fang edge over dark chitin (vs teal hiveChitin). Set
  piece: fang shaft climb.
- L10 spireGlass: pale glass panes in a gold frame (vs spireAlloy). Set
  piece: glass stair.
- L11 bastionGrate: dark grate with red signal lights (vs pale bastionDeck).
  Set piece: trench dip.
- L12 wombBone: bone edge with red marrow seams (vs dark wombFlesh). Set
  piece: marrow bridge.
- L13 harborPlank: weathered planks with rope lashings (vs rust harborDeck).
  Set piece: container stair.
- L14 foundryChain: dark chain plates with green signals (vs molten
  foundryDeck). Set piece: vent tower.
- L15 skyhookPanel: dark service panel with red beacons (vs pale
  skyhookDeck). Set piece: pylon stair.

## Props (all DECOR, no collision)

- L9 hiveSac 40x48: hanging brood sac on a stalk.
- L10 spireFin 24x56: gold antenna fin.
- L12 wombEye 36x36: watching eye on a stalk.

Each candidate ships its accent deck, its prop if any, and a 1x-on-black
preview with a seam strip. Backgrounds are unchanged.
