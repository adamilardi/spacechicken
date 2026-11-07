import { GamepadController } from './GamepadController.js';
import { TouchController } from './TouchController.js';

const INPUT_STATE_DEFAULTS = Object.freeze({
    spaceJustPressed: false,
    upJustPressed: false,
    wJustPressed: false,
    kJustPressed: false,
    p2JumpJustPressed: false,
    p2JumpReleased: false,
    jumpReleased: false,
    doubleTapJumpTriggered: false,
    pointerJumpTriggered: false,
    pointerStartTriggered: false,
    gamepadJumpJustPressed: false,
    gamepadStartJustPressed: false,
    gamepadJumpReleased: false,
    p1SwitchJustPressed: false,
    p2SwitchJustPressed: false,
    phaserHeld: false,
    aimUpHeld: false,
    aimDownHeld: false,
    coopMode: null,
});

// Polls keyboard directly and delegates gamepad/pointer work to focused
// controllers. The gamepad/pointer methods below are thin facades so existing
// callers (scene, pause menu, tests) keep working unchanged; all of that
// state lives in GamepadController/TouchController.
export class InputController {
    constructor(scene) {
        this.scene = scene;
        this.state = { ...INPUT_STATE_DEFAULTS, menu: {} };
        this.controls = {
            jumpButton: null,
            leftButton: null,
            rightButton: null,
            musicButton: null,
            leaderboardButton: null,
            playerNameText: null,
            phaserButton: null,
            aimUpButton: null,
            aimDownButton: null,
            weaponButton: null,
            selectPrevButton: null,
            selectNextButton: null,
            newsButtons: [],
        };
        this.gamepad = new GamepadController(scene);
        this.touch = new TouchController(scene);
        this.numpadDown = (event) => this.forwardNumpadEvent(event, 'onDown');
        this.numpadUp = (event) => this.forwardNumpadEvent(event, 'onUp');
        scene.input?.keyboard?.on?.('keydown', this.numpadDown);
        scene.input?.keyboard?.on?.('keyup', this.numpadUp);
    }

    forwardNumpadEvent(event, method) {
        // With NumLock off, browsers report Insert/End/Down keycodes for
        // Numpad 0/1/2. The physical code still identifies the intended control.
        const key =
            event.code === 'Numpad0'
                ? this.scene.player2Keys?.jump
                : event.code === 'Numpad1'
                  ? this.scene.player2PhaserKey
                  : event.code === 'Numpad2'
                    ? this.scene.switchKey2
                    : null;
        if (key && event.keyCode !== key.keyCode) key[method]?.(event);
    }

    destroy() {
        this.scene.input?.keyboard?.off?.('keydown', this.numpadDown);
        this.scene.input?.keyboard?.off?.('keyup', this.numpadUp);
    }

    get targets() {
        return this.touch.targets;
    }

    get gamepadJumpEdges() {
        return this.gamepad.gamepadJumpEdges;
    }

    get gamepadJumpReleaseEdges() {
        return this.gamepad.gamepadJumpReleaseEdges;
    }

    pollJumpKeys(scene, state) {
        state.spaceJustPressed = Phaser.Input.Keyboard.JustDown(scene.space);
        state.upJustPressed = Phaser.Input.Keyboard.JustDown(scene.cursors.up);
        state.wJustPressed = Phaser.Input.Keyboard.JustDown(scene.wasd.W);
        state.kJustPressed = Boolean(
            scene.jumpKeyK && Phaser.Input.Keyboard.JustDown(scene.jumpKeyK)
        );
        const keyboard = Phaser.Input.Keyboard;
        // Consume every edge even when several keys are released together.
        const spaceUp = keyboard.JustUp(scene.space);
        const arrowUp = keyboard.JustUp(scene.cursors.up);
        const wUp = keyboard.JustUp(scene.wasd.W);
        const kUp = Boolean(scene.jumpKeyK && keyboard.JustUp(scene.jumpKeyK));
        const secondJump = scene.player2Keys?.jump;
        const secondDown = Boolean(secondJump && keyboard.JustDown(secondJump));
        const secondUp = Boolean(secondJump && keyboard.JustUp(secondJump));
        state.p2JumpJustPressed = scene.coopMode === 'keyboard' && secondDown;
        state.p2JumpReleased = scene.coopMode === 'keyboard' && (arrowUp || secondUp);
        state.jumpReleased =
            scene.coopMode !== 'controllers' &&
            (spaceUp || wUp || kUp || (scene.coopMode !== 'keyboard' && arrowUp));
    }

