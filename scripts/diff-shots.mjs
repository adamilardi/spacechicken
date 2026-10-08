/**
 * Pixel-diff two screenshot directories (e.g. before/after a refactor).
 *
 *   node scripts/diff-shots.mjs /tmp/shots-baseline /tmp/shots-after
 *
 * Pure Node PNG decode (8-bit RGB/RGBA, non-interlaced — what Playwright
 * writes), so there is no Pillow dependency. Exit code is 1 when any shot
 * is missing, resized, or differs beyond tolerance.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';

const TOLERANCE = Number(process.env.DIFF_TOLERANCE || 8);
const MAX_CHANGED_FRACTION = Number(process.env.DIFF_MAX_FRACTION || 0.02);

function decodePng(buffer) {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    if (!buffer.subarray(0, 8).equals(signature)) {
        throw new Error('not a PNG file');
    }
    let width = 0;
    let height = 0;
    let colorType = 0;
    const idat = [];
    let offset = 8;
    while (offset + 8 <= buffer.length) {
        const length = buffer.readUInt32BE(offset);
        const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
        const data = buffer.subarray(offset + 8, offset + 8 + length);
        if (type === 'IHDR') {
            width = data.readUInt32BE(0);
            height = data.readUInt32BE(4);
            const bitDepth = data[8];
            colorType = data[9];
            if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6) || data[12] !== 0) {
                throw new Error(`unsupported PNG: depth=${bitDepth} color=${colorType}`);
            }
        } else if (type === 'IDAT') {
            idat.push(data);
        } else if (type === 'IEND') {
            break;
        }
        offset += 8 + length + 4;
    }
    const channels = colorType === 6 ? 4 : 3;
    const stride = width * channels;
    const raw = inflateSync(Buffer.concat(idat));
    const pixels = Buffer.alloc(height * stride);
    let prev = Buffer.alloc(stride);
    let pos = 0;
    for (let y = 0; y < height; y++) {
        const filter = raw[pos];
        pos += 1;
        const row = raw.subarray(pos, pos + stride);
        pos += stride;
        const out = pixels.subarray(y * stride, (y + 1) * stride);
        for (let x = 0; x < stride; x++) {
            const left = x >= channels ? out[x - channels] : 0;
            const up = prev[x];
            const upperLeft = x >= channels ? prev[x - channels] : 0;
            let value = row[x];
            if (filter === 1) {
                value += left;
            } else if (filter === 2) {
                value += up;
            } else if (filter === 3) {
                value += (left + up) >> 1;
            } else if (filter === 4) {
                const p = left + up - upperLeft;
                const pa = Math.abs(p - left);
                const pb = Math.abs(p - up);
                const pc = Math.abs(p - upperLeft);
                value += pa <= pb && pa <= pc ? left : pb <= pc ? up : upperLeft;
            }
            out[x] = value & 0xff;
        }
        prev = out;
    }
    return { width, height, channels, pixels };
}

function diffPair(aPath, bPath) {
    const a = decodePng(readFileSync(aPath));
    const b = decodePng(readFileSync(bPath));
    if (a.width !== b.width || a.height !== b.height) {
        return { status: `SIZE ${a.width}x${a.height} vs ${b.width}x${b.height}`, bad: true };
    }
    if (a.channels !== b.channels) {
        return { status: `CHANNELS ${a.channels} vs ${b.channels}`, bad: true };
    }
    const total = a.width * a.height;
    let changed = 0;
    let peak = 0;
    for (let i = 0; i < total; i++) {
        const r = Math.abs(a.pixels[i * a.channels] - b.pixels[i * b.channels]);
        const g = Math.abs(a.pixels[i * a.channels + 1] - b.pixels[i * b.channels + 1]);
        const bl = Math.abs(a.pixels[i * a.channels + 2] - b.pixels[i * b.channels + 2]);
        const worst = Math.max(r, g, bl);
        if (worst > peak) {
            peak = worst;
        }
        if (worst > TOLERANCE) {
            changed += 1;
        }
    }
    const fraction = changed / total;
    return {
        status: `peak=${peak} changed=${changed}/${total} (${(100 * fraction).toFixed(2)}%)`,
        bad: fraction > MAX_CHANGED_FRACTION,
    };
}

const [base, after] = process.argv.slice(2);
if (!base || !after) {
    console.error('usage: node scripts/diff-shots.mjs <baseline-dir> <after-dir>');
    process.exit(2);
}
const names = readdirSync(base)
    .filter((name) => name.endsWith('.png'))
    .sort();
console.log(
    `${names.length} baseline shots (tolerance=${TOLERANCE}, max=${MAX_CHANGED_FRACTION * 100}%)`
);
let bad = 0;
for (const name of names) {
    const bPath = join(after, name);
    let result;
    try {
        result = diffPair(join(base, name), bPath);
    } catch (err) {
        console.log(`${name}: ERROR ${err.message}`);
        bad += 1;
        continue;
    }
    console.log(`${name}: ${result.status}`);
    if (result.bad) {
        bad += 1;
    }
}
if (bad) {
    console.error(`${bad} shot(s) differ beyond tolerance`);
    process.exitCode = 1;
} else {
    console.log('all shots within tolerance');
}
