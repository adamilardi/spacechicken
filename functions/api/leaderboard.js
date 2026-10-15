const LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const LEADERBOARD_LIMIT = 5;
const MAX_REQUEST_BODY_BYTES = 8 * 1024;
const MAX_DEATHS = 100000;
const MIN_TIME_MS = 1000;
const MIN_FULL_TIME_MS = 6000;
const MAX_TIME_MS = 30 * 60 * 1000;
const PLAYER_KEY =
    "CASE WHEN instr(id, ':') > 0 THEN substr(id, 1, instr(id, ':') - 1) ELSE id END";

export async function onRequest(context) {
    try {
        return await handleRequest(context);
    } catch (error) {
        console.error('Leaderboard request failed:', error);
        return jsonResponse(context.request, { error: 'Leaderboard request failed' }, 500);
    }
}

async function handleRequest(context) {
    const { request, env } = context;

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (request.method === 'GET') {
        return handleGet(request, env);
    }

    if (request.method !== 'POST') {
        return new Response('Method not allowed', {
            status: 405,
            headers: { Allow: 'GET, POST, OPTIONS', ...corsHeaders(request) },
        });
    }

    return handlePost(request, env);
}

async function handleGet(request, env) {
    const params = new URL(request.url).searchParams;
    const levelParam = params.get('level');
    const level = normalizeLevel(levelParam);
    if (levelParam !== null && levelParam !== '' && level === null) {
        return jsonResponse(request, { error: 'Invalid level' }, 400);
    }
    const mode = normalizeMode(params.get('mode'));
    const selected = level === null ? LEVELS : [level];
    const week = currentWeek();
    // One batched round-trip for the whole board instead of three
    // queries per level.
    const jobs = [];
    for (const item of selected) {
        jobs.push({ section: 'levels', level: item, query: leaderboardQuery(item, mode) });
        jobs.push({
            section: 'weekly',
            level: item,
            query: leaderboardQuery(item, mode, week),
        });
        jobs.push({
            section: 'hallOfFame',
            level: item,
            query: pastWinnersQuery(item, mode, week),
        });
    }
    const settled = await env.DB.batch(
        jobs.map((job) => env.DB.prepare(job.query.text).bind(...job.query.values))
    );
    const levels = {};
    const weeklyLevels = {};
    const hallOfFame = {};
    for (const item of selected) {
        levels[item] = [];
        weeklyLevels[item] = [];
        hallOfFame[item] = [];
    }
    settled.forEach((result, index) => {
        const job = jobs[index];
        const rows = result?.results || [];
        if (job.section === 'hallOfFame') {
            hallOfFame[job.level] = rows.map(mapWinner);
        } else if (job.section === 'weekly') {
            weeklyLevels[job.level] = rows.map(mapEntry);
        } else {
            levels[job.level] = rows.map(mapEntry);
        }
    });
    return jsonResponse(request, { levels, weekly: weeklyLevels, hallOfFame, week, mode });
}

