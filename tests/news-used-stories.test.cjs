const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const projectRoot = path.resolve(__dirname, '..');
const scriptPath = path.join(projectRoot, 'scripts/news-used-stories.mjs');

async function loadHelper() {
    return import(pathToFileURL(scriptPath).href);
}

const SAMPLE = [
    '# Level 99 — Flood Market (news-to-level)',
    '',
    'Story: "River Rises Over Flood Market as Crews Race the Water" — Example Post, Oct 31 2026. https://example.com/flood-market',
    '',
    'Mirror: https://example.com/flood-market. Notes cite https://example.com/flood-market/ again.',
    'Also see https://example.org/other-story.',
].join('\n');

test('parses headline and URL from a Story line', async () => {
    const { parseUsedStory } = await loadHelper();
    const parsed = parseUsedStory(SAMPLE, '99.md');
    assert.equal(parsed.file, '99.md');
    assert.equal(parsed.headline, 'River Rises Over Flood Market as Crews Race the Water');
    assert.ok(parsed.urls.includes('https://example.com/flood-market'));
    assert.ok(parsed.urls.includes('https://example.org/other-story'));
});

test('returns null headline when no Story line is present', async () => {
    const { parseUsedStory } = await loadHelper();
    const parsed = parseUsedStory('# Level 1\n\nNo story here.\n', '1.md');
    assert.equal(parsed.headline, null);
    assert.deepEqual(parsed.urls, []);
});

test('dedupes URLs including trailing punctuation and slash variants', async () => {
    const { parseUsedStory } = await loadHelper();
    const parsed = parseUsedStory(SAMPLE, '99.md');
    const flood = parsed.urls.filter((url) => url.includes('flood-market'));
    assert.equal(flood.length, 1);
    assert.equal(parsed.urls.length, 2);
});

test('isUsed matches headlines case-insensitively and URLs exactly', async () => {
    const { parseUsedStory, isUsed } = await loadHelper();
    const used = [parseUsedStory(SAMPLE, '99.md')];
    assert.equal(isUsed(used, 'river rises over flood market'), true);
    assert.equal(isUsed(used, 'RIVER RISES OVER FLOOD MARKET AS CREWS RACE THE WATER'), true);
    assert.equal(isUsed(used, 'https://example.com/flood-market/'), true);
    assert.equal(isUsed(used, 'https://example.com/flood-market.'), true);
    assert.equal(isUsed(used, 'https://example.com/different-story'), false);
    assert.equal(isUsed(used, 'A Completely Different Headline'), false);
    assert.equal(isUsed(used, ''), false);
});

test('collectUsedStories reads a directory sorted by file', async () => {
    const { collectUsedStories } = await loadHelper();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'news-used-'));
    try {
        fs.writeFileSync(path.join(dir, 'b.md'), SAMPLE);
        fs.writeFileSync(path.join(dir, 'a.md'), '# Level 1\n');
        fs.writeFileSync(path.join(dir, 'ignore.txt'), SAMPLE);
        const used = collectUsedStories(dir);
        assert.deepEqual(
            used.map((entry) => entry.file),
            ['a.md', 'b.md']
        );
        assert.equal(used[1].headline, 'River Rises Over Flood Market as Crews Race the Water');
        assert.deepEqual(collectUsedStories(path.join(dir, 'missing')), []);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('CLI --check prints USED with exit 0 and NEW with exit 3', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'news-used-cli-'));
    try {
        fs.writeFileSync(path.join(dir, '99.md'), SAMPLE);
        const usedOut = execFileSync(
            process.execPath,
            [scriptPath, '--dir', dir, '--check', 'https://example.com/flood-market/'],
            { encoding: 'utf8' }
        );
        assert.match(usedOut, /USED/);
        let status = 0;
        let newOut = '';
        try {
            newOut = execFileSync(
                process.execPath,
                [scriptPath, '--dir', dir, '--check', 'Brand New Headline'],
                { encoding: 'utf8' }
            );
        } catch (error) {
            status = error.status;
            newOut = String(error.stdout || '');
        }
        assert.equal(status, 3);
        assert.match(newOut, /NEW/);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
