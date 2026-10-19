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
        // The game edge-fires jumps, so airborne jumps must pulse:
        // lastJump tracks the previous tick's output and air branches
        // only fire on its release. Never gates fuel (the game caps
        // jumps at maxJumps); a one-shot-per-airtime latch here wastes
        // the second air jump after a walk-off.
        lastJump: false,
        // Last grounded height: air jumps wait until the fall drops past
        // takeoff (apex-burned doubles strand the pilot over wide pits).
        takeoffY: null,
        stuckFromX: null,
        stuckFromT: 0,
        recoverUntil: 0,
        duelId: null,
        duelSince: 0,
        duelSkipId: null,
        duelSkipUntil: 0,
        huntId: null,
        // Crusher pistons ride tweens, which never set body velocity:
        // track each piston's y over snap.elapsedMs for rise/slam sense.
        crusherPrev: {},
        // Double-back maneuver expiry (snap.elapsedMs): while armed, the
        // spent double steers for the deck behind instead of the gap.
        // Cleared on touchdown; expiry falls back to the normal escape.
        doubledBackUntil: 0,
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

// A duel target: live boarder ahead worth holding fire for. Level
// targets die to held bolts before aggro range; drops (still falling
// into the lane) and chasers are held the same way instead of letting
// them land on or run past the pilot. Parked bodies (enable false)
// count: they arm on a timer and bolts connect then. Unreleased waves
// (active false) do not: holding for them would stall the trigger.
function duelTarget(player, dir, snap, range) {
    if (!snap || snap.phaser !== true) {
        return null;
    }
    let best = null;
    let bestDist = Infinity;
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || item.type !== 'boarder' || item.active === false) {
            continue;
        }
        const ahead = (item.x - player.x) * dir;
        if (ahead <= 0 || ahead > range) {
            continue;
        }
        const dy = item.y - player.y;
        const level = Math.abs(dy) < 30;
        const dropping = (item.vy || 0) > 50 && dy < 30 && dy > -300;
        const chasing = item.chasing === true && Math.abs(dy) < 150;
        if (!level && !dropping && !chasing) {
            continue;
        }
        if (ahead < bestDist) {
            bestDist = ahead;
            best = item;
        }
    }
    return best;
}

// A live boarder in the descent column: landing on it kills, and bolts
// fired over its head never clear it first.
function boarderBelow(player, snap) {
    if (!snap || snap.phaser !== true) {
        return null;
    }
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || item.type !== 'boarder' || !item.active || item.enable === false) {
            continue;
        }
        const dy = item.y - player.y;
        if (Math.abs(item.x - player.x) < 70 && dy > 0 && dy < 230) {
            return item;
        }
    }
    return null;
}

// Duels stay held: patrols die to held fire before aggro range,
// chasers run into the bolts, and drops land in them. Needs no
// in-lane target yet — the bolts are already in flight when it lands.
function duelHold(player, dir, snap) {
    return player.grounded && duelTarget(player, dir, snap, 450) != null;
}

// Duel gate: the same target held past 2s is unhittable (usually a
// chaser pacing another deck, forever off the bolt line), so abandon
// it and run instead of holding fire into a stall. Skips that target
// for 5s, then allows a re-duel in case it converged. A level target
// always duels through the skip: it dies to held fire instead of
// stalling, which is exactly the touchdown kill.
function duelGate(target, player, snap, state) {
    const now = Number.isFinite(snap.elapsedMs) ? snap.elapsedMs : 0;
    if (!target) {
        state.duelId = null;
        return null;
    }
    if (state.duelSkipId === target.id && now < state.duelSkipUntil) {
        if (Math.abs(target.y - player.y) >= 30) {
            return null;
        }
        state.duelSkipId = null;
    }
    if (state.duelId !== target.id) {
        state.duelId = target.id;
        state.duelSince = now;
    }
    if (now - state.duelSince > 2000) {
        state.duelSkipId = target.id;
        state.duelSkipUntil = now + 5000;
        state.duelId = null;
        return null;
    }
    return target;
}

// Falling acid drip crossing the run lane: never leap (rising into
// the fall is lethal), only hold for it to pass or rush out from
// under it. Reacts while the drip is above the boots and falling;
// once past the boots it keeps falling away and is ignored.
function dripMove(player, dir, snap) {
    const boots = player.y + 22;
    const drips = snap.hazards || [];
    for (let i = 0; i < drips.length; i++) {
        const item = drips[i];
        if (!item || item.type !== 'acid_drip' || !item.active || item.enable === false) {
            continue;
        }
        if ((item.vy || 0) <= 0 || item.y < boots - 160 || item.y > boots + 40) {
            continue;
        }
        const dx = item.x - player.x;
        if (Math.abs(dx) < 34) {
            return dx >= 0 ? 'left' : 'right';
        }
        const ahead = dx * dir;
        if (ahead > 0 && ahead < 110) {
            if (player.grounded) {
                return 'hold';
            }
            return dir > 0 ? 'left' : 'right';
        }
    }
    return null;
}

// Applies the drip constraint to the input; true when it handles the tick.
function applyDripMove(input, player, dir, snap) {
    const move = dripMove(player, dir, snap);
    if (move === 'hold') {
        return true;
    }
    if (move == null) {
        return false;
    }
    input.left = move === 'left';
    input.right = move === 'right';
    return true;
}

// Nearest live chasing boarder behind the pilot: the gun only covers
// the run lane ahead, so heels need their own duel. Lane-level only —
// a chaser converges on the pilot anyway, and holding fire at a
// far-off-deck shadow would stall where running escapes.
function chaserBehind(player, dir, snap) {
    if (!snap || snap.phaser !== true) {
        return null;
    }
    let best = null;
    let bestDist = 400;
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || item.type !== 'boarder' || !item.active || item.enable === false) {
            continue;
        }
        if (item.chasing !== true) {
            continue;
        }
        const behind = (player.x - item.x) * dir;
        if (behind < -10 || behind >= bestDist || Math.abs(item.y - player.y) >= 70) {
            continue;
        }
        bestDist = behind;
        best = item;
    }
    return best;
}

// Nearest dust devil in the run lane within reach: patrol sweepers
// the 70px blocker scan sees too late to leap, since the arc needs a
// 105px+ runway to apex over the 78px body.
function devilAhead(player, dir, snap, reach) {
    let best = null;
    let bestDist = reach;
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || item.type !== 'dust_devil' || !item.active || item.enable === false) {
            continue;
        }
        const dist = (item.x - player.x) * dir;
        if (dist <= 8 || dist >= bestDist || !yOverlaps(player.y, item, 18)) {
            continue;
        }
        bestDist = dist;
        best = item;
    }
    return best;
}

