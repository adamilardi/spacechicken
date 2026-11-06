import { AUDIO_SETTINGS, GAME_CONSTANTS } from './Constants.js';
import { LEVEL_IDS } from './levels/index.js';
import { formatElapsedTime, normalizeDifficulty } from './GameUtils.js';

export function normalizePlayerName(name) {
    if (typeof name !== 'string') {
        return 'Anonymous';
    }
    const normalized = name.trim().replace(/\s+/g, ' ');
    const truncated = Array.from(normalized)
        .slice(0, GAME_CONSTANTS.PLAYER_NAME_MAX_LENGTH)
        .join('');
    return truncated || 'Anonymous';
}

export function normalizeLeaderboardEntry(entry) {
    const time = typeof entry === 'number' ? entry : entry && entry.time;
    if (typeof time !== 'number' || !Number.isFinite(time) || time < 0) {
        return null;
    }
    const normalized = {
        time,
        name: normalizePlayerName(entry && typeof entry === 'object' ? entry.name : null),
    };
    const deaths = entry && typeof entry === 'object' ? entry.deaths : undefined;
    if (Number.isInteger(deaths) && deaths > 0) {
        normalized.deaths = deaths;
    }
    return normalized;
}

function normalizeLevel(level) {
    const parsed = Number(level);
    return LEVEL_IDS.includes(parsed) ? parsed : null;
}

function normalizeLeaderboard(data) {
    return Array.isArray(data)
        ? data
              .map(normalizeLeaderboardEntry)
              .filter(Boolean)
              .sort((a, b) => a.time - b.time)
              .slice(0, GAME_CONSTANTS.LEADERBOARD_MAX_ENTRIES)
        : [];
}

export class LeaderboardManager {
    constructor(scene) {
        this.scene = scene;
        this.runTokens = new Map();
        this.competitionCache = new Map();
        this.playerId = scene?.playerId || globalThis.crypto?.randomUUID?.() || null;
    }

    get mode() {
        return normalizeDifficulty(this.scene?.difficulty);
    }

    getStorage() {
        if (!this.scene?.storageAvailable || typeof window === 'undefined') {
            return null;
        }
        try {
            // Accessing the property itself can throw when browser storage is blocked.
            return window.localStorage || null;
        } catch {
            return null;
        }
    }

    levelBoardKey(level) {
        const prefix =
            this.mode === 'hard'
                ? GAME_CONSTANTS.STORAGE_HARD_LEVEL_PREFIX
                : GAME_CONSTANTS.STORAGE_LEVEL_PREFIX;
        return `${prefix}${level}`;
    }

    personalBestKey(level) {
        const prefix =
            this.mode === 'hard'
                ? GAME_CONSTANTS.PERSONAL_HARD_BEST_PREFIX
                : GAME_CONSTANTS.PERSONAL_BEST_PREFIX;
        return `${prefix}${level}`;
    }

    readLeaderboard(level) {
        const normalizedLevel = normalizeLevel(level);
        if (normalizedLevel === null) {
            return [];
        }
        const key = this.levelBoardKey(normalizedLevel);
        const storage = this.getStorage();
        if (!storage) {
            return [];
        }
        try {
            const raw = storage.getItem(key);
            if (!raw) {
                return [];
            }
            return normalizeLeaderboard(JSON.parse(raw));
        } catch (err) {
            console.error('Error reading leaderboard:', err);
            return [];
        }
    }

    writeLeaderboard(level, data) {
        const normalizedLevel = normalizeLevel(level);
        if (normalizedLevel === null) {
            return;
        }
        const key = this.levelBoardKey(normalizedLevel);
        const storage = this.getStorage();
        if (!storage) {
            return;
        }
        try {
            storage.setItem(key, JSON.stringify(normalizeLeaderboard(data)));
        } catch (err) {
            console.error('Error writing leaderboard:', err);
            this.scene.storageAvailable = false;
        }
    }

