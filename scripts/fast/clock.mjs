// Instantiated only in disposable automation pages; the shipped game is untouched.
export function createSimulationClock(host) {
    const NativeDate = host.Date;
    const realNow = host.performance.now.bind(host.performance);
    const nativeClearTimeout = host.clearTimeout.bind(host);
    const nativeClearInterval = host.clearInterval.bind(host);
    let now = 1000;
    let sequence = 1000000;
    const timers = new Map();
    const frames = new Map();
    const epoch = 1700000000000;
    host.Date = class extends NativeDate {
        constructor(...args) {
            super(...(args.length ? args : [epoch + now]));
        }
        static now() {
            return Math.floor(epoch + now);
        }
    };
    Object.defineProperty(host.performance, 'now', { configurable: true, value: () => now });
    function schedule(fn, delay, args, repeat) {
        if (typeof fn !== 'function') throw new Error('Simulation timers require a function');
        const interval = Math.max(1, Number(delay) || 0);
        timers.set(++sequence, { fn, at: now + interval, args, repeat, interval });
        return sequence;
    }
    host.setTimeout = (fn, delay, ...args) => schedule(fn, delay, args, false);
    host.setInterval = (fn, delay, ...args) => schedule(fn, delay, args, true);
    const clear = (id) => {
        timers.delete(id);
        nativeClearTimeout(id);
        nativeClearInterval(id);
    };
    host.clearTimeout = clear;
    host.clearInterval = clear;
    host.requestAnimationFrame = (fn) => {
        frames.set(++sequence, fn);
        return sequence;
    };
    host.cancelAnimationFrame = (id) => frames.delete(id);
    return {
        realNow,
        now: () => now,
        reset() {
            now = 1000;
            timers.clear();
            frames.clear();
        },
        advance(delta) {
            now += delta;
            // Snapshot the queue: callbacks scheduled by callbacks run next tick.
            for (const [id, timer] of [...timers]) {
                if (!timers.has(id) || timer.at > now) continue;
                if (timer.repeat) timer.at = now + timer.interval;
                else timers.delete(id);
                timer.fn(...timer.args);
            }
            const pending = [...frames];
            for (const [id, fn] of pending) {
                if (!frames.delete(id)) continue;
                fn(now);
            }
        },
    };
}
