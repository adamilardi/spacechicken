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
        // Dismount veto tracking: a mover holding the touchdown zone
        // forever (a patrol fully inside the threat radius) must not
        // pin the ride — leap over after 2.5s of veto.
        dismountVetoId: null,
        dismountVetoSince: 0,
        // Rescue-aim latch: the touchdown projection uses current vx,
        // which the aim itself reverses — without the latch the gate
        // flaps every tick and the flight vibrates instead of landing.
        rescueHeld: false,
        huntId: null,
        // Crusher pistons ride tweens, which never set body velocity:
        // track each piston's y over snap.elapsedMs for rise/slam sense.
        crusherPrev: {},
        // Lift position history (same tween blindness): boarding and
        // riding need the lift's velocity, tracked per id.
        liftPrev: {},
        // Committed beam leap: { fromX, dir, untilMs }. A leap arc is
        // verified clear at takeoff, so the flight holds its line
        // instead of letting a mid-air veer drag it back.
        beamLeap: null,
        // Patrol position history, same idea: landing vetoes time
        // drones and rovers instead of holding forever.
        threatPrev: {},
        // Set per tick when the pilot deliberately holds still (lift
        // waits, backing up, riding): suppresses stuck recovery.
        holdStill: false,
        // Wall-time when threat suppression started; a threat that never
        // leaves is a hold, so threat suppression expires (holds still
        // never expire: breaking a lift ride would suicide the run).
        threatSuppressFromT: null,
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

// A hazard tall enough to gate the lane: beams report their strike
// height, but cosmic-ray snapshots only carry the emitter — an active
// ray is a full-height column regardless of its snapshot h.
function tallColumnHazard(item) {
    if (!item || !item.active || item.enable === false) {
        return false;
    }
    return (item.h || 0) >= 160 || item.type === 'cosmic_ray';
}

// Vertical overlap with a column threat: ray beams span from the
// emitter down, so anything below the emitter is in the strike.
function columnOverlapY(py, item, pad) {
    if (item.type === 'cosmic_ray') {
        return py > item.y - 20;
    }
    return yOverlaps(py, item, pad);
}

function columnAhead(px, py, dir, snap, riding) {
    const reach = 82;
    // Riders skip the column freeze (holding rides into the strike —
    // the emergency dismount leaps instead) but still freeze for tall
    // hazards ahead.
    if (!riding) {
        const columns = snap.columns || [];
        for (let i = 0; i < columns.length; i++) {
            const dx = columns[i].x - px;
            if (dx * dir > 6 && dx * dir < reach) {
                return true;
            }
        }
    }
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!tallColumnHazard(item)) {
            continue;
        }
        const dx = item.x - px;
        if (dx * dir > 6 && dx * dir < reach && columnOverlapY(py, item, 8)) {
            return true;
        }
    }
    return false;
}

// Ray column (warning or live strike) overlapping the pilot: freezing
// beside it is suicide (the strike edge touches), so step away. Returns
// the escape direction (-1/0/1). The 40px radius clears the 8px strike
// plus a body width while keeping lift riders aboard their deck.
function rayEvacuate(player, snap) {
    const px = player.x;
    let best = 0;
    let bestDist = 40;
    const columns = snap.columns || [];
    for (let i = 0; i < columns.length; i++) {
        const dx = columns[i].x - px;
        if (Math.abs(dx) < bestDist) {
            bestDist = Math.abs(dx);
            best = dx >= 0 ? -1 : 1;
        }
    }
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || item.type !== 'cosmic_ray' || !item.active || item.enable === false) {
            continue;
        }
        const dx = item.x - px;
        if (Math.abs(dx) < bestDist && columnOverlapY(player.y, item, 8)) {
            bestDist = Math.abs(dx);
            best = dx >= 0 ? -1 : 1;
        }
    }
    return best;
}

function hazardInPath(px, py, dir, hazards, bombs, reach) {
    const items = hazards.concat(bombs);
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.active || item.enable === false) {
            continue;
        }
        // Timed beams are owned end-to-end by the laser gate above; as a
        // blocker their tall span would freeze the run-through.
        if (item.type === 'laser') {
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

// Airborne over a devil: hold the arc, never freeze mid-flight.
// Airborne over a boss: fall through to the descent escape, which
// steers the touchdown — holding here lands inside the body.
function blockerHoldsArc(player, blocker) {
    if (player.grounded) {
        return true;
    }
    return blocker.type !== 'dust_devil' && blocker.type !== 'boss';
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
        if (!item || (item.type !== 'boarder' && item.type !== 'boss')) {
            continue;
        }
        if (!item.active || item.enable === false) {
            continue;
        }
        const ahead = (item.x - player.x) * dir;
        if (ahead > 0 && ahead <= 820 && Math.abs(item.y - player.y) < 70) {
            nearest = nearest < 0 ? ahead : Math.min(nearest, ahead);
        }
    }
    return nearest;
}

// A boss winding up or bearing down ahead: jump now, keep running and
// firing. Standing to duel a charge trades; the arc clears it. Dormant
// and recovering bosses let the pilot walk the trigger up normally.
function bossEvadeTarget(player, dir, snap) {
    if (!snap || snap.phaser !== true) {
        return null;
    }
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || item.type !== 'boss' || !item.active || item.enable === false) {
            continue;
        }
        const ahead = (item.x - player.x) * dir;
        if (ahead <= 0 || ahead > 450) {
            continue;
        }
        // Only the charge's reach matters: a telegraph past it never
        // connects, so hold fire instead of jumping at shadows.
        const reach = (item.chargeRange || 380) + 70;
        if ((item.phase === 'telegraph' || item.phase === 'charge') && ahead <= reach) {
            return item;
        }
        // Pace, summonTell, and recover all sit out the trigger window:
        // kite them, or the hunt goal walks the pilot into the body.
        if (
            (item.phase === 'pace' || item.phase === 'summonTell' || item.phase === 'recover') &&
            ahead < 150
        ) {
            return item;
        }
    }
    return null;
}

// A live boss anywhere in the snapshot: the crown grab is a trap
// while she holds the shield, so the pilot fights instead.
function liveBoss(snap) {
    const hazards = snap?.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || item.type !== 'boss' || !item.active || item.enable === false) {
            continue;
        }
        if (item.hp == null || item.hp > 0) {
            return item;
        }
    }
    return null;
}

// True when it handles the tick: kite at range, never run into her.
// The shield holds until she dies, so advancing past is pointless;
// grounded bolts on the pace, the arc over the charge. A threat from
// behind turns at range and plants to fire instead of fumbling a
// shielded crown or walking into her.
function applyBossEvade(input, player, dir, dx, snap, shooting) {
    const threat = bossEvadeTarget(player, dir, snap) || bossEvadeTarget(player, -dir, snap);
    if (!player.grounded || threat == null) {
        return false;
    }
    // The jump only lasts ~700ms, so a fresh 800ms telegraph outlasts
    // it: hold fire until the charge is imminent, then go. A missing
    // timer jumps now (the safe default).
    const timeLeft = threat.timeUntilPhaseChangeMs;
    const imminent =
        threat.phase === 'charge' ||
        (threat.phase === 'telegraph' && (timeLeft == null || timeLeft <= 350));
    const behind = (threat.x - player.x) * dir < 0;
    if (!behind) {
        const dist = Math.abs(threat.x - player.x);
        const pace = threat.phase !== 'telegraph' && threat.phase !== 'charge' && dist >= 140;
        if (pace && !bossSharesDeck(player, threat, snap)) {
            // Off her deck at snipe range with no charge coming:
            // abstain and let the grounded hunt close — it marches,
            // hops steps, and dismounts lifts. Planting here snipes
            // air while her adds close in (L15 lift); marching here
            // as a second controller jitters against the kite at the
            // 140px boundary and pins the fight (L13 step).
            return false;
        }
    }
    if (behind) {
        // Threat behind: face it without walking into it. Facing flips
        // on a step key, so step to face it, plant and fire once faced,
        // and cross over (never through) when it is on top of us.
        const want = threat.x > player.x ? 'right' : 'left';
        const faced = player.facing === want;
        const dist = Math.abs(threat.x - player.x);
        const incoming = threat.phase === 'telegraph' || threat.phase === 'charge';
        input.shoot = true;
        if (incoming && imminent) {
            input.jump = true;
            input.right = !faced && want === 'right';
            input.left = !faced && want === 'left';
            return true;
        }
        if (incoming) {
            // Fresh telegraph behind: hold and fire, the jump goes late.
            input.jump = false;
            input.right = false;
            input.left = false;
            return true;
        }
        if (dist <= 70) {
            input.right = want === 'right';
            input.left = want === 'left';
            input.jump = true;
            return true;
        }
        if (!faced) {
            input.right = want === 'right';
            input.left = want === 'left';
            input.jump = false;
            return true;
        }
        // Faced with a pacer closing in: cross over before it arrives;
        // planting only wins against a threat that holds still.
        const closingSpeed = Math.sign(player.x - threat.x) * (threat.vx || 0);
        if (closingSpeed > 15 && dist <= 115) {
            input.right = want === 'right';
            input.left = want === 'left';
            input.jump = true;
            return true;
        }
        input.right = false;
        input.left = false;
        input.jump = false;
        return true;
    }
    bossEvadeAhead(input, player, threat, snap, imminent);
    input.shoot = shooting;
    return true;
}

// Threat ahead: plant and fire unless something forces a move. Bolts
// reach 820px, so spacing past 140px only spends position and walks
// toward pits; only a connectable charge or a close body earns feet.
function bossEvadeAhead(input, player, threat, snap, imminent) {
    const incoming = threat.phase === 'telegraph' || threat.phase === 'charge';
    const dist = Math.abs(threat.x - player.x);
    if (dist >= 300) {
        input.right = false;
        input.left = false;
        input.jump = imminent;
        return;
    }
    const reach = (threat.chargeRange || 380) + 70;
    const connectable = incoming && dist <= reach + 40;
    const still = !incoming && Math.abs(threat.vx || 0) < 20;
    if ((!connectable && dist >= 140) || still) {
        input.right = false;
        input.left = false;
        input.jump = false;
        return;
    }
    if (corneredByBoss(player, snap, threat)) {
        // No floor behind: go over the top instead of backing off it.
        input.right = threat.x > player.x;
        input.left = threat.x < player.x;
        input.jump = true;
        return;
    }
    input.right = threat.x < player.x;
    input.left = threat.x > player.x;
    input.jump = imminent;
}

// The static deck underfoot, or null on a mover or mid-stride. The
// boss shares it when her body stands over the same span.
export function footingDeck(player, platforms) {
    for (const deck of platforms || []) {
        if (!deck || deck.top == null || deck.left == null || deck.right == null) {
            continue;
        }
        if (player.x < deck.left || player.x > deck.right) {
            continue;
        }
        if (deck.top < player.y - 60 || deck.top > player.y + 40) {
            continue;
        }
        return deck;
    }
    return null;
}

export function bossSharesDeck(player, threat, snap) {
    const footing = footingDeck(player, snap.platforms || []);
    return footing != null && threat.x >= footing.left && threat.x <= footing.right;
}

// True when the floor under the pilot ends within 90px on the flee
// side: backing away would drop into the gap, so attack through.
function corneredByBoss(player, snap, threat) {
    const platforms = snap.platforms || [];
    const fleeLeft = threat.x > player.x;
    for (let i = 0; i < platforms.length; i++) {
        const deck = platforms[i];
        if (!deck || deck.top == null || deck.left == null || deck.right == null) {
            continue;
        }
        if (player.x < deck.left || player.x > deck.right) {
            continue;
        }
        if (deck.top < player.y - 60 || deck.top > player.y + 40) {
            continue;
        }
        return fleeLeft ? player.x - deck.left < 90 : deck.right - player.x < 90;
    }
    return false;
}

// A duel target: live boarder ahead worth holding fire for. Level
// targets die to held bolts before aggro range; drops (still falling
// into the lane, wave-flagged or not) and chasers are held the same
// way instead of letting them land on or run past the pilot. Aimed
// hop dives still dodge: they fall with sideways hop speed, while
// wave drops fall straight down. Parked bodies (enable false) count:
// they arm on a timer and bolts connect then. Unreleased waves
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
        const vy = item.vy || 0;
        // Level bolts only connect near the line: hold point-blank and
        // for straight drops (they fall into the bolts), but an aimed
        // chasing dive closes through the bolt flight untouched — dodge
        // divers by running, their leaps are committed and land where
        // the pilot stood. Wave drops fall straight down (no horizontal
        // drive) even after aggro flags them chasing; hop dives keep
        // hop speed sideways (|vx| >= 133), so near-zero vx tells them
        // apart (L7 wave-2 touchdown).
        const level = Math.abs(dy) < 30;
        const dropping =
            vy > 50 &&
            dy < 30 &&
            dy > -300 &&
            (item.chasing !== true || Math.abs(item.vx || 0) < 50);
        const chasing = item.chasing === true && Math.abs(dy) <= 60 && Math.abs(vy) < 150;
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

