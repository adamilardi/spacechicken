const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

global.Phaser = {
    Scene: class {},
    Input: {
        Keyboard: {
            JustDown: require('phaser/src/input/keyboard/keys/JustDown'),
            JustUp: require('phaser/src/input/keyboard/keys/JustUp'),
        },
    },
};

function replaceGlobal(t, name, value) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    t.after(() => {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else delete globalThis[name];
    });
}

function sceneForInput(coopMode = null) {
    return {
        coopMode,
        space: {},
        jumpKeyK: {},
        cursors: { up: {}, down: {}, left: {}, right: {} },
        wasd: { W: {}, A: {}, S: {}, D: {} },
        player2Keys: { jump: {}, left: {}, right: {} },
        jumpPointerId: null,
        pointerTapTimes: new Map(),
        input: { pointers: [] },
        getViewportWidth: () => 800,
    };
}

function pad(id) {
    return {
        id,
        connected: true,
        axes: [0, 0],
        buttons: Array.from({ length: 17 }, () => ({ pressed: false })),
    };
}

test('keyboard polling consumes simultaneous releases and menu aliases once', async () => {
    const { InputController } = await import('../InputController.js');
    const scene = sceneForInput();
    const controller = new InputController(scene);
    for (const key of [scene.space, scene.cursors.up, scene.wasd.W, scene.jumpKeyK]) {
        key._justUp = true;
    }
    for (const key of [scene.cursors.left, scene.wasd.A, scene.cursors.down, scene.wasd.S]) {
        key._justDown = true;
    }
    const first = controller.poll();
    assert.equal(first.jumpReleased, true);
    assert.equal(first.menu.left, true);
    assert.equal(first.menu.down, true);
    const next = controller.poll();
    assert.equal(next.jumpReleased, false);
    assert.ok(!next.menu.left);
    assert.ok(!next.menu.down);
});

test('keyboard co-op routes arrows and numpad jump to Player 2 with proper jump counts', async () => {
    const { InputController } = await import('../InputController.js');
    const { SpaceChicken } = await import('../SpaceChicken.js');
    const scene = Object.assign(new SpaceChicken(), sceneForInput('keyboard'));
    scene.inputController = new InputController(scene);
    scene.player2 = {
        y: 100,
        body: { velocity: { y: 0 }, blocked: { down: true }, touching: {} },
        setVelocityX(value) {
            this.vx = value;
        },
        setVelocityY(value) {
            this.body.velocity.y = value;
        },
        setFlipX(value) {
            this.flipX = value;
        },
    };
    scene.getGameTime = () => 1000;
    scene.updateChickenAnimation = () => {};
    scene.killZoneFallY = 900;
    scene.maxJumps = 2;
    scene.player2JumpCount = 0;
    scene.jumpMode = 'fine';
    scene.phaserKey = { isDown: true };
    scene.cursors.up = { _justDown: true, isDown: true };
    const first = scene.inputController.poll();
    assert.equal(first.aimUpHeld, false, 'P2 arrow must not aim P1');
    assert.equal(scene.isJumpInput(first), false);
    scene.updatePlayer2(first);
    assert.equal(scene.player2JumpCount, 1);
    assert.ok(scene.player2.body.velocity.y < 0);
    scene.player2.body.blocked.down = false;
    scene.cursors.up._justUp = true;
    scene.cursors.up.isDown = false;
    const release = scene.inputController.poll();
    assert.equal(release.jumpReleased, false, 'P2 release must not cut P1 jump');
    scene.updatePlayer2(release);
    assert.ok(scene.player2.body.velocity.y > -330, 'P2 fine jump cuts on release');
    scene.player2Keys.jump._justDown = true;
    scene.updatePlayer2(scene.inputController.poll());
    assert.equal(scene.player2JumpCount, 2);
    scene.updatePlayer2(scene.inputController.poll());
    assert.equal(scene.player2JumpCount, 2, 'held numpad key must not repeat');
    scene.player2.flipX = true;
    scene.updatePlayer2(scene.inputController.poll());
    assert.equal(scene.player2.flipX, true, 'releasing movement preserves facing');
});

