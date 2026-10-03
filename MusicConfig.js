const DEFAULT_NOTE_DURATION = 0.25;

export function midiToFrequency(note) {
    return 440 * 2 ** ((note - 69) / 12);
}

function tone(offset, note, duration = DEFAULT_NOTE_DURATION, options = {}) {
    return {
        kind: 'tone',
        offset,
        duration,
        freqStart: midiToFrequency(note),
        ...options,
    };
}

function percussion(kind, offset, volume, options = {}) {
    return { kind, offset, duration: options.duration || 0.12, volume, ...options };
}

function addChord(pattern, offset, notes, duration, options) {
    const center = (notes.length - 1) / 2;
    notes.forEach((note, index) => {
        pattern.push(
            tone(offset, note, duration, {
                ...options,
                detune: (options.detune || 0) + (index - center) * 3,
                pan: (index - center) * 0.22,
            })
        );
    });
}

function addDrumBar(pattern, barStart, beat, style = {}) {
    const kickSteps = style.kickSteps || [0, 4, 8, 12];
    const snareSteps = style.snareSteps || [4, 12];
    const hatStep = style.hatStep || 2;
    const stepDuration = beat / 4;

    kickSteps.forEach((step) => {
        pattern.push(percussion('kick', barStart + step * stepDuration, style.kickVolume || 0.2));
    });
    snareSteps.forEach((step) => {
        pattern.push(
            percussion('snare', barStart + step * stepDuration, style.snareVolume || 0.12)
        );
    });
    for (let step = 0; step < 16; step += hatStep) {
        const accent = step % 4 === 0 ? 1 : 0.68;
        pattern.push(
            percussion('hat', barStart + step * stepDuration, (style.hatVolume || 0.045) * accent, {
                duration: step % 8 === 6 ? 0.1 : 0.045,
                pan: step % 4 === 0 ? -0.18 : 0.18,
            })
        );
    }
}

function buildLevelOne() {
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

function buildLevelTwo() {
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

function buildLevelThree() {
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

function buildLevelFour() {
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

function buildLevelFive() {
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

function buildLevelSix() {
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

export const MUSIC_DEFINITIONS = Object.freeze({
    1: buildLevelOne(),
    2: buildLevelTwo(),
    3: buildLevelThree(),
    4: buildLevelFour(),
    5: buildLevelFive(),
    6: buildLevelSix(),
});

export function getMusicDefinition(level) {
    return MUSIC_DEFINITIONS[level] || MUSIC_DEFINITIONS[1];
}
