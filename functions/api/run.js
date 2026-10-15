const MAX_REQUEST_BODY_BYTES = 8 * 1024;
const MAX_RUN_TOKENS_PER_HOUR = 120;
const TOKEN_CLEANUP_MS = 3 * 60 * 60 * 1000;

export async function onRequest(context) {
    try {
        return await handleRequest(context);
    } catch (error) {
        console.error('Run request failed:', error);
        return Response.json({ error: 'Run request failed' }, { status: 500 });
    }
}

async function handleRequest(context) {
    const { request, env } = context;
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(request) });
    }
    if (request.method !== 'POST') {
        return new Response('Method not allowed', {
            status: 405,
            headers: { Allow: 'POST, OPTIONS', ...corsHeaders(request) },
        });
    }
    let body;
    try {
        body = await readJson(request);
    } catch (error) {
        return Response.json({ error: error.message }, { status: error.statusCode || 400 });
    }
    const level = Number(body?.level);
    const playerId = typeof body?.playerId === 'string' ? body.playerId : '';
    const mode = body?.mode === 'hard' ? 'hard' : 'normal';
    if (!Number.isInteger(level) || level < 0 || level > 16 || !/^[0-9a-f-]{36}$/i.test(playerId)) {
        return Response.json({ error: 'Invalid run request' }, { status: 400 });
    }
    // Generous per-player throttle so a runaway client cannot burn D1 quota.
    // playerId is a validated UUID, so it carries no LIKE wildcards.
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recent = await env.DB.prepare(
        'SELECT COUNT(*) AS count FROM leaderboard_entries WHERE level = -1 AND name LIKE ? AND created_at > ?'
    )
        .bind(`%:${playerId}`, hourAgo)
        .first();
    if (Number(recent?.count || 0) >= MAX_RUN_TOKENS_PER_HOUR) {
        return Response.json(
            { error: 'Too many run starts, try again later' },
            { status: 429, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } }
        );
    }
    await env.DB.prepare('DELETE FROM leaderboard_entries WHERE level = -1 AND created_at < ?')
        .bind(new Date(Date.now() - TOKEN_CLEANUP_MS).toISOString())
        .run();
    const token = crypto.randomUUID();
    await env.DB.prepare(
        'INSERT INTO leaderboard_entries (id, level, mode, name, time_ms, created_at) VALUES (?, -1, ?, ?, 0, ?)'
    )
        .bind(token, mode, `run:${level}:${mode}:${playerId}`, new Date().toISOString())
        .run();
    return Response.json({ token }, { headers: { 'Cache-Control': 'no-store' } });
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
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        Vary: 'Origin',
    };
}