// True when a grounded takeoff apexes over the devil's crown and the
// arc covers the whole sweep band with patrol drift to spare. A low
// deck over the arc caps the rise below clearance: those devils are
// crossed over the deck, never through the air.
function devilLeapable(player, dir, item, snap) {
    const top = item.top ?? item.y - (item.h || 100) / 2;
    const { rise, range } = jumpBallistics(snap);
    if (!(player.y - rise + 22 < top - 6)) {
        return false;
    }
    const edgeX = item.target && Number.isFinite(item.target.x) ? item.target.x : item.x;
    const band = dir > 0 ? Math.max(item.x, edgeX) : Math.min(item.x, edgeX);
    if (devilLidded(player, dir, band, top, snap.platforms || [])) {
        return false;
    }
    const span = (band - player.x) * dir + (item.w || 36) / 2;
    return range * 2 > span + 120;
}

// True when a deck lid over the arc corridor leaves less headroom
// than the rise the clearance needs: the takeoff would bonk.
function devilLidded(player, dir, band, devilTop, platforms) {
    const riseNeeded = player.y + 22 - (devilTop - 6);
    const head = player.y - 22;
    const near = dir > 0 ? player.x - 40 : band - 40;
    const far = dir > 0 ? band + 40 : player.x + 40;
    for (let i = 0; i < platforms.length; i++) {
        const plat = platforms[i];
        if (plat.right < near || plat.left > far) {
            continue;
        }
        const bottom = plat.top + (plat.h || 24);
        if (bottom >= head) {
            continue;
        }
        if (head - bottom < riseNeeded + 10) {
            return true;
        }
    }
    return false;
}

// Applies the front duel to the input; true when it handles the tick.
// Gated: a target held past 2s is unhittable, so abandon it.
function applyFrontDuel(input, player, dir, snap, state) {
    if (!player.grounded) {
        return false;
    }
    if (duelGate(duelTarget(player, dir, snap, 450), player, snap, state) == null) {
        return false;
    }
    input.shoot = true;
    return true;
}

// Applies the rear-chaser duel to the input; true when it handles the
// tick. Bolts are one-hit kills, so standing to shoot wins — the 160
// run never shakes an equal-speed chaser before the next obstacle.
// Facing persists while stopped, so step until turned, then hold.
// Yields to an imminent devil: dodge first, the chaser is seconds out.
function applyRearDuel(input, player, dir, snap, state) {
    if (!player.grounded) {
        return false;
    }
    const rear = duelGate(chaserBehind(player, dir, snap), player, snap, state);
    if (!rear || devilAhead(player, dir, snap, 100) != null) {
        return false;
    }
    const want = rear.x < player.x ? 'left' : 'right';
    input.shoot = true;
    if (player.facing !== want) {
        input.left = want === 'left';
        input.right = want === 'right';
    }
    return true;
}

// Applies the lidded-devil retreat to the input; true when it handles
// the tick. Yields to any jump the legs already want (a mount in
// reach climbs instead of retreating) — except a short mount: taking
// off within 45px of the lid edge carries under the deck and bonks,
// so keep retreating to the clean takeoff instead.
function applyDevilRetreat(input, player, dir, snap, platforms, shouldJump) {
    if (!player.grounded) {
        return false;
    }
    const wall = devilAhead(player, dir, snap, 360);
    if (!wall || devilLeapable(player, dir, wall, snap)) {
        return false;
    }
    if (shouldJump && !mountShort(player, dir, wall, platforms)) {
        return false;
    }
    const away = wall.x > player.x ? -1 : 1;
    // Footing within a stride, not just at it: a full-stride-only
    // probe misses the deck edge by a pixel and vibrates in place.
    const footing =
        supportAt(player.x + away * 56, player.y + 6, platforms) ||
        supportAt(player.x + away * 28, player.y + 6, platforms);
    if (!footing) {
        return false;
    }
    input.left = away < 0;
    input.right = away > 0;
    input.shoot = true;
    return true;
}

// True when the step-up landing is the devil's lid but its edge is
// too close for a clean takeoff: the arc would cross under the deck
// before the head clears its bottom. 70px puts the head 32px over
// the lid bottom at the edge crossing; 45px grazes the corner.
function mountShort(player, dir, wall, platforms) {
    const landing = nextPlatform(player.x, player.y, dir, platforms);
    if (!landing || landing.top >= player.y - 28 || landing.top <= player.y - 230) {
        return false;
    }
    if ((landing.w || 0) <= 300 || landing.left > wall.x || landing.right < wall.x) {
        return false;
    }
    const edge = dir > 0 ? landing.left : landing.right;
    return (edge - player.x) * dir < 70;
}

// True when the gap is a small step-down onto a wide deck below:
// run off and land instead of full-jumping. A full jump off a low
// edge becomes a 350px fuel-burning flight; chasers shadow it, the
// double goes to dodging them, and the next real gap finds the tank
// empty.
function smallStepDown(player, dir, gap, landing) {
    if (!gap || !landing || landing.top < player.y) {
        return false;
    }
    if (landing.top - (player.y + 22) >= 120) {
        return false;
    }
    const near = dir > 0 ? landing.left : landing.right;
    const far = dir > 0 ? landing.right : landing.left;
    return (near - player.x) * dir < 120 && (far - player.x) * dir > 200;
}

// Applies the bonkable-blocker move to the input; always handles it.
function applyBonkBlocker(input, player, dx, blocker, spring, seek, hop, platforms) {
    const move = bonkBlockerMove(
        player,
        dx,
        blocker,
        spring,
        platforms,
        seek != null || hop != null
    );
    input.left = move.left;
    input.right = move.right;
    input.jump = move.jump;
}

// Leap over small hazards with runway, or hold too close to clear
// and let patrols pass. True when it handles the tick (airborne and
// close falls through to the descent steering).
function applyHopLeap(input, player, dx, dist) {
    if (dist > 45) {
        input.right = dx > 10;
        input.left = dx < -10;
        input.jump = player.grounded;
        return true;
    }
    return player.grounded;
}

// A boarder already under fire may still die first, so only wait
// those out; anything else squatting on the landing holds the leap.
// True when it waits out the tick.
function applyLandingWait(player, gap, landing, snap, shooting, laneDist) {
    if (!gap || !player.grounded) {
        return false;
    }
    const squatter = landingThreat(landing, snap);
    return Boolean(squatter && !(squatter.type === 'boarder' && shooting && laneDist < 400));
}

// Perched over a far drop with no spring in reach: stay put so the
// run-off does not become a suicide leap. True when it holds the tick.
function applyHighHold(input, player, under, landing) {
    if (!under || !landing || under.top - landing.top <= 200 || !player.grounded) {
        return false;
    }
    if (player.x > under.x + 10) {
        input.left = true;
    } else if (player.x < under.x - 10) {
        input.right = true;
    }
    return true;
}

// Bombs rain from above: sidestep on solid ground, never into a gap.
// Cosmic-ray columns freeze the whole move. True when it handles the tick.
function applyAmbushHolds(input, player, dir, snap, platforms) {
    const dodge = bombDodge(player, snap);
    if (dodge !== 0) {
        if (supportAt(player.x + dodge * 56, player.y + 6, platforms)) {
            input.left = dodge < 0;
            input.right = dodge > 0;
            return true;
        }
    }
    return columnAhead(player.x, player.y, dir, snap);
}

