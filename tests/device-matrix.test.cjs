const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const projectRoot = path.resolve(__dirname, '..');

global.Phaser = {
    AUTO: 'AUTO',
    Scene: class {},
    Scale: { RESIZE: 'RESIZE', CENTER_BOTH: 'CENTER_BOTH' },
};

function importModule(fileName) {
    return import(pathToFileURL(path.join(projectRoot, fileName)).href);
}

function makeViewportScene(width, height) {
    return {
        viewportWidth: width,
        viewportHeight: height,
        scale: { gameSize: { width, height } },
        sys: { game: { config: { width, height } } },
        scaleWidth: width,
        scaleHeight: height,
    };
}

async function layoutMetricsFor(Viewport, profile) {
    const { GAME_CONSTANTS } = await importModule('Constants.js');
    const scene = makeViewportScene(profile.width, profile.height, profile.safeArea);
    const viewport = new Viewport(scene);
    return { metrics: viewport.getLayoutMetrics(profile.safeArea), constants: GAME_CONSTANTS };
}

test('every device profile keeps touch targets, fonts, and HUD readable', async () => {
    const { Viewport } = await importModule('Viewport.js');
    const { DEVICE_PROFILES } = await importModule('PerformanceBudgets.js');
    const { fitRowControlSize } = await importModule('HudLayout.js');

    assert.ok(DEVICE_PROFILES.length >= 10, 'matrix should cover phones, tablets, desktops');
    const categories = new Set(DEVICE_PROFILES.map((profile) => profile.category));
    assert.deepEqual([...categories].sort(), ['desktop', 'phone', 'tablet']);

    for (const profile of DEVICE_PROFILES) {
        const { metrics, constants } = await layoutMetricsFor(Viewport, profile);

        assert.equal(metrics.width, profile.width, `${profile.id} width`);
        assert.equal(metrics.height, profile.height, `${profile.id} height`);
        assert.equal(
            metrics.isPortrait,
            profile.height > profile.width,
            `${profile.id} orientation`
        );
        // Touch controls must stay tappable on every device.
        assert.ok(
            metrics.controlSize >= 44,
            `${profile.id} control size ${metrics.controlSize} below 44px minimum`
        );
        assert.ok(
            metrics.controlSize <= constants.CONTROL_SIZE_MAX,
            `${profile.id} control size ${metrics.controlSize} exceeds max`
        );
        assert.ok(
            metrics.controlMargin >= 10 && metrics.controlMargin <= 28,
            `${profile.id} control margin ${metrics.controlMargin} outside 10-28px`
        );
        // HUD scale stays inside the designed range (with compact/tiny caps).
        assert.ok(
            metrics.hudScale >= 0.5 && metrics.hudScale <= constants.HUD_SCALE_MAX,
            `${profile.id} hud scale ${metrics.hudScale} out of range`
        );
        // Fonts never collapse below legibility.
        assert.ok(metrics.fonts.timer >= 14, `${profile.id} timer font too small`);
        assert.ok(metrics.fonts.death >= 14, `${profile.id} death font too small`);
        assert.ok(metrics.fonts.instructions >= 14, `${profile.id} instructions font too small`);
        assert.ok(metrics.fonts.title >= 24, `${profile.id} title font too small`);
        // Bottom-row controls must fit without overlap: three across
        // without fire, four across on phaser levels.
        const margin = metrics.controlMargin;
        const gap = Math.max(16, Math.round(margin * 0.7));
        for (const across of [3, 4]) {
            const fitted = fitRowControlSize(
                metrics.controlSize,
                metrics.innerWidth,
                margin,
                gap,
                across
            );
            assert.ok(
                fitted * across + gap * (across - 1) + margin * 2 <= metrics.innerWidth,
                `${profile.id} ${across}-across touch controls overflow ${metrics.innerWidth}px inner width`
            );
        }
    }
});

