import { addChord, addDrumBar, tone } from './score.js';

export function buildTrack() {
    const bpm = 96;
    const beat = 60 / bpm;
    const bar = beat * 4;
    const pattern = [];
    const chords = [
        [45, 48, 52, 55],
        [43, 47, 50, 55],
        [40, 43, 47, 50],
        [41, 45, 48, 52],
    ];
    chords.forEach((notes, barIndex) => {
        const start = barIndex * bar;
        addChord(pattern, start, notes, bar * 0.96, {
            type: 'triangle',
            volume: 0.03,
            attackTime: 0.2,
            decayTime: 0.3,
            sustain: 0.7,
            releaseTime: 0.4,
            filter: { type: 'lowpass', frequency: 1200, Q: 0.6 },
        });
        addDrumBar(pattern, start, beat, {
            kickSteps: [0, 8],
            snareSteps: [4, 12],
            kickVolume: 0.15,
            snareVolume: 0.07,
            hatVolume: 0.03,
            hatStep: 2,
        });
        pattern.push(
            tone(start, 33 + barIndex, bar * 0.9, {
                type: 'sine',
                volume: 0.08,
                attackTime: 0.08,
                releaseTime: 0.4,
            })
        );
    });
    [64, 67, 71, 69, 67, 64, 62, 60].forEach((note, index) => {
        pattern.push(
            tone(index * beat, note, beat * 0.7, {
                type: 'triangle',
                volume: 0.06,
                attackTime: 0.04,
                releaseTime: 0.22,
                pan: Math.sin(index) * 0.4,
            })
        );
    });
    return {
        id: 'red-reach',
        title: 'Red Reach',
        bpm,
        pattern,
        loopDuration: bar * 4,
        musicVolume: 0.22,
    };
}
