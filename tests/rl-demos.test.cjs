const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const projectRoot = path.resolve(__dirname, '..');

function importModule(fileName) {
    return import(pathToFileURL(path.join(projectRoot, fileName)).href);
}

function readContract() {
    return JSON.parse(fs.readFileSync(path.join(projectRoot, 'rl/contract.json'), 'utf8'));
}

test('rl encoder sees the full board and degrades gracefully on partial steps', async () => {
    const contract = readContract();
    assert.equal(contract.obsVersion, 2);
    assert.equal(contract.features.length, contract.obsSize);
    const { encodeObservation, stepReward } = await importModule('scripts/rl/features.mjs');

    const full = {
        player: { x: 500, y: 400, vx: 120, vy: 0, grounded: true, jumpsRemaining: 1 },
        objective: { dx: 400, dy: -50, distance: 403 },
        level: 7,
        deaths: 1,
        elapsedMs: 9000,
        canShoot: true,
        world: { width: 3960, height: 760, killZoneY: 756 },
        nearby: {
            hazards: [{ type: 'boarder', dx: 200, dy: 10, width: 40, height: 48, active: true }],
            platforms: [{ type: 'floor', dx: -30, top: 22, width: 400 }],
            movingPlatforms: [],
            bombs: [{ dx: -150, dy: -200, active: true }],
            timedHazards: [{ dx: 420, dy: -300, phase: 'warning', timeUntilPhaseChangeMs: 300 }],
        },
        navigation: {
            gapAhead: true,
            ridingMovingPlatform: false,
            distanceToSupportEdge: 60,
            landingWindow: { left: 100, right: 200, top: -80 },
            immediateThreat: { dx: 200, dy: 10 },
        },
    };
    const vec = encodeObservation(full);
    assert.equal(vec.length, contract.obsSize);
    assert.ok(vec.every(Number.isFinite));
    const at = (name) => vec[contract.features.indexOf(name)];
    assert.equal(at('canShoot'), 1);
    assert.equal(at('hz0boarder'), 1);
    assert.equal(at('hz0active'), 1);
    assert.equal(at('gapAhead'), 1);
    assert.equal(at('threat'), 1);
    assert.ok(at('hz0dx') > 0 && at('timedDx') > 0 && at('bombDx') < 0);

    const partial = {
        player: { x: 100, y: 450, vx: 0, vy: 0, grounded: false, jumpsRemaining: 2 },
        objective: { dx: 1700, dy: -100, distance: 1703 },
        level: 1,
        deaths: 0,
        atMs: 374,
    };
    const legacy = encodeObservation(partial);
    assert.equal(legacy.length, contract.obsSize);
    assert.ok(legacy.every(Number.isFinite));
    assert.ok(legacy.slice(contract.features.indexOf('canShoot')).every((v) => v === 0));

    assert.equal(
        stepReward(
            { objective: { distance: 500 }, deaths: 0 },
            { objective: { distance: 400 }, deaths: 0 }
        ),
        0.2
    );
    assert.equal(
        stepReward(
            { objective: { distance: 400 }, deaths: 0 },
            { objective: { distance: 400 }, deaths: 1 }
        ),
        -1
    );
});

test('rl demos match the contract and hold finite training vectors', async () => {
    const contract = readContract();
    const { GAME_TEST_ACTIONS } = await importModule('GameTestInterface.js');
    assert.deepEqual(contract.actions, [...GAME_TEST_ACTIONS]);

    const dir = path.join(projectRoot, 'rl/demos');
    const files = fs
        .readdirSync(dir)
        .filter((name) => name.startsWith('demo-') && name.endsWith('.jsonl'));
    assert.ok(files.length > 0, 'expected converted demos; run npm run rl:convert');
    let steps = 0;
    for (const name of files) {
        const lines = fs.readFileSync(path.join(dir, name), 'utf8').trim().split('\n');
        const header = JSON.parse(lines[0]);
        assert.equal(header.type, 'header');
        assert.equal(header.obsVersion, contract.obsVersion);
        assert.equal(header.obsSize, contract.obsSize);
        let filePartial = 0;
        for (const line of lines.slice(1)) {
            const step = JSON.parse(line);
            assert.equal(step.obs.length, contract.obsSize);
            assert.ok(step.obs.every(Number.isFinite));
            assert.ok(
                Number.isInteger(step.action) &&
                    step.action >= 0 &&
                    step.action < contract.actionSize
            );
            assert.equal(contract.actions[step.action], step.actionName);
            if (step.partial) filePartial += 1;
            steps += 1;
        }
        assert.equal(filePartial === lines.length - 1, header.partial === true);
    }
    assert.ok(steps > 100, `expected a real training set, saw ${steps} steps`);
});

test('rl policy weights match the contract with finite parameters', async () => {
    const contract = readContract();
    const weightsPath = path.join(projectRoot, 'rl/weights/bc-policy.json');
    assert.ok(fs.existsSync(weightsPath), 'expected trained weights; run npm run rl:train');
    const weights = JSON.parse(fs.readFileSync(weightsPath, 'utf8'));
    assert.equal(weights.obsSize, contract.obsSize);
    assert.equal(weights.actionSize, contract.actionSize);
    assert.ok(weights.layers.length >= 1);
    let previous = contract.obsSize;
    for (const layer of weights.layers) {
        assert.equal(layer.w.length, layer.b.length);
        assert.equal(layer.w[0].length, previous);
        assert.ok(layer.w.flat().every(Number.isFinite));
        assert.ok(layer.b.every(Number.isFinite));
        previous = layer.b.length;
    }
    assert.equal(previous, contract.actionSize);

    const { forwardPolicy, argmax } = await importModule('scripts/rl/policy-infer.mjs');
    const probs = forwardPolicy(weights, new Array(contract.obsSize).fill(0));
    assert.equal(probs.length, contract.actionSize);
    assert.ok(Math.abs(probs.reduce((a, b) => a + b, 0) - 1) < 1e-6);
    assert.ok(argmax(probs) >= 0 && argmax(probs) < contract.actionSize);
});
