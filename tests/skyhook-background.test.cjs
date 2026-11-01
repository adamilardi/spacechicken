const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');

function mockRenderer() {
    const calls = { fillRect: [], gradients: 0 };
    return {
        calls,
        graphics: {
            fillStyle() {},
            fillRect(x, y, width, height) {
                calls.fillRect.push({ x, y, width, height });
            },
            lineStyle() {},
            beginPath() {},
            moveTo() {},
            lineTo() {},
            strokePath() {},
            strokeRect() {},
        },
        renderVerticalGradient() {
            calls.gradients += 1;
        },
    };
}

async function renderSky(background) {
    const { createSkyhookBackgroundLayout, renderSkyhookBackground } = await import(
        pathToFileURL(path.join(root, 'backgrounds/skyhook.js')).href
    );
    const worldWidth = 6000;
    const worldHeight = 760;
    const layout = createSkyhookBackgroundLayout(background, worldWidth, worldHeight);
    const renderer = mockRenderer();
    renderSkyhookBackground(renderer, background, layout, worldWidth, worldHeight, 'sky');
    return { layout, calls: renderer.calls };
}

test('skyhook sky draws its tether ribbon by default', async () => {
    const { layout, calls } = await renderSky({ palette: {} });
    const bars = calls.fillRect.filter(
        (rect) => rect.y === 0 && rect.height === 760 && Math.abs(rect.x - layout.ribbonX) < 10
    );
    assert.ok(bars.length >= 2, 'ribbon glow + core rects drawn');
    assert.equal(calls.gradients, 1);
});

test('skyhook sky omits the ribbon when ribbon is false', async () => {
    const { layout, calls } = await renderSky({ palette: {}, ribbon: false });
    const bars = calls.fillRect.filter(
        (rect) => rect.y === 0 && rect.height === 760 && Math.abs(rect.x - layout.ribbonX) < 10
    );
    assert.deepEqual(bars, []);
    assert.equal(calls.gradients, 1);
});

test('fear spike opts out of the tether ribbon', async () => {
    const fear = await import(pathToFileURL(path.join(root, 'levels/fear-spike.js')).href);
    const anchor = await import(pathToFileURL(path.join(root, 'levels/skyhook-anchor.js')).href);
    assert.equal(fear.level.content.background.type, 'skyhook');
    assert.equal(fear.level.content.background.ribbon, false);
    assert.notEqual(anchor.level.content.background.ribbon, false);
});