test('laid-out touch buttons never overlap, with or without fire', async () => {
    const { UIManager } = await importModule('UIManager.js');
    const { computeLayoutMetrics } = await importModule('HudLayout.js');

    const layoutRow = (width, height, withPhaser) => {
        const stubButton = () => {
            const button = { x: 0, y: 0, w: 0, h: 0 };
            button.setDisplaySize = (w, h) => {
                button.w = w;
                button.h = h;
            };
            button.setPosition = (x, y) => {
                button.x = x;
                button.y = y;
            };
            return button;
        };
        const ui = Object.create(UIManager.prototype);
        ui.leftButton = stubButton();
        ui.rightButton = stubButton();
        ui.jumpButton = stubButton();
        ui.phaserButton = withPhaser ? stubButton() : null;
        ui.weaponButton = null;
        const metrics = computeLayoutMetrics(width, height, {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
        });
        ui.getLayoutMetrics = () => metrics;
        ui.getSafeAreaInsets = () => ({ top: 0, right: 0, bottom: 0, left: 0 });
        ui.expandControlHitArea = () => {};
        ui.layoutTouchControls();
        return [ui.leftButton, ui.rightButton, ui.phaserButton, ui.jumpButton].filter(Boolean);
    };

    const viewports = [
        [320, 568],
        [360, 640],
        [390, 844],
        [768, 1024],
        [1024, 768],
    ];
    for (const [width, height] of viewports) {
        for (const withPhaser of [false, true]) {
            const tag = `${width}x${height}${withPhaser ? ' phaser' : ''}`;
            const buttons = layoutRow(width, height, withPhaser);
            for (const button of buttons) {
                assert.ok(button.w >= 44 && button.h >= 44, `${tag} button below 44px minimum`);
                assert.ok(
                    button.x - button.w / 2 >= -1 && button.x + button.w / 2 <= width + 1,
                    `${tag} button outside viewport`
                );
            }
            const sorted = [...buttons].sort((a, b) => a.x - b.x);
            for (let i = 1; i < sorted.length; i++) {
                const prevRight = sorted[i - 1].x + sorted[i - 1].w / 2;
                const nextLeft = sorted[i].x - sorted[i].w / 2;
                assert.ok(
                    prevRight <= nextLeft,
                    `${tag} touch buttons overlap by ${(prevRight - nextLeft).toFixed(1)}px`
                );
            }
        }
    }
});

test('safe-area insets shrink the playable layout instead of clipping it', async () => {
    const { Viewport } = await importModule('Viewport.js');
    const scene = makeViewportScene(390, 844);
    const viewport = new Viewport(scene);

    const withoutNotch = viewport.getLayoutMetrics({ top: 0, right: 0, bottom: 0, left: 0 });
    const withNotch = viewport.getLayoutMetrics({ top: 47, right: 0, bottom: 34, left: 0 });

    assert.equal(withNotch.innerWidth, 390);
    assert.equal(withNotch.innerHeight, 844 - 47 - 34);
    assert.ok(withNotch.innerHeight < withoutNotch.innerHeight);
    assert.ok(withNotch.controlSize >= 44);

    const landscape = new Viewport(makeViewportScene(844, 390));
    const landscapeNotch = landscape.getLayoutMetrics({
        top: 0,
        right: 47,
        bottom: 21,
        left: 47,
    });
    assert.equal(landscapeNotch.innerWidth, 844 - 94);
    assert.equal(landscapeNotch.isPortrait, false);
});

test('compact and tiny breakpoints classify phones, tablets, and desktops', async () => {
    const { Viewport } = await importModule('Viewport.js');
    const { GAME_CONSTANTS } = await importModule('Constants.js');
    const metricsFor = (width, height) =>
        new Viewport(makeViewportScene(width, height)).getLayoutMetrics({
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
        });

    const smallPhone = metricsFor(320, 568);
    assert.equal(smallPhone.isTiny, true);
    assert.equal(smallPhone.isCompact, true);

    const notchPhone = metricsFor(390, 844);
    assert.equal(notchPhone.isCompact, notchPhone.innerWidth < GAME_CONSTANTS.HUD_COMPACT_WIDTH);

    const tablet = metricsFor(768, 1024);
    assert.equal(tablet.isTiny, false);

    const desktop = metricsFor(1920, 1080);
    assert.equal(desktop.isCompact, false);
    assert.equal(desktop.isTiny, false);
    assert.equal(desktop.hudScale, 1);
    assert.equal(desktop.fonts.timer, 32);
});