    saveTime(level, newTime, playerName, deaths = 0) {
        const normalizedLevel = level === 0 ? 0 : normalizeLevel(level);
        const entry = normalizeLeaderboardEntry({ time: newTime, name: playerName, deaths });
        if (normalizedLevel === null || !entry) {
            return false;
        }

        this.lastSubmission = this.saveTimeToFirebase(
            normalizedLevel,
            entry.time,
            entry.name,
            entry.deaths || 0
        );
        this.savePersonalBest(normalizedLevel, entry.time);
        if (!this.scene.storageAvailable || normalizedLevel === 0) {
            return true;
        }

        const leaderboard = this.readLeaderboard(normalizedLevel);
        leaderboard.push(entry);
        this.writeLeaderboard(normalizedLevel, leaderboard);
        return true;
    }

    saveTimeToFirebase(level, newTime, playerName, deaths = 0) {
        if (typeof fetch !== 'function') {
            return Promise.resolve(null);
        }
        const token = this.runTokens.get(level);
        const playerId = this.getPlayerId();
        return Promise.resolve(token)
            .then((runToken) => {
                if (!runToken || !playerId) return null;
                return fetch(this.getLeaderboardApiUrl(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        level,
                        time: newTime,
                        name: playerName,
                        deaths,
                        runToken,
                        playerId,
                        mode: this.mode,
                    }),
                });
            })
            .then((response) => {
                if (!response) return null;
                if (!response.ok) {
                    throw new Error(`Failed to save time: ${response.status}`);
                }
                return response.json();
            })
            .then((payload) => {
                if (!payload) return null;
                // Tokens are single-use server-side: drop ours so a later save
                // cannot resend a consumed token, and refresh cached boards so
                // the new time shows up immediately.
                this.runTokens.delete(level);
                this.competitionCache.delete(normalizeDifficulty(this.mode));
                return payload;
            })
            .catch((err) => {
                console.error('Online leaderboard save failed', err);
                return null;
            });
    }

    startRun(level) {
        if (typeof fetch !== 'function') return Promise.resolve(null);
        const playerId = this.getPlayerId();
        if (!playerId) return Promise.resolve(null);
        const url = this.getRunApiUrl();
        const request = fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ level, playerId, mode: this.mode }),
        })
            .then((response) => (response.ok ? response.json() : null))
            .then((payload) => payload?.token || null)
            .catch((error) => {
                console.error('Could not start online run', error);
                return null;
            });
        this.runTokens.set(level, request);
        return request;
    }

    getPlayerId() {
        const storage = this.getStorage();
        if (!storage) {
            return this.playerId;
        }
        try {
            const key = 'spaceChickenPlayerId';
            const stored = storage.getItem(key);
            if (/^[0-9a-f-]{36}$/i.test(stored || '')) return stored;
            const id = this.playerId;
            if (!id) return null;
            storage.setItem(key, id);
            return id;
        } catch {
            return this.playerId;
        }
    }

    getPersonalBest(level) {
        const storage = this.getStorage();
        if (!storage) {
            return null;
        }
        try {
            const value = Number(storage.getItem(this.personalBestKey(level)));
            return Number.isFinite(value) && value > 0 ? value : null;
        } catch {
            return null;
        }
    }

    savePersonalBest(level, time) {
        const storage = this.getStorage();
        if (!storage) {
            return false;
        }
        const previous = this.getPersonalBest(level);
        if (previous !== null && previous <= time) {
            return false;
        }
        try {
            storage.setItem(this.personalBestKey(level), String(time));
            return true;
        } catch {
            return false;
        }
    }

    getMaxUnlocked() {
        const max = LEVEL_IDS.length;
        const storage = this.getStorage();
        if (!storage) {
            return max;
        }
        try {
            const value = Number(storage.getItem('spaceChickenUnlocked'));
            if (!Number.isInteger(value)) {
                return 1;
            }
            return Math.min(max, Math.max(1, value));
        } catch {
            return 1;
        }
    }

    unlockLevel(level) {
        const max = LEVEL_IDS.length;
        const next = Math.min(max, Math.max(1, Math.floor(Number(level) || 1)));
        const current = this.getMaxUnlocked();
        if (next <= current) {
            return current;
        }
        const storage = this.getStorage();
        if (storage) {
            try {
                storage.setItem('spaceChickenUnlocked', String(next));
            } catch {
                return next;
            }
        }
        return next;
    }

    fetchCompetition(mode = this.mode) {
        if (typeof fetch !== 'function') {
            return Promise.resolve(null);
        }
        const scope = normalizeDifficulty(mode);
        const cached = this.competitionCache.get(scope);
        if (cached && Date.now() - cached.at < GAME_CONSTANTS.COMPETITION_CACHE_MS) {
            return Promise.resolve(cached.data);
        }
        return fetch(`${this.getLeaderboardApiUrl()}?mode=${scope}`)
            .then((response) => {
                if (!response.ok) throw new Error(`Failed to load leaderboard: ${response.status}`);
                return response.json();
            })
            .then((payload) => {
                this.competitionCache.set(scope, { at: Date.now(), data: payload });
                return payload;
            })
            .catch((err) => {
                console.error('Online leaderboard load failed', err);
                return null;
            });
    }

    fetchFirebaseLeaderboards() {
        if (typeof fetch !== 'function') {
            return Promise.resolve(null);
        }
        return this.fetchCompetition()
            .then((payload) => (payload && payload.levels ? payload.levels : null))
            .catch((err) => {
                console.error('Online leaderboard load failed', err);
                return null;
            });
    }

    getRunApiUrl() {
        const base = this.getLeaderboardApiUrl();
        try {
            return new URL('./run', base.replace(/\/+$/, '')).toString();
        } catch {
            return '/api/run';
        }
    }

    getLeaderboardApiUrl() {
        if (typeof window === 'undefined' || !window.location) {
            return '/api/leaderboard';
        }
        return new URL('./api/leaderboard', window.location.href).toString();
    }

    formatTimes(times) {
        return times
            .map((entry, index) => {
                const normalized = normalizeLeaderboardEntry(entry);
                if (!normalized) {
                    return null;
                }
                const { time, name, deaths } = normalized;
                const suffix = deaths ? ` · ${deaths} deaths` : '';
                return `${index + 1}. ${formatElapsedTime(time)} - ${name}${suffix}`;
            })
            .filter(Boolean)
            .join('\n');
    }

    loadPlayerName() {
        const storage = this.getStorage();
        if (!storage) {
            return null;
        }
        try {
            const stored = storage.getItem(AUDIO_SETTINGS.PLAYER_NAME_KEY);
            if (!stored) {
                return null;
            }
            return normalizePlayerName(stored);
        } catch (err) {
            console.error('Error loading player name:', err);
            return null;
        }
    }

    savePlayerName(name) {
        const storage = this.getStorage();
        if (!storage) {
            return;
        }
        try {
            storage.setItem(AUDIO_SETTINGS.PLAYER_NAME_KEY, normalizePlayerName(name));
        } catch (err) {
            console.error('Error saving player name:', err);
        }
    }

    shouldPromptForName(previousBest) {
        if (this.scene?.debugMode || previousBest !== null) {
            return false;
        }
        if (!this.scene?.storageAvailable) {
            return false;
        }
        return this.loadPlayerName() === null;
    }

    ensurePlayerName(forcePrompt = false) {
        const storedName = this.loadPlayerName();
        const managerName = typeof this.playerName === 'string' ? this.playerName.trim() : '';
        const sceneName =
            this.scene && typeof this.scene.playerName === 'string'
                ? this.scene.playerName.trim()
                : '';
        const currentName = storedName || managerName || sceneName;

        if (!forcePrompt) {
            const fallback = normalizePlayerName(currentName);
            this.playerName = fallback;
            return fallback;
        }
        if (typeof window === 'undefined' || typeof window.prompt !== 'function') {
            const fallback = normalizePlayerName(currentName);
            this.playerName = fallback;
            return fallback;
        }
        const defaultValue = currentName;
        const response = window.prompt('Enter your name for the leaderboard:', defaultValue);
        let finalName;
        if (response === null) {
            finalName = currentName;
        } else {
            finalName = response;
        }
        finalName = normalizePlayerName(finalName || currentName);
        this.playerName = finalName;
        this.savePlayerName(finalName);
        return finalName;
    }
}
