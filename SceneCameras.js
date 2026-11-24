import { GAME_CONSTANTS } from './Constants.js';
import { setupWorldCameraFilters } from './CameraFilters.js';
import { paneZoom, SPLIT_GAP, splitPanes } from './SplitScreen.js';

// Owns every camera: the follow camera, the fixed UI camera, the optional
// split-screen player-2 camera, and the split chrome (divider + P1/P2 tags).
// The scene keeps thin delegates so managers, bots, and tests keep calling
// scene.flashCamera(...) etc. unchanged; state they read directly
// (uiCamera, player2Camera, playCameraZoom) is forwarded the same way.
export class SceneCameras {
    constructor(scene) {
        this.scene = scene;
        this.reset();
    }

    reset() {
        this.uiCamera = null;
        this.player2Camera = null;
        this.splitDivider = null;
        this.splitLabels = null;
        this.playCameraZoom = 1;
        this.addedToSceneHandler = null;
    }

    setupCamera() {
        const scene = this.scene;
        const camera = this.getMainCamera();
        if (!camera) {
            return;
        }
        if (camera.startFollow) {
            camera.startFollow(
                scene.player,
                true,
                GAME_CONSTANTS.CAMERA_LERP_X,
                GAME_CONSTANTS.CAMERA_LERP_Y
            );
        }
        if (camera.setBounds) {
            camera.setBounds(0, 0, scene.worldWidth, scene.worldHeight);
        }
        camera.roundPixels = true;
        this.setupUiCamera();
        this.updateCameraForViewport();
        this.forEachWorldCamera((worldCamera) => setupWorldCameraFilters(scene, worldCamera));
    }

    setupUiCamera() {
        const scene = this.scene;
        if (!scene.cameras?.add || this.uiCamera) {
            return;
        }
        this.uiCamera = scene.cameras.add(
            0,
            0,
            scene.getViewportWidth(),
            scene.getViewportHeight()
        );
        if (this.uiCamera.setName) {
            this.uiCamera.setName('ui');
        }
        if (this.uiCamera.setScroll) {
            this.uiCamera.setScroll(0, 0);
        }
        this.uiCamera.roundPixels = true;
        this.uiCamera.transparent = true;
        if (this.uiCamera.setBackgroundColor) {
            this.uiCamera.setBackgroundColor({ r: 0, g: 0, b: 0, a: 0 });
        }
        this.addedToSceneHandler = (gameObject) => this.assignCameraFilter(gameObject);
        if (scene.events?.on) {
            scene.events.on('addedtoscene', this.addedToSceneHandler, scene);
        }
        this.bindExistingCameraFilters();
    }

    bindExistingCameraFilters() {
        const scene = this.scene;
        scene.uiManager?.markAllUiObjects?.();
        const list = Array.isArray(scene.children?.list) ? scene.children.list : [];
        for (let i = 0; i < list.length; i++) {
            this.assignCameraFilter(list[i]);
        }
    }

    // Routes each object to exactly one camera set via the cameraFilter
    // bitmask: UI-flagged objects are ignored by world cameras, everything
    // else is ignored by the UI camera. Objects without a numeric filter
    // (plain Graphics) use camera.ignore() instead.
    assignCameraFilter(gameObject) {
        const scene = this.scene;
        if (!gameObject || !this.uiCamera || !scene.cameras?.main) {
            return;
        }
        const main = scene.cameras.main;
        const uiCamera = this.uiCamera;
        const worldCameras = [main, this.player2Camera].filter(Boolean);
        if (typeof gameObject.cameraFilter !== 'number') {
            if (gameObject.spaceChickenUi) {
                worldCameras.forEach((camera) => camera.ignore?.(gameObject));
            } else if (uiCamera.ignore) {
                uiCamera.ignore(gameObject);
            }
            return;
        }
        const uiId = typeof uiCamera.id === 'number' ? uiCamera.id : 2;
        let filter = gameObject.cameraFilter;
        if (gameObject.spaceChickenUi) {
            worldCameras.forEach((camera) => {
                if (typeof camera.id === 'number') {
                    filter |= camera.id;
                }
            });
            filter &= ~uiId;
        } else {
            filter |= uiId;
            worldCameras.forEach((camera) => {
                if (typeof camera.id === 'number') {
                    filter &= ~camera.id;
                }
            });
        }
        gameObject.cameraFilter = filter;
    }