test('font fitting never shrinks the timer into illegibility', async () => {
    const { Viewport } = await importModule('Viewport.js');
    const viewport = new Viewport(makeViewportScene(390, 844));

    assert.equal(viewport.fitFontSize(32, 100, 300), 32);
    assert.equal(viewport.fitFontSize(32, 0, 300), 32);
    const fitted = viewport.fitFontSize(32, 400, 200);
    assert.ok(fitted < 32 && fitted >= 16);
    assert.equal(viewport.fitFontSize(32, 4000, 200, 16), 16);
});

test('hud layout math is pure and matches the viewport delegate', async () => {
    const { Viewport } = await importModule('Viewport.js');
    const { computeLayoutMetrics, fitFontSize } = await importModule('HudLayout.js');
    const insets = { top: 47, right: 0, bottom: 34, left: 0 };
    const viewport = new Viewport(makeViewportScene(390, 844));

    assert.deepEqual(viewport.getLayoutMetrics(insets), computeLayoutMetrics(390, 844, insets));
    assert.equal(viewport.fitFontSize(56, 500, 300, 22), fitFontSize(56, 500, 300, 22));
});

test('ui manager without a viewport shares the hud layout math', async () => {
    const { UIManager } = await importModule('UIManager.js');
    const { computeLayoutMetrics } = await importModule('HudLayout.js');
    const { GAME_CONSTANTS } = await importModule('Constants.js');
    const ui = new UIManager({
        getViewportWidth: () => 390,
        getViewportHeight: () => 844,
    });
    assert.deepEqual(
        ui.getLayoutMetrics(),
        computeLayoutMetrics(390, 844, GAME_CONSTANTS.SAFE_AREA_FALLBACK)
    );
});

test('game config scales to any window and keeps desktop + mobile input ready', async () => {
    const { createGameConfig } = await importModule('GameConfig.js');

    for (const size of [
        { width: 320, height: 568 },
        { width: 390, height: 844 },
        { width: 1280, height: 720 },
        { width: 1920, height: 1080 },
        { width: 2560, height: 1080 },
    ]) {
        const config = createGameConfig(size, function FakeScene() {});
        assert.equal(config.width, size.width, `width ${size.width}x${size.height}`);
        assert.equal(config.height, size.height, `height ${size.width}x${size.height}`);
        assert.equal(config.scale.mode, 'RESIZE');
        assert.equal(config.parent, 'phaser-game');
        assert.ok(
            config.input.activePointers >= 2,
            'multitouch needs at least two pointers for move+jump'
        );
        assert.equal(config.input.touch.capture, true);
        assert.equal(config.physics.arcade.gravity.y, 300);
        assert.equal(config.render.roundPixels, true);
    }
});

test('multitouch movement survives a second finger and release order', async () => {
    const { InputController } = await importModule('InputController.js');
    const { GAME_CONSTANTS } = await importModule('Constants.js');
    const button = (x, y, size) => ({
        x,
        y,
        displayWidth: size,
        displayHeight: size,
        touchHitPadding: 0,
        getBounds(target) {
            target.x = x - size / 2;
            target.y = y - size / 2;
            target.width = size;
            target.height = size;
            return target;
        },
    });
    const scene = {
        jumpPointerId: null,
        pointerTapTimes: new Map(),
        uiManager: { touchControlsEnabled: true },
        getViewportWidth: () => 390,
    };
    const controller = new InputController(scene);
    const controls = {
        leftButton: button(60, 700, 80),
        rightButton: button(160, 700, 80),
        jumpButton: button(330, 700, 80),
    };

    // Two simultaneous fingers: movement on the right button, jump on jump.
    controller.fillPointerTargets({ x: 160, y: 700 }, controls);
    assert.equal(controller.targets.right, true);
    controller.fillPointerTargets({ x: 330, y: 700 }, controls);
    assert.equal(controller.targets.jump, true);

    // Releasing jump must not steal the held movement finger.
    scene.leftPressed = false;
    scene.rightPressed = false;
    controller.applyPointerMovement(
        { id: 1, isDown: true, x: 160, y: 700 },
        { hasCoordinates: true, left: false, right: true },
        195,
        controls
    );
    assert.equal(scene.rightPressed, true);

    // A finger tagged as the jump pointer never drives movement.
    scene.jumpPointerId = 9;
    scene.leftPressed = false;
    scene.rightPressed = false;
    controller.applyPointerMovement(
        { id: 9, isDown: true, x: 100, y: 700 },
        { hasCoordinates: true, left: true, right: false },
        195,
        controls
    );
    assert.equal(scene.leftPressed, false);
    assert.equal(scene.rightPressed, false);
    scene.jumpPointerId = null;

    // Without on-screen buttons, either half of the screen steers.
    scene.uiManager.touchControlsEnabled = true;
    controller.applyPointerMovement(
        { id: 2, isDown: true, x: 100, y: 500 },
        { hasCoordinates: true, x: 100 },
        195,
        {}
    );
    assert.equal(scene.leftPressed, true);
    controller.applyPointerMovement(
        { id: 3, isDown: true, x: 300, y: 500 },
        { hasCoordinates: true, x: 300 },
        195,
        {}
    );
    assert.equal(scene.rightPressed, true);

    // Touch disabled: desktop mouse pointers never steer the chicken.
    scene.uiManager.touchControlsEnabled = false;
    scene.leftPressed = false;
    scene.rightPressed = false;
    controller.applyPointerMovement(
        { id: 4, isDown: true, x: 100, y: 500 },
        { hasCoordinates: true, x: 100 },
        195,
        {}
    );
    assert.equal(scene.leftPressed, false);
    assert.equal(GAME_CONSTANTS.TOUCH_POINTER_TOTAL >= 2, true);
});

