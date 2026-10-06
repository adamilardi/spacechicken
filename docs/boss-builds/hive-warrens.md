# Crown encounter: Hive Warrens (Level 9)

## Rule

A vertical spore-beam (teal laser, x3550) sweeps the crown deck on a
780ms-on / 1180ms-off beat. Touching the crown means crossing the beam
lane on the dark: land on the crown deck, wait out the burn, step in on
the off-beat. Uses the shipped laser hazard only — no new code.

- Tell: beam glow and hum phase; the off-beat is the safe window.
- Safe response: hold on the deck edge, cross during the 1180ms dark.
- The crown stays reachable every cycle, including co-op (shared beam).

## Paint and texture keys

No new actor paint. Beam uses the `laserBeamVertical` texture with a teal
tint; the deck is the new `hiveChitin` key.

## Files

`levels/hive-warrens.js` (laser entry over the crown approach).

## Play

`http://127.0.0.1:3000/?level=9` — ride the tunnel route, time the final
beam, take the crown. Bot playthrough pending an idle box. Pause freezes
the beam cycle with the scene (not separately run).
