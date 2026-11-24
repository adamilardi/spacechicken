// Anonymous gameplay analytics for Space Chicken.
//
// The manager queues small gameplay events (session start, level starts and
// completions, deaths, periodic playtime pings) and POSTs them in batches to
// the Cloudflare Pages Function at /api/analytics, which stores them in D1.
// Nothing personally identifying is collected: no names, no IPs stored, no
// cookies — just a random per-page-load session id and gameplay counters.
//
// Tracking never breaks play: every send is fire-and-forget, failures are
// swallowed, and debug/bot sessions are excluded so local testing and bots
// never pollute production numbers.
//
// The Phaser scene is recreated on every level transition, so page-level
// session state (session id, playtime clock, timers) lives on a shared
// globalThis holder and is reused by each new manager instance.

const ANALYTICS_ENDPOINT = './api/analytics';
const FLUSH_INTERVAL_MS = 10000;
const HEARTBEAT_INTERVAL_MS = 60000;
const MAX_QUEUE = 100;
const SESSION_KEY = '__spaceChickenAnalyticsSession';

function randomSessionId() {
    try {
        return globalThis.crypto?.randomUUID?.() || null;
    } catch {
        return null;
    }
}

function fallbackSessionId() {
    return `anon-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export function __resetAnalyticsSessionForTests() {
    const holder = globalThis[SESSION_KEY];
    if (holder?.flushTimer) {
        clearInterval(holder.flushTimer);
    }
    if (holder?.heartbeatTimer) {
        clearInterval(holder.heartbeatTimer);
    }
    delete globalThis[SESSION_KEY];
}

function getSessionHolder() {
    let holder = globalThis[SESSION_KEY];
    if (!holder) {
        holder = {
            sessionId: randomSessionId() || fallbackSessionId(),
            sessionStarted: false,
            playStartWall: 0,
            hiddenMs: 0,
            hiddenSince: 0,
            levelsCompleted: 0,
            deaths: 0,
            flushTimer: null,
            heartbeatTimer: null,
            endSent: false,
            managers: new Set(),
        };
        globalThis[SESSION_KEY] = holder;
    }
    return holder;
}

function guessInputKind() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        return 'unknown';
    }
    try {
        if (navigator.maxTouchPoints > 0 && window.matchMedia?.('(pointer: coarse)')?.matches) {
            return 'touch';
        }
    } catch {
        // Media query unavailable; fall through to the touch-point check.
    }
    return navigator.maxTouchPoints > 0 ? 'touch' : 'desktop';
}

export class AnalyticsManager {
    constructor(scene) {
        this.scene = scene;
        this.holder = getSessionHolder();
        this.holder.managers.add(this);
        this.queue = [];
        this.transport = null;
        this.lastLevelStartWall = 0;
        // Debug, bot, and headless-test sessions would skew real numbers.
        this.enabled = !scene?.debugMode && !scene?.launchBot;
    }

    get sessionId() {
        return this.holder.sessionId;
    }

    get mode() {
        return this.scene?.difficulty === 'hard' ? 'hard' : 'normal';
    }

    // Tests inject a fake transport; production uses fetch/sendBeacon.
    setTransport(transport) {
        this.transport = transport;
        return this;
    }

    endpointUrl() {
        if (typeof window === 'undefined' || !window.location) {
            return '/api/analytics';
        }
        try {
            return new URL(ANALYTICS_ENDPOINT, window.location.href).toString();
        } catch {
            return '/api/analytics';
        }
    }

    trackSessionStart() {
        if (!this.enabled || this.holder.sessionStarted) {
            this.ensureTimers();
            return;
        }
        this.holder.sessionStarted = true;
        this.enqueue({ type: 'session_start', kind: guessInputKind() });
        this.ensureTimers();
        this.bindPagehide();
        // Flush the session_start promptly so even short bounces are counted.
        this.flush();
    }

    trackLevelStart(level) {
        if (!this.enabled) return;
        this.lastLevelStartWall = Date.now();
        if (!this.holder.playStartWall) {
            this.holder.playStartWall = Date.now();
        }
        this.enqueue({ type: 'level_start', level });
    }

    trackLevelComplete(level, durationMs, deaths = 0) {
        if (!this.enabled) return;
        this.holder.levelsCompleted += 1;
        this.enqueue({
            type: 'level_complete',
            level,
            value: Math.round(durationMs),
            count: deaths,
        });
        this.flush();
    }

    trackDeath(level, kind = 'hazard') {
        if (!this.enabled) return;
        this.holder.deaths += 1;
        const attemptMs = this.lastLevelStartWall ? Date.now() - this.lastLevelStartWall : 0;
        this.enqueue({ type: 'death', level, kind, value: Math.round(attemptMs), count: 1 });
        if (this.queue.length >= 10) {
            this.flush();
        }
    }

    // Active tab time since first play, excluding backgrounded time.
    activePlayMs() {
        if (!this.holder.playStartWall) {
            return 0;
        }
        let hidden = this.holder.hiddenMs;
        if (this.holder.hiddenSince) {
            hidden += Date.now() - this.holder.hiddenSince;
        }
        return Math.max(0, Date.now() - this.holder.playStartWall - hidden);
    }

    sendHeartbeat() {
        if (!this.enabled || !this.holder.sessionStarted) return;
        this.enqueue({
            type: 'session_ping',
            value: Math.round(this.activePlayMs()),
            count: this.holder.levelsCompleted,
        });
        this.flush();
    }

    sendSessionEnd() {
        if (!this.enabled || !this.holder.sessionStarted || this.holder.endSent) {
            return Promise.resolve();
        }
        this.holder.endSent = true;
        this.enqueue({
            type: 'session_end',
            value: Math.round(this.activePlayMs()),
            count: this.holder.levelsCompleted,
        });
        return this.flush({ beacon: true });
    }

    enqueue(event) {
        if (!this.enabled || !event || !event.type) return;
        this.queue.push({
            type: String(event.type),
            level: Number.isInteger(event.level) ? event.level : null,
            mode: this.mode,
            value: Number.isFinite(event.value) ? Math.max(0, Math.round(event.value)) : 0,
            count: Number.isFinite(event.count) ? Math.max(0, Math.round(event.count)) : 0,
            kind: typeof event.kind === 'string' ? event.kind.slice(0, 32) : null,
        });
        if (this.queue.length > MAX_QUEUE) {
            this.queue.splice(0, this.queue.length - MAX_QUEUE);
        }
    }

    flush(options = {}) {
        if (!this.enabled || this.queue.length === 0) {
            return Promise.resolve();
        }
        const events = this.queue.splice(0, this.queue.length);
        const payload = JSON.stringify({ session: this.holder.sessionId, events });
        if (this.transport) {
            return Promise.resolve()
                .then(() => this.transport(payload, options))
                .catch(() => null);
        }
        // Beacon first on pagehide: it survives page teardown.
        if (
            options.beacon &&
            typeof navigator !== 'undefined' &&
            typeof navigator.sendBeacon === 'function'
        ) {
            try {
                if (navigator.sendBeacon(this.endpointUrl(), payload)) {
                    return Promise.resolve();
                }
            } catch {
                // Fall through to fetch below.
            }
        }
        if (typeof fetch !== 'function') {
            return Promise.resolve();
        }
        return fetch(this.endpointUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
        })
            .then(() => null)
            .catch(() => null);
    }

    ensureTimers() {
        if (!this.enabled || typeof window === 'undefined') return;
        if (!this.holder.flushTimer) {
            this.holder.flushTimer = setInterval(() => {
                for (const manager of this.holder.managers) {
                    manager.flush();
                }
            }, FLUSH_INTERVAL_MS);
            if (this.holder.flushTimer?.unref) {
                this.holder.flushTimer.unref();
            }
        }
        if (!this.holder.heartbeatTimer) {
            this.holder.heartbeatTimer = setInterval(() => {
                for (const manager of this.holder.managers) {
                    manager.sendHeartbeat();
                }
            }, HEARTBEAT_INTERVAL_MS);
            if (this.holder.heartbeatTimer?.unref) {
                this.holder.heartbeatTimer.unref();
            }
        }
        if (!this.holder.visibilityBound) {
            this.holder.visibilityBound = true;
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.holder.hiddenSince = Date.now();
                    for (const manager of this.holder.managers) {
                        manager.flush();
                    }
                } else if (this.holder.hiddenSince) {
                    this.holder.hiddenMs += Date.now() - this.holder.hiddenSince;
                    this.holder.hiddenSince = 0;
                }
            });
        }
    }

    bindPagehide() {
        if (this.holder.pagehideBound || typeof window === 'undefined') return;
        this.holder.pagehideBound = true;
        window.addEventListener('pagehide', () => {
            for (const manager of this.holder.managers) {
                manager.sendSessionEnd();
            }
        });
    }

    // Called on scene shutdown (level transitions recreate the scene, so this
    // flushes the queue but leaves the page-level session and timers alone).
    cleanup() {
        this.flush();
        this.holder.managers.delete(this);
    }
}
