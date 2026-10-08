/**
 * Space Chicken pilot brain — the bot's decision logic.
 *
 * The brain is pure: `decidePilotInput(snap, state)` maps a bot snapshot to
 * an input, so Node unit tests exercise the exact code that flies. The
 * in-page pilot is the same functions stitched into one self-contained
 * source string via `buildPilotSource()` and evaluated in the browser.
 *
 * Stitching constraint: every function in BRAIN_PARTS must be
 * self-contained — no module-scope references, only its arguments and
 * page/JS globals. Keep new brain code literal-only.
 */

export function createPilotState() {
    return {
        // One-shot air jump: a held jump only edge-fires, so re-arm on
        // landing and spend exactly one airborne jump per airtime.
        jumpArmed: true,
        stuckFromX: null,
        stuckFromT: 0,
        recoverUntil: 0,
    };
}

function supportAt(x, y, platforms) {
    for (let i = 0; i < platforms.length; i++) {
        const plat = platforms[i];
        if (x >= plat.left && x <= plat.right && y <= plat.top + 55 && y >= plat.top - 100) {
            return plat;
        }
    }
    return null;
}

function lockedLevel() {
    try {
        const locked = Number(new URLSearchParams(location.search || '').get('level'));
        return Number.isFinite(locked) && locked > 0 ? locked : null;
    } catch (err) {
        return null;
    }
}

function yOverlaps(py, item, pad) {
    const height = item.h || 0;
    const top = item.top != null ? item.top : item.y - height / 2;
    return py + 22 > top - pad && py - 22 < top + height + pad;
}

function columnAhead(px, py, dir, snap) {
    const reach = 82;
    const columns = snap.columns || [];
    for (let i = 0; i < columns.length; i++) {
        const dx = columns[i].x - px;
        if (dx * dir > 6 && dx * dir < reach) {
            return true;
        }
    }
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item.active || item.enable === false || (item.h || 0) < 160) {
            continue;
        }
        const dx = item.x - px;
        if (dx * dir > 6 && dx * dir < reach && yOverlaps(py, item, 8)) {
            return true;
        }
    }
    return false;
}

function hazardInPath(px, py, dir, hazards, bombs, reach) {
    const items = hazards.concat(bombs);
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.active || item.enable === false) {
            continue;
        }
        const dx = item.x - px;
        if (dx * dir <= 8 || dx * dir >= reach) {
            continue;
        }
        if (yOverlaps(py, item, 18)) {
            return item;
        }
    }
    return null;
}

function isHopable(item) {
    return (item.w || 0) < 80 && (item.h || 0) < 60;
}

// Contra aim distilled from the L7 JEV traces: bolts fly horizontally
// from your facing with ~820px range, so hold fire while a live boarder
// (cyan chest ring) is ahead of you and roughly level. Gated on the
// level flag so non-phaser levels behave exactly as before. Returns the
// nearest in-lane boarder distance ahead, or -1 when the lane is clear.
function boarderAhead(player, dir, snap) {
    if (!snap || snap.phaser !== true) {
        return -1;
    }
    let nearest = -1;
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || item.type !== 'boarder' || !item.active || item.enable === false) {
            continue;
        }
        const ahead = (item.x - player.x) * dir;
        if (ahead > 0 && ahead <= 820 && Math.abs(item.y - player.y) < 70) {
            nearest = nearest < 0 ? ahead : Math.min(nearest, ahead);
        }
    }
    return nearest;
}

function shouldShoot(player, dir, snap) {
    return boarderAhead(player, dir, snap) >= 0;
}

// Closest live hazard or bomb in any direction within radius, or null.
function nearestThreat(px, py, snap, radius) {
    let best = null;
    let bestDist = radius;
    const lists = [snap.hazards || [], snap.bombs || []];
    for (let l = 0; l < lists.length; l++) {
        const items = lists[l];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item || !item.active || item.enable === false) {
                continue;
            }
            const dist = Math.hypot(item.x - px, item.y - py);
            if (dist < bestDist) {
                bestDist = dist;
                best = item;
            }
        }
    }
    return best;
}

