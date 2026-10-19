import { formatElapsedTime } from './GameUtils.js';
import { normalizePlayerName } from './LeaderboardManager.js';

// Pure leaderboard presentation: ranked rows, gaps, and callouts. Phaser
// rendering lives in Overlays.js; everything here is unit-testable without
// a scene.

// Text colors for the rich overlay. The panel stays the deep-navy HUD tone;
// each board section gets one accent so a glance reads the structure.
export const LEADERBOARD_COLORS = Object.freeze({
    header: '#ffe566',
    best: '#eaf6ff',
    allTimeTitle: '#8ce4ff',
    weeklyTitle: '#9df0a8',
    pastTitle: '#b9c6e4',
    row: '#f2f6ff',
    playerRow: '#ffe566',
    dim: '#9fb0cc',
    footer: '#8fa0bd',
});

// Medal disc paint per rank: gold, silver, bronze, then the plain slate pip
// for 4th and beyond.
export const LEADERBOARD_MEDALS = Object.freeze([
    Object.freeze({ fill: 0xffd74f, stroke: 0x7a5b00, label: '#3a2c00' }),
    Object.freeze({ fill: 0xd7dee9, stroke: 0x5c6b84, label: '#2b3648' }),
    Object.freeze({ fill: 0xe09a5a, stroke: 0x6e3d14, label: '#40230a' }),
    Object.freeze({ fill: 0x2a3a58, stroke: 0x8fa0bd, label: '#dbe6ff' }),
]);

export function medalForRank(rank) {
    if (rank === 1) return LEADERBOARD_MEDALS[0];
    if (rank === 2) return LEADERBOARD_MEDALS[1];
    if (rank === 3) return LEADERBOARD_MEDALS[2];
    return LEADERBOARD_MEDALS[3];
}

