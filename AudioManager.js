import { GAME_CONSTANTS, AUDIO_SETTINGS } from './Constants.js';

export class AudioManager {
    constructor(scene) {
        this.scene = scene;
        this.musicGainNode = null;
        this.effectsGainNode = null;
        this.backgroundLoopEvent = null;
        this.backgroundPattern = null;
        this.backgroundPatternDuration = 0;
        this.backgroundSources = new Set();
        this.activeEffects = new Set();
        this.musicMuted = false;
        this.musicVolume = GAME_CONSTANTS.MUSIC_VOLUME;
        this.audioUnlocked = false;
        this.audioUnlockHandler = null;
        this.musicToggleButton = null;
    }

    canUseWebAudio() {
        return this.scene.sound && this.scene.sound.context && typeof this.scene.sound.context.createOscillator === 'function';
    }

    setupAudioPipeline(options = {}) {
        if (!this.canUseWebAudio()) {
            return;
        }

        const skipAutoStart = options.skipAutoStart === true;
        const context = this.scene.sound.context;
        const destination = this.scene.sound.masterGainNode || context.destination;

        if (!this.musicGainNode) {
            this.musicGainNode = context.createGain();
            const initialGain = this.musicMuted ? 0 : this.musicVolume;
            this.musicGainNode.gain.setValueAtTime(initialGain, context.currentTime);
            this.musicGainNode.connect(destination);
        } else {
            const targetGain = this.musicMuted ? 0 : this.musicVolume;
            try {
                this.musicGainNode.gain.cancelScheduledValues(context.currentTime);
            } catch (err) {
                // ignore
            }
            this.musicGainNode.gain.setTargetAtTime(targetGain, context.currentTime, GAME_CONSTANTS.AUDIO_FADE_TIME);
        }

        if (!this.effectsGainNode) {
            this.effectsGainNode = context.createGain();
            this.effectsGainNode.gain.setValueAtTime(GAME_CONSTANTS.EFFECTS_VOLUME, context.currentTime);
            this.effectsGainNode.connect(destination);
        }

        if (!this.backgroundPattern || !this.backgroundPattern.length) {
            this.configureLevelMusic();
        }

        if (context.state === 'running') {
            this.audioUnlocked = true;
            if (!skipAutoStart) {
                this.startBackgroundMusic();
            }
            return;
        }

        if (this.audioUnlockHandler) {
            return;
        }

        const unlock = () => {
            if (this.audioUnlocked) {
                return;
            }
            this.audioUnlocked = true;
            if (context.state === 'suspended') {
                context.resume().catch(() => {});
            }
            this.startBackgroundMusic();
            if (this.scene.input) {
                this.scene.input.off('pointerdown', unlock, this);
            }
            if (this.scene.input && this.scene.input.keyboard) {
                this.scene.input.keyboard.off('keydown', unlock, this);
            }
            this.audioUnlockHandler = null;
        };

        this.audioUnlockHandler = unlock;
        if (this.scene.input) {
            this.scene.input.once('pointerdown', unlock, this);
        }
        if (this.scene.input && this.scene.input.keyboard) {
            this.scene.input.keyboard.once('keydown', unlock, this);
        }
    }

    startBackgroundMusic() {
        if (!this.canUseWebAudio() || !this.audioUnlocked) {
            return;
        }
        if (!this.musicGainNode) {
            this.setupAudioPipeline({ skipAutoStart: true });
        }
        if (!this.musicGainNode || this.backgroundLoopEvent || !this.backgroundPattern || !this.backgroundPattern.length) {
            return;
        }
        const context = this.scene.sound.context;
        const offsetTime = context.currentTime + GAME_CONSTANTS.AUDIO_UNLOCK_TOLERANCE;
        this.scheduleBackgroundPattern(offsetTime);
        const delay = Math.max(1000, this.backgroundPatternDuration * 1000);
        this.backgroundLoopEvent = this.scene.time.addEvent({
            delay,
            loop: true,
            callback: () => this.scheduleBackgroundPattern(context.currentTime + GAME_CONSTANTS.AUDIO_UNLOCK_TOLERANCE)
        });
    }

    scheduleBackgroundPattern(baseTime) {
        if (!this.backgroundPattern || !this.canUseWebAudio()) {
            return;
        }
        this.backgroundPattern.forEach(note => {
            this.playTone({
                freqStart: note.freqStart,
                freqEnd: note.freqEnd,
                duration: note.duration,
                type: note.type,
                volume: note.volume,
                startTime: baseTime + note.offset,
                destination: this.musicGainNode,
                trackSet: this.backgroundSources
            });
        });
    }

