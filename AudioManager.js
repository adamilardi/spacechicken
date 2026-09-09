import { AUDIO_SETTINGS, GAME_CONSTANTS } from './Constants.js';
import { getMusicDefinition } from './MusicConfig.js';

const SILENCE = 0.0001;
const DEFAULT_TONE_DURATION = 0.2;
const NOISE_BUFFER_SECONDS = 2;
const DRIVE_CURVES = new Map();

function driveCurve(amount) {
    let curve = DRIVE_CURVES.get(amount);
    if (curve) {
        return curve;
    }
    curve = new Float32Array(256);
    for (let i = 0; i < curve.length; i++) {
        const x = (i / (curve.length - 1)) * 2 - 1;
        curve[i] = Math.tanh(x * amount);
    }
    DRIVE_CURVES.set(amount, curve);
    return curve;
}

export class AudioManager {
    constructor(scene) {
        this.scene = scene;
        this.musicGainNode = null;
        this.effectsGainNode = null;
        this.masterCompressorNode = null;
        this.musicFilterNode = null;
        this.musicDelayNode = null;
        this.musicDelayFeedbackNode = null;
        this.musicDelayWetNode = null;
        this.noiseBuffer = null;
        this.backgroundLoopEvent = null;
        this.backgroundPattern = [];
        this.backgroundPatternDuration = 0;
        this.backgroundSources = new Set();
        this.activeEffects = new Set();
        this.musicMuted = false;
        this.musicVolume = GAME_CONSTANTS.MUSIC_VOLUME;
        this.audioUnlocked = false;
        this.audioUnlockHandler = null;
        this.audioUnlockInProgress = false;
        this.destroyed = false;
    }

    canUseWebAudio() {
        return (
            this.scene.sound &&
            this.scene.sound.context &&
            typeof this.scene.sound.context.createOscillator === 'function'
        );
    }

    getAudioDestination() {
        const context = this.scene.sound.context;
        return this.scene.sound.masterGainNode || context.destination;
    }

    setAudioParam(param, value, time) {
        if (!param) {
            return;
        }
        if (typeof param.setValueAtTime === 'function') {
            param.setValueAtTime(value, time);
        } else {
            param.value = value;
        }
    }

    setupAudioPipeline(options = {}) {
        if (this.destroyed || !this.canUseWebAudio()) {
            return;
        }

        const context = this.scene.sound.context;
        const destination = this.getAudioDestination();
        const skipAutoStart = options.skipAutoStart === true;

        if (!this.masterCompressorNode && typeof context.createDynamicsCompressor === 'function') {
            this.masterCompressorNode = context.createDynamicsCompressor();
            this.setAudioParam(this.masterCompressorNode.threshold, -16, context.currentTime);
            this.setAudioParam(this.masterCompressorNode.knee, 18, context.currentTime);
            this.setAudioParam(this.masterCompressorNode.ratio, 4, context.currentTime);
            this.setAudioParam(this.masterCompressorNode.attack, 0.006, context.currentTime);
            this.setAudioParam(this.masterCompressorNode.release, 0.22, context.currentTime);
            this.masterCompressorNode.connect(destination);
        }
        const mixDestination = this.masterCompressorNode || destination;

        if (!this.musicGainNode) {
            this.musicGainNode = context.createGain();
            this.setAudioParam(
                this.musicGainNode.gain,
                this.musicMuted ? 0 : this.musicVolume,
                context.currentTime
            );

            this.musicFilterNode = context.createBiquadFilter();
            this.musicFilterNode.type = 'lowpass';
            this.setAudioParam(this.musicFilterNode.frequency, 12500, context.currentTime);
            this.setAudioParam(this.musicFilterNode.Q, 0.35, context.currentTime);
            this.musicGainNode.connect(this.musicFilterNode);
            this.musicFilterNode.connect(mixDestination);
            this.setupMusicDelay(mixDestination);
        } else {
            this.fadeMusicBus(this.musicMuted ? 0 : this.musicVolume);
        }

        if (!this.effectsGainNode) {
            this.effectsGainNode = context.createGain();
            this.setAudioParam(
                this.effectsGainNode.gain,
                GAME_CONSTANTS.EFFECTS_VOLUME,
                context.currentTime
            );
            this.effectsGainNode.connect(mixDestination);
        }

        if (!this.backgroundPattern.length) {
            this.configureLevelMusic();
        }
        this.installAudioUnlockHandler(skipAutoStart);
    }

