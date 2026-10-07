/**
 * Shared observation feature encoder for the Space Chicken RL stack (contract v3).
 *
 * Single source of truth for obs layout: scripts/rl/convert-jev.mjs uses it
 * to build training vectors, scripts/rl/play-policy.mjs uses it for live
 * inference, and the JEV recorder stores raw observations that this module
 * encodes. Layout must match rl/contract.json (obsVersion 3, 83 floats:
 * the 70 v2 features plus 13 v3 state slots appended at the end).
 *
 * Input is a full test observation (see GameTestInterface) OR a legacy
 * partial step ({player, objective, level, deaths, atMs}); missing board
 * data zero-fills so old JEV traces still encode.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GAME_TEST_ACTIONS } from '../../GameTestInterface.js';

const contract = JSON.parse(
    fs.readFileSync(
        path.join(path.dirname(fileURLToPath(import.meta.url)), '../../rl/contract.json'),
        'utf8'
    )
);

export const ACTION_NAMES = Object.freeze([...GAME_TEST_ACTIONS]);
export const OBS_VERSION = contract.obsVersion;
export const OBS_SIZE = contract.obsSize;

if (ACTION_NAMES.length !== contract.actionSize) {
    throw new Error(
        `Action space drift: GameTestInterface has ${ACTION_NAMES.length}, contract wants ${contract.actionSize}`
    );
}
if (contract.features.length !== contract.obsSize) {
    throw new Error(
        `Feature list drift: contract names ${contract.features.length}, obsSize ${contract.obsSize}`
    );
}

function num(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function bool(value) {
    return value ? 1 : 0;
}

export function actionIndex(name) {
    return ACTION_NAMES.indexOf(name);
}

function dangerOf(item) {
    if (!item || item.active === false) return 0;
    if (typeof item.phase === 'string') return item.phase === 'cooldown' ? 0 : 1;
    return 1;
}

function changeIn(item) {
    return clamp(num(item?.timeUntilPhaseChangeMs, 0) / 5000, 0, 2);
}

function encodeHazard(item) {
    if (!item) return [0, 0, 0, 0, 0, 0, 0];
    return [
        clamp(num(item.dx) / 800, -2, 2),
        clamp(num(item.dy) / 600, -2, 2),
        bool(item.active !== false),
        bool(item.bonkable),
        bool(item.type === 'boarder'),
        dangerOf(item),
        changeIn(item),
    ];
}

function itemDist2(item) {
    // 2D distance from the player: platforms carry `top` instead of `dy`.
    return Math.hypot(num(item?.dx), num(item?.dy ?? item?.top));
}

function nearest(list, count) {
    const items = Array.isArray(list) ? [...list] : [];
    items.sort((a, b) => itemDist2(a) - itemDist2(b));
    return items.slice(0, count);
}

export function availableMask(availableActions) {
    if (!Array.isArray(availableActions) || availableActions.length === 0) {
        return ACTION_NAMES.map(() => 1);
    }
    const allowed = new Set(availableActions);
    return ACTION_NAMES.map((name) => (allowed.has(name) ? 1 : 0));
}

/**
 * Renormalize a prob distribution over the legal actions only, for
 * masked sampling (rollout) and masked argmax (play-policy). Falls back
 * to `wait` when nothing is legal rather than sampling an illegal move.
 */
export function maskedProbs(probs, availableActions) {
    const mask = availableMask(availableActions);
    const masked = probs.map((p, i) => (mask[i] ? Math.max(p, 0) : 0));
    const total = masked.reduce((a, b) => a + b, 0);
    if (!(total > 0)) {
        const fallback = new Array(probs.length).fill(0);
        fallback[actionIndex('wait')] = 1;
        return { probs: fallback, mask };
    }
    return { probs: masked.map((p) => p / total), mask };
}

/**
 * Encode a full observation (or legacy partial step) into the 83-float
 * contract vector: 16 goal/ego features, then 54 board slots, then the
 * 13 v3 state slots (hazard velocities, any-direction threat, stomp
 * flag, gun readiness, facing, level physics).
 */
