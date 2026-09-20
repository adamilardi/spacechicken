import { AUDIO_SETTINGS, GAME_CONSTANTS, LEVEL_IDS } from './Constants.js';
import { formatElapsedTime } from './GameUtils.js';

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
    return {
        time,
        name: normalizePlayerName(entry && typeof entry === 'object' ? entry.name : null),
    };
}

function normalizeLevel(level) {
    const parsed = Number(level);
    return LEVEL_IDS.includes(parsed) ? parsed : null;
}

export class LeaderboardManager {
    constructor(scene) {
        this.scene = scene;
        this.firebaseEndpoint = this.getFirebaseEndpoint();
    }

    getFirebaseEndpoint() {
        if (
            typeof window !== 'undefined' &&
            window.SPACE_CHICKEN_CONFIG &&
            window.SPACE_CHICKEN_CONFIG.firebaseEndpoint
        ) {
            const trimmed = window.SPACE_CHICKEN_CONFIG.firebaseEndpoint.replace(/\/+$/, '');
            return trimmed.length ? trimmed : null;
        }
        return null;
    }

    readLeaderboard(level) {
        const normalizedLevel = normalizeLevel(level);
        if (normalizedLevel === null) {
            return [];
        }
        const key = `${GAME_CONSTANTS.STORAGE_LEVEL_PREFIX}${normalizedLevel}`;
        if (!this.scene.storageAvailable || typeof window === 'undefined' || !window.localStorage) {
            return [];
        }
        try {
            const raw = window.localStorage.getItem(key);
            if (!raw) {
                return [];
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return [];
            }
            return parsed
                .map(normalizeLeaderboardEntry)
                .filter(Boolean)
                .sort((a, b) => a.time - b.time)
                .slice(0, GAME_CONSTANTS.LEADERBOARD_MAX_ENTRIES);
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
        const key = `${GAME_CONSTANTS.STORAGE_LEVEL_PREFIX}${normalizedLevel}`;
        if (!this.scene.storageAvailable || typeof window === 'undefined' || !window.localStorage) {
            return;
        }
        try {
            const payload = Array.isArray(data)
                ? data
                      .map(normalizeLeaderboardEntry)
                      .filter(Boolean)
                      .sort((a, b) => a.time - b.time)
                      .slice(0, GAME_CONSTANTS.LEADERBOARD_MAX_ENTRIES)
                : [];
            window.localStorage.setItem(key, JSON.stringify(payload));
        } catch (err) {
            console.error('Error writing leaderboard:', err);
            this.scene.storageAvailable = false;
        }
    }

    saveTime(level, newTime, playerName) {
        const normalizedLevel = normalizeLevel(level);
        const entry = normalizeLeaderboardEntry({ time: newTime, name: playerName });
        if (normalizedLevel === null || !entry) {
            return false;
        }

        this.saveTimeToFirebase(normalizedLevel, entry.time, entry.name);
        if (!this.scene.storageAvailable) {
            return true;
        }

        const leaderboard = this.readLeaderboard(normalizedLevel);
        leaderboard.push(entry);
        leaderboard.sort((a, b) => a.time - b.time);
        const trimmed = leaderboard.slice(0, GAME_CONSTANTS.LEADERBOARD_MAX_ENTRIES);
        this.writeLeaderboard(normalizedLevel, trimmed);
        return true;
    }

    saveTimeToFirebase(level, newTime, playerName) {
        if (typeof fetch !== 'function') {
            return;
        }
        fetch(this.getLeaderboardApiUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ level, time: newTime, name: playerName }),
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Failed to save time: ${response.status}`);
                }
                return response.json();
            })
            .catch((err) => {
                console.error('Online leaderboard save failed', err);
            });
    }

    trimFirebaseLeaderboard(level) {
        // D1 keeps only the fastest entries server-side.
    }

    fetchFirebaseLeaderboards() {
        if (typeof fetch !== 'function') {
            return Promise.resolve(null);
        }
        return fetch(this.getLeaderboardApiUrl())
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Failed to load leaderboard: ${response.status}`);
                }
                return response.json();
            })
            .then((payload) => payload && payload.levels ? payload.levels : null)
            .catch((err) => {
                console.error('Online leaderboard load failed', err);
                return null;
            });
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
                const timeValue = entry && typeof entry === 'object' ? entry.time : entry;
                const nameValue =
                    entry && typeof entry === 'object' && typeof entry.name === 'string'
                        ? entry.name
                        : 'Anonymous';
                if (typeof timeValue !== 'number' || !Number.isFinite(timeValue) || timeValue < 0) {
                    return null;
                }
                const paddedName = normalizePlayerName(nameValue);
                return `${index + 1}. ${formatElapsedTime(timeValue)} - ${paddedName}`;
            })
            .filter(Boolean)
            .join('\n');
    }

    loadPlayerName() {
        if (!this.scene.storageAvailable || typeof window === 'undefined' || !window.localStorage) {
            return null;
        }
        try {
            const stored = window.localStorage.getItem(AUDIO_SETTINGS.PLAYER_NAME_KEY);
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
        if (!this.scene.storageAvailable || typeof window === 'undefined' || !window.localStorage) {
            return;
        }
        try {
            window.localStorage.setItem(AUDIO_SETTINGS.PLAYER_NAME_KEY, normalizePlayerName(name));
        } catch (err) {
            console.error('Error saving player name:', err);
        }
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
