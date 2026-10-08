import { addChord, addDrumBar, tone } from './score.js';

export function buildTrack() {
    const bpm = 140;
    const beat = 60 / bpm;
    const bar = beat * 4;
    const pattern = [];
    const roots = [40, 40, 36, 38];
    const chords = [
        [64, 67, 71, 76],
        [62, 67, 71, 74],
        [60, 64, 67, 72],
        [65, 69, 72, 76],
    ];
    const melody = [88, 88, 91, 88, 86, 84, 86, 88, 91, 91, 93, 91, 88, 86, 84, 83];

    roots.forEach((root, barIndex) => {
        const start = barIndex * bar;
        [0, 2].forEach((beatOffset) => {
            addChord(pattern, start + beatOffset * beat, chords[barIndex], beat * 0.42, {
                type: 'sawtooth',
                volume: 0.018,
                attackTime: 0.005,
                decayTime: 0.05,
                sustain: 0.3,
                releaseTime: 0.09,
                filter: { type: 'lowpass', frequency: 2400, Q: 0.8 },
            });
        });
        for (let eighth = 0; eighth < 8; eighth++) {
            const lift = eighth === 3 || eighth === 7 ? 12 : 0;
            pattern.push(
                tone(start + eighth * (beat / 2), root + lift, beat * 0.3, {
                    type: 'square',
                    volume: eighth % 2 === 0 ? 0.06 : 0.042,
                    attackTime: 0.003,
                    releaseTime: 0.06,
                    filter: { type: 'lowpass', frequency: 900, Q: 1.2 },
                    harmonics: [{ ratio: 0.5, gain: 0.3 }],
                })
            );
        }
        addDrumBar(pattern, start, beat, {
            kickSteps: [0, 4, 8, 12],
            snareSteps: [4, 12],
            kickVolume: 0.17,
            snareVolume: 0.1,
            hatVolume: 0.032,
            hatStep: 2,
        });
    });

    melody.forEach((note, index) => {
        pattern.push(
            tone(index * beat, note, beat * 0.46, {
                type: 'square',
                volume: index % 4 === 0 ? 0.052 : 0.04,
                attackTime: 0.003,
                releaseTime: 0.07,
                filter: { type: 'lowpass', frequency: 3600, Q: 0.9 },
                pan: index % 2 === 0 ? -0.25 : 0.25,
            })
        );
    });

    return {
        id: 'bastion',
        title: 'Bastion Relay',
        bpm,
        pattern,
        loopDuration: bar * 4,
        musicVolume: 0.27,
    };
}
