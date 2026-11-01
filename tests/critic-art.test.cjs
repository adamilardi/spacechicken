const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const projectRoot = path.resolve(__dirname, '..');

async function loadArtCritic() {
    return import(pathToFileURL(path.join(projectRoot, 'scripts/critic-art.mjs')).href);
}

test('selection assets resolve selection-relative before root-relative', async () => {
    const { resolveSelectionAsset } = await loadArtCritic();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'artcritic-'));
    fs.writeFileSync(
        path.join(dir, 'paint.js'),
        'export function paint(ctx) { ctx.fillRect(0, 0, 4, 4); }'
    );
    const paint = resolveSelectionAsset('paint.js', dir);
    assert.equal(paint.kind, 'file');
    assert.equal(paint.via, 'selection-relative');
    const shipped = resolveSelectionAsset('assets/news-fear-spike/bg.jpg', dir);
    assert.equal(shipped.kind, 'file');
    assert.equal(shipped.via, 'root-relative');
    assert.equal(resolveSelectionAsset('nope.png', dir).kind, 'missing');
    assert.deepEqual(resolveSelectionAsset('canvas:skyhookDeck', dir), {
        kind: 'canvas',
        keys: ['skyhookDeck'],
    });
});

test('art critic judges a real selector-produced selection', async () => {
    const { criticArt } = await loadArtCritic();
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'artcritic-out-'));
    const result = await criticArt(path.join(projectRoot, 'art-selections/18/selection.json'), {
        outDir,
    });
    assert.equal(result.verdict, 'PASS');
    assert.ok(result.checks.some((c) => c.check === 'canvas-paint' && c.result === 'pass'));
});

test('art critic renders a canvas paint selection instead of bypassing it', async () => {
    const { criticArt, closeArtCriticBrowser } = await loadArtCritic();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'artcritic-sel-'));
    fs.copyFileSync(
        path.join(projectRoot, 'art-candidates/contra-shrike/enemy-shrike-a/paint.js'),
        path.join(dir, 'paint.js')
    );
    fs.writeFileSync(
        path.join(dir, 'selection.json'),
        JSON.stringify({
            schema_version: 1,
            level_id: 'test',
            choices: [{ role: 'enemy', asset_path: 'paint.js' }],
        })
    );
    try {
        const result = await criticArt(path.join(dir, 'selection.json'), { outDir: dir });
        assert.equal(result.verdict, 'PASS');
        assert.ok(
            result.checks.some(
                (c) =>
                    (c.check === 'gameplay-preview' || c.check === 'canvas-executed') &&
                    c.result === 'pass'
            )
        );
    } finally {
        await closeArtCriticBrowser();
    }
});

test('art critic fails unregistered canvas keys and missing files', async () => {
    const { criticArt } = await loadArtCritic();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'artcritic-bad-'));
    fs.writeFileSync(
        path.join(dir, 'selection.json'),
        JSON.stringify({
            schema_version: 1,
            level_id: 'test',
            choices: [
                { role: 'decks', asset_path: 'canvas:noSuchTextureKey123' },
                { role: 'background', asset_path: 'missing.png' },
            ],
        })
    );
    const result = await criticArt(path.join(dir, 'selection.json'), { outDir: dir });
    assert.equal(result.verdict, 'ITERATE');
    assert.equal(result.checks.filter((c) => c.result === 'fail').length, 2);
});
