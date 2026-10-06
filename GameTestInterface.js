export const GAME_TEST_ACTIONS = Object.freeze([
    'start',
    'wait',
    'move_left',
    'move_right',
    'fire',
    'fire_left',
    'fire_right',
    'jump',
    'jump_left',
    'jump_right',
]);

const ACTION_INPUTS = Object.freeze({
    start: Object.freeze({ left: false, right: false, jump: false, shoot: false, start: true }),
    wait: Object.freeze({ left: false, right: false, jump: false, shoot: false, start: false }),
    move_left: Object.freeze({ left: true, right: false, jump: false, shoot: false, start: false }),
    move_right: Object.freeze({
        left: false,
        right: true,
        jump: false,
        shoot: false,
        start: false,
    }),
    fire: Object.freeze({ left: false, right: false, jump: false, shoot: true, start: false }),
    fire_left: Object.freeze({ left: true, right: false, jump: false, shoot: true, start: false }),
    fire_right: Object.freeze({
        left: false,
        right: true,
        jump: false,
        shoot: true,
        start: false,
    }),
    jump: Object.freeze({ left: false, right: false, jump: true, shoot: false, start: false }),
    jump_left: Object.freeze({ left: true, right: false, jump: true, shoot: false, start: false }),
    jump_right: Object.freeze({
        left: false,
        right: true,
        jump: true,
        shoot: false,
        start: false,
    }),
});

function round(value) {
    return Number.isFinite(value) ? Math.round(value) : null;
}

function directionOf(vx, vy) {
    const horizontal = vx > 5 ? 'right' : vx < -5 ? 'left' : '';
    const vertical = vy > 5 ? 'down' : vy < -5 ? 'up' : '';
    return [vertical, horizontal].filter(Boolean).join('_') || 'stationary';
}

function phaseOf(snapshot) {
    if (!snapshot || !snapshot.ready) return 'loading';
    if (snapshot.gameOver || snapshot.pendingLevel != null) return 'complete';
    if (snapshot.dying || snapshot.transitioning) return 'transitioning';
    if (snapshot.awaitingStart) return 'awaiting_start';
    if (snapshot.physicsPaused) return 'paused';
    return 'playing';
}

function availableActionsFor(phase, snapshot) {
    if (phase === 'awaiting_start') return ['start'];
    if (phase !== 'playing') return ['wait'];
    const actions = ['wait', 'move_left', 'move_right', 'fire', 'fire_left', 'fire_right'];
    const jumpsRemaining = Math.max(
        0,
        (snapshot && snapshot.maxJumps ? snapshot.maxJumps : 0) -
            (snapshot && snapshot.jumpCount ? snapshot.jumpCount : 0)
    );
    if (jumpsRemaining > 0) actions.push('jump', 'jump_left', 'jump_right');
    return actions;
}

function relativeItem(item, player) {
    const vx = round(item.vx) ?? 0;
    const vy = round(item.vy) ?? 0;
    const result = {
        id: item.id || null,
        type: item.type || null,
        dx: round(item.x - player.x),
        dy: round(item.y - player.y),
        width: round(item.w),
        height: round(item.h),
        left: round(item.left - player.x),
        right: round(item.right - player.x),
        top: round(item.top - player.y),
        active: item.active !== false && item.enable !== false,
    };
    if (item.bonkable) {
        result.bonkable = true;
    }
    const moving =
        item.type === 'moving_platform' || item.type === 'drone' || item.type === 'rover';
    if (moving || Math.abs(vx) > 5 || Math.abs(vy) > 5) {
        result.vx = vx;
        result.vy = vy;
        result.direction = item.direction || directionOf(vx, vy);
    }
    if (item.phase) result.phase = item.phase;
    if (Number.isFinite(item.timeUntilPhaseChangeMs)) {
        result.timeUntilPhaseChangeMs = round(item.timeUntilPhaseChangeMs);
    }
    if (item.orientation) result.orientation = item.orientation;
    if (item.origin || item.target) {
        result.path = {
            from: item.origin
                ? { dx: round(item.origin.x - player.x), dy: round(item.origin.y - player.y) }
                : null,
            to: item.target
                ? { dx: round(item.target.x - player.x), dy: round(item.target.y - player.y) }
                : null,
            durationMs: round(item.durationMs),
        };
    }
    return result;
}