    bringUiCameraToFront() {
        const list = this.scene.cameras?.cameras;
        if (!Array.isArray(list) || !this.uiCamera) {
            return;
        }
        const index = list.indexOf(this.uiCamera);
        if (index >= 0 && index < list.length - 1) {
            list.splice(index, 1);
            list.push(this.uiCamera);
        }
    }

    layoutSplitCameras(width, height) {
        const layout = splitPanes(width, height);
        this.applyWorldPane(this.getMainCamera(), layout.panes[0]);
        this.applyWorldPane(this.player2Camera, layout.panes[1]);
        this.layoutSplitChrome(layout);
        this.scene.uiManager?.setTouchControlsVisible?.(false);
    }

    applyWorldPane(camera, pane) {
        if (!camera || !pane) {
            return;
        }
        if (camera.setViewport) {
            camera.setViewport(pane.x, pane.y, pane.width, pane.height);
        }
        if (this.scene.worldWidth && this.scene.worldHeight && camera.setBounds) {
            camera.setBounds(0, 0, this.scene.worldWidth, this.scene.worldHeight);
        }
        camera.setZoom?.(paneZoom(pane, this.scene.worldHeight));
        camera.setFollowOffset?.(0, 0);
        this.playCameraZoom = paneZoom(pane, this.scene.worldHeight);
    }

    layoutSplitChrome(layout) {
        const scene = this.scene;
        if (!scene.add?.graphics || !layout) {
            return;
        }
        if (!this.splitDivider) {
            this.splitDivider = scene.add.graphics();
            this.splitDivider.setScrollFactor?.(0);
            this.splitDivider.setDepth?.(GAME_CONSTANTS.OVERLAY_DEPTH - 3);
            scene.uiManager?.markUi?.(this.splitDivider);
        }
        const width = scene.getViewportWidth();
        const height = scene.getViewportHeight();
        this.splitDivider.clear?.();
        this.splitDivider.fillStyle?.(0x07101c, 1);
        if (layout.sideBySide) {
            const x = layout.panes[0].width;
            this.splitDivider.fillRect?.(x, 0, SPLIT_GAP, height);
        } else {
            const y = layout.panes[0].height;
            this.splitDivider.fillRect?.(0, y, width, SPLIT_GAP);
        }
        this.layoutSplitLabels(layout);
    }

    layoutSplitLabels(layout) {
        const scene = this.scene;
        if (!scene.add?.text) {
            return;
        }
        if (!this.splitLabels) {
            this.splitLabels = [
                this.createSplitLabel('P1', '#ffe566'),
                this.createSplitLabel('P2', '#b7e4ff'),
            ];
        }
        this.splitLabels.forEach((label, index) => {
            const pane = layout.panes[index];
            if (!label || !pane) {
                return;
            }
            const labelWidth = label.displayWidth || 36;
            const labelHeight = label.displayHeight || 24;
            const x = layout.sideBySide
                ? index === 0
                    ? pane.x + pane.width - labelWidth - 12
                    : pane.x + 12
                : pane.x + 12;
            const y = layout.sideBySide ? pane.y + 10 : pane.y + pane.height - labelHeight - 14;
            label.setPosition?.(x, y);
        });
    }

    createSplitLabel(name, fill) {
        const scene = this.scene;
        const label = scene.add.text(0, 0, name, {
            fontFamily: 'Trebuchet MS, Courier New, monospace',
            fontSize: '16px',
            fill,
            backgroundColor: '#07101ccc',
            padding: { x: 8, y: 3 },
        });
        label.setScrollFactor?.(0);
        label.setDepth?.(GAME_CONSTANTS.OVERLAY_DEPTH);
        scene.uiManager?.markUi?.(label);
        return label;
    }

