export class SfxSynth {
    constructor(voice, music) {
        this.voice = voice;
        this.music = music;
        this.stepAt = new WeakMap();
    }

    playBonkSound() {
        if (!this.voice.canUseWebAudio()) {
            return;
        }
        const now = this.voice.scene.sound.context.currentTime;
        this.voice.playTone({
            freqStart: 150,
            freqEnd: 520,
            duration: 0.09,
            type: 'sine',
            volume: 0.22,
            attackTime: 0.001,
            releaseTime: 0.06,
            harmonics: [{ ratio: 2.01, gain: 0.28, type: 'triangle' }],
            startTime: now,
        });
        this.voice.playTone({
            freqStart: 680,
            freqEnd: 190,
            duration: 0.22,
            type: 'triangle',
            volume: 0.15,
            attackTime: 0.003,
            releaseTime: 0.15,
            harmonics: [{ ratio: 2.5, gain: 0.08, detune: 6 }],
            startTime: now + 0.055,
        });
        this.voice.playNoise({
            duration: 0.035,
            volume: 0.07,
            attackTime: 0.001,
            releaseTime: 0.025,
            filter: { type: 'highpass', frequency: 2200, Q: 0.5 },
            startTime: now,
        });
    }

    playFallDeathSound() {
        if (!this.voice.canUseWebAudio()) {
            return;
        }
        const now = this.voice.scene.sound.context.currentTime;
        this.voice.playTone({
            freqStart: 310,
            freqEnd: 36,
            duration: 0.62,
            type: 'sine',
            volume: 0.22,
            attackTime: 0.003,
            decayTime: 0.12,
            sustain: 0.55,
            releaseTime: 0.28,
            harmonics: [{ ratio: 2, gain: 0.16, detune: -4 }],
            filter: { type: 'lowpass', frequency: 1400, endFrequency: 220, Q: 0.7 },
            startTime: now,
        });
        this.voice.playNoise({
            duration: 0.36,
            volume: 0.09,
            attackTime: 0.002,
            releaseTime: 0.24,
            filter: { type: 'lowpass', frequency: 900, endFrequency: 140, Q: 0.6 },
            startTime: now,
        });
    }

    playLaserDeathSound() {
        if (!this.voice.canUseWebAudio()) {
            return;
        }
        const now = this.voice.scene.sound.context.currentTime;
        this.voice.playTone({
            freqStart: 1680,
            freqEnd: 140,
            duration: 0.16,
            type: 'square',
            volume: 0.09,
            attackTime: 0.001,
            releaseTime: 0.1,
            filter: { type: 'bandpass', frequency: 1800, endFrequency: 420, Q: 2.2 },
            startTime: now,
        });
        this.voice.playTone({
            freqStart: 840,
            freqEnd: 90,
            duration: 0.22,
            type: 'sawtooth',
            volume: 0.05,
            attackTime: 0.002,
            releaseTime: 0.14,
            filter: { type: 'lowpass', frequency: 1200, Q: 0.8 },
            startTime: now + 0.02,
        });
        this.voice.playNoise({
            duration: 0.07,
            volume: 0.06,
            attackTime: 0.001,
            releaseTime: 0.05,
            filter: { type: 'highpass', frequency: 4000, Q: 0.5 },
            startTime: now,
        });
    }

    playBoarderThud() {
        if (!this.voice.canUseWebAudio()) {
            return;
        }
        const now = this.voice.scene.sound.context.currentTime;
        this.voice.playNoise({
            duration: 0.16,
            volume: 0.18,
            attackTime: 0.002,
            releaseTime: 0.12,
            filter: { type: 'lowpass', frequency: 420, endFrequency: 140, Q: 0.7 },
            startTime: now,
        });
        this.voice.playTone({
            freqStart: 96,
            freqEnd: 42,
            duration: 0.22,
            type: 'sine',
            volume: 0.18,
            attackTime: 0.002,
            releaseTime: 0.16,
            startTime: now,
        });
    }

