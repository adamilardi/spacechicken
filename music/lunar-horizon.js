import { addChord, percussion, tone } from './score.js';

export function buildTrack() {
    const bpm = 82;
    const beat = 60 / bpm;
    const bar = beat * 4;
    const pattern = [];
    const chords = [
        [49, 52, 56, 59],
        [45, 49, 52, 56],
        [47, 50, 54, 57],
        [44, 47, 51, 54],
    ];
    const roots = [25, 21, 23, 20];

    chords.forEach((notes, barIndex) => {
        const start = barIndex * bar;
        addChord(pattern, start, notes, bar * 0.98, {
            type: 'sine',
            volume: 0.04,
            attackTime: 0.5,
            decayTime: 0.7,
            sustain: 0.78,
            releaseTime: 0.8,
            filter: { type: 'lowpass', frequency: 1800, endFrequency: 1100, Q: 0.5 },
            harmonics: [
                { ratio: 2, gain: 0.12, detune: 5 },
                { ratio: 3, gain: 0.035, detune: -7 },
            ],
        });
        pattern.push(
            tone(start, roots[barIndex], bar * 0.92, {
                type: 'sine',
                volume: 0.12,
                attackTime: 0.16,
                releaseTime: 0.7,
            })
        );
        [0, 2].forEach((beatOffset, index) => {
            pattern.push(percussion('kick', start + beatOffset * beat, index === 0 ? 0.13 : 0.085));
        });
        [1, 3].forEach((beatOffset) => {
            pattern.push(
                percussion('hat', start + beatOffset * beat, 0.025, {
                    duration: 0.22,
                    pan: beatOffset === 1 ? -0.35 : 0.35,
                })
            );
        });
    });

    const melody = [73, 76, 80, 78, 73, 71, 68, 71, 73, 76, 75, 71];
    melody.forEach((note, index) => {
        pattern.push(
            tone(beat * (index * 1.25 + 0.5), note, beat * 0.85, {
                type: 'triangle',
                volume: 0.07,
                attackTime: 0.05,
                decayTime: 0.12,
                sustain: 0.48,
                releaseTime: 0.48,
                filter: { type: 'lowpass', frequency: 2600, Q: 0.7 },
                harmonics: [{ ratio: 2, gain: 0.12, detune: -4 }],
                pan: Math.sin(index * 1.2) * 0.46,
            })
        );
    });

    return {
        id: 'lunar-horizon',
        title: 'Lunar Horizon',
        bpm,
        pattern,
        loopDuration: bar * 4,
        musicVolume: 0.21,
    };
}