test('mixed co-op isolates controller actions from Player 1', async (t) => {
    const { InputController } = await import('../InputController.js');
    const gamepad = pad('mixed');
    replaceGlobal(t, 'navigator', { getGamepads: () => [null, null, gamepad] });
    const scene = sceneForInput('keyboard-controller');
    const controller = new InputController(scene);
    controller.poll();
    gamepad.axes = [0.8, -0.8];
    for (const index of [0, 2, 3]) gamepad.buttons[index].pressed = true;
    const state = controller.poll();
    assert.equal(state.gamepadJumpJustPressed, false);
    assert.equal(state.phaserHeld, false);
    assert.equal(state.aimUpHeld, false);
    assert.equal(scene.rightPressed, false);
    assert.equal(state.p1SwitchJustPressed, false);
    assert.equal(state.p2SwitchJustPressed, true);
    assert.ok(!state.menu.board, 'weapon switch must not open a menu during play');
    assert.deepEqual(controller.gamepadJumpEdges, [false, true]);
    assert.equal(controller.getGamepad(0), gamepad);
});

test('two controllers retain ownership through sparse slots and reconnects', async (t) => {
    const { InputController } = await import('../InputController.js');
    const first = pad('first');
    const second = pad('second');
    const pads = [null, first, null, second];
    replaceGlobal(t, 'navigator', { getGamepads: () => pads });
    const scene = sceneForInput('controllers');
    const controller = new InputController(scene);
    controller.poll();
    second.buttons[0].pressed = true;
    second.buttons[9].pressed = true;
    controller.poll();
    assert.deepEqual(controller.gamepadJumpEdges, [false, true]);
    assert.equal(controller.state.gamepadStartJustPressed, true, 'P2 can pause');
    pads[1] = null;
    controller.poll();
    assert.equal(controller.getGamepad(0), null);
    assert.equal(controller.getGamepad(1), second);
    assert.deepEqual(controller.gamepadJumpEdges, [false, false]);
    pads[3] = null;
    controller.poll();
    assert.deepEqual(controller.gamepadJumpEdges, [false, false]);
    pads[1] = first;
    first.buttons[0].pressed = true;
    first.buttons[3].pressed = true;
    controller.gamepad.gamepadSlowPoll = 0;
    controller.poll();
    assert.equal(controller.state.gamepadJumpJustPressed, false);
    assert.equal(controller.state.p1SwitchJustPressed, false);
    first.buttons[0].pressed = false;
    first.buttons[3].pressed = false;
    controller.poll();
    first.buttons[0].pressed = true;
    first.buttons[3].pressed = true;
    controller.poll();
    assert.equal(controller.state.gamepadJumpJustPressed, true);
    assert.equal(controller.state.p1SwitchJustPressed, true);
});

test('controller-only co-op ignores keyboard gameplay but retains menu navigation', async (t) => {
    const { InputController } = await import('../InputController.js');
    const { SpaceChicken } = await import('../SpaceChicken.js');
    replaceGlobal(t, 'navigator', { getGamepads: () => [] });
    const scene = sceneForInput('controllers');
    scene.space._justDown = true;
    scene.cursors.up = { _justDown: true, isDown: true };
    scene.phaserKey = { isDown: true };
    const state = new InputController(scene).poll();
    assert.equal(state.menu.up, true);
    assert.equal(state.phaserHeld, false);
    assert.equal(state.aimUpHeld, false);
    assert.equal(SpaceChicken.prototype.isJumpInput.call(scene, state), false);
});

test('unavailable gamepad API and rejected rumble do not break input', async (t) => {
    const { GamepadController } = await import('../GamepadController.js');
    const navigator = {
        getGamepads() {
            throw new Error('denied');
        },
    };
    replaceGlobal(t, 'navigator', navigator);
    const controller = new GamepadController({});
    assert.doesNotThrow(() => controller.pollGamepad({ menu: {} }));
    assert.equal(controller.getGamepad(), null);
    assert.doesNotThrow(() => controller.pulsePads(10, 1, 1));
    const gamepad = pad('rumble');
    navigator.getGamepads = () => [gamepad];
    gamepad.vibrationActuator = {
        playEffect() {
            throw new Error('unsupported');
        },
    };
    assert.doesNotThrow(() => controller.pulsePads(10, 1, 1));
    gamepad.vibrationActuator.playEffect = () => Promise.reject(new Error('disconnected'));
    controller.pulsePads(10, 1, 1);
    await new Promise(setImmediate);
});

