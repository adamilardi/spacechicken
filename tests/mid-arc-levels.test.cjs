const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const projectRoot = path.resolve(__dirname, '..');

function importModule(fileName) {
    return import(pathToFileURL(path.join(projectRoot, fileName)).href);
}

// Painted deck sizes from SpriteFactory; rock is 32x32.
const DECK_SIZE = {
    cliff: { width: 64, height: 64 },
    liftPlatform: { width: 96, height: 24 },
    labDeck: { width: 96, height: 24 },
    mesa: { width: 96, height: 32 },
    issHull: { width: 128, height: 28 },
};

const ROCK_SIZE = 32;
const ROVER_HALF_WIDTH = 21;
const DEVIL_HALF_WIDTH = 9;
const BEETLE_HALF_WIDTH = 22;
const DRONE_SPRITE_HALF = 24;
const RIDER_HEIGHT = 32;

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

function boxesOverlap(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

test('moonfall rays ramp pressure along the run', async () => {
    const { LEVEL_CONTENT } = await importModule('levels/index.js');
    const rays = (LEVEL_CONTENT[4].dynamic || [])
        .filter((hazard) => hazard.type === 'cosmicRay')
        .sort((left, right) => left.x - right.x);
    assert.ok(rays.length >= 6, 'moonfall keeps its ray storm');
    for (let i = 1; i < rays.length; i++) {
        assert.ok(
            (rays[i].interval ?? 2000) <= (rays[i - 1].interval ?? 2000),
            `ray at x=${rays[i].x} fires no slower than the ray before it`
        );
        assert.ok(
            (rays[i].warning ?? 420) <= (rays[i - 1].warning ?? 420),
            `ray at x=${rays[i].x} warns no longer than the ray before it`
        );
    }
    const finale = rays.filter((ray) => ray.x >= 2300);
    assert.ok(finale.length >= 2, 'the last crossing threads a live ray pair');
});

test('moonfall drones clear the lift exits', async () => {
    const { LEVEL_CONTENT } = await importModule('levels/index.js');
    const content = LEVEL_CONTENT[4];
    const lifts = (content.moving || []).map((entry) => {
        const base = span(entry);
        const topY = entry.tween?.y ?? entry.y;
        // Rider zone at the lift's highest stop: platform plus a rider above.
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
        // Bob tweens upward from the config row, never below it.
        const low = Math.min(hazard.x, hazard.patrol?.x ?? hazard.x) - DRONE_SPRITE_HALF;
        const high = Math.max(hazard.x, hazard.patrol?.x ?? hazard.x) + DRONE_SPRITE_HALF;
        const box = {
            left: low,
            right: high,
            top: hazard.y - (hazard.bobAmplitude ?? 0) - DRONE_SPRITE_HALF,
            bottom: hazard.y + DRONE_SPRITE_HALF,
        };
        for (const lift of lifts) {
            assert.ok(
                !boxesOverlap(box, lift),
                `drone at x=${hazard.x} clears the lift exit by sprite, not just hitbox`
            );
        }
    }
});

test('moonfall rovers stop before their rocks and rocks rest on decks', async () => {
    const { LEVEL_CONTENT } = await importModule('levels/index.js');
    const content = LEVEL_CONTENT[4];
    const decks = content.staticPlatforms.map((entry) => ({ entry, box: span(entry) }));
    for (const hazard of content.dynamic || []) {
        if (hazard.type !== 'rover') {
            continue;
        }
        const end = Math.max(hazard.x, hazard.patrol?.x ?? hazard.x) + ROVER_HALF_WIDTH;
        const deck = decks.find(
            (candidate) => hazard.x >= candidate.box.left && hazard.x <= candidate.box.right
        );
        assert.ok(deck, `rover at x=${hazard.x} patrols over a deck`);
        for (const rock of content.rocks || []) {
            const rockSize = ROCK_SIZE * (rock.scaleX ?? 1);
            const rockLeft = rock.x - rockSize / 2;
            if (rockLeft < hazard.x) {
                continue;
            }
            assert.ok(
                end + 4 <= rockLeft,
                `rover at x=${hazard.x} stops clear of the rock at x=${rock.x}`
            );
        }
    }
    for (const rock of content.rocks || []) {
        const deck = decks.find(
            (candidate) => rock.x >= candidate.box.left && rock.x <= candidate.box.right
        );
        assert.ok(deck, `rock at x=${rock.x} sits over a deck`);
        const bottom = rock.y + (ROCK_SIZE * (rock.scaleY ?? 1)) / 2;
        assert.ok(Math.abs(bottom - deck.box.top) <= 2, `rock at x=${rock.x} rests on its deck`);
    }
});

test('specimen wing gates its finale and dots the back third', async () => {
    const { LEVEL_CONTENT } = await importModule('levels/index.js');
    const content = LEVEL_CONTENT[5];
    const specimen = (content.dynamic || []).find(
        (hazard) => hazard.type === 'bonk' && hazard.key === 'specimen'
    );
    assert.ok(specimen, 'the specimen guards the finale gap');
    assert.ok(
        specimen.x >= 2380 && specimen.x <= 2460,
        'the specimen floats between the last two decks'
    );
    assert.ok(
        specimen.y >= 200 && specimen.y <= 270,
        'the specimen hangs in the crown arc, not below it'
    );
    const deck6 = span({ key: 'labDeck', x: 1940, y: 360, scaleX: 2.0, scaleY: 1 });
    assert.ok(
        (content.dynamic || []).some(
            (hazard) => hazard.type === 'drip' && hazard.x >= deck6.left && hazard.x <= deck6.right
        ),
        'a drip dots the deck-6 crossing'
    );
    const firstTech = (content.dynamic || []).find(
        (hazard) => hazard.type === 'bonk' && hazard.key === 'labTech'
    );
    assert.ok(
        (firstTech.patrol?.duration ?? 0) >= 2000,
        'the first spring strolls so the lesson lands'
    );
});

test('red reach plants its crown, laser, and deck-3 actors', async () => {
    const { LEVEL_CONTENT, LEVEL_DEFINITIONS } = await importModule('levels/index.js');
    const content = LEVEL_CONTENT[6];
    const def = LEVEL_DEFINITIONS[6];
    const pad = content.staticPlatforms[content.staticPlatforms.length - 1];
    const padBox = span(pad);
    assert.ok(def.CROWN_X >= padBox.left && def.CROWN_X <= padBox.right);
    const lift = padBox.top - def.CROWN_Y;
    assert.ok(lift >= 20 && lift <= 120, 'the crown floats above its pad, not inside it');
    const deck5 = span({ key: 'mesa', x: 2400, y: 380, scaleX: 2.0, scaleY: 1 });
    const laser = (content.dynamic || []).find((hazard) => hazard.type === 'laser');
    assert.ok(laser, 'the deck-5 laser guards the climb');
    const beamBottom = laser.y + (laser.length ?? 200) / 2;
    assert.ok(
        Math.abs(beamBottom - deck5.top) <= 4,
        'the laser plants into its deck instead of floating'
    );
    const devil = (content.dynamic || []).find((hazard) => hazard.type === 'dustDevil');
    const beetle = (content.dynamic || []).find(
        (hazard) => hazard.type === 'bonk' && hazard.key === 'beetle' && hazard.x > 1000
    );
    assert.ok(devil && beetle, 'deck 3 keeps its choice landing');
    const devilEnd = Math.max(devil.x, devil.patrol?.x ?? devil.x) + DEVIL_HALF_WIDTH;
    const beetleStart = Math.min(beetle.x, beetle.patrol?.x ?? beetle.x) - BEETLE_HALF_WIDTH;
    assert.ok(
        devilEnd + 4 <= beetleStart,
        'the devil and the beetle never sweep through each other'
    );
    const hopper = (content.dynamic || []).find(
        (hazard) => hazard.type === 'bonk' && hazard.key === 'hopper'
    );
    assert.ok(hopper, 'the hopper guards the finale gap');
    assert.ok(hopper.x >= 2820 && hopper.x <= 2920);
    assert.ok(hopper.y >= 210 && hopper.y <= 290, 'the hopper hangs in the crown arc');
    const canyonBeetle = (content.dynamic || []).find(
        (hazard) => hazard.type === 'bonk' && hazard.key === 'beetle' && hazard.x < 1000
    );
    assert.ok(
        (canyonBeetle.patrol?.duration ?? 0) >= 2000,
        'the canyon beetle strolls so the required stomp reads'
    );
});

test('earthwatch checkpoints its combat tutorial and tests the back half', async () => {
    const { LEVEL_CONTENT, LEVEL_DEFINITIONS } = await importModule('levels/index.js');
    const { GAME_CONSTANTS } = await importModule('Constants.js');
    const content = LEVEL_CONTENT[7];
    const def = LEVEL_DEFINITIONS[7];
    assert.equal((content.checkpoints || []).length, 2);
    const [first, second] = content.checkpoints;
    assert.ok(first.x > 0 && first.x < second.x && second.x < def.WORLD_WIDTH);
    for (const point of content.checkpoints) {
        const deck = content.staticPlatforms
            .map((entry) => ({ entry, box: span(entry) }))
            .find(
                (candidate) =>
                    point.x >= candidate.box.left - 10 && point.x <= candidate.box.right + 10
            );
        assert.ok(deck, `checkpoint at x=${point.x} stands over a deck`);
        assert.ok(
            point.y <= deck.box.top + 10 && point.y >= deck.box.top - 40,
            `checkpoint at x=${point.x} rests on its deck`
        );
        assert.ok(point.y < def.KILLZONE_Y);
    }
    const wave3Release = GAME_CONSTANTS.BOARDER_WAVES.find((entry) => entry.wave === 3).x;
    assert.ok(first.x < wave3Release, 'the first checkpoint sits before the wave-3 release line');
    const decks = content.staticPlatforms
        .map((entry) => span(entry))
        .sort((left, right) => left.left - right.left);
    const gap = decks.some(
        (box, index) =>
            index > 0 &&
            box.left - decks[index - 1].right >= 100 &&
            box.left - decks[index - 1].right <= 140 &&
            box.left >= 2000 &&
            decks[index - 1].right <= 3100
    );
    assert.ok(gap, 'a hop gap tests shooting in the wave-3 zone');
    for (const hazard of content.dynamic || []) {
        if (hazard.type !== 'boarder' || hazard.wave !== 3) {
            continue;
        }
        const deck = decks.find((box) => hazard.x >= box.left - 11 && hazard.x <= box.right + 11);
        assert.ok(deck, `wave-3 boarder at x=${hazard.x} still homes on a deck`);
    }
});
