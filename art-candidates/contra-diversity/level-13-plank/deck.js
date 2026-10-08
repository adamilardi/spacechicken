// Harbor plank — SOLID platform, 96x24.
// Weathered plank walk edge with rope lashings over tar-dark wood.
// Same flat style as paintHarborDeck; gray edge inverts the sand deck.
export function paint(ctx, width, height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#2c2118';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#9e8f76';
    ctx.fillRect(0, 0, width, 3);
    ctx.fillStyle = '#5a4c38';
    ctx.fillRect(0, 3, width, 2);
    ctx.fillStyle = '#4a3d2c';
    for (let x = 0; x < width; x += 24) {
        ctx.fillRect(x, 5, 2, 19);
    }
    ctx.fillStyle = '#c9b48a';
    for (let x = 10; x < width; x += 24) {
        ctx.fillRect(x, 8, 4, 8);
    }
    ctx.fillStyle = '#6e5a3a';
    for (let x = 10; x < width; x += 24) {
        ctx.fillRect(x, 10, 4, 1);
        ctx.fillRect(x, 13, 4, 1);
    }
    ctx.fillStyle = '#14100a';
    for (let x = 4; x < width; x += 16) {
        ctx.fillRect(x, 20, 8, 4);
    }
}