// Applies the dust-devil leap to the input; true when it handles the
// tick. Take off with runway (the apex lands past the band) or back
// up for it, shooting to cover the rear while giving ground.
function applyDevilLeap(input, player, dir, dx, snap, platforms) {
    if (!player.grounded) {
        return false;
    }
    const devil = devilAhead(player, dir, snap, 150);
    if (!devil || !devilLeapable(player, dir, devil, snap)) {
        return false;
    }
    if (Math.abs(devil.x - player.x) > 105) {
        input.right = dx > 10;
        input.left = dx < -10;
        input.jump = true;
        return true;
    }
    const away = devil.x > player.x ? -1 : 1;
    if (supportAt(player.x + away * 56, player.y + 6, platforms)) {
        input.left = away < 0;
        input.right = away > 0;
    }
    input.shoot = true;
    return true;
}

// Point-blank boarder with no duel: stop, hop straight up over its
// leap (or strafe when a bonkable hangs over the hop column).
// Duels never hop — the held bolts kill it first. Same-lane only:
// hopping over an off-lane boarder starts a fuel-burning flight
// (chasers shadow it, the double goes to dodging them) while running
// past is safe — contact needs vertical overlap, and drops are
// covered by the duel's dropping clause.
function applyCloseReflex(input, player, dir, snap, platforms, shooting, laneDist) {
    if (!shooting || laneDist < 0 || laneDist >= 110 || !player.grounded) {
        return false;
    }
    if (Math.abs(laneBoarderDy(player, dir, snap)) >= 40) {
        return false;
    }
    if (duelTarget(player, dir, snap, 450) != null) {
        return false;
    }
    if (!bonkOverhead(player, snap)) {
        input.jump = true;
        return true;
    }
    const away = laneBoarderX(player, dir, snap) > player.x ? -1 : 1;
    if (supportAt(player.x + away * 56, player.y + 6, platforms)) {
        input.left = away < 0;
        input.right = away > 0;
    }
    return true;
}

// Descent escape move, or null when the column is clear: hop over with
// fuel on course, else steer off the boarder's column while falling.
// A boarder on another deck is landed past for free, and a
// touchdown-duel target is landed beside on purpose: the grounded
// duel kills it point-blank, saving the double for the gap ahead.
function descentEscape(player, snap, falling, state, dx) {
    if (player.grounded) {
        return null;
    }
    const dir = dx === 0 ? 1 : Math.sign(dx);
    const at = Number.isFinite(snap.elapsedMs) ? snap.elapsedMs : 0;
    // Above the falling gate on purpose: the spent double rises for a
    // full second, and course-steering that rise carries past the deck
    // behind before the homing ever engages. With fuel (or disarmed)
    // the flight returns null and the rise continues untouched.
    const flight = doubleBackFlight(player, dir, snap, state, at);
    if (flight) {
        return flight;
    }
    if (!falling) {
        return null;
    }
    const below = boarderBelow(player, snap);
    if (!below) {
        return null;
    }
    if (snap.jumpCount >= snap.maxJumps || state.lastJump) {
        // No fuel to spend: always steer — dodging the column is free.
        const away = below.x >= player.x ? -1 : 1;
        return { left: away < 0, right: away > 0, jump: false };
    }
    if (Math.abs(below.y - player.y) >= 80) {
        return null;
    }
    if (touchdownDuel(player, below)) {
        const away = below.x >= player.x ? -1 : 1;
        return { left: away < 0, right: away > 0, jump: false };
    }
    // Project the touchdown: momentum carries past a chaser that is
    // only underfoot now (head-on pass), so land and let the grounded
    // duel kill it instead of burning the double into the next gap.
    // A synchronized shadow (matched velocity) still gets the hop.
    if (touchdownClear(player, snap, below)) {
        return null;
    }
    // Crowded touchdown with a survivable hop: take it.
    if (hopTouchdownClear(player, snap, below, dx)) {
        return { left: dx < -10, right: dx > 10, jump: true };
    }
    // A deck waits behind in double range: double back to it instead
    // of descending onto the tracker. The landing refuels for a
    // fresh crossing, and the grounded duel answers the follower.
    const doubleBack = doubleBackMove(player, dir, snap, state, at);
    if (doubleBack) {
        return doubleBack;
    }
    // The hop sails past the deck edge into the pit: descend into
    // the bolt window track-facing the chaser instead. Chasers stop
    // underfoot (8px deadband), so the kill lands at bolt level;
    // only hop when contact is a tick away with it still alive.
    const want = below.x >= player.x ? 'right' : 'left';
    const lastResort = Math.abs(below.y - player.y) < 15;
    if (player.facing !== want) {
        return { left: want === 'left', right: want === 'right', jump: lastResort, shoot: true };
    }
    return { left: false, right: false, jump: lastResort, shoot: true };
}

// Widest deck behind (against the goal direction) the escape
// double can reach, or null: within drift range, inside the landable
// band (below the apex, above the killzone), and never the crowded
// deck below. The widest wins: room beats nearness for the landing.
function backDeck(player, dir, snap, platforms) {
    const gravity =
        snap.physics && Number.isFinite(snap.physics.gravityY) ? snap.physics.gravityY : 400;
    if (!(gravity > 0)) {
        return null;
    }
    const boots = player.y + 22;
    const apexBoots = boots - (330 * 330) / (2 * gravity);
    const killY = Number.isFinite(snap.killZoneY) ? snap.killZoneY : Infinity;
    let best = null;
    let bestWidth = 0;
    for (let i = 0; i < platforms.length; i++) {
        const plat = platforms[i];
        const cx = (plat.left + plat.right) / 2;
        if ((cx - player.x) * dir >= 0) {
            continue;
        }
        if (Math.abs(cx - player.x) > 350) {
            continue;
        }
        if (plat.top < apexBoots || plat.top > killY - 100 || plat.top < boots - 100) {
            continue;
        }
        const width = plat.right - plat.left;
        if (width > bestWidth) {
            bestWidth = width;
            best = plat;
        }
    }
    return best;
}

// True when both decks are the same slab (value-compared: snapshots
// rebuild platform objects every tick, so identity never holds).
function sameDeck(a, b) {
    return a != null && b != null && a.left === b.left && a.right === b.right && a.top === b.top;
}

// Double-back takeoff move, or null when no deck waits behind: arms
// the flight window and spends the double toward the deck behind.
// Never the crowded deck below — that lands back on the chaser.
function doubleBackMove(player, dir, snap, state, at) {
    const back = backDeck(player, dir, snap, snap.platforms || []);
    if (back == null || sameDeck(back, landingBelow(player, snap.platforms || [], snap))) {
        return null;
    }
    state.doubledBackUntil = at + 2500;
    return { left: dir > 0, right: dir < 0, jump: true };
}

