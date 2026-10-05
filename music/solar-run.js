import { addChord, addDrumBar, tone } from './score.js';

export function buildTrack() {
    const bpm = 112;
    const beat = 60 / bpm;
    const bar = beat * 4;
    const pattern = [];
    const chords = [
        [50, 54, 57, 61],
        [47, 50, 54, 57],
        [43, 47, 50, 54],
        [45, 49, 52, 57],
    ];
    const bass = [38, 35, 31, 33];
    const lead = [74, 76, 78, 81, 78, 76, 73, 74, 69, 71, 74, 78, 76, 73, 71, 69];

    chords.forEach((notes, barIndex) => {
        const start = barIndex * bar;
        addChord(pattern, start, notes, bar * 0.94, {
            type: 'sawtooth',
            volume: 0.025,
            attackTime: 0.16,
            decayTime: 0.2,
            sustain: 0.72,
            releaseTime: 0.45,
            filter: { type: 'lowpass', frequency: 1450, endFrequency: 950, Q: 0.7 },
            harmonics: [{ ratio: 2, gain: 0.08, detune: 7 }],
        });
        [0, 1.5, 2, 3].forEach((beatOffset, index) => {
            pattern.push(
                tone(
                    start + beatOffset * beat,
                    bass[barIndex] + (index === 3 ? 12 : 0),
                    beat * 0.42,
                    {
                        type: 'triangle',
                        volume: 0.11,
                        attackTime: 0.006,
                        releaseTime: 0.16,
                        filter: { type: 'lowpass', frequency: 520, Q: 1.1 },
                        harmonics: [{ ratio: 0.5, gain: 0.22 }],
                    }
                )
            );
        });
        addDrumBar(pattern, start, beat, {
            kickSteps: [0, 7, 8, 14],
            kickVolume: 0.19,
            snareVolume: 0.105,
            hatVolume: 0.034,
        });
    });

    lead.forEach((note, index) => {
        const offset = index * beat;
        pattern.push(
            tone(offset, note, beat * 0.66, {
                type: 'triangle',
                volume: index % 4 === 0 ? 0.12 : 0.085,
                attackTime: 0.008,
                decayTime: 0.06,
                sustain: 0.54,
                releaseTime: 0.2,
                filter: { type: 'lowpass', frequency: 3400, Q: 0.8 },
                harmonics: [{ ratio: 2, gain: 0.1, detune: -5 }],
                pan: index % 2 === 0 ? -0.14 : 0.14,
            })
        );
    });

    return {
        id: 'solar-run',
        title: 'Solar Run',
        bpm,
        pattern,
        loopDuration: bar * 4,
        musicVolume: 0.24,
    };
}