    stopBackgroundMusic() {
        if (this.backgroundLoopEvent) {
            this.backgroundLoopEvent.remove();
            this.backgroundLoopEvent = null;
        }
        if (this.backgroundSources) {
            this.backgroundSources.forEach(source => {
                try {
                    source.stop();
                } catch (err) {
                    // ignore
                }
            });
            this.backgroundSources.clear();
        }
    }

    stopAllEffects() {
        if (!this.activeEffects) {
            return;
        }
        this.activeEffects.forEach(source => {
            try {
                source.stop();
            } catch (err) {
                // ignore
            }
        });
        this.activeEffects.clear();
    }

    cleanupAudio() {
        if (!this.scene.sound) {
            return;
        }
        this.stopBackgroundMusic();
        this.stopAllEffects();
        if (this.musicGainNode) {
            try {
                this.musicGainNode.disconnect();
            } catch (err) {
                // ignore
            }
            this.musicGainNode = null;
        }
        if (this.effectsGainNode) {
            try {
                this.effectsGainNode.disconnect();
            } catch (err) {
                // ignore
            }
            this.effectsGainNode = null;
        }
        if (this.audioUnlockHandler) {
            if (this.scene.input) {
                this.scene.input.off('pointerdown', this.audioUnlockHandler, this);
            }
            if (this.scene.input && this.scene.input.keyboard) {
            this.scene.input.keyboard.off('keydown', this.audioUnlockHandler, this);
            }
            this.audioUnlockHandler = null;
        }
        this.audioUnlocked = false;
        if (this.musicToggleButton) {
            this.musicToggleButton.destroy();
            this.musicToggleButton = null;
        }
    }

