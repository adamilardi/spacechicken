const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const projectRoot = path.resolve(__dirname, '..');

function importModule(fileName) {
    return import(pathToFileURL(path.join(projectRoot, fileName)).href);
}

// Painted deck sizes from SpriteFactory; cliff covers L1/L2 key-less decks.
const DECK_SIZE = {
    cliff: { width: 64, height: 64 },
    stationPanel: { width: 96, height: 24 },
    liftPlatform: { width: 96, height: 24 },
    labDeck: { width: 96, height: 24 },
    mesa: { width: 96, height: 32 },
    issHull: { width: 128, height: 28 },
    colonyDeck: { width: 96, height: 24 },
    hiveChitin: { width: 96, height: 24 },
    spireAlloy: { width: 128, height: 28 },
    bastionDeck: { width: 96, height: 24 },
    wombFlesh: { width: 96, height: 24 },
    harborDeck: { width: 96, height: 24 },
    foundryDeck: { width: 96, height: 24 },
    skyhookDeck: { width: 96, height: 24 },
    vaultDeck: { width: 96, height: 24 },
    colonyGirder: { width: 96, height: 24 },
    hiveFang: { width: 96, height: 24 },
    spireGlass: { width: 96, height: 24 },
    bastionGrate: { width: 96, height: 24 },
    wombBone: { width: 96, height: 24 },
    harborPlank: { width: 96, height: 24 },
    foundryChain: { width: 96, height: 24 },
    skyhookPanel: { width: 96, height: 24 },
};

const DRONE_SPRITE_HALF = 24;
const RIDER_HEIGHT = 32;
const CHECKPOINT_HOME_CLEARANCE = 150;
const PROP_CRUSHER_CLEARANCE = 40;
const DRONE_LANE_SIDE = 30;
const DRONE_LANE_BELOW = 100;

function span(entry) {
    const size = DECK_SIZE[entry.key || 'cliff'];
    assert.ok(size, `test knows the deck size for ${entry.key}`);
    const width = size.width * (entry.scaleX ?? 1);
    const height = size.height * (entry.scaleY ?? 1);
    return {
        left: entry.x - width / 2,
        right: entry.x + width / 2,
        top: entry.y - height / 2,
        bottom: entry.y + height / 2,
    };
}

function patrolBand(hazard) {
    const end = hazard.patrol?.x ?? hazard.x;
    return [Math.min(hazard.x, end), Math.max(hazard.x, end)];
}

test('checkpoints clear every boarder home by 150px', async () => {
    const { LEVEL_CONTENT } = await importModule('levels/index.js');
    for (const id of [7, 8, 9, 10, 11, 12, 13, 14, 15, 16]) {
        const content = LEVEL_CONTENT[id];
        assert.ok((content.checkpoints || []).length >= 1, `level ${id} keeps its checkpoints`);
        for (const point of content.checkpoints) {
            for (const hazard of content.dynamic || []) {
                if (hazard.type !== 'boarder') {
                    continue;
                }
                const distance = Math.hypot(hazard.x - point.x, hazard.y - point.y);
                assert.ok(
                    distance >= CHECKPOINT_HOME_CLEARANCE,
                    `level ${id} checkpoint at x=${point.x} clears the wave-${hazard.wave} home (gap ${Math.round(distance)}px)`
                );
            }
        }
    }
});

test('checkpoints never sit under a drone or dust devil lane', async () => {
    const { LEVEL_CONTENT } = await importModule('levels/index.js');
    for (const id of [7, 8, 9, 10, 11, 12, 13, 14, 15, 16]) {
        const content = LEVEL_CONTENT[id];
        for (const point of content.checkpoints || []) {
            for (const hazard of content.dynamic || []) {
                if (hazard.type !== 'drone' && hazard.type !== 'dustDevil') {
                    continue;
                }
                const [low, high] = patrolBand(hazard);
                const under =
                    point.x >= low - DRONE_LANE_SIDE &&
                    point.x <= high + DRONE_LANE_SIDE &&
                    Math.abs(hazard.y - point.y) < DRONE_LANE_BELOW;
                assert.ok(
                    !under,
                    `level ${id} checkpoint at x=${point.x} sits under the ${hazard.type} lane`
                );
            }
        }
    }
});