// Wide boss body with no grounded duel to land into: clear the column
// early, hop when close. The 80px boarder gate below would leave a
// 108px body unavoidable. A committed cross above the body holds
// course instead: reversing mid-arc drops onto the near half.
// True when the current drift's touchdown clears the boss's far
// edge: the only drift worth holding. Gravity-aware fall time (the
// linear drop/vy overestimates flight 2-3x and holds drifts that
// land inside her), measured against where she is going, not where
// she is — a pacer walks into a merely static clearance.
function bossCrossClears(player, below, snap) {
    const driftVx = player.vx || 0;
    if (driftVx === 0) {
        return false;
    }
    const deckBelow = landingBelow(player, snap.platforms || [], snap);
    const feetNow = player.y + 18;
    const dropNow = deckBelow ? deckBelow.top - feetNow : -1;
    const bossTop = Number.isFinite(below.top) ? below.top : below.y - 33;
    if (dropNow <= 0 || feetNow >= bossTop) {
        return false;
    }
    const halfBody = (below.w || 108) / 2 + 17;
    const gravity =
        snap.physics && Number.isFinite(snap.physics.gravityY) ? snap.physics.gravityY : 400;
    const vyNow = Math.max(player.vy || 0, 0);
    const fallT =
        gravity > 0
            ? (Math.sqrt(vyNow * vyNow + 2 * gravity * dropNow) - vyNow) / gravity
            : dropNow / Math.max(player.vy || 0, 60);
    const touchdown = player.x + driftVx * fallT;
    const bossFutureX = below.x + (below.vx || 0) * fallT;
    const pastHer =
        driftVx > 0 ? touchdown > bossFutureX + halfBody : touchdown < bossFutureX - halfBody;
    // Past her and onto a deck: sailing beyond the edge is the pit,
    // not a crossing.
    if (!pastHer) {
        return false;
    }
    return landingBelow({ x: touchdown, y: player.y }, snap.platforms || [], snap) != null;
}

