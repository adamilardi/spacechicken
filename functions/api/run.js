export async function onRequest(context) {
    const { request, env } = context;
    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
    }
    let body;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const level = Number(body?.level);
    const playerId = typeof body?.playerId === 'string' ? body.playerId : '';
    if (!Number.isInteger(level) || level < 0 || level > 16 || !/^[0-9a-f-]{36}$/i.test(playerId)) {
        return Response.json({ error: 'Invalid level' }, { status: 400 });
    }
    await env.DB.prepare('DELETE FROM leaderboard_entries WHERE level = -1 AND created_at < ?')
        .bind(new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString())
        .run();
    const token = crypto.randomUUID();
    await env.DB.prepare(
        'INSERT INTO leaderboard_entries (id, level, name, time_ms, created_at) VALUES (?, -1, ?, 0, ?)'
    )
        .bind(token, `run:${level}:${playerId}`, new Date().toISOString())
        .run();
    return Response.json({ token }, { headers: { 'Cache-Control': 'no-store' } });
}
