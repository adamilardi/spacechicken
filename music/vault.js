import { addChord, addDrumBar, tone } from './score.js';

export function buildTrack() {
    const bpm = 138;
    const beat = 60 / bpm;
    const bar = beat * 4;
    const pattern = [];
    const roots = [40, 38, 36, 38];
    const chords = [
        [64, 67, 71, 76],
        [62, 65, 69, 74],
        [60, 64, 67, 72],
        [62, 65, 69, 74],
    ];
    const melody = [76, 74, 72, 74, 76, 79, 76, 74, 72, 74, 76, 74, 72, 71, 69, 71];

    roots.forEach((root, barIndex) => {
        const start = barIndex * bar;
        [0, 2].forEach((beatOffset) => {
            addChord(pattern, start + beatOffset * beat, chords[barIndex], beat * 0.46, {
                type: 'sawtooth',
                volume: 0.02,
                attackTime: 0.01,
                decayTime: 0.08,
                sustain: 0.45,
                releaseTime: 0.14,
                filter: { type: 'lowpass', frequency: 1700, Q: 0.6 },
            });
        });
        for (let eighth = 0; eighth < 8; eighth++) {
            const lift = eighth === 3 ? 10 : 0;
            pattern.push(
                tone(start + eighth * (beat / 2), root + lift, beat * 0.36, {
                    type: 'triangle',
                    volume: eighth % 2 === 0 ? 0.065 : 0.05,
                    attackTime: 0.006,
                    releaseTime: 0.09,
                    filter: { type: 'lowpass', frequency: 600, Q: 1.0 },
                })
            );
        }
        addDrumBar(pattern, start, beat, {
            kickSteps: [0, 8, 10],
            snareSteps: [4, 12],
            kickVolume: 0.18,
            snareVolume: 0.08,
            hatVolume: 0.026,
            hatStep: 4,
        });
    });

    melody.forEach((note, index) => {
        pattern.push(
            tone(index * beat, note, beat * 0.52, {
                type: 'triangle',
                volume: index % 4 === 0 ? 0.055 : 0.042,
                attackTime: 0.008,
                releaseTime: 0.12,
                filter: { type: 'lowpass', frequency: 2500, Q: 0.7 },
                pan: index % 2 === 0 ? -0.2 : 0.2,
            })
        );
    });

    return {
        id: 'vault',
        title: 'Iron Vault',
        bpm,
        pattern,
        loopDuration: bar * 4,
        musicVolume: 0.27,
    };
}
