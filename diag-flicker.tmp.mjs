import { createPilotState, decidePilotInput } from './scripts/pilot-brain.mjs';
const platforms = [
    { left: 5762, right: 6338, top: 598, x: 6050, w: 576 },
    { left: 5858, right: 6242, top: 458, x: 6050, w: 384 },
    { left: 6510, right: 6990, top: 568, x: 6750, w: 480 },
];
const snap = (o) => ({
    ready: true,
    awaitingStart: false,
    gameOver: false,
    pendingLevel: null,
    dying: false,
    jumpCount: 0,
    maxJumps: 2,
    phaser: true,
    elapsedMs: 800,
    killZoneY: 760,
    physics: { gravityY: 300 },
    player: { x: 6106, y: 582, vx: 160, vy: 0, grounded: true },
    crown: { x: 11660, y: 400 },
    platforms,
    hazards: [
        {
            id: 'boarder-6200',
            type: 'boarder',
            x: 6200,
            y: 525,
            w: 40,
            h: 60,
            active: false,
            enable: true,
            chasing: false,
        },
    ],
    bombs: [],
    columns: [],
    ...o,
});
// Two-tick: grounded stride (sets takeoffY), then the flicker tick.
const state = createPilotState();
const t1 = decidePilotInput(snap({}), state);
console.log(`tick1 grounded: jump=${t1.jump} R=${t1.right} takeoffY=${state.takeoffY}`);
const t2 = decidePilotInput(
    snap({ elapsedMs: 816, player: { x: 6106, y: 582, vx: 160, vy: 30, grounded: false } }),
    state
);
console.log(`tick2 flicker : jump=${t2.jump} L=${t2.left} R=${t2.right}`);
