// Womb bone — SOLID platform, 96x24.
// Bone walk edge with red marrow seams over dark clotted flesh.
// Same flat style as paintWombFlesh; bone edge inverts the dark deck.
export function paint(ctx, width, height) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#33101a';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#f2d8c9';
    ctx.fillRect(0, 0, width, 3);
    ctx.fillStyle = '#8e2f3f';
    ctx.fillRect(0, 3, width, 2);
    ctx.fillStyle = '#f2d8c9';
    for (let x = 8; x < width; x += 32) {
        ctx.fillRect(x, 7, 12, 3);
        ctx.fillRect(x + 3, 10, 6, 4);
    }
    ctx.fillStyle = '#ff5a8a';
    for (let x = 4; x < width; x += 32) {
        ctx.fillRect(x, 16, 4, 4);
        ctx.fillRect(x + 20, 18, 4, 3);
    }
    ctx.fillStyle = '#1c060d';
    for (let x = 0; x < width; x += 16) {
        ctx.fillRect(x + 6, 21, 4, 3);
    }
}
