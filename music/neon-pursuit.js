import { addChord, addDrumBar, tone } from './score.js';

export function buildTrack() {
    const bpm = 128;
    const beat = 60 / bpm;
    const bar = beat * 4;
    const pattern = [];
    const roots = [33, 29, 36, 31];
    const chords = [
        [57, 60, 64],
        [53, 57, 60],
        [60, 64, 67],
        [55, 59, 62],
    ];
    const melody = [69, 72, 76, 79, 76, 72, 71, 74, 77, 81, 79, 77, 74, 71, 67, 71];

    roots.forEach((root, barIndex) => {
        const start = barIndex * bar;
        for (let eighth = 0; eighth < 8; eighth++) {
            const note = root + (eighth === 3 || eighth === 7 ? 12 : 0);
            pattern.push(
                tone(start + eighth * (beat / 2), note, beat * 0.34, {
                    type: 'square',
                    volume: eighth % 2 === 0 ? 0.095 : 0.07,
                    attackTime: 0.004,
                    releaseTime: 0.1,
                    filter: { type: 'lowpass', frequency: 680, Q: 1.7 },
                    harmonics: [{ ratio: 0.5, gain: 0.3 }],
                })
            );
        }
        [0, 1.5, 2.5].forEach((beatOffset) => {
            addChord(pattern, start + beatOffset * beat, chords[barIndex], beat * 0.28, {
                type: 'sawtooth',
                volume: 0.028,
                attackTime: 0.004,
                releaseTime: 0.12,
                filter: { type: 'bandpass', frequency: 1700, Q: 0.8 },
            });
        });
        addDrumBar(pattern, start, beat, {
            kickSteps: [0, 3, 8, 10, 14],
            snareSteps: [4, 12],
            kickVolume: 0.22,
            snareVolume: 0.14,
            hatVolume: 0.045,
            hatStep: 1,
        });
    });

    melody.forEach((note, index) => {
        pattern.push(
            tone(index * beat, note, beat * (index % 4 === 3 ? 0.82 : 0.42), {
                type: index % 4 === 0 ? 'square' : 'triangle',
                volume: 0.092,
                attackTime: 0.004,
                releaseTime: 0.14,
                filter: { type: 'lowpass', frequency: 2800, Q: 1.4 },
                harmonics: [{ ratio: 2, gain: 0.08, detune: 6 }],
                pan: Math.sin(index * 1.7) * 0.24,
            })
        );
    });

    return {
        id: 'neon-pursuit',
        title: 'Neon Pursuit',
        bpm,
        pattern,
        loopDuration: bar * 4,
        musicVolume: 0.22,
    };
}
