const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const projectRoot = path.resolve(__dirname, '..');

function importModule(fileName) {
    return import(pathToFileURL(path.join(projectRoot, fileName)).href);
}

// One texture, one meaning: a sprite the player learns as lethal must never
// also appear as a pickup, prop, platform, or a different hazard role.
// Defaults mirror enemies/*.js (config.key || default).
function textureForDynamic(entry) {
    if (entry.key) {
        return entry.key;
    }
    switch (entry.type) {
        case 'boarder':
            return 'boarder';
        case 'bonk':
            return 'labTech';
        case 'crusher':
            return 'crusher';
        case 'drip':
            return 'acidDrop';
        case 'drone':
            return 'drone';
        case 'dustDevil':
            return 'dustDevil';
        case 'laser':
            return entry.orientation === 'vertical' ? 'laserBeamVertical' : 'laserBeam';
        case 'roller':
            return 'boulder';
        case 'rover':
            return 'rover';
        case 'cosmicRay':
            return 'laserBeamVertical';
        default:
            return 'rock';
    }
}

async function collectTextureRoles() {
    const { LEVEL_CONTENT, LEVEL_IDS } = await importModule('levels/index.js');
    const textureRoles = new Map();
    const hazardTextures = new Set();
    const safeTextures = new Set([
        'crown',
        'bonkMarker',
        'rescueCage',
        'rescueCageOpen',
        'laserEmitter',
    ]);
    const note = (texture, role, level) => {
        if (!textureRoles.has(texture)) {
            textureRoles.set(texture, new Map());
        }
        const roles = textureRoles.get(texture);
        if (!roles.has(role)) {
            roles.set(role, []);
        }
        roles.get(role).push(level);
    };
    for (const level of LEVEL_IDS) {
        const content = LEVEL_CONTENT[level] || {};
        for (const entry of content.dynamic || []) {
            const texture = textureForDynamic(entry);
            hazardTextures.add(texture);
            note(texture, entry.type, level);
        }
        for (const entry of content.rocks || []) {
            const texture = entry.key || 'rock';
            hazardTextures.add(texture);
            note(texture, 'rock', level);
        }
        for (const entry of content.props || []) {
            if (entry.key) {
                safeTextures.add(entry.key);
                note(entry.key, 'prop', level);
            }
        }
        for (const entry of (content.staticPlatforms || []).concat(content.moving || [])) {
            if (entry.key) {
                safeTextures.add(entry.key);
                note(entry.key, 'platform', level);
            }
        }
        for (const pod of content.pods || []) {
            safeTextures.add(`weaponPod-${pod.gun}`);
        }
    }
    return { textureRoles, hazardTextures, safeTextures };
}

test('each hazard texture keeps a single role across the campaign', async () => {
    const { textureRoles } = await collectTextureRoles();
    const violations = [];
    for (const [texture, roles] of textureRoles) {
        // Timed lasers and scheduled cosmic rays share the magenta beam on
        // purpose: both mean "lethal beam". Anything else sharing one
        // texture would teach two meanings for one sprite.
        const meanings = new Set(
            [...roles.keys()]
                .filter((role) => role !== 'prop' && role !== 'platform')
                .map((role) => (role === 'laser' || role === 'cosmicRay' ? 'beam' : role))
        );
        if (meanings.size > 1) {
            violations.push(`${texture}: ${[...meanings].join(', ')}`);
        }
    }
    assert.deepEqual(violations, []);
});

test('hazard textures never double as props, platforms, or pickups', async () => {
    const { hazardTextures, safeTextures } = await collectTextureRoles();
    const overlap = [...hazardTextures].filter((texture) => safeTextures.has(texture));
    assert.deepEqual(overlap, []);
});
