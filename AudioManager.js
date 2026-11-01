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

    setupAudioPipeline(options = {}) {
        return this.voice.setupAudioPipeline(options, this.music);
    }

    installAudioUnlockHandler(...args) {
        return this.music.installAudioUnlockHandler(...args);
    }

    pumpMusicScheduler(...args) {
        return this.music.pumpMusicScheduler(...args);
    }

    scheduleBackgroundPattern(...args) {
        return this.music.scheduleBackgroundPattern(...args);
    }

    duckMusic(...args) {
        return this.music.duckMusic(...args);
    }

    getMusicDefinitionForLevel(...args) {
        return this.music.getMusicDefinitionForLevel(...args);
    }

    configureLevelMusic(...args) {
        return this.music.configureLevelMusic(...args);
    }

    loadMusicPreference(...args) {
        return this.music.loadMusicPreference(...args);
    }

    setMusicMuted(...args) {
        return this.music.setMusicMuted(...args);
    }

    toggleMusicMute(...args) {
        return this.music.toggleMusicMute(...args);
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

    playWaveSound(...args) {
        return this.sfx.playWaveSound(...args);
    }

    playStartSound(...args) {
        return this.sfx.playStartSound(...args);
    }

    playHazardHitSound(...args) {
        return this.sfx.playHazardHitSound(...args);
    }

    playBearTelegraph(...args) {
        return this.sfx.playBearTelegraph(...args);
    }
}