function validTime(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

// Rank one board's entries fastest-first with per-row gaps to the leader.
// isPlayer matches the exact submitted run (time + name); the overall rank
// for an unmatched personal best comes from insertionRank().
export function rankBoardRows(entries, { max = 5 } = {}) {
    const limit = Math.max(0, Math.floor(Number(max) || 0));
    const rows = (Array.isArray(entries) ? entries : [])
        .map((entry) => {
            const time = validTime(entry && typeof entry === 'object' ? entry.time : entry);
            if (time === null) return null;
            const name =
                entry && typeof entry === 'object' && typeof entry.name === 'string'
                    ? normalizePlayerName(entry.name)
                    : 'Anonymous';
            const deaths = entry && typeof entry === 'object' ? entry.deaths : undefined;
            return {
                time,
                name,
                deaths: Number.isInteger(deaths) && deaths > 0 ? deaths : 0,
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.time - b.time)
        .slice(0, limit);
    const leaderTime = rows.length ? rows[0].time : null;
    return rows.map((row, index) => {
        const gapMs = leaderTime === null ? 0 : row.time - leaderTime;
        return {
            rank: index + 1,
            time: row.time,
            timeText: formatElapsedTime(row.time),
            name: row.name,
            deaths: row.deaths,
            deathText: row.deaths > 0 ? ` · ${row.deaths} deaths` : '',
            gapMs,
            gapText: index === 0 ? 'LEADER' : `+${formatElapsedTime(gapMs)}`,
            // Player matching needs the personal best; tagPlayerRows
            // applies it after ranking so every board shares one rule.
            isPlayer: false,
            isLeader: index === 0,
        };
    });
}

// Flag the rows that match this browser's run: same name and same time as
// the personal best. Names alone collide across players; time alone
// collides across ties.
export function tagPlayerRows(rows, { playerName = null, best = null } = {}) {
    const time = validTime(best);
    if (time === null || playerName === null || playerName === undefined) return rows;
    const me = normalizePlayerName(playerName);
    let tagged = false;
    return rows.map((row) => {
        const match = !tagged && row.time === time && row.name === me;
        if (match) tagged = true;
        return { ...row, isPlayer: match };
    });
}

// 1-based rank a personal best would take on this board, or null without
// a best. Counts strictly faster entries so ties share the rank.
export function insertionRank(entries, best) {
    const time = validTime(best);
    if (time === null) return null;
    let rank = 1;
    for (const entry of Array.isArray(entries) ? entries : []) {
        const other = validTime(entry && typeof entry === 'object' ? entry.time : entry);
        if (other !== null && other < time) rank += 1;
    }
    return rank;
}

export function gapToLeader(entries, best) {
    const time = validTime(best);
    if (time === null) return null;
    let leader = null;
    for (const entry of Array.isArray(entries) ? entries : []) {
        const other = validTime(entry && typeof entry === 'object' ? entry.time : entry);
        if (other !== null && (leader === null || other < leader)) leader = other;
    }
    if (leader === null) return null;
    return Math.max(0, time - leader);
}

function leaderName(entries) {
    let best = null;
    let name = null;
    for (const entry of Array.isArray(entries) ? entries : []) {
        const time = validTime(entry && typeof entry === 'object' ? entry.time : entry);
        if (time === null) continue;
        if (best === null || time < best) {
            best = time;
            name =
                entry && typeof entry === 'object' && typeof entry.name === 'string'
                    ? normalizePlayerName(entry.name)
                    : 'Anonymous';
        }
    }
    return name;
}

// Structured model for one leaderboard page. Mirrors the data rules in
// Overlays.buildSections: remote boards win when present, level 0 shows
// only the local full-run best, past winners hide on short landscape.
export function buildLeaderboardModel({
    level = 1,
    best = null,
    playerName = null,
    remoteTimes = [],
    localTimes = [],
    weekly = [],
    winners = [],
    week = null,
    online = true,
    visibleCount = 5,
    pastCount = 2,
    hidePast = false,
} = {}) {
    const numericLevel = Number(level) || 0;
    const label = numericLevel === 0 ? 'FULL RUN · ZERO DEATHS' : `LEVEL ${numericLevel}`;
    const remote = Array.isArray(remoteTimes) ? remoteTimes : [];
    const local = Array.isArray(localTimes) ? localTimes : [];
    const board = remote.length ? remote : local;
    const allTimeLabel = remote.length || !local.length ? 'ALL TIME' : 'THIS BROWSER';
    const weekList = Array.isArray(weekly) ? weekly : [];
    const pastList = Array.isArray(winners) ? winners : [];

    const allTimeRows = tagPlayerRows(rankBoardRows(board, { max: visibleCount }), {
        playerName,
        best,
    });
    const weeklyRows = tagPlayerRows(rankBoardRows(weekList, { max: visibleCount }), {
        playerName,
        best,
    });
    const past = pastList.slice(0, Math.max(0, pastCount)).map((winner) => ({
        week: typeof winner?.week === 'string' ? winner.week : 'past',
        time: validTime(winner?.time) ?? 0,
        timeText: formatElapsedTime(validTime(winner?.time) ?? 0),
        name: typeof winner?.name === 'string' ? normalizePlayerName(winner.name) : 'Anonymous',
    }));

    const playerRank = insertionRank(board, best);
    const playerGapMs = gapToLeader(board, best);
    const weeklyRank = insertionRank(weekList, best);
    const weeklyGapMs = gapToLeader(weekList, best);

    const model = {
        level: numericLevel,
        label,
        online,
        week,
        best: validTime(best),
        bestText:
            validTime(best) === null
                ? 'Your best: none yet'
                : `Your best: ${formatElapsedTime(best)}`,
        playerName: playerName === null ? null : normalizePlayerName(playerName),
        allTimeLabel,
        allTimeRows,
        weeklyRows,
        past,
        playerRank,
        playerGapMs,
        leaderName: leaderName(board),
        weeklyRank,
        weeklyGapMs,
        weeklyLeaderName: leaderName(weekList),
        remoteHolding: remote.length > 0,
        hidePast: Boolean(hidePast),
    };
    model.callout = buildLeaderboardCallout(model);
    return model;
}

// One motivational line for the callout pill. Priority: offline, first run,
// all-time crown, weekly crown, podium chase, weekly chase, the climb.
export function buildLeaderboardCallout(model = {}) {
    if (!model || model.online === false) {
        return { text: 'Offline — showing this browser’s board', tone: 'dim' };
    }
    if (model.best === null || model.best === undefined) {
        if (model.past && model.past.length) {
            const champ = model.past[0];
            return {
                text: `No time yet — chase ${champ.name} · ${champ.timeText}`,
                tone: 'cyan',
            };
        }
        return { text: 'No time yet — set the opening pace!', tone: 'cyan' };
    }
    if (model.playerRank === 1 && model.allTimeRows && model.allTimeRows.length) {
        return { text: 'YOU HOLD #1 — defend the crown!', tone: 'gold' };
    }
    if (model.weeklyRank === 1 && model.weeklyRows && model.weeklyRows.length) {
        return { text: 'Weekly crown is yours!', tone: 'gold' };
    }
    const gapText =
        model.playerGapMs === null || model.playerGapMs === undefined
            ? null
            : formatElapsedTime(model.playerGapMs);
    if (model.playerRank !== null && model.playerRank <= 3 && gapText !== null) {
        return { text: `P${model.playerRank} all-time — ${gapText} off the lead`, tone: 'cyan' };
    }
    if (
        model.weeklyRank !== null &&
        model.weeklyRank <= 3 &&
        model.weeklyGapMs !== null &&
        model.weeklyGapMs !== undefined
    ) {
        return {
            text: `P${model.weeklyRank} this week — ${formatElapsedTime(model.weeklyGapMs)} from the weekly crown`,
            tone: 'cyan',
        };
    }
    if (model.playerRank !== null && gapText !== null) {
        const holder = model.leaderName ? ` behind ${model.leaderName}` : '';
        return { text: `#${model.playerRank} all-time — ${gapText}${holder}`, tone: 'dim' };
    }
    return { text: 'Set a time to join the board!', tone: 'cyan' };
}

// Plain-text fallback for leaderboardTextContent and screen readers. Keeps
// the long-standing section order and row format.
export function formatLeaderboardPlainText(model, footer) {
    if (!model) return '';
    const lines = [model.label, model.bestText, model.allTimeLabel];
    if (model.allTimeRows && model.allTimeRows.length) {
        for (const row of model.allTimeRows) {
            lines.push(`${row.rank}. ${row.timeText} - ${row.name}${row.deathText}`);
        }
    } else {
        lines.push('No times yet');
    }
    lines.push(model.online ? `THIS WEEK (${model.week || 'UTC'})` : 'ONLINE BOARD UNAVAILABLE');
    if (!model.online) {
        lines.push('Try again later');
    } else if (model.weeklyRows && model.weeklyRows.length) {
        for (const row of model.weeklyRows) {
            lines.push(`${row.rank}. ${row.timeText} - ${row.name}${row.deathText}`);
        }
    } else {
        lines.push('No times yet');
    }
    if (model.online && !model.hidePast) {
        lines.push('PAST WINNERS');
        if (model.past && model.past.length) {
            for (const winner of model.past) {
                lines.push(`${winner.week}: ${winner.timeText} - ${winner.name}`);
            }
        } else {
            lines.push('No past winners yet');
        }
    }
    if (model.callout && model.callout.text) lines.push(model.callout.text);
    if (footer) lines.push(footer);
    return lines.join('\n');
}
