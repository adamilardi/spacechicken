import { GAME_CONSTANTS } from './Constants.js';

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
        this.pointerBuffer = [];
        this.seenPointers = new Set();
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
        this.gamepadActive = false;
        this.gamepadSlowPoll = 0;
        this.gamepadPads = null;
        this.gamepadPadsValid = false;
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

        const activePointers = this.getActivePointers();
        this.syncJumpPointer(activePointers);

        scene.leftPressed = false;
        scene.rightPressed = false;
        this.pollGamepad(state);

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
            this.fillPointerTargets(pointer, controls);
            if (pointer.isDown && this.targets.phaser) {
                phaserPointerDown = true;
            }
            if (this.recordPointerTap(pointer, this.targets)) {
                state.doubleTapJumpTriggered = true;
            }
            this.applyPointerMovement(pointer, this.targets, movementMidpoint, controls);
        }
        this.syncPhaserHeld(state, phaserPointerDown);

        state.pointerJumpTriggered = this.detectPointerJump(activePointers, controls, ui);
        state.pointerStartTriggered = this.detectTitleStart(activePointers, controls);

        return state;
    }

    readGamepads() {
        if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
            return [];
        }
        if (!this.gamepadActive && this.gamepadSlowPoll > 0) {
            this.gamepadSlowPoll -= 1;
            return [];
        }
        const pads = navigator.getGamepads() || [];
        let connected = false;
        for (let i = 0; i < pads.length; i++) {
            if (pads[i] && pads[i].connected !== false) {
                connected = true;
                break;
            }
        }
        this.gamepadActive = connected;
        if (!connected) {
            this.gamepadSlowPoll = GAME_CONSTANTS.GAMEPAD_SLOW_POLL_FRAMES;
        }
        return pads;
    }

    // eslint-disable-next-line complexity
    pollGamepad(state) {
        const scene = this.scene;
        const pads = this.readGamepads();
        this.gamepadPads = pads;
        this.gamepadPadsValid = true;
        let pad = null;
        for (let i = 0; i < pads.length; i++) {
            if (pads[i] && pads[i].connected !== false) {
                pad = pads[i];
                break;
            }
        }
        if (!pad) {
            this.previousGamepadButtons = null;
            this.previousWeaponButtons = null;
            return;
        }
        const buttonDown = (index) => Boolean(pad.buttons?.[index]?.pressed);
        // A held during a scene restart must be released before it can start another game.
        const previous = this.previousGamepadButtons || {
            jump: true,
            start: true,
            secondJump: true,
            menu: {
                confirm: true,
                back: true,
                board: true,
                left: true,
                right: true,
                up: true,
                down: true,
            },
        };
        const jump = buttonDown(0) || buttonDown(1) || buttonDown(12);
        const start = buttonDown(9) || buttonDown(16);
        const hadPrevious = Boolean(this.previousGamepadButtons);
        state.gamepadJumpJustPressed = jump && !previous.jump;
        state.gamepadJumpReleased = hadPrevious && !jump && previous.jump;
        state.jumpReleased = Boolean(state.jumpReleased || state.gamepadJumpReleased);
        state.gamepadStartJustPressed = start && !previous.start;
        if (scene.coopMode !== 'keyboard' && scene.coopMode !== 'keyboard-controller') {
            state.phaserHeld = buttonDown(2);
        }
        const axis = (value) => (Math.abs(value || 0) >= 0.22 ? value : 0);
        const horizontal =
            axis(pad.axes?.[0]) || (buttonDown(15) ? 1 : 0) || (buttonDown(14) ? -1 : 0);
        if (scene.coopMode !== 'keyboard-controller' && scene.coopMode !== 'keyboard') {
            scene.leftPressed ||= horizontal < 0;
            scene.rightPressed ||= horizontal > 0;
        }
        const menu = {
            confirm: buttonDown(0),
            back: buttonDown(1),
            board: buttonDown(3),
            left: buttonDown(14) || (pad.axes?.[0] || 0) < -0.6,
            right: buttonDown(15) || (pad.axes?.[0] || 0) > 0.6,
            up: buttonDown(12) || (pad.axes?.[1] || 0) < -0.6,
            down: buttonDown(13) || (pad.axes?.[1] || 0) > 0.6,
        };
        for (const [key, pressed] of Object.entries(menu)) {
            state.menu[key] = pressed && !previous.menu?.[key];
        }
        this.previousGamepadButtons = { jump, start, menu };
        const second = this.getGamepad(scene.coopMode === 'keyboard-controller' ? 0 : 1);
        const secondJump = Boolean(
            second?.buttons?.[0]?.pressed ||
            second?.buttons?.[1]?.pressed ||
            second?.buttons?.[12]?.pressed
        );
        this.gamepadJumpEdges = [jump && !previous.jump, secondJump && !previous.secondJump];
        this.previousGamepadButtons.secondJump = secondJump;
        this.pollWeaponSwitch(state, pads);
    }

    pollWeaponSwitch(state, pads) {
        const scene = this.scene;
        const list = Array.isArray(pads) ? pads : [];
        const down = (padIndex) => Boolean(list[padIndex]?.buttons?.[3]?.pressed);
        const previous = this.previousWeaponButtons || {};
        const firstPad = list.findIndex((pad) => pad && pad.connected !== false);
        const edge = (padIndex) => {
            if (padIndex < 0) return false;
            const pressed = down(padIndex);
            const fired = pressed && !previous[padIndex];
            previous[padIndex] = pressed;
            return fired;
        };
        if (!scene.coopMode && firstPad >= 0) {
            state.p1SwitchJustPressed = edge(firstPad);
        } else if (scene.coopMode === 'controllers') {
            state.p1SwitchJustPressed = edge(0);
            state.p2SwitchJustPressed = edge(1);
        } else if (scene.coopMode === 'keyboard-controller') {
            state.p2SwitchJustPressed = edge(0);
        }
        this.previousWeaponButtons = previous;
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
        // poll() runs before every same-frame consumer, so reuse its snapshot
        // instead of querying the browser a second time.
        if (this.gamepadPadsValid && this.gamepadPads) {
            const cached = this.gamepadPads[index];
            return cached && cached.connected !== false ? cached : null;
        }
        if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function')
            return null;
        const pads = navigator.getGamepads();
        const pad = pads?.[index];
        return pad && pad.connected !== false ? pad : null;
    }

    pulsePads(duration, strongMagnitude, weakMagnitude) {
        if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
            return;
        }
        const pads = navigator.getGamepads();
        if (!pads) {
            return;
        }
        for (let i = 0; i < pads.length; i++) {
            const actuator = pads[i]?.vibrationActuator;
            if (typeof actuator?.playEffect !== 'function') {
                continue;
            }
            try {
                const pending = actuator.playEffect('dual-rumble', {
                    startDelay: 0,
                    duration,
                    strongMagnitude,
                    weakMagnitude,
                });
                pending?.catch?.(() => {});
            } catch {
                // A pad can advertise rumble and still reject the effect.
            }
        }
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
