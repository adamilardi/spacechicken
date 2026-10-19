---
name: space-chicken-audio-creator
description: Compose and review Space Chicken music and sound: level tracks, effects, and the audio pipeline. Use for a new track, a new effect, or a mix pass. All sound is synthesized in code; do not add audio files.
---

# Audio creator

All sound is synthesized in code: no audio files. Read [the authoring reference](../level-creator/references/spacechicken.md), then `AudioManager.js`, `audio/voice.js` (the pipeline), `audio/music.js` (the director), and `audio/sfx.js` (the synth) before editing. Do not deploy.

## Create

A level track is a `music/<id>.js` module exporting `buildTrack` with tone helpers from `music/score.js`, registered in `music/index.js` `MUSIC_DEFINITIONS` so the level does not fall through to level 1's track. Register the new file in `config/runtime-assets.cjs` `rootFiles` or the local server 404s it and the Cloudflare build omits it.

Match the level's mood and arc: opener-readable, pressure in the middle, rest before the crown. Effects go through the synth: one call site per game event (jump, bonk, shot, hit, crown), short, and distinct from the music's lead voice. Keep the WebAudio unlock path intact: music starts only after the unlock handler runs.

## Review

Listen on a real play: track present on its level (no fallthrough), effects fire once per event, nothing clips or masks the jump and bonk tells. Check mute toggles, pause (music and effects freeze or duck as designed), scene restart (no orphaned sources), and teardown. Flag orphaned tracked sources and effects fired from wall-clock timers.

Write findings as the level id, the event, and the smallest mix or code change.

## Verify

Run `npm test`. Play `http://127.0.0.1:3000/?level=N` with sound on: confirm the track, each touched effect, mute, pause, and a death retry with no stuck notes.