// Double-back in progress (spent double, armed window): keep flying
// for the deck behind, ignoring the tracker below. Lands just inside
// the entry edge, clear of mid-deck hardware. Null when disarmed,
// refueled, or the deck drops out of reach (falls back to escape).
function doubleBackFlight(player, dir, snap, state, at) {
    if (snap.jumpCount < snap.maxJumps || at >= (state.doubledBackUntil || 0)) {
        return null;
    }
    const back = backDeck(player, dir, snap, snap.platforms || []);
    if (back == null) {
        return null;
    }
    const edge = dir > 0 ? back.right - 24 : back.left + 24;
    if (Math.abs(player.x - edge) < 8) {
        return { left: false, right: false, jump: false };
    }
    return { left: edge < player.x, right: edge > player.x, jump: false };
}

// Projected touchdown of the escape air-jump (vy -330) onto the
// deck below: true when it lands on the deck clear of the chaser.
// With no deck below, hop as before (a leaping chaser over a pit
// is dodged, not dueled).
function hopTouchdownClear(player, snap, below, dx) {
    const deck = landingBelow(player, snap.platforms || [], snap);
    if (!deck) {
        return true;
    }
    const gravity =
        snap.physics && Number.isFinite(snap.physics.gravityY) ? snap.physics.gravityY : 400;
    if (!(gravity > 0)) {
        return true;
    }
    const dir = dx === 0 ? 1 : Math.sign(dx);
    const boots = player.y + 22;
    const riseT = 330 / gravity;
    const apexBoots = boots - (330 * 330) / (2 * gravity);
    const fall = Math.max(0, deck.top - apexBoots);
    const t = riseT + Math.sqrt(2 * gravity * fall) / gravity;
    if (!Number.isFinite(t)) {
        return true;
    }
    const tx = player.x + dir * 160 * t;
    if (tx < deck.left - 30 || tx > deck.right + 30) {
        return false;
    }
    const chaserTx = below.x + (below.vx || 0) * t;
    return Math.abs(chaserTx - tx) > 40;
}

// True when the touchdown point is clear of the below boarder:
// both coast ballistically to the deck landing and end up separated.
function touchdownClear(player, snap, below) {
    const deck = landingBelow(player, snap.platforms || [], snap);
    if (!deck) {
        return false;
    }
    const gravity =
        snap.physics && Number.isFinite(snap.physics.gravityY) ? snap.physics.gravityY : 400;
    if (!(gravity > 0)) {
        return false;
    }
    const fall = Math.max(0, deck.top - (player.y + 22));
    const vy = Math.max(0, player.vy || 0);
    const t = (Math.sqrt(vy * vy + 2 * gravity * fall) - vy) / gravity;
    if (!Number.isFinite(t)) {
        return false;
    }
    const tx = player.x + (player.vx || 0) * t;
    const chaserTx = below.x + (below.vx || 0) * t;
    return Math.abs(chaserTx - tx) > 40;
}

// A floater hanging over the edge-arc ahead: jump early so the arc
// apexes over it instead of rising through it at the edge takeoff.
// Shadowed by real spring use (which returns first); only fires with
// no spring, an edge within 80px, and a floater above-ahead.
function wantPreJump(player, dir, snap, platforms) {
    if (!player.grounded) {
        return false;
    }
    if (supportAt(player.x + dir * 80, player.y + 6, platforms)) {
        return false;
    }
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || !item.active || item.enable === false) {
            continue;
        }
        if (
            !item.bonkable &&
            item.type !== 'drone' &&
            item.type !== 'rover' &&
            item.type !== 'roller'
        ) {
            continue;
        }
        const ahead = (item.x - player.x) * dir;
        const above = player.y - item.y;
        if (ahead >= 60 && ahead <= 200 && above >= 40 && above <= 200) {
            return true;
        }
    }
    return false;
}

// A deck above within leg range and a clear mount arc: climb it.
function wantStepUp(player, dir, landing, snap) {
    return Boolean(
        landing &&
        player.grounded &&
        landing.top < player.y - 28 &&
        landing.top > player.y - 230 &&
        !mountBlocked(player, dir, snap)
    );
}

// True when a patrol floater (drone, rover, roller) sits in the
// mount arc: delay the step-up jump until it patrols clear instead
// of rising into it. Boarders and bonkables have their own handlers.
function mountBlocked(player, dir, snap) {
    const { rise } = jumpBallistics(snap);
    const apex = player.y - rise;
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || !item.active || item.enable === false) {
            continue;
        }
        if (item.type !== 'drone' && item.type !== 'rover' && item.type !== 'roller') {
            continue;
        }
        const ahead = (item.x - player.x) * dir;
        // 60px behind, not 30: the mount rises forward into a drone
        // sitting just behind the takeoff (L12's floater kills at -58).
        // Drones further back are outrun (98px/s separation); the run
        // continues underneath, so the wait never stalls.
        if (ahead < -60 || ahead > 300 || item.y < apex - 20 || item.y > player.y - 10) {
            continue;
        }
        return true;
    }
    return false;
}

// Nearest aggroed boarder ahead-below the descent (or null): matches
// on the chasing flag regardless of the flickering body switch, so
// a chaser about to switch on still brakes the descent.
function aggroAhead(player, dir, snap) {
    let best = null;
    let bestDist = 150;
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || item.type !== 'boarder' || item.chasing !== true) {
            continue;
        }
        const ahead = (item.x - player.x) * dir;
        const dy = item.y - player.y;
        if (ahead < 40 || ahead >= bestDist || dy < -40 || dy >= 150) {
            continue;
        }
        bestDist = ahead;
        best = item;
    }
    return best;
}

// True when the descent meets a head-on chaser over landable deck:
// brake and land short so the grounded duel kills it. (The blocker
// scan caps the range at 70px; 40px is too late to stop.)
function brakeForChaser(player, dir, blocker, snap) {
    const ahead = (blocker.x - player.x) * dir;
    if (ahead < 40 || Math.abs(blocker.y - player.y) >= 120) {
        return false;
    }
    if (blocker.chasing !== true && (blocker.vx || 0) * dir >= -50) {
        return false;
    }
    return landingBelow(player, snap.platforms || [], snap) != null;
}

// True when the touchdown duel kills this boarder point-blank: on
// our deck, off to the side (no touchdown contact), and covered by a
// duel clause (level, chasing, or dropping in).
function touchdownDuel(player, item) {
    if (item.type !== 'boarder') {
        return false;
    }
    if (Math.abs(item.x - player.x) <= 30 || Math.abs(item.y - player.y) >= 80) {
        return false;
    }
    return Math.abs(item.y - player.y) < 30 || item.chasing === true || (item.vy || 0) > 50;
}