function descentBossMove(player, below, snap) {
    // `below` is the boss herself, never a landing spot: a drift only
    // holds when its touchdown clears her far edge, or the arc rides
    // into her. Everything short of clearing steers away.
    const away = below.x >= player.x ? -1 : 1;
    const driftVx = player.vx || 0;
    if (driftVx !== 0 && bossCrossClears(player, below, snap)) {
        return { left: driftVx < 0, right: driftVx > 0, jump: false };
    }
    // Land fast: steering always clears a boss that cannot shadow it,
    // while a hop trades the landing for another full flight (and the
    // boss repositions under it). Hop only with no deck below, or when
    // the steered touchdown still lands inside the body. When full
    // steering would leave the deck, hold the drift if it lands safe
    // and brake only against outward momentum: the column re-evaluates
    // every tick, and landing near her beats the pit.
    const deck = landingBelow(player, snap.platforms || [], snap);
    if (deck == null) {
        return { left: away > 0, right: away < 0, jump: true };
    }
    const feet = player.y + 18;
    const drop = deck.top - feet;
    const vy = Math.max(player.vy || 0, 60);
    const tx = player.x + away * 240 * (drop / vy);
    const nx = player.x + (player.vx || 0) * (drop / vy);
    const lands = (x) => landingBelow({ x, y: player.y }, snap.platforms || [], snap) != null;
    const halfBody = (below.w || 108) / 2 + 17;
    // Low with the drift touchdown inside her and steering that
    // leaves the deck: neither path lands safe, so hop out. Higher
    // up the column re-evaluates with room to correct.
    if (drop > 0 && drop <= 150 && Math.abs(nx - below.x) < halfBody && !lands(tx)) {
        return { left: away < 0, right: away > 0, jump: true };
    }
    // Low with the steered touchdown off-deck: hold the drift when it
    // lands safe, brake only against outward momentum. High up, steer
    // regardless — later ticks still have room to correct.
    if (drop > 0 && drop <= 150 && !lands(tx)) {
        if (!lands(nx) && (player.vx || 0) * away > 60) {
            return { left: away > 0, right: away < 0, jump: false };
        }
        return { left: false, right: false, jump: false };
    }
    const near = drop > 0 && Math.abs(tx - below.x) < halfBody;
    return { left: away < 0, right: away > 0, jump: near };
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
        if (!item || (item.type !== 'boarder' && item.type !== 'boss')) {
            continue;
        }
        if (!item.active || item.enable === false) {
            continue;
        }
        const dy = item.y - player.y;
        // Bosses need the whole fall: a 108px body under a 350px drop
        // is unavoidable when steering starts at boarder range. The
        // column must exceed contact reach (55px body + 17px pilot),
        // or the escape sleeps inside the kill zone.
        const dyWindow = item.type === 'boss' ? 420 : 230;
        const dxWindow = item.type === 'boss' ? 110 : 70;
        if (Math.abs(item.x - player.x) < dxWindow && dy > 0 && dy < dyWindow) {
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
        if (
            behind < -10 ||
            behind >= bestDist ||
            Math.abs(item.y - player.y) >= 70 ||
            Math.abs(item.vy || 0) >= 150
        ) {
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
    const target = duelTarget(player, dir, snap, 450);
    if (target == null) {
        return false;
    }
    // A nearer chaser behind preempts the ahead fixation: standing
    // here dies to the heels while dueling the far lane (L14 death 2).
    const rear = chaserBehind(player, dir, snap);
    if (rear != null && (player.x - rear.x) * dir < (target.x - player.x) * dir) {
        return false;
    }
    if (duelGate(target, player, snap, state) == null) {
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
    const chaser = chaserBehind(player, dir, snap);
    if (chaser == null || devilAhead(player, dir, snap, 100) != null) {
        return false;
    }
    // Level bolts only: an off-line chaser (leaping over, pacing
    // another deck) eats held fire forever while converging past the
    // bolt line — run instead of standing (L14 stall, death 3).
    if (Math.abs(chaser.y - player.y) >= 30) {
        return false;
    }
    const rear = duelGate(chaser, player, snap, state);
    if (!rear) {
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

// True when a patrol (never a dueling boarder) closes on the pilot:
// those relocate during long low-g flights, so hops wait for the
// opening instead of landing on them.
function patrolClosing(player, snap, state, blocker) {
    if (!blocker || !blocker.id || blocker.type === 'boarder') {
        return false;
    }
    if ((snap.bombs || []).indexOf(blocker) !== -1) {
        return false;
    }
    if (state.threatPrev[blocker.id] == null) {
        threatVelocity(blocker, snap, state);
        return true;
    }
    const v = threatVelocity(blocker, snap, state);
    return (player.x - blocker.x) * v.vx > 0;
}

// Leap over small hazards with runway, or hold too close to clear
// and let patrols pass. Closing patrols hold the hop (they relocate
// under the arc) and back off when crowded. True when it handles the
// tick (airborne and close falls through to the descent steering).
// True when a running hop from dist px out apexes over an overhead
// blocker: rise at the crossing must top the blocker's crown. A
// too-close takeoff rises into its body instead (L14 death 1: 62px
// out, 132px up — the arc pierces the patrol).
function hopClearsOverhead(player, blocker, snap, dist) {
    const gravity =
        snap.physics && Number.isFinite(snap.physics.gravityY) ? snap.physics.gravityY : 400;
    if (!(gravity > 0)) {
        return false;
    }
    const t = dist / 160;
    const rise = 330 * t - (gravity / 2) * t * t;
    if (!(rise > 0)) {
        return false;
    }
    const halfH = (blocker.h || 30) / 2;
    return player.y + 22 - rise < blocker.y - halfH - 10;
}

function applyHopLeap(input, player, dx, dist, snap, state, blocker, platforms) {
    // Overhead floater (a drone crossing the takeoff): a standing hop
    // rises straight into it, so back up for a running hop-over
    // instead — running hops clear over the top. Closing patrols back
    // out as before; without runway footing, hold for it to pass.
    if (player.grounded && blocker.type !== 'bomb' && dist < 130) {
        const dy = blocker.y - player.y;
        if (dy < -10 && dy > -200) {
            if (dist < 120 && patrolClosing(player, snap, state, blocker)) {
                input.left = player.x < blocker.x;
                input.right = player.x > blocker.x;
                return true;
            }
            if (Math.abs(player.vx || 0) > 100 && dist >= 35) {
                if (hopClearsOverhead(player, blocker, snap, dist)) {
                    input.right = dx > 10;
                    input.left = dx < -10;
                    input.jump = true;
                    return true;
                }
                // Too close to apex over it: stop and let the patrol
                // pass instead of hopping into its body (L14 death 1).
                input.left = false;
                input.right = false;
                return true;
            }
            if (Math.abs(player.vx || 0) > 100) {
                input.left = false;
                input.right = false;
                return true;
            }
            const back = blocker.x >= player.x ? -1 : 1;
            if (supportAt(player.x + back * 56, player.y + 6, platforms)) {
                input.left = back < 0;
                input.right = back > 0;
                return true;
            }
            return true;
        }
    }
    if (dist > 45) {
        if (player.grounded && dist < 120 && patrolClosing(player, snap, state, blocker)) {
            return true;
        }
        if (!player.grounded) {
            // Airborne: veer off. Steering toward only lines up a leap
            // that never comes (no takeoff), abandoning the arc — a
            // bomb near the drop hijacks the steering into the pit.
            input.left = dx > 10;
            input.right = dx < -10;
            return true;
        }
        input.right = dx > 10;
        input.left = dx < -10;
        input.jump = player.grounded;
        return true;
    }
    if (!player.grounded) {
        return false;
    }
    if (patrolClosing(player, snap, state, blocker)) {
        // Crowded by a closing patrol: back out of its span for a
        // runway instead of standing in it.
        const away = blocker.x > player.x ? -1 : 1;
        if (supportAt(player.x + away * 56, player.y + 6, platforms)) {
            input.left = away < 0;
            input.right = away > 0;
        }
    }
    return true;
}

// A boarder already under fire may still die first, so only wait
// those out; anything else squatting on the landing holds the leap.
// Chasers are never waited: they come to the leaper, so waiting only
// cedes the meeting point (L15 trace). True when it waits out the tick.
function applyLandingWait(player, dir, gap, landing, snap, state, shooting, laneDist) {
    if (!gap || !player.grounded) {
        return false;
    }
    const squatter = landingThreat(dir, landing, snap, state);
    if (!squatter || squatter.chasing === true) {
        return false;
    }
    return Boolean(!(squatter.type === 'boarder' && shooting && laneDist < 400));
}

// Level ground to run onto ahead: the current deck extending past a
// stride, or another level deck within a jump. The high hold only pins
// the pilot when running forward leads nowhere level.
function levelGroundAhead(player, dir, snap, under, platforms) {
    if (under) {
        const edge = dir > 0 ? under.right : under.left;
        if ((edge - player.x) * dir > 60) {
            return true;
        }
    }
    const { range } = jumpBallistics(snap);
    for (let i = 0; i < platforms.length; i++) {
        const plat = platforms[i];
        if (sameDeck(plat, under)) {
            continue;
        }
        if (plat.top < player.y - 100 || plat.top > player.y + 100) {
            continue;
        }
        const near = dir > 0 ? plat.left : plat.right;
        const dist = (near - player.x) * dir;
        if (dist > 0 && dist < range + 100) {
            return true;
        }
    }
    return false;
}

// Perched over a far drop with no spring in reach: stay put so the
// run-off does not become a suicide leap. True when it holds the tick.
// Flat routes keep running when level ground continues ahead, even with
// a high platform nearby (stepUp/grabCrown engage it when close).
function applyHighHold(input, player, dir, snap, under, landing, platforms) {
    if (!under || !landing || under.top - landing.top <= 200 || !player.grounded) {
        return false;
    }
    if (levelGroundAhead(player, dir, snap, under, platforms)) {
        return false;
    }
    return true;
}

// Bombs rain from above: sidestep on solid ground, never into a gap.
// Cosmic-ray columns freeze the whole move. True when it handles the tick.
function applyAmbushHolds(input, player, dir, snap, platforms, under) {
    const riding = under != null && under.type === 'moving_platform';
    // A ray column on top of the pilot evacuates first: freezing beside
    // the strike (or riding through it) touches the bolt edge. Riders
    // skip the sidestep (it walks off the lift edge) for the emergency
    // dismount downstream instead.
    const evac = riding ? 0 : rayEvacuate(player, snap);
    if (evac !== 0) {
        input.left = evac < 0;
        input.right = evac > 0;
        // Evacuating a fall with fuel and no landing: double out of
        // the plane instead of dropping through it.
        if (
            !player.grounded &&
            player.vy > 28 &&
            snap.jumpCount < snap.maxJumps &&
            touchdownDeck(player, snap, platforms) == null
        ) {
            input.jump = true;
        }
        return true;
    }
    const dodge = bombDodge(player, snap);
    if (dodge !== 0) {
        // Grounded sidesteps need footing (never into a gap); mid-air
        // velocity sets instantly, so dodge unconditionally.
        if (player.grounded && !supportAt(player.x + dodge * 56, player.y + 6, platforms)) {
            return columnAhead(player.x, player.y, dir, snap, riding);
        }
        input.left = dodge < 0;
        input.right = dodge > 0;
        return true;
    }
    // A falling pilot with a drone inside the contact box: steer clear
    // of it before any hold or brake freezes the move — holds land the
    // pilot on the patrol line. Rising and apex-hovering arcs hold
    // their line (takeoffs and doubles are committed — veering mid-rise
    // abandons the landing), and grounded pilots keep the mount-delay
    // and hop-leap handlers (running under patrols beats sidestepping
    // into gaps).
    const drone = player.grounded || player.vy < 28 ? 0 : droneDodge(player, snap);
    if (drone !== 0) {
        input.left = drone < 0;
        input.right = drone > 0;
        return true;
    }
    // Warning column ahead: hold outside it (hover if airborne).
    // Riders never hold into the strike (the dismount leaps instead).
    if (columnAhead(player.x, player.y, dir, snap, riding)) {
        // Falling before the plane with fuel and no landing: holding
        // drops into the killzone, so double back out instead.
        if (
            !riding &&
            !player.grounded &&
            snap.jumpCount < snap.maxJumps &&
            touchdownDeck(player, snap, platforms) == null
        ) {
            const colX = nearestColumnX(player.x, player.y, dir, snap);
            if (colX != null) {
                input.left = colX > player.x;
                input.right = colX < player.x;
                input.jump = player.vy > 28;
                return true;
            }
        }
        return true;
    }
    return false;
}

// Nearest warning column / tall strike in the approach lane, or null.
function nearestColumnX(px, py, dir, snap) {
    let bestX = null;
    let bestDist = 82;
    const columns = snap.columns || [];
    for (let i = 0; i < columns.length; i++) {
        const dx = (columns[i].x - px) * dir;
        if (dx > 6 && dx < bestDist) {
            bestDist = dx;
            bestX = columns[i].x;
        }
    }
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!tallColumnHazard(item)) {
            continue;
        }
        const dx = (item.x - px) * dir;
        if (dx > 6 && dx < bestDist && columnOverlapY(py, item, 8)) {
            bestDist = dx;
            bestX = item.x;
        }
    }
    return bestX;
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
// Spent fuel over a threat column: steer away — but never off the
// deck. Past the edge, brake toward its middle instead and let the
// grounded kit fight the landing; over the void, fly for distance.
// Band-free: high falls must see the deck from altitude.
function noFuelColumnSteer(player, below, snap) {
    const away = below.x >= player.x ? -1 : 1;
    const decks = snap.platforms || [];
    const feet = player.y + 18;
    const under = (x) =>
        decks.some((plat) => x >= plat.left - 30 && x <= plat.right + 30 && plat.top > feet);
    if (!under(player.x) || under(player.x + away * 60)) {
        return { left: away < 0, right: away > 0, jump: false };
    }
    const deck = decks.find(
        (plat) => player.x >= plat.left - 30 && player.x <= plat.right + 30 && plat.top > feet
    );
    const middle = (deck.left + deck.right) / 2;
    const centerDir = middle >= player.x ? 1 : -1;
    return { left: centerDir < 0, right: centerDir > 0, jump: false };
}

function descentEscape(player, snap, falling, state, dx) {
    if (player.grounded) {
        return null;
    }
    const dir = dx === 0 ? 1 : Math.sign(dx);
    const at = Number.isFinite(snap.elapsedMs) ? snap.elapsedMs : 0;
    const below = boarderBelow(player, snap);
    if (!below) {
        // Above the falling gate on purpose: the spent double rises for
        // a full second, and course-steering that rise carries past the
        // deck behind before the homing ever engages. With fuel (or
        // disarmed) the flight returns null and the rise continues
        // untouched. A threat in the column preempts the flight: it
        // steers for the deck blind, and a deck with a chaser under it
        // is a landing on the chaser.
        const flight = doubleBackFlight(player, dir, snap, state, at);
        if (flight) {
            return flight;
        }
        return null;
    }
    if (!falling) {
        return null;
    }
    if (snap.jumpCount >= snap.maxJumps || state.lastJump) {
        return noFuelColumnSteer(player, below, snap);
    }
    if (below.type === 'boss') {
        return descentBossMove(player, below, snap);
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
    // Crowded touchdown with a survivable hop: take it, away from
    // the threat — hopping along the goal sails into pits and shadows.
    if (hopTouchdownClear(player, snap, below)) {
        const away = below.x >= player.x ? -1 : 1;
        return { left: away < 0, right: away > 0, jump: true };
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
function hopTouchdownClear(player, snap, below) {
    const deck = landingBelow(player, snap.platforms || [], snap);
    if (!deck) {
        return true;
    }
    const gravity =
        snap.physics && Number.isFinite(snap.physics.gravityY) ? snap.physics.gravityY : 400;
    if (!(gravity > 0)) {
        return true;
    }
    const dir = below.x >= player.x ? -1 : 1;
    const boots = player.y + 22;
    const riseT = 330 / gravity;
    const apexBoots = boots - (330 * 330) / (2 * gravity);
    const fall = Math.max(0, deck.top - apexBoots);
    const t = riseT + Math.sqrt(2 * gravity * fall) / gravity;
    if (!Number.isFinite(t)) {
        return true;
    }
    const tx = player.x + dir * 160 * t;
    // The hop may sail past this deck onto the next: any deck catching
    // tx near the arc height lands it (deck tops within a jump of each
    // other shift tx by under 15px).
    const platforms = snap.platforms || [];
    let landing = null;
    if (tx >= deck.left - 30 && tx <= deck.right + 30) {
        landing = deck;
    } else {
        for (let i = 0; i < platforms.length; i++) {
            const plat = platforms[i];
            if (tx < plat.left - 30 || tx > plat.right + 30) {
                continue;
            }
            if (Math.abs(plat.top - deck.top) > 100) {
                continue;
            }
            if (Number.isFinite(snap.killZoneY) && plat.top > snap.killZoneY - 100) {
                continue;
            }
            landing = plat;
            break;
        }
    }
    if (!landing) {
        return false;
    }
    // A tracking chaser shadows ballistics: any deck outruns it (it must
    // re-approach after the landing). Only one sprinting away from the
    // touchdown trusts the coast projection instead.
    if (below.chasing) {
        const pvx = below.vx || 0;
        const openingFast = (tx - below.x) * pvx < 0 && Math.abs(pvx) > 100;
        if (!openingFast) {
            return true;
        }
    }
    const chaserTx = below.x + (below.vx || 0) * t;
    return Math.abs(chaserTx - tx) > 40;
}

// True when the touchdown point is clear of the below boarder:
// both coast ballistically to the deck landing and end up separated.
// A tracking chaser shadows the descent, so only one sprinting away
// from the touchdown (opening fast) counts as clear.
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
    if (below.chasing) {
        const pvx = below.vx || 0;
        const openingFast = (tx - below.x) * pvx < 0 && Math.abs(pvx) > 100;
        if (!openingFast) {
            return false;
        }
    }
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

// Applies the takeoff hold; true when it handles the tick. Two
// committed takeoffs trade mid-air and must wait: a grounded
// gap-edge jump into a converging chase-dive (the leap meets the
// diver where bolts never reach — L14 x=6500 loop), and any grounded
// jump whose rise column holds a drone the arc can reach (L14
// chain-deck kills at x=9120). Divers land or pass and drones
// patrol on within a second; grounded runners stay exempt so wave
// triggers still release on approach.
function applyTakeoffHold(input, player, dir, snap, gap) {
    if (!player.grounded) {
        return false;
    }
    const { rise } = jumpBallistics(snap);
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || !item.active || item.enable === false) {
            continue;
        }
        const ahead = (item.x - player.x) * dir;
        const dy = item.y - player.y;
        if (item.type === 'boarder') {
            if (
                gap &&
                item.chasing === true &&
                Math.abs(item.vy || 0) > 80 &&
                ahead > 8 &&
                ahead < 350 &&
                dy > -250 &&
                dy < 60
            ) {
                input.left = false;
                input.right = false;
                input.jump = false;
                return true;
            }
        } else if (item.type === 'drone') {
            const halfH = (item.h || 30) / 2;
            if (ahead > -10 && ahead < 70 && dy < -10 && rise > -dy - halfH - 6) {
                // At a gap edge the takeoff waits for the patrol to
                // pass; on flat ground run under it (the rise is the
                // threat, not the position).
                input.left = !gap && dir < 0;
                input.right = !gap && dir > 0;
                input.jump = false;
                return true;
            }
        }
    }
    return false;
}

// True when the descent meets a head-on chaser over landable deck:
// brake and land short so the grounded duel kills it. (The blocker
// scan caps the range at 70px; 40px is too late to stop.)
// Head-on with a live boarder while engaging: brake the descent and
// land short (the grounded duel kills it), brake the rise and duel
// aligned, or gun it down advancing. Flying the descent collides
// with it at the touchdown; rising into it ends under its leap.
function applyHeadOnDuel(input, player, dir, dx, snap, falling, blocker) {
    // Rising head-on into an aggressive chaser: brake (hold position,
    // keep facing it) and hold fire while misaligned — bolts fly flat,
    // so firing early wastes the cooldown; the aligned crossing kills
    // outright, and the grounded duel below finishes anything that
    // lands. Falling flights keep the brake-or-fly rule below (over a
    // pit with no landing, flying past beats hovering into it), and
    // dormant boarders still advance (shot on sight).
    if (
        !player.grounded &&
        !falling &&
        (blocker.x - player.x) * dir > 8 &&
        (blocker.chasing === true || (blocker.vx || 0) * dir < -50)
    ) {
        input.left = false;
        input.right = false;
        if (Math.abs(blocker.y - player.y) >= 30) {
            input.shoot = false;
        }
        return;
    }
    if (!player.grounded && falling && brakeForChaser(player, dir, blocker, snap)) {
        return;
    }
    // Gun it down first; jumping in just trades.
    input.right = dx > 10;
    input.left = dx < -10;
}

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
        // Touchdown zone: boots within 12px above the deck are landing,
        // not falling past it — doubling here bounces off every landing
        // into a hover loop instead of touching down.
        if (plat.top >= boots - 12 && plat.top < player.y + 260) {
            if (snap != null && deckInUnsafeBeam(plat, snap)) {
                continue;
            }
            return plat;
        }
    }
    return null;
}

// Projected touchdown deck, or null: the first deck below whose top
// the ballistic arc reaches while over it. landingBelow answers
// "deck underfoot" for grounded strides; this answers "will this
// flight land" for the double decision (a deck 8px behind the boots
// with 160px/s of away-speed is not a landing, but a touchdown 24px
// past the edge still clips down). Same 260px look-down as
// landingBelow: a deck further below is recovered to, not landed on.
function touchdownDeck(player, snap, platforms) {
    const boots = player.y + 22;
    const gravity = snap.physics?.gravityY ?? 300;
    const vx = player.vx || 0;
    for (let i = 0; i < platforms.length; i++) {
        const plat = platforms[i];
        if (plat.top < boots - 12 || plat.top > player.y + 260) {
            continue;
        }
        const t = fallTimeTo(player.y, player.vy, gravity, plat.top);
        if (t == null || t > 4) {
            continue;
        }
        const tx = player.x + vx * t;
        if (tx > plat.left - 30 && tx < plat.right + 30) {
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
        if (!item || item.type !== 'laser' || !item.active || item.enable === false) {
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
    const nearEdge = Math.min(player.x - left, right - player.x);
    const exitMs = (nearEdge / 160) * 1000 + 400;
    if (cooling && windowMs > exitMs + 600) {
        return null;
    }
    // Shallow exits step out and land; only deep ones spend the double
    // to extend past the span.
    if (nearEdge <= 60) {
        return player.x - left < right - player.x ? 'L' : 'R';
    }
    return player.x - left < right - player.x ? 'left' : 'right';
}

// One beam's constraint: 'hold' outside an unsafe span, 'left'/'right'
// to rush out of a closing one, 'leap' to jump clean over it, null when
// it does not constrain. Airborne pilots test a wider span: descents
// must steer out before they are over the beam, not after.
// True when the beam cools with a known window covering the crossing.
function laserWindowCovers(item, spanWidth) {
    if (item.phase !== 'cooldown' || !Number.isFinite(item.timeUntilPhaseChangeMs)) {
        return false;
    }
    return item.timeUntilPhaseChangeMs >= (spanWidth / 160) * 1000 + 350;
}

// Beam proximity reach: grounded pilots run to the edge in any phase
// (safe outside the span) and only the entry is window-gated — a
// window that covers the span can still expire on a 140px approach.
// Airborne pilots keep the wide gate: with no brakes the veer-off
// must start early to land short.
function laserReach(player) {
    return player.grounded ? 30 : 140;
}

// True when the current ballistic arc geometrically clears the REAL
// (unpadded) beam rect. A hopper near a beam sits inside the padded
// span for the whole jump, and the pad rush-out (back out the near
// edge) aborts every hop — the L14 chain-deck loop. An arc that
// clears the rect is safe in any phase, so the span check holds its
// line; anything else falls through to the rush/veer below.
// Release-speed projection: clearing hands the tick to the patrol /
// hop logic, which drives the travel direction at run speed — so a
// weak or opposing vx projects at run speed instead of the momentary
// strafe (which would always "pierce" by stalling under the span).
function beamArcClears(player, item, snap, dir) {
    const halfW = (item.w || 0) / 2;
    const halfH = (item.h || 0) / 2;
    const realLeft = (item.left ?? item.x - halfW) - 14;
    const realRight = (item.right ?? item.x + halfW) + 14;
    const realTop = item.top ?? item.y - halfH;
    const gravity =
        snap.physics && Number.isFinite(snap.physics.gravityY) ? snap.physics.gravityY : 400;
    if (!Number.isFinite(gravity) || gravity < 0) {
        return false;
    }
    const vx = Number.isFinite(player.vx) ? player.vx : 0;
    const approach = vx * dir > 40 ? vx : dir * 160;
    const vy = Number.isFinite(player.vy) ? player.vy : 0;
    let tEnter;
    let tExit;
    if (approach > 0) {
        if (player.x > realRight) {
            return true;
        }
        tEnter = Math.max(0, (realLeft - player.x) / approach);
        tExit = (realRight - player.x) / approach;
    } else {
        if (player.x < realLeft) {
            return true;
        }
        tEnter = Math.max(0, (realRight - player.x) / approach);
        tExit = (realLeft - player.x) / approach;
    }
    if (tExit < 0 || tEnter > 2) {
        return true;
    }
    const feet = player.y + 22;
    const heightAt = (t) => feet + vy * t + (gravity / 2) * t * t;
    const endA = heightAt(Math.min(tEnter, 2));
    const endB = heightAt(Math.min(tExit, 2));
    const hi = Math.max(endA, endB);
    // Clear only over the crown. Under-passes stay gated: every
    // level's beams are vertical deck-sitters, so below the base is
    // inside the deck, and falling arcs keep their rush-out.
    return hi <= realTop - 4;
}

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
    if (!player.grounded && beamArcClears(player, item, snap, dir)) {
        return null;
    }
    const dormant = !item.active || item.enable === false;
    const inside = player.x > left && player.x < right;
    const edge = dir > 0 ? left - player.x : player.x - right;
    // Far dormant spans do not exist yet (their cooldown rest used to
    // phantom-leap from kilometers away), but near ones arm on
    // proximity — leap over (or hold out of) them, never stroll in.
    if (dormant && !inside && (edge < 0 || edge > laserReach(player))) {
        return null;
    }
    // A known window that covers the crossing runs through, even over
    // leapable spans: leaping a narrow cooling beam launches a 350px
    // flight over whatever waits past it (like L11's wardens), while
    // the grounded duel underneath kills it instead. Dormant timers
    // are not windows (release fires instantly), so never run through.
    if (!dormant && laserWindowCovers(item, right - left)) {
        return null;
    }
    // Distance gate before the leap: a live beam across the level must
    // not phantom-leap or phantom-hold either.
    if (!inside && (edge < 0 || edge > laserReach(player))) {
        return null;
    }
    return laserEntryMove(player, dir, item, snap, right - left, inside, left, right);
}

// Solid deck under the veer target (80px back) and outside the
// lane/span: the veer-off lands on it instead of sailing into the
// pit past it. Target-based, not deck-center-based — a deck whose
// middle sits under a firing beam still catches a veer onto its
// safe end. Fuel-blind: landing short saves the double for gaps.
function veerLanding(player, dir, snap, avoidLeft, avoidRight) {
    const tx = player.x - dir * 80;
    if (tx > avoidLeft - 10 && tx < avoidRight + 10) {
        return false;
    }
    const boots = player.y + 22;
    const decks = snap.platforms || [];
    for (let i = 0; i < decks.length; i++) {
        const deck = decks[i];
        if (tx < deck.left - 30 || tx > deck.right + 30) {
            continue;
        }
        if (deck.top > boots && deck.top < player.y + 260) {
            return true;
        }
    }
    return false;
}

// Beam entry resolution once proximity is established. Inside with a
// deck below, rush out on foot (0.2s beats a 1s leap up through the
// band); inside over a pit, leap out, running cannot. Outside over
// deck, floor beams wait for the window and run through — leaping a
// floor beam launches a risky flight for no reason. Outside over a
// pit (gap beams), leapable arcs fly over.
function laserEntryMove(player, dir, item, snap, spanWidth, inside, left, right) {
    const cooling = item.phase === 'cooldown';
    const dormant = !item.active || item.enable === false;
    const platforms = snap.platforms || [];
    if (inside) {
        if (landingBelow(player, platforms, snap) == null) {
            return 'leap';
        }
        let windowMs = cooling ? 10000 : 0;
        if (Number.isFinite(item.timeUntilPhaseChangeMs)) {
            windowMs = item.timeUntilPhaseChangeMs;
        }
        return laserInsideMove(player, left, right, cooling, windowMs);
    }
    const spanDeck = supportAt((left + right) / 2, player.y + 6, platforms) != null;
    if (!dormant && spanDeck) {
        let windowMs = cooling ? 10000 : 0;
        if (Number.isFinite(item.timeUntilPhaseChangeMs)) {
            windowMs = item.timeUntilPhaseChangeMs;
        }
        const crossMs = (spanWidth / 160) * 1000 + 350;
        if (cooling && windowMs >= crossMs) {
            return null;
        }
        if (player.grounded) {
            return 'hold';
        }
        return veerLanding(player, dir, snap, left, right) ? (dir > 0 ? 'L' : 'R') : null;
    }
    if (beamLeapable(player, item, spanWidth, snap, dir)) {
        return laserLeapMove(player, left, right, cooling);
    }
    // Too close to arc over the crown: the low arc transits the band,
    // so leap only on a dark window verified to cover the transit —
    // leaping into a phase flip dies. Otherwise hold for the next
    // dark (grounded) or veer out (airborne).
    if (cooling && laserTransitCovers(item, spanWidth)) {
        return laserLeapMove(player, left, right, cooling);
    }
    if (player.grounded) {
        return 'hold';
    }
    return veerLanding(player, dir, snap, left, right) ? (dir > 0 ? 'L' : 'R') : null;
}

// True when a takeoff arc clears the beam crown before entering the
// span: projects the takeoff (run speed, jump velocity) against the
// real beam rect. The old apex/range check passed takeoffs 45px out
// whose arc enters the span still below the crown (L14 death 2).
function beamLeapable(player, item, spanWidth, snap, dir) {
    const { range } = jumpBallistics(snap);
    if (!(range > spanWidth)) {
        return false;
    }
    const takeoff = dir || (snap.crown && snap.crown.x < player.x ? -1 : 1);
    const vx = takeoff * 160;
    return beamArcClears({ x: player.x, y: player.y, vx, vy: -330 }, item, snap, takeoff);
}

// True when the dark window covers a low transit through the span:
// a too-close leap survives only while the beam stays dark.
function laserTransitCovers(item, spanWidth) {
    if (!Number.isFinite(item.timeUntilPhaseChangeMs)) {
        return false;
    }
    return item.timeUntilPhaseChangeMs >= (spanWidth / 160) * 1000 + 300;
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

// A committed leap arc holds its line: the arc was verified clear at
// takeoff, so mid-air veers and rushes that would drag the flight
// back to the span edge are suppressed until the pilot lands, flies
// past the beam zone, or the arc times out. True when committing.
function beamLeapCommit(input, player, dir, snap, state) {
    const leap = state.beamLeap;
    if (!leap || player.grounded || leap.dir !== dir) {
        state.beamLeap = null;
        return false;
    }
    const now = Number.isFinite(snap.elapsedMs) ? snap.elapsedMs : 0;
    if (now > leap.untilMs || (player.x - leap.fromX) * dir >= 200) {
        state.beamLeap = null;
        return false;
    }
    input.left = dir < 0;
    input.right = dir > 0;
    return true;
}

// Applies the beam constraint to the input; true when it handles the tick.
function applyLaserMove(input, player, dir, snap, state) {
    if (beamLeapCommit(input, player, dir, snap, state)) {
        return true;
    }
    const laser = laserMove(player, dir, snap);
    if (laser === 'hold') {
        return true;
    }
    if (laser == null) {
        return false;
    }
    if (laser === 'leap') {
        const now = Number.isFinite(snap.elapsedMs) ? snap.elapsedMs : 0;
        state.beamLeap = { fromX: player.x, dir, untilMs: now + 1500 };
        input.left = dir < 0;
        input.right = dir > 0;
        input.jump = true;
        return true;
    }
    if (laser === 'L' || laser === 'R') {
        // Shallow step-out (or veer onto a short landing): move, never
        // double — doubling here bounces off every touchdown instead.
        input.left = laser === 'L';
        input.right = laser === 'R';
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
    // No brakes mid-air: veer off onto a deck already underfoot,
    // commit to the crossing past open gap (the over-double lifts the
    // arc clear). Fuel-blind: landing short saves the double for gaps.
    if (!veerLanding(player, dir, snap, left, right)) {
        return null;
    }
    return dir > 0 ? 'left' : 'right';
}

// Airborne arc crossing a piston lane: double over it when the piston
// sits below the boots (the rise lifts away with margin). A piston in
// the rise path holds the double — leaping into it is certain doom,
// while waiting may still clear as it slams.
function crusherOverDouble(player, dir, snap) {
    if (player.grounded || player.vy < -100) {
        return false;
    }
    if (snap.jumpCount >= snap.maxJumps) {
        return false;
    }
    const boots = player.y + 22;
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || item.type !== 'crusher' || !item.active || item.enable === false) {
            continue;
        }
        const ahead = (item.x - player.x) * dir;
        // Late window only: doubling from 260px out lands in the NEXT
        // lane (L11's pistons sit 200px apart). Firing inside 170px
        // sails past it onto clear deck instead.
        if (ahead < -40 || ahead > 170) {
            continue;
        }
        const top = item.top != null ? item.top : item.y - (item.h || 40) / 2;
        if (top > boots + 10) {
            return true;
        }
    }
    return false;
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

// Lift velocity across ticks, px/s: lifts ride tweens, which never set
// body velocity, so track x/y over snap.elapsedMs. Zero on first sight.
function liftVelocity(item, snap, state) {
    const t = Number.isFinite(snap.elapsedMs) ? snap.elapsedMs : 0;
    const prev = state.liftPrev[item.id];
    const v =
        prev && t > prev.t
            ? {
                  vx: ((item.x - prev.x) / (t - prev.t)) * 1000,
                  vy: ((item.y - prev.y) / (t - prev.t)) * 1000,
              }
            : { vx: 0, vy: 0 };
    state.liftPrev[item.id] = { x: item.x, y: item.y, t };
    return v;
}

// True when the lift can be boarded by walking: level with the boots
// and adjacent (no pit between the deck edge and the lift).
function liftWalkable(player, dir, under, lift) {
    if (Math.abs(lift.top - (player.y + 22)) > 14) {
        return false;
    }
    const myEdge = dir > 0 ? under.right : under.left;
    const liftEdge = dir > 0 ? lift.left : lift.right;
    return (liftEdge - myEdge) * dir < 30;
}

// True when the boots sit inside the lift's vertical stroke (from its
// origin/target endpoints): a walk-on window will come around.
function liftLevelInStroke(player, lift) {
    const boots = player.y + 22;
    const half = (lift.h || 24) / 2;
    const tops = [lift.top];
    if (lift.origin && Number.isFinite(lift.origin.y)) {
        tops.push(lift.origin.y - half);
    }
    if (lift.target && Number.isFinite(lift.target.y)) {
        tops.push(lift.target.y - half);
    }
    const lo = Math.min.apply(null, tops) - 14;
    const hi = Math.max.apply(null, tops) + 14;
    return boots >= lo && boots <= hi;
}

// Lift boarding decision: 'run' (walk on now), 'jump' (apex takeoff
// True while a fight forbids slow lift transit: an awake boss, or a
// chaser closing within 400px. Boarding strands the rider for the
// rise while the threat sprints in (L15 trace).
function liftTransitPressure(player, snap) {
    const boss = liveBoss(snap);
    if (boss && boss.phase !== 'dormant') {
        return true;
    }
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || item.type !== 'boarder' || item.chasing !== true) {
            continue;
        }
        if (!item.active || item.enable === false) {
            continue;
        }
        if (Math.abs(item.x - player.x) < 400 && Math.abs(item.y - player.y) < 300) {
            return true;
        }
    }
    return false;
}

// window open, phase open), 'wait' (in position, phase closed), 'back'
// (too close for the arc and no walk-on coming: back up to the window),
// false (no lift business). Full jumps cannot land short on a lift, so
// boarding jumps apex OVER the lift and the descent drops onto it.
function liftBoarding(player, dir, snap, under, landing, state) {
    if (!player.grounded || under == null || landing == null) {
        return false;
    }
    if (landing.type !== 'moving_platform' || under.type === 'moving_platform') {
        return false;
    }
    // No slow transit under pressure: boarding a low lift strands the
    // rider for the whole rise while a live fight closes in (L15
    // trace: 2.4s ride + veto vs a 2.3s summon sprint = death on the
    // lift). Jump the gap on foot instead; the lift serves peace.
    if (liftTransitPressure(player, snap)) {
        return false;
    }
    if (sameDeck(under, landing)) {
        return false;
    }
    const liftCx = (landing.left + landing.right) / 2;
    if ((liftCx - player.x) * dir <= 0) {
        return false;
    }
    if (liftWalkable(player, dir, under, landing)) {
        return 'run';
    }
    const gravity =
        snap.physics && Number.isFinite(snap.physics.gravityY) ? snap.physics.gravityY : 400;
    if (!(gravity > 0)) {
        return false;
    }
    const riseRun = (160 * 330) / gravity;
    const rise = Math.min(260, (330 * 330) / (2 * gravity));
    const apexX = player.x + dir * riseRun;
    const apexBoots = player.y + 22 - rise;
    const pastWindow = (apexX - liftCx) * dir > 60;
    // Short side matches the drop glide (~120px): a further apex falls
    // short of the deck and burns the double on the recovery.
    const inWindow = !pastWindow && (liftCx - apexX) * dir < 100;
    const v = liftVelocity(landing, snap, state);
    const phaseOpen = apexBoots < landing.top + 60 && v.vy > -40;
    if (inWindow) {
        return phaseOpen ? 'jump' : 'wait';
    }
    if (pastWindow) {
        return liftLevelInStroke(player, landing) ? 'wait' : 'back';
    }
    return false;
}

// Airborne lift to drop onto, as a steer target ({x}), or null: a lift
// below within catch range. Centered drops return the player's own x so
// horizontal dies and the fall goes straight down onto the deck.
// Rescue aim for a spent-fuel descent over nothing landable: the
// nearest static deck in the fall window, steered by touchdown
// projection (the game sets horizontal velocity directly, so the
// controller brakes with hover-drops and re-evaluates every tick).
// Low-gravity flights overshoot every deck at full run speed; braking
// onto a deck resets the fuel instead of sailing into the next gap.
// Falling only: engaging mid-rise anchors the flight onto the takeoff
// deck into a vertical pogo. Decks under a live crusher lane are
// skipped, as are decks with no clear touchdown.
function deckDropTarget(player, dir, snap) {
    const boots = player.y + 22;
    const gravity = snap.physics?.gravityY ?? 300;
    let best = null;
    let bestScore = Infinity;
    let bestT = 0;
    const platforms = snap.platforms || [];
    for (let i = 0; i < platforms.length; i++) {
        const plat = platforms[i];
        if (!plat || plat.type === 'moving_platform') {
            continue;
        }
        if (plat.top < boots - 120 || plat.top > boots + 420) {
            continue;
        }
        const cx = (plat.left + plat.right) / 2;
        if (Math.abs(cx - player.x) > 260) {
            continue;
        }
        if (crusherOverAim(plat, snap)) {
            continue;
        }
        const t = fallTimeTo(player.y, player.vy, gravity, plat.top);
        if (t == null) {
            continue;
        }
        const aim = deckAimX(plat, snap, dir);
        if (aim == null) {
            continue;
        }
        // Beyond horizontal reach: the fall ends before the aim is
        // reached, so fly on (and double) instead of chasing it.
        if (Math.abs(aim - player.x) > 160 * t + 40) {
            continue;
        }
        const behind = (cx - player.x) * dir < 0 ? 40 : 0;
        const score = Math.abs(cx - player.x) + Math.max(0, plat.top - boots) * 0.3 + behind;
        if (score < bestScore) {
            bestScore = score;
            best = plat;
            bestT = t;
        }
    }
    if (!best) {
        return null;
    }
    const aimX = deckAimX(best, snap, dir);
    // Full speed past the aim: hover and let the fall close the
    // distance instead of sailing over the deck.
    if (Math.abs(aimX - player.x) >= 12 && 160 * bestT > Math.abs(aimX - player.x) + 15) {
        return { x: player.x };
    }
    return Math.abs(aimX - player.x) < 12 ? { x: player.x } : { x: aimX };
}

// Seconds until the ballistic arc reaches a deck top arriving from
// above, or null when it never does (rising through from below does
// not count: that landing needs a fall, not a bonk).
function fallTimeTo(y, vy, gravity, top) {
    const disc = vy * vy - 2 * gravity * (y - top);
    if (!(disc >= 0) || !(gravity > 0)) {
        return null;
    }
    const root = Math.sqrt(disc);
    const candidates = [(root - vy) / gravity, (-root - vy) / gravity];
    let best = null;
    for (let i = 0; i < candidates.length; i++) {
        const t = candidates[i];
        if (!(t >= 0) || t > 4 || vy + gravity * t <= 0) {
            continue;
        }
        if (best == null || t < best) {
            best = t;
        }
    }
    return best;
}

// True when a live crusher slams over the deck: landing in its lane
// is death, so the rescue aim skips the deck entirely.
function crusherOverAim(plat, snap) {
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || item.type !== 'crusher' || !item.active || item.enable === false) {
            continue;
        }
        if (item.x > plat.left - 50 && item.x < plat.right + 50) {
            return true;
        }
    }
    return false;
}

// Aim point on a rescue deck: the first touchdown candidate with
// 70px clearance from every live threat — center first (nearest
// self-anchors the flight into a vertical pogo), then the ahead end,
// then the behind end — or null when the whole deck is covered.
function deckAimX(plat, snap, dir) {
    const cx = (plat.left + plat.right) / 2;
    const candidates =
        dir > 0 ? [cx, plat.right - 35, plat.left + 35] : [cx, plat.left + 35, plat.right - 35];
    const hazards = snap.hazards || [];
    for (let c = 0; c < candidates.length; c++) {
        let clear = true;
        for (let i = 0; i < hazards.length; i++) {
            const item = hazards[i];
            if (!item || !item.active || item.enable === false) {
                continue;
            }
            if (
                item.type !== 'rover' &&
                item.type !== 'drone' &&
                item.type !== 'boarder' &&
                item.type !== 'rock' &&
                item.type !== 'roller' &&
                item.type !== 'boulder'
            ) {
                continue;
            }
            if (Math.abs(item.y - plat.top) >= 130) {
                continue;
            }
            if (Math.abs(item.x - candidates[c]) < 70) {
                clear = false;
                break;
            }
        }
        if (clear) {
            return candidates[c];
        }
    }
    return null;
}

// Cruise steering target: the lift drop, the rescue deck, a bonk
// bounce's high landing, or the goal. Returns the rescue target (for
// the double gate) after pointing the input at the winner.
function applyRideSteer(input, player, dir, snap, state, falling, platforms, landing, goal) {
    // Riding a bonk bounce (rises faster than any jump): steer for the
    // high landing instead of the far crown so the bounce converts.
    // Falling over a lift: steer the drop onto its deck instead.
    const riding = !player.grounded && player.vy < -400;
    const dropLift = !player.grounded && falling ? liftDropTarget(player, snap) : null;
    // Spent-fuel descent over nothing landable: brake onto the rescue
    // deck instead of sailing past it at full run speed.
    const dropDeck = rescueDeckTarget(player, dir, snap, state, falling, platforms, dropLift);
    const rideTarget =
        dropLift || dropDeck || (riding && landing && landing.top < player.y ? landing : goal);
    input.right = rideTarget.x - player.x > 10;
    input.left = rideTarget.x - player.x < -10;
    return dropDeck;
}

// Rescue target for a spent-fuel descent, or null when goal steering
// stays: decks below (or a lift drop) keep the routine crossing.
function rescueDeckTarget(player, dir, snap, state, falling, platforms, dropLift) {
    if (player.grounded || snap.jumpCount <= 0 || dropLift || !falling) {
        state.rescueHeld = false;
        return null;
    }
    // Spent-fuel descent from high above, any gravity: brake toward
    // the projected touchdown deck instead of sailing past it at full
    // run speed — a double apex strands normal-gravity flights
    // hundreds of pixels up just like low-g ones.
    if (snap.jumpCount >= snap.maxJumps && touchdownUnsafe(player, snap, platforms)) {
        const deepDeck = deckDropTarget(player, dir, snap);
        if (deepDeck != null) {
            state.rescueHeld = true;
            return deepDeck;
        }
    }
    // Low-gravity flights only: normal arcs are short enough to land
    // themselves at full run speed, while low-g arcs stretch past
    // every deck without arrival control.
    if ((snap.physics?.gravityY ?? 300) >= 250) {
        state.rescueHeld = false;
        return null;
    }
    // Land when must: with no fuel left, a deck in the below column
    // is mandatory — brake to its center instead of sailing past it
    // (there is no double to recover with).
    const mustLand =
        snap.jumpCount >= snap.maxJumps && landingBelow(player, platforms, snap) != null;
    if (!touchdownUnsafe(player, snap, platforms) && !state.rescueHeld && !mustLand) {
        return null;
    }
    const dropDeck = deckDropTarget(player, dir, snap);
    state.rescueHeld = dropDeck != null;
    return dropDeck;
}

// True when the ballistic touchdown misses every deck (or lands on a
// rock): straight-below says "deck" at edges the arc sails past, so
// project the touchdown instead of trusting the column. Routine
// crossings whose touchdown lands mid-deck keep goal steering.
function touchdownUnsafe(player, snap, platforms) {
    const below = landingBelow(player, platforms, snap);
    if (!below) {
        return true;
    }
    const gravity = snap.physics?.gravityY ?? 300;
    const t = fallTimeTo(player.y, player.vy, gravity, below.top);
    if (t == null) {
        return true;
    }
    const tx = player.x + (player.vx || 0) * t;
    if (tx < below.left + 10 || tx > below.right - 10) {
        return true;
    }
    return touchdownBlocked(below, tx, snap);
}

// True when a static lethal sits on the touchdown: rocks never clear,
// so the rescue aim offsets to the far end instead of landing on one.
function touchdownBlocked(below, tx, snap) {
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || !item.active || item.enable === false) {
            continue;
        }
        if (item.type !== 'rock' && item.type !== 'roller' && item.type !== 'boulder') {
            continue;
        }
        if (Math.abs(item.x - tx) < 45 && Math.abs(item.y - below.top) < 80) {
            return true;
        }
    }
    return false;
}

