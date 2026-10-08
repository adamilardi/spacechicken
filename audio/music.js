import { AUDIO_SETTINGS, GAME_CONSTANTS } from '../Constants.js';
import { getMusicDefinition } from '../MusicConfig.js';

export class MusicDirector {
    constructor(voice) {
        this.voice = voice;
        this.backgroundLoopEvent = null;
        this.musicScheduler = null;
        this.nextMusicTime = 0;
        this.musicBpm = 112;
        this.backgroundPattern = [];
        this.backgroundPatternDuration = 0;
        this.backgroundSources = new Set();
        this.musicMuted = false;
        this.musicVolume = GAME_CONSTANTS.MUSIC_VOLUME;
        this.audioUnlocked = false;
        this.audioUnlockHandler = null;
        this.audioUnlockInProgress = false;
        this.levelMusicId = null;
    }

    setupMusicDelay(destination) {
        const context = this.voice.scene.sound.context;
        if (typeof context.createDelay !== 'function') {
            return;
        }

        this.voice.musicDelayNode = context.createDelay(1);
        this.voice.musicDelayFilterNode = context.createBiquadFilter();
        this.voice.musicDelayFilterNode.type = 'highpass';
        this.voice.musicDelayFeedbackNode = context.createGain();
        this.voice.musicDelayWetNode = context.createGain();
        this.voice.setAudioParam(this.voice.musicDelayNode.delayTime, 0.24, context.currentTime);
        this.voice.setAudioParam(
            this.voice.musicDelayFilterNode.frequency,
            520,
            context.currentTime
        );
        this.voice.setAudioParam(this.voice.musicDelayFilterNode.Q, 0.5, context.currentTime);
        this.voice.setAudioParam(this.voice.musicDelayFeedbackNode.gain, 0.16, context.currentTime);
        this.voice.setAudioParam(this.voice.musicDelayWetNode.gain, 0.09, context.currentTime);

        this.voice.musicGainNode.connect(this.voice.musicDelayNode);
        this.voice.musicDelayNode.connect(this.voice.musicDelayFilterNode);
        this.voice.musicDelayFilterNode.connect(this.voice.musicDelayFeedbackNode);
        this.voice.musicDelayFeedbackNode.connect(this.voice.musicDelayNode);
        this.voice.musicDelayFilterNode.connect(this.voice.musicDelayWetNode);
        this.voice.musicDelayWetNode.connect(destination);
    }

    applyMusicSpace() {
        if (!this.voice.canUseWebAudio() || !this.voice.musicDelayNode) {
            return;
        }
        const bpm = this.musicBpm || 112;
        const dottedEighth = (60 / bpm) * 0.75;
        const delayTime = Math.max(0.14, Math.min(0.42, dottedEighth));
        this.voice.setAudioParam(
            this.voice.musicDelayNode.delayTime,
            delayTime,
            this.voice.scene.sound.context.currentTime
        );
    }

    installAudioUnlockHandler(skipAutoStart) {
        const context = this.voice.scene.sound.context;
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

        const unlock = async () => {
            if (this.audioUnlocked || this.audioUnlockInProgress || this.voice.destroyed) {
                return;
            }
            this.audioUnlockInProgress = true;
            this.removeAudioUnlockHandler(unlock);
            try {
                if (context.state === 'suspended') {
                    await context.resume();
                }
            } catch (error) {
                this.audioUnlockInProgress = false;
                if (!this.voice.destroyed) {
                    this.installAudioUnlockHandler(false);
                }
                return;
            }

            this.audioUnlockInProgress = false;
            if (this.voice.destroyed) {
                return;
            }
            this.audioUnlocked = context.state === 'running';
            if (this.audioUnlocked) {
                this.startBackgroundMusic();
            } else {
                this.installAudioUnlockHandler(false);
            }
        };

        this.audioUnlockHandler = unlock;
        if (this.voice.scene.input) {
            this.voice.scene.input.once('pointerdown', unlock, this);
        }
        if (this.voice.scene.input && this.voice.scene.input.keyboard) {
            this.voice.scene.input.keyboard.once('keydown', unlock, this);
        }
    }

