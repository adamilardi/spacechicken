import { GAME_CONSTANTS } from './Constants.js';

export class InputController {
    constructor(scene) {
        this.scene = scene;
        this.state = {
            spaceJustPressed: false,
            upJustPressed: false,
            wJustPressed: false,
            doubleTapJumpTriggered: false,
            pointerJumpTriggered: false,
            pointerStartTriggered: false,
        };
        this.pointerBuffer = [];
        this.seenPointers = new Set();
        this.controls = {
            jumpButton: null,
            musicButton: null,
            leaderboardButton: null,
            playerNameText: null,
        };
        this.targets = {
            x: 0,
            y: 0,
            hasCoordinates: false,
            jump: false,
            music: false,
            leaderboard: false,
            name: false,
        };
    }

    poll() {
        const scene = this.scene;
        const state = this.state;
        state.spaceJustPressed = Phaser.Input.Keyboard.JustDown(scene.space);
        state.upJustPressed = Phaser.Input.Keyboard.JustDown(scene.cursors.up);
        state.wJustPressed = Phaser.Input.Keyboard.JustDown(scene.wasd.W);
        state.doubleTapJumpTriggered = false;
        state.pointerJumpTriggered = false;
        state.pointerStartTriggered = false;

        const activePointers = this.getActivePointers();
        this.syncJumpPointer(activePointers);

        scene.leftPressed = false;
        scene.rightPressed = false;

        const ui = scene.uiManager;
        const controls = this.controls;
        controls.jumpButton = ui ? ui.jumpButton : null;
        controls.musicButton = ui ? ui.musicToggleButton : null;
        controls.leaderboardButton = ui ? ui.leaderboardButton : null;
        controls.playerNameText = ui ? ui.playerNameText : null;

        const movementMidpoint =
            ui && ui.touchMovementMidpoint
                ? ui.touchMovementMidpoint
                : scene.getViewportWidth() / 2;

        for (let i = 0; i < activePointers.length; i++) {
            const pointer = activePointers[i];
            this.fillPointerTargets(pointer, controls);
            if (this.recordPointerTap(pointer, this.targets)) {
                state.doubleTapJumpTriggered = true;
            }
            this.applyPointerMovement(pointer, this.targets, movementMidpoint);
        }

        state.pointerJumpTriggered = this.detectPointerJump(activePointers, controls, ui);
        state.pointerStartTriggered = this.detectTitleStart(activePointers, controls);

        return state;
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
        for (let i = 0; i < activePointers.length; i++) {
            const pointer = activePointers[i];
            if (!pointer.justDown) {
                continue;
            }
            this.fillPointerTargets(pointer, controls);
            if (
                this.targets.hasCoordinates &&
                !this.targets.jump &&
                !this.targets.music &&
                !this.targets.leaderboard &&
                !this.targets.name
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
        if (Array.isArray(input.pointers)) {
            for (let i = 0; i < input.pointers.length; i++) {
                this.pushUniquePointer(input.pointers[i], pointers);
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

    isPointerOverGameObject(pointerX, pointerY, gameObject) {
        if (
            !gameObject ||
            typeof pointerX !== 'number' ||
            typeof pointerY !== 'number' ||
            typeof gameObject.getBounds !== 'function'
        ) {
            return false;
        }
        const bounds = gameObject.getBounds();
        if (bounds && typeof bounds.contains === 'function') {
            return bounds.contains(pointerX, pointerY);
        }
        if (!bounds) {
            return false;
        }
        return (
            pointerX >= bounds.x &&
            pointerX <= bounds.x + bounds.width &&
            pointerY >= bounds.y &&
            pointerY <= bounds.y + bounds.height
        );
    }

    fillPointerTargets(pointer, controls) {
        const x = typeof pointer.x === 'number' ? pointer.x : pointer.worldX;
        const y = typeof pointer.y === 'number' ? pointer.y : pointer.worldY;
        const hasCoordinates = typeof x === 'number' && typeof y === 'number';
        const targets = this.targets;
        targets.x = x;
        targets.y = y;
        targets.hasCoordinates = hasCoordinates;
        targets.jump = hasCoordinates && this.isPointerOverGameObject(x, y, controls.jumpButton);
        targets.music = hasCoordinates && this.isPointerOverGameObject(x, y, controls.musicButton);
        targets.leaderboard =
            hasCoordinates && this.isPointerOverGameObject(x, y, controls.leaderboardButton);
        targets.name =
            hasCoordinates && this.isPointerOverGameObject(x, y, controls.playerNameText);
        return targets;
    }

    recordPointerTap(pointer, targets) {
        if (!pointer.justUp) {
            return false;
        }
        const scene = this.scene;
        const eligible = !targets.jump && !targets.music && !targets.leaderboard && !targets.name;
        const upTime =
            typeof pointer.upTime === 'number' && pointer.upTime > 0
                ? pointer.upTime
                : performance.now();
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

    applyPointerMovement(pointer, targets, movementMidpoint) {
        const scene = this.scene;
        const isJumpPointer = scene.jumpPointerId !== null && pointer.id === scene.jumpPointerId;
        const isOverControl = targets.jump || targets.music || targets.leaderboard || targets.name;
        if (
            !pointer.isDown ||
            !scene.uiManager ||
            !scene.uiManager.touchControlsEnabled ||
            isJumpPointer ||
            isOverControl ||
            !targets.hasCoordinates
        ) {
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
        if (targets.music || targets.leaderboard || targets.name) {
            return false;
        }
        const downTime = typeof pointer.downTime === 'number' ? pointer.downTime : 0;
        const upTime = typeof pointer.upTime === 'number' ? pointer.upTime : downTime + 201;
        return upTime - downTime < GAME_CONSTANTS.JUMP_BUTTON_TOUCH_TOLERANCE;
    }
}