// Airborne over something lethal to touch: drift goalward and hop
// rather than land on it. (Bonkables want the drop and return before
// this; rocks, drones, and boarders kill.)
function lethalDriftJump(player, snap, falling, state) {
    return !player.grounded && falling && snap.jumpCount < snap.maxJumps && !state.lastJump;
}

// Crowded by a bonkable head: drift onto it airborne, back off for a
// runway when it is our spring, else leap over like any small hazard.
// (Tall heads are always our spring via tallBlocker; takeoffs from
// inside rise straight into the head.) Airborne, only the falling
// drop bonks: a deliberate spring lines up (or holds off while
// rising under it), while anything accidental veers off — drifting
// into the side is lethal.
function bonkBlockerMove(player, dx, blocker, spring, platforms, wantSpring) {
    if (!player.grounded) {
        // A tall head with no height purpose is scenery, not a spring:
        // veer off it. Only a wanted spring lines up the drop.
        if (blocker !== spring || !wantSpring) {
            const head = blocker.top != null ? blocker.top : blocker.y - (blocker.h || 44) / 2;
            const dropOk =
                player.vy > 28 && player.y + 22 < head - 20 && Math.abs(blocker.x - player.x) < 40;
            if (!dropOk) {
                const away = blocker.x > player.x ? -1 : 1;
                return { left: away < 0, right: away > 0, jump: false };
            }
        }
        const head = blocker.top != null ? blocker.top : blocker.y - (blocker.h || 44) / 2;
        if (player.vy < 0 && head < player.y + 22 - 30) {
            return { left: false, right: false, jump: false };
        }
        return { left: dx < -10, right: dx > 10, jump: false };
    }
    if (blocker === spring) {
        const away = blocker.x > player.x ? -1 : 1;
        if (supportAt(player.x + away * 56, player.y + 6, platforms)) {
            return { left: away < 0, right: away > 0, jump: false };
        }
        return { left: false, right: false, jump: false };
    }
    return { left: dx < -10, right: dx > 10, jump: true };
}

// A deck below within one jump's rise: the fall ends on its own, so
// burning the double only overshoots the landing. (Occupied decks are
// handled earlier by the descent escape, not here.) Decks inside an
// unsafe beam span are not landings: the arc must extend past them.
function landingBelow(player, platforms, snap) {
    const boots = player.y + 22;
    for (let i = 0; i < platforms.length; i++) {
        const plat = platforms[i];
        if (player.x < plat.left - 30 || player.x > plat.right + 30) {
            continue;
        }
        if (plat.top > boots && plat.top < player.y + 260) {
            if (snap != null && deckInUnsafeBeam(plat, snap)) {
                continue;
            }
            return plat;
        }
    }
    return null;
}

// True when the deck point sits inside a beam band that is active now
// or flips before a touchdown-and-go could land and leave (~500ms).
// Longer cooling windows are safe: the touchdown refuels and the
// inside leap departs before the flip.
function deckInUnsafeBeam(plat, snap) {
    const hazards = snap.hazards || [];
    const dx = plat.x ?? (plat.left + plat.right) / 2;
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || item.type !== 'laser') {
            continue;
        }
        const halfW = (item.w || 0) / 2;
        const halfH = (item.h || 0) / 2;
        const left = (item.left ?? item.x - halfW) - 10;
        const right = (item.right ?? item.x + halfW) + 10;
        if (dx < left || dx > right) {
            continue;
        }
        const top = item.top ?? item.y - halfH;
        const bottom = top + (item.h || 10);
        if (plat.top < top - 30 || plat.top > bottom + 30) {
            continue;
        }
        if (item.phase !== 'cooldown') {
            return true;
        }
        const windowMs = item.timeUntilPhaseChangeMs;
        if (!Number.isFinite(windowMs) || windowMs < 500) {
            return true;
        }
    }
    return false;
}

// Jump ballistics from level gravity: single-jump rise and run. The
// leap check budgets two jumps of run for the double extension.
function jumpBallistics(snap) {
    const gravity =
        snap.physics && Number.isFinite(snap.physics.gravityY) ? snap.physics.gravityY : 400;
    if (!(gravity > 0)) {
        return { rise: 130, range: 264 };
    }
    const rise = Math.min(260, Math.round((330 * 330) / (2 * gravity)));
    const range = Math.round((2 * 330 * 160) / gravity);
    return { rise, range };
}

// Leapable-span takeoff choice: grounded pilots take off cooling so
// the low arc ends stay cold (leaping out on any phase when caught
// inside), airborne ones hold their arc.
function laserLeapMove(player, left, right, cooling) {
    if (!player.grounded) {
        return null;
    }
    if (player.x > left && player.x < right) {
        return 'leap';
    }
    return cooling ? 'leap' : 'hold';
}

// Inside a beam span: sit tight only while cooling with margin to
// spare, else rush out the nearest edge.
function laserInsideMove(player, left, right, cooling, windowMs) {
    const exitMs = (Math.min(player.x - left, right - player.x) / 160) * 1000 + 400;
    if (cooling && windowMs > exitMs + 600) {
        return null;
    }
    return player.x - left < right - player.x ? 'left' : 'right';
}

// One beam's constraint: 'hold' outside an unsafe span, 'left'/'right'
// to rush out of a closing one, 'leap' to jump clean over it, null when
// it does not constrain. Airborne pilots test a wider span: descents
// must steer out before they are over the beam, not after.
function laserSpanMove(player, dir, item, snap) {
    const pad = 26;
    const air = player.grounded ? 0 : 80;
    const airUp = player.grounded ? 0 : 150;
    const halfW = (item.w || 0) / 2;
    const halfH = (item.h || 0) / 2;
    const left = (item.left ?? item.x - halfW) - pad - air;
    const right = (item.right ?? item.x + halfW) + pad + air;
    const top = (item.top ?? item.y - halfH) - pad - airUp;
    const bottom = top + (item.h || 10) + pad * 2 + airUp;
    if (player.y + 22 <= top || player.y - 22 >= bottom) {
        return null;
    }
    const cooling = item.phase === 'cooldown';
    // Leapable arcs fly over the span instead of negotiating it.
    // (Veering back here would cancel the leap and pogo forever.)
    if (beamLeapable(player, item, right - left, snap)) {
        return laserLeapMove(player, left, right, cooling);
    }
    let windowMs = cooling ? 10000 : 0;
    if (Number.isFinite(item.timeUntilPhaseChangeMs)) {
        windowMs = item.timeUntilPhaseChangeMs;
    }
    if (player.x > left && player.x < right) {
        return laserInsideMove(player, left, right, cooling, windowMs);
    }
    const edge = dir > 0 ? left - player.x : player.x - right;
    if (edge < 0 || edge > 140) {
        return null;
    }
    const crossMs = ((right - left) / 160) * 1000 + 350;
    if (cooling && windowMs >= crossMs) {
        return null;
    }
    if (player.grounded) {
        return 'hold';
    }
    // No brakes mid-air: veer off to land short of the span.
    return dir > 0 ? 'left' : 'right';
}