test('touch hit tests ignore hidden controls and reserve weapon/menu taps', async () => {
    const { TouchController } = await import('../TouchController.js');
    const controller = new TouchController(sceneForInput());
    const button = { getBounds: () => ({ x: 100, y: 100, width: 50, height: 50 }) };
    const pointer = {
        id: 1,
        x: 120,
        y: 120,
        justDown: true,
        justUp: true,
        downTime: 100,
        upTime: 150,
    };
    for (const name of ['weaponButton', 'selectPrevButton', 'selectNextButton']) {
        assert.equal(controller.detectTitleStart([pointer], { [name]: button }), false);
        assert.equal(controller.isShortPointerJump(pointer, { [name]: button }), false);
    }
    button.visible = false;
    assert.equal(controller.fillPointerTargets(pointer, { leftButton: button }).left, false);
    assert.equal(controller.detectTitleStart([pointer], { leftButton: button }), true);
    assert.equal(controller.isShortPointerJump({ justUp: true }, {}), false);
});

function element() {
    const events = new EventEmitter();
    return Object.assign(events, {
        addEventListener: events.on.bind(events),
        removeEventListener: events.off.bind(events),
        focus() {},
        blur() {},
        clearTint() {},
        showModal() {
            this.open = true;
        },
        close() {
            this.open = false;
        },
    });
}

test('pause clears held touch actions and jump buffers without stealing text input', async (t) => {
    const { attachPauseControls } = await import('../PauseController.js');
    const button = element();
    const dialog = element();
    const resume = element();
    const window = element();
    const document = Object.assign(element(), {
        getElementById: (id) =>
            ({ 'pause-button': button, 'pause-dialog': dialog, 'resume-button': resume })[id],
    });
    replaceGlobal(t, 'window', window);
    replaceGlobal(t, 'document', document);
    replaceGlobal(t, 'navigator', { getGamepads: () => [] });
    const scene = Object.assign(sceneForInput(), {
        startTime: 0,
        phaserHeld: true,
        touchAimUpHeld: true,
        touchAimDownHeld: true,
        bufferedJumpAt: 200,
        player2BufferedAt: 200,
        uiManager: { aimUpButton: element() },
        scene: { pause() {}, resume() {} },
        input: { keyboard: { resetKeys() {} }, manager: { pointers: [] } },
    });
    let released = 0;
    scene.uiManager.aimUpButton.on('pointerupoutside', () => released++);
    const game = {
        scene: { getScenes: () => [scene] },
        sound: {},
        canvas: element(),
        events: new EventEmitter(),
    };
    attachPauseControls(game);
    window.emit('keydown', { code: 'KeyP', target: { closest: () => true } });
    assert.ok(!dialog.open);
    window.emit('keydown', { code: 'Escape', preventDefault() {} });
    assert.equal(dialog.open, true);
    resume.emit('click');
    assert.equal(dialog.open, false);
    assert.equal(scene.phaserHeld, false);
    assert.equal(scene.touchAimUpHeld, false);
    assert.equal(scene.touchAimDownHeld, false);
    assert.equal(scene.bufferedJumpAt, 0);
    assert.equal(scene.player2BufferedAt, 0);
    assert.equal(released, 1);
    game.events.emit('destroy');
    assert.equal(window.listenerCount('keydown'), 0);
});

test('gamepad deadzones and opposing directions are consistent', async (t) => {
    const { InputController } = await import('../InputController.js');
    const gamepad = pad('directions');
    replaceGlobal(t, 'navigator', { getGamepads: () => [gamepad] });
    const scene = sceneForInput();
    const controller = new InputController(scene);
    controller.poll();
    gamepad.axes = [0.21, -0.34];
    controller.poll();
    assert.equal(scene.rightPressed, false);
    assert.equal(controller.state.aimUpHeld, false);
    gamepad.axes = [0.22, -0.36];
    controller.poll();
    assert.equal(scene.rightPressed, true);
    assert.equal(controller.state.aimUpHeld, true);
    gamepad.axes = [0, 0];
    gamepad.buttons[14].pressed = true;
    gamepad.buttons[15].pressed = true;
    controller.poll();
    assert.equal(scene.leftPressed, true);
    assert.equal(scene.rightPressed, true, 'opposing directions cancel in movement');
});

