const LEVELS = [0, 1, 2, 3, 4, 5, 6, 7];
const LEADERBOARD_LIMIT = 5;
const MAX_REQUEST_BODY_BYTES = 8 * 1024;
const MIN_TIME_MS = 1000;
const MIN_FULL_TIME_MS = 6000;
const MAX_TIME_MS = 30 * 60 * 1000;
const PLAYER_KEY =
    "CASE WHEN instr(id, ':') > 0 THEN substr(id, 1, instr(id, ':') - 1) ELSE id END";

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (request.method === 'GET') {
        const level = normalizeLevel(new URL(request.url).searchParams.get('level'));
        const selected = level === null ? LEVELS : [level];
        const week = currentWeek();
        const [allTime, weekly, winners] = await Promise.all([
            Promise.all(selected.map((item) => getLeaderboard(env.DB, item))),
            Promise.all(selected.map((item) => getLeaderboard(env.DB, item, week))),
            Promise.all(selected.map((item) => getPastWinners(env.DB, item, week))),
        ]);
        const levels = {};
        const weeklyLevels = {};
        const hallOfFame = {};
        selected.forEach((item, index) => {
            levels[item] = allTime[index];
            weeklyLevels[item] = weekly[index];
            hallOfFame[item] = winners[index];
        });
        return jsonResponse(request, { levels, weekly: weeklyLevels, hallOfFame, week });
    }

    if (request.method !== 'POST') {
        return new Response('Method not allowed', {
            status: 405,
            headers: { Allow: 'GET, POST, OPTIONS', ...corsHeaders(request) },
        });
    }

    let body;
    try {
        body = await readJson(request);
    } catch (error) {
        return jsonResponse(request, { error: error.message }, error.statusCode || 400);
    }

    const level = normalizeLevel(body?.level);
    const time = Math.round(Number(body?.time));
    const name = normalizeName(body?.name);
    const token = typeof body?.runToken === 'string' ? body.runToken : '';
    const playerId = typeof body?.playerId === 'string' ? body.playerId : '';
    const maxTime = level === 0 ? 2 * 60 * 60 * 1000 : MAX_TIME_MS;
    const minTime = level === 0 ? MIN_FULL_TIME_MS : MIN_TIME_MS;
    if (level === null || !Number.isFinite(time) || time < minTime || time > maxTime) {
        return jsonResponse(request, { error: 'Invalid leaderboard entry' }, 400);
    }
    if (!/^[0-9a-f-]{36}$/i.test(token) || !/^[0-9a-f-]{36}$/i.test(playerId)) {
        return jsonResponse(request, { error: 'Run token required' }, 400);
    }
    const session = await env.DB.prepare(
        'SELECT name, created_at FROM leaderboard_entries WHERE id = ? AND level = -1'
    )
        .bind(token)
        .first();
    const elapsed = session ? Date.now() - Date.parse(session.created_at) : -1;
    if (
        session?.name !== `run:${level}:${playerId}` ||
        elapsed < time - 3000 ||
        elapsed > maxTime + 60000
    ) {
        return jsonResponse(request, { error: 'Run timing could not be validated' }, 400);
    }
    const consumed = await env.DB.prepare(
        'DELETE FROM leaderboard_entries WHERE id = ? AND level = -1'
    )
        .bind(token)
        .run();
    if (consumed.meta?.changes !== 1) {
        return jsonResponse(request, { error: 'Run token already used' }, 400);
    }

    const entry = {
        id: `${playerId}:${crypto.randomUUID()}`,
        level,
        name,
        time,
        createdAt: new Date().toISOString(),
    };
    await env.DB.prepare(
        'INSERT INTO leaderboard_entries (id, level, name, time_ms, created_at) VALUES (?, ?, ?, ?, ?)'
    )
        .bind(entry.id, entry.level, entry.name, entry.time, entry.createdAt)
        .run();
    const entries = await getLeaderboard(env.DB, level);
    const week = currentWeek();
    const weekly = await getLeaderboard(env.DB, level, week);
    const personalBest = await getPlayerBest(env.DB, level, playerId);
    const rank = await getRank(env.DB, level, personalBest);
    const weeklyBest = await getPlayerBest(env.DB, level, playerId, week);
    const weeklyRank = await getRank(env.DB, level, weeklyBest, week);
    const next = await getNextTarget(env.DB, level, personalBest.time, playerId);
    return jsonResponse(
        request,
        { entry, personalBest, rank, weeklyRank, next, entries, weekly, week },
        201
    );
}

async function getLeaderboard(db, level, week = null) {
    const weekStart = week ? `${week}T00:00:00.000Z` : null;
    const weekEnd = week ? new Date(Date.parse(weekStart) + 7 * 86400000).toISOString() : null;
    const result = await db
        .prepare(
            `
        SELECT id, level, name, time_ms, created_at FROM (
            SELECT id, level, name, time_ms, created_at,
                   ROW_NUMBER() OVER (
                       PARTITION BY ${PLAYER_KEY}
                       ORDER BY time_ms ASC, created_at ASC, id ASC
                   ) AS position
            FROM leaderboard_entries
            WHERE level = ? AND (? IS NULL OR (created_at >= ? AND created_at < ?))
        ) WHERE position = 1
        ORDER BY time_ms ASC, created_at ASC
        LIMIT ?
    `
        )
        .bind(level, weekStart, weekStart, weekEnd, LEADERBOARD_LIMIT)
        .all();
    return (result.results || []).map((row) => ({
        level: row.level,
        name: row.name,
        time: row.time_ms,
        createdAt: row.created_at,
    }));
}