export function encodeObservation(step) {
    const player = step.player || {};
    const objective = step.objective || {};
    const nearby = step.nearby || {};
    const navigation = step.navigation || {};
    const world = step.world || {};
    const physics = step.physics || {};
    const combat = step.combat || null;
    const dx = num(objective.dx);
    const dy = num(objective.dy);
    const dist = num(objective.distance, Math.hypot(dx, dy));

    const vec = [
        clamp(dx / 2000, -2, 2),
        clamp(dy / 1000, -2, 2),
        clamp(dist / 2500, 0, 3),
        clamp(num(player.vx) / 400, -2, 2),
        clamp(num(player.vy) / 800, -2, 2),
        bool(player.grounded),
        clamp(num(player.jumpsRemaining) / 2, 0, 1),
        clamp(num(step.level) / 7, 0, 2),
        clamp(Math.min(num(step.deaths), 10) / 10, 0, 1),
        clamp(num(step.atMs ?? step.elapsedMs) / 60000, 0, 1.5),
        dx < 0 ? 1 : 0,
        dy < 0 ? 1 : 0,
        bool(step.canShoot),
        clamp((num(world.killZoneY, num(player.y)) - num(player.y)) / 1000, -1, 2),
        clamp(num(world.width) / 4000, 0, 1),
        clamp(num(world.height) / 1000, 0, 1),
    ];

    const hazards = nearest(nearby.hazards, 4);
    for (let i = 0; i < 4; i++) {
        vec.push(...encodeHazard(hazards[i]));
    }

    const platforms = nearest(
        (nearby.platforms || []).filter((p) => p?.type !== 'moving_platform'),
        3
    );
    for (let i = 0; i < 3; i++) {
        const platform = platforms[i];
        vec.push(
            clamp(num(platform?.dx) / 800, -2, 2),
            clamp(num(platform?.top) / 600, -2, 2),
            clamp(num(platform?.width) / 800, 0, 2)
        );
    }

    const moving = nearest(nearby.movingPlatforms, 1)[0];
    vec.push(
        clamp(num(moving?.dx) / 800, -2, 2),
        clamp(num(moving?.top) / 600, -2, 2),
        clamp(num(moving?.vx) / 400, -2, 2),
        clamp(num(moving?.vy) / 400, -2, 2)
    );

    const landing = navigation.landingWindow || {};
    vec.push(
        bool(navigation.gapAhead),
        bool(navigation.ridingMovingPlatform),
        clamp(num(navigation.distanceToSupportEdge) / 300, 0, 2),
        clamp(((num(landing.left) + num(landing.right)) / 2 || 0) / 800, -2, 2),
        clamp(num(landing.top) / 600, -2, 2),
        bool(navigation.immediateThreat)
    );

    const timedPool = [...(nearby.timedHazards || []), ...(nearby.rayColumns || [])];
    const timed = nearest(timedPool, 1)[0];
    vec.push(
        clamp(num(timed?.dx) / 800, -2, 2),
        clamp(num(timed?.dy) / 600, -2, 2),
        timed ? dangerOf({ ...timed, active: true }) : 0,
        changeIn(timed)
    );

    const bomb = nearest(nearby.bombs, 1)[0];
    vec.push(
        clamp(num(bomb?.dx) / 800, -2, 2),
        clamp(num(bomb?.dy) / 600, -2, 2),
        bool(bomb && bomb.active !== false)
    );

    // v3 state slots: everything the bot was blind to in v2.
    vec.push(
        clamp(num(hazards[0]?.vx) / 400, -2, 2),
        clamp(num(hazards[0]?.vy) / 400, -2, 2),
        clamp(num(hazards[1]?.vx) / 400, -2, 2),
        clamp(num(hazards[1]?.vy) / 400, -2, 2)
    );
    const nearestThreat = navigation.nearestThreat || {};
    vec.push(
        clamp(num(nearestThreat.dx) / 800, -2, 2),
        clamp(num(nearestThreat.dy) / 600, -2, 2),
        clamp(
            num(nearestThreat.distance, Math.hypot(num(nearestThreat.dx), num(nearestThreat.dy))) /
                2500,
            0,
            3
        )
    );
    vec.push(
        bool((nearby.hazards || []).some((item) => item?.bonkable && item?.stompableNow)),
        combat ? bool(combat.ready !== false) : 0,
        bool(player.facing === 'left'),
        clamp(num(physics.gravityY) / 400, 0, 2),
        clamp(num(physics.jumpVelocityY) / 500, -2, 2),
        clamp(num(physics.runSpeedX) / 200, 0, 2)
    );

    return vec;
}

/**
 * Shaped step reward shared by the recorder and the converter:
 * forward progress toward the crown, minus death.
 *
 * Scale: (prevDist - dist) / 500, so ~100px of crown progress = +0.2.
 * Death is a flat -1 that ignores the respawn teleport (respawn often
 * lands closer to the start, which would otherwise fake a large negative
 * or positive delta on the death frame). Sub-2px deltas are rounding
 * jitter from the observation rounder and score 0.
 *
 * The optional third arg carries the executed action for small dense
 * bonuses/penalties (all skipped for legacy partial steps without player
 * state, keeping old rewards bit-identical):
 * - stall: no crown progress and <3px displacement while playing = -0.05
 *   (Mario-style anti-stagnation; step cost alone is too weak to unstick).
 * - engaging: a fire_* action toward a shootable boarder with a hot gun
 *   = +0.05 (teaches phaser use on L7+ without swamping progress).
 * - stomp setup: a jump_* action while a stompableNow cap is close
 *   = +0.05 (rewards setting up boost stomps).
 */