async function handlePost(request, env) {
    let body;
    try {
        body = await readJson(request);
    } catch (error) {
        return jsonResponse(request, { error: error.message }, error.statusCode || 400);
    }

    const level = normalizeLevel(body?.level);
    const mode = normalizeMode(body?.mode);
    const time = Math.round(Number(body?.time));
    const name = normalizeName(body?.name);
    const deaths = sanitizeDeaths(body?.deaths);
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
    // elapsed is server wall time since token mint; time is the client-measured
    // level duration. Legit runs have elapsed >= time - network slack (token mint
    // round-trip). Reject claims longer than wall time AND instant min-time
    // submits (elapsed ~0, time = MIN_TIME) by keeping the grace below MIN_TIME_MS.
    // Note: elapsed >> time is allowed without an upper bound, since pauses of
    // any length are excluded from the timer. Stale tokens are reaped by the
    // mint endpoint's 3-hour cleanup instead. This is not cheat-proof (an
    // attacker can mint then wait before submitting), but it closes the free
    // instant-record hole.
    // Pre-split tokens read `run:{level}:{playerId}` and count as normal;
    // new tokens bind the mode as `run:{level}:{mode}:{playerId}`.
    const tokenName = session?.name;
    const tokenOk =
        tokenName === `run:${level}:${mode}:${playerId}` ||
        (mode === 'normal' && tokenName === `run:${level}:${playerId}`);
    if (!tokenOk || elapsed < time - 750) {
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
        mode,
        name,
        time,
        deaths,
        createdAt: new Date().toISOString(),
    };
    await env.DB.prepare(
        'INSERT INTO leaderboard_entries (id, level, mode, name, time_ms, deaths, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
        .bind(
            entry.id,
            entry.level,
            entry.mode,
            entry.name,
            entry.time,
            entry.deaths,
            entry.createdAt
        )
        .run();
    const week = currentWeek();
    const [entries, weekly, personalBest, weeklyBest] = await Promise.all([
        getLeaderboard(env.DB, level, mode),
        getLeaderboard(env.DB, level, mode, week),
        getPlayerBest(env.DB, level, mode, playerId),
        getPlayerBest(env.DB, level, mode, playerId, week),
    ]);
    const [rank, weeklyRank, next] = await Promise.all([
        getRank(env.DB, level, mode, personalBest),
        getRank(env.DB, level, mode, weeklyBest, week),
        getNextTarget(env.DB, level, mode, personalBest.time, playerId),
    ]);
    return jsonResponse(
        request,
        { entry, personalBest, rank, weeklyRank, next, entries, weekly, week, mode },
        201
    );
}

function leaderboardQuery(level, mode, week = null) {
    const weekStart = week ? `${week}T00:00:00.000Z` : null;
    const weekEnd = week ? new Date(Date.parse(weekStart) + 7 * 86400000).toISOString() : null;
    return {
        text: `
        SELECT id, level, name, time_ms, deaths, created_at FROM (
            SELECT id, level, name, time_ms, deaths, created_at,
                   ROW_NUMBER() OVER (
                       PARTITION BY ${PLAYER_KEY}
                       ORDER BY time_ms ASC, created_at ASC, id ASC
                   ) AS position
            FROM leaderboard_entries
            WHERE mode = ? AND level = ? AND (? IS NULL OR (created_at >= ? AND created_at < ?))
        ) WHERE position = 1
        ORDER BY time_ms ASC, created_at ASC
        LIMIT ?
    `,
        values: [mode, level, weekStart, weekStart, weekEnd, LEADERBOARD_LIMIT],
    };
}

function pastWinnersQuery(level, mode, current) {
    return {
        text: `
        SELECT week, name, time_ms FROM (
            SELECT date(created_at, 'weekday 0', '-6 days') AS week,
                   name, time_ms,
                   ROW_NUMBER() OVER (
                       PARTITION BY date(created_at, 'weekday 0', '-6 days')
                       ORDER BY time_ms ASC, created_at ASC
                   ) AS position
            FROM leaderboard_entries
            WHERE mode = ? AND level = ? AND created_at < ?
        ) WHERE position = 1
        ORDER BY week DESC LIMIT 4
    `,
        values: [mode, level, `${current}T00:00:00.000Z`],
    };
}

async function getLeaderboard(db, level, mode, week = null) {
    const query = leaderboardQuery(level, mode, week);
    const result = await db
        .prepare(query.text)
        .bind(...query.values)
        .all();
    return (result.results || []).map(mapEntry);
}

function mapEntry(row) {
    const entry = {
        level: row.level,
        name: row.name,
        time: row.time_ms,
        createdAt: row.created_at,
    };
    if (Number.isInteger(row.deaths) && row.deaths > 0) {
        entry.deaths = row.deaths;
    }
    return entry;
}

function mapWinner(row) {
    return {
        week: row.week,
        name: row.name,
        time: row.time_ms,
    };
}

async function getRank(db, level, mode, entry, week = null) {
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
            WHERE mode = ? AND level = ? AND (? IS NULL OR (created_at >= ? AND created_at < ?))
        ) WHERE position = 1 AND player_key != ?
          AND (time_ms < ? OR (time_ms = ? AND created_at < ?))
    `
        )
        .bind(
            mode,
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

async function getNextTarget(db, level, mode, time, playerId) {
    const result = await db
        .prepare(
            `
        SELECT name, time_ms FROM (
            SELECT id, name, time_ms, ${PLAYER_KEY} AS player_key,
                   ROW_NUMBER() OVER (
                       PARTITION BY ${PLAYER_KEY}
                       ORDER BY time_ms ASC, created_at ASC, id ASC
                   ) AS position
            FROM leaderboard_entries WHERE mode = ? AND level = ?
        ) WHERE position = 1 AND player_key != ? AND time_ms < ?
        ORDER BY time_ms DESC LIMIT 1
    `
        )
        .bind(mode, level, playerId, time)
        .first();
    return result ? { name: result.name, time: result.time_ms } : null;
}

async function getPlayerBest(db, level, mode, playerId, week = null) {
    const weekStart = week ? `${week}T00:00:00.000Z` : null;
    const weekEnd = week ? new Date(Date.parse(weekStart) + 7 * 86400000).toISOString() : null;
    const row = await db
        .prepare(
            `
        SELECT id, time_ms, created_at FROM leaderboard_entries
        WHERE mode = ? AND level = ? AND id LIKE ?
          AND (? IS NULL OR (created_at >= ? AND created_at < ?))
        ORDER BY time_ms ASC, created_at ASC LIMIT 1
    `
        )
        .bind(mode, level, `${playerId}:%`, weekStart, weekStart, weekEnd)
        .first();
    return { id: row.id, time: row.time_ms, createdAt: row.created_at };
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

function normalizeMode(value) {
    return value === 'hard' ? 'hard' : 'normal';
}

function normalizeName(value) {
    const name = String(value || '')
        .replace(/[^\p{L}\p{N} _.-]/gu, '')
        .trim()
        .slice(0, 24);
    return name || 'Anonymous';
}

function sanitizeDeaths(value) {
    if (value === undefined || value === null || value === '') return 0;
    const deaths = Math.floor(Number(value));
    if (!Number.isFinite(deaths) || deaths < 0) return 0;
    return Math.min(deaths, MAX_DEATHS);
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
