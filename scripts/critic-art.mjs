// Art critic: runnable gate for an art selection.
// Renders every selected asset at gameplay size, checks the mechanical
// half (files exist, plate covers, cutouts keyed), and prints the manual
// checklist for the judgment half (devices, landmark, silhouette).
// Usage: node scripts/critic-art.mjs <selection.json> [--out <dir>]
// Exit: 0 PASS, 2 ITERATE, 1 error.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const GAMEPLAY_ACTOR_PX = 52;
const MIN_PLATE_W = 960;
const MIN_PLATE_H = 540;

export function roleKind(role) {
    const text = String(role || '').toLowerCase();
    if (/background|plate|backdrop/.test(text)) return 'background';
    if (/actor|enemy|drone|prop|hazard|boss/.test(text)) return 'actor';
    return 'other';
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

export function manualChecklist() {
    return [
        'Two-device difference: name the two composition devices that differ from every shipped background type (see the authoring reference catalog).',
        'Landmark read at 1x: open the gameplay preview — the signature landmark names the place without the instructions paragraph.',
        'Silhouette distinctness: the actor cutout at 52px is not mistakable for a shipped hazard or the chicken.',
        'Palette anchor: the set matches the style-anchor palette; background stays quieter than chicken, hazards, and platform edges.',
        'No doubles: the plate paints no characters, crowns, or text that duplicate live sprites.',
    ];
}

export async function criticArt(selectionPath, { outDir = null } = {}) {
    const resolved = path.isAbsolute(selectionPath)
        ? selectionPath
        : path.join(ROOT, selectionPath);
    if (!existsSync(resolved)) {
        throw new Error(`selection not found: ${selectionPath}`);
    }
    const selection = JSON.parse((await import('node:fs')).readFileSync(resolved, 'utf8'));
    const dir = outDir || path.join(path.dirname(resolved), 'art-critic');
    mkdirSync(dir, { recursive: true });
    const checks = [];
    const previews = [];
    const fail = (asset, check, detail) => checks.push({ asset, check, result: 'fail', detail });
    const pass = (asset, check, detail) => checks.push({ asset, check, result: 'pass', detail });

    for (const [index, choice] of (selection.choices || []).entries()) {
        const asset = choice?.asset_path || `(choice ${index})`;
        const kind = roleKind(choice?.role);
        if (asset.startsWith('canvas:')) {
            pass(asset, 'existing-art', 'shipped SpriteFactory paint, no file check');
            continue;
        }
        const assetPath = path.join(ROOT, asset);
        if (!existsSync(assetPath)) {
            fail(asset, 'file-exists', 'missing from the repo');
            continue;
        }
        pass(asset, 'file-exists', 'present');
        const meta = await sharp(assetPath).metadata();
        const base = `${String(index).padStart(2, '0')}-${kind}`;
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
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    main().catch((error) => {
        console.error(error.message || error);
        process.exitCode = 1;
    });
}
