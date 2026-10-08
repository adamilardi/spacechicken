import { GamepadController } from './GamepadController.js';
import { TouchController } from './TouchController.js';

// Polls keyboard directly and delegates gamepad/pointer work to focused
// controllers. The gamepad/pointer methods below are thin facades so existing
// callers (scene, pause menu, tests) keep working unchanged; all of that
// state lives in GamepadController/TouchController.
export class InputController {
    constructor(scene) {
        this.scene = scene;
        this.state = {
            spaceJustPressed: false,
            upJustPressed: false,
            wJustPressed: false,
            jumpReleased: false,
            doubleTapJumpTriggered: false,
            pointerJumpTriggered: false,
            pointerStartTriggered: false,
            gamepadJumpJustPressed: false,
            gamepadStartJustPressed: false,
            phaserHeld: false,
            coopMode: null,
        };
        this.controls = {
            jumpButton: null,
            leftButton: null,
            rightButton: null,
            musicButton: null,
            leaderboardButton: null,
            playerNameText: null,
            selectPrevButton: null,
            selectNextButton: null,
        };
        this.gamepad = new GamepadController(scene);
        this.touch = new TouchController(scene);
    }

    get targets() {
        return this.touch.targets;
    }

    get gamepadJumpEdges() {
        return this.gamepad.gamepadJumpEdges;
    }

    poll() {
        const scene = this.scene;
        const state = this.state;
        state.spaceJustPressed = Phaser.Input.Keyboard.JustDown(scene.space);
        state.upJustPressed = Phaser.Input.Keyboard.JustDown(scene.cursors.up);
        state.wJustPressed = Phaser.Input.Keyboard.JustDown(scene.wasd.W);
        state.jumpReleased =
            Phaser.Input.Keyboard.JustUp(scene.space) ||
            Phaser.Input.Keyboard.JustUp(scene.cursors.up) ||
            Phaser.Input.Keyboard.JustUp(scene.wasd.W);
        state.doubleTapJumpTriggered = false;
        state.pointerJumpTriggered = false;
        state.pointerStartTriggered = false;
        state.gamepadJumpJustPressed = false;
        state.gamepadStartJustPressed = false;
        state.gamepadJumpReleased = false;
        state.p1SwitchJustPressed = false;
        state.p2SwitchJustPressed = false;
        state.phaserHeld = false;
        state.menu = {};
        state.coopMode = null;
        // The branch offer owns keys 2/3/4 while it is up: coopKeys.keyboard
        // shares key 2 with the vault pick, and JustDown is consume-once, so
        // polling here would eat the pick before updateBranchInput sees it.
        if (scene.coopKeys && !scene.awaitingBranch) {
            if (Phaser.Input.Keyboard.JustDown(scene.coopKeys.keyboard))
                state.coopMode = 'keyboard';
            if (Phaser.Input.Keyboard.JustDown(scene.coopKeys.keyboardController))
                state.coopMode = 'keyboard-controller';
            if (Phaser.Input.Keyboard.JustDown(scene.coopKeys.controllers))
                state.coopMode = 'controllers';
        }

        const touch = this.touch;
        const activePointers = touch.getActivePointers();
        touch.syncJumpPointer(activePointers);

        scene.leftPressed = false;
        scene.rightPressed = false;
        this.gamepad.pollGamepad(state);

        const ui = scene.uiManager;
        const controls = this.controls;
        controls.jumpButton = ui ? ui.jumpButton : null;
        controls.leftButton = ui ? ui.leftButton : null;
        controls.rightButton = ui ? ui.rightButton : null;
        controls.musicButton = ui ? ui.musicToggleButton : null;
        controls.leaderboardButton = ui ? ui.leaderboardButton : null;
        controls.playerNameText = ui ? ui.playerNameText : null;
        controls.phaserButton = ui ? ui.phaserButton : null;
        controls.selectPrevButton = ui ? ui.selectPrevButton : null;
        controls.selectNextButton = ui ? ui.selectNextButton : null;

        const movementMidpoint =
            ui && ui.touchMovementMidpoint
                ? ui.touchMovementMidpoint
                : scene.getViewportWidth() / 2;

        let phaserPointerDown = false;
        for (let i = 0; i < activePointers.length; i++) {
            const pointer = activePointers[i];
            const targets = touch.fillPointerTargets(pointer, controls);
            if (pointer.isDown && targets.phaser) {
                phaserPointerDown = true;
            }
            if (touch.recordPointerTap(pointer, targets)) {
                state.doubleTapJumpTriggered = true;
            }
            touch.applyPointerMovement(pointer, targets, movementMidpoint, controls);
        }
        this.syncPhaserHeld(state, phaserPointerDown);

        state.pointerJumpTriggered = touch.detectPointerJump(activePointers, controls, ui);
        state.pointerStartTriggered = touch.detectTitleStart(activePointers, controls);

        return state;
    }

    readGamepads() {
        return this.gamepad.readGamepads();
    }

    pollGamepad(state) {
        return this.gamepad.pollGamepad(state);
    }

    pollWeaponSwitch(state, pads) {
        return this.gamepad.pollWeaponSwitch(state, pads);
    }

    syncPhaserHeld(state, pointerDown) {
        const scene = this.scene;
        state.phaserHeld = Boolean(
            state.phaserHeld ||
            scene.phaserKey?.isDown ||
            scene.phaserKeyAlt?.isDown ||
            pointerDown ||
            scene.phaserHeld
        );
    }

    getGamepad(index = 0) {
        return this.gamepad.getGamepad(index);
    }

    pulsePads(duration, strongMagnitude, weakMagnitude) {
        return this.gamepad.pulsePads(duration, strongMagnitude, weakMagnitude);
    }

    syncJumpPointer(activePointers) {
        return this.touch.syncJumpPointer(activePointers);
    }

    detectPointerJump(activePointers, controls, ui) {
        return this.touch.detectPointerJump(activePointers, controls, ui);
    }

    detectTitleStart(activePointers, controls) {
        return this.touch.detectTitleStart(activePointers, controls);
    }

    getActivePointers() {
        return this.touch.getActivePointers();
    }

    pushUniquePointer(pointer, pointers) {
        return this.touch.pushUniquePointer(pointer, pointers);
    }

    isPointerOverGameObject(pointerX, pointerY, gameObject, padding = 0) {
        return this.touch.isPointerOverGameObject(pointerX, pointerY, gameObject, padding);
    }

    fillPointerTargets(pointer, controls) {
        return this.touch.fillPointerTargets(pointer, controls);
    }

    isOverUiControl(targets) {
        return this.touch.isOverUiControl(targets);
    }

    recordPointerTap(pointer, targets) {
        return this.touch.recordPointerTap(pointer, targets);
    }

    applyPointerMovement(pointer, targets, movementMidpoint, controls) {
        return this.touch.applyPointerMovement(pointer, targets, movementMidpoint, controls);
    }

    isShortPointerJump(pointer, controls) {
        return this.touch.isShortPointerJump(pointer, controls);
    }
}
