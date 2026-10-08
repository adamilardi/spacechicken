import { GAME_CONSTANTS } from './Constants.js';

// Owns all touch/pointer state (active-pointer dedupe, hit targets, tap
// timing) for one scene. InputController delegates its pointer surface here;
// the class is also usable standalone with any scene-shaped object.
export class TouchController {
    constructor(scene) {
        this.scene = scene;
        this.pointerBuffer = [];
        this.seenPointers = new Set();
        this.targets = {
            x: 0,
            y: 0,
            hasCoordinates: false,
            jump: false,
            left: false,
            right: false,
            music: false,
            leaderboard: false,
            name: false,
            phaser: false,
        };
        this.hitBounds = { x: 0, y: 0, width: 0, height: 0 };
    }

    syncJumpPointer(activePointers) {
        const scene = this.scene;
        if (scene.jumpPointerId === null) {
            return;
        }
        let jumpPointer = null;
        for (let i = 0; i < activePointers.length; i++) {
            if (activePointers[i].id === scene.jumpPointerId) {
                jumpPointer = activePointers[i];
                break;
            }
        }
        if (!jumpPointer || !jumpPointer.isDown) {
            scene.jumpPointerId = null;
        }
    }

    detectPointerJump(activePointers, controls, ui) {
        if (!ui || !ui.touchControlsEnabled || controls.jumpButton) {
            return false;
        }
        for (let i = 0; i < activePointers.length; i++) {
            if (this.isShortPointerJump(activePointers[i], controls)) {
                return true;
            }
        }
        return false;
    }

    detectTitleStart(activePointers, controls) {
        if (this.scene.uiManager?.raceSetupDialog?.open) return false;
        for (let i = 0; i < activePointers.length; i++) {
            const pointer = activePointers[i];
            if (!pointer.justDown || pointer.event?.target?.closest?.('button, dialog')) {
                continue;
            }
            this.fillPointerTargets(pointer, controls);
            if (
                this.targets.hasCoordinates &&
                !this.targets.jump &&
                !this.targets.left &&
                !this.targets.right &&
                !this.targets.music &&
                !this.targets.leaderboard &&
                !this.targets.name &&
                !this.targets.phaser &&
                !this.targets.selectPrev &&
                !this.targets.selectNext
            ) {
                return true;
            }
        }
        return false;
    }

    getActivePointers() {
        const pointers = this.pointerBuffer;
        pointers.length = 0;
        this.seenPointers.clear();

        const input = this.scene.input;
        if (!input) {
            return pointers;
        }
        const managedPointers = input.manager?.pointers || input.pointers;
        if (Array.isArray(managedPointers)) {
            for (let i = 0; i < managedPointers.length; i++) {
                this.pushUniquePointer(managedPointers[i], pointers);
            }
        }
        if (input.activePointer) {
            this.pushUniquePointer(input.activePointer, pointers);
        }
        return pointers;
    }

    pushUniquePointer(pointer, pointers) {
        if (!pointer || this.seenPointers.has(pointer)) {
            return;
        }
        this.seenPointers.add(pointer);
        pointers.push(pointer);
    }

    isPointerOverGameObject(pointerX, pointerY, gameObject, padding = 0) {
        if (!gameObject || pointerX == null || pointerY == null || !gameObject.getBounds) {
            return false;
        }
        const bounds = gameObject.getBounds(this.hitBounds) || this.hitBounds;
        const pad = padding || 0;
        return (
            pointerX >= bounds.x - pad &&
            pointerX <= bounds.x + bounds.width + pad &&
            pointerY >= bounds.y - pad &&
            pointerY <= bounds.y + bounds.height + pad
        );
    }

