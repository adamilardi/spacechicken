const DEFAULT_NOTE_DURATION = 0.25;

export function midiToFrequency(note) {
    return 440 * 2 ** ((note - 69) / 12);
}

export function tone(offset, note, duration = DEFAULT_NOTE_DURATION, options = {}) {
    return {
        kind: 'tone',
        offset,
        duration,
        freqStart: midiToFrequency(note),
        ...options,
    };
}

export function percussion(kind, offset, volume, options = {}) {
    return { kind, offset, duration: options.duration || 0.12, volume, ...options };
}

export function addChord(pattern, offset, notes, duration, options) {
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

export function addDrumBar(pattern, barStart, beat, style = {}) {
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
