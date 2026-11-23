import {
  ensureSchema,
  extractBearerToken,
  getSql,
  verifyToken,
} from './_db.js';

export async function GET(request: Request) {
  try {
    const token = extractBearerToken(request);
    const session = verifyToken(token);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT game_state, state_updated_at, display_name
      FROM app_users
      WHERE id = ${session.uid}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    return Response.json({
      gameState: rows[0].game_state ?? null,
      updatedAt: Number(rows[0].state_updated_at ?? 0),
      displayName: String(rows[0].display_name ?? session.displayName),
    });
  } catch (err) {
    console.error('Sync GET error:', err);
    return Response.json({ error: 'Failed to load cloud state' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = extractBearerToken(request);
    const session = verifyToken(token);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as {
      gameState?: Record<string, unknown>;
      updatedAt?: number;
    };

    if (!body.gameState || typeof body.gameState !== 'object') {
      return Response.json({ error: 'Invalid gameState payload' }, { status: 400 });
    }

    const updatedAt = typeof body.updatedAt === 'number' ? body.updatedAt : Date.now();
    const playerName =
      typeof body.gameState.playerName === 'string' && body.gameState.playerName.trim()
        ? body.gameState.playerName.trim().slice(0, 40)
        : session.displayName;

    await ensureSchema();
    const sql = getSql();
    const stateJson = JSON.stringify(body.gameState);

    await sql`
      UPDATE app_users
      SET
        game_state = ${stateJson}::jsonb,
        state_updated_at = ${updatedAt},
        display_name = ${playerName}
      WHERE id = ${session.uid}
    `;

    return Response.json({
      ok: true,
      updatedAt,
    });
  } catch (err) {
    console.error('Sync POST error:', err);
    return Response.json({ error: 'Failed to save cloud state' }, { status: 500 });
  }
}
