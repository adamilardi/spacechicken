import { addChord, addDrumBar, tone } from './score.js';

export function buildTrack() {
    const bpm = 150;
    const beat = 60 / bpm;
    const bar = beat * 4;
    const pattern = [];
    const roots = [41, 39, 36, 38];
    const chords = [
        [65, 68, 72, 77],
        [63, 67, 70, 74],
        [60, 64, 67, 72],
        [62, 65, 69, 74],
    ];
    const melody = [77, 76, 74, 72, 74, 76, 77, 81, 79, 77, 76, 74, 72, 74, 76, 74];

    roots.forEach((root, barIndex) => {
        const start = barIndex * bar;
        [0, 2].forEach((beatOffset) => {
            addChord(pattern, start + beatOffset * beat, chords[barIndex], beat * 0.46, {
                type: 'triangle',
                volume: 0.024,
                attackTime: 0.01,
                decayTime: 0.08,
                sustain: 0.45,
                releaseTime: 0.14,
                filter: { type: 'lowpass', frequency: 2000, Q: 0.6 },
            });
        });
        for (let eighth = 0; eighth < 8; eighth++) {
            const lift = eighth === 6 ? 7 : 0;
            pattern.push(
                tone(start + eighth * (beat / 2), root + lift, beat * 0.36, {
                    type: 'sine',
                    volume: eighth % 2 === 0 ? 0.075 : 0.05,
                    attackTime: 0.006,
                    releaseTime: 0.09,
                    filter: { type: 'lowpass', frequency: 420, Q: 1.0 },
                    harmonics: [{ ratio: 0.5, gain: 0.32 }],
                })
            );
        }
        addDrumBar(pattern, start, beat, {
            kickSteps: [0, 4, 8, 10],
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
                type: 'sine',
                volume: index % 4 === 0 ? 0.055 : 0.042,
                attackTime: 0.008,
                releaseTime: 0.12,
                filter: { type: 'lowpass', frequency: 2800, Q: 0.7 },
                pan: index % 2 === 0 ? -0.2 : 0.2,
            })
        );
    });

    return {
        id: 'skyhook',
        title: 'Skyhook Anchor',
        bpm,
        pattern,
        loopDuration: bar * 4,
        musicVolume: 0.27,
    };
}