    fillPointerTargets(pointer, controls) {
        const x = pointer.x ?? pointer.worldX;
        const y = pointer.y ?? pointer.worldY;
        const hasCoordinates = x != null && y != null;
        const targets = this.targets;
        const pad = GAME_CONSTANTS.TOUCH_HIT_PADDING;
        targets.x = x;
        targets.y = y;
        targets.hasCoordinates = hasCoordinates;
        targets.jump =
            hasCoordinates &&
            this.isPointerOverGameObject(
                x,
                y,
                controls.jumpButton,
                controls.jumpButton?.touchHitPadding ?? pad
            );
        targets.left =
            hasCoordinates &&
            this.isPointerOverGameObject(
                x,
                y,
                controls.leftButton,
                controls.leftButton?.touchHitPadding ?? pad
            );
        targets.right =
            hasCoordinates &&
            this.isPointerOverGameObject(
                x,
                y,
                controls.rightButton,
                controls.rightButton?.touchHitPadding ?? pad
            );
        targets.music = hasCoordinates && this.isPointerOverGameObject(x, y, controls.musicButton);
        targets.leaderboard =
            hasCoordinates && this.isPointerOverGameObject(x, y, controls.leaderboardButton);
        targets.name =
            hasCoordinates && this.isPointerOverGameObject(x, y, controls.playerNameText);
        targets.phaser =
            hasCoordinates &&
            this.isPointerOverGameObject(
                x,
                y,
                controls.phaserButton,
                controls.phaserButton?.touchHitPadding ?? pad
            );
        targets.selectPrev =
            hasCoordinates && this.isPointerOverGameObject(x, y, controls.selectPrevButton);
        targets.selectNext =
            hasCoordinates && this.isPointerOverGameObject(x, y, controls.selectNextButton);
        return targets;
    }

    isOverUiControl(targets) {
        return Boolean(
            targets.jump ||
            targets.left ||
            targets.right ||
            targets.music ||
            targets.leaderboard ||
            targets.name ||
            targets.phaser ||
            targets.selectPrev ||
            targets.selectNext
        );
    }

    recordPointerTap(pointer, targets) {
        if (!pointer.justUp) {
            return false;
        }
        const scene = this.scene;
        const eligible = !this.isOverUiControl(targets);
        const upTime = pointer.upTime > 0 ? pointer.upTime : performance.now();
        const lastTapTime = scene.pointerTapTimes.get(pointer.id) || 0;
        const triggered =
            Boolean(scene.uiManager && scene.uiManager.touchControlsEnabled) &&
            targets.hasCoordinates &&
            eligible &&
            lastTapTime > 0 &&
            upTime - lastTapTime <= GAME_CONSTANTS.DOUBLE_TAP_THRESHOLD;

        if (eligible) {
            scene.pointerTapTimes.set(pointer.id, upTime);
        } else {
            scene.pointerTapTimes.delete(pointer.id);
        }
        return triggered;
    }

    applyPointerMovement(pointer, targets, movementMidpoint, controls) {
        const scene = this.scene;
        const isJumpPointer = scene.jumpPointerId !== null && pointer.id === scene.jumpPointerId;
        if (
            !pointer.isDown ||
            !scene.uiManager ||
            !scene.uiManager.touchControlsEnabled ||
            isJumpPointer ||
            !targets.hasCoordinates
        ) {
            return;
        }

        if (targets.left) {
            scene.leftPressed = true;
            return;
        }
        if (targets.right) {
            scene.rightPressed = true;
            return;
        }

        const hasMoveButtons = Boolean(controls && (controls.leftButton || controls.rightButton));
        if (hasMoveButtons || this.isOverUiControl(targets)) {
            return;
        }

        if (targets.x < movementMidpoint) {
            scene.leftPressed = true;
        } else {
            scene.rightPressed = true;
        }
    }

    isShortPointerJump(pointer, controls) {
        const scene = this.scene;
        if (
            !pointer.justUp ||
            (scene.jumpPointerId !== null && pointer.id === scene.jumpPointerId)
        ) {
            return false;
        }
        const targets = this.fillPointerTargets(pointer, controls);
        if (
            targets.music ||
            targets.leaderboard ||
            targets.name ||
            targets.left ||
            targets.right ||
            targets.phaser
        ) {
            return false;
        }
        const downTime = pointer.downTime || 0;
        const upTime = pointer.upTime || downTime + 201;
        return upTime - downTime < GAME_CONSTANTS.JUMP_BUTTON_TOUCH_TOLERANCE;
    }
}