test('short taps jump, long presses and UI taps do not', async () => {
    const { InputController } = await importModule('InputController.js');
    const { GAME_CONSTANTS } = await importModule('Constants.js');
    const scene = {
        jumpPointerId: null,
        pointerTapTimes: new Map(),
        uiManager: { touchControlsEnabled: true },
        getViewportWidth: () => 390,
    };
    const controller = new InputController(scene);
    const emptyControls = {};

    assert.equal(
        controller.isShortPointerJump(
            { justUp: true, downTime: 1000, upTime: 1100 },
            emptyControls
        ),
        true
    );
    assert.equal(
        controller.isShortPointerJump(
            {
                justUp: true,
                downTime: 1000,
                upTime: 1000 + GAME_CONSTANTS.JUMP_BUTTON_TOUCH_TOLERANCE + 50,
            },
            emptyControls
        ),
        false
    );
    assert.equal(controller.isShortPointerJump({ justUp: false }, emptyControls), false);

    // Taps on movement buttons are movement, not jumps.
    const moveButton = {
        getBounds(target) {
            target.x = 0;
            target.y = 0;
            target.width = 80;
            target.height = 80;
            return target;
        },
    };
    assert.equal(
        controller.isShortPointerJump(
            { justUp: true, x: 40, y: 40, downTime: 0, upTime: 50 },
            { leftButton: moveButton }
        ),
        false
    );

    // Double-tap fires only on the second quick tap outside UI.
    const pointer = { id: 7, justUp: true, upTime: 5000 };
    assert.equal(
        controller.recordPointerTap(pointer, { hasCoordinates: true }),
        false,
        'first tap arms but does not jump'
    );
    assert.equal(
        controller.recordPointerTap(
            { ...pointer, upTime: 5000 + GAME_CONSTANTS.DOUBLE_TAP_THRESHOLD - 10 },
            { hasCoordinates: true }
        ),
        true,
        'second quick tap jumps'
    );
    assert.equal(
        controller.recordPointerTap(
            { ...pointer, upTime: 9000 },
            { hasCoordinates: true, jump: true }
        ),
        false,
        'taps on UI controls never double-tap jump'
    );
});

test('touch movement survives handleInput; bot input only overrides in debug mode', async () => {
    const { SpaceChicken } = await importModule('SpaceChicken.js');
    const scene = new SpaceChicken();
    // poll() behaves like the real InputController: touch sets movement flags.
    scene.inputController = {
        poll: () => {
            scene.leftPressed = true;
            scene.rightPressed = false;
            return {};
        },
    };
    scene.debugMode = false;
    scene.awaitingStart = false;
    global.window = {};

    scene.handleInput();
    assert.equal(scene.leftPressed, true, 'production touch movement must survive handleInput');

    // A manually-injected bot hook is ignored outside debug mode.
    global.window.__spaceChickenBotInput = { left: false, right: true, jump: true };
    scene.jumpRequested = false;
    scene.handleInput();
    assert.equal(scene.rightPressed, false);
    assert.equal(scene.leftPressed, true);
    assert.equal(scene.jumpRequested, false);

    // In debug mode the bot pilot takes over steering.
    scene.debugMode = true;
    scene.handleInput();
    assert.equal(scene.rightPressed, true);
    assert.equal(scene.leftPressed, false);
    assert.equal(scene.jumpRequested, true);
    delete global.window.__spaceChickenBotInput;
});

