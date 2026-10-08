# Brief: arcade systems (POW rescue + weapon pods)

Two Metal-Slug/Contra pickup systems shared by the contra arc, in the shipped
flat canvas style. Gameplay size, smoothing off. No raster files.

## POW rescue cage

A caged expedition crew member sits on side shelves; touching the cage frees
them for a −2s run-time bonus. Two states:

- `rescueCage` 32x48: iron bars over a dark frame with the crew chicken
  (white body, orange beak) visible inside and a lock plate.
- `rescueCageOpen` 32x48: same frame with the door swung open and the cage
  empty. Swapped in on rescue; the freed crew needs no actor.

## Weapon pod

A floating gun pod grants 30s of a heavy gun on touch. Two layered sprites
so one pod serves all nine guns:

- `gunPod` 28x28: dark round shell with rivets and a core window.
- `gunPodCore` 16x16: white glow core, tinted per gun at runtime.

Each candidate ships a 1x-on-black preview. No animation: the cage swaps
state, the pod hides on collect.