// True when a grounded takeoff arcs over the beam and lands past it:
// apex feet above the beam crown with two jumps of run to spare.
function beamLeapable(player, item, spanWidth, snap) {
    const halfH = (item.h || 0) / 2;
    const crown = item.top ?? item.y - halfH;
    const { rise, range } = jumpBallistics(snap);
    return player.y - rise + 22 < crown - 6 && range * 2 > spanWidth + 120;
}

// Timed-beam crossing: never enter an active span, and only enter a
// cooling span when the window covers the crossing plus margin.
function laserMove(player, dir, snap) {
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || item.type !== 'laser') {
            continue;
        }
        const move = laserSpanMove(player, dir, item, snap);
        if (move) {
            return move;
        }
    }
    return null;
}

// Falling toward a deck inside a live beam span: extend the flight
// past the active phase (or past the span) instead of landing in it.
function touchdownExtend(input, player, snap, falling, state, dx) {
    if (player.grounded || !falling) {
        return false;
    }
    if (snap.jumpCount >= snap.maxJumps || state.lastJump) {
        return false;
    }
    const deck = landingBelow(player, snap.platforms || [], null);
    if (!deck || !deckInUnsafeBeam(deck, snap)) {
        return false;
    }
    input.jump = true;
    input.right = dx > 10;
    input.left = dx < -10;
    return true;
}

// Applies the descent escape to the input; true when it handles the tick.
function applyDescentEscape(input, player, snap, falling, state, dx) {
    const escape = descentEscape(player, snap, falling, state, dx);
    if (!escape) {
        return false;
    }
    input.left = escape.left;
    input.right = escape.right;
    input.jump = escape.jump;
    if (escape.shoot) {
        input.shoot = true;
    }
    return true;
}

// Applies the beam constraint to the input; true when it handles the tick.
function applyLaserMove(input, player, dir, snap, state) {
    const laser = laserMove(player, dir, snap);
    if (laser === 'hold') {
        return true;
    }
    if (laser == null) {
        return false;
    }
    if (laser === 'leap') {
        input.left = dir < 0;
        input.right = dir > 0;
        input.jump = true;
        return true;
    }
    input.left = laser === 'left';
    input.right = laser === 'right';
    // Rushing out mid-air: extend the flight while fuel lasts so the
    // exit clears the span instead of landing back inside it.
    if (!player.grounded && snap.jumpCount < snap.maxJumps && !state.lastJump) {
        input.jump = true;
    }
    return true;
}

// Piston velocity across ticks, px/s downward-positive: crusher tweens
// never set body velocity, so track y over snap.elapsedMs. Zero on
// first sight (no history yet).
function crusherVy(item, snap, state) {
    const t = Number.isFinite(snap.elapsedMs) ? snap.elapsedMs : 0;
    const prev = state.crusherPrev[item.id];
    const vy = prev && t > prev.t ? ((item.y - prev.y) / (t - prev.t)) * 1000 : 0;
    state.crusherPrev[item.id] = { y: item.y, t };
    return vy;
}

function crusherRestY(item) {
    return item.origin && Number.isFinite(item.origin.y) ? item.origin.y : item.y;
}

function crusherSlamY(item) {
    return item.target && Number.isFinite(item.target.y) ? item.target.y : item.y;
}

// True when the piston stroke can touch the pilot: it slams below the
// head and the pilot is not on a deck over the shaft.
function crusherReaches(item, player) {
    const halfH = (item.h || 22) / 2;
    if (crusherSlamY(item) + halfH < player.y - 28) {
        return false;
    }
    if (player.y + 22 < crusherRestY(item) - halfH - 10) {
        return false;
    }
    return true;
}

// The gate is open while the piston rises or dwells at rest. A
// descending piston slams shut in ~130ms (Quad.easeIn lingers high
// then slams), too fast to enter on, while a rising one gives the
// full cycle to cross under.
function crusherOpen(item, vy) {
    const nearRest = Math.abs(item.y - crusherRestY(item)) < 24;
    return vy < -30 || (nearRest && vy <= 30);
}

// One piston's constraint: 'hold' outside a closing lane, 'left' /
// 'right' to rush out from under one, null when it does not
// constrain. Never jump: rising into the piston is lethal, and the
// sprint fits the open window from a moving approach.
function crusherSpanMove(player, dir, item, snap, state) {
    if (!item.active || item.enable === false || !crusherReaches(item, player)) {
        return null;
    }
    const halfW = (item.w || 64) / 2;
    const pad = 26;
    const left = (item.left ?? item.x - halfW) - pad;
    const right = (item.right ?? item.x + halfW) + pad;
    if (player.x > left && player.x < right) {
        if (crusherOpen(item, crusherVy(item, snap, state))) {
            return null;
        }
        return player.x - left < right - player.x ? 'left' : 'right';
    }
    const edge = dir > 0 ? left - player.x : player.x - right;
    if (edge < 0 || edge > 140) {
        return null;
    }
    if (crusherOpen(item, crusherVy(item, snap, state))) {
        return null;
    }
    if (player.grounded) {
        return 'hold';
    }
    // No brakes mid-air: veer off to land short of the lane.
    return dir > 0 ? 'left' : 'right';
}

// Crusher timing: never enter a piston lane unless the gate is open.
function crusherMove(player, dir, snap, state) {
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || item.type !== 'crusher') {
            continue;
        }
        const move = crusherSpanMove(player, dir, item, snap, state);
        if (move) {
            return move;
        }
    }
    return null;
}

// Applies the piston constraint to the input; true when it handles the tick.
function applyCrusherMove(input, player, dir, snap, state) {
    const move = crusherMove(player, dir, snap, state);
    if (move === 'hold') {
        return true;
    }
    if (move == null) {
        return false;
    }
    input.left = move === 'left';
    input.right = move === 'right';
    return true;
}

// High landing the current arc falls short of: double at the apex
// instead of waiting for the fall below takeoff (which never comes
// when the landing sits above the takeoff). Gated on a near miss
// (<200px, one double covers) so spring-level heights still wait
// for their bonkable, and on a close landing so wide pits keep
// their committed-fall double.
function climbDouble(player, snap, state, platforms) {
    if (player.grounded || snap.jumpCount >= snap.maxJumps || state.lastJump) {
        return false;
    }
    if (state.takeoffY == null || player.vy < -60) {
        return false;
    }
    let deck = null;
    let deckDist = 300;
    for (let i = 0; i < platforms.length; i++) {
        const plat = platforms[i];
        if (plat.top >= state.takeoffY - 40) {
            continue;
        }
        let edge = player.x;
        if (plat.left > player.x) {
            edge = plat.left;
        } else if (plat.right < player.x) {
            edge = plat.right;
        }
        const dist = Math.abs(edge - player.x);
        if (dist < deckDist) {
            deck = plat;
            deckDist = dist;
        }
    }
    if (!deck) {
        return false;
    }
    const gravity =
        snap.physics && Number.isFinite(snap.physics.gravityY) ? snap.physics.gravityY : 400;
    if (!(gravity > 0)) {
        return false;
    }
    const riseLeft = player.vy < 0 ? (player.vy * player.vy) / (2 * gravity) : 0;
    const miss = player.y + 22 - riseLeft - deck.top;
    if (miss <= 0 || miss >= 200) {
        return false;
    }
    const { range } = jumpBallistics(snap);
    return deckDist < range + 60;
}