test('weapon switches respect each co-op player input assignment', async () => {
    const { CombatSystem } = await import('../CombatSystem.js');
    for (const mode of ['keyboard', 'keyboard-controller', 'controllers']) {
        const scene = {
            coopMode: mode,
            levelConfig: { phaser: true },
            player2: {},
            switchKey1: { _justDown: true },
            switchKey2: { _justDown: true },
        };
        const switched = [];
        const combat = new CombatSystem(scene);
        combat.switchPlayerWeapon = (index) => switched.push(index);
        combat.updateWeaponSwitch({});
        assert.deepEqual(
            switched,
            mode === 'keyboard' ? [0, 1] : mode === 'controllers' ? [] : [0]
        );
        switched.length = 0;
        combat.updateWeaponSwitch({});
        assert.deepEqual(switched, [], 'consumed switches must not repeat');
        combat.updateWeaponSwitch({ p1SwitchJustPressed: true, p2SwitchJustPressed: true });
        assert.deepEqual(switched, [0, 1]);
    }
});

test('physical numpad controls work with NumLock off and clean up listeners', async () => {
    const { InputController } = await import('../InputController.js');
    const Key = require('phaser/src/input/keyboard/keys/Key');
    const keyboard = new EventEmitter();
    const scene = sceneForInput('keyboard');
    scene.input.keyboard = keyboard;
    scene.player2Keys.jump = new Key(keyboard, 96);
    scene.player2PhaserKey = new Key(keyboard, 97);
    scene.switchKey2 = new Key(keyboard, 98);
    const controller = new InputController(scene);
    for (const [code, keyCode, key] of [
        ['Numpad0', 45, scene.player2Keys.jump],
        ['Numpad1', 35, scene.player2PhaserKey],
        ['Numpad2', 40, scene.switchKey2],
    ]) {
        keyboard.emit('keydown', { code, keyCode, timeStamp: 100 });
        assert.equal(key.isDown, true, `${code} pressed`);
        keyboard.emit('keyup', { code, keyCode, timeStamp: 150 });
        assert.equal(key.isDown, false, `${code} released`);
    }
    scene.cursors.down = { isDown: true, _justDown: true, originalEvent: { code: 'Numpad2' } };
    const state = controller.poll();
    assert.ok(!state.menu.down, 'switch key must not navigate the menu');
    assert.equal(state.aimDownHeld, false);
    controller.destroy();
    assert.equal(keyboard.listenerCount('keydown'), 0);
    assert.equal(keyboard.listenerCount('keyup'), 0);
});

test('gamepad Back cannot start a title run, while Confirm can', async () => {
    const { SpaceChicken } = await import('../SpaceChicken.js');
    const scene = { awaitingStart: true };
    assert.equal(
        SpaceChicken.prototype.isJumpInput.call(scene, {
            gamepadJumpJustPressed: true,
            menu: { back: true },
        }),
        false
    );
    assert.equal(
        SpaceChicken.prototype.isJumpInput.call(scene, {
            gamepadJumpJustPressed: true,
            menu: { confirm: true },
        }),
        true
    );
    scene.awaitingStart = false;
    assert.equal(
        SpaceChicken.prototype.isJumpInput.call(scene, {
            gamepadJumpJustPressed: true,
            menu: { back: true },
        }),
        true,
        'B still jumps during gameplay'
    );
});

test('branch menu supports controller selection and confirm without duplicate picks', async () => {
    const { Overlays } = await import('../Overlays.js');
    const overlay = new Overlays({ scene: {} });
    const colors = [];
    overlay.branchButtons = [0, 1].map((index) => ({
        setBackgroundColor(color) {
            colors[index] = color;
        },
    }));
    overlay.branchOptions = [{ level: 13 }, { level: 16 }];
    const picked = [];
    overlay.branchCallback = (level) => picked.push(level);
    assert.equal(overlay.handleMenuInput({ menu: { down: true } }), true);
    assert.equal(overlay.branchMenuIndex, 1);
    assert.notEqual(colors[0], colors[1]);
    overlay.handleMenuInput({ menu: { confirm: true } });
    assert.deepEqual(picked, [16]);
    assert.equal(overlay.branchOptions, null);
});