// A bomb falling onto our head: which way to sidestep (-1/0/1).
// Grounded only; never dodge blind.
function bombDodge(player, snap) {
    if (!player.grounded) {
        return 0;
    }
    const bombs = snap.bombs || [];
    for (let i = 0; i < bombs.length; i++) {
        const bomb = bombs[i];
        if (!bomb || !bomb.active || bomb.enable === false) {
            continue;
        }
        if ((bomb.vy || 0) <= 0) {
            continue;
        }
        const dx = bomb.x - player.x;
        const above = player.y - bomb.y;
        if (Math.abs(dx) < 55 && above > 0 && above < 280) {
            return dx >= 0 ? -1 : 1;
        }
    }
    return 0;
}

// Lethal, non-stompable hazard squatting on the landing spot.
function landingThreat(landing, snap) {
    if (!landing) {
        return null;
    }
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || !item.active || item.enable === false || item.bonkable) {
            continue;
        }
        if (Math.abs(item.x - landing.x) < 90 && Math.abs(item.y - landing.top) < 130) {
            return item;
        }
    }
    return null;
}

function nextPlatform(px, py, dir, platforms) {
    let bestHigh = null;
    let bestHighDist = Infinity;
    let best = null;
    let bestDist = Infinity;
    for (let i = 0; i < platforms.length; i++) {
        const plat = platforms[i];
        const edge = dir > 0 ? plat.left : plat.right;
        const dist = (edge - px) * dir;
        if (dist < 8 || dist > 260) {
            continue;
        }
        if (dist < bestDist) {
            best = plat;
            bestDist = dist;
        }
        if ((plat.w || 0) > 400) {
            continue;
        }
        if (plat.top < py - 20 && dist < bestHighDist) {
            bestHigh = plat;
            bestHighDist = dist;
        }
    }
    return bestHigh || best;
}

// Highest shelf overhead: the top of the nearest platform above the
// player (within 600px, overlapping nearby), or null. nextPlatform only
// sees edges ahead, so it misses the shelf the pilot is flying under —
// which is exactly where a bonk bounce is aimed.
function shelfAbove(player, platforms) {
    let shelf = null;
    for (let i = 0; i < platforms.length; i++) {
        const plat = platforms[i];
        if (plat.top >= player.y - 20 || plat.top <= player.y - 600) {
            continue;
        }
        if (plat.left > player.x + 120 || plat.right < player.x - 120) {
            continue;
        }
        if (shelf == null || plat.top > shelf) {
            shelf = plat.top;
        }
    }
    return shelf;
}

// Bonkable stepping stone for climbs the legs cannot make: the nearest
// live bonkable ahead whose head sits near boot level and whose bounce
// (~380px minimum across gravities) reaches goalY. Side touches are
// lethal, so grounded pilots only consider heads near the boots — they
// must get above first. Airborne pilots track heads below them too: that
// is the drop they are lining up.
function bonkTarget(player, dir, snap, goalY, forDistance) {
    let best = null;
    let bestScore = Infinity;
    const boots = player.y + 22;
    const drop = player.grounded ? (forDistance ? 120 : 24) : 220;
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || !item.bonkable || !item.active || item.enable === false) {
            continue;
        }
        const ahead = (item.x - player.x) * dir;
        if (ahead < -60 || ahead > 340) {
            continue;
        }
        const top = item.top != null ? item.top : item.y - (item.h || 44) / 2;
        if (top < boots - 190 || top > boots + drop) {
            continue;
        }
        // Distance hops only consider springs floating over the gap — a
        // grounded beetle beside a pothole is a detour, not a route.
        if (forDistance && supportAt(item.x, player.y + 6, snap.platforms || [])) {
            continue;
        }
        if (!forDistance && top - 380 > goalY + 60) {
            continue;
        }
        const score = Math.abs(item.x - player.x) + Math.abs(top - boots) * 0.5;
        if (score < bestScore) {
            bestScore = score;
            best = item;
        }
    }
    return best;
}

