import { createSimulationClock } from './clock.mjs';

// Serialized into the browser by installFastRuntime. No Node dependencies here.
export function installSimulation(clockFactory) {
    if (window.__spaceChickenFast) throw new Error('Fast runtime already installed');
    const game = window.SPACE_CHICKEN_GAME;
    if (!window.__spaceChickenDebug?.ready()) throw new Error('Game is not ready');
    game.loop.stop();
    const clock = clockFactory(window);
    const dt = 1000 / 60;
    let ticks = 0;
    let render = false;
    let randomState = 1;
    let episodeStart = clock.now();
    let policy = null;
    let progress = null;
    let stopped = false;
    let cachedObservation = null;
    function observe() {
        // observe() estimates mover velocity from the previous observation.
        // Calling it twice at the same tick would erase that estimate.
        if (!cachedObservation) cachedObservation = window.__spaceChickenTest.observe();
        return cachedObservation;
    }
    Math.random = () => {
        randomState ^= randomState << 13;
        randomState ^= randomState >>> 17;
        randomState ^= randomState << 5;
        return (randomState >>> 0) / 4294967296;
    };
    const terminal = () => {
        const scene = game.scene.getScenes(true).find((item) => item.player);
        return Boolean(scene && (scene.gameOver || scene.pendingSceneData?.level != null));
    };
    function step() {
        clock.advance(dt);
        game.loop.time = clock.now();
        game.loop.now = clock.now();
        game.loop.delta = dt;
        if (render) game.step(clock.now(), dt);
        else {
            game.headlessStep(clock.now(), dt);
            // Camera tracking is part of render(), but affects gameplay queries.
            for (const scene of game.scene.getScenes(true)) {
                for (const camera of scene.cameras.cameras) {
                    if (camera.visible && camera.alpha > 0) camera.preRender();
                }
            }
        }
        ticks++;
        cachedObservation = null;
        if (window.__spaceChickenPilotError) throw Error(window.__spaceChickenPilotError);
    }
    function reset({ seed = 1, draw = false } = {}) {
        window.__spaceChickenPilotStop?.();
        window.__spaceChickenPilotInstalled = false;
        window.__spaceChickenPilotOutcome = null;
        window.__spaceChickenPilotError = null;
        clock.reset();
        game.loop.time = clock.now();
        for (const scene of game.scene.getScenes(true)) scene.time.now = clock.now();
        randomState = Number(seed) >>> 0 || 1;
        render = draw;
        policy = null;
        progress = null;
        stopped = false;
        const result = window.__spaceChickenTest.reset(seed);
        if (!result.ok) throw Error('Scene reset rejected');
        // Process the queued restart with the controlled clock before observations.
        step();
        step();
        ticks = 0;
        episodeStart = clock.now();
        if (!window.__spaceChickenDebug.ready()) throw Error('Scene reset did not finish');
    }
    function status() {
        return {
            ticks,
            simulatedMs: ticks * dt,
            won: terminal(),
            observation: observe(),
        };
    }
    function pilotBatch({ count = 600, record = false, inputs = null } = {}) {
        const started = clock.realNow();
        const actions = [];
        const states = [];
        for (let i = 0; i < count && !terminal(); i++) {
            if (inputs) window.__spaceChickenDebug.setBotInput(inputs[i]);
            step();
            if (record) {
                actions.push({ ...window.__spaceChickenBotInput });
                const scene = game.scene.getScenes(true).find((item) => item.player);
                const projectiles = (scene?.phaserBolts?.getChildren() || []).map((bolt) => ({
                    x: bolt.x,
                    y: bolt.y,
                    active: bolt.active,
                    vx: bolt.body?.velocity.x,
                    vy: bolt.body?.velocity.y,
                    enabled: bolt.body?.enable,
                }));
                states.push({
                    ...window.__spaceChickenDebug.getBotSnapshot(),
                    projectiles,
                    objectives: window.__spaceChickenTest.checkObjectives(),
                });
            }
            if (clock.realNow() - started > 10000) throw Error('Simulation batch exceeded 10s');
        }
        return { ...status(), actions, states, computeMs: clock.realNow() - started };
    }
    function configurePolicy(options) {
        const { features: f } = window.__spaceChickenPolicyModules;
        if (
            options.weights.obsSize !== f.OBS_SIZE ||
            options.weights.actionSize !== f.ACTION_NAMES.length
        ) {
            throw Error('Policy contract mismatch');
        }
        policy = options;
        progress = f.createProgressTracker();
    }
    function policyBatch({ decisions = 64, maxTicks } = {}) {
        if (!policy) throw Error('No policy configured');
        const { features: f, inference } = window.__spaceChickenPolicyModules;
        const steps = [];
        const decisionTicks = Math.max(1, Math.round(policy.decisionMs / dt));
        const started = clock.realNow();
        for (let i = 0; i < decisions && ticks < maxTicks && !stopped; i++) {
            const api = window.__spaceChickenTest;
            api.act('wait');
            const before = observe();
            const obs = f.encodeObservation(before);
            const mask = f.availableMask(before.availableActions);
            const { probs } = f.maskedProbs(
                f.applyTemperature(
                    inference.forwardPolicy(policy.weights, obs),
                    policy.temperature
                ),
                before.availableActions
            );
            // Separate policy RNG: sampling must not perturb game randomness.
            policy.rng = (Math.imul(policy.rng, 1664525) + 1013904223) >>> 0;
            let roll = policy.rng / 4294967296;
            let index = probs.length - 1;
            for (let k = 0; k < probs.length; k++) {
                roll -= probs[k];
                if (roll < 0) {
                    index = k;
                    break;
                }
            }
            const action = f.ACTION_NAMES[index];
            const atMs = clock.now() - episodeStart;
            api.act(action);
            for (let j = 0; j < decisionTicks && ticks < maxTicks; j++) {
                step();
                if (terminal()) break;
            }
            const next = observe();
            const won = terminal();
            const track = progress.step({
                dist: Number(next.objective?.distance),
                died: Number(next.deaths) > Number(before.deaths),
            });
            stopped = won || track.abort || ticks >= maxTicks;
            let reward = f.stepReward(before, next, { action }) + policy.stepCost + track.penalty;
            if (stopped)
                reward += f.terminalBonus({ won, timeMs: next.elapsedMs, bestMs: policy.bestMs });
            steps.push({
                type: 'step',
                obs,
                action: index,
                actionName: action,
                behaviorLogProb: Math.log(Math.max(probs[index], 1e-9)),
                mask,
                reward,
                nextObs: next,
                terminated: won,
                truncated: stopped && !won,
                meta: { atMs },
            });
            if (clock.realNow() - started > 10000) throw Error('Policy batch exceeded 10s');
        }
        return { ...status(), steps, stopped, computeMs: clock.realNow() - started };
    }
    window.__spaceChickenFast = { reset, status, pilotBatch, configurePolicy, policyBatch };
}

export async function installFastRuntime(page) {
    await page.evaluate(`(${installSimulation.toString()})(${createSimulationClock.toString()})`);
}