export function stepReward(previous, current, opts = {}) {
    const prevDeaths = num(previous?.deaths, 0);
    const curDeaths = num(current?.deaths, prevDeaths);
    if (curDeaths > prevDeaths) return -1;
    const prevDist = num(previous?.objective?.distance, NaN);
    const dist = num(current?.objective?.distance, NaN);
    if (!Number.isFinite(prevDist) || !Number.isFinite(dist)) return 0;
    const delta = prevDist - dist;
    let reward = Math.abs(delta) < 2 ? 0 : clamp(delta / 500, -1, 1);
    const action = typeof opts?.action === 'string' ? opts.action : null;
    if (!action || !previous?.player || !current?.player) return reward;
    if (current.phase !== undefined && current.phase !== 'playing') return reward;
    const prevP = previous.player;
    const curP = current.player;
    if (
        reward === 0 &&
        Number.isFinite(prevP.x) &&
        Number.isFinite(curP.x) &&
        Math.hypot(num(curP.x) - num(prevP.x), num(curP.y) - num(prevP.y)) < 3
    ) {
        reward -= 0.05;
    }
    if (action.startsWith('fire_') || action === 'fire') {
        const side = actionDirection(action) || previous.player?.facing || null;
        if (hadShootableBoarder(previous, side)) reward += 0.05;
    }
    if (action.startsWith('jump') && hadStompSetup(previous)) reward += 0.05;
    return clamp(reward, -1.2, 1.2);
}

// Same lane geometry as scripts/jev-playtest.mjs: bolts fly horizontally
// with ~820px range, so only count boarders on the action's side.
function actionDirection(action) {
    if (action.endsWith('_left')) return 'left';
    if (action.endsWith('_right')) return 'right';
    return null;
}

function hadShootableBoarder(obs, direction) {
    if (obs?.canShoot === false) return false;
    if (obs?.combat && obs.combat.ready === false) return false;
    const hazards = obs?.nearby?.hazards || [];
    return hazards.some((item) => {
        if (!item || item.type !== 'boarder' || item.active === false) return false;
        if (direction === 'left' && !(item.dx < 0)) return false;
        if (direction === 'right' && !(item.dx > 0)) return false;
        return Math.abs(item.dx) <= 820 && Math.abs(item.dy) < 70;
    });
}

function hadStompSetup(obs) {
    const hazards = obs?.nearby?.hazards || [];
    return hazards.some(
        (item) =>
            item &&
            item.bonkable &&
            item.stompableNow &&
            Math.abs(num(item.dx)) < 120 &&
            Math.abs(num(item.dy)) < 120
    );
}

/**
 * Stateful anti-camping ratchet for rollouts (Mario-style stuck penalty).
 * Tracks the best crown distance seen this episode: progress resets the
 * clock, deaths reset the best (respawn lands far from the crown).
 * After `graceSteps` without new best, every step scores `penaltyPerStep`
 * until `abortSteps`, when the episode is cut short as a failure — no
 * point burning 75s watching a camper.
 */
export function createProgressTracker({
    graceSteps = 25,
    penaltyPerStep = -0.1,
    abortSteps = 75,
} = {}) {
    let best = Infinity;
    let since = 0;
    return {
        step({ dist, died }) {
            if (died) {
                best = Number.isFinite(dist) ? dist : Infinity;
                since = 0;
                return { penalty: 0, abort: false };
            }
            if (Number.isFinite(dist) && dist < best - 2) {
                best = dist;
                since = 0;
                return { penalty: 0, abort: false };
            }
            since += 1;
            if (since >= abortSteps) return { penalty: penaltyPerStep, abort: true };
            if (since > graceSteps) return { penalty: penaltyPerStep, abort: false };
            return { penalty: 0, abort: false };
        },
    };
}

/**
 * Terminal outcome bonus shared by rollout and JEV recording.
 * Speed-shaped so the speedrun loop optimizes time, not just clears:
 * 5 base + up to 5 for fast clears (120s scale), plus 2 for beating the
 * recorded best for the level. Failures score 0 here; their signal comes
 * from accumulated stepReward + death penalties.
 */
export function terminalBonus({ won, timeMs, bestMs } = {}) {
    if (!won) return 0;
    const t = num(timeMs, 75_000);
    const speed = clamp((120_000 - t) / 120_000, 0, 1);
    let bonus = 5 + 5 * speed;
    if (Number.isFinite(Number(bestMs)) && t < Number(bestMs)) bonus += 2;
    return bonus;
}