// eslint-disable-next-line complexity
export function decidePilotInput(snap, state) {
    const input = { left: false, right: false, jump: false, shoot: false, start: false };
    if (!snap || !snap.ready || !snap.player) {
        return input;
    }
    if (snap.awaitingStart) {
        input.start = true;
        input.jump = true;
        return input;
    }
    if (snap.gameOver || snap.pendingLevel != null || snap.dying) {
        return input;
    }
    const player = snap.player;
    if (player.grounded) {
        state.jumpArmed = true;
    }
    const platforms = snap.platforms || [];
    const crown = snap.crown || { x: player.x + 200, y: player.y };
    const dx = crown.x - player.x;
    const dir = dx === 0 ? 1 : Math.sign(dx);
    const shooting = shouldShoot(player, dir, snap);
    input.shoot = shooting;
    // Bombs rain from above: sidestep on solid ground, never into a gap.
    const dodge = bombDodge(player, snap);
    if (dodge !== 0) {
        if (supportAt(player.x + dodge * 56, player.y + 6, platforms)) {
            input.left = dodge < 0;
            input.right = dodge > 0;
            return input;
        }
    }
    if (columnAhead(player.x, player.y, dir, snap)) {
        return input;
    }
    // Close boarder in the firing lane: stop, hop straight up over its
    // leap, keep the gun on it. Standing still preserves facing.
    const laneDist = boarderAhead(player, dir, snap);
    if (shooting && laneDist >= 0 && laneDist < 110 && player.grounded) {
        input.jump = true;
        return input;
    }
    const blocker = hazardInPath(player.x, player.y, dir, snap.hazards || [], snap.bombs || [], 70);
    if (blocker && !isHopable(blocker)) {
        return input;
    }
    const under = supportAt(player.x, player.y + 6, platforms);
    const ahead = supportAt(player.x + dir * 56, player.y + 6, platforms);
    const landing = nextPlatform(player.x, player.y, dir, platforms);
    const falling = player.vy > 28;
    const gap = !ahead;
    // Deliberate spring use, computed before the close-range reflexes so a
    // crowded spring gets runway treatment instead of a suicide hop. The
    // pin below says "stay, the way up is out of reach", and a usable
    // bonkable is exactly the exception.
    const landingHigh = Boolean(landing) && landing.top < player.y - 200;
    const crownHigh = crown.y < player.y - 240;
    // The bounce only needs to reach the lowest out-of-reach subgoal —
    // usually the shelf overhead, sometimes the landing or the crown.
    let goalY = null;
    if (landingHigh || crownHigh) {
        goalY = landingHigh ? landing.top : crown.y;
        if (crownHigh && landingHigh) {
            goalY = Math.max(goalY, crown.y);
        }
        const shelf = shelfAbove(player, platforms);
        if (shelf != null && shelf < player.y - 200) {
            goalY = Math.max(goalY, shelf);
        }
    }
    const seek = goalY == null ? null : bonkTarget(player, dir, snap, goalY);
    // Canyon hop: no landing within jump range, but a live bonkable floats
    // over the gap. Bounce across it — the spring levels are built for this.
    const hop = !seek && gap && !landing ? bonkTarget(player, dir, snap, 0, true) : null;
    // A tall bonkable right in the face is a de facto spring even with no
    // height purpose: the only way past is over, and the bonk clears it.
    const blockerTop = blocker == null ? null : (blocker.top ?? blocker.y - (blocker.h || 44) / 2);
    const tallBlocker = blocker?.bonkable && blockerTop < player.y + 22 - 12 ? blocker : null;
    const spring = seek || hop || tallBlocker;
    if (blocker && isHopable(blocker)) {
        const dist = Math.abs(blocker.x - player.x);
        if (blocker.bonkable) {
            if (!player.grounded) {
                // Airborne over it: keep drifting goalward and fall on.
                input.right = dx > 10;
                input.left = dx < -10;
                return input;
            }
            if (blocker === spring) {
                // Crowded by our own spring: back off to open the runway.
                // Takeoffs from inside rise straight into the head.
                const away = blocker.x > player.x ? -1 : 1;
                if (supportAt(player.x + away * 56, player.y + 6, platforms)) {
                    input.left = away < 0;
                    input.right = away > 0;
                }
                return input;
            }
            // Low head, not our spring: leap over like any small hazard.
            // (Tall heads are always our spring via tallBlocker above.)
            input.right = dx > 10;
            input.left = dx < -10;
            input.jump = true;
            return input;
        }
        const engaging = shooting && blocker.type === 'boarder';
        if (engaging) {
            // Gun it down first; jumping in just trades.
            input.right = dx > 10;
            input.left = dx < -10;
            return input;
        }
        if (dist > 45) {
            // Leap over drones, rollers, rovers: take off early, keep running.
            input.right = dx > 10;
            input.left = dx < -10;
            input.jump = player.grounded;
            return input;
        }
        // Too close to clear: hold and let patrols pass.
        return input;
    }
    // Spring steering, ahead of the high-landing hold: a usable bonkable
    // is the exception to staying put. Grounded takeoffs need a runway —
    // jumping from inside 130px rises straight into tall heads.
    if (spring) {
        const head = spring.top != null ? spring.top : spring.y - (spring.h || 44) / 2;
        const dxSeek = spring.x - player.x;
        if (player.grounded) {
            const runway = Math.abs(dxSeek);
            if (runway < 130) {
                const away = dxSeek > 0 ? -1 : 1;
                if (supportAt(player.x + away * 56, player.y + 6, platforms)) {
                    input.left = away < 0;
                    input.right = away > 0;
                }
                return input;
            }
            input.left = dxSeek < 0;
            input.right = dxSeek > 0;
            input.jump = runway <= 210;
            return input;
        }
        if (player.y + 22 <= head + 44) {
            // At or above head level: work toward the centered drop.
            if (player.vy < 0 && head < player.y + 22 - 30) {
                // Still rising with the head above the boots: hold off.
                // Centering now would rise straight into the body, and
                // only the falling drop bonks.
                return input;
            }
            input.left = dxSeek < -24;
            input.right = dxSeek > 24;
            input.jump =
                falling &&
                Math.abs(dxSeek) > 56 &&
                state.jumpArmed &&
                snap.jumpCount < snap.maxJumps;
            if (input.jump) {
                state.jumpArmed = false;
            }
            return input;
        }
        // Airborne below head level: veer off. Rising or drifting into
        // the body from the side is lethal; only the falling drop bonks.
        input.left = dxSeek > 0;
        input.right = dxSeek < 0;
        return input;
    }
    if (under && landing && under.top - landing.top > 200 && player.grounded) {
        if (player.x > under.x + 10) {
            input.left = true;
        } else if (player.x < under.x - 10) {
            input.right = true;
        }
        return input;
    }
    // Riding a bonk bounce (rises faster than any jump): steer for the
    // high landing instead of the far crown so the bounce converts.
    const riding = !player.grounded && player.vy < -400;
    const rideTarget = riding && landing && landing.top < player.y ? landing : crown;
    input.right = rideTarget.x - player.x > 10;
    input.left = rideTarget.x - player.x < -10;
    const stepUp = Boolean(
        landing && player.grounded && landing.top < player.y - 28 && landing.top > player.y - 230
    );
    const grabCrown = Math.abs(dx) < 180 && player.y > crown.y + 18 && player.y < crown.y + 240;
    // Final-approach hops only: when the crown is close, hop toward it
    // instead of running underneath. (An unrestricted climb-above rule
    // turned the pilot into a pogo stick: airborne bolts fly over
    // boarder heads while bombs and chasers connect. Ascents are
    // covered by stepUp/grabCrown.)
    const closePush = player.grounded && Math.abs(dx) < 150;
    // Don't leap into a landing occupied by something lethal. A boarder
    // already under fire may still die first, so only wait those out.
    if (gap && player.grounded) {
        const squatter = landingThreat(landing, snap);
        if (squatter && !(squatter.type === 'boarder' && shooting && laneDist < 400)) {
            return input;
        }
    }
    const shouldJump = gap || stepUp || grabCrown || closePush;
    const canDouble =
        !player.grounded &&
        falling &&
        (gap || stepUp || grabCrown) &&
        snap.jumpCount < snap.maxJumps;
    if (player.grounded) {
        input.jump = shouldJump;
    } else if (canDouble && state.jumpArmed) {
        input.jump = true;
        state.jumpArmed = false;
    }
    return input;
}