    playJumpSound() {
        if (!this.voice.canUseWebAudio()) {
            return;
        }
        const now = this.voice.scene.sound.context.currentTime;
        const wobble = (Math.random() - 0.5) * 36;
        this.voice.playTone({
            freqStart: 300,
            freqEnd: 820,
            duration: 0.18,
            type: 'triangle',
            volume: 0.2,
            attackTime: 0.002,
            decayTime: 0.04,
            sustain: 0.42,
            releaseTime: 0.1,
            detune: wobble,
            filter: { type: 'lowpass', frequency: 3400, endFrequency: 1600, Q: 1.2 },
            harmonics: [{ ratio: 2, gain: 0.16, detune: 7 }],
            pan: -0.08,
            startTime: now,
        });
        this.voice.playTone({
            freqStart: 112,
            freqEnd: 72,
            duration: 0.13,
            type: 'sine',
            volume: 0.13,
            attackTime: 0.002,
            releaseTime: 0.1,
            startTime: now,
        });
        this.voice.playNoise({
            duration: 0.07,
            volume: 0.055,
            attackTime: 0.002,
            releaseTime: 0.055,
            filter: { type: 'bandpass', frequency: 2400, Q: 0.8 },
            pan: 0.12,
            startTime: now + 0.015,
        });
    }

    playPhaserSound() {
        if (!this.voice.canUseWebAudio()) {
            return;
        }
        const now = this.voice.scene.sound.context.currentTime;
        this.voice.playTone({
            freqStart: 420,
            freqEnd: 1960,
            duration: 0.07,
            type: 'square',
            volume: 0.16,
            attackTime: 0.001,
            decayTime: 0.02,
            sustain: 0.16,
            releaseTime: 0.04,
            filter: { type: 'bandpass', frequency: 2400, endFrequency: 900, Q: 2.4 },
            harmonics: [{ ratio: 0.5, gain: 0.35, type: 'sawtooth' }],
            startTime: now,
        });
        this.voice.playNoise({
            duration: 0.05,
            volume: 0.08,
            attackTime: 0.001,
            releaseTime: 0.035,
            filter: { type: 'highpass', frequency: 3200, Q: 0.55 },
            startTime: now,
        });
    }

    playBoarderPop() {
        if (!this.voice.canUseWebAudio()) {
            return;
        }
        const now = this.voice.scene.sound.context.currentTime;
        this.voice.playTone({
            freqStart: 220,
            freqEnd: 90,
            duration: 0.12,
            type: 'triangle',
            volume: 0.16,
            attackTime: 0.002,
            releaseTime: 0.08,
            startTime: now,
        });
        this.voice.playNoise({
            duration: 0.08,
            volume: 0.08,
            attackTime: 0.002,
            releaseTime: 0.06,
            filter: { type: 'bandpass', frequency: 900, Q: 0.7 },
            startTime: now,
        });
    }

    playJetpackSound() {
        if (!this.voice.canUseWebAudio()) {
            return;
        }
        const now = this.voice.scene.sound.context.currentTime;
        this.voice.playNoise({
            duration: 0.58,
            volume: 0.19,
            attackTime: 0.018,
            decayTime: 0.08,
            sustain: 0.72,
            releaseTime: 0.28,
            filter: { type: 'bandpass', frequency: 1250, endFrequency: 560, Q: 0.65 },
            drive: 1.45,
            pan: 0.16,
            startTime: now,
        });
        this.voice.playTone({
            freqStart: 178,
            freqEnd: 108,
            duration: 0.54,
            type: 'sawtooth',
            volume: 0.105,
            attackTime: 0.012,
            decayTime: 0.08,
            sustain: 0.65,
            releaseTime: 0.26,
            filter: { type: 'lowpass', frequency: 720, endFrequency: 420, Q: 1.7 },
            harmonics: [
                { ratio: 0.5, gain: 0.34, detune: -7 },
                { ratio: 1.5, gain: 0.08, detune: 9 },
            ],
            drive: 1.7,
            pan: -0.12,
            startTime: now,
        });
        [0.04, 0.16, 0.28].forEach((offset, index) => {
            this.voice.playTone({
                freqStart: 520 - index * 35,
                freqEnd: 410 - index * 30,
                duration: 0.12,
                type: 'square',
                volume: 0.035,
                attackTime: 0.002,
                releaseTime: 0.09,
                filter: { type: 'lowpass', frequency: 960, Q: 1.2 },
                pan: index % 2 ? 0.3 : -0.3,
                startTime: now + offset,
            });
        });
    }

