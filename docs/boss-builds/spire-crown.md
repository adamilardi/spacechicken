# Crown encounter: Spire Crown (Level 10)

## Rule

The crown hangs past a gap only the rising lift crosses: board the
`liftPlatform` at deck height, ride its 2200ms tween to the crown deck,
and step off while the wave-4 warden converges. Missing the ride means
waiting out one full cycle under fire.

- Tell: lift position and the warden drop-in.
- Safe response: clear the steps first, board at the low end, ride to the
  top, shoot the guard on the way up.
- The crown stays reachable every lift cycle, including co-op. Uses the
  shipped lift platform and boarder wave only — no new code.

## Paint and texture keys

No new actor paint. Wardens wear the new `spireWarden` skin with its cyan
lens; decks use the new `spireAlloy` key.

## Files

`levels/spire-crown.js` (lift tween + wave-4 guard + crown placement).

## Play

`http://127.0.0.1:3000/?level=10` — climb the spire, ride the lift, take
the crown. Bot playthrough pending an idle box. Pause freezes the lift
tween with the scene (not separately run).
