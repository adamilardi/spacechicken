import { VoiceCore } from './audio/voice.js';
import { MusicDirector } from './audio/music.js';
import { SfxSynth } from './audio/sfx.js';

export class AudioManager {
    constructor(scene) {
        this.scene = scene;
        this.voice = new VoiceCore(scene);
        this.music = new MusicDirector(this.voice);
        this.sfx = new SfxSynth(this.voice, this.music);
    }

    get musicMuted() {
        return this.music.musicMuted;
    }

    set musicMuted(muted) {
        this.music.musicMuted = muted;
    }

    cleanupAudio() {
        if (this.voice.destroyed) {
            return;
        }
        this.voice.destroyed = true;
        this.music.stopBackgroundMusic();
        this.voice.stopAllEffects();
        this.music.removeAudioUnlockHandler();
        this.voice.disconnectPipeline();
        this.music.audioUnlocked = false;
        this.music.audioUnlockInProgress = false;
    }

    canUseWebAudio(...args) {
        return this.voice.canUseWebAudio(...args);
    }

    getAudioDestination(...args) {
        return this.voice.getAudioDestination(...args);
    }

    setAudioParam(...args) {
        return this.voice.setAudioParam(...args);
    }

    setupAudioPipeline(options = {}) {
        return this.voice.setupAudioPipeline(options, this.music);
    }

    stopTrackedSources(...args) {
        return this.voice.stopTrackedSources(...args);
    }

    stopAllEffects(...args) {
        return this.voice.stopAllEffects(...args);
    }

    safeDisconnect(...args) {
        return this.voice.safeDisconnect(...args);
    }

    applyEnvelope(...args) {
        return this.voice.applyEnvelope(...args);
    }

    createVoiceChain(...args) {
        return this.voice.createVoiceChain(...args);
    }

    trackSources(...args) {
        return this.voice.trackSources(...args);
    }

    playTone(...args) {
        return this.voice.playTone(...args);
    }

    createNoiseBuffer(...args) {
        return this.voice.createNoiseBuffer(...args);
    }

    playNoise(...args) {
        return this.voice.playNoise(...args);
    }

    playKick(...args) {
        return this.voice.playKick(...args);
    }

    playSnare(...args) {
        return this.voice.playSnare(...args);
    }

    playHat(...args) {
        return this.voice.playHat(...args);
    }

    setupMusicDelay(...args) {
        return this.music.setupMusicDelay(...args);
    }

    applyMusicSpace(...args) {
        return this.music.applyMusicSpace(...args);
    }

    installAudioUnlockHandler(...args) {
        return this.music.installAudioUnlockHandler(...args);
    }

    removeAudioUnlockHandler(...args) {
        return this.music.removeAudioUnlockHandler(...args);
    }

    fadeMusicBus(...args) {
        return this.music.fadeMusicBus(...args);
    }

    startBackgroundMusic(...args) {
        return this.music.startBackgroundMusic(...args);
    }

    pumpMusicScheduler(...args) {
        return this.music.pumpMusicScheduler(...args);
    }

    scheduleBackgroundPattern(...args) {
        return this.music.scheduleBackgroundPattern(...args);
    }

    scheduleMusicEvent(...args) {
        return this.music.scheduleMusicEvent(...args);
    }

    stopBackgroundMusic(...args) {
        return this.music.stopBackgroundMusic(...args);
    }

    duckMusic(...args) {
        return this.music.duckMusic(...args);
    }

    getMusicDefinitionForLevel(...args) {
        return this.music.getMusicDefinitionForLevel(...args);
    }

    computePatternDuration(...args) {
        return this.music.computePatternDuration(...args);
    }

    configureLevelMusic(...args) {
        return this.music.configureLevelMusic(...args);
    }

    loadMusicPreference(...args) {
        return this.music.loadMusicPreference(...args);
    }

    saveMusicPreference(...args) {
        return this.music.saveMusicPreference(...args);
    }

    setMusicMuted(...args) {
        return this.music.setMusicMuted(...args);
    }

    toggleMusicMute(...args) {
        return this.music.toggleMusicMute(...args);
    }

    updateMusicToggleVisual(...args) {
        return this.music.updateMusicToggleVisual(...args);
    }

    playBonkSound(...args) {
        return this.sfx.playBonkSound(...args);
    }

    playFallDeathSound(...args) {
        return this.sfx.playFallDeathSound(...args);
    }

    playLaserDeathSound(...args) {
        return this.sfx.playLaserDeathSound(...args);
    }

    playBoarderThud(...args) {
        return this.sfx.playBoarderThud(...args);
    }

    playJumpSound(...args) {
        return this.sfx.playJumpSound(...args);
    }

    playPhaserSound(...args) {
        return this.sfx.playPhaserSound(...args);
    }

    playBoarderPop(...args) {
        return this.sfx.playBoarderPop(...args);
    }

    playJetpackSound(...args) {
        return this.sfx.playJetpackSound(...args);
    }

    playCollectSound(...args) {
        return this.sfx.playCollectSound(...args);
    }

    playLandSound(...args) {
        return this.sfx.playLandSound(...args);
    }

    maybePlayFootstep(...args) {
        return this.sfx.maybePlayFootstep(...args);
    }

    playFootstep(...args) {
        return this.sfx.playFootstep(...args);
    }

    playWaveSound(...args) {
        return this.sfx.playWaveSound(...args);
    }

    playStartSound(...args) {
        return this.sfx.playStartSound(...args);
    }

    playHazardHitSound(...args) {
        return this.sfx.playHazardHitSound(...args);
    }
}
