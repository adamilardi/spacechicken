import { addChord, addDrumBar, tone } from './score.js';

export function buildTrack() {
    const bpm = 132;
    const beat = 60 / bpm;
    const bar = beat * 4;
    const pattern = [];
    const roots = [45, 43, 41, 43];
    const chords = [
        [57, 60, 65, 69],
        [55, 59, 62, 67],
        [53, 57, 60, 64],
        [55, 59, 62, 67],
    ];
    const melody = [69, 72, 76, 72, 69, 67, 65, 67, 69, 72, 76, 79, 76, 72, 69, 67];

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
                filter: { type: 'lowpass', frequency: 1800, Q: 0.6 },
            });
        });
        for (let eighth = 0; eighth < 8; eighth++) {
            const lift = eighth === 4 ? 12 : 0;
            pattern.push(
                tone(start + eighth * (beat / 2), root + lift, beat * 0.36, {
                    type: 'square',
                    volume: eighth % 2 === 0 ? 0.06 : 0.045,
                    attackTime: 0.006,
                    releaseTime: 0.09,
                    filter: { type: 'lowpass', frequency: 640, Q: 1.0 },
                })
            );
        }
        addDrumBar(pattern, start, beat, {
            kickSteps: [0, 4, 8],
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
                type: 'triangle',
                volume: index % 4 === 0 ? 0.055 : 0.042,
                attackTime: 0.008,
                releaseTime: 0.12,
                filter: { type: 'lowpass', frequency: 2600, Q: 0.7 },
                pan: index % 2 === 0 ? -0.2 : 0.2,
            })
        );
    });

    return {
        id: 'rust-harbor',
        title: 'Rust Harbor',
        bpm,
        pattern,
        loopDuration: bar * 4,
        musicVolume: 0.27,
    };
}
