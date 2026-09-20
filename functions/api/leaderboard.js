const LEVELS = [1, 2, 3, 4];
const LEADERBOARD_LIMIT = 5;
const MAX_REQUEST_BODY_BYTES = 8 * 1024;
const MIN_TIME_MS = 100;
const MAX_TIME_MS = 30 * 60 * 1000;

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (request.method === 'GET') {
        const level = normalizeLevel(new URL(request.url).searchParams.get('level'));
        const entries = level === null
            ? await Promise.all(LEVELS.map((item) => getLeaderboard(env.DB, item)))
            : [await getLeaderboard(env.DB, level)];
        const payload = {};
        (level === null ? LEVELS : [level]).forEach((item, index) => {
            payload[item] = entries[index];
        });
        return jsonResponse(request, { levels: payload });
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

    const level = normalizeLevel(body.level);
    const time = Math.round(Number(body.time));
    const name = normalizeName(body.name);
    if (level === null || !Number.isFinite(time) || time < MIN_TIME_MS || time > MAX_TIME_MS) {
        return jsonResponse(request, { error: 'Invalid leaderboard entry' }, 400);
    }

    const entry = {
        id: crypto.randomUUID(),
        level,
        name,
        time,
        createdAt: new Date().toISOString(),
    };
    await env.DB.prepare(
        'INSERT INTO leaderboard_entries (id, level, name, time_ms, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(entry.id, entry.level, entry.name, entry.time, entry.createdAt).run();
    await pruneLeaderboard(env.DB, level);

    const entries = await getLeaderboard(env.DB, level);
    const rank = entries.findIndex((candidate) => candidate.id === entry.id) + 1;
    return jsonResponse(request, { entry, rank, entries }, 201);
}

async function getLeaderboard(db, level) {
    const result = await db.prepare(`
        SELECT id, level, name, time_ms, created_at
        FROM leaderboard_entries
        WHERE level = ?
        ORDER BY time_ms ASC, created_at ASC
        LIMIT ?
    `).bind(level, LEADERBOARD_LIMIT).all();
    return (result.results || []).map((row) => ({
        id: row.id,
        level: row.level,
        name: row.name,
        time: row.time_ms,
        createdAt: row.created_at,
    }));
}

async function pruneLeaderboard(db, level) {
    await db.prepare(`
        DELETE FROM leaderboard_entries
        WHERE level = ? AND id NOT IN (
            SELECT id FROM leaderboard_entries
            WHERE level = ?
            ORDER BY time_ms ASC, created_at ASC
            LIMIT ?
        )
    `).bind(level, level, LEADERBOARD_LIMIT).run();
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