    removeAudioUnlockHandler(handler = this.audioUnlockHandler) {
        if (!handler) {
            return;
        }
        if (this.voice.scene.input) {
            this.voice.scene.input.off('pointerdown', handler, this);
        }
        if (this.voice.scene.input && this.voice.scene.input.keyboard) {
            this.voice.scene.input.keyboard.off('keydown', handler, this);
        }
        if (handler === this.audioUnlockHandler) {
            this.audioUnlockHandler = null;
        }
    }

    fadeMusicBus(target) {
        if (!this.voice.musicGainNode || !this.voice.canUseWebAudio()) {
            return;
        }
        const context = this.voice.scene.sound.context;
        try {
            this.voice.musicGainNode.gain.cancelScheduledValues(context.currentTime);
            this.voice.musicGainNode.gain.setTargetAtTime(
                target,
                context.currentTime,
                GAME_CONSTANTS.AUDIO_FADE_TIME
            );
        } catch (error) {
            this.voice.setAudioParam(this.voice.musicGainNode.gain, target, context.currentTime);
        }
    }

    startBackgroundMusic() {
        if (this.voice.destroyed || !this.voice.canUseWebAudio() || !this.audioUnlocked) {
            return;
        }
        if (!this.voice.musicGainNode) {
            this.voice.voice.setupAudioPipeline({ skipAutoStart: true }, this);
        }
        if (!this.voice.musicGainNode || this.musicScheduler || !this.backgroundPattern.length) {
            return;
        }

        const context = this.voice.scene.sound.context;
        this.nextMusicTime = context.currentTime + GAME_CONSTANTS.AUDIO_UNLOCK_TOLERANCE;
        const pump = () => this.pumpMusicScheduler();
        pump();
        this.musicScheduler = setInterval(pump, 250);
    }

    pumpMusicScheduler() {
        if (this.voice.destroyed || !this.audioUnlocked || !this.voice.canUseWebAudio()) {
            return;
        }
        const context = this.voice.scene.sound.context;
        if (context.state && context.state !== 'running') {
            return;
        }
        const duration = this.backgroundPatternDuration;
        if (!(duration > 0)) {
            return;
        }
        const horizon = context.currentTime + 1;
        let guard = 0;
        while (this.nextMusicTime < horizon && guard < 3) {
            this.scheduleBackgroundPattern(this.nextMusicTime);
            this.nextMusicTime += duration;
            guard += 1;
        }
    }

    scheduleBackgroundPattern(baseTime) {
        if (!this.backgroundPattern.length || !this.voice.canUseWebAudio()) {
            return;
        }
        this.backgroundPattern.forEach((event) => this.scheduleMusicEvent(event, baseTime));
    }

    scheduleMusicEvent(event, baseTime) {
        const options = {
            ...event,
            startTime:
                baseTime +
                event.offset +
                (event.kind === 'hat' ? (Math.random() - 0.5) * 0.006 : 0),
            destination: this.voice.musicGainNode,
            trackSet: this.backgroundSources,
        };
        switch (event.kind) {
            case 'kick':
                this.voice.playKick(options);
                break;
            case 'snare':
                this.voice.playSnare(options);
                break;
            case 'hat':
                this.voice.playHat(options);
                break;
            case 'noise':
                this.voice.playNoise(options);
                break;
            default:
                this.voice.playTone(options);
        }
    }

    stopBackgroundMusic() {
        if (this.musicScheduler) {
            clearInterval(this.musicScheduler);
            this.musicScheduler = null;
        }
        if (this.backgroundLoopEvent) {
            this.backgroundLoopEvent.remove();
            this.backgroundLoopEvent = null;
        }
        this.nextMusicTime = 0;
        this.voice.stopTrackedSources(this.backgroundSources);
    }

