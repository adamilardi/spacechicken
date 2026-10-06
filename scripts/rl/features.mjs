/**
 * Shared observation feature encoder for the Space Chicken RL stack (contract v2).
 *
 * Single source of truth for obs layout: scripts/rl/convert-jev.mjs uses it
 * to build training vectors, scripts/rl/play-policy.mjs uses it for live
 * inference, and the JEV recorder stores raw observations that this module
 * encodes. Layout must match rl/contract.json (obsVersion 2, 70 floats).
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

function nearest(list, count, key = 'dx') {
    const items = Array.isArray(list) ? [...list] : [];
    items.sort((a, b) => Math.abs(num(a?.[key])) - Math.abs(num(b?.[key])));
    return items.slice(0, count);
}

/**
 * Encode a full observation (or legacy partial step) into the 70-float
 * contract vector: 12 goal/ego features, then 58 board slots.
 */
export function encodeObservation(step) {
    const player = step.player || {};
    const objective = step.objective || {};
    const nearby = step.nearby || {};
    const navigation = step.navigation || {};
    const world = step.world || {};
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

    const timed = nearest(nearby.timedHazards, 1)[0];
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

    return vec;
}

/**
 * Shaped step reward shared by the recorder and the converter:
 * forward progress toward the crown, minus death.
 */
export function stepReward(previous, current) {
    const prevDist = num(previous?.objective?.distance, NaN);
    const dist = num(current?.objective?.distance, NaN);
    let reward = 0;
    if (Number.isFinite(prevDist) && Number.isFinite(dist)) {
        reward += clamp((prevDist - dist) / 500, -1, 1);
    }
    if (num(current?.deaths) > num(previous?.deaths)) reward -= 1;
    return reward;
}