    playCollectSound() {
        if (!this.voice.canUseWebAudio()) {
            return;
        }
        const now = this.voice.scene.sound.context.currentTime;
        [76, 79, 83, 88].forEach((midiNote, index) => {
            const frequency = 440 * 2 ** ((midiNote - 69) / 12);
            this.voice.playTone({
                freqStart: frequency,
                freqEnd: frequency * 1.008,
                duration: 0.3 + index * 0.055,
                type: 'triangle',
                volume: 0.14 - index * 0.015,
                attackTime: 0.004,
                decayTime: 0.06,
                sustain: 0.52,
                releaseTime: 0.22,
                filter: { type: 'lowpass', frequency: 5200, Q: 0.6 },
                harmonics: [
                    { ratio: 2, gain: 0.15, detune: 4 },
                    { ratio: 3, gain: 0.04, detune: -5 },
                ],
                pan: -0.36 + index * 0.24,
                startTime: now + index * 0.085,
            });
        });
        this.voice.playNoise({
            duration: 0.42,
            volume: 0.065,
            attackTime: 0.006,
            decayTime: 0.06,
            sustain: 0.22,
            releaseTime: 0.3,
            filter: { type: 'highpass', frequency: 5800, Q: 0.45 },
            pan: 0.24,
            startTime: now + 0.12,
        });
    }

    playLandSound(impact = 0) {
        if (!this.voice.canUseWebAudio()) {
            return;
        }
        const weight = Math.max(0, Math.min(1, (impact - 180) / 520));
        const now = this.voice.scene.sound.context.currentTime;
        this.voice.playNoise({
            duration: 0.06 + weight * 0.05,
            volume: 0.07 + weight * 0.08,
            attackTime: 0.001,
            releaseTime: 0.05 + weight * 0.04,
            filter: {
                type: 'lowpass',
                frequency: 1600 - weight * 400,
                endFrequency: 380,
                Q: 0.6,
            },
            pan: 0.06,
            startTime: now,
        });
        this.voice.playTone({
            freqStart: 156 - weight * 28,
            freqEnd: 64,
            duration: 0.08 + weight * 0.06,
            type: 'sine',
            volume: 0.07 + weight * 0.1,
            attackTime: 0.001,
            releaseTime: 0.06 + weight * 0.05,
            startTime: now,
        });
    }

    maybePlayFootstep(player, speed) {
        if (!this.music.audioUnlocked || !player || speed < 30 || !this.voice.canUseWebAudio()) {
            return;
        }
        const context = this.voice.scene.sound.context;
        if (context.state && context.state !== 'running') {
            return;
        }
        const now = context.currentTime;
        if (now < (this.stepAt.get(player) || 0)) {
            return;
        }
        const pace = 0.26 * (160 / Math.max(speed, 80));
        this.stepAt.set(player, now + Math.max(0.16, Math.min(0.46, pace)));
        this.playFootstep(player.flipX ? -0.22 : 0.22);
    }