async function getRank(db, level, entry, week = null) {
    const weekStart = week ? `${week}T00:00:00.000Z` : null;
    const weekEnd = week ? new Date(Date.parse(weekStart) + 7 * 86400000).toISOString() : null;
    const playerId = entry.id.split(':')[0];
    const result = await db
        .prepare(
            `
        SELECT COUNT(*) AS ahead FROM (
            SELECT id, time_ms, created_at, ${PLAYER_KEY} AS player_key,
                   ROW_NUMBER() OVER (
                       PARTITION BY ${PLAYER_KEY}
                       ORDER BY time_ms ASC, created_at ASC, id ASC
                   ) AS position
            FROM leaderboard_entries
            WHERE level = ? AND (? IS NULL OR (created_at >= ? AND created_at < ?))
        ) WHERE position = 1 AND player_key != ?
          AND (time_ms < ? OR (time_ms = ? AND created_at < ?))
    `
        )
        .bind(
            level,
            weekStart,
            weekStart,
            weekEnd,
            playerId,
            entry.time,
            entry.time,
            entry.createdAt
        )
        .first();
    return Number(result?.ahead || 0) + 1;
}

async function getNextTarget(db, level, time, playerId) {
    const result = await db
        .prepare(
            `
        SELECT name, time_ms FROM (
            SELECT id, name, time_ms, ${PLAYER_KEY} AS player_key,
                   ROW_NUMBER() OVER (
                       PARTITION BY ${PLAYER_KEY}
                       ORDER BY time_ms ASC, created_at ASC, id ASC
                   ) AS position
            FROM leaderboard_entries WHERE level = ?
        ) WHERE position = 1 AND player_key != ? AND time_ms < ?
        ORDER BY time_ms DESC LIMIT 1
    `
        )
        .bind(level, playerId, time)
        .first();
    return result ? { name: result.name, time: result.time_ms } : null;
}

async function getPlayerBest(db, level, playerId, week = null) {
    const weekStart = week ? `${week}T00:00:00.000Z` : null;
    const weekEnd = week ? new Date(Date.parse(weekStart) + 7 * 86400000).toISOString() : null;
    const row = await db
        .prepare(
            `
        SELECT id, time_ms, created_at FROM leaderboard_entries
        WHERE level = ? AND id LIKE ?
          AND (? IS NULL OR (created_at >= ? AND created_at < ?))
        ORDER BY time_ms ASC, created_at ASC LIMIT 1
    `
        )
        .bind(level, `${playerId}:%`, weekStart, weekStart, weekEnd)
        .first();
    return { id: row.id, time: row.time_ms, createdAt: row.created_at };
}

async function getPastWinners(db, level, current) {
    const result = await db
        .prepare(
            `
        SELECT week, name, time_ms FROM (
            SELECT date(created_at, 'weekday 0', '-6 days') AS week,
                   name, time_ms,
                   ROW_NUMBER() OVER (
                       PARTITION BY date(created_at, 'weekday 0', '-6 days')
                       ORDER BY time_ms ASC, created_at ASC
                   ) AS position
            FROM leaderboard_entries
            WHERE level = ? AND created_at < ?
        ) WHERE position = 1
        ORDER BY week DESC LIMIT 4
    `
        )
        .bind(level, `${current}T00:00:00.000Z`)
        .all();
    return (result.results || []).map((row) => ({
        week: row.week,
        name: row.name,
        time: row.time_ms,
    }));
}

function currentWeek(date = new Date()) {
    const utcDay = date.getUTCDay();
    const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    monday.setUTCDate(monday.getUTCDate() - ((utcDay + 6) % 7));
    return monday.toISOString().slice(0, 10);
}

async function readJson(request) {
    const body = await request.text();
    if (new TextEncoder().encode(body).length > MAX_REQUEST_BODY_BYTES) {
        throw Object.assign(new Error('Request body too large'), { statusCode: 413 });
    }
    try {
        return body ? JSON.parse(body) : {};
    } catch {
        throw Object.assign(new Error('Invalid JSON'), { statusCode: 400 });
    }
}

function normalizeLevel(value) {
    if (value === null || value === undefined || value === '') return null;
    const level = Number(value);
    return Number.isInteger(level) && LEVELS.includes(level) ? level : null;
}

function normalizeName(value) {
    const name = String(value || '')
        .replace(/[^\w .-]/g, '')
        .trim()
        .slice(0, 24);
    return name || 'Anonymous';
}

function jsonResponse(request, payload, status = 200) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: {
            ...corsHeaders(request),
            'Cache-Control': 'no-store',
            'Content-Type': 'application/json; charset=utf-8',
        },
    });
}

function corsHeaders(request) {
    const origin = request.headers.get('Origin');
    if (!origin) return {};
    try {
        if (new URL(origin).origin !== new URL(request.url).origin) return {};
    } catch {
        return {};
    }
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        Vary: 'Origin',
    };
}
