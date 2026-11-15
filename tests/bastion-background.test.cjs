const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');

function fileUrl(relative) {
    return pathToFileURL(path.join(root, relative)).href;
}

function mockRenderer() {
    const calls = {
        fillRect: [],
        fillCircle: [],
        strokeCircle: [],
        strokeRect: [],
        polygons: [],
        gradients: 0,
        glows: 0,
    };
    return {
        calls,
        graphics: {
            fillStyle() {},
            fillRect(x, y, width, height) {
                calls.fillRect.push({ x, y, width, height });
            },
            fillCircle(x, y, radius) {
                calls.fillCircle.push({ x, y, radius });
            },
            lineStyle() {},
            beginPath() {},
            moveTo() {},
            lineTo() {},
            strokePath() {},
            strokeRect(x, y, width, height) {
                calls.strokeRect.push({ x, y, width, height });
            },
            strokeCircle(x, y, radius) {
                calls.strokeCircle.push({ x, y, radius });
            },
        },
        renderVerticalGradient() {
            calls.gradients += 1;
        },
        renderPolygon(points) {
            calls.polygons.push(points);
        },
        drawGlow() {
            calls.glows += 1;
        },
    };
}

async function loadPainter() {
    return import(fileUrl('backgrounds/bastion.js'));
}

async function levelBackground(relative) {
    const module = await import(fileUrl(relative));
    return module.level.content.background;
}

async function renderLayer(background, layerId, worldWidth = 6000, worldHeight = 760) {
    const { createBastionBackgroundLayout, renderBastionBackground } = await loadPainter();
    const layout = createBastionBackgroundLayout(background, worldWidth, worldHeight);
    const renderer = mockRenderer();
    renderBastionBackground(renderer, background, layout, worldWidth, worldHeight, layerId);
    return { layout, calls: renderer.calls };
}

test('bastion layout dresses the full shaft height', async () => {
    const { createBastionBackgroundLayout } = await loadPainter();
    const layout = createBastionBackgroundLayout({ style: 'relay' }, 6000, 1600);
    assert.ok(layout.plates.length > 20);
    assert.ok(layout.hooks.length >= 5);
    assert.ok(layout.stubs.length >= 3);
    assert.ok(layout.shafts.length >= 10);
    const ys = layout.plates.map((plate) => plate.y);
    assert.ok(Math.max(...ys) - Math.min(...ys) > 1600 * 0.4);
    const narrow = createBastionBackgroundLayout({ style: 'relay' }, 6000, 760);
    assert.ok(narrow.plates.length < layout.plates.length);
});

test('bastion painters render every layer for every shipped style', async () => {
    const backgrounds = [
        await levelBackground('levels/bastion-relay.js'),
        await levelBackground('levels/iron-vault.js'),
        await levelBackground('levels/freezer-breach.js'),
        await levelBackground('levels/ticker-plunge.js'),
    ];
    const layerIds = ['sky', 'far', 'mid', 'near', 'fore'];
    for (const background of backgrounds) {
        for (const layerId of layerIds) {
            const { calls } = await renderLayer(background, layerId);
            const draws =
                calls.fillRect.length +
                calls.fillCircle.length +
                calls.strokeRect.length +
                calls.strokeCircle.length +
                calls.polygons.length;
            assert.ok(draws > 0, `${background.style || 'default'} ${layerId} draws`);
        }
    }
});

test('vault seals, coldstore crystals, and relay conduit runs differ', async () => {
    const vault = await renderLayer(await levelBackground('levels/iron-vault.js'), 'far');
    assert.ok(vault.calls.strokeCircle.length >= 3, 'vault seal rings drawn');
    const cold = await renderLayer(await levelBackground('levels/freezer-breach.js'), 'far');
    assert.ok(cold.calls.strokeCircle.length === 0, 'coldstore draws no vault seals');
    assert.ok(cold.calls.polygons.length > 0, 'coldstore draws crystal shards');
    const relay = await renderLayer(await levelBackground('levels/bastion-relay.js'), 'far');
    const conduitRun = relay.calls.fillRect.find(
        (rect) => rect.y === 760 * 0.2 && rect.width === 6000
    );
    assert.ok(conduitRun, 'relay draws its full-width conduit run');
});