// Distilled from fresh JEV traces (.jev-runs/level-2, ~21 move_left
// backtracks when stalled): if the pilot makes no horizontal progress
// for a while, hop away from the goal briefly instead of stalling.
export function applyStuckRecovery(snap, input, state, suppressed, now) {
    const at = now == null ? Date.now() : now;
    const px = snap.player ? snap.player.x : null;
    if (
        px == null ||
        snap.awaitingStart ||
        snap.gameOver ||
        snap.pendingLevel != null ||
        snap.dying
    ) {
        return;
    }
    if (state.stuckFromX == null || Math.abs(px - state.stuckFromX) > 24) {
        state.stuckFromX = px;
        state.stuckFromT = at;
    } else if (at - state.stuckFromT > 2500) {
        state.recoverUntil = at + 900;
        state.stuckFromX = px;
        state.stuckFromT = at;
    }
    if (at < state.recoverUntil && !suppressed) {
        const away = snap.crown && snap.player && snap.crown.x < snap.player.x ? 1 : -1;
        // Never hop off an edge: with no footing in the escape direction,
        // hold and let patrols pass instead of suiciding into the pit.
        const platforms = snap.platforms || [];
        const footing = supportAt(snap.player.x + away * 56, snap.player.y + 6, platforms);
        if (footing) {
            input.left = away < 0;
            input.right = away > 0;
            input.jump = Boolean(snap.player && snap.player.grounded);
        }
    }
}