// Hold the air jump until the fall commits: below takeoff height, soon
// past the kill plane, or falling too fast to wait. Firing at the first
// falling tick burns the double at the apex over wide pits.
function committedFall(player, snap, state) {
    const killRoom = Number.isFinite(snap.killZoneY) ? snap.killZoneY - player.y : Infinity;
    return (
        state.takeoffY == null ||
        killRoom < 220 ||
        player.y > state.takeoffY + 40 ||
        player.vy > 320
    );
}

// A live bonkable hanging over the pilot's hop column: rising straight
// up would bonk sky-high instead of dodging.
function bonkOverhead(player, snap) {
    const boots = player.y + 22;
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || !item.bonkable || !item.active || item.enable === false) {
            continue;
        }
        if (Math.abs(item.x - player.x) > 70) {
            continue;
        }
        const top = item.top != null ? item.top : item.y - (item.h || 44) / 2;
        if (top < boots - 20 && top > boots - 200) {
            return true;
        }
    }
    return false;
}

// X of the nearest in-lane boarder ahead, or the player's own X when the
// lane is clear. Gives the dodge direction when the hop is unsafe.
function laneBoarderX(player, dir, snap) {
    let bestX = player.x;
    let bestDist = Infinity;
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || item.type !== 'boarder' || !item.active || item.enable === false) {
            continue;
        }
        const ahead = (item.x - player.x) * dir;
        if (ahead > 0 && ahead <= 820 && Math.abs(item.y - player.y) < 70 && ahead < bestDist) {
            bestDist = ahead;
            bestX = item.x;
        }
    }
    return bestX;
}

// Vertical offset of the nearest in-lane boarder ahead (0 when none):
// the close reflex only hops what it can touch.
function laneBoarderDy(player, dir, snap) {
    let bestDy = 0;
    let bestDist = Infinity;
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || item.type !== 'boarder' || !item.active || item.enable === false) {
            continue;
        }
        const ahead = (item.x - player.x) * dir;
        if (ahead > 0 && ahead <= 820 && Math.abs(item.y - player.y) < 70 && ahead < bestDist) {
            bestDist = ahead;
            bestDy = item.y - player.y;
        }
    }
    return bestDy;
}

// Shield-hunt target: the nearest live boarder when the crown is
// shielded, the lane is empty, and the pad is near. The shield stays up
// all level, so hunting mid-run would drag the pilot backward into
// cleared waves instead of releasing the next one; near the pad with no
// in-lane target, though, the pad is a trap. Null means push crown-ward
// (killing in-lane on the way, or releasing the next wave). Hunts commit
// by target id until the kill: re-deciding every tick flip-flops across
// the zone boundary without finishing anything.
function shieldHuntTarget(player, snap, crown, laneDist, state) {
    if (!snap.crown || snap.crown.shielded !== true || laneDist >= 0) {
        state.huntId = null;
        return null;
    }
    const hazards = snap.hazards || [];
    if (state.huntId != null) {
        for (let i = 0; i < hazards.length; i++) {
            const item = hazards[i];
            if (
                item &&
                item.id === state.huntId &&
                item.active &&
                item.enable !== false &&
                Math.abs(item.x - crown.x) < 700
            ) {
                return item;
            }
        }
        state.huntId = null;
    }
    if (Math.abs(crown.x - player.x) >= 1500) {
        return null;
    }
    const hunt = nearestBoarder(player, snap, crown);
    if (hunt) {
        state.huntId = hunt.id;
    }
    return hunt;
}

