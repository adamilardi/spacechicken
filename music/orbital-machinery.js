import { addChord, addDrumBar, tone } from './score.js';

export function buildTrack() {
    const bpm = 106;
    const beat = 60 / bpm;
    const bar = beat * 4;
    const pattern = [];
    const roots = [28, 29, 28, 26];
    const arpeggios = [
        [52, 53, 59, 64, 59, 53, 52, 47],
        [53, 57, 60, 65, 60, 57, 53, 48],
        [52, 55, 59, 64, 62, 59, 55, 47],
        [50, 53, 57, 62, 57, 53, 50, 45],
    ];

    roots.forEach((root, barIndex) => {
        const start = barIndex * bar;
        addChord(pattern, start, [root + 12, root + 19, root + 25], bar * 0.96, {
            type: 'sawtooth',
            volume: 0.024,
            attackTime: 0.32,
            decayTime: 0.4,
            sustain: 0.66,
            releaseTime: 0.58,
            filter: { type: 'lowpass', frequency: 820, endFrequency: 1250, Q: 2.2 },
            harmonics: [{ ratio: 0.5, gain: 0.16, detune: -8 }],
        });
        pattern.push(
            tone(start, root, bar * 0.9, {
                type: 'sine',
                volume: 0.13,
                attackTime: 0.08,
                releaseTime: 0.42,
                harmonics: [{ ratio: 2, gain: 0.12 }],
            })
        );
        arpeggios[barIndex].forEach((note, index) => {
            pattern.push(
                tone(start + index * (beat / 2), note, beat * 0.35, {
                    type: 'triangle',
                    volume: 0.072,
                    attackTime: 0.004,
                    releaseTime: 0.16,
                    filter: { type: 'bandpass', frequency: 1900, Q: 2.4 },
                    pan: index % 2 === 0 ? -0.32 : 0.32,
                })
            );
        });
        addDrumBar(pattern, start, beat, {
            kickSteps: [0, 8, 11],
            snareSteps: [6, 14],
            kickVolume: 0.2,
            snareVolume: 0.1,
            hatVolume: 0.026,
            hatStep: 2,
        });
    });

    [64, 65, 71, 69, 67, 65, 64, 62].forEach((note, index) => {
        pattern.push(
            tone((index * bar) / 2, note, beat * 0.82, {
                type: 'sine',
                volume: 0.075,
                attackTime: 0.03,
                releaseTime: 0.35,
                filter: { type: 'lowpass', frequency: 2400, Q: 1.2 },
                harmonics: [{ ratio: 2, gain: 0.18, detune: 4 }],
            })
        );
    });

    return {
        id: 'orbital-machinery',
        title: 'Orbital Machinery',
        bpm,
        pattern,
        loopDuration: bar * 4,
        musicVolume: 0.23,
    };
}