function liftDropTarget(player, snap) {
    const boots = player.y + 22;
    let best = null;
    let bestScore = Infinity;
    const platforms = snap.platforms || [];
    for (let i = 0; i < platforms.length; i++) {
        const plat = platforms[i];
        if (plat.type !== 'moving_platform') {
            continue;
        }
        if (plat.top < boots - 40 || plat.top > boots + 260) {
            continue;
        }
        const cx = (plat.left + plat.right) / 2;
        const dx = Math.abs(cx - player.x);
        if (dx > 130) {
            continue;
        }
        const score = dx + (plat.top - boots) * 0.3;
        if (score < bestScore) {
            bestScore = score;
            best = plat;
        }
    }
    if (!best) {
        return null;
    }
    const cx = (best.left + best.right) / 2;
    return Math.abs(cx - player.x) < 12 ? { x: player.x } : { x: cx };
}

// Nearest static deck ahead within dismount reach (never another lift).
function liftDismountTarget(player, dir, snap) {
    let best = null;
    let bestDist = 320;
    const platforms = snap.platforms || [];
    for (let i = 0; i < platforms.length; i++) {
        const plat = platforms[i];
        if (plat.type === 'moving_platform') {
            continue;
        }
        if (plat.top < player.y - 230 || plat.top > player.y + 120) {
            continue;
        }
        const edge = dir > 0 ? plat.left : plat.right;
        const dist = (edge - player.x) * dir;
        if (dist < -40 || dist > bestDist) {
            continue;
        }
        bestDist = dist;
        best = plat;
    }
    return best;
}

