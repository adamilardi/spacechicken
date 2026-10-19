const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const projectRoot = path.resolve(__dirname, '..');

global.Phaser = global.Phaser || {
    Input: {
        Keyboard: {
            JustDown: () => false,
            JustUp: () => false,
        },
    },
};

function importModule(fileName) {
    return import(pathToFileURL(path.join(projectRoot, fileName)).href);
}

function createPollScene() {
    return {
        space: {},
        boardKey: {},
        cursors: { up: {}, left: {}, right: {} },
        wasd: { W: {}, A: {}, D: {} },
        jumpPointerId: null,
        touchJumpReleased: false,
        leftPressed: false,
        rightPressed: false,
        pointerTapTimes: new Map(),
        getViewportWidth() {
            return 800;
        },
        uiManager: null,
        input: { pointers: [] },
    };
}

test('rankBoardRows sorts fastest-first with gaps and medals', async () => {
    const { rankBoardRows, medalForRank } = await importModule('LeaderboardPresentation.js');
    const rows = rankBoardRows(
        [
            { time: 9000, name: 'Bex' },
            { time: 5000, name: 'Luna', deaths: 2 },
            { time: 'bad', name: 'Ghost' },
            { time: 7000, name: 'Rook' },
        ],
        { max: 5 }
    );
    assert.deepEqual(
        rows.map((row) => row.name),
        ['Luna', 'Rook', 'Bex']
    );
    assert.equal(rows[0].rank, 1);
    assert.equal(rows[0].gapText, 'LEADER');
    assert.equal(rows[0].isLeader, true);
    assert.equal(rows[1].gapText, '+00:02.00');
    assert.equal(rows[2].gapText, '+00:04.00');
    assert.equal(rows[0].deathText, ' · 2 deaths');
    assert.equal(rows[1].deathText, '');
    assert.equal(medalForRank(1).fill, 0xffd74f);
    assert.equal(medalForRank(3).fill, 0xe09a5a);
    assert.equal(medalForRank(4).fill, 0x2a3a58);
});

test('tagPlayerRows matches name and time together', async () => {
    const { rankBoardRows, tagPlayerRows } = await importModule('LeaderboardPresentation.js');
    const rows = tagPlayerRows(
        rankBoardRows(
            [
                { time: 5000, name: 'Luna' },
                { time: 5000, name: 'Rook' },
                { time: 8000, name: 'Luna' },
            ],
            { max: 5 }
        ),
        { playerName: 'Luna', best: 5000 }
    );
    assert.deepEqual(
        rows.map((row) => row.isPlayer),
        [true, false, false]
    );
    const untagged = tagPlayerRows(rows, { playerName: 'Luna', best: null });
    assert.deepEqual(
        untagged.map((row) => row.isPlayer),
        [true, false, false]
    );
});

test('insertionRank shares ties and handles no best', async () => {
    const { insertionRank, gapToLeader } = await importModule('LeaderboardPresentation.js');
    const board = [{ time: 5000 }, { time: 5000 }, { time: 9000 }];
    assert.equal(insertionRank(board, 5000), 1);
    assert.equal(insertionRank(board, 7000), 3);
    assert.equal(insertionRank(board, null), null);
    assert.equal(gapToLeader(board, 7000), 2000);
    assert.equal(gapToLeader([], 7000), null);
});

test('callouts celebrate crowns and chase the lead', async () => {
    const { buildLeaderboardModel } = await importModule('LeaderboardPresentation.js');
    const base = {
        level: 3,
        playerName: 'Luna',
        remoteTimes: [
            { time: 5000, name: 'Rook' },
            { time: 8000, name: 'Luna' },
        ],
        weekly: [{ time: 8000, name: 'Luna' }],
        visibleCount: 5,
    };
    const chase = buildLeaderboardModel({
        ...base,
        best: 8000,
        weekly: [
            { time: 6000, name: 'Rook' },
            { time: 8000, name: 'Luna' },
        ],
    });
    assert.equal(chase.playerRank, 2);
    assert.match(chase.callout.text, /P2 all-time/);
    assert.match(chase.callout.text, /00:03\.00 off the lead/);

    const crown = buildLeaderboardModel({ ...base, best: 4000 });
    assert.equal(crown.playerRank, 1);
    assert.match(crown.callout.text, /HOLD #1/);
    assert.equal(crown.callout.tone, 'gold');

    const weeklyCrown = buildLeaderboardModel({
        ...base,
        best: 8000,
        remoteTimes: [
            { time: 5000, name: 'Rook' },
            { time: 8000, name: 'Luna' },
            { time: 8100, name: 'Bex' },
            { time: 8200, name: 'Ash' },
        ],
    });
    assert.equal(weeklyCrown.callout.tone, 'gold');
    assert.match(weeklyCrown.callout.text, /Weekly crown/);

    const first = buildLeaderboardModel({ ...base, best: null });
    assert.match(first.callout.text, /opening pace/);

    const offline = buildLeaderboardModel({ ...base, best: 8000, online: false });
    assert.match(offline.callout.text, /Offline/);
});

test('plain-text fallback keeps section order and row format', async () => {
    const { buildLeaderboardModel, formatLeaderboardPlainText } = await importModule(
        'LeaderboardPresentation.js'
    );
    const model = buildLeaderboardModel({
        level: 1,
        best: 5000,
        playerName: 'Luna',
        remoteTimes: [{ time: 5000, name: 'Luna', deaths: 1 }],
        weekly: [],
        week: '2026-10-12',
        visibleCount: 5,
    });
    const text = formatLeaderboardPlainText(model, 'Tap: next page');
    const lines = text.split('\n');
    assert.equal(lines[0], 'LEVEL 1');
    assert.equal(lines[1], 'Your best: 00:05.00');
    assert.equal(lines[2], 'ALL TIME');
    assert.equal(lines[3], '1. 00:05.00 - Luna · 1 deaths');
    assert.ok(lines.includes('THIS WEEK (2026-10-12)'));
    assert.ok(lines.includes('PAST WINNERS'));
    assert.equal(lines[lines.length - 1], 'Tap: next page');

    const short = buildLeaderboardModel({
        level: 1,
        best: 5000,
        playerName: 'Luna',
        remoteTimes: [{ time: 5000, name: 'Luna' }],
        winners: [{ week: '2026-10-05', time: 6000, name: 'Rook' }],
        hidePast: true,
        visibleCount: 5,
    });
    assert.ok(!formatLeaderboardPlainText(short, 'footer').includes('PAST WINNERS'));
});

test('B and the arrows drive the leaderboard menu on keyboard', async () => {
    const { InputController } = await importModule('InputController.js');
    const scene = createPollScene();
    const controller = new InputController(scene);
    const justDown = global.Phaser.Input.Keyboard.JustDown;
    try {
        global.Phaser.Input.Keyboard.JustDown = (key) => key === scene.boardKey;
        assert.equal(controller.poll().menu.board, true);

        global.Phaser.Input.Keyboard.JustDown = (key) => key === scene.cursors.left;
        const left = controller.poll();
        assert.equal(left.menu.left, true);
        assert.equal(left.menu.right, undefined);

        global.Phaser.Input.Keyboard.JustDown = (key) => key === scene.wasd.D;
        const right = controller.poll();
        assert.equal(right.menu.right, true);
        assert.equal(right.menu.board, undefined);
    } finally {
        global.Phaser.Input.Keyboard.JustDown = justDown;
    }
});