    setupMusicDelay(destination) {
        const context = this.scene.sound.context;
        if (typeof context.createDelay !== 'function') {
            return;
        }

        this.musicDelayNode = context.createDelay(1);
        this.musicDelayFeedbackNode = context.createGain();
        this.musicDelayWetNode = context.createGain();
        this.setAudioParam(this.musicDelayNode.delayTime, 0.285, context.currentTime);
        this.setAudioParam(this.musicDelayFeedbackNode.gain, 0.19, context.currentTime);
        this.setAudioParam(this.musicDelayWetNode.gain, 0.12, context.currentTime);

        this.musicGainNode.connect(this.musicDelayNode);
        this.musicDelayNode.connect(this.musicDelayFeedbackNode);
        this.musicDelayFeedbackNode.connect(this.musicDelayNode);
        this.musicDelayNode.connect(this.musicDelayWetNode);
        this.musicDelayWetNode.connect(destination);
    }

    installAudioUnlockHandler(skipAutoStart) {
        const context = this.scene.sound.context;
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
            if (this.audioUnlocked || this.audioUnlockInProgress || this.destroyed) {
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
                if (!this.destroyed) {
                    this.installAudioUnlockHandler(false);
                }
                return;
            }

            this.audioUnlockInProgress = false;
            if (this.destroyed) {
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
        if (this.scene.input) {
            this.scene.input.once('pointerdown', unlock, this);
        }
        if (this.scene.input && this.scene.input.keyboard) {
            this.scene.input.keyboard.once('keydown', unlock, this);
        }
    }

    removeAudioUnlockHandler(handler = this.audioUnlockHandler) {
        if (!handler) {
            return;
        }
        if (this.scene.input) {
            this.scene.input.off('pointerdown', handler, this);
        }
        if (this.scene.input && this.scene.input.keyboard) {
            this.scene.input.keyboard.off('keydown', handler, this);
        }
        if (handler === this.audioUnlockHandler) {
            this.audioUnlockHandler = null;
        }
    }

    fadeMusicBus(target) {
        if (!this.musicGainNode || !this.canUseWebAudio()) {
            return;
        }
        const context = this.scene.sound.context;
        try {
            this.musicGainNode.gain.cancelScheduledValues(context.currentTime);
            this.musicGainNode.gain.setTargetAtTime(
                target,
                context.currentTime,
                GAME_CONSTANTS.AUDIO_FADE_TIME
            );
        } catch (error) {
            this.setAudioParam(this.musicGainNode.gain, target, context.currentTime);
        }
    }

    startBackgroundMusic() {
        if (this.destroyed || !this.canUseWebAudio() || !this.audioUnlocked) {
            return;
        }
        if (!this.musicGainNode) {
            this.setupAudioPipeline({ skipAutoStart: true });
        }
        if (!this.musicGainNode || this.backgroundLoopEvent || !this.backgroundPattern.length) {
            return;
        }

        const context = this.scene.sound.context;
        const schedule = () => {
            this.scheduleBackgroundPattern(
                context.currentTime + GAME_CONSTANTS.AUDIO_UNLOCK_TOLERANCE
            );
        };
        schedule();
        this.backgroundLoopEvent = this.scene.time.addEvent({
            delay: Math.max(1000, this.backgroundPatternDuration * 1000),
            loop: true,
            callback: schedule,
        });
    }

    scheduleBackgroundPattern(baseTime) {
        if (!this.backgroundPattern.length || !this.canUseWebAudio()) {
            return;
        }
        this.backgroundPattern.forEach((event) => this.scheduleMusicEvent(event, baseTime));
    }

    scheduleMusicEvent(event, baseTime) {
        const options = {
            ...event,
            startTime: baseTime + event.offset,
            destination: this.musicGainNode,
            trackSet: this.backgroundSources,
        };
        switch (event.kind) {
            case 'kick':
                this.playKick(options);
                break;
            case 'snare':
                this.playSnare(options);
                break;
            case 'hat':
                this.playHat(options);
                break;
            case 'noise':
                this.playNoise(options);
                break;
            default:
                this.playTone(options);
        }
    }

    stopTrackedSources(sourceSet) {
        sourceSet.forEach((source) => {
            try {
                source.stop();
            } catch (_error) {
                // already stopped
            }
        });
        sourceSet.clear();
    }

    stopBackgroundMusic() {
        if (this.backgroundLoopEvent) {
            this.backgroundLoopEvent.remove();
            this.backgroundLoopEvent = null;
        }
        this.stopTrackedSources(this.backgroundSources);
    }

    stopAllEffects() {
        this.stopTrackedSources(this.activeEffects);
    }

    safeDisconnect(node) {
        if (!node || typeof node.disconnect !== 'function') {
            return;
        }
        try {
            node.disconnect();
        } catch (_error) {
            // already disconnected
        }
    }

    cleanupAudio() {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        this.stopBackgroundMusic();
        this.stopAllEffects();
        this.removeAudioUnlockHandler();

        [
            this.musicGainNode,
            this.effectsGainNode,
            this.musicFilterNode,
            this.musicDelayNode,
            this.musicDelayFeedbackNode,
            this.musicDelayWetNode,
            this.masterCompressorNode,
        ].forEach((node) => this.safeDisconnect(node));

        this.musicGainNode = null;
        this.effectsGainNode = null;
        this.musicFilterNode = null;
        this.musicDelayNode = null;
        this.musicDelayFeedbackNode = null;
        this.musicDelayWetNode = null;
        this.masterCompressorNode = null;
        this.noiseBuffer = null;
        this.audioUnlocked = false;
        this.audioUnlockInProgress = false;
    }

    applyEnvelope(param, startTime, duration, options) {
        let attack = Math.max(0.001, options.attackTime ?? 0.008);
        let decay = Math.max(0.001, options.decayTime ?? 0.04);
        let release = Math.max(0.001, options.releaseTime ?? Math.min(0.18, duration * 0.55));
        const phaseTotal = attack + decay + release;
        if (phaseTotal > duration * 0.96) {
            const scale = (duration * 0.96) / phaseTotal;
            attack *= scale;
            decay *= scale;
            release *= scale;
        }
        const peak = Math.max(SILENCE, options.volume ?? 0.2);
        const sustain = Math.max(SILENCE, peak * (options.sustain ?? 0.72));
        const endTime = startTime + duration;
        const attackEnd = startTime + attack;
        const decayEnd = attackEnd + decay;
        const releaseStart = Math.max(decayEnd, endTime - release);

        param.cancelScheduledValues(startTime);
        param.setValueAtTime(SILENCE, startTime);
        param.linearRampToValueAtTime(peak, Math.max(startTime + 0.001, attackEnd));
        param.linearRampToValueAtTime(sustain, Math.max(attackEnd + 0.001, decayEnd));
        param.setValueAtTime(sustain, releaseStart);
        param.exponentialRampToValueAtTime(SILENCE, endTime);
    }

    createVoiceChain(options, startTime, duration) {
        const context = this.scene.sound.context;
        const destination =
            options.destination || this.effectsGainNode || this.getAudioDestination();
        const gainNode = context.createGain();
        this.applyEnvelope(gainNode.gain, startTime, duration, options);
        const nodes = [gainNode];
        let inputNode = gainNode;

        if (options.drive && context.createWaveShaper) {
            const driveNode = context.createWaveShaper();
            driveNode.curve = driveCurve(Math.max(1, options.drive));
            driveNode.oversample = '2x';
            driveNode.connect(inputNode);
            inputNode = driveNode;
            nodes.push(driveNode);
        }

        if (options.filter) {
            const filterNode = context.createBiquadFilter();
            filterNode.type = options.filter.type || 'lowpass';
            const frequency = Math.max(20, options.filter.frequency || 1800);
            this.setAudioParam(filterNode.frequency, frequency, startTime);
            if (options.filter.endFrequency) {
                filterNode.frequency.exponentialRampToValueAtTime(
                    Math.max(20, options.filter.endFrequency),
                    startTime + duration
                );
            }
            this.setAudioParam(filterNode.Q, options.filter.Q ?? 0.7, startTime);
            filterNode.connect(inputNode);
            inputNode = filterNode;
            nodes.push(filterNode);
        }

        if (typeof context.createStereoPanner === 'function' && typeof options.pan === 'number') {
            const pannerNode = context.createStereoPanner();
            this.setAudioParam(pannerNode.pan, Math.max(-1, Math.min(1, options.pan)), startTime);
            gainNode.connect(pannerNode);
            pannerNode.connect(destination);
            nodes.push(pannerNode);
        } else {
            gainNode.connect(destination);
        }

        return { inputNode, nodes };
    }

    trackSources(sources, nodes, trackingSet) {
        const remaining = new Set(sources);
        const cleanupSource = (source) => {
            remaining.delete(source);
            trackingSet.delete(source);
            this.safeDisconnect(source);
            if (!remaining.size) {
                nodes.forEach((node) => this.safeDisconnect(node));
            }
        };

        sources.forEach((source) => {
            trackingSet.add(source);
            source.onended = () => cleanupSource(source);
        });
    }

    playTone(options = {}) {
        if (this.destroyed || !this.canUseWebAudio()) {
            return null;
        }

        const context = this.scene.sound.context;
        const startTime = options.startTime ?? context.currentTime;
        const duration = Math.max(0.025, options.duration || DEFAULT_TONE_DURATION);
        const freqStart = Math.max(20, options.freqStart || options.freqEnd || 440);
        const freqEnd = Math.max(20, options.freqEnd || freqStart);
        const trackingSet = options.trackSet || this.activeEffects;
        const chain = this.createVoiceChain(options, startTime, duration);
        const partials = [{ ratio: 1, gain: 1, detune: 0 }, ...(options.harmonics || [])];
        const sources = [];
        const partialNodes = [];

        partials.forEach((partial) => {
            const oscillator = context.createOscillator();
            const partialGain = context.createGain();
            oscillator.type = partial.type || options.type || 'sine';
            oscillator.frequency.setValueAtTime(freqStart * partial.ratio, startTime);
            if (freqEnd !== freqStart) {
                oscillator.frequency.exponentialRampToValueAtTime(
                    freqEnd * partial.ratio,
                    startTime + duration
                );
            }
            oscillator.detune.setValueAtTime(
                (options.detune || 0) + (partial.detune || 0),
                startTime
            );
            this.setAudioParam(partialGain.gain, partial.gain, startTime);
            oscillator.connect(partialGain);
            partialGain.connect(chain.inputNode);
            oscillator.start(startTime);
            oscillator.stop(startTime + duration + 0.03);
            sources.push(oscillator);
            partialNodes.push(partialGain);
        });

        this.trackSources(sources, [...partialNodes, ...chain.nodes], trackingSet);
        return sources[0];
    }

    createNoiseBuffer() {
        if (this.noiseBuffer || !this.canUseWebAudio()) {
            return this.noiseBuffer;
        }
        const context = this.scene.sound.context;
        if (typeof context.createBuffer !== 'function') {
            return null;
        }
        const frameCount = Math.max(1, Math.floor(context.sampleRate * NOISE_BUFFER_SECONDS));
        const buffer = context.createBuffer(1, frameCount, context.sampleRate);
        const samples = buffer.getChannelData(0);
        let previous = 0;
        for (let i = 0; i < samples.length; i++) {
            const white = Math.random() * 2 - 1;
            previous = previous * 0.86 + white * 0.14;
            samples[i] = optionsForNoiseColor(white, previous);
        }
        this.noiseBuffer = buffer;
        return buffer;
    }

    playNoise(options = {}) {
        if (this.destroyed || !this.canUseWebAudio()) {
            return null;
        }
        const context = this.scene.sound.context;
        if (typeof context.createBufferSource !== 'function') {
            return null;
        }
        const buffer = this.createNoiseBuffer();
        if (!buffer) {
            return null;
        }

        const startTime = options.startTime ?? context.currentTime;
        const duration = Math.max(0.02, options.duration || 0.12);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = duration > NOISE_BUFFER_SECONDS;
        this.setAudioParam(source.playbackRate, options.playbackRate || 1, startTime);
        const chain = this.createVoiceChain(options, startTime, duration);
        source.connect(chain.inputNode);
        const availableOffset = Math.max(0, NOISE_BUFFER_SECONDS - duration);
        const noiseOffset = options.noiseOffset ?? Math.random() * availableOffset;
        source.start(startTime, noiseOffset);
        source.stop(startTime + duration + 0.02);
        this.trackSources([source], chain.nodes, options.trackSet || this.activeEffects);
        return source;
    }

    playKick(options = {}) {
        const startTime = options.startTime ?? this.scene.sound.context.currentTime;
        const volume = options.volume ?? 0.2;
        const common = {
            startTime,
            destination: options.destination,
            trackSet: options.trackSet,
        };
        this.playTone({
            ...common,
            freqStart: 138,
            freqEnd: 43,
            duration: 0.24,
            type: 'sine',
            volume,
            attackTime: 0.002,
            decayTime: 0.035,
            sustain: 0.32,
            releaseTime: 0.16,
            drive: 1.8,
        });
        this.playNoise({
            ...common,
            duration: 0.028,
            volume: volume * 0.24,
            attackTime: 0.001,
            releaseTime: 0.022,
            filter: { type: 'highpass', frequency: 3200, Q: 0.4 },
        });
    }

    playSnare(options = {}) {
        const startTime = options.startTime ?? this.scene.sound.context.currentTime;
        const volume = options.volume ?? 0.12;
        const common = {
            startTime,
            destination: options.destination,
            trackSet: options.trackSet,
            pan: options.pan,
        };
        this.playNoise({
            ...common,
            duration: 0.18,
            volume,
            attackTime: 0.002,
            decayTime: 0.025,
            sustain: 0.38,
            releaseTime: 0.13,
            filter: { type: 'bandpass', frequency: 1850, Q: 0.72 },
            drive: 1.35,
        });
        this.playTone({
            ...common,
            freqStart: 205,
            freqEnd: 132,
            duration: 0.12,
            type: 'triangle',
            volume: volume * 0.44,
            attackTime: 0.002,
            releaseTime: 0.09,
        });
    }

    playHat(options = {}) {
        return this.playNoise({
            ...options,
            duration: options.duration || 0.055,
            volume: options.volume ?? 0.04,
            attackTime: 0.001,
            decayTime: 0.012,
            sustain: 0.18,
            releaseTime: Math.max(0.018, (options.duration || 0.055) * 0.72),
            filter: { type: 'highpass', frequency: 6200, Q: 0.45 },
        });
    }

    playJumpSound() {
        if (!this.canUseWebAudio()) {
            return;
        }
        const now = this.scene.sound.context.currentTime;
        this.playTone({
            freqStart: 285,
            freqEnd: 760,
            duration: 0.2,
            type: 'triangle',
            volume: 0.22,
            attackTime: 0.003,
            decayTime: 0.045,
            sustain: 0.48,
            releaseTime: 0.11,
            filter: { type: 'lowpass', frequency: 3100, endFrequency: 1850, Q: 1.1 },
            harmonics: [{ ratio: 2, gain: 0.12, detune: 5 }],
            pan: -0.08,
            startTime: now,
        });
        this.playTone({
            freqStart: 112,
            freqEnd: 72,
            duration: 0.13,
            type: 'sine',
            volume: 0.13,
            attackTime: 0.002,
            releaseTime: 0.1,
            startTime: now,
        });
        this.playNoise({
            duration: 0.07,
            volume: 0.055,
            attackTime: 0.002,
            releaseTime: 0.055,
            filter: { type: 'bandpass', frequency: 2400, Q: 0.8 },
            pan: 0.12,
            startTime: now + 0.015,
        });
    }

    playJetpackSound() {
        if (!this.canUseWebAudio()) {
            return;
        }
        const now = this.scene.sound.context.currentTime;
        this.playNoise({
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
        this.playTone({
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
            this.playTone({
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
        if (!this.canUseWebAudio()) {
            return;
        }
        const now = this.scene.sound.context.currentTime;
        [76, 80, 83, 88].forEach((midiNote, index) => {
            const frequency = 440 * 2 ** ((midiNote - 69) / 12);
            this.playTone({
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
        this.playNoise({
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

    playLandSound() {
        if (!this.canUseWebAudio()) {
            return;
        }
        const now = this.scene.sound.context.currentTime;
        this.playNoise({
            duration: 0.07,
            volume: 0.07,
            attackTime: 0.001,
            releaseTime: 0.055,
            filter: { type: 'lowpass', frequency: 1400, endFrequency: 420, Q: 0.6 },
            pan: 0.06,
            startTime: now,
        });
        this.playTone({
            freqStart: 148,
            freqEnd: 72,
            duration: 0.09,
            type: 'sine',
            volume: 0.07,
            attackTime: 0.002,
            releaseTime: 0.07,
            startTime: now,
        });
    }

    playStartSound() {
        if (!this.canUseWebAudio()) {
            return;
        }
        const now = this.scene.sound.context.currentTime;
        [64, 68, 71, 76].forEach((midiNote, index) => {
            const frequency = 440 * 2 ** ((midiNote - 69) / 12);
            this.playTone({
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
                startTime: now + index * 0.05,
            });
        });
    }

    playHazardHitSound() {
        if (!this.canUseWebAudio()) {
            return;
        }
        const now = this.scene.sound.context.currentTime;
        this.playKick({ startTime: now, volume: 0.34 });
        this.playNoise({
            duration: 0.62,
            volume: 0.24,
            attackTime: 0.002,
            decayTime: 0.08,
            sustain: 0.42,
            releaseTime: 0.44,
            filter: { type: 'lowpass', frequency: 2100, endFrequency: 260, Q: 0.8 },
            drive: 2.4,
            startTime: now,
        });
        this.playTone({
            freqStart: 196,
            freqEnd: 38,
            duration: 0.72,
            type: 'sawtooth',
            volume: 0.2,
            attackTime: 0.003,
            decayTime: 0.07,
            sustain: 0.44,
            releaseTime: 0.5,
            filter: { type: 'lowpass', frequency: 780, endFrequency: 180, Q: 2.1 },
            harmonics: [
                { ratio: 0.5, gain: 0.42, detune: -9 },
                { ratio: 1.414, gain: 0.12, detune: 11 },
            ],
            drive: 2.1,
            startTime: now,
        });
        this.playTone({
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
        const definition = this.getMusicDefinitionForLevel(this.scene.level);
        this.levelMusicId = definition.id;
        this.backgroundPattern = definition.pattern.slice();
        this.backgroundPatternDuration =
            definition.loopDuration ||
            this.computePatternDuration(this.backgroundPattern) +
                AUDIO_SETTINGS.BACKGROUND_LOOP_PADDING;
        this.musicVolume = definition.musicVolume ?? GAME_CONSTANTS.MUSIC_VOLUME;
        this.fadeMusicBus(this.musicMuted ? 0 : this.musicVolume);
        this.stopBackgroundMusic();
        this.updateMusicToggleVisual();
    }

    loadMusicPreference() {
        if (!this.scene.storageAvailable || typeof window === 'undefined' || !window.localStorage) {
            return false;
        }
        try {
            return window.localStorage.getItem(AUDIO_SETTINGS.MUSIC_MUTED_KEY) === 'true';
        } catch (error) {
            return false;
        }
    }

    saveMusicPreference(muted) {
        if (!this.scene.storageAvailable || typeof window === 'undefined' || !window.localStorage) {
            return;
        }
        try {
            window.localStorage.setItem(AUDIO_SETTINGS.MUSIC_MUTED_KEY, muted ? 'true' : 'false');
        } catch (error) {
            this.scene.storageAvailable = false;
        }
    }

    setMusicMuted(muted, options = {}) {
        const desired = Boolean(muted);
        const changed = desired !== this.musicMuted;
        this.musicMuted = desired;
        if (this.canUseWebAudio() && !this.musicGainNode) {
            this.setupAudioPipeline({ skipAutoStart: true });
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
        this.scene?.uiManager?.updateMusicToggleVisual?.(this.musicMuted);
    }
}

function optionsForNoiseColor(white, smoothed) {
    return white * 0.72 + smoothed * 0.28;
}