// Tallest bonkable head in the spring runway (within 210px ahead, same
// lane): the bounce target. Longer than the hop-blocker range (70px)
// so the runway back-up can engage — at 70px backing out drops the
// target and pogos on the boundary instead of ever bouncing.
// Deliberate spring use: height-seeking bonkable, canyon-hop bounce,
// or tall face-blocker. Returns { spring, seek, hop } for the runway
// and reflex logic downstream.
function findSpringTarget(player, dir, snap, platforms, landing, crown, gap) {
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
    // Canyon hop only over a true pit (no deck below at all): gap is
    // height-gated, so a deck 100px+ below reads as a gap and the hop
    // would center back onto a passed spring forever instead of flying on.
    const pit = gap && landingBelow(player, platforms, snap) == null;
    const hop = !seek && pit && !landing ? bonkTarget(player, dir, snap, 0, true) : null;
    // A tall bonkable right in the face is a de facto spring even with no
    // height purpose: the only way past is over, and the bonk clears it.
    const tallBlocker = springBonkable(player, dir, snap);
    return { spring: seek || hop || tallBlocker, seek, hop };
}

function springBonkable(player, dir, snap) {
    const hazards = snap.hazards || [];
    let best = null;
    let bestDist = 210;
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || !item.bonkable || !item.active || item.enable === false) {
            continue;
        }
        const ahead = (item.x - player.x) * dir;
        if (ahead < 0 || ahead > bestDist) {
            continue;
        }
        if (!yOverlaps(player.y, item, 18)) {
            continue;
        }
        const top = item.top ?? item.y - (item.h || 44) / 2;
        if (top >= player.y + 22 - 12) {
            continue;
        }
        best = item;
        bestDist = ahead;
    }
    return best;
}

