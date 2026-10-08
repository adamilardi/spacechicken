import { addChord, addDrumBar, tone } from './score.js';

export function buildTrack() {
    const bpm = 140;
    const beat = 60 / bpm;
    const bar = beat * 4;
    const pattern = [];
    const roots = [36, 36, 34, 39];
    const chords = [
        [60, 63, 67, 72],
        [58, 62, 65, 70],
        [56, 60, 63, 68],
        [62, 65, 69, 72],
    ];
    const melody = [72, 72, 75, 72, 70, 72, 67, 70, 72, 75, 79, 75, 72, 70, 67, 65];

    roots.forEach((root, barIndex) => {
        const start = barIndex * bar;
        [0, 2].forEach((beatOffset) => {
            addChord(pattern, start + beatOffset * beat, chords[barIndex], beat * 0.46, {
                type: 'square',
                volume: 0.02,
                attackTime: 0.01,
                decayTime: 0.08,
                sustain: 0.45,
                releaseTime: 0.14,
                filter: { type: 'lowpass', frequency: 1600, Q: 0.6 },
            });
        });
        for (let eighth = 0; eighth < 8; eighth++) {
            const lift = eighth === 2 ? 5 : 0;
            pattern.push(
                tone(start + eighth * (beat / 2), root + lift, beat * 0.36, {
                    type: 'sawtooth',
                    volume: eighth % 2 === 0 ? 0.055 : 0.04,
                    attackTime: 0.006,
                    releaseTime: 0.09,
                    filter: { type: 'lowpass', frequency: 520, Q: 1.0 },
                })
            );
        }
        addDrumBar(pattern, start, beat, {
            kickSteps: [0, 6, 8],
            snareSteps: [4, 12],
            kickVolume: 0.18,
            snareVolume: 0.08,
            hatVolume: 0.026,
            hatStep: 2,
        });
    });

    melody.forEach((note, index) => {
        pattern.push(
            tone(index * beat, note, beat * 0.52, {
                type: 'sawtooth',
                volume: index % 4 === 0 ? 0.05 : 0.038,
                attackTime: 0.008,
                releaseTime: 0.12,
                filter: { type: 'lowpass', frequency: 2400, Q: 0.7 },
                pan: index % 2 === 0 ? -0.2 : 0.2,
            })
        );
    });

    return {
        id: 'ember-foundry',
        title: 'Ember Foundry',
        bpm,
        pattern,
        loopDuration: bar * 4,
        musicVolume: 0.27,
    };
}
