// Anonymous gameplay analytics API (Cloudflare Pages Function + D1).
//
// POST /api/analytics ingests small batches of gameplay events from the game
// client (see AnalyticsManager.js). GET /api/analytics returns aggregate
// stats only — raw events and session ids are never exposed, so the
// dashboard can stay public without leaking anything per-player.

const EVENT_TYPES = new Set([
    'session_start',
    'level_start',
    'level_complete',
    'death',
    'session_ping',
    'session_end',
]);
const MAX_REQUEST_BODY_BYTES = 8 * 1024;
const MAX_EVENTS_PER_REQUEST = 50;
const MAX_LEVEL = 64;
const MAX_VALUE_MS = 24 * 60 * 60 * 1000;
const MAX_AMOUNT = 1000000;
const DEFAULT_DAYS = 30;
const MAX_DAYS = 90;
const RETENTION_DAYS = 120;

export async function onRequest(context) {
    try {
        return await handleRequest(context);
    } catch (error) {
        console.error('Analytics request failed:', error);
        return jsonResponse(context.request, { error: 'Analytics request failed' }, 500);
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

async function handlePost(request, env) {
    let body;
    try {
        body = await readJson(request);
    } catch (error) {
        return jsonResponse(request, { error: error.message }, error.statusCode || 400);
    }

    const session = typeof body?.session === 'string' ? body.session : '';
    const events = Array.isArray(body?.events) ? body.events : null;
    if (!/^[A-Za-z0-9-]{8,64}$/.test(session)) {
        return jsonResponse(request, { error: 'Invalid session' }, 400);
    }
    if (!events || events.length === 0 || events.length > MAX_EVENTS_PER_REQUEST) {
        return jsonResponse(request, { error: 'Invalid events batch' }, 400);
    }

    const rows = [];
    for (const event of events) {
        const normalized = normalizeEvent(event);
        if (!normalized) {
            return jsonResponse(request, { error: 'Invalid event' }, 400);
        }
        rows.push(normalized);
    }

    const now = new Date();
    const createdAt = now.toISOString();
    const day = createdAt.slice(0, 10);
    const statements = rows.map((event) =>
        env.DB.prepare(
            'INSERT INTO analytics_events (session_id, type, level, mode, value_ms, amount, kind, created_at, day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
            session,
            event.type,
            event.level,
            event.mode,
            event.value,
            event.amount,
            event.kind,
            createdAt,
            day
        )
    );
    // Best-effort retention: one cheap indexed delete per ingest keeps the
    // table bounded without a cron job.
    const cutoff = new Date(now.getTime() - RETENTION_DAYS * 86400000).toISOString().slice(0, 10);
    statements.push(env.DB.prepare('DELETE FROM analytics_events WHERE day < ?').bind(cutoff));
    await env.DB.batch(statements);
    return jsonResponse(request, { ok: true, stored: rows.length }, 201);
}

async function handleGet(request, env) {
    const params = new URL(request.url).searchParams;
    const days = normalizeDays(params.get('days'));
    const from = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);

    const [sessionsResult, playResult, levelResult, deathKindResult, dailyResult, inputResult] =
        await env.DB.batch([
            env.DB.prepare(
                'SELECT COUNT(DISTINCT session_id) AS sessions FROM analytics_events WHERE day >= ?'
            ).bind(from),
            env.DB.prepare(
                `SELECT session_id, MAX(value_ms) AS play_ms, MAX(amount) AS levels
                 FROM analytics_events
                 WHERE day >= ? AND type IN ('session_ping', 'session_end')
                 GROUP BY session_id LIMIT 20000`
            ).bind(from),
            env.DB.prepare(
                `SELECT level,
                        SUM(CASE WHEN type = 'level_start' THEN 1 ELSE 0 END) AS starts,
                        SUM(CASE WHEN type = 'level_complete' THEN 1 ELSE 0 END) AS completions,
                        AVG(CASE WHEN type = 'level_complete' THEN value_ms END) AS avg_ms,
                        AVG(CASE WHEN type = 'level_complete' THEN amount END) AS avg_deaths,
                        SUM(CASE WHEN type = 'death' THEN 1 ELSE 0 END) AS deaths
                 FROM analytics_events
                 WHERE day >= ? AND level IS NOT NULL
                 GROUP BY level ORDER BY level ASC`
            ).bind(from),
            env.DB.prepare(
                `SELECT kind, COUNT(*) AS deaths FROM analytics_events
                 WHERE day >= ? AND type = 'death' GROUP BY kind ORDER BY deaths DESC`
            ).bind(from),
            env.DB.prepare(
                `SELECT day, COUNT(DISTINCT session_id) AS sessions FROM analytics_events
                 WHERE day >= ? GROUP BY day ORDER BY day ASC`
            ).bind(from),
            env.DB.prepare(
                `SELECT kind, COUNT(*) AS sessions FROM analytics_events
                 WHERE day >= ? AND type = 'session_start' GROUP BY kind ORDER BY sessions DESC`
            ).bind(from),
        ]);

    const playRows = playResult?.results || [];
    const playTimes = playRows
        .map((row) => Number(row.play_ms) || 0)
        .filter((value) => value > 0)
        .sort((a, b) => a - b);
    const totalPlayMs = playTimes.reduce((sum, value) => sum + value, 0);
    const levels = {};
    for (const row of levelResult?.results || []) {
        levels[row.level] = {
            starts: Number(row.starts) || 0,
            completions: Number(row.completions) || 0,
            avgMs: row.avg_ms == null ? null : Math.round(Number(row.avg_ms)),
            avgDeaths: row.avg_deaths == null ? null : Math.round(Number(row.avg_deaths) * 10) / 10,
            deaths: Number(row.deaths) || 0,
        };
    }
    const deathsByKind = {};
    for (const row of deathKindResult?.results || []) {
        deathsByKind[row.kind || 'unknown'] = Number(row.deaths) || 0;
    }
    const inputs = {};
    for (const row of inputResult?.results || []) {
        inputs[row.kind || 'unknown'] = Number(row.sessions) || 0;
    }

    return jsonResponse(request, {
        days,
        from,
        sessions: Number(sessionsResult?.results?.[0]?.sessions) || 0,
        sessionsWithPlay: playTimes.length,
        totalPlayMs,
        avgSessionMs: playTimes.length ? Math.round(totalPlayMs / playTimes.length) : 0,
        medianSessionMs: playTimes.length ? playTimes[Math.floor(playTimes.length / 2)] : 0,
        levels,
        deathsByKind,
        daily: (dailyResult?.results || []).map((row) => ({
            day: row.day,
            sessions: Number(row.sessions) || 0,
        })),
        inputs,
    });
}

function normalizeEvent(event) {
    if (!event || typeof event !== 'object') return null;
    const type = event.type;
    if (!EVENT_TYPES.has(type)) return null;
    let level = null;
    if (event.level !== null && event.level !== undefined) {
        const parsed = Number(event.level);
        if (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_LEVEL) return null;
        level = parsed;
    }
    const mode = event.mode === 'hard' ? 'hard' : 'normal';
    const value = event.value === undefined || event.value === null ? 0 : Number(event.value);
    if (!Number.isFinite(value) || value < 0 || value > MAX_VALUE_MS) return null;
    const amount = event.count === undefined || event.count === null ? 0 : Number(event.count);
    if (!Number.isInteger(amount) || amount < 0 || amount > MAX_AMOUNT) return null;
    let kind = null;
    if (event.kind !== null && event.kind !== undefined) {
        kind = String(event.kind).slice(0, 32);
        if (!/^[A-Za-z0-9_.:-]*$/.test(kind)) return null;
        if (kind === '') kind = null;
    }
    return { type, level, mode, value: Math.round(value), amount, kind };
}

function normalizeDays(value) {
    if (value === null || value === undefined || value === '') return DEFAULT_DAYS;
    const days = Number(value);
    if (!Number.isInteger(days) || days < 1) return DEFAULT_DAYS;
    return Math.min(days, MAX_DAYS);
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
