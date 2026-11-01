import { createChickenFrames } from './sprites/chicken.js';
import { DECK_SPRITES, createLiftPlatform, createStationPanel } from './sprites/decks.js';
import { ENEMY_SPRITES, createDrone, createRover } from './sprites/enemies.js';
import {
    HAZARD_SPRITES,
    createBomb,
    createCliff,
    createLaserBeam,
    createLaserEmitter,
    createRock,
} from './sprites/hazards.js';
import { GUN_SPRITES } from './sprites/guns.js';
import { PROP_SPRITES, createCrown } from './sprites/props.js';
import { createParticleTextures, createVirtualButtons } from './sprites/chrome.js';

export class SpriteFactory {
    constructor(scene) {
        this.scene = scene;
    }

    addCanvasTexture(key, width, height, paint) {
        if (this.scene.textures.exists(key)) {
            return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        paint(canvas.getContext('2d'), width, height);
        this.scene.textures.addCanvas(key, canvas);
    }

    createChickenFrames() {
        createChickenFrames(this);
    }

    createCrown() {
        createCrown(this);
    }

    createCliff() {
        createCliff(this);
    }

    createRock() {
        createRock(this);
    }

    createBomb() {
        createBomb(this);
    }

    createStationPanel() {
        createStationPanel(this);
    }

    createLiftPlatform() {
        createLiftPlatform(this);
    }

    createLaserBeam() {
        createLaserBeam(this);
    }

    createLaserEmitter() {
        createLaserEmitter(this);
    }

    createDrone() {
        createDrone(this);
    }

    createRover() {
        createRover(this);
    }

    createParticleTextures() {
        createParticleTextures(this);
    }

    createVirtualButtons() {
        createVirtualButtons(this);
    }

    createExpeditionSprites() {
        const sprites = [
            ...DECK_SPRITES,
            ...ENEMY_SPRITES,
            ...HAZARD_SPRITES,
            ...GUN_SPRITES,
            ...PROP_SPRITES,
        ];
        sprites.forEach(([key, width, height, paint]) => {
            this.addCanvasTexture(key, width, height, paint);
        });
    }
}