    playFootstep(pan = 0) {
        if (!this.voice.canUseWebAudio()) {
            return;
        }
        const now = this.voice.scene.sound.context.currentTime;
        const chip = 180 + Math.random() * 40;
        this.voice.playNoise({
            duration: 0.035,
            volume: 0.065,
            attackTime: 0.001,
            releaseTime: 0.025,
            filter: { type: 'bandpass', frequency: 700 + Math.random() * 500, Q: 0.8 },
            pan,
            startTime: now,
        });
        this.voice.playTone({
            freqStart: chip,
            freqEnd: 80,
            duration: 0.04,
            type: 'sine',
            volume: 0.04,
            attackTime: 0.001,
            releaseTime: 0.028,
            pan,
            startTime: now,
        });
    }

    playWaveSound() {
        if (!this.voice.canUseWebAudio()) {
            return;
        }
        const now = this.voice.scene.sound.context.currentTime;
        [740, 988, 1480].forEach((frequency, index) => {
            this.voice.playTone({
                freqStart: frequency,
                freqEnd: frequency * 0.94,
                duration: 0.07,
                type: 'square',
                volume: 0.07,
                attackTime: 0.001,
                releaseTime: 0.045,
                filter: { type: 'bandpass', frequency: 1600, Q: 1.5 },
                pan: index === 1 ? 0.2 : -0.15,
                startTime: now + index * 0.08,
            });
        });
    }

    playStartSound() {
        if (!this.voice.canUseWebAudio()) {
            return;
        }
        const now = this.voice.scene.sound.context.currentTime;
        [64, 68, 71, 76].forEach((midiNote, index) => {
            const frequency = 440 * 2 ** ((midiNote - 69) / 12);
            this.voice.playTone({
                freqStart: frequency,
                freqEnd: frequency * 1.01,
                duration: 0.22 + index * 0.04,
                type: 'triangle',
                volume: 0.11 - index * 0.012,
                attackTime: 0.004,
                decayTime: 0.05,
                sustain: 0.5,
                releaseTime: 0.16,
                pan: -0.28 + index * 0.18,
                harmonics: index === 3 ? [{ ratio: 2, gain: 0.2, detune: 4 }] : [],
                startTime: now + index * 0.05,
            });
        });
        this.voice.playNoise({
            duration: 0.28,
            volume: 0.04,
            attackTime: 0.01,
            releaseTime: 0.18,
            filter: { type: 'highpass', frequency: 5000, Q: 0.4 },
            startTime: now + 0.08,
        });
    }

    playHazardHitSound() {
        if (!this.voice.canUseWebAudio()) {
            return;
        }
        const now = this.voice.scene.sound.context.currentTime;
        this.voice.playKick({ startTime: now, volume: 0.34 });
        this.voice.playNoise({
            duration: 0.62,
            volume: 0.24,
            attackTime: 0.002,
            decayTime: 0.08,
            sustain: 0.42,
            releaseTime: 0.44,
            filter: { type: 'lowpass', frequency: 2100, endFrequency: 260, Q: 0.8 },
            drive: 1.7,
            startTime: now,
        });
        this.voice.playTone({
            freqStart: 174,
            freqEnd: 42,
            duration: 0.64,
            type: 'sawtooth',
            volume: 0.18,
            attackTime: 0.002,
            decayTime: 0.06,
            sustain: 0.4,
            releaseTime: 0.42,
            filter: { type: 'lowpass', frequency: 640, endFrequency: 160, Q: 1.4 },
            harmonics: [
                { ratio: 0.5, gain: 0.42, detune: -9 },
                { ratio: 1.414, gain: 0.12, detune: 11 },
            ],
            drive: 2.1,
            startTime: now,
        });
        this.voice.playTone({
            freqStart: 860,
            freqEnd: 164,
            duration: 0.48,
            type: 'square',
            volume: 0.055,
            attackTime: 0.002,
            releaseTime: 0.38,
            filter: { type: 'bandpass', frequency: 920, Q: 3.4 },
            pan: -0.26,
            startTime: now + 0.018,
        });
    }
}
