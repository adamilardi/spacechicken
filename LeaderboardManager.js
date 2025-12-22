import { GAME_CONSTANTS } from './Constants.js';

export class LeaderboardManager {
    constructor(scene) {
        this.scene = scene;
        this.firebaseEndpoint = this.getFirebaseEndpoint();
    }

    getFirebaseEndpoint() {
        if (typeof window !== 'undefined' && window.SPACE_CHICKEN_CONFIG && window.SPACE_CHICKEN_CONFIG.firebaseEndpoint) {
            const trimmed = window.SPACE_CHICKEN_CONFIG.firebaseEndpoint.replace(/\/+$/, '');
            return trimmed.length ? trimmed : null;
        }
        return null;
    }

    readLeaderboard(level) {
        const key = `${GAME_CONSTANTS.STORAGE_LEVEL_PREFIX}${level}`;
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
            return parsed.map(entry => {
                if (typeof entry === 'number') {
                    return { time: entry, name: 'Anonymous' };
                }
                if (entry && typeof entry.time === 'number') {
                    const name = typeof entry.name === 'string' ? entry.name.trim() : '';
                    return {
                        time: entry.time,
                        name: name.length ? name : 'Anonymous'
                    };
                }
                return null;
            }).filter(Boolean);
        } catch (err) {
            console.error('Error reading leaderboard:', err);
            return [];
        }
    }

    writeLeaderboard(level, data) {
        const key = `${GAME_CONSTANTS.STORAGE_LEVEL_PREFIX}${level}`;
        if (!this.scene.storageAvailable || typeof window === 'undefined' || !window.localStorage) {
            return;
        }
        try {
            const payload = Array.isArray(data) ? data.map(entry => {
                if (!entry || typeof entry.time !== 'number') {
                    return null;
                }
                const name = typeof entry.name === 'string' ? entry.name.trim() : '';
                return {
                    time: entry.time,
                    name: name.length ? name : 'Anonymous'
                };
            }).filter(Boolean) : [];
            window.localStorage.setItem(key, JSON.stringify(payload));
        } catch (err) {
            console.error('Error writing leaderboard:', err);
            this.scene.storageAvailable = false;
        }
    }

    saveTime(level, newTime, playerName) {
        const normalizedLevel = Math.max(1, Math.min(3, Number(level) || 1));
        const trimmedName = typeof playerName === 'string' ? playerName.trim() : '';
        const safeName = trimmedName.length ? trimmedName : 'Anonymous';

        this.saveTimeToFirebase(normalizedLevel, newTime, safeName);
        if (!this.scene.storageAvailable) {
            return;
        }

        const leaderboard = this.readLeaderboard(normalizedLevel);
        leaderboard.push({ time: newTime, name: safeName });
        leaderboard.sort((a, b) => a.time - b.time);
        const trimmed = leaderboard.slice(0, GAME_CONSTANTS.LEADERBOARD_MAX_ENTRIES);
        this.writeLeaderboard(normalizedLevel, trimmed);
    }

    saveTimeToFirebase(level, newTime, playerName) {
        if (!this.firebaseEndpoint || typeof fetch !== 'function') {
            return;
        }
        const url = `${this.firebaseEndpoint}/leaderboard/level${level}.json`;
        const payload = {
            time: newTime,
            name: playerName,
            createdAt: Date.now()
        };

        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to save time: ${response.status}`);
            }
            return response.json();
        })
        .then(() => {
            this.trimFirebaseLeaderboard(level);
        })
        .catch(err => {
            console.error('Firebase save failed', err);
        });
    }

    trimFirebaseLeaderboard(level) {
        if (!this.firebaseEndpoint || typeof fetch !== 'function') {
            return;
        }
        const url = `${this.firebaseEndpoint}/leaderboard/level${level}.json`;

        fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch leaderboard: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data || typeof data !== 'object') {
                return null;
            }
            const entries = Object.entries(data)
                .map(([key, value]) => {
                    if (typeof value === 'number') {
                        return { key, time: value };
                    }
                    if (value && typeof value.time === 'number') {
                        return { key, time: value.time };
                    }
                    return null;
                })
                .filter(Boolean);

            if (entries.length <= GAME_CONSTANTS.LEADERBOARD_MAX_ENTRIES) {
                return null;
            }

            entries.sort((a, b) => a.time - b.time);
            const extras = entries.slice(GAME_CONSTANTS.LEADERBOARD_MAX_ENTRIES);
            if (!extras.length) {
                return null;
            }

            const updates = {};
            extras.forEach(entry => {
                updates[entry.key] = null;
            });

            return fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
        })
        .catch(err => {
            console.error('Firebase trim failed', err);
        });
    }

    fetchFirebaseLeaderboards() {
        if (!this.firebaseEndpoint || typeof fetch !== 'function') {
            return Promise.resolve(null);
        }

        const levels = [1, 2, 3];
        const normalizeEntry = (value) => {
            if (value && typeof value === 'object') {
                const time = typeof value.time === 'number' ? value.time : null;
                if (time === null) {
                    return null;
                }
                const name = typeof value.name === 'string' ? value.name.trim() : '';
                return {
                    time,
                    name: name.length ? name : 'Anonymous'
                };
            }
            if (typeof value === 'number') {
                return { time: value, name: 'Anonymous' };
            }
            return null;
        };

        const requests = levels.map(level => {
            const url = `${this.firebaseEndpoint}/leaderboard/level${level}.json`;
            return fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load leaderboard: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (!data) {
                    return [];
                }
                if (Array.isArray(data)) {
                    const entries = data.map(normalizeEntry).filter(Boolean);
                    entries.sort((a, b) => a.time - b.time);
                    return entries.slice(0, GAME_CONSTANTS.LEADERBOARD_MAX_ENTRIES);
                }
                if (typeof data === 'object') {
                    const times = Object.values(data)
                        .map(normalizeEntry)
                        .filter(Boolean);
                    times.sort((a, b) => a.time - b.time);
                    return times.slice(0, GAME_CONSTANTS.LEADERBOARD_MAX_ENTRIES);
                }
                return [];
            })
            .catch(err => {
                console.error(`Firebase load failed for level ${level}`, err);
                return null;
            });
        });

        return Promise.all(requests)
        .then(results => {
            if (!results || !results.length) {
                return null;
            }
            const data = {};
            results.forEach((times, index) => {
                if (Array.isArray(times)) {
                    data[levels[index]] = times;
                }
            });
            return data;
        })
        .catch(err => {
            console.error('Firebase leaderboard fetch failed', err);
            return null;
        });
    }

    formatTimes(times) {
        return times.map((entry, index) => {
            const timeValue = entry && typeof entry === 'object' ? entry.time : entry;
            const nameValue = entry && typeof entry === 'object' && typeof entry.name === 'string' ? entry.name : 'Anonymous';
            if (typeof timeValue !== 'number') {
                return null;
            }
            const minutes = Math.floor(timeValue / 60000);
            const seconds = Math.floor((timeValue % 60000) / 1000);
            const milliseconds = Math.floor((timeValue % 1000) / 10);
            const paddedName = nameValue && nameValue.length ? nameValue : 'Anonymous';
            return `${index + 1}. ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')} - ${paddedName}`;
        }).filter(Boolean).join('\n');
    }

    loadPlayerName() {
        if (!this.scene.storageAvailable || typeof window === 'undefined' || !window.localStorage) {
            return null;
        }
        try {
            const stored = window.localStorage.getItem('spaceChickenPlayerName');
            if (!stored) {
                return null;
            }
            const trimmed = stored.trim();
            return trimmed.length ? trimmed : null;
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
            window.localStorage.setItem('spaceChickenPlayerName', name);
        } catch (err) {
            console.error('Error saving player name:', err);
        }
    }

    ensurePlayerName(forcePrompt = false) {
        let current = this.playerName;
        if (!forcePrompt && (current = this.loadPlayerName())) {
            return current;
        }
        const currentTrimmed = typeof current === 'string' ? current.trim() : '';
        if (typeof window === 'undefined' || typeof window.prompt !== 'function') {
            const fallback = currentTrimmed || 'Anonymous';
            this.playerName = fallback;
            return fallback;
        }
        const defaultValue = currentTrimmed;
        const response = window.prompt('Enter your name for the leaderboard:', defaultValue);
        let finalName;
        if (response === null) {
            finalName = currentTrimmed;
        } else {
            finalName = response.trim();
        }
        if (!finalName) {
            finalName = currentTrimmed || 'Anonymous';
        }
        this.playerName = finalName;
        this.savePlayerName(finalName);
        return finalName;
    }
}
