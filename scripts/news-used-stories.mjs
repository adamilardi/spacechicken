// Used-stories dedupe helper for the daily news-to-level automation:
// scans docs/level-builds/*.md for stories already turned into levels.
// Usage: node scripts/news-used-stories.mjs [--dir <dir>] [--check "<headline or URL>"]
// Exit: 0 listed/USED, 3 NEW (--check), 2 bad usage.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const URL_RE = /https?:\/\/[^\s<>"'`]+/g;
const TRAILING_PUNCT_RE = /[.,;:!?)\]}>'"`]+$/;

function cleanUrl(raw) {
    return String(raw || '')
        .trim()
        .replace(TRAILING_PUNCT_RE, '');
}

function urlKey(url) {
    return cleanUrl(url).replace(/\/+$/, '').toLowerCase();
}

export function parseUsedStory(markdown, file) {
    const text = String(markdown || '');
    const seen = new Set();
    const urls = [];
    for (const match of text.matchAll(URL_RE)) {
        const url = cleanUrl(match[0]);
        const key = urlKey(url);
        if (url && !seen.has(key)) {
            seen.add(key);
            urls.push(url);
        }
    }
    let headline = null;
    const storyLine = text.match(/^\s*(?:[-*]\s*)?Story:\s*(.+)$/im);
    if (storyLine) {
        const rest = storyLine[1].replace(URL_RE, ' ').trim();
        const quoted = rest.match(/["“]([^"”]+)["”]/) || rest.match(/'([^']+)'/);
        if (quoted) {
            headline = quoted[1].trim() || null;
        } else {
            const cut = rest
                .split(/\s+[—–-]\s+/)[0]
                .replace(/^["']|["']$/g, '')
                .trim();
            headline = cut.replace(/[.\s]+$/, '').trim() || null;
        }
    }
    return { file: file ? String(file) : '', headline, urls };
}

export function collectUsedStories(dir) {
    if (!dir || !existsSync(dir)) return [];
    return readdirSync(dir)
        .filter((name) => name.toLowerCase().endsWith('.md'))
        .sort()
        .map((name) => parseUsedStory(readFileSync(path.join(dir, name), 'utf8'), name));
}

export function isUsed(used, query) {
    const q = String(query || '').trim();
    if (!q) return false;
    const qUrl = urlKey(q);
    const qLower = q.toLowerCase();
    for (const story of used || []) {
        if ((story?.urls || []).some((url) => urlKey(url) === qUrl && qUrl.includes('://'))) {
            return true;
        }
        const headline = String(story?.headline || '')
            .trim()
            .toLowerCase();
        if (headline && (headline.includes(qLower) || qLower.includes(headline))) {
            return true;
        }
    }
    return false;
}

function main(argv = process.argv.slice(2)) {
    let dir = path.join(ROOT, 'docs', 'level-builds');
    let check = null;
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--dir' || arg === '--check') {
            const value = argv[i + 1];
            if (value == null) throw new Error(`${arg} needs a value`);
            if (arg === '--dir') dir = path.resolve(value);
            else check = value;
            i += 1;
        } else if (arg.startsWith('--dir=')) {
            dir = path.resolve(arg.slice('--dir='.length));
        } else if (arg.startsWith('--check=')) {
            check = arg.slice('--check='.length);
        } else {
            throw new Error(`unknown argument: ${arg}`);
        }
    }
    const used = collectUsedStories(dir);
    if (check !== null) {
        const hit = isUsed(used, check);
        console.log(hit ? 'USED' : 'NEW');
        process.exitCode = hit ? 0 : 3;
        return;
    }
    console.log(JSON.stringify(used, null, 2));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    try {
        main();
    } catch (error) {
        console.error(error.message || error);
        process.exitCode = 2;
    }
}
