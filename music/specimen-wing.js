import { addChord, addDrumBar, tone } from './score.js';

export function buildTrack() {
    const bpm = 126;
    const beat = 60 / bpm;
    const bar = beat * 4;
    const pattern = [];
    const chords = [
        [48, 51, 55, 58],
        [46, 50, 53, 58],
        [43, 46, 50, 53],
        [41, 45, 48, 53],
    ];
    chords.forEach((notes, barIndex) => {
        const start = barIndex * bar;
        addChord(pattern, start, notes, bar * 0.88, {
            type: 'square',
            volume: 0.018,
            attackTime: 0.03,
            decayTime: 0.08,
            sustain: 0.6,
            releaseTime: 0.16,
            filter: { type: 'lowpass', frequency: 1500, Q: 0.8 },
        });
        addDrumBar(pattern, start, beat, {
            kickSteps: [0, 3, 8, 11],
            snareSteps: [4, 12],
            kickVolume: 0.16,
            snareVolume: 0.08,
            hatVolume: 0.028,
            hatStep: 2,
        });
    });
    [72, 75, 79, 77, 74, 72, 70, 67, 70, 74].forEach((note, index) => {
        pattern.push(
            tone(index * beat * 0.5, note, beat * 0.36, {
                type: 'square',
                volume: 0.045,
                attackTime: 0.01,
                releaseTime: 0.1,
                filter: { type: 'bandpass', frequency: 1800, Q: 1.4 },
                pan: index % 2 === 0 ? -0.3 : 0.3,
            })
        );
    });
    return {
        id: 'specimen-wing',
        title: 'Specimen Wing',
        bpm,
        pattern,
        loopDuration: bar * 4,
        musicVolume: 0.2,
    };
}
