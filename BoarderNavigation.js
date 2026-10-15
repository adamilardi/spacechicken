// Small, deterministic terrain planner. Boarders commit to a jump only when
// its swept body clears solid decks and reaches a real landing in front.
function overlaps(x, foot, width, height, deck) {
    return (
        x + width / 2 > deck.left &&
        x - width / 2 < deck.right &&
        foot > deck.top + 1 &&
        foot - height < deck.bottom - 1
    );
}

export function boarderLanding(body, velocityX, velocityY, decks, gravity) {
    const x = (body.left + body.right) / 2;
    const foot = body.bottom;
    const width = body.width || 22;
    const height = body.height || 36;
    let previousFoot = foot;
    // 120 Hz catches thin decks and narrow overhead lips at hard-mode speed.
    for (let frame = 1; frame <= 300; frame++) {
        const t = frame / 120;
        const nextX = x + velocityX * t;
        const nextFoot = foot + velocityY * t + (gravity * t * t) / 2;
        if (nextFoot - foot > 260) return null;
        for (const deck of decks) {
            if (nextX + width / 2 <= deck.left || nextX - width / 2 >= deck.right) continue;
            if (nextFoot > previousFoot && previousFoot <= deck.top + 1 && nextFoot >= deck.top) {
                // Require the whole body to have somewhere to land.
                if (nextX - width / 2 < deck.left || nextX + width / 2 > deck.right) return null;
                return { x: nextX, y: deck.top - height / 2, deck };
            }
            if (overlaps(nextX, nextFoot, width, height, deck)) return null;
        }
        previousFoot = nextFoot;
    }
    return null;
}

export function boarderGroundMove(body, goal, decks, options) {
    const x = (body.left + body.right) / 2;
    const dir = Math.abs(goal.x - x) < 8 ? 0 : Math.sign(goal.x - x);
    const stop = { velocityX: 0, velocityY: null };
    if (!dir) return stop;
    const support = decks.find(
        (d) => body.right > d.left && body.left < d.right && Math.abs(body.bottom - d.top) <= 5
    );
    if (!support) return stop;
    const speed = options.speed;
    const lookX = x + dir * (body.width / 2 + 28);
    const obstacle = decks.some(
        (d) => d !== support && overlaps(lookX, body.bottom, body.width, body.height, d)
    );
    const groundAhead = decks.some(
        (d) => lookX >= d.left && lookX <= d.right && Math.abs(body.bottom - d.top) <= 5
    );
    if (groundAhead && !obstacle) return { velocityX: dir * speed, velocityY: null };
    if (options.stayOnDeck) return stop;
    const gravity = options.gravity || 300;
    const currentDistance =
        Math.abs(goal.x - x) + Math.abs(goal.y - (body.bottom - body.height / 2));
    // Test a walk-off from just beyond the support, where gravity starts
    // pulling down. Simulating from the standing position lands on itself.
    if (!obstacle) {
        const edgeX =
            dir > 0 ? support.right + body.width / 2 + 1 : support.left - body.width / 2 - 1;
        const edgeBody = { ...body, left: edgeX - body.width / 2, right: edgeX + body.width / 2 };
        const landing = boarderLanding(edgeBody, dir * speed, 0, decks, gravity);
        if (
            landing &&
            Math.abs(goal.x - landing.x) + Math.abs(goal.y - landing.y) < currentDistance - 16
        ) {
            return { velocityX: dir * speed, velocityY: null };
        }
    }
    for (const factor of [1, 0.7]) {
        const velocityX = dir * speed * factor;
        const velocityY = options.hopVelocity;
        const landing = boarderLanding(body, velocityX, velocityY, decks, gravity);
        if (!landing || landing.deck === support) continue;
        const distance = Math.abs(goal.x - landing.x) + Math.abs(goal.y - landing.y);
        if (distance < currentDistance - 16) return { velocityX, velocityY };
    }
    return stop;
}