// Spring steering toward a usable bonkable. Grounded takeoffs need a
// runway — jumping from inside 130px rises straight into tall heads.
function applySpringMove(input, player, snap, state, spring, falling, platforms) {
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
            return;
        }
        input.left = dxSeek < 0;
        input.right = dxSeek > 0;
        input.jump = runway <= 210;
        return;
    }
    if (player.y + 22 <= head + 44) {
        // At or above head level: work toward the centered drop.
        if (player.vy < 0 && head < player.y + 22 - 30) {
            // Still rising with the head above the boots: hold off.
            // Centering now would rise straight into the body, and
            // only the falling drop bonks.
            return;
        }
        input.left = dxSeek < -24;
        input.right = dxSeek > 24;
        input.jump =
            falling && Math.abs(dxSeek) > 56 && !state.lastJump && snap.jumpCount < snap.maxJumps;
        return;
    }
    // Airborne below head level: veer off. Rising or drifting into
    // the body from the side is lethal; only the falling drop bonks.
    input.left = dxSeek > 0;
    input.right = dxSeek < 0;
}

// True when the lift's vertical stroke reaches the deck height (from
// its origin/target endpoints): riding up boards level with the deck.
function liftStrokeReaches(lift, top) {
    const half = (lift.h || 24) / 2;
    let minTop = lift.top;
    if (lift.origin && Number.isFinite(lift.origin.y)) {
        minTop = Math.min(minTop, lift.origin.y - half);
    }
    if (lift.target && Number.isFinite(lift.target.y)) {
        minTop = Math.min(minTop, lift.target.y - half);
    }
    return minTop <= top + 10;
}

// Dismount action: 'leap' (deck above, or too far to drift onto),
// 'runoff' (level/below deck in drift range — a leap would overshoot by
// hundreds of pixels at low gravity), null (wait: rising toward an
// above deck, or no dismount). Run-offs never climb: above decks leap.
// Threats a dismount leap clears vertically: patrollers and rollers,
// whose zones never empty. Tall or static killers (devils, beams,
// crushers, rocks) keep holding the ride.
// Ray column threatening a ridden lift ({x, flee} or null): a warning
// or live strike over the span. Flee (leap away) when the strike is
// live or under 400ms out — crossing the plane then dies — otherwise
// leap toward the target, which exits before the strike lands.
function liftColumnThreat(under, snap) {
    const cx = (under.left + under.right) / 2;
    const halfW = (under.right - under.left) / 2 + 30;
    const schedules = snap.hazardSchedules || [];
    for (let i = 0; i < schedules.length; i++) {
        const item = schedules[i];
        if (!item || item.type !== 'cosmic_ray' || Math.abs(item.x - cx) >= halfW) {
            continue;
        }
        if (item.phase === 'active') {
            return { x: item.x, flee: true };
        }
        if (item.phase === 'warning') {
            const soon = Number.isFinite(item.timeUntilPhaseChangeMs)
                ? item.timeUntilPhaseChangeMs < 400
                : false;
            return { x: item.x, flee: soon };
        }
    }
    const columns = snap.columns || [];
    for (let i = 0; i < columns.length; i++) {
        if (Math.abs(columns[i].x - cx) < halfW) {
            return { x: columns[i].x, flee: false };
        }
    }
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || item.type !== 'cosmic_ray' || !item.active || item.enable === false) {
            continue;
        }
        if (Math.abs(item.x - cx) < halfW) {
            return { x: item.x, flee: true };
        }
    }
    return null;
}

function leapOverMover(item) {
    return (
        item.type === 'rover' ||
        item.type === 'drone' ||
        item.type === 'boarder' ||
        item.type === 'roller' ||
        item.type === 'boulder'
    );
}

// A dismount threat worth vetoing: static lethals and clearing movers
// wait out, but chasers never veto — they come to the rider, so
// waiting only cedes the meeting point (L15 trace).
function dismountVetoThreat(threat) {
    if (!threat || threat.chasing === true) {
        return null;
    }
    return threat;
}

function liftDismountAction(player, dir, snap, state, under, target) {
    if (!target) {
        return null;
    }
    const threat = landingThreat(dir, target, snap, state);
    // Emergency: a warning column over the lift fries waiting riders,
    // so dismount at once instead of timing the veto out.
    if (threat) {
        const column = liftColumnThreat(under, snap);
        if (column) {
            return column.flee ? 'flee' : 'leap';
        }
    }
    // Static lethals hold the dismount; clearing movers time out (the
    // patrol-timing tests pin that). But a mover that never clears its
    // zone pins the ride forever, so leap over after 2.5s of veto —
    // jump arcs clear patrollers vertically, then the flight continues
    // past the deck.
    const vetoable = dismountVetoThreat(threat);
    if (vetoable && !leapOverMover(vetoable)) {
        return null;
    }
    if (!vetoable) {
        state.dismountVetoId = null;
    }
    if (Math.abs(under.top - target.top) >= 70) {
        return null;
    }
    if (vetoable) {
        const key = threat.id ?? `${threat.type}@${Math.round(threat.x)}`;
        const now = Number.isFinite(snap.elapsedMs) ? snap.elapsedMs : 0;
        if (state.dismountVetoId !== key) {
            state.dismountVetoId = key;
            state.dismountVetoSince = now;
            return null;
        }
        if (now - state.dismountVetoSince < 2500) {
            return null;
        }
        return 'leap';
    }
    if (target.top < under.top - 5) {
        const v = liftVelocity(under, snap, state);
        if (v.vy < -10 && liftStrokeReaches(under, target.top)) {
            return null;
        }
        return 'leap';
    }
    const gravity =
        snap.physics && Number.isFinite(snap.physics.gravityY) ? snap.physics.gravityY : 400;
    if (!(gravity > 0)) {
        return 'leap';
    }
    const liftEdge = dir > 0 ? under.right : under.left;
    const targetNear = dir > 0 ? target.left : target.right;
    const gap = (targetNear - liftEdge) * dir;
    if (gap < 0) {
        return 'runoff';
    }
    const drop = Math.max(20, target.top - under.top);
    const drift = 160 * Math.sqrt((2 * drop) / gravity) + 40;
    return gap > drift ? 'leap' : 'runoff';
}

// True when the double may fire despite the ceiling check: a bonk
// beats the killzone (the rise often clears beside the lid), so the
// veto lifts when the floor is about to kill.
function doubleClearsBonk(player, driftDir, platforms, snap) {
    if (!doubleBonk(player, driftDir, platforms)) {
        return true;
    }
    return Number.isFinite(snap.killZoneY) && snap.killZoneY - player.y < 150;
}

// True when a deck crosses the double's rise column, here or 40px
// along the drift: jumping now bonks the underside and wastes fuel.
// Hold the jump and drift out instead of burning it on the ceiling.
function doubleBonk(player, driftDir, platforms) {
    const head = player.y - 22;
    const checkX = [player.x];
    if (driftDir !== 0) {
        checkX.push(player.x + driftDir * 40);
    }
    for (let c = 0; c < checkX.length; c++) {
        for (let i = 0; i < platforms.length; i++) {
            const plat = platforms[i];
            if (checkX[c] < plat.left - 10 || checkX[c] > plat.right + 10) {
                continue;
            }
            const bottom = plat.top + (plat.h || 24);
            if (bottom <= head - 260 || plat.top >= head) {
                continue;
            }
            return true;
        }
    }
    return false;
}

// Riding a lift: stay aboard until a dismount opens (a static deck in
// reach near the lift's height with a clear touchdown), tracking
// horizontal lifts so they don't slide out. True when it handles the
// tick. Leaping off early strands the pilot in the pit the lift spans.
function applyLiftRide(input, player, dir, snap, state, under, crown) {
    if (!player.grounded || under == null || under.type !== 'moving_platform') {
        return false;
    }
    if (
        crown &&
        Math.abs(crown.x - player.x) < 180 &&
        player.y > crown.y + 18 &&
        player.y < crown.y + 240
    ) {
        return false;
    }
    const target = liftDismountTarget(player, dir, snap);
    const dismount = liftDismountAction(player, dir, snap, state, under, target);
    if (dismount) {
        // Fleeing a live strike: leap away from the column plane, never
        // across it (crossing a firing column dies mid-leap).
        const column = dismount === 'flee' ? liftColumnThreat(under, snap) : null;
        const goalX = column ? player.x + (player.x < column.x ? -160 : 160) : target.x;
        input.left = goalX < player.x;
        input.right = goalX > player.x;
        input.jump = dismount !== 'runoff';
        return true;
    }
    const v = liftVelocity(under, snap, state);
    // Stay aboard: a moving lift slides out from under a standing
    // passenger, and a graze landing starts at the edge — center up
    // before either becomes a walk-off.
    const cx = (under.left + under.right) / 2;
    const halfW = (under.right - under.left) / 2;
    if (Math.abs(v.vx) > 25 || Math.abs(player.x - cx) > halfW - 25) {
        input.left = player.x > cx + 10;
        input.right = player.x < cx - 10;
    }
    return true;
}

