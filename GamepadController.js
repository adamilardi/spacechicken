import { GAME_CONSTANTS } from './Constants.js';

// Owns all gamepad state (connection cache, edge latches, rumble) for one
// scene. InputController delegates its gamepad surface here; the class is also
// usable standalone with any scene-shaped object.
export class GamepadController {
    constructor(scene) {
        this.scene = scene;
        this.gamepadActive = false;
        this.gamepadSlowPoll = 0;
        this.gamepadPads = null;
        this.gamepadPadsValid = false;
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
}
