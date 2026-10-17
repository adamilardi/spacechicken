const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const projectRoot = path.resolve(__dirname, '..');

function importModule(fileName) {
    return import(pathToFileURL(path.join(projectRoot, fileName)).href);
}

function entropy(probs) {
    return -probs.reduce((sum, p) => sum + p * Math.log(Math.max(p, 1e-12)), 0);
}

test('temperature above 1 flattens the policy, below 1 sharpens it', async () => {
    const { applyTemperature } = await importModule('scripts/rl/features.mjs');
    const peaked = [0.91, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01];
    const base = entropy(peaked);
    assert.ok(entropy(applyTemperature(peaked, 1.2)) > base);
    assert.ok(Math.abs(entropy(applyTemperature(peaked, 1)) - base) < 1e-9);
    assert.ok(entropy(applyTemperature(peaked, 0.7)) < base);
});

test('rl loop samples with exploratory temperature (T >= 1)', () => {
    const loop = fs.readFileSync(path.join(projectRoot, 'scripts/rl/loop.sh'), 'utf8');
    const temps = [...loop.matchAll(/\bTEMP=([0-9]+\.[0-9]+)/g)].map((m) => Number(m[1]));
    assert.ok(temps.length > 0, 'loop.sh sets numeric TEMP defaults');
    for (const temp of temps) {
        assert.ok(temp >= 1, `loop temp ${temp} sharpens instead of exploring`);
    }
});

test('rl trainer keeps a meaningful entropy bonus with an adaptive floor', () => {
    const trainer = fs.readFileSync(path.join(projectRoot, 'rl/train_rl.py'), 'utf8');
    const match = trainer.match(/"--entropy", type=float, default=([0-9.]+)/);
    assert.ok(match, 'trainer exposes --entropy');
    assert.ok(
        Number(match[1]) >= 0.1,
        `entropy default ${match[1]} is too weak to prevent collapse`
    );
    assert.ok(trainer.includes('"--entropy-target"'), 'trainer exposes --entropy-target floor');
});
