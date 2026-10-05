import { addChord, addDrumBar, tone } from './score.js';

export function buildTrack() {
    const bpm = 126;
    const beat = 60 / bpm;
    const bar = beat * 4;
    const pattern = [];
    const roots = [45, 40, 41, 40];
    const chords = [
        [57, 60, 64, 67],
        [52, 55, 59, 62],
        [53, 57, 60, 65],
        [52, 55, 59, 64],
    ];
    const melody = [76, 79, 81, 79, 76, 74, 72, 74, 81, 84, 83, 79, 76, 74, 72, 71];

    roots.forEach((root, barIndex) => {
        const start = barIndex * bar;
        addChord(pattern, start, chords[barIndex], bar * 0.92, {
            type: 'square',
            volume: 0.016,
            attackTime: 0.08,
            decayTime: 0.16,
            sustain: 0.62,
            releaseTime: 0.28,
            filter: { type: 'lowpass', frequency: 980, endFrequency: 1400, Q: 0.8 },
        });
        for (let eighth = 0; eighth < 8; eighth++) {
            const lift = eighth === 2 || eighth === 6 ? 12 : 0;
            pattern.push(
                tone(start + eighth * (beat / 2), root + lift, beat * 0.4, {
                    type: 'square',
                    volume: eighth % 2 === 0 ? 0.062 : 0.044,
                    attackTime: 0.004,
                    releaseTime: 0.08,
                    filter: { type: 'lowpass', frequency: 380, Q: 1.3 },
                    harmonics: [{ ratio: 0.5, gain: 0.4 }],
                })
            );
        }
        addDrumBar(pattern, start, beat, {
            kickSteps: [0, 3, 8, 11],
            snareSteps: [4, 12],
            kickVolume: 0.15,
            snareVolume: 0.08,
            hatVolume: 0.026,
            hatStep: 2,
        });
    });

    melody.forEach((note, index) => {
        pattern.push(
            tone(index * beat, note, beat * (index % 4 === 3 ? 0.9 : 0.46), {
                type: 'square',
                volume: index % 4 === 0 ? 0.055 : 0.04,
                attackTime: 0.006,
                releaseTime: 0.12,
                filter: { type: 'bandpass', frequency: 1700, Q: 1.2 },
                harmonics: [{ ratio: 2, gain: 0.08, detune: -6 }],
                pan: index % 2 === 0 ? -0.28 : 0.28,
            })
        );
    });

    return {
        id: 'specimen-wing',
        title: 'Specimen Wing',
        bpm,
        pattern,
        loopDuration: bar * 4,
        musicVolume: 0.27,
    };
}