    playTone(options = {}) {
        if (!this.canUseWebAudio()) {
            return null;
        }
        const context = this.scene.sound.context;
        const startTime = options.startTime !== undefined ? options.startTime : context.currentTime;
        const duration = Math.max(0.05, options.duration || 0.2);
        const stopTime = startTime + duration + GAME_CONSTANTS.AUDIO_UNLOCK_TOLERANCE;

        const oscillator = context.createOscillator();
        oscillator.type = options.type || 'sine';
        const freqStart = options.freqStart || options.freqEnd || 440;
        oscillator.frequency.setValueAtTime(freqStart, startTime);
        if (options.freqEnd && options.freqEnd !== freqStart) {
            oscillator.frequency.linearRampToValueAtTime(options.freqEnd, startTime + duration);
        }

        const gainNode = context.createGain();
        const targetVolume = options.volume !== undefined ? options.volume : GAME_CONSTANTS.EFFECTS_VOLUME;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(targetVolume, startTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(targetVolume * 0.6, startTime + duration * 0.6);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
        gainNode.gain.setValueAtTime(0, stopTime);

        oscillator.connect(gainNode);
        const destination = options.destination || this.effectsGainNode || this.scene.sound.masterGainNode || context.destination;
        gainNode.connect(destination);

        const trackingSet = options.trackSet || this.activeEffects;

        oscillator.start(startTime);
        oscillator.stop(stopTime);

        const cleanup = () => {
            oscillator.disconnect();
            gainNode.disconnect();
            if (trackingSet) {
                trackingSet.delete(oscillator);
            }
        };
        oscillator.onended = cleanup;

        if (trackingSet) {
            trackingSet.add(oscillator);
        }

        return oscillator;
    }

    playJumpSound() {
        if (!this.canUseWebAudio()) {
            return;
        }
        const now = this.scene.sound.context.currentTime;
        this.playTone({
            freqStart: 560,
            freqEnd: 720,
            duration: 0.18,
            type: 'square',
            volume: 0.34,
            startTime: now
        });
    }

    playJetpackSound() {
        if (!this.canUseWebAudio()) {
            return;
        }
        const now = this.scene.sound.context.currentTime;
        this.playTone({
            freqStart: 820,
            freqEnd: 540,
            duration: 0.35,
            type: 'sawtooth',
            volume: 0.28,
            startTime: now
        });
    }

    playCollectSound() {
        if (!this.canUseWebAudio()) {
            return;
        }
        const now = this.scene.sound.context.currentTime;
        this.playTone({ freqStart: 660, duration: 0.18, type: 'triangle', volume: 0.28, startTime: now });
        this.playTone({ freqStart: 784, duration: 0.18, type: 'triangle', volume: 0.26, startTime: now + 0.2 });
        this.playTone({ freqStart: 988, duration: 0.32, type: 'triangle', volume: 0.24, startTime: now + 0.4 });
    }

    playHazardHitSound() {
        if (!this.canUseWebAudio()) {
            return;
        }
        const now = this.scene.sound.context.currentTime;
        this.playTone({
            freqStart: 320,
            freqEnd: 120,
            duration: 0.28,
            type: 'sawtooth',
            volume: 0.32,
            startTime: now
        });
        this.playTone({
            freqStart: 180,
            freqEnd: 80,
            duration: 0.4,
            type: 'square',
            volume: 0.25,
            startTime: now + 0.02
        });
    }

    getMusicDefinitionForLevel(level) {
        const commonPad = (baseFreq, startOffset = 0, duration = 1.6, volume = 0.1) => ([
            { offset: startOffset, duration, freqStart: baseFreq, type: 'sawtooth', volume }
        ]);

        const level1Pattern = [
            { offset: 0, duration: 0.32, freqStart: 392, type: 'triangle', volume: 0.22 },
            { offset: 0.36, duration: 0.32, freqStart: 440, type: 'triangle', volume: 0.22 },
            { offset: 0.72, duration: 0.32, freqStart: 494, type: 'triangle', volume: 0.22 },
            { offset: 1.08, duration: 0.32, freqStart: 523, type: 'triangle', volume: 0.22 },
            { offset: 1.44, duration: 0.32, freqStart: 494, type: 'triangle', volume: 0.22 },
            { offset: 1.8, duration: 0.32, freqStart: 440, type: 'triangle', volume: 0.22 },
            { offset: 2.16, duration: 0.32, freqStart: 392, type: 'triangle', volume: 0.22 },
            { offset: 2.52, duration: 0.48, freqStart: 330, type: 'triangle', volume: 0.2 },
            ...commonPad(196, 0, 1.6, 0.12),
            ...commonPad(220, 1.68, 1.6, 0.12)
        ];

        const level2Pattern = [
            { offset: 0, duration: 0.24, freqStart: 523, freqEnd: 554, type: 'square', volume: 0.24 },
            { offset: 0.26, duration: 0.24, freqStart: 494, freqEnd: 523, type: 'square', volume: 0.24 },
            { offset: 0.52, duration: 0.24, freqStart: 440, freqEnd: 466, type: 'square', volume: 0.24 },
            { offset: 0.78, duration: 0.24, freqStart: 392, freqEnd: 415, type: 'triangle', volume: 0.23 },
            { offset: 1.04, duration: 0.28, freqStart: 440, freqEnd: 494, type: 'triangle', volume: 0.24 },
            { offset: 1.34, duration: 0.3, freqStart: 587, type: 'square', volume: 0.25 },
            { offset: 1.68, duration: 0.24, freqStart: 659, freqEnd: 698, type: 'triangle', volume: 0.22 },
            { offset: 1.94, duration: 0.24, freqStart: 622, freqEnd: 659, type: 'triangle', volume: 0.22 },
            { offset: 2.2, duration: 0.24, freqStart: 587, freqEnd: 622, type: 'triangle', volume: 0.22 },
            { offset: 2.46, duration: 0.36, freqStart: 494, freqEnd: 440, type: 'triangle', volume: 0.22 },
            ...commonPad(220, 0, 1.8, 0.14),
            ...commonPad(247, 1.9, 1.6, 0.14),
            { offset: 0, duration: 1.6, freqStart: 110, freqEnd: 82, type: 'sine', volume: 0.08 }
        ];

        const level3Pattern = [
            { offset: 0, duration: 0.18, freqStart: 659, freqEnd: 698, type: 'sawtooth', volume: 0.26 },
            { offset: 0.2, duration: 0.18, freqStart: 698, freqEnd: 740, type: 'sawtooth', volume: 0.26 },
            { offset: 0.4, duration: 0.18, freqStart: 740, freqEnd: 784, type: 'sawtooth', volume: 0.26 },
            { offset: 0.6, duration: 0.24, freqStart: 831, type: 'triangle', volume: 0.25 },
            { offset: 0.9, duration: 0.24, freqStart: 880, freqEnd: 932, type: 'square', volume: 0.27 },
            { offset: 1.2, duration: 0.24, freqStart: 988, freqEnd: 1046, type: 'square', volume: 0.27 },
            { offset: 1.52, duration: 0.24, freqStart: 1174, type: 'triangle', volume: 0.25 },
            { offset: 1.86, duration: 0.24, freqStart: 1109, freqEnd: 1046, type: 'triangle', volume: 0.24 },
            { offset: 2.1, duration: 0.24, freqStart: 988, freqEnd: 932, type: 'triangle', volume: 0.24 },
            { offset: 2.34, duration: 0.42, freqStart: 880, freqEnd: 784, type: 'triangle', volume: 0.24 },
            ...commonPad(262, 0, 1.2, 0.16),
            ...commonPad(330, 1.1, 1.2, 0.16),
            ...commonPad(196, 2.2, 0.9, 0.12),
            { offset: 0, duration: 2.4, freqStart: 98, freqEnd: 73, type: 'sine', volume: 0.09 }
        ];

        const definitions = {
            1: { id: 'level-1', pattern: level1Pattern, loopPadding: AUDIO_SETTINGS.BACKGROUND_LOOP_PADDING, musicVolume: GAME_CONSTANTS.MUSIC_VOLUME },
            2: { id: 'level-2', pattern: level2Pattern, loopPadding: AUDIO_SETTINGS.BACKGROUND_LOOP_PADDING, musicVolume: 0.2 },
            3: { id: 'level-3', pattern: level3Pattern, loopPadding: 0.55, musicVolume: 0.22 }
        };

        return definitions[level] || definitions[1];
    }

    computePatternDuration(pattern) {
        if (!pattern || !pattern.length) {
            return 0;
        }
        return pattern.reduce((max, note) => {
            const duration = this.scene.valueOrDefault(note.duration, 0);
            const end = this.scene.valueOrDefault(note.offset, 0) + duration;
            return end > max ? end : max;
        }, 0);
    }

    configureLevelMusic() {
        const definition = this.getMusicDefinitionForLevel(this.scene.level) || {};
        const pattern = Array.isArray(definition.pattern) ? definition.pattern : [];
        this.levelMusicId = definition.id || `level-${this.scene.level}`;
        this.backgroundPattern = pattern.slice();
        const baseDuration = this.computePatternDuration(this.backgroundPattern);
        const padding = this.scene.valueOrDefault(definition.loopPadding, AUDIO_SETTINGS.BACKGROUND_LOOP_PADDING);
        this.backgroundPatternDuration = baseDuration + padding;
        this.musicVolume = this.scene.valueOrDefault(definition.musicVolume, GAME_CONSTANTS.MUSIC_VOLUME);

        if (this.musicGainNode) {
            try {
                const context = this.scene.sound.context;
                this.musicGainNode.gain.cancelScheduledValues(context.currentTime);
                const target = this.musicMuted ? 0 : this.musicVolume;
                this.musicGainNode.gain.setTargetAtTime(target, context.currentTime, GAME_CONSTANTS.AUDIO_FADE_TIME);
            } catch (err) {
                // ignore
            }
        }

        this.stopBackgroundMusic();
        this.updateMusicToggleVisual();
    }

    loadMusicPreference() {
        if (!this.scene.storageAvailable || typeof window === 'undefined' || !window.localStorage) {
            return false;
        }
        try {
            const raw = window.localStorage.getItem(AUDIO_SETTINGS.MUSIC_MUTED_KEY);
            if (raw === null || raw === undefined) {
                return false;
            }
            return raw === 'true';
        } catch (err) {
            return false;
        }
    }

    saveMusicPreference(muted) {
        if (!this.scene.storageAvailable || typeof window === 'undefined' || !window.localStorage) {
            return;
        }
        try {
            window.localStorage.setItem(AUDIO_SETTINGS.MUSIC_MUTED_KEY, muted ? 'true' : 'false');
        } catch (err) {
            this.scene.storageAvailable = false;
        }
    }

    setMusicMuted(muted, options = {}) {
        const desired = !!muted;
        const changed = desired !== this.musicMuted;
        this.musicMuted = desired;
        if (this.canUseWebAudio()) {
            if (!this.musicGainNode) {
                this.setupAudioPipeline({ skipAutoStart: true });
            }
            if (this.musicGainNode) {
                const context = this.scene.sound.context;
                const target = this.musicMuted ? 0 : (this.musicVolume || GAME_CONSTANTS.MUSIC_VOLUME);
                try {
                    this.musicGainNode.gain.cancelScheduledValues(context.currentTime);
                } catch (err) {
                    // ignore
                }
                this.musicGainNode.gain.setTargetAtTime(target, context.currentTime, GAME_CONSTANTS.AUDIO_FADE_TIME);
            }
        }
        this.updateMusicToggleVisual();
        if (!options.skipSave) {
            this.saveMusicPreference(this.musicMuted);
        }
        return changed;
    }

    toggleMusicMute() {
        this.setMusicMuted(!this.musicMuted);
    }

    updateMusicToggleVisual() {
        if (this.scene && this.scene.uiManager && typeof this.scene.uiManager.updateMusicToggleVisual === 'function') {
            this.scene.uiManager.updateMusicToggleVisual(this.musicMuted);
            return;
        }
        if (!this.musicToggleButton) {
            return;
        }
        const textureKey = this.musicMuted ? 'musicToggleOff' : 'musicToggleOn';
        this.musicToggleButton.setTexture(textureKey);
        this.musicToggleButton.setAlpha(this.musicMuted ? 0.75 : 0.95);
    }
}
