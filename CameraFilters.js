import { GAME_CONSTANTS } from './Constants.js';

// Camera-level Phaser 4 filters: a subtle fullscreen bloom so bright bolts,
// the crown, and lasers glow, plus a vignette that pulses as a player nears
// the crown. Both are WebGL-only and purely visual: gameplay, tests, and the
// Canvas fallback never depend on them.

function webglConstant() {
    if (typeof Phaser !== 'undefined' && typeof Phaser.WEBGL === 'number') {
        return Phaser.WEBGL;
    }
    return -1;
}

export function isWebGLRenderer(scene) {
    return scene?.game?.config?.renderType === webglConstant();
}

function bloomApi() {
    return typeof Phaser !== 'undefined' ? Phaser.Actions?.AddEffectBloom : null;
}

// Idempotent: a camera that already has our filters keeps them.
export function setupWorldCameraFilters(scene, camera) {
    if (!isWebGLRenderer(scene) || !camera?.filters?.external || camera.spaceChickenFilters) {
        return camera?.spaceChickenFilters || null;
    }
    const addBloom = bloomApi();
    if (typeof addBloom !== 'function') {
        return null;
    }
    const bloom = addBloom(camera, {
        threshold: GAME_CONSTANTS.BLOOM_THRESHOLD,
        blendAmount: GAME_CONSTANTS.BLOOM_BLEND_AMOUNT,
    })[0];
    const vignette = camera.filters.external.addVignette(
        0.5,
        0.5,
        GAME_CONSTANTS.VIGNETTE_RADIUS,
        0
    );
    vignette?.setActive?.(false);
    camera.spaceChickenFilters = { bloom: bloom || null, vignette: vignette || null };
    return camera.spaceChickenFilters;
}

export function updateFinaleVignette(scene) {
    if (
        !isWebGLRenderer(scene) ||
        !scene?.crown ||
        scene.crown.active === false ||
        scene.gameOver ||
        scene.isTransitioning ||
        scene.raceFinale
    ) {
        return;
    }
    const now = typeof scene.getGameTime === 'function' ? scene.getGameTime() : 0;
    const radiusPx = GAME_CONSTANTS.VIGNETTE_FINALE_RADIUS_PX;
    const pulse =
        0.65 + 0.35 * Math.sin((now / GAME_CONSTANTS.VIGNETTE_PULSE_PERIOD_MS) * Math.PI * 2);
    scene.forEachWorldCamera?.((camera) => {
        const vignette = camera?.spaceChickenFilters?.vignette;
        if (!vignette) {
            return;
        }
        const player = camera === scene.player2Camera ? scene.player2 : scene.player;
        if (!player) {
            vignette.setActive?.(false);
            return;
        }
        const distance = Math.hypot(player.x - scene.crown.x, player.y - scene.crown.y);
        const proximity = Math.max(0, Math.min(1, 1 - distance / radiusPx));
        const strength = GAME_CONSTANTS.VIGNETTE_MAX_STRENGTH * proximity * pulse;
        vignette.strength = strength;
        vignette.setActive?.(strength > 0.02);
    });
}

export function teardownWorldCameraFilters(scene) {
    scene?.forEachWorldCamera?.((camera) => {
        const filters = camera?.spaceChickenFilters;
        if (!filters) {
            return;
        }
        filters.bloom?.parallelFilters?.destroy?.();
        filters.vignette?.destroy?.();
        camera.spaceChickenFilters = null;
    });
}