test('fore layer frames the shaft top and bottom', async () => {
    const { calls } = await renderLayer(await levelBackground('levels/bastion-relay.js'), 'fore');
    const cables = calls.fillRect.filter((rect) => rect.y === 0 && rect.height > 90);
    assert.ok(cables.length >= 5, 'hanging cables drop from the ceiling');
    const stubs = calls.fillRect.filter((rect) => rect.y + rect.height === 760);
    assert.ok(stubs.length >= 3, 'pipe stubs rise from the floor');
});

test('unknown layer ids paint nothing', async () => {
    const { calls } = await renderLayer(
        await levelBackground('levels/bastion-relay.js'),
        'parallax'
    );
    assert.equal(calls.fillRect.length, 0);
    assert.equal(calls.gradients, 0);
});

test('bastion levels use the five-layer parallax list', async () => {
    const { GAME_CONSTANTS, parallaxLayersForLevel } = await import(fileUrl('Constants.js'));
    const bastion = parallaxLayersForLevel(11, 'bastion');
    assert.deepEqual(
        bastion.map((layer) => layer.id),
        ['sky', 'far', 'mid', 'near', 'fore']
    );
    assert.equal(bastion, GAME_CONSTANTS.BACKGROUND_PARALLAX_LAYERS_BASTION);
    assert.ok(bastion.every((layer) => layer.scrollY === 1));
    const scrolls = bastion.map((layer) => layer.scrollX);
    assert.deepEqual(
        [...scrolls].sort((a, b) => a - b),
        scrolls
    );
    // The type argument is optional: existing callers keep the four-layer list.
    assert.equal(parallaxLayersForLevel(11).length, 4);
    assert.equal(parallaxLayersForLevel(16, 'space').length, 4);
    assert.equal(parallaxLayersForLevel(2, 'bastion').length, 4);
});

test('bastion renderer prepares five layers and drifting accents', async () => {
    const { BackgroundRenderer } = await import(fileUrl('BackgroundRenderer.js'));
    const { GAME_CONSTANTS } = await import(fileUrl('Constants.js'));
    const motes = [];
    const scene = {
        level: 11,
        levelConfig: { background: { type: 'bastion', style: 'vault' } },
        textures: { getTextureKeys: () => [] },
        add: {
            image(x, y, key) {
                const mote = {
                    key,
                    setDepth(value) {
                        this.depth = value;
                        return this;
                    },
                    setScale(value) {
                        this.scale = value;
                        return this;
                    },
                    setScrollFactor(xValue, yValue) {
                        this.scrollFactorX = xValue;
                        this.scrollFactorY = yValue;
                        return this;
                    },
                    setTint(value) {
                        this.tint = value;
                        return this;
                    },
                    setAlpha(value) {
                        this.alpha = value;
                        return this;
                    },
                };
                motes.push(mote);
                return mote;
            },
        },
        tweens: { add: () => ({ stop() {} }) },
    };
    const renderer = new BackgroundRenderer(scene);
    const { layers } = renderer.prepareRender(6000, 760);
    assert.equal(layers.length, 5);
    renderer.createBastionAccents();
    assert.equal(motes.length, GAME_CONSTANTS.BASTION_ACCENT_COUNT);
    assert.ok(motes.every((mote) => mote.key === 'particleSoft'));
    assert.ok(motes.every((mote) => mote.scrollFactorX === 0.32));
    renderer.layoutAccents();
    assert.ok(motes.every((mote) => mote.x >= 0 && mote.x <= 6000));
    assert.ok(motes.every((mote) => mote.y >= 0 && mote.y <= 760));
    renderer.destroyPlacedLayers();
    assert.equal(renderer.accents.length, 0);
    assert.equal(renderer.accentTweens.length, 0);
});

test('non-bastion levels spawn no accents', async () => {
    const { BackgroundRenderer } = await import(fileUrl('BackgroundRenderer.js'));
    let images = 0;
    const scene = {
        level: 3,
        levelConfig: { background: { type: 'space', style: 'default' } },
        add: {
            image() {
                images += 1;
                return {};
            },
        },
    };
    const renderer = new BackgroundRenderer(scene);
    renderer.createBastionAccents();
    assert.equal(images, 0);
    assert.equal(renderer.accents.length, 0);
});
