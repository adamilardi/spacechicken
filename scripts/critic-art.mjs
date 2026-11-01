// Art critic: runnable gate for an art selection.
// Renders every selected asset at gameplay size, checks the mechanical
// half (files exist, plate covers, cutouts keyed, canvas paints run),
// and prints the manual checklist for the judgment half (devices,
// landmark, silhouette).
// Usage: node scripts/critic-art.mjs <selection.json> [--out <dir>]
// Exit: 0 PASS, 2 ITERATE, 1 error.
//
// Selection path contract (schema_version 1): every choice.asset_path is
// resolved in this order —
//   1. relative to the selection folder (the selector skill's contract),
//   2. relative to the repository root (shipped assets/news-*/ paths),
//   3. `canvas:<textureKey>[/<textureKey>...]` for shipped canvas paints.
// Raster files are decoded and previewed with Sharp. Canvas paint
// modules (.js exporting `paint(ctx, width, height)`) are executed and
// rendered to a real preview in headless Chromium; when no browser is
// available they are executed against a recording stub and the preview
// is reported as unavailable rather than silently skipped.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const GAMEPLAY_ACTOR_PX = 52;
const MIN_PLATE_W = 960;
const MIN_PLATE_H = 540;
const RASTER_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif']);
const PAINT_EXTENSIONS = new Set(['.js', '.mjs']);

export function roleKind(role) {
    const text = String(role || '').toLowerCase();
    if (/background|plate|backdrop/.test(text)) return 'background';
    if (/actor|enemy|drone|prop|hazard|boss/.test(text)) return 'actor';
    return 'other';
}

export function resolveSelectionAsset(asset, selectionDir, root = ROOT) {
    const raw = String(asset || '');
    if (raw.startsWith('canvas:'))
        return { kind: 'canvas', keys: raw.slice('canvas:'.length).split('/').filter(Boolean) };
    const fromSelection = path.resolve(selectionDir, raw);
    if (existsSync(fromSelection))
        return { kind: 'file', abs: fromSelection, via: 'selection-relative' };
    const fromRoot = path.resolve(root, raw);
    if (existsSync(fromRoot)) return { kind: 'file', abs: fromRoot, via: 'root-relative' };
    return { kind: 'missing', abs: fromSelection, via: null };
}

let spriteSourceCache = null;
export function canvasTextureExists(key, root = ROOT) {
    if (!spriteSourceCache) {
        spriteSourceCache = '';
        const candidates = ['SpriteFactory.js', 'BackgroundRenderer.js'];
        for (const file of candidates) {
            try {
                spriteSourceCache += readFileSync(path.join(root, file), 'utf8');
            } catch {
                // Source moved; the sprites/ scan below still applies.
            }
        }
        try {
            for (const file of readdirSync(path.join(root, 'sprites'))) {
                if (file.endsWith('.js')) {
                    spriteSourceCache += readFileSync(path.join(root, 'sprites', file), 'utf8');
                }
            }
        } catch {
            // No sprites folder: only the named sources count.
        }
    }
    return spriteSourceCache.includes(`'${key}'`) || spriteSourceCache.includes(`"${key}"`);
}

export async function opaqueFraction(imagePath) {
    const { data, info } = await sharp(imagePath)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
    let opaque = 0;
    for (let i = 3; i < data.length; i += info.channels) {
        if (data[i] > 127) opaque += 1;
    }
    return opaque / (info.width * info.height);
}

async function renderPreview(assetPath, kind, outDir, base) {
    if (kind === 'background') {
        const out = path.join(outDir, `${base}-gameplay-1280x720.jpg`);
        await sharp(assetPath)
            .resize(1280, 720, { fit: 'cover' })
            .jpeg({ quality: 80 })
            .toFile(out);
        return out;
    }
    if (kind === 'actor') {
        const trimmed = await sharp(assetPath).trim().toBuffer();
        const meta = await sharp(trimmed).metadata();
        const scale = GAMEPLAY_ACTOR_PX / Math.max(1, meta.height);
        const w = Math.max(1, Math.round(meta.width * scale));
        const resized = await sharp(trimmed).resize(w, GAMEPLAY_ACTOR_PX).toBuffer();
        const out = path.join(outDir, `${base}-gameplay-52px.png`);
        await sharp({
            create: {
                width: 256,
                height: 128,
                channels: 3,
                background: { r: 10, g: 14, b: 20 },
            },
        })
            .composite([{ input: resized, gravity: 'center' }])
            .png()
            .toFile(out);
        return out;
    }
    const out = path.join(outDir, `${base}-preview.png`);
    await sharp(assetPath).resize(512, 512, { fit: 'inside' }).png().toFile(out);
    return out;
}

