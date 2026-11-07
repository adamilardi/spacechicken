import { GAME_CONSTANTS } from './Constants.js';

export function readBrowserGamepads() {
    try {
        return typeof navigator === 'undefined' ? [] : navigator.getGamepads?.() || [];
    } catch {
        // Browsers may expose the API but deny it through their permissions policy.
        return [];
    }
}

const connected = (pad) => pad && pad.connected !== false;
const buttonDown = (pad, index) => Boolean(pad?.buttons?.[index]?.pressed);

// Owns gamepad snapshots, player assignments, button edges, and rumble.
export class GamepadController {
    constructor(scene) {
        this.scene = scene;
        this.gamepadActive = false;
        this.gamepadSlowPoll = 0;
        this.gamepadPads = null;
        this.gamepadPadsValid = false;
        this.playerSlots = [null, null];
        this.previousPads = new Map();
        this.gamepadJumpEdges = [false, false];
        this.gamepadJumpReleaseEdges = [false, false];
    }

    readGamepads() {
        if (!this.gamepadActive && this.gamepadSlowPoll > 0) {
            this.gamepadSlowPoll -= 1;
            return [];
        }
        const pads = readBrowserGamepads();
        this.gamepadActive = Array.from(pads).some(connected);
        if (!this.gamepadActive) {
            this.gamepadSlowPoll = GAME_CONSTANTS.GAMEPAD_SLOW_POLL_FRAMES;
        }
        return pads;
    }

    assignPlayers(pads) {
        // Keep the other player's slot when a controller disconnects. Browser
        // indices can have holes and are not the same thing as player numbers.
        this.playerSlots = this.playerSlots.map((slot) =>
            slot !== null && connected(pads[slot]) ? slot : null
        );
        for (let slot = 0; slot < pads.length; slot++) {
            if (!connected(pads[slot]) || this.playerSlots.includes(slot)) continue;
            const player = this.playerSlots.indexOf(null);
            if (player === -1) break;
            this.playerSlots[player] = slot;
        }
    }

    samplePad(pad, previous) {
        const jump = buttonDown(pad, 0) || buttonDown(pad, 1) || buttonDown(pad, 12);
        const start = buttonDown(pad, 9) || buttonDown(pad, 16);
        const menu = {
            confirm: buttonDown(pad, 0),
            back: buttonDown(pad, 1),
            board: buttonDown(pad, 3),
            left: buttonDown(pad, 14) || (pad.axes?.[0] || 0) < -0.6,
            right: buttonDown(pad, 15) || (pad.axes?.[0] || 0) > 0.6,
            up: buttonDown(pad, 12) || (pad.axes?.[1] || 0) < -0.6,
            down: buttonDown(pad, 13) || (pad.axes?.[1] || 0) > 0.6,
        };
        // Held buttons on connection/restart must be released before acting.
        const known = previous && previous.id === pad.id;
        const edge = (held, wasHeld) => Boolean(known && held && !wasHeld);
        return {
            id: pad.id,
            jump,
            start,
            menu,
            jumpPressed: edge(jump, previous?.jump),
            jumpReleased: Boolean(known && !jump && previous.jump),
            startPressed: edge(start, previous?.start),
            switchPressed: edge(menu.board, previous?.menu.board),
            menuEdges: Object.fromEntries(
                Object.entries(menu).map(([key, held]) => [key, edge(held, previous?.menu[key])])
            ),
        };
    }

    pollGamepad(state) {
        const pads = this.readGamepads();
        this.gamepadPads = pads;
        this.gamepadPadsValid = true;
        this.assignPlayers(pads);
        const samples = new Map();
        state.menu ||= {};
        state.gamepadStartJustPressed = false;
        for (let slot = 0; slot < pads.length; slot++) {
            if (!connected(pads[slot])) continue;
            const sample = this.samplePad(pads[slot], this.previousPads.get(slot));
            samples.set(slot, sample);
            state.gamepadStartJustPressed ||= sample.startPressed;
            for (const [key, pressed] of Object.entries(sample.menuEdges)) {
                // Y switches weapons during play; its leaderboard shortcut is
                // reserved for title/finish menus so it cannot swallow a jump.
                if (key === 'board' && !this.scene.awaitingStart && !this.scene.gameOver) continue;
                state.menu[key] ||= pressed;
            }
        }
        this.previousPads = samples;
        const mode = this.scene.coopMode;
        const first = samples.get(this.playerSlots[0]);
        const secondIndex = mode === 'keyboard-controller' ? 0 : 1;
        const second = samples.get(this.playerSlots[secondIndex]);
        const controlsFirst = mode !== 'keyboard' && mode !== 'keyboard-controller';
        this.gamepadJumpEdges = [
            Boolean(controlsFirst && first?.jumpPressed),
            Boolean(mode !== 'keyboard' && second?.jumpPressed),
        ];
        this.gamepadJumpReleaseEdges = [
            Boolean(controlsFirst && first?.jumpReleased),
            Boolean(mode !== 'keyboard' && second?.jumpReleased),
        ];
        state.gamepadJumpJustPressed = this.gamepadJumpEdges[0];
        state.gamepadJumpReleased = this.gamepadJumpReleaseEdges[0];
        state.jumpReleased ||= state.gamepadJumpReleased;
        state.p1SwitchJustPressed = Boolean(controlsFirst && first?.switchPressed);
        state.p2SwitchJustPressed = Boolean(mode && mode !== 'keyboard' && second?.switchPressed);
        if (controlsFirst) this.applyPlayerInput(state, this.getGamepad(0));
    }

    applyPlayerInput(state, pad) {
        state.phaserHeld ||= buttonDown(pad, 2);
        const x = pad?.axes?.[0] || 0;
        const horizontal = Math.abs(x) >= 0.22 ? x : 0;
        this.scene.leftPressed ||= buttonDown(pad, 14) || horizontal < 0;
        this.scene.rightPressed ||= buttonDown(pad, 15) || horizontal > 0;
        const y = pad?.axes?.[1] || 0;
        state.aimUpHeld ||= y < -GAME_CONSTANTS.GAMEPAD_AIM_DEADZONE;
        state.aimDownHeld ||= y > GAME_CONSTANTS.GAMEPAD_AIM_DEADZONE || buttonDown(pad, 13);
    }

    getGamepad(index = 0) {
        if (this.gamepadPadsValid) {
            const slot = this.playerSlots[index];
            return slot == null ? null : this.gamepadPads[slot] || null;
        }
        return Array.from(readBrowserGamepads()).filter(connected)[index] || null;
    }

    pulsePads(duration, strongMagnitude, weakMagnitude) {
        for (const pad of readBrowserGamepads()) {
            const actuator = connected(pad) && pad.vibrationActuator;
            if (typeof actuator?.playEffect !== 'function') continue;
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