    poll() {
        const scene = this.scene;
        // Reuse the state object while clearing every frame's transient input.
        const state = Object.assign(this.state, INPUT_STATE_DEFAULTS);
        state.menu = {};
        this.pollJumpKeys(scene, state);
        this.pollCoopMode(scene, state);

        const touch = this.touch;
        const activePointers = touch.getActivePointers();
        touch.syncJumpPointer(activePointers);

        scene.leftPressed = false;
        scene.rightPressed = false;
        this.gamepad.pollGamepad(state);
        this.pollKeyboardMenu(scene, state);
        if (scene.touchJumpReleased) {
            state.jumpReleased = true;
            scene.touchJumpReleased = false;
        }

        const ui = scene.uiManager;
        const controls = this.syncTouchControls(ui);
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
        this.syncAimHeld(state);

        state.pointerJumpTriggered = touch.detectPointerJump(activePointers, controls, ui);
        state.pointerStartTriggered = touch.detectTitleStart(activePointers, controls);

        return state;
    }

    pollCoopMode(scene, state) {
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
    }

    syncTouchControls(ui) {
        const controls = this.controls;
        controls.jumpButton = ui ? ui.jumpButton : null;
        controls.leftButton = ui ? ui.leftButton : null;
        controls.rightButton = ui ? ui.rightButton : null;
        controls.musicButton = ui ? ui.musicToggleButton : null;
        controls.leaderboardButton = ui ? ui.leaderboardButton : null;
        controls.playerNameText = ui ? ui.playerNameText : null;
        controls.phaserButton = ui ? ui.phaserButton : null;
        controls.aimUpButton = ui ? ui.aimUpButton : null;
        controls.aimDownButton = ui ? ui.aimDownButton : null;
        controls.weaponButton = ui ? ui.weaponButton : null;
        controls.selectPrevButton = ui ? ui.selectPrevButton : null;
        controls.selectNextButton = ui ? ui.selectNextButton : null;
        controls.newsButtons = ui ? ui.newsButtons : [];
        return controls;
    }

    pollGamepad(state) {
        return this.gamepad.pollGamepad(state);
    }

    // Keyboard menu edges: B toggles the board, arrows/A/D turn its pages,
    // arrows/WASD move through title views and story rows, Enter confirms,
    // Escape goes back. Menu keys only act on menu screens (title,
    // leaderboard, finish, race setup); every menu handler returns false
    // during play, so running with the arrows never leaks into the game.
    pollKeyboardMenu(scene, state) {
        if (!scene || !state || !state.menu) {
            return;
        }
        const justDown = (key) => {
            const pressed = key && Phaser.Input.Keyboard.JustDown(key);
            return Boolean(pressed && !key.originalEvent?.code?.startsWith('Numpad'));
        };
        const eitherDown = (first, second) => {
            const firstDown = justDown(first);
            const secondDown = justDown(second);
            return firstDown || secondDown;
        };
        if (justDown(scene.boardKey)) {
            state.menu.board = true;
        }
        if (eitherDown(scene.cursors?.left, scene.wasd?.A)) {
            state.menu.left = true;
        }
        if (eitherDown(scene.cursors?.right, scene.wasd?.D)) {
            state.menu.right = true;
        }
        // Jump polling consumes these key edges first; reuse its result for menus.
        const upPressed = state.upJustPressed ?? justDown(scene.cursors?.up);
        const wPressed = state.wJustPressed ?? justDown(scene.wasd?.W);
        if (upPressed || wPressed) {
            state.menu.up = true;
        }
        if (eitherDown(scene.cursors?.down, scene.wasd?.S)) {
            state.menu.down = true;
        }
        if (justDown(scene.enterKey)) {
            state.menu.confirm = true;
        }
        if (justDown(scene.escKey)) {
            state.menu.back = true;
        }
    }

    // Aim is held intent, resolved into a direction by CombatSystem.
    // Up only aims while fire is held (otherwise Up/W still jump, and
    // Space/K jump even while aiming); Down/S aim whenever held. Pad
    // aim arrives via GamepadController, touch aim via scene flags the
    // aim buttons set, mirroring phaserHeld.
    syncAimHeld(state) {
        const scene = this.scene;
        const keyboardEnabled = scene.coopMode !== 'controllers';
        const arrowsEnabled = scene.coopMode !== 'keyboard';
        const upKeyHeld =
            keyboardEnabled &&
            Boolean((arrowsEnabled && scene.cursors?.up?.isDown) || scene.wasd?.W?.isDown);
        const downKeyHeld =
            keyboardEnabled &&
            Boolean(
                (arrowsEnabled &&
                    scene.cursors?.down?.isDown &&
                    scene.cursors.down.originalEvent?.code !== 'Numpad2') ||
                scene.wasd?.S?.isDown
            );
        state.aimUpHeld = Boolean(
            state.aimUpHeld || scene.touchAimUpHeld || (upKeyHeld && state.phaserHeld)
        );
        state.aimDownHeld = Boolean(state.aimDownHeld || scene.touchAimDownHeld || downKeyHeld);
    }

    syncPhaserHeld(state, pointerDown) {
        const scene = this.scene;
        state.phaserHeld = Boolean(
            state.phaserHeld ||
            (scene.coopMode !== 'controllers' &&
                (scene.phaserKey?.isDown || scene.phaserKeyAlt?.isDown)) ||
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