    duckMusic(holdMs = GAME_CONSTANTS.MUSIC_DUCK_MS) {
        if (
            this.voice.destroyed ||
            this.musicMuted ||
            !this.voice.musicGainNode ||
            !this.voice.canUseWebAudio()
        ) {
            return;
        }
        const gain = this.voice.musicGainNode.gain;
        if (
            typeof gain?.cancelScheduledValues !== 'function' ||
            typeof gain.setValueAtTime !== 'function' ||
            typeof gain.linearRampToValueAtTime !== 'function'
        ) {
            return;
        }
        const now = this.voice.scene.sound.context.currentTime;
        const quiet = this.musicVolume * 0.2;
        const hold = Math.max(0.05, holdMs / 1000);
        try {
            gain.cancelScheduledValues(now);
            gain.setValueAtTime(this.musicVolume, now);
            gain.linearRampToValueAtTime(quiet, now + 0.02);
            gain.setValueAtTime(quiet, now + hold);
            gain.linearRampToValueAtTime(this.musicVolume, now + hold + 0.06);
        } catch {
            this.fadeMusicBus(this.musicVolume);
        }
    }

    getMusicDefinitionForLevel(level) {
        return getMusicDefinition(level);
    }

    computePatternDuration(pattern) {
        if (!Array.isArray(pattern) || !pattern.length) {
            return 0;
        }
        return pattern.reduce((maximum, event) => {
            const offset = Number.isFinite(event.offset) ? event.offset : 0;
            const duration = Number.isFinite(event.duration) ? event.duration : 0;
            return Math.max(maximum, offset + duration);
        }, 0);
    }

    configureLevelMusic() {
        const definition = this.getMusicDefinitionForLevel(this.voice.scene.level);
        this.levelMusicId = definition.id;
        this.musicBpm = definition.bpm || 112;
        this.backgroundPattern = definition.pattern.slice();
        this.backgroundPatternDuration =
            definition.loopDuration ||
            this.computePatternDuration(this.backgroundPattern) +
                AUDIO_SETTINGS.BACKGROUND_LOOP_PADDING;
        this.musicVolume = definition.musicVolume ?? GAME_CONSTANTS.MUSIC_VOLUME;
        this.applyMusicSpace();
        this.fadeMusicBus(this.musicMuted ? 0 : this.musicVolume);
        const wasPlaying = Boolean(this.musicScheduler);
        this.stopBackgroundMusic();
        if (wasPlaying && this.audioUnlocked) {
            this.startBackgroundMusic();
        }
        this.updateMusicToggleVisual();
    }

    loadMusicPreference() {
        if (
            !this.voice.scene.storageAvailable ||
            typeof window === 'undefined' ||
            !window.localStorage
        ) {
            return false;
        }
        try {
            return window.localStorage.getItem(AUDIO_SETTINGS.MUSIC_MUTED_KEY) === 'true';
        } catch (error) {
            return false;
        }
    }

    saveMusicPreference(muted) {
        if (
            !this.voice.scene.storageAvailable ||
            typeof window === 'undefined' ||
            !window.localStorage
        ) {
            return;
        }
        try {
            window.localStorage.setItem(AUDIO_SETTINGS.MUSIC_MUTED_KEY, muted ? 'true' : 'false');
        } catch (error) {
            this.voice.scene.storageAvailable = false;
        }
    }

    setMusicMuted(muted, options = {}) {
        const desired = Boolean(muted);
        const changed = desired !== this.musicMuted;
        this.musicMuted = desired;
        if (this.voice.canUseWebAudio() && !this.voice.musicGainNode) {
            this.voice.voice.setupAudioPipeline({ skipAutoStart: true }, this);
        }
        this.fadeMusicBus(this.musicMuted ? 0 : this.musicVolume);
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
        this.voice.scene?.uiManager?.updateMusicToggleVisual?.(this.musicMuted);
    }
}
