const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');

function mockSprite(frameWidth, frameHeight) {
    return {
        x: 0,
        y: 0,
        width: frameWidth,
        height: frameHeight,
        scaleX: 1,
        scaleY: 1,
        displayWidth: frameWidth,
        displayHeight: frameHeight,
        bonkable: false,
        body: {
            allowGravity: true,
            sizeCall: null,
            circleCall: null,
            setSize(w, h, center) {
                this.sizeCall = { w, h, center };
            },
            setCircle(r, ox, oy) {
                this.circleCall = { r, ox, oy };
            },
        },
        setImmovable() {},
        setDepth() {},
        setScale(s) {
            this.scaleX = s;
            this.scaleY = s;
            this.displayWidth = this.width * s;
            this.displayHeight = this.height * s;
        },
    };
}

function mockBuilder() {
    return {
        tagTestEntity() {},
        tweens: null,
        add: null,
    };
}

function mockGroup(sprite) {
    return {
        create() {
            return sprite;
        },
    };
}

test('drone body uses source coordinates for scaled generated textures', async () => {
    const { spawn } = await import(pathToFileURL(path.join(root, 'enemies/drone.js')).href);
    const drone = mockSprite(1920, 1280);
    spawn(mockBuilder(drone), mockGroup(drone), { x: 100, y: 100, key: 'bot', scale: 0.05 });
    assert.equal(drone.displayWidth, 96);
    const call = drone.body.circleCall;
    assert.ok(call, 'setCircle called');
    // Visible sprite is 96px wide; the lethal circle should be ~24px on
    // screen (radius displayWidth*0.25), i.e. 480 source units at 0.05.
    assert.ok(Math.abs(call.r - 480) <= 2, `radius ${call.r} ~= 480 source units`);
    assert.ok(Math.abs(call.ox - 480) <= 2, `offsetX ${call.ox} centers the circle`);
    assert.ok(Math.abs(call.oy - 160) <= 2, `offsetY ${call.oy} centers the circle`);
});

test('unscaled canvas drones keep their existing body', async () => {
    const { spawn } = await import(pathToFileURL(path.join(root, 'enemies/drone.js')).href);
    const drone = mockSprite(48, 48);
    spawn(mockBuilder(drone), mockGroup(drone), { x: 100, y: 100, key: 'drone' });
    const call = drone.body.circleCall;
    assert.equal(call.r, 12);
    assert.equal(call.ox, 12);
    assert.equal(call.oy, 12);
});

test('bear raider body uses source coordinates at scale 0.05', async () => {
    const { spawn } = await import(pathToFileURL(path.join(root, 'enemies/bear-raider.js')).href);
    const bear = mockSprite(1020, 1032);
    spawn(mockBuilder(bear), mockGroup(bear), { x: 100, y: 100, scale: 0.05 });
    assert.equal(Math.round(bear.displayWidth), 51);
    const call = bear.body.sizeCall;
    assert.ok(call, 'setSize called');
    // ~62% of the visible 51px bear is ~32px on screen = ~632 source units.
    assert.ok(Math.abs(call.w - 632) <= 4, `body width ${call.w} ~= 632 source units`);
    assert.equal(call.w, call.h);
});