// Execute a canvas paint without a browser: every ctx call is recorded
// through a permissive proxy so a paint that throws, exports nothing, or
// draws nothing fails here instead of at integration time.
export async function executePaintStub(paintPath) {
    const module = await import(pathToFileURL(paintPath).href);
    const paint = module.paint || module.default;
    if (typeof paint !== 'function') {
        throw new Error('paint module exports no paint(ctx, width, height) function');
    }
    const calls = [];
    const gradient = { addColorStop: () => {} };
    const ctx = new Proxy(
        {},
        {
            get(_target, prop) {
                if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
                    return () => gradient;
                }
                if (typeof prop === 'string') {
                    return (...args) => {
                        calls.push({ method: prop, args: args.length });
                    };
                }
                return undefined;
            },
            set(_target, prop, value) {
                calls.push({ method: `set:${String(prop)}`, value: String(value) });
                return true;
            },
        }
    );
    paint(ctx, 96, 96);
    const drawCalls = calls.filter((call) => !call.method.startsWith('set:'));
    if (!drawCalls.length) throw new Error('paint executed but issued no draw calls');
    return { drawCalls: drawCalls.length };
}

let browserPromise = null;
async function renderPaintPreview(paintPath, kind, outDir, base) {
    await executePaintStub(paintPath);
    try {
        if (!browserPromise) {
            browserPromise = (async () => {
                const { chromium } = await import(
                    path.join(ROOT, 'node_modules/playwright/index.mjs')
                );
                return chromium.launch({
                    headless: true,
                    args: ['--no-sandbox', '--ignore-gpu-blocklist'],
                });
            })();
        }
        const browser = await browserPromise;
        const page = await browser.newPage();
        const source = readFileSync(paintPath, 'utf8').replace(
            /export\s+function\s+paint/,
            'function paint'
        );
        const dataUrl = await page.evaluate(async (paintSource) => {
            // eslint-disable-next-line no-eval
            eval(`${paintSource}\n;window.__paint = paint;`);
            const canvas = document.createElement('canvas');
            canvas.width = 160;
            canvas.height = 120;
            const ctx = canvas.getContext('2d');
            window.__paint(ctx, canvas.width, canvas.height);
            return canvas.toDataURL('image/png');
        }, source);
        await page.close();
        const raw = path.join(outDir, `${base}-paint-raw.png`);
        writeFileSync(raw, Buffer.from(dataUrl.split(',')[1], 'base64'));
        const out = await renderPreview(raw, kind, outDir, base);
        return { preview: out, rendered: true };
    } catch (error) {
        return { preview: null, rendered: false, detail: String(error.message || error) };
    }
}

export async function closeArtCriticBrowser() {
    if (browserPromise) {
        const browser = await browserPromise.catch(() => null);
        await browser?.close().catch(() => {});
        browserPromise = null;
    }
}

export function manualChecklist() {
    return [
        'Two-device difference: name the two composition devices that differ from every shipped background type (see the authoring reference catalog).',
        'Landmark read at 1x: open the gameplay preview — the signature landmark names the place without the instructions paragraph.',
        'Silhouette distinctness: the actor cutout at 52px is not mistakable for a shipped hazard or the chicken.',
        'Palette anchor: the set matches the style-anchor palette; background stays quieter than chicken, hazards, and platform edges.',
        'No doubles: the plate paints no characters, crowns, or text that duplicate live sprites.',
    ];
}

async function judgeRasterAsset({ asset, assetPath, kind, dir, base, pass, fail, previews }) {
    const meta = await sharp(assetPath).metadata();
    try {
        const preview = await renderPreview(assetPath, kind, dir, base);
        previews.push({ asset, kind, preview: path.relative(ROOT, preview) });
        pass(asset, 'gameplay-preview', path.relative(ROOT, preview));
    } catch (error) {
        fail(asset, 'gameplay-preview', String(error.message || error));
    }
    if (kind === 'background') {
        if ((meta.width || 0) >= MIN_PLATE_W && (meta.height || 0) >= MIN_PLATE_H) {
            pass(asset, 'plate-covers', `${meta.width}x${meta.height}`);
        } else {
            fail(
                asset,
                'plate-covers',
                `${meta.width}x${meta.height} below ${MIN_PLATE_W}x${MIN_PLATE_H}`
            );
        }
    }
    if (kind === 'actor') {
        if (meta.hasAlpha) {
            pass(asset, 'has-alpha', `${meta.width}x${meta.height} RGBA`);
        } else {
            fail(asset, 'has-alpha', 'no alpha channel — key it with scripts/key-enemy.mjs');
        }
        try {
            const opaque = await opaqueFraction(assetPath);
            if (opaque > 0.02 && opaque < 0.97) {
                pass(asset, 'cutout-fill', `${(opaque * 100).toFixed(1)}% opaque`);
            } else {
                fail(
                    asset,
                    'cutout-fill',
                    `${(opaque * 100).toFixed(1)}% opaque — ${opaque <= 0.02 ? 'empty key' : 'unkeyed full-bleed?'}`
                );
            }
        } catch (error) {
            fail(asset, 'cutout-fill', String(error.message || error));
        }
    }
}

