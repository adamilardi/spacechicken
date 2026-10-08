import { addChord, addDrumBar, tone } from './score.js';

export function buildTrack() {
    const bpm = 118;
    const beat = 60 / bpm;
    const bar = beat * 4;
    const pattern = [];
    const roots = [33, 33, 29, 31];
    const chords = [
        [57, 60, 64, 69],
        [55, 60, 64, 67],
        [53, 57, 60, 65],
        [59, 62, 65, 69],
    ];
    const melody = [81, 79, 76, 79, 81, 84, 81, 79, 76, 74, 72, 74, 76, 79, 81, 79];

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
                filter: { type: 'lowpass', frequency: 1400, Q: 0.6 },
            });
        });
        for (let eighth = 0; eighth < 8; eighth++) {
            const lift = eighth === 6 ? 7 : 0;
            pattern.push(
                tone(start + eighth * (beat / 2), root + lift, beat * 0.36, {
                    type: 'sine',
                    volume: eighth % 2 === 0 ? 0.08 : 0.055,
                    attackTime: 0.006,
                    releaseTime: 0.09,
                    filter: { type: 'lowpass', frequency: 320, Q: 1.0 },
                    harmonics: [{ ratio: 0.5, gain: 0.32 }],
                })
            );
        }
        addDrumBar(pattern, start, beat, {
            kickSteps: [0, 8],
            snareSteps: [8],
            kickVolume: 0.18,
            snareVolume: 0.08,
            hatVolume: 0.026,
            hatStep: 4,
        });
    });

    melody.forEach((note, index) => {
        pattern.push(
            tone(index * beat, note, beat * 0.52, {
                type: 'sine',
                volume: index % 4 === 0 ? 0.055 : 0.042,
                attackTime: 0.008,
                releaseTime: 0.12,
                filter: { type: 'lowpass', frequency: 2200, Q: 0.7 },
                pan: index % 2 === 0 ? -0.2 : 0.2,
            })
        );
    });

    return {
        id: 'womb',
        title: 'Crimson Womb',
        bpm,
        pattern,
        loopDuration: bar * 4,
        musicVolume: 0.27,
    };
}
