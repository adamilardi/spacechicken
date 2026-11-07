# Controller input sweep — 2026-11-06

Scope: shared keyboard, standard gamepad, touch, co-op, pause, and menu input. This is an input regression review, not a level-design or full-campaign completion gate. The QA reviewer and game-programmer skills guided coverage; level content and weapon behavior were not retuned.

Result: all 533 unit tests and all 17 Chromium scenarios passed. ESLint, Prettier, and the Cloudflare production build passed. No browser page errors occurred in the final input matrix.

## Fixes

- Consume simultaneous keyboard press/release edges together, preventing delayed menu moves and jump cuts on subsequent frames.
- Route each co-op player's movement, jump, aim, fire, and weapon switch to the assigned input device. Player 2's arrow and numpad jumps now use consumed-once input correctly.
- Recognize physical Numpad 0/1/2 with NumLock on or off. Prevent NumLock-off weapon switching from also navigating or aiming down.
- Keep Player 2's jump count after takeoff, support fine jump release, and preserve facing when movement stops.
- Assign controllers independently of browser slot numbers. Preserve the remaining player's assignment on disconnect, clear stale jump edges, and suppress held action buttons on reconnect.
- Disable Phaser's duplicate gamepad plugin: its shutdown loop crashes on sparse browser slots during a level handoff. The game's own controller continues polling normally.
- Accept menu/pause input from either controller. Reserve Y's leaderboard shortcut for title/finish screens so gameplay weapon switching cannot swallow a simultaneous jump.
- Guard gamepad API access and rumble rejection so keyboard/touch continue working when the browser denies controller access.
- Clear touch fire/aim state, pointer ownership, and jump buffers on pause/resume. Release the UI buttons' own pointer latches as well.
- Ignore hidden gameplay touch controls and reserve weapon/menu button taps. Preserve the title UI's press-time hit regions when buttons hide during a tap.
- Keep Back from starting a title run. Add highlighted route selection with arrows/D-pad and A/Enter, alongside the existing touch and number-key choices.
- Remove physical-key listeners during scene cleanup.

## Automated coverage

Run `npm run check`, `npm run build:cloudflare`, and `npm run verify:inputs`.

The browser verifier starts an ephemeral local server, uses the repository's Chromium resolver, and writes screenshots and `report.json` to `/tmp/space-chicken-inputs` (override with `INPUT_REPORT_DIR`). It uses browser keyboard events, CDP touch events, and simulated standard gamepads through `navigator.getGamepads`.

| Coverage         | Cases                                                                                                                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keyboard         | Levels 1, 2, and 8 in Normal and Hard; movement/release, jump, combat controls where enabled, P/Escape/button pause, frozen position, and jumping after respawn                                                |
| Co-op            | Keys 2/3/4 in both difficulties; separate player movement/jump/fire/switch, sparse controller slots, second-controller pause/resume, first-controller disconnect                                               |
| Solo gamepad     | Levels 1 and 8; title leaderboard/back/start, movement/jump/fire, and movement release on disconnect                                                                                                           |
| Route selection  | Level 12 offer to Level 16, selected and confirmed with a gamepad                                                                                                                                              |
| Touch            | 844×390 and 390×844; simultaneous move/jump/fire, fire and aim release across pause/resume                                                                                                                     |
| Unit regressions | Consumed key edges, NumLock variants, jump counts and release, device isolation, deadzones, disconnect/reconnect, denied APIs, rejected rumble, touch hit testing, pause cleanup, title Back, branch selection |

Debug setup positions the player beyond a fall boundary to exercise actual death/respawn, and opens the route-choice UI directly. These checks do not claim the levels were completed by the test pilot. All tested actions after setup use their input path.

## Limits

Gamepads and phone viewports are simulated. Physical controller mappings, hardware rumble, Bluetooth reconnect timing, mobile Safari, and human ergonomics still need real-device play. This review does not claim a full level critic pass or physical-device certification.