test('pointer tracking dedupes phaser pointer lists', async () => {
    const { InputController } = await importModule('InputController.js');
    const controller = new InputController({ getViewportWidth: () => 390 });
    const shared = { id: 1 };
    const pointers = [];
    controller.pushUniquePointer(shared, pointers);
    controller.pushUniquePointer(shared, pointers);
    controller.pushUniquePointer(null, pointers);
    assert.equal(pointers.length, 1);
});

test('gamepad and touch controllers work standalone and back the facade', async () => {
    const { InputController } = await importModule('InputController.js');
    const { GamepadController } = await importModule('GamepadController.js');
    const { TouchController } = await importModule('TouchController.js');

    const scene = { getViewportWidth: () => 390 };
    const controller = new InputController(scene);
    assert.ok(controller.gamepad instanceof GamepadController);
    assert.ok(controller.touch instanceof TouchController);
    assert.equal(controller.targets, controller.touch.targets);

    // No gamepads in node: polling is a safe no-op that clears latched edges.
    const gamepad = new GamepadController({});
    assert.deepEqual(gamepad.readGamepads(), []);
    assert.equal(gamepad.getGamepad(), null);
    const state = { menu: {} };
    gamepad.pollGamepad(state);
    assert.equal(state.gamepadJumpJustPressed, undefined);

    // Touch hit-testing works without the full scene.
    const touch = new TouchController({
        jumpPointerId: null,
        uiManager: { touchControlsEnabled: true },
    });
    const button = {
        touchHitPadding: 0,
        getBounds: (target) => {
            target.x = 0;
            target.y = 0;
            target.width = 80;
            target.height = 80;
            return target;
        },
    };
    const targets = touch.fillPointerTargets({ x: 40, y: 40 }, { jumpButton: button });
    assert.equal(targets.jump, true);
    assert.equal(touch.isOverUiControl(targets), true);
});

test('gamepads slow-poll when absent and share one snapshot per frame', async () => {
    const { InputController } = await importModule('InputController.js');
    const { GAME_CONSTANTS } = await importModule('Constants.js');
    const navigatorTarget = globalThis.navigator;
    const original = navigatorTarget.getGamepads;
    let calls = 0;
    let pads = [];
    navigatorTarget.getGamepads = () => {
        calls += 1;
        return pads;
    };
    try {
        const controller = new InputController({ coopMode: null });
        controller.pollGamepad({ menu: {} });
        assert.equal(calls, 1);
        for (let i = 0; i < GAME_CONSTANTS.GAMEPAD_SLOW_POLL_FRAMES * 2; i++) {
            controller.pollGamepad({ menu: {} });
        }
        assert.ok(calls <= 4);

        pads = [{ connected: true, buttons: [], axes: [] }];
        for (let i = 0; i <= GAME_CONSTANTS.GAMEPAD_SLOW_POLL_FRAMES; i++) {
            controller.pollGamepad({ menu: {} });
        }
        const before = calls;
        for (let i = 0; i < 5; i++) {
            controller.pollGamepad({ menu: {} });
        }
        assert.equal(calls - before, 5);
        assert.equal(controller.getGamepad(0), pads[0]);
        assert.equal(calls - before, 5);

        pads = [];
        for (let i = 0; i <= GAME_CONSTANTS.GAMEPAD_SLOW_POLL_FRAMES + 1; i++) {
            controller.pollGamepad({ menu: {} });
        }
        const idle = calls;
        controller.pollGamepad({ menu: {} });
        assert.equal(calls - idle, 0);
    } finally {
        if (original === undefined) {
            delete navigatorTarget.getGamepads;
        } else {
            navigatorTarget.getGamepads = original;
        }
    }
});
