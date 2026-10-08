import { GAME_CONSTANTS } from '../Constants.js';

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

export class VoiceCore {
    constructor(scene) {
        this.scene = scene;
        this.musicGainNode = null;
        this.effectsGainNode = null;
        this.masterCompressorNode = null;
        this.musicFilterNode = null;
        this.musicDelayNode = null;
        this.musicDelayFilterNode = null;
        this.musicDelayFeedbackNode = null;
        this.musicDelayWetNode = null;
        this.noiseBuffer = null;
        this.activeEffects = new Set();
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

    setupAudioPipeline(options = {}, music) {
        if (this.destroyed || !this.canUseWebAudio()) {
            return;
        }

        const context = this.scene.sound.context;
        const destination = this.getAudioDestination();
        const skipAutoStart = options.skipAutoStart === true;

        if (!this.masterCompressorNode && typeof context.createDynamicsCompressor === 'function') {
            this.masterCompressorNode = context.createDynamicsCompressor();
            this.setAudioParam(this.masterCompressorNode.threshold, -14, context.currentTime);
            this.setAudioParam(this.masterCompressorNode.knee, 20, context.currentTime);
            this.setAudioParam(this.masterCompressorNode.ratio, 3, context.currentTime);
            this.setAudioParam(this.masterCompressorNode.attack, 0.004, context.currentTime);
            this.setAudioParam(this.masterCompressorNode.release, 0.16, context.currentTime);
            this.masterCompressorNode.connect(destination);
        }
        const mixDestination = this.masterCompressorNode || destination;

        if (!this.musicGainNode) {
            this.musicGainNode = context.createGain();
            this.setAudioParam(
                this.musicGainNode.gain,
                music.musicMuted ? 0 : music.musicVolume,
                context.currentTime
            );

            this.musicFilterNode = context.createBiquadFilter();
            this.musicFilterNode.type = 'lowpass';
            this.setAudioParam(this.musicFilterNode.frequency, 9200, context.currentTime);
            this.setAudioParam(this.musicFilterNode.Q, 0.45, context.currentTime);
            this.musicGainNode.connect(this.musicFilterNode);
            this.musicFilterNode.connect(mixDestination);
            music.setupMusicDelay(mixDestination);
        } else {
            music.fadeMusicBus(music.musicMuted ? 0 : music.musicVolume);
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

        if (!music.backgroundPattern.length) {
            music.configureLevelMusic();
        }
        music.applyMusicSpace();
        music.installAudioUnlockHandler(skipAutoStart);
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
            previous = previous * 0.82 + white * 0.18;
            samples[i] = white * 0.86 + previous * 0.14;
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
            freqStart: 176,
            freqEnd: 46,
            duration: 0.16,
            type: 'sine',
            volume,
            attackTime: 0.001,
            decayTime: 0.028,
            sustain: 0.2,
            releaseTime: 0.1,
            drive: 2.2,
            harmonics: [{ ratio: 0.5, gain: 0.62, type: 'sine' }],
        });
        this.playNoise({
            ...common,
            duration: 0.014,
            volume: volume * 0.4,
            attackTime: 0.001,
            releaseTime: 0.01,
            filter: { type: 'highpass', frequency: 1500, Q: 0.35 },
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
            duration: 0.13,
            volume,
            attackTime: 0.001,
            decayTime: 0.02,
            sustain: 0.28,
            releaseTime: 0.09,
            filter: { type: 'bandpass', frequency: 2400, Q: 0.9 },
            drive: 1.7,
        });
        this.playTone({
            ...common,
            freqStart: 198,
            freqEnd: 146,
            duration: 0.07,
            type: 'triangle',
            volume: volume * 0.36,
            attackTime: 0.001,
            releaseTime: 0.05,
        });
    }

    playHat(options = {}) {
        return this.playNoise({
            ...options,
            duration: options.duration || 0.045,
            volume: options.volume ?? 0.04,
            attackTime: 0.001,
            decayTime: 0.01,
            sustain: 0.14,
            releaseTime: Math.max(0.014, (options.duration || 0.045) * 0.7),
            playbackRate: 1.25,
            filter: { type: 'highpass', frequency: 7400, Q: 0.5 },
        });
    }

    disconnectPipeline() {
        [
            this.musicGainNode,
            this.effectsGainNode,
            this.musicFilterNode,
            this.musicDelayNode,
            this.musicDelayFilterNode,
            this.musicDelayFeedbackNode,
            this.musicDelayWetNode,
            this.masterCompressorNode,
        ].forEach((node) => this.safeDisconnect(node));

        this.musicGainNode = null;
        this.effectsGainNode = null;
        this.musicFilterNode = null;
        this.musicDelayNode = null;
        this.musicDelayFilterNode = null;
        this.musicDelayFeedbackNode = null;
        this.musicDelayWetNode = null;
        this.masterCompressorNode = null;
        this.noiseBuffer = null;
    }
}
