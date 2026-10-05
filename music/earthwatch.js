import { addChord, addDrumBar, tone } from './score.js';

export function buildTrack() {
    const bpm = 138;
    const beat = 60 / bpm;
    const bar = beat * 4;
    const pattern = [];
    const chords = [
        [52, 56, 59, 63],
        [49, 52, 56, 59],
        [47, 51, 54, 59],
        [50, 54, 57, 62],
    ];
    chords.forEach((notes, barIndex) => {
        const start = barIndex * bar;
        addChord(pattern, start, notes, bar * 0.42, {
            type: 'square',
            volume: 0.028,
            attackTime: 0.01,
            decayTime: 0.08,
            sustain: 0.4,
            releaseTime: 0.12,
            filter: { type: 'lowpass', frequency: 2200, Q: 0.7 },
        });
        addDrumBar(pattern, start, beat, {
            kickSteps: [0, 4, 8, 12],
            snareSteps: [4, 12],
            kickVolume: 0.16,
            snareVolume: 0.08,
            hatVolume: 0.035,
            hatStep: 2,
        });
        pattern.push(
            tone(start, 40 + barIndex, beat * 0.9, {
                type: 'triangle',
                volume: 0.07,
                attackTime: 0.01,
                releaseTime: 0.08,
            })
        );
    });
    [76, 79, 83, 81, 79, 76, 74, 72, 74, 76, 79, 83, 86, 83, 79, 76].forEach((note, index) => {
        pattern.push(
            tone(index * (beat * 0.5), note, beat * 0.32, {
                type: 'square',
                volume: 0.045,
                attackTime: 0.005,
                releaseTime: 0.06,
                pan: index % 2 === 0 ? -0.25 : 0.25,
            })
        );
    });
    return {
        id: 'earthwatch',
        title: 'Earthwatch',
        bpm,
        pattern,
        loopDuration: bar * 4,
        musicVolume: 0.2,
    };
}