function nearest(items, player, limit) {
    return (items || [])
        .filter((item) => item && Number.isFinite(item.x) && Number.isFinite(item.y))
        .map((item) => ({
            item,
            distance: Math.hypot(item.x - player.x, item.y - player.y),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit)
        .map(({ item }) => relativeItem(item, player));
}

function relativeSchedule(schedule, player) {
    return {
        id: schedule.id,
        type: schedule.type,
        dx: round(schedule.x - player.x),
        dy: round(schedule.y - player.y),
        phase: schedule.phase,
        timeUntilPhaseChangeMs: round(schedule.timeUntilPhaseChangeMs),
        warningDurationMs: round(schedule.warningDurationMs),
        activeDurationMs: round(schedule.activeDurationMs),
        intervalMs: round(schedule.intervalMs),
    };
}

function supportPlatform(player, platforms) {
    const footY = player.y + 22;
    return (platforms || [])
        .filter(
            (platform) =>
                platform.active !== false &&
                platform.enable !== false &&
                player.x >= platform.left - 8 &&
                player.x <= platform.right + 8 &&
                Math.abs(platform.top - footY) < 70
        )
        .sort((a, b) => Math.abs(a.top - footY) - Math.abs(b.top - footY))[0];
}

function nextPlatformTowardGoal(player, platforms, direction) {
    return (platforms || [])
        .filter((platform) => {
            if (platform.active === false || platform.enable === false) return false;
            const nearEdge = direction > 0 ? platform.left : platform.right;
            const distance = (nearEdge - player.x) * direction;
            const verticalDelta = platform.top - player.y;
            return distance > 12 && distance < 700 && verticalDelta > -240 && verticalDelta < 180;
        })
        .sort((a, b) => {
            const edgeA = direction > 0 ? a.left : a.right;
            const edgeB = direction > 0 ? b.left : b.right;
            return (edgeA - edgeB) * direction;
        })[0];
}

// eslint-disable-next-line complexity
function buildNavigation(snapshot, player) {
    const platforms = snapshot.platforms || [];
    const goalDx = snapshot.crown ? snapshot.crown.x - player.x : 1;
    const direction = goalDx < 0 ? -1 : 1;
    const support = supportPlatform(player, platforms);
    const next = nextPlatformTowardGoal(player, platforms, direction);
    const edge = support ? (direction > 0 ? support.right : support.left) : null;
    const distanceToEdge = edge == null ? null : (edge - player.x) * direction;
    const nextEdge = next ? (direction > 0 ? next.left : next.right) : null;
    const gapWidth = edge == null || nextEdge == null ? null : (nextEdge - edge) * direction;
    const threats = (snapshot.hazards || [])
        .concat(snapshot.bombs || [])
        .filter((hazard) => {
            const ahead = (hazard.x - player.x) * direction;
            const verticalOverlap =
                player.y + 24 > hazard.top && player.y - 24 < hazard.y + hazard.h / 2;
            const dangerousPhase = hazard.phase !== 'cooldown' && hazard.active !== false;
            return ahead > 0 && ahead < 180 && verticalOverlap && dangerousPhase;
        })
        .sort((a, b) => Math.abs(a.x - player.x) - Math.abs(b.x - player.x));
    return {
        directionToGoal: direction > 0 ? 'right' : 'left',
        supportPlatformId: support?.id || null,
        ridingMovingPlatform: support?.type === 'moving_platform',
        distanceToSupportEdge: round(distanceToEdge),
        gapAhead: Boolean(distanceToEdge != null && distanceToEdge < 120 && gapWidth > 24),
        gapWidth: round(gapWidth),
        landingWindow: next
            ? {
                  platformId: next.id || null,
                  type: next.type || null,
                  left: round(next.left - player.x),
                  right: round(next.right - player.x),
                  top: round(next.top - player.y),
                  moving: next.type === 'moving_platform',
                  vx: round(next.vx) ?? 0,
                  vy: round(next.vy) ?? 0,
                  direction: next.direction || directionOf(next.vx || 0, next.vy || 0),
              }
            : null,
        immediateThreat: threats[0] ? relativeItem(threats[0], player) : null,
    };
}

export function normalizeTestSeed(seed, fallback = 1) {
    if (seed == null || seed === '') return fallback;
    const number = Number(seed);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(0, Math.min(2_147_483_647, Math.floor(number)));
}

export function normalizeTestAction(action) {
    const name = typeof action === 'string' ? action : action && action.name;
    return Object.hasOwn(ACTION_INPUTS, name) ? name : null;
}

export function createTestObservation(snapshot, seed = null) {
    const phase = phaseOf(snapshot);
    const player = snapshot && snapshot.player;
    const observation = {
        schemaVersion: 2,
        seed,
        phase,
        level: snapshot ? snapshot.level : null,
        deaths: snapshot ? snapshot.deaths : null,
        elapsedMs: snapshot ? round(snapshot.elapsedMs) : null,
        simulationTimeScale: snapshot ? snapshot.simulationTimeScale || 1 : 1,
        availableActions: availableActionsFor(phase, snapshot),
    };
    if (!player) return observation;

    const crown = snapshot.crown;
    observation.player = {
        x: round(player.x),
        y: round(player.y),
        vx: round(player.vx),
        vy: round(player.vy),
        grounded: Boolean(player.grounded),
        jumpsRemaining: Math.max(0, (snapshot.maxJumps || 0) - (snapshot.jumpCount || 0)),
    };
    observation.canShoot = snapshot.phaser === true;
    observation.objective = crown
        ? {
              kind: 'collect_crown',
              dx: round(crown.x - player.x),
              dy: round(crown.y - player.y),
              distance: round(Math.hypot(crown.x - player.x, crown.y - player.y)),
          }
        : { kind: 'collect_crown', unavailable: true };
    observation.world = {
        width: round(snapshot.worldWidth),
        height: round(snapshot.worldHeight),
        killZoneY: round(snapshot.killZoneY),
    };
    observation.nearby = {
        platforms: nearest(
            (snapshot.platforms || []).filter((item) => item.type !== 'moving_platform'),
            player,
            6
        ),
        movingPlatforms: nearest(snapshot.movingPlatforms, player, 4),
        hazards: nearest(snapshot.hazards, player, 6),
        bombs: nearest(snapshot.bombs, player, 3),
        rayColumns: nearest(snapshot.columns, player, 2),
        timedHazards: (snapshot.hazardSchedules || [])
            .slice()
            .sort((a, b) => Math.abs(a.x - player.x) - Math.abs(b.x - player.x))
            .slice(0, 4)
            .map((schedule) => relativeSchedule(schedule, player)),
    };
    observation.navigation = buildNavigation(snapshot, player);
    return observation;
}

export function checkTestObjectives(snapshot) {
    const phase = phaseOf(snapshot);
    if (snapshot && snapshot.gameOver) {
        return {
            status: 'passed',
            passed: true,
            objective: 'complete_run',
            level: snapshot.level,
            deaths: snapshot.deaths,
        };
    }
    if (snapshot && snapshot.pendingLevel != null) {
        return {
            status: 'passed',
            passed: true,
            objective: 'complete_level',
            level: snapshot.level,
            nextLevel: snapshot.pendingLevel,
            deaths: snapshot.deaths,
        };
    }
    return {
        status: phase === 'transitioning' ? 'retrying' : 'active',
        passed: false,
        objective: 'collect_crown',
        level: snapshot ? snapshot.level : null,
        deaths: snapshot ? snapshot.deaths : null,
    };
}

export class GameTestInterface {
    constructor(scene, target) {
        this.scene = scene;
        this.target = target;
        this.previousEntityStates = new Map();
    }

    observe() {
        const snapshot = this.scene.getBotSnapshot();
        this.enrichObservedMotion(snapshot);
        return createTestObservation(snapshot, this.scene.testSeed);
    }

    act(action) {
        const name = normalizeTestAction(action);
        if (!this.scene.debugMode) {
            return { ok: false, error: 'debug_mode_required' };
        }
        if (!name) {
            return { ok: false, error: 'unsupported_action', availableActions: GAME_TEST_ACTIONS };
        }
        const input = { ...ACTION_INPUTS[name] };
        this.target.__spaceChickenBotInput = input;
        return { ok: true, action: name, input: { ...input } };
    }

    reset(seed = this.scene.testSeed) {
        if (!this.scene.debugMode) {
            return { ok: false, error: 'debug_mode_required' };
        }
        const normalizedSeed = normalizeTestSeed(seed);
        this.clear();
        this.scene.scene.restart({
            level: this.scene.level,
            deathCount: 0,
            coopMode: null,
            testSeed: normalizedSeed,
        });
        return { ok: true, seed: normalizedSeed };
    }

    checkObjectives() {
        return checkTestObjectives(this.scene.getBotSnapshot());
    }

    captureReport() {
        this.target.__spaceChickenBotInput = {
            left: false,
            right: false,
            jump: false,
            shoot: false,
            start: false,
        };
        const snapshot = this.scene.getBotSnapshot();
        this.enrichObservedMotion(snapshot);
        const result = {
            observation: createTestObservation(snapshot, this.scene.testSeed),
            objective: checkTestObjectives(snapshot),
        };
        // Pausing physics from console in production would let a pasted snippet
        // freeze another player's game, so only pause in debug mode.
        if (this.scene.debugMode) {
            this.scene.physics?.pause?.();
        }
        return result;
    }

    clear() {
        this.target.__spaceChickenBotInput = null;
        this.previousEntityStates.clear();
    }

    enrichObservedMotion(snapshot) {
        const capturedAtMs = snapshot.capturedAtMs;
        if (!Number.isFinite(capturedAtMs)) return;
        const current = new Map();
        const items = (snapshot.platforms || [])
            .concat(snapshot.hazards || [])
            .concat(snapshot.bombs || []);
        for (const item of items) {
            if (!item.id || !Number.isFinite(item.x) || !Number.isFinite(item.y)) continue;
            if (!current.has(item.id)) current.set(item.id, { x: item.x, y: item.y, capturedAtMs });
            const previous = this.previousEntityStates.get(item.id);
            const deltaMs = previous ? capturedAtMs - previous.capturedAtMs : 0;
            if (previous && deltaMs >= 50) {
                item.vx = ((item.x - previous.x) * 1000) / deltaMs;
                item.vy = ((item.y - previous.y) * 1000) / deltaMs;
                item.direction = directionOf(item.vx, item.vy);
            }
        }
        this.previousEntityStates = current;
        const byId = new Map(items.filter((item) => item.id).map((item) => [item.id, item]));
        for (const item of snapshot.movingPlatforms || []) {
            const enriched = byId.get(item.id);
            if (enriched) {
                item.vx = enriched.vx;
                item.vy = enriched.vy;
                item.direction = enriched.direction;
            }
        }
    }
}