// High landing the current arc falls short of: double at the apex
// instead of waiting for the fall below takeoff (which never comes
// when the landing sits above the takeoff). Gated on a near miss
// (<200px, one double covers) so spring-level heights still wait
// for their bonkable, and on a close landing so wide pits keep
// their committed-fall double.
function climbDouble(player, snap, state, platforms, driftDir) {
    if (player.grounded || snap.jumpCount >= snap.maxJumps || state.lastJump) {
        return false;
    }
    if (state.takeoffY == null || player.vy < -60) {
        return false;
    }
    // Grounded-flicker guard: segmented decks drop `grounded` for a
    // tick mid-stride while support sits right underfoot. Climbing
    // from deck level burns the jump into the lid above.
    if (player.vy < 100) {
        const boots = player.y + 22;
        for (let i = 0; i < platforms.length; i++) {
            const plat = platforms[i];
            if (
                player.x >= plat.left &&
                player.x <= plat.right &&
                plat.top >= boots - 10 &&
                plat.top <= boots + 25
            ) {
                return false;
            }
        }
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
    if (deckDist >= range + 60) {
        return false;
    }
    // Verify the double actually lands ON the deck: a near-miss deck
    // under the flight path sails past it (the double apexes far above
    // and descends beyond the far edge), wasting the jump. Verified in
    // the flight direction — a deck behind never catches a goalward
    // double, however landable the backward arc looks.
    return doubleLandsOn(player, deck, gravity, driftDir);
}

// Early gap takeoff: when jump range nears the gap period, an edge-56
// takeoff lands in the NEXT gap (L1/L2's 300px-spaced runs). If jumping
// NOW lands on the next platform but jumping at the edge sails past
// it, take off now instead of running to the edge. Only fires when the
// edge jump is known-bad, so normal gaps behave exactly as before.
function earlyGapJump(player, dir, snap, state, under, landing) {
    if (!player.grounded || under == null || landing == null) {
        return false;
    }
    if (sameDeck(under, landing)) {
        return false;
    }
    if (landing.type === 'moving_platform') {
        return false;
    }
    // Level flights only: step-ups climb, step-downs run off, and drops
    // stretch the range past the prediction.
    if (landing.top < player.y - 28 || landing.top > player.y + 22 + 40) {
        return false;
    }
    const crown = snap.crown;
    if (crown && Math.abs(crown.x - player.x) < 200) {
        return false;
    }
    const myEdge = dir > 0 ? under.right : under.left;
    const nearEdge = dir > 0 ? landing.left : landing.right;
    const farEdge = dir > 0 ? landing.right : landing.left;
    if ((nearEdge - myEdge) * dir < 10) {
        return false;
    }
    if (landingThreat(dir, landing, snap, state) != null) {
        return false;
    }
    const { range } = jumpBallistics(snap);
    const landNow = player.x + dir * range;
    const nowOn = (landNow - nearEdge) * dir > 8 && (farEdge - landNow) * dir > 8;
    if (!nowOn) {
        return false;
    }
    const landEdge = myEdge + dir * (range - 56);
    const edgeOn = (landEdge - nearEdge) * dir > 8 && (farEdge - landEdge) * dir > 8;
    return !edgeOn;
}

// True when a double jump from here (vy -330) touches down on the deck:
// apex boots above the deck top and landing x inside the span, flown
// in the drift direction (zero drifts straight up onto a spanning deck).
function doubleLandsOn(player, deck, gravity, dir) {
    const riseT = 330 / gravity;
    const apexBoots = player.y + 22 - (330 * 330) / (2 * gravity);
    if (apexBoots > deck.top - 6) {
        return false;
    }
    const fall = deck.top - apexBoots;
    const t = riseT + Math.sqrt((2 * fall) / gravity);
    if (!Number.isFinite(t)) {
        return false;
    }
    const landX = player.x + (dir || 0) * 160 * t;
    // Near-edge margin: airtime shortfall (drag, slow frames) scales
    // with flight distance, so marginal corner-grazes from max range
    // fall back to the safe arc instead of sliding off the deck side.
    const margin = 20 + Math.abs(landX - player.x) * 0.15;
    const nearOK = dir < 0 ? landX < deck.right - margin : landX > deck.left + margin;
    return nearOK && landX > deck.left + 6 && landX < deck.right - 6;
}

// Hold the air jump until the fall commits: below takeoff height, soon
// past the kill plane, or falling too fast to wait. Firing at the first
// falling tick burns the double at the apex over wide pits.
// A reason to spend the double mid-flight: a gap to cross, a step up,
// the crown — or dying soon (falling past a wall reads as "footing
// ahead" through support tolerance, which would otherwise veto the
// only jump that extends the flight).
// Grounded jump plan: whether to take off plus the climb/crown
// subgoals the double gate reuses mid-flight.
function groundJumpPlan(
    player,
    dir,
    snap,
    state,
    platforms,
    landing,
    under,
    board,
    gap,
    dropSmall,
    crownDx
) {
    const crown = snap.crown || { x: player.x + 200, y: player.y };
    // A shielded crown with a live boss is a trap, not a grab: jumping
    // for it burns both jumps over the boss and falls onto her. Fight
    // first (boss evade), collect after the shield drops.
    const crownOpen = snap.crown?.shielded !== true || !liveBoss(snap);
    const stepUp =
        wantStepUp(player, dir, landing, snap) &&
        (landing == null || landing.type !== 'moving_platform' || board === 'jump');
    const grabCrown =
        crownOpen && Math.abs(crownDx) < 180 && player.y > crown.y + 18 && player.y < crown.y + 240;
    // Final-approach hops only: when the crown is close, hop toward it
    // instead of running underneath. (An unrestricted climb-above rule
    // turned the pilot into a pogo stick: airborne bolts fly over
    // boarder heads while bombs and chasers connect. Ascents are
    // covered by stepUp/grabCrown.)
    const closePush = crownOpen && player.grounded && Math.abs(crownDx) < 150;
    const earlyGap = earlyGapJump(player, dir, snap, state, under, landing);
    const shouldJump =
        (gap && !dropSmall && board !== 'run') ||
        earlyGap ||
        board === 'jump' ||
        stepUp ||
        grabCrown ||
        closePush ||
        wantPreJump(player, dir, snap, platforms);
    return { shouldJump, stepUp, grabCrown };
}

function doubleReason(player, snap, gap, stepUp, grabCrown) {
    if (gap || stepUp || grabCrown) {
        return true;
    }
    return Number.isFinite(snap.killZoneY) && snap.killZoneY - player.y < 220;
}

// True when the falling flight should spend its double: a committed
// fall (or a walk-off, which never planned an arc — waiting drops it
// past the support it left) with a reason to extend, no touchdown
// projected (or a trap-deck touchdown to fly over instead of landing),
// no rescue aim engaged (the aim lands the flight itself), and fuel.
function canSpendDouble(
    player,
    snap,
    state,
    dir,
    falling,
    gap,
    stepUp,
    grabCrown,
    platforms,
    dropDeck
) {
    if (
        player.grounded ||
        !falling ||
        !doubleReason(player, snap, gap, stepUp, grabCrown) ||
        dropDeck != null ||
        snap.jumpCount >= snap.maxJumps
    ) {
        return false;
    }
    const touchdown = touchdownDeck(player, snap, platforms);
    // Safe deck below: land on it. Trap deck (no clear touchdown):
    // double over it instead of landing beside a rover.
    if (touchdown != null && deckAimX(touchdown, snap, dir) != null) {
        return false;
    }
    // Doomed arc: falling past the apex with no touchdown projected
    // but a lower deck ahead in double range — waiting for the
    // committed-fall gate only spends the altitude the double needs to
    // extend onto it. Decks at or above boot level stay gated (a
    // max-range climb double grazes the deck corner instead of landing).
    // Elective doubles (this one and walk-offs below) also hold while
    // a patrol sits in the rise arc — drifting clear first beats rising
    // into it. Committed plummets still fire (no time to drift).
    const riseClear = !mountBlocked(player, dir, snap);
    if (touchdown == null && player.vy > 100 && riseClear) {
        const { range } = jumpBallistics(snap);
        if (
            extendableDeck(player, dir, platforms, range + 120) &&
            !doubleArcCrossesBeam(player, dir, snap)
        ) {
            return true;
        }
    }
    return committedFall(player, snap, state) || (snap.jumpCount === 0 && riseClear);
}

// True when a laser core intersects the double's flight corridor:
// an early high double falls back through the beam's airspace while
// its phase flips, so hold for the low late double that skims under
// instead. All lasers count (off phases flip on mid-flight).
function doubleArcCrossesBeam(player, dir, snap) {
    const ahead = player.x + dir * 500;
    const left = Math.min(player.x, ahead);
    const right = Math.max(player.x, ahead);
    const top = player.y - 260;
    const bottom = player.y + 300;
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || item.type !== 'laser') {
            continue;
        }
        const halfW = (item.w || 0) / 2;
        const halfH = (item.h || 0) / 2;
        const beamLeft = item.left ?? item.x - halfW;
        const beamRight = item.right ?? item.x + halfW;
        const beamTop = item.top ?? item.y - halfH;
        const beamBottom = beamTop + (item.h || 10);
        if (beamRight > left && beamLeft < right && beamBottom > top && beamTop < bottom) {
            return true;
        }
    }
    return false;
}

// A deck ahead meaningfully below the boots and inside double reach:
// the double extends the descent onto it instead of climbing at max
// range to reach it. Decks behind, underfoot, or past reach never
// count (a flight already over its deck brakes for it instead).
function extendableDeck(player, dir, platforms, reach) {
    const boots = player.y + 22;
    for (let i = 0; i < platforms.length; i++) {
        const plat = platforms[i];
        const near = dir > 0 ? plat.left - player.x : player.x - plat.right;
        if (near < 0 || near > reach) {
            continue;
        }
        if (plat.top > boots + 20 && plat.top < player.y + 260) {
            return true;
        }
    }
    return false;
}

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

// Area hazards gate the whole move before duels and goals: bombs rain
// from above, timed beams gate the lane, crusher pistons gate it the
// same way, and falling drips hold for the pass.
function hazardGatesHold(input, player, dir, snap, platforms, under, state) {
    if (applyAmbushHolds(input, player, dir, snap, platforms, under)) {
        return true;
    }
    if (applyLaserMove(input, player, dir, snap, state)) {
        return true;
    }
    if (applyCrusherMove(input, player, dir, snap, state)) {
        return true;
    }
    if (applyDripMove(input, player, dir, snap)) {
        return true;
    }
    return false;
}

// Airborne near a live boss: never chase the hunt into her column —
// hold the arc (usually the evade takeoff running away) and let the
// descent escape steer the touchdown. Bolts still catch the hunt
// in-lane; chasing it mid-air ends inside the charge.
// Shielded crown with an active boss, airborne: the crown goal
// pulls the drift through her body onto a touchdown inside
// contact. Hold x and let the descent escape steer — unless the
// drift already clears her far edge (a committed cross-over).
// Airborne drift override near an active boss under a shielded
// crown: null keeps the goal, 0 holds x, away*200 flees. The crown
// goal pulls the drift through her body onto a touchdown inside
// contact, so toward-drift holds — but a telegraph or charge
// needs separation, not stillness, so incoming phases flee.
// Grounded evades plant already; dormant contact is safe. Only
// with a deck below: holding over the pit strands the flight.
function shieldBossDrift(player, snap, dx) {
    if (player.grounded || snap.crown?.shielded !== true || dx === 0) {
        return null;
    }
    const boss = liveBoss(snap);
    if (!boss || boss.phase === 'dormant') {
        return null;
    }
    const separation = Math.abs(boss.x - player.x);
    const deck = landingBelow(player, snap.platforms || [], snap);
    if (deck == null) {
        return null;
    }
    // The hold parks the arc, so the boots must come down ON the
    // deck — inside its span, not inside landingBelow's stride
    // margin. Holding 25px short of the edge strands the flight
    // over the void (L14 trace): keep the goal drift instead.
    if (player.x < deck.left + 14 || player.x > deck.right - 14) {
        return null;
    }
    if ((boss.x - player.x) * dx <= 0) {
        return null;
    }
    if (separation >= 300 || bossCrossClears(player, boss, snap)) {
        return null;
    }
    if (boss.phase === 'telegraph' || boss.phase === 'charge') {
        return (boss.x >= player.x ? -1 : 1) * 200;
    }
    return 0;
}

function holdArcNearBoss(player, snap, hunt) {
    if (player.grounded || !hunt || hunt.type !== 'boarder') {
        return false;
    }
    const boss = liveBoss(snap);
    return Boolean(boss && Math.hypot(boss.x - player.x, boss.y - player.y) < 250);
}

// Nearest live boarder or boss near the crown pad, or null. The shield
// breaks when the crown-platform guards die, and guards stay on deck —
// so only pad guards are worth hunting. Stragglers behind the run are
// ignored: U-turning for them burns jumps and walks the pilot back into
// cleared packs. A live boss always qualifies: walking back to her
// beats idling at a shielded crown until she arrives.
function nearestBoarder(player, snap, crown) {
    if (!snap || snap.phaser !== true) {
        return null;
    }
    let best = null;
    let bestDist = Infinity;
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || (item.type !== 'boarder' && item.type !== 'boss')) {
            continue;
        }
        if (!item.active || item.enable === false) {
            continue;
        }
        if (item.type === 'boss' && item.hp != null && item.hp <= 0) {
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
    const bombs = snap.bombs || [];
    // Airborne rule is emergency-only (a box overhead): dodging
    // distant bombs mid-flight diverts crossings, but a bomb inside
    // the box kills within half a second. The airborne box is wide
    // because the dodge releases at its edge — a tight box weaves in
    // and out of the bomb lane instead of clearing it.
    const box = player.grounded ? 55 : 90;
    const height = player.grounded ? 280 : 260;
    for (let i = 0; i < bombs.length; i++) {
        const bomb = bombs[i];
        if (!bomb || !bomb.active || bomb.enable === false) {
            continue;
        }
        if ((bomb.vy || 0) <= 0) {
            continue;
        }
        const above = player.y - bomb.y;
        if (above <= 0 || above >= height) {
            continue;
        }
        // Bombs are aimed, not homing: the velocity commits at spawn,
        // so dodge the projected aim point (where the bomb reaches boot
        // level), not the falling body — sidestepping away from a
        // drifting bomb's x runs into its path.
        const aimX = bomb.x + ((bomb.vx || 0) * above) / bomb.vy;
        const dx = aimX - player.x;
        if (Math.abs(dx) < box) {
            return dx >= 0 ? -1 : 1;
        }
    }
    return 0;
}

// Nearest live drone inside the contact box, or 0: steer to the far
// side of it. Drones patrol their lane, so the dodge releases once
// the pilot clears the box or the drone patrols away. The box stays
// tight (70px): wider boxes hijack takeoff and apex arcs that pass
// near patrol lanes on their way to safe landings.
function droneDodge(player, snap) {
    const hazards = snap.hazards || [];
    let best = 0;
    let bestDist = 70;
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || item.type !== 'drone' || !item.active || item.enable === false) {
            continue;
        }
        const dx = item.x - player.x;
        const dy = item.y - player.y;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        if (dist < bestDist) {
            bestDist = dist;
            best = dx >= 0 ? -1 : 1;
        }
    }
    return best;
}

// Patrol velocity across ticks, px/s: drones and rovers ride tweens,
// which never set body velocity. Zero on first sight or missing id.
function threatVelocity(item, snap, state) {
    if (!item.id) {
        return { vx: 0, vy: 0 };
    }
    const t = Number.isFinite(snap.elapsedMs) ? snap.elapsedMs : 0;
    const prev = state.threatPrev[item.id];
    const v =
        prev && t > prev.t
            ? { vx: ((item.x - prev.x) / (t - prev.t)) * 1000, vy: 0 }
            : { vx: 0, vy: 0 };
    state.threatPrev[item.id] = { x: item.x, t };
    return v;
}

