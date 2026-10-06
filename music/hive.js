import { addChord, addDrumBar, tone } from './score.js';

export function buildTrack() {
    const bpm = 126;
    const beat = 60 / bpm;
    const bar = beat * 4;
    const pattern = [];
    const roots = [36, 36, 33, 31];
    const chords = [
        [55, 60, 63, 67],
        [55, 58, 62, 67],
        [53, 57, 60, 65],
        [55, 59, 62, 66],
    ];
    const melody = [79, 77, 76, 77, 79, 82, 81, 79, 76, 74, 72, 74, 76, 79, 77, 74];

    roots.forEach((root, barIndex) => {
        const start = barIndex * bar;
        [0, 2].forEach((beatOffset) => {
            addChord(pattern, start + beatOffset * beat, chords[barIndex], beat * 0.42, {
                type: 'square',
                volume: 0.02,
                attackTime: 0.006,
                decayTime: 0.05,
                sustain: 0.35,
                releaseTime: 0.1,
                filter: { type: 'lowpass', frequency: 1800, Q: 0.7 },
            });
        });
        for (let eighth = 0; eighth < 8; eighth++) {
            const lift = eighth === 3 || eighth === 7 ? 12 : 0;
            pattern.push(
                tone(start + eighth * (beat / 2), root + lift, beat * 0.32, {
                    type: 'triangle',
                    volume: eighth % 2 === 0 ? 0.07 : 0.048,
                    attackTime: 0.004,
                    releaseTime: 0.07,
                    filter: { type: 'lowpass', frequency: 420, Q: 1.1 },
                    harmonics: [{ ratio: 0.5, gain: 0.28 }],
                })
            );
        }
        addDrumBar(pattern, start, beat, {
            kickSteps: [0, 4, 8, 12],
            snareSteps: [4, 12],
            kickVolume: 0.16,
            snareVolume: 0.09,
            hatVolume: 0.03,
            hatStep: 2,
        });
    });

    melody.forEach((note, index) => {
        pattern.push(
            tone(index * beat, note, beat * 0.48, {
                type: 'square',
                volume: index % 4 === 0 ? 0.05 : 0.038,
                attackTime: 0.004,
                releaseTime: 0.08,
                filter: { type: 'lowpass', frequency: 2900, Q: 0.8 },
                pan: index % 2 === 0 ? -0.22 : 0.22,
            })
        );
    });

    return {
        id: 'hive',
        title: 'Hive Warrens',
        bpm,
        pattern,
        loopDuration: bar * 4,
        musicVolume: 0.27,
    };
}