// In-page installer. Runs only inside the browser via buildPilotSource;
// references sibling brain functions as free variables, resolved by the
// stitched source scope.
function pilotMain() {
    if (window.__spaceChickenPilotInstalled) {
        return true;
    }
    const state = createPilotState();

    function tick() {
        try {
            const debug = window.__spaceChickenDebug;
            if (!debug || !debug.getBotSnapshot) {
                return;
            }
            const snap = debug.getBotSnapshot();
            window.__spaceChickenPilotLastSnap = snap;
            if (!snap || !snap.ready) {
                return;
            }
            let outcome = null;
            if (snap.gameOver) {
                outcome = 'win';
            } else if (snap.pendingLevel != null) {
                outcome = lockedLevel() != null ? 'win' : 'advance';
            }
            if (outcome) {
                window.__spaceChickenPilotOutcome = outcome;
                debug.setBotInput({
                    left: false,
                    right: false,
                    jump: false,
                    shoot: false,
                    start: false,
                });
                return;
            }
            const input = decidePilotInput(snap, state);
            // Recovery suppression is per-tick: threats only veto the
            // stuck-hop while they are actually near. (This used to latch
            // on first contact and disable recovery for the whole run.)
            const suppressed =
                snap.player != null &&
                nearestThreat(snap.player.x, snap.player.y, snap, 150) != null;
            applyStuckRecovery(snap, input, state, suppressed);
            window.__spaceChickenPilotLastInput = input;
            debug.setBotInput(input);
        } catch (err) {
            window.__spaceChickenPilotError = String(err && err.message ? err.message : err);
        }
    }

    function loop() {
        tick();
        window.__spaceChickenPilotRaf = requestAnimationFrame(loop);
    }

    window.__spaceChickenPilotOutcome = null;
    window.__spaceChickenPilotError = null;
    window.__spaceChickenPilotLastSnap = null;
    window.__spaceChickenPilotLastInput = null;
    window.__spaceChickenPilotInstalled = true;
    window.__spaceChickenPilotStop = function () {
        if (window.__spaceChickenPilotRaf) {
            cancelAnimationFrame(window.__spaceChickenPilotRaf);
        }
        window.__spaceChickenPilotRaf = null;
        if (window.__spaceChickenDebug && window.__spaceChickenDebug.clearBotInput) {
            window.__spaceChickenDebug.clearBotInput();
        }
    };
    window.__spaceChickenPilotRaf = requestAnimationFrame(loop);
    return true;
}

const BRAIN_PARTS = [
    supportAt,
    lockedLevel,
    yOverlaps,
    columnAhead,
    hazardInPath,
    isHopable,
    boarderAhead,
    shouldShoot,
    nearestThreat,
    bombDodge,
    landingThreat,
    nextPlatform,
    shelfAbove,
    bonkTarget,
    createPilotState,
    decidePilotInput,
    applyStuckRecovery,
    pilotMain,
];

/**
 * One self-contained source string that installs the pilot and returns
 * true. Evaluate it in the page: `page.evaluate(buildPilotSource())`.
 */
export function buildPilotSource() {
    return `(() => {\n${BRAIN_PARTS.map((fn) => fn.toString()).join('\n')}\nreturn pilotMain();\n})()`;
}
