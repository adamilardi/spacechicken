// Spire glass — SOLID platform, 96x24.
// Pale glass panes in a gold frame over dark alloy.
// Same flat style as paintSpireAlloy; dark body inverts the pale deck.
export function paint(ctx, width, height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#3a4356';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#d7a441';
    ctx.fillRect(0, 0, width, 3);
    ctx.fillStyle = '#f4e8c8';
    ctx.fillRect(0, 0, width, 1);
    ctx.fillStyle = '#bcd8e8';
    for (let x = 4; x < width; x += 24) {
        ctx.fillRect(x, 7, 16, 10);
    }
    ctx.fillStyle = '#f4fbfd';
    for (let x = 4; x < width; x += 24) {
        ctx.fillRect(x, 7, 16, 2);
    }
    ctx.fillStyle = '#d7a441';
    for (let x = 0; x < width; x += 24) {
        ctx.fillRect(x, 5, 3, 19);
    }
    ctx.fillStyle = '#232838';
    for (let x = 8; x < width; x += 24) {
        ctx.fillRect(x, 19, 8, 5);
    }
}
