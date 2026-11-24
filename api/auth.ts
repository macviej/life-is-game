import crypto from 'node:crypto';
import {
  ensureSchema,
  extractBearerToken,
  getSql,
  hashPassword,
  signToken,
  verifyPassword,
  verifyToken,
} from './_db.js';

export async function GET(request: Request) {
  try {
    const token = extractBearerToken(request);
    const session = verifyToken(token);
    if (!session) {
      return Response.json({ user: null }, { status: 401 });
    }

    await ensureSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT id, email, display_name
      FROM app_users
      WHERE id = ${session.uid}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return Response.json({ user: null }, { status: 401 });
    }

    const row = rows[0];
    return Response.json({
      user: {
        uid: String(row.id),
        email: String(row.email),
        displayName: String(row.display_name),
      },
    });
  } catch (err) {
    console.error('Auth GET error:', err);
    return Response.json(
      { error: 'Ошибка проверки сессии.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: 'login' | 'register' | 'change_password';
      email?: string;
      password?: string;
      currentPassword?: string;
      newPassword?: string;
      displayName?: string;
      initialState?: unknown;
    };

    const action = body.action;

    if (action === 'change_password') {
      const token = extractBearerToken(request);
      const session = verifyToken(token);
      if (!session) {
        return Response.json({ error: 'Требуется вход в аккаунт.' }, { status: 401 });
      }

      const currentPassword = body.currentPassword ?? '';
      const newPassword = body.newPassword ?? '';

      if (newPassword.length < 6) {
        return Response.json(
          { error: 'Новый пароль должен содержать минимум 6 символов.' },
          { status: 400 }
        );
      }

      await ensureSchema();
      const sql = getSql();
      const rows = await sql`
        SELECT password_hash FROM app_users WHERE id = ${session.uid} LIMIT 1
      `;

      if (rows.length === 0) {
        return Response.json({ error: 'Аккаунт не найден.' }, { status: 404 });
      }

      const valid = verifyPassword(currentPassword, String(rows[0].password_hash));
      if (!valid) {
        return Response.json({ error: 'Текущий пароль указан неверно.' }, { status: 401 });
      }

      const newHash = hashPassword(newPassword);
      await sql`
        UPDATE app_users
        SET password_hash = ${newHash}
        WHERE id = ${session.uid}
      `;

      return Response.json({ ok: true });
    }

    const email = (body.email ?? '').trim().toLowerCase();
    const password = body.password ?? '';

    if (!email || !email.includes('@')) {
      return Response.json({ error: 'Проверь корректность email.' }, { status: 400 });
    }
    if (password.length < 6) {
      return Response.json(
        { error: 'Пароль должен содержать минимум 6 символов.' },
        { status: 400 }
      );
    }

    await ensureSchema();
    const sql = getSql();

    if (action === 'register') {
      const existing = await sql`
        SELECT id FROM app_users WHERE email = ${email} LIMIT 1
      `;
      if (existing.length > 0) {
        return Response.json(
          { error: 'Аккаунт с этим email уже зарегистрирован.' },
          { status: 409 }
        );
      }

      const uid = `usr_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
      const displayName = (body.displayName ?? '').trim() || email.split('@')[0] || 'Атлет';
      const passwordHash = hashPassword(password);
      const now = Date.now();
      const stateJson = body.initialState ? JSON.stringify(body.initialState) : null;

      await sql`
        INSERT INTO app_users (id, email, display_name, password_hash, game_state, state_updated_at)
        VALUES (${uid}, ${email}, ${displayName}, ${passwordHash}, ${stateJson}::jsonb, ${now})
      `;

      const token = signToken({ uid, email, displayName });
      return Response.json({
        token,
        user: { uid, email, displayName },
        gameState: body.initialState ?? null,
        updatedAt: now,
      });
    }

    // Default: login
    const rows = await sql`
      SELECT id, email, display_name, password_hash, game_state, state_updated_at
      FROM app_users
      WHERE email = ${email}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return Response.json({ error: 'Неверный email или пароль.' }, { status: 401 });
    }

    const row = rows[0];
    const valid = verifyPassword(password, String(row.password_hash));
    if (!valid) {
      return Response.json({ error: 'Неверный email или пароль.' }, { status: 401 });
    }

    const uid = String(row.id);
    const displayName = String(row.display_name);
    const token = signToken({ uid, email, displayName });

    return Response.json({
      token,
      user: { uid, email, displayName },
      gameState: row.game_state ?? null,
      updatedAt: Number(row.state_updated_at ?? 0),
    });
  } catch (err) {
    console.error('Auth POST error:', err);
    return Response.json(
      { error: 'Ошибка сервера авторизации. Попробуй ещё раз.' },
      { status: 500 }
    );
  }
}
