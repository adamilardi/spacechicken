import { addChord, addDrumBar, tone } from './score.js';

export function buildTrack() {
    const bpm = 96;
    const beat = 60 / bpm;
    const bar = beat * 4;
    const pattern = [];
    const roots = [38, 36, 34, 36];
    const chords = [
        [50, 53, 57, 60],
        [48, 52, 55, 60],
        [46, 50, 53, 58],
        [48, 52, 55, 58],
    ];
    const melody = [74, 77, 81, 77, 79, 77, 76, 74, 72, 74, 77, 81, 84, 81, 79, 77];

    roots.forEach((root, barIndex) => {
        const start = barIndex * bar;
        addChord(pattern, start, chords[barIndex], bar * 0.96, {
            type: 'triangle',
            volume: 0.026,
            attackTime: 0.22,
            decayTime: 0.28,
            sustain: 0.7,
            releaseTime: 0.42,
            filter: { type: 'lowpass', frequency: 900, endFrequency: 640, Q: 0.55 },
            harmonics: [{ ratio: 2, gain: 0.06, detune: 5 }],
        });
        [0, 2].forEach((beatOffset, index) => {
            pattern.push(
                tone(start + beatOffset * beat, root + (index === 1 ? 7 : 0), beat * 0.92, {
                    type: 'sine',
                    volume: 0.1,
                    attackTime: 0.03,
                    releaseTime: 0.32,
                    harmonics: [{ ratio: 2, gain: 0.1 }],
                })
            );
        });
        pattern.push(
            tone(start + beat * 2.5, root + 12, beat * 0.28, {
                type: 'sine',
                volume: 0.055,
                attackTime: 0.002,
                releaseTime: 0.16,
                filter: { type: 'lowpass', frequency: 280, Q: 0.6 },
            })
        );
        addDrumBar(pattern, start, beat, {
            kickSteps: [0, 8],
            snareSteps: [4, 12],
            kickVolume: 0.14,
            snareVolume: 0.065,
            hatVolume: 0.022,
            hatStep: 2,
        });
    });

    melody.forEach((note, index) => {
        const held = index % 4 === 3;
        pattern.push(
            tone(index * beat, note, beat * (held ? 1.05 : 0.62), {
                type: 'triangle',
                volume: held ? 0.07 : 0.05,
                attackTime: 0.03,
                decayTime: 0.08,
                sustain: 0.5,
                releaseTime: 0.24,
                filter: { type: 'lowpass', frequency: 2200, Q: 0.6 },
                harmonics: [{ ratio: 2, gain: 0.1, detune: -4 }],
                pan: Math.sin(index * 0.8) * 0.36,
            })
        );
    });

    return {
        id: 'red-reach',
        title: 'Red Reach',
        bpm,
        pattern,
        loopDuration: bar * 4,
        musicVolume: 0.32,
    };
}