// Lethal, non-stompable hazard holding the touchdown (the landing's near
// side, where leaps come down). Patrols inside 60px always hold; wider
// ones only while closing, so the leap releases as they move away
// instead of holding forever on a deck they sweep.
function landingThreat(dir, landing, snap, state) {
    if (!landing) {
        return null;
    }
    const touchdown = dir > 0 ? landing.left + 50 : landing.right - 50;
    const hazards = snap.hazards || [];
    for (let i = 0; i < hazards.length; i++) {
        const item = hazards[i];
        if (!item || !item.active || item.enable === false || item.bonkable) {
            continue;
        }
        // A boss squatting the landing never leaves, so waiting her
        // out strands the approach (L15 trace: the dismount veto and
        // the gap wait both held forever while her summon closed in).
        // Land anyway — the boss evade owns the encounter on arrival,
        // and the airborne telegraph flee covers a charge mid-flight.
        if (item.type === 'boss') {
            continue;
        }
        if (Math.abs(item.y - landing.top) >= 130) {
            continue;
        }
        const dx = Math.abs(item.x - touchdown);
        if (dx < 60) {
            return item;
        }
        if (dx < 140) {
            const v = threatVelocity(item, snap, state);
            if ((touchdown - item.x) * v.vx > 0) {
                return item;
            }
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
    state.holdStill = false;
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
    // Support underfoot, computed early: riders skip ray holds (a lift
    // passenger sidesteps off the edge — the emergency dismount leaps
    // instead).
    const under =
        supportAt(player.x, player.y + 6, platforms) ||
        supportAt(player.x - 14, player.y + 6, platforms) ||
        supportAt(player.x + 14, player.y + 6, platforms);
    if (hazardGatesHold(input, player, dir, snap, platforms, under, state)) {
        return input;
    }
    // Boss winding up or bearing down: jump now, keep running and firing.
    if (applyBossEvade(input, player, dir, dx, snap, shooting)) {
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
        // An airborne boss hunt stands off at bolt range: chasing her
        // body trades. Grounded hunts still close into evade range;
        // evades and duels own it from there.
        if (!(hunt.type === 'boss' && !player.grounded && Math.abs(hunt.x - player.x) < 250)) {
            goal = hunt;
            dx = hunt.x - player.x;
        }
        dir = dx === 0 ? dir : Math.sign(dx);
        laneDist = boarderAhead(player, dir, snap);
        shooting = laneDist >= 0;
        input.shoot = shooting;
    }
    if (holdArcNearBoss(player, snap, hunt)) {
        goal = { x: player.x, y: player.y };
        dx = 0;
    }
    const shieldDrift = shieldBossDrift(player, snap, dx);
    if (shieldDrift != null) {
        goal = { x: player.x + shieldDrift, y: player.y };
        dx = shieldDrift;
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
    // Body-wide support: the center alone misses edge stands (the game
    // grounds the full body), which dropped lift rides into run-offs.
    const ahead = supportAt(player.x + dir * 56, player.y + 6, platforms);
    const landing = nextPlatform(player.x, player.y, dir, platforms);
    const falling = player.vy > 28;
    const gap = !ahead;
    // Small step-down: run off and land instead of full-jumping.
    // A full jump off a low edge becomes a 350px fuel-burning flight;
    // chasers shadow it, the double goes to dodging them, and the
    // next real gap finds the tank empty.
    const dropSmall = smallStepDown(player, dir, gap, landing);
    // Lift boarding waits and back-ups come before the hop reflexes: a
    // patrol hop mid-boarding spends the jump on a doomed arc instead
    // of the apex takeoff. Survival above still wins.
    const board = liftBoarding(player, dir, snap, under, landing, state);
    state.holdStill = board === 'wait' || board === 'back';
    if (board === 'wait') {
        return input;
    }
    if (board === 'back') {
        const liftCx = (landing.left + landing.right) / 2;
        const away = liftCx > player.x ? -1 : 1;
        input.left = away < 0;
        input.right = away > 0;
        return input;
    }
    const blocker = hazardInPath(player.x, player.y, dir, snap.hazards || [], snap.bombs || [], 70);
    if (blocker && !isHopable(blocker) && blockerHoldsArc(player, blocker)) {
        return input;
    }
    // Deliberate spring use, computed before the close-range reflexes so a
    // crowded spring gets runway treatment instead of a suicide hop. The
    // pin below says "stay, the way up is out of reach", and a usable
    // bonkable is exactly the exception.
    const springPlan = findSpringTarget(player, dir, snap, platforms, landing, crown, gap);
    const spring = springPlan.spring;
    const seek = springPlan.seek;
    const hop = springPlan.hop;
    if (blocker && isHopable(blocker)) {
        const dist = Math.abs(blocker.x - player.x);
        if (blocker.bonkable) {
            applyBonkBlocker(input, player, dx, blocker, spring, seek, hop, platforms);
            return input;
        }
        // Drift-jumps never trigger on bombs: leaping toward one wastes
        // fuel on a dodge the veer-off below handles.
        const blockerIsBomb = (snap.bombs || []).indexOf(blocker) !== -1;
        if (
            lethalDriftJump(player, snap, falling, state) &&
            !blockerIsBomb &&
            !touchdownDuel(player, blocker)
        ) {
            input.right = dx > 10;
            input.left = dx < -10;
            input.jump = true;
            return input;
        }
        const engaging = shooting && blocker.type === 'boarder';
        if (engaging) {
            applyHeadOnDuel(input, player, dir, dx, snap, falling, blocker);
            return input;
        }
        // Leap over drones, rollers, rovers, or hold too close to
        // clear. Airborne pilots keep flying instead — the descent
        // logic below steers the touchdown.
        if (applyHopLeap(input, player, dx, dist, snap, state, blocker, platforms)) {
            return input;
        }
    }
    if (applyDescentEscape(input, player, snap, falling, state, dx)) {
        return input;
    }
    if (touchdownExtend(input, player, snap, falling, state, dx)) {
        return input;
    }
    // Lift riding, ahead of springs and holds: lifts are the route
    // transit (springs are detours). Boarding waits already returned
    // before the hop reflexes so takeoffs stay clean.
    if (applyLiftRide(input, player, dir, snap, state, under, crown)) {
        state.holdStill = true;
        return input;
    }
    // Spring steering, ahead of the high-landing hold: a usable bonkable
    // is the exception to staying put.
    if (spring) {
        applySpringMove(input, player, snap, state, spring, falling, platforms);
        return input;
    }
    if (applyHighHold(input, player, dir, snap, under, landing, platforms)) {
        return input;
    }
    const dropDeck = applyRideSteer(
        input,
        player,
        dir,
        snap,
        state,
        falling,
        platforms,
        landing,
        goal
    );
    // Don't leap into a landing occupied by something lethal.
    if (applyLandingWait(player, dir, gap, landing, snap, state, shooting, laneDist)) {
        return input;
    }
    // Committed takeoffs that trade mid-air hold for the threat to
    // clear instead (deliberate hop/lift/spring jumps already returned
    // above and keep their timing).
    if (applyTakeoffHold(input, player, dir, snap, gap)) {
        return input;
    }
    const jumpPlan = groundJumpPlan(
        player,
        dir,
        snap,
        state,
        platforms,
        landing,
        under,
        board,
        gap,
        dropSmall,
        crownDx
    );
    const driftDir = input.right ? 1 : input.left ? -1 : 0;
    const climb = climbDouble(player, snap, state, platforms, driftDir);
    // Unleapable devil ahead (a low lid caps the arc): give ground to
    // the west until a mount engages — the deck over the devil is the
    // bridge.
    if (applyDevilRetreat(input, player, dir, snap, platforms, jumpPlan.shouldJump)) {
        return input;
    }
    const canDouble = canSpendDouble(
        player,
        snap,
        state,
        dir,
        falling,
        gap,
        jumpPlan.stepUp,
        jumpPlan.grabCrown,
        platforms,
        dropDeck
    );
    if (player.grounded) {
        // No headroom: the rise bonks the ceiling deck (wasting the
        // jump and a fuel count), so run off instead — the walk-off air
        // jumps fire past the ceiling with clear sky. Step-ups mount the
        // deck above (the rise is the route) and timed boarding jumps
        // belong to the lift logic, so both keep their jump.
        input.jump =
            jumpPlan.shouldJump &&
            (jumpPlan.stepUp || board === 'jump' || !doubleBonk(player, driftDir, platforms));
    } else if ((canDouble || climb || crusherOverDouble(player, dir, snap)) && !state.lastJump) {
        input.jump = doubleClearsBonk(player, driftDir, platforms, snap);
    }
    return input;
}

// Distilled from fresh JEV traces (.jev-runs/level-2, ~21 move_left
// backtracks when stalled): if the pilot makes no horizontal progress
// for a while, hop away from the goal briefly instead of stalling.
export function applyStuckRecovery(snap, input, state, suppressed, now, threatSuppressed) {
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
    let threatBlock = Boolean(threatSuppressed);
    if (threatBlock) {
        if (state.threatSuppressFromT == null) {
            state.threatSuppressFromT = at;
        } else if (at - state.threatSuppressFromT > 10000) {
            threatBlock = false;
            state.threatSuppressFromT = at;
        }
    } else {
        state.threatSuppressFromT = null;
    }
    if (state.stuckFromX == null || Math.abs(px - state.stuckFromX) > 24) {
        state.stuckFromX = px;
        state.stuckFromT = at;
    } else if (at - state.stuckFromT > 2500) {
        state.recoverUntil = at + 900;
        state.stuckFromX = px;
        state.stuckFromT = at;
    }
    if (at < state.recoverUntil && !suppressed && !threatBlock) {
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
            const suppressed = state.holdStill === true;
            const threatNear =
                snap.player != null &&
                nearestThreat(snap.player.x, snap.player.y, snap, 150) != null;
            applyStuckRecovery(snap, input, state, suppressed, undefined, threatNear);
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
    tallColumnHazard,
    columnOverlapY,
    columnAhead,
    hazardInPath,
    isHopable,
    blockerHoldsArc,
    boarderAhead,
    holdArcNearBoss,
    shieldBossDrift,
    hazardGatesHold,
    bossEvadeTarget,
    applyBossEvade,
    bossEvadeAhead,
    footingDeck,
    bossSharesDeck,
    corneredByBoss,
    liveBoss,
    duelTarget,
    boarderBelow,
    duelHold,
    duelGate,
    touchdownDuel,
    touchdownClear,
    aggroAhead,
    applyTakeoffHold,
    applyHeadOnDuel,
    brakeForChaser,
    wantStepUp,
    wantPreJump,
    mountBlocked,
    dripMove,
    applyDripMove,
    chaserBehind,
    nearestColumnX,
    liftColumnThreat,
    deckDropTarget,
    fallTimeTo,
    crusherOverAim,
    deckAimX,
    touchdownUnsafe,
    touchdownBlocked,
    applyRideSteer,
    rescueDeckTarget,
    devilAhead,
    devilLidded,
    devilLeapable,
    mountShort,
    applyFrontDuel,
    applyRearDuel,
    applyDevilLeap,
    applyDevilRetreat,
    levelGroundAhead,
    applyHighHold,
    applyLandingWait,
    applyBonkBlocker,
    patrolClosing,
    hopClearsOverhead,
    applyHopLeap,
    applyAmbushHolds,
    applyCloseReflex,
    landingBelow,
    touchdownDeck,
    descentEscape,
    noFuelColumnSteer,
    bossCrossClears,
    descentBossMove,
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
    doubleLandsOn,
    earlyGapJump,
    groundJumpPlan,
    doubleReason,
    canSpendDouble,
    committedFall,
    extendableDeck,
    doubleArcCrossesBeam,
    deckInUnsafeBeam,
    jumpBallistics,
    beamLeapable,
    laserLeapMove,
    laserInsideMove,
    laserWindowCovers,
    laserReach,
    beamArcClears,
    laserTransitCovers,
    veerLanding,
    laserEntryMove,
    laserSpanMove,
    laserMove,
    beamLeapCommit,
    applyLaserMove,
    crusherVy,
    crusherRestY,
    crusherSlamY,
    crusherReaches,
    crusherOpen,
    crusherSpanMove,
    crusherOverDouble,
    crusherMove,
    applyCrusherMove,
    liftVelocity,
    liftWalkable,
    liftLevelInStroke,
    liftTransitPressure,
    liftBoarding,
    liftDropTarget,
    liftDismountTarget,
    liftStrokeReaches,
    leapOverMover,
    dismountVetoThreat,
    liftDismountAction,
    doubleBonk,
    doubleClearsBonk,
    findSpringTarget,
    springBonkable,
    applyLiftRide,
    applySpringMove,
    rayEvacuate,
    bonkOverhead,
    laneBoarderX,
    laneBoarderDy,
    nearestBoarder,
    shieldHuntTarget,
    nearestThreat,
    bombDodge,
    droneDodge,
    landingThreat,
    threatVelocity,
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
