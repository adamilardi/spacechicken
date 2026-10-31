// Magenta-key cutout helper for generated enemy/prop art:
// turns a flat-magenta backdrop transparent, writing an RGBA PNG.
// Usage: node scripts/key-enemy.mjs <in> <out> [--fuzz <0-127>]
// Uses sharp from node_modules. Exit: 0 keyed, 2 bad usage/error.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const DEFAULT_INNER = 40;
const DEFAULT_OUTER = 90;

export function keyMagentaAlpha(r, g, b, inner = DEFAULT_INNER, outer = DEFAULT_OUTER) {
    const magenta = Math.min(r, b) - g;
    const floor = Math.min(r, b);
    if (floor < 100 || magenta <= inner) return 255;
    if (magenta >= outer) return 0;
    return Math.round(255 * (1 - (magenta - inner) / (outer - inner)));
}

export async function keyFile(inputPath, outputPath, { fuzz = 0 } = {}) {
    const inner = Math.max(0, DEFAULT_INNER - fuzz);
    const outer = Math.min(255, DEFAULT_OUTER + fuzz);
    const image = sharp(inputPath).ensureAlpha();
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    let keyed = 0;
    for (let i = 0; i < data.length; i += info.channels) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const alpha = keyMagentaAlpha(r, g, b, inner, outer);
        // Despill surviving edge pixels toward neutral (lifts green floor).
        if (alpha > 0 && Math.min(r, b) - g > 10) {
            data[i + 1] = Math.min(255, Math.max(g, Math.min(r, b) - 40));
        }
        data[i + 3] = Math.min(data[i + 3], alpha);
        if (alpha === 0) keyed += 1;
    }
    await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
        .png()
        .toFile(outputPath);
    return {
        width: info.width,
        height: info.height,
        keyed,
        total: info.width * info.height,
        keyedPct: (100 * keyed) / (info.width * info.height),
    };
}

async function main(argv = process.argv.slice(2)) {
    const positional = [];
    let fuzz = 0;
    for (let i = 0; i < argv.length; i += 1) {
        if (argv[i] === '--fuzz') {
            fuzz = Number(argv[i + 1]);
            if (!Number.isFinite(fuzz) || fuzz < 0 || fuzz > 127) {
                throw new Error('--fuzz needs a number 0-127');
            }
            i += 1;
        } else if (argv[i].startsWith('--fuzz=')) {
            fuzz = Number(argv[i].slice('--fuzz='.length));
            if (!Number.isFinite(fuzz) || fuzz < 0 || fuzz > 127) {
                throw new Error('--fuzz needs a number 0-127');
            }
        } else {
            positional.push(argv[i]);
        }
    }
    const [inputPath, outputPath] = positional;
    if (!inputPath || !outputPath) {
        throw new Error('usage: node scripts/key-enemy.mjs <in> <out> [--fuzz <0-127>]');
    }
    const result = await keyFile(inputPath, outputPath, { fuzz });
    console.log(
        `keyed ${result.keyed}/${result.total} px (${result.keyedPct.toFixed(1)}%) -> ${outputPath}`
    );
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    main().catch((error) => {
        console.error(error.message || error);
        process.exitCode = 2;
    });
}
