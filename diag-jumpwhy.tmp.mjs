import { createPilotState, decidePilotInput } from './scripts/pilot-brain.mjs';
const decks = () => [
    { left: 5762, right: 6338, top: 604, x: 6050, w: 576 },
    { left: 5858, right: 6242, top: 464, x: 6050, w: 384 },
    { left: 6510, right: 6990, top: 574, x: 6750, w: 480 },
];
const snapAt = (x, platforms) => ({
    ready: true,
    awaitingStart: false,
    gameOver: false,
    pendingLevel: null,
    dying: false,
    jumpCount: 0,
    maxJumps: 2,
    phaser: false,
    elapsedMs: 5000,
    player: { x, y: 582, vx: 160, vy: 0, grounded: true },
    crown: { x: 11800, y: 690 },
    platforms,
    hazards: [],
    bombs: [],
    columns: [],
});
for (const x of [5900, 6000, 6050, 6110, 6200, 6250, 6300]) {
    const out = decidePilotInput(snapAt(x, decks()), createPilotState());
    console.log(`x=${x} jump=${out.jump} L=${out.left} R=${out.right} S=${out.shoot}`);
}
console.log('--- no grate ---');
const noGrate = decks().filter((d) => d.top !== 464);
for (const x of [6050, 6110, 6200]) {
    const out = decidePilotInput(snapAt(x, noGrate), createPilotState());
    console.log(`x=${x} jump=${out.jump} L=${out.left} R=${out.right} S=${out.shoot}`);
}