test('contra finales stand within reach of the last checkpoint', async () => {
    const { LEVEL_CONTENT, LEVEL_DEFINITIONS } = await importModule('levels/index.js');
    for (const id of [8, 9, 10, 11, 12, 13, 14, 15, 16]) {
        const points = LEVEL_CONTENT[id].checkpoints || [];
        const last = points[points.length - 1];
        assert.ok(
            LEVEL_DEFINITIONS[id].CROWN_X - last.x <= 2000,
            `level ${id} finale checkpoint stands before the crown run`
        );
    }
});

test('review checkpoints cover the specimen gauntlet and clear the drone band', async () => {
    const { LEVEL_CONTENT } = await importModule('levels/index.js');
    const wing = LEVEL_CONTENT[5].checkpoints || [];
    assert.ok(wing.length >= 1, 'level 5 checkpoints its opening gauntlet');
    for (const point of wing) {
        const deck = LEVEL_CONTENT[5].staticPlatforms
            .map((entry) => ({ entry, box: span(entry) }))
            .find(
                (candidate) =>
                    point.x >= candidate.box.left - 10 && point.x <= candidate.box.right + 10
            );
        assert.ok(deck, `level 5 checkpoint at x=${point.x} stands over a deck`);
        assert.ok(
            point.y <= deck.box.top + 10 && point.y >= deck.box.top - 40,
            `level 5 checkpoint at x=${point.x} rests on its deck`
        );
    }
    const skyhook = LEVEL_CONTENT[15].checkpoints || [];
    assert.ok(
        skyhook.length >= 1 && skyhook[0].x > 2030,
        'level 15 first checkpoint sits past the drone band so jumpers still touch it'
    );
});

test('props clear crusher slam footprints', async () => {
    const { LEVEL_CONTENT, LEVEL_DEFINITIONS } = await importModule('levels/index.js');
    for (const id of Object.keys(LEVEL_CONTENT).map(Number)) {
        const content = LEVEL_CONTENT[id];
        for (const prop of content.props || []) {
            for (const hazard of content.dynamic || []) {
                if (hazard.type !== 'crusher') {
                    continue;
                }
                const inLane = prop.y > hazard.y - 20 && prop.y < (hazard.slamY ?? hazard.y) + 20;
                if (!inLane) {
                    continue;
                }
                assert.ok(
                    Math.abs(prop.x - hazard.x) >= PROP_CRUSHER_CLEARANCE,
                    `level ${id} ${prop.key} clears the crusher lane at x=${hazard.x}`
                );
            }
        }
        assert.ok(LEVEL_DEFINITIONS[id], `level ${id} stays registered`);
    }
});

test('drones clear the lift exits by sprite', async () => {
    const { LEVEL_CONTENT } = await importModule('levels/index.js');
    for (const id of Object.keys(LEVEL_CONTENT).map(Number)) {
        const content = LEVEL_CONTENT[id];
        const lifts = (content.moving || []).map((entry) => {
            const base = span(entry);
            const topY = entry.tween?.y ?? entry.y;
            return {
                left: base.left,
                right: base.right,
                top: topY - (entry.scaleY ?? 1) * 12 - RIDER_HEIGHT,
                bottom: topY + (entry.scaleY ?? 1) * 12,
            };
        });
        for (const hazard of content.dynamic || []) {
            if (hazard.type !== 'drone') {
                continue;
            }
            const [low, high] = patrolBand(hazard);
            const box = {
                left: low - DRONE_SPRITE_HALF,
                right: high + DRONE_SPRITE_HALF,
                top: hazard.y - (hazard.bobAmplitude ?? 0) - DRONE_SPRITE_HALF,
                bottom: hazard.y + DRONE_SPRITE_HALF,
            };
            for (const lift of lifts) {
                const overlap =
                    box.left < lift.right &&
                    box.right > lift.left &&
                    box.top < lift.bottom &&
                    box.bottom > lift.top;
                assert.ok(
                    !overlap,
                    `level ${id} drone at x=${hazard.x} clears the lift exit by sprite`
                );
            }
        }
    }
});