    updateCameraForViewport() {
        const scene = this.scene;
        const camera = this.getMainCamera();
        if (!camera) {
            return;
        }
        const insets = scene.uiManager?.getSafeAreaInsets?.() || GAME_CONSTANTS.SAFE_AREA_FALLBACK;
        const metrics = scene.viewport?.getLayoutMetrics?.(insets) || null;
        const width = metrics ? metrics.width : scene.getViewportWidth();
        const height = metrics ? metrics.height : scene.getViewportHeight();
        if (this.uiCamera) {
            if (this.uiCamera.setViewport) {
                this.uiCamera.setViewport(0, 0, width, height);
            } else if (this.uiCamera.setSize) {
                this.uiCamera.setSize(width, height);
            }
            if (this.uiCamera.setScroll) {
                this.uiCamera.setScroll(0, 0);
            }
        }
        if (this.player2Camera) {
            this.layoutSplitCameras(width, height);
            return;
        }
        if (scene.worldWidth && scene.worldHeight && camera.setBounds) {
            camera.setBounds(0, 0, scene.worldWidth, scene.worldHeight);
        }

        let zoom = 1;
        if (scene.worldHeight > 0 && height > scene.worldHeight) {
            zoom = height / scene.worldHeight;
        }
        const minVisibleWidth = 360;
        if (zoom > 1 && width / zoom < minVisibleWidth) {
            zoom = width / minVisibleWidth;
        }
        zoom = Phaser.Math.Clamp(zoom, 1, 1.55);
        this.playCameraZoom = zoom;
        if (camera.setZoom) {
            camera.setZoom(zoom);
        }
        if (!camera.setFollowOffset) {
            return;
        }
        const touchEnabled = Boolean(scene.uiManager?.touchControlsEnabled);
        if (touchEnabled && metrics) {
            const reserve = (metrics.controlSize + metrics.controlMargin * 2) / zoom;
            const ratio = metrics.isPortrait
                ? GAME_CONSTANTS.CAMERA_TOUCH_FOLLOW_OFFSET_RATIO
                : GAME_CONSTANTS.CAMERA_TOUCH_FOLLOW_OFFSET_LANDSCAPE_RATIO;
            camera.setFollowOffset(0, -reserve * ratio);
            return;
        }
        camera.setFollowOffset(0, 0);
    }

    enableSplitCamera() {
        const scene = this.scene;
        if (this.player2Camera || !scene.player2 || !scene.cameras?.add) {
            return;
        }
        const width = scene.getViewportWidth();
        const height = scene.getViewportHeight();
        const pane = splitPanes(width, height).panes[1];
        this.player2Camera = scene.cameras.add(
            pane.x,
            pane.y,
            pane.width,
            pane.height,
            false,
            'player2'
        );
        this.player2Camera.roundPixels = true;
        this.player2Camera.startFollow?.(
            scene.player2,
            true,
            GAME_CONSTANTS.CAMERA_LERP_X,
            GAME_CONSTANTS.CAMERA_LERP_Y
        );
        this.player2Camera.setBounds?.(0, 0, scene.worldWidth, scene.worldHeight);
        this.bringUiCameraToFront();
        this.bindExistingCameraFilters();
        this.updateCameraForViewport();
        setupWorldCameraFilters(scene, this.player2Camera);
    }

    getMainCamera() {
        const cameras = this.scene.cameras;
        return cameras && cameras.main ? cameras.main : null;
    }

    forEachWorldCamera(apply) {
        const main = this.getMainCamera();
        if (main) {
            apply(main);
        }
        if (this.player2Camera) {
            apply(this.player2Camera);
        }
    }

    flashCamera(duration, red, green, blue) {
        this.forEachWorldCamera((camera) => camera.flash?.(duration, red, green, blue));
    }

    shakeCamera(duration, intensity) {
        this.forEachWorldCamera((camera) => camera.shake?.(duration, intensity));
    }

    fadeCameraIn() {
        this.forEachWorldCamera((camera) =>
            camera.fadeIn?.(GAME_CONSTANTS.CAMERA_FADE_IN, 0, 0, 0)
        );
    }

    fadeCameraOut(duration, red = 0, green = 0, blue = 0) {
        this.forEachWorldCamera((camera) => camera.fadeOut?.(duration, red, green, blue));
    }

    cameraFor(chicken) {
        if (chicken && chicken === this.scene.player2) {
            return this.player2Camera || this.getMainCamera();
        }
        return this.getMainCamera();
    }

    destroy() {
        const scene = this.scene;
        if (scene.events && this.addedToSceneHandler && scene.events.off) {
            scene.events.off('addedtoscene', this.addedToSceneHandler, scene);
            this.addedToSceneHandler = null;
        }
        if (this.player2Camera && scene.cameras?.remove) {
            scene.cameras.remove(this.player2Camera);
            this.player2Camera = null;
        }
        if (this.uiCamera && scene.cameras?.remove) {
            scene.cameras.remove(this.uiCamera);
            this.uiCamera = null;
        }
        this.splitDivider = null;
        this.splitLabels = null;
    }
}