export async function criticArt(selectionPath, { outDir = null } = {}) {
    const resolved = path.isAbsolute(selectionPath)
        ? selectionPath
        : path.join(ROOT, selectionPath);
    if (!existsSync(resolved)) {
        throw new Error(`selection not found: ${selectionPath}`);
    }
    const selection = JSON.parse(readFileSync(resolved, 'utf8'));
    const selectionDir = path.dirname(resolved);
    const dir = outDir || path.join(selectionDir, 'art-critic');
    mkdirSync(dir, { recursive: true });
    const checks = [];
    const previews = [];
    const fail = (asset, check, detail) => checks.push({ asset, check, result: 'fail', detail });
    const pass = (asset, check, detail) => checks.push({ asset, check, result: 'pass', detail });

    for (const [index, choice] of (selection.choices || []).entries()) {
        const asset = choice?.asset_path || `(choice ${index})`;
        const kind = roleKind(choice?.role);
        const resolvedAsset = resolveSelectionAsset(asset, selectionDir);
        if (resolvedAsset.kind === 'canvas') {
            const missingKeys = resolvedAsset.keys.filter((key) => !canvasTextureExists(key));
            if (!resolvedAsset.keys.length || missingKeys.length) {
                fail(
                    asset,
                    'canvas-paint',
                    `texture key(s) not registered: ${missingKeys.join(', ') || '(none named)'}`
                );
            } else {
                pass(
                    asset,
                    'canvas-paint',
                    `shipped canvas texture(s) registered: ${resolvedAsset.keys.join(', ')}`
                );
            }
            continue;
        }
        if (resolvedAsset.kind === 'missing') {
            fail(asset, 'file-exists', 'missing under both the selection folder and the repo root');
            continue;
        }
        const assetPath = resolvedAsset.abs;
        pass(
            asset,
            'file-exists',
            `present (${resolvedAsset.via}: ${path.relative(ROOT, assetPath)})`
        );
        const extension = path.extname(assetPath).toLowerCase();
        const base = `${String(index).padStart(2, '0')}-${kind}`;
        if (PAINT_EXTENSIONS.has(extension)) {
            try {
                const rendered = await renderPaintPreview(assetPath, kind, dir, base);
                if (rendered.preview) {
                    previews.push({ asset, kind, preview: path.relative(ROOT, rendered.preview) });
                    pass(asset, 'gameplay-preview', path.relative(ROOT, rendered.preview));
                } else {
                    pass(
                        asset,
                        'canvas-executed',
                        `paint runs and draws (no browser for a pixel preview: ${rendered.detail})`
                    );
                }
            } catch (error) {
                fail(asset, 'canvas-executed', String(error.message || error));
            }
            continue;
        }
        if (!RASTER_EXTENSIONS.has(extension)) {
            fail(
                asset,
                'gameplay-preview',
                `unsupported asset type "${extension}" — not a raster image or canvas paint`
            );
            continue;
        }
        await judgeRasterAsset({ asset, assetPath, kind, dir, base, pass, fail, previews });
    }
    if (!checks.length) {
        fail('(selection)', 'has-choices', 'no choices to judge');
    }
    const verdict = checks.some((check) => check.result === 'fail') ? 'ITERATE' : 'PASS';
    const result = {
        selection: path.relative(ROOT, resolved),
        verdict,
        checks,
        previews,
        checklist: manualChecklist(),
    };
    writeFileSync(path.join(dir, 'art-critic.json'), `${JSON.stringify(result, null, 2)}\n`);
    return result;
}

async function main(argv = process.argv.slice(2)) {
    let selectionPath = null;
    let outDir = null;
    for (let i = 0; i < argv.length; i += 1) {
        if (argv[i] === '--out') {
            outDir = argv[i + 1] ? path.resolve(argv[i + 1]) : null;
            i += 1;
        } else if (argv[i].startsWith('--out=')) {
            outDir = path.resolve(argv[i].slice('--out='.length));
        } else if (!argv[i].startsWith('--')) {
            selectionPath = selectionPath || argv[i];
        } else {
            throw new Error(`unknown argument: ${argv[i]}`);
        }
    }
    if (!selectionPath) {
        throw new Error('usage: node scripts/critic-art.mjs <selection.json> [--out <dir>]');
    }
    try {
        const result = await criticArt(selectionPath, { outDir });
        for (const check of result.checks) {
            console.log(
                `${check.result.toUpperCase()} ${check.asset} :: ${check.check} — ${check.detail}`
            );
        }
        console.log(`\nPreviews: ${result.previews.map((p) => p.preview).join(', ') || 'none'}`);
        console.log('\nManual checklist (human judges from the gameplay previews):');
        result.checklist.forEach((item, i) => console.log(`${i + 1}. ${item}`));
        console.log(`\nART CRITIC: ${result.verdict}`);
        process.exitCode = result.verdict === 'PASS' ? 0 : 2;
    } finally {
        await closeArtCriticBrowser();
    }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    main().catch((error) => {
        console.error(error.message || error);
        process.exitCode = 1;
    });
}