// Nearest live boarder near the crown pad, or null. The shield breaks
// when the crown-platform guards die (BoarderDirector), and guards stay
// on deck — so only pad boarders are worth hunting. Stragglers behind
// the run are ignored: U-turning for them burns jumps and walks the
// pilot back into cleared packs.
function nearestBoarder(player, snap, crown) {
    if (!snap || snap.phaser !== true) {
        return null;
    }
    let best = null;
    let bestDist = Infinity;
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || item.type !== 'boarder' || !item.active || item.enable === false) {
            continue;
        }
        if (crown == null || Math.abs(item.x - crown.x) >= 700) {
            continue;
        }
        const dist = Math.hypot(item.x - player.x, item.y - player.y);
        if (dist < bestDist) {
            bestDist = dist;
            best = item;
        }
    }
    return best;
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
        // Distance hops line up a bonk descent: the head must sit at or
        // below the boots. Engaging a head overhead only veers away and
        // kills the crossing momentum (the lift case seeks those).
        if (forDistance && top < boots - 30) {
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
        state.takeoffY = player.y;
        state.doubledBackUntil = 0;
    }
    const platforms = snap.platforms || [];
    const crown = snap.crown || { x: player.x + 200, y: player.y };
    let goal = crown;
    let dx = goal.x - player.x;
    let dir = dx === 0 ? 1 : Math.sign(dx);
    let laneDist = boarderAhead(player, dir, snap);
    let shooting = laneDist >= 0;
    input.shoot = shooting;
    // Bombs rain from above; ray columns freeze the whole move.
    if (applyAmbushHolds(input, player, dir, snap, platforms)) {
        return input;
    }
    // Timed beams gate the whole move.
    if (applyLaserMove(input, player, dir, snap, state)) {
        return input;
    }
    // Crusher pistons gate the lane the same way: enter only on the rise.
    if (applyCrusherMove(input, player, dir, snap, state)) {
        return input;
    }
    // Falling drips: hold for the pass, never leap into the fall.
    if (applyDripMove(input, player, dir, snap)) {
        return input;
    }
    if (applyCloseReflex(input, player, dir, snap, platforms, shooting, laneDist)) {
        return input;
    }
    // Advancing (or jumping) past a live boarder ends under its leap.
    if (applyFrontDuel(input, player, dir, snap, state)) {
        return input;
    }
    // A live chaser on our heels: turn, hold, and kill it.
    if (applyRearDuel(input, player, dir, snap, state)) {
        return input;
    }
    // Shield hunt, finale zone only (see shieldHuntTarget): steer for
    // the nearest pad boarder and re-aim down the hunt direction. Jump
    // triggers below stay crown-relative (crownDx): a hunt-relative
    // distance would burn air jumps "grabbing" at a nearby guard.
    const crownDx = crown.x - player.x;
    const hunt = shieldHuntTarget(player, snap, crown, laneDist, state);
    if (hunt) {
        goal = hunt;
        dx = hunt.x - player.x;
        dir = dx === 0 ? dir : Math.sign(dx);
        laneDist = boarderAhead(player, dir, snap);
        shooting = laneDist >= 0;
        input.shoot = shooting;
    }
    // Dust devils sweep too fast to time on foot but arc cleanly.
    if (applyDevilLeap(input, player, dir, dx, snap, platforms)) {
        return input;
    }
    // Descending onto an aggroed chaser's deck with it ahead: brake
    // and land short so the grounded duel kills it on approach.
    // Matches on the chasing flag even when the body flickers off —
    // the flag means business — but never grounded runners, so wave
    // triggers still release on approach.
    if (!player.grounded && player.vy > 28 && aggroAhead(player, dir, snap) != null) {
        if (landingBelow(player, platforms, snap) != null) {
            return input;
        }
    }
    const blocker = hazardInPath(player.x, player.y, dir, snap.hazards || [], snap.bombs || [], 70);
    // Airborne over a devil: hold the arc, never freeze mid-flight.
    if (blocker && !isHopable(blocker) && (player.grounded || blocker.type !== 'dust_devil')) {
        return input;
    }
    const under = supportAt(player.x, player.y + 6, platforms);
    const ahead = supportAt(player.x + dir * 56, player.y + 6, platforms);
    const landing = nextPlatform(player.x, player.y, dir, platforms);
    const falling = player.vy > 28;
    const gap = !ahead;
    // Small step-down: run off and land instead of full-jumping.
    // A full jump off a low edge becomes a 350px fuel-burning flight;
    // chasers shadow it, the double goes to dodging them, and the
    // next real gap finds the tank empty.
    const dropSmall = smallStepDown(player, dir, gap, landing);
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
            applyBonkBlocker(input, player, dx, blocker, spring, seek, hop, platforms);
            return input;
        }
        if (lethalDriftJump(player, snap, falling, state) && !touchdownDuel(player, blocker)) {
            input.right = dx > 10;
            input.left = dx < -10;
            input.jump = true;
            return input;
        }
        const engaging = shooting && blocker.type === 'boarder';
        if (engaging) {
            // Airborne into a head-on chaser: brake and land short —
            // the grounded duel kills it. Flying the descent collides
            // with it at the touchdown point.
            if (!player.grounded && falling && brakeForChaser(player, dir, blocker, snap)) {
                return input;
            }
            // Gun it down first; jumping in just trades.
            input.right = dx > 10;
            input.left = dx < -10;
            return input;
        }
        // Leap over drones, rollers, rovers, or hold too close to
        // clear. Airborne pilots keep flying instead — the descent
        // logic below steers the touchdown.
        if (applyHopLeap(input, player, dx, dist)) {
            return input;
        }
    }
    if (applyDescentEscape(input, player, snap, falling, state, dx)) {
        return input;
    }
    if (touchdownExtend(input, player, snap, falling, state, dx)) {
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
                !state.lastJump &&
                snap.jumpCount < snap.maxJumps;
            return input;
        }
        // Airborne below head level: veer off. Rising or drifting into
        // the body from the side is lethal; only the falling drop bonks.
        input.left = dxSeek > 0;
        input.right = dxSeek < 0;
        return input;
    }
    if (applyHighHold(input, player, under, landing)) {
        return input;
    }
    // Riding a bonk bounce (rises faster than any jump): steer for the
    // high landing instead of the far crown so the bounce converts.
    const riding = !player.grounded && player.vy < -400;
    const rideTarget = riding && landing && landing.top < player.y ? landing : goal;
    input.right = rideTarget.x - player.x > 10;
    input.left = rideTarget.x - player.x < -10;
    const stepUp = wantStepUp(player, dir, landing, snap);
    const grabCrown =
        Math.abs(crownDx) < 180 && player.y > crown.y + 18 && player.y < crown.y + 240;
    // Final-approach hops only: when the crown is close, hop toward it
    // instead of running underneath. (An unrestricted climb-above rule
    // turned the pilot into a pogo stick: airborne bolts fly over
    // boarder heads while bombs and chasers connect. Ascents are
    // covered by stepUp/grabCrown.)
    const closePush = player.grounded && Math.abs(crownDx) < 150;
    // Don't leap into a landing occupied by something lethal.
    if (applyLandingWait(player, gap, landing, snap, shooting, laneDist)) {
        return input;
    }
    const shouldJump =
        (gap && !dropSmall) ||
        stepUp ||
        grabCrown ||
        closePush ||
        wantPreJump(player, dir, snap, platforms);
    const climb = climbDouble(player, snap, state, platforms);
    // Unleapable devil ahead (a low lid caps the arc): give ground to
    // the west until a mount engages — the deck over the devil is the
    // bridge.
    if (applyDevilRetreat(input, player, dir, snap, platforms, shouldJump)) {
        return input;
    }
    const canDouble =
        !player.grounded &&
        falling &&
        committedFall(player, snap, state) &&
        (gap || stepUp || grabCrown) &&
        landingBelow(player, platforms, snap) == null &&
        snap.jumpCount < snap.maxJumps;
    if (player.grounded) {
        input.jump = shouldJump;
    } else if ((canDouble || climb) && !state.lastJump) {
        input.jump = true;
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
            // Pulse latch: airborne branches fire only on release, so
            // consecutive air jumps edge-fire instead of holding one edge.
            state.lastJump = Boolean(input.jump);
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
    duelTarget,
    boarderBelow,
    duelHold,
    duelGate,
    touchdownDuel,
    touchdownClear,
    aggroAhead,
    brakeForChaser,
    wantStepUp,
    wantPreJump,
    mountBlocked,
    dripMove,
    applyDripMove,
    chaserBehind,
    devilAhead,
    devilLidded,
    devilLeapable,
    mountShort,
    applyFrontDuel,
    applyRearDuel,
    applyDevilLeap,
    applyDevilRetreat,
    applyHighHold,
    applyLandingWait,
    applyBonkBlocker,
    applyHopLeap,
    applyAmbushHolds,
    applyCloseReflex,
    landingBelow,
    descentEscape,
    applyDescentEscape,
    backDeck,
    sameDeck,
    doubleBackMove,
    doubleBackFlight,
    hopTouchdownClear,
    touchdownExtend,
    lethalDriftJump,
    bonkBlockerMove,
    climbDouble,
    committedFall,
    deckInUnsafeBeam,
    jumpBallistics,
    beamLeapable,
    laserLeapMove,
    laserInsideMove,
    laserSpanMove,
    laserMove,
    applyLaserMove,
    crusherVy,
    crusherRestY,
    crusherSlamY,
    crusherReaches,
    crusherOpen,
    crusherSpanMove,
    crusherMove,
    applyCrusherMove,
    bonkOverhead,
    laneBoarderX,
    laneBoarderDy,
    nearestBoarder,
    shieldHuntTarget,
    nearestThreat,
    bombDodge,
    landingThreat,
    smallStepDown,
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
