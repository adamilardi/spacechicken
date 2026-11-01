const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

function classMembers(source) {
    const members = new Set();
    for (const match of source.matchAll(/this\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g)) {
        members.add(match[1]);
    }
    for (const match of source.matchAll(
        /^\s*(?:async\s+)?(?:get\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/gm
    )) {
        members.add(match[1]);
    }
    return members;
}

test('verify scripts read overlay-owned UI state through uiManager.overlays', () => {
    const uiManagerSource = fs.readFileSync(path.join(projectRoot, 'UIManager.js'), 'utf8');
    const overlaysSource = fs.readFileSync(path.join(projectRoot, 'Overlays.js'), 'utf8');
    const uiMembers = classMembers(uiManagerSource);
    const overlayMembers = classMembers(overlaysSource);
    const scripts = fs
        .readdirSync(path.join(projectRoot, 'scripts'))
        .filter((name) => name.startsWith('verify-') && name.endsWith('.mjs'));
    assert.ok(scripts.length > 0, 'expected verify scripts to exist');
    for (const script of scripts) {
        const source = fs.readFileSync(path.join(projectRoot, 'scripts', script), 'utf8');
        for (const match of source.matchAll(/uiManager\?*\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g)) {
            const name = match[1];
            if (name === 'overlays') {
                continue;
            }
            assert.ok(
                uiMembers.has(name),
                `${script} reads uiManager.${name}, which is not a UIManager member` +
                    (overlayMembers.has(name) ? ` — did you mean uiManager.overlays.${name}?` : '')
            );
        }
    }
});

test('verify scripts reveal view-gated buttons before clicking them', () => {
    const scriptsDir = path.join(projectRoot, 'scripts');
    const scripts = fs
        .readdirSync(scriptsDir)
        .filter((name) => name.startsWith('verify-') && name.endsWith('.mjs'));
    for (const script of scripts) {
        const source = fs.readFileSync(path.join(scriptsDir, script), 'utf8');
        if (!source.includes("locator('#race-setup-button')")) {
            continue;
        }
        assert.ok(
            /setTitleView\(\s*['"]settings['"]\)/.test(source) || source.includes('press(12)'),
            `${script} clicks #race-setup-button, which stays hidden until the settings title view is selected`
        );
    }
});
