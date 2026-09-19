import { CookieOptions, Request, Response } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool';
import { PublicUser, User, UserInvite } from '../types';
import { env } from '../config/env';
import { SESSION_COOKIE } from '../middleware/auth';
import { HttpError, badRequest, conflict, notFound, unauthorized } from '../utils/httpError';
import { signSessionToken } from '../utils/jwt';
import { hashPassword, passwordSchema, verifyAgainstDummy, verifyPassword } from '../utils/password';
import { generateToken, hashString } from '../utils/tokens';
import { sendMail } from '../services/mailer.service';
import { passwordChangedEmail, passwordResetEmail } from '../services/emailTemplates';

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
const RESET_COOLDOWN_SECONDS = 60;

const emailSchema = z
  .string()
  .trim()
  .max(254)
  .email('Bitte gib eine gültige E-Mail-Adresse ein')
  .transform((value) => value.toLowerCase());

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    created_at: user.created_at,
    last_login_at: user.last_login_at,
  };
}

function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: env.sessionTtlDays * 24 * 60 * 60 * 1000,
  };
}

export function setSessionCookie(res: Response, user: Pick<User, 'id' | 'token_version'>) {
  res.cookie(SESSION_COOKIE, signSessionToken({ sub: user.id, tv: user.token_version }), sessionCookieOptions());
}

function clearSessionCookie(res: Response) {
  const { maxAge: _maxAge, ...options } = sessionCookieOptions();
  res.clearCookie(SESSION_COOKIE, options);
}

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Bitte gib dein Passwort ein').max(200),
});

/** POST /api/auth/login */
export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);
  const { email, password } = parsed.data;

  const genericError = () => unauthorized('E-Mail oder Passwort ist falsch');

  const found = await query<User>('SELECT * FROM users WHERE lower(email) = $1', [email]);
  const user = found.rows[0];

  if (!user || !user.password_hash || user.status !== 'active') {
    await verifyAgainstDummy(password);
    throw genericError();
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    throw new HttpError(429, 'Zu viele Fehlversuche. Bitte versuche es in einigen Minuten erneut.');
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    const failed = user.failed_logins + 1;
    if (failed >= MAX_FAILED_LOGINS) {
      await query(
        `UPDATE users SET failed_logins = 0, locked_until = now() + ($2 || ' minutes')::interval WHERE id = $1`,
        [user.id, String(LOCK_MINUTES)]
      );
    } else {
      await query('UPDATE users SET failed_logins = $2 WHERE id = $1', [user.id, failed]);
    }
    throw genericError();
  }

  await query('UPDATE users SET failed_logins = 0, locked_until = NULL, last_login_at = now() WHERE id = $1', [user.id]);

  setSessionCookie(res, user);
  res.json({ user: toPublicUser({ ...user, last_login_at: new Date().toISOString() }) });
}

/** POST /api/auth/logout */
export async function logout(_req: Request, res: Response) {
  clearSessionCookie(res);
  res.json({ ok: true });
}

/** GET /api/auth/me */
export async function getCurrentUser(req: Request, res: Response) {
  res.json({ user: toPublicUser(req.user!) });
}

const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Bitte gib einen Namen ein').max(120),
});

/** PATCH /api/auth/me */
export async function updateProfile(req: Request, res: Response) {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

  const result = await query<User>('UPDATE users SET name = $2 WHERE id = $1 RETURNING *', [
    req.user!.id,
    parsed.data.name,
  ]);
  // Anzeigename in bestehenden Trips mitziehen
  await query('UPDATE trip_users SET name = $2 WHERE user_id = $1', [req.user!.id, parsed.data.name]);

  res.json({ user: toPublicUser(result.rows[0]) });
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Bitte gib dein aktuelles Passwort ein').max(200),
  newPassword: passwordSchema,
});

/** POST /api/auth/change-password */
export async function changePassword(req: Request, res: Response) {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);
  const user = req.user!;

  if (!user.password_hash || !(await verifyPassword(parsed.data.currentPassword, user.password_hash))) {
    throw new HttpError(403, 'Das aktuelle Passwort ist falsch');
  }
  if (parsed.data.newPassword.toLowerCase() === user.email.toLowerCase()) {
    throw badRequest('Das Passwort darf nicht deiner E-Mail-Adresse entsprechen');
  }

  const updated = await query<User>(
    'UPDATE users SET password_hash = $2, token_version = token_version + 1 WHERE id = $1 RETURNING *',
    [user.id, await hashPassword(parsed.data.newPassword)]
  );

  // aktuelle Sitzung bleibt gültig, alle anderen werden durch token_version beendet
  setSessionCookie(res, updated.rows[0]);
  void sendMail(user.email, passwordChangedEmail({ name: user.name }));
  res.json({ ok: true });
}

// ------------------------------------------------------------
// Einladung annehmen (Registrierung)
// ------------------------------------------------------------

async function findValidInvite(token: string): Promise<UserInvite | null> {
  const result = await query<UserInvite>(
    `SELECT * FROM user_invites
     WHERE token_hash = $1 AND used_at IS NULL AND revoked_at IS NULL AND expires_at > now()`,
    [hashString(token)]
  );
  return result.rows[0] ?? null;
}

/** GET /api/auth/invite/:token — prüft eine Einladung und liefert die vorbelegten Daten. */
export async function getInvite(req: Request, res: Response) {
  const invite = await findValidInvite(req.params.token);
  if (!invite) throw notFound('Diese Einladung ist ungültig oder abgelaufen');

  res.json({ invite: { email: invite.email, name: invite.name, expiresAt: invite.expires_at } });
}

const acceptInviteSchema = z.object({
  token: z.string().min(10).max(200),
  name: z.string().trim().min(1, 'Bitte gib deinen Namen ein').max(120),
  password: passwordSchema,
});

/** POST /api/auth/accept-invite — legt den Account an bzw. aktiviert ihn und meldet an. */
export async function acceptInvite(req: Request, res: Response) {
  const parsed = acceptInviteSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);
  const { token, name, password } = parsed.data;

  const passwordHash = await hashPassword(password);

  const user = await withTransaction(async (client) => {
    const inviteResult = await client.query<UserInvite>(
      `SELECT * FROM user_invites
       WHERE token_hash = $1 AND used_at IS NULL AND revoked_at IS NULL AND expires_at > now()
       FOR UPDATE`,
      [hashString(token)]
    );
    const invite = inviteResult.rows[0];
    if (!invite) throw notFound('Diese Einladung ist ungültig oder abgelaufen');

    if (password.toLowerCase() === invite.email.toLowerCase()) {
      throw badRequest('Das Passwort darf nicht deiner E-Mail-Adresse entsprechen');
    }

    const existingResult = await client.query<User>(
      'SELECT * FROM users WHERE lower(email) = lower($1) FOR UPDATE',
      [invite.email]
    );
    const existing = existingResult.rows[0];
    if (existing?.password_hash) {
      throw conflict('Für diese E-Mail-Adresse existiert bereits ein Konto. Bitte melde dich an.');
    }

    let account: User;
    if (existing) {
      // Altkonto ohne Passwort (früherer Magic-Link-Login) wird aktiviert
      const updated = await client.query<User>(
        `UPDATE users SET password_hash = $2, name = $3, role = $4, status = 'active',
                token_version = token_version + 1, last_login_at = now()
         WHERE id = $1 RETURNING *`,
        [existing.id, passwordHash, name, invite.role]
      );
      account = updated.rows[0];
    } else {
      const created = await client.query<User>(
        `INSERT INTO users (email, name, password_hash, role, last_login_at)
         VALUES (lower($1), $2, $3, $4, now()) RETURNING *`,
        [invite.email, name, passwordHash, invite.role]
      );
      account = created.rows[0];
    }

    await client.query('UPDATE user_invites SET used_at = now() WHERE id = $1', [invite.id]);

    // frühere Gast-Teilnahmen mit derselben E-Mail dem Account zuordnen
    await client.query(
      `UPDATE trip_users tu SET user_id = $1
       WHERE tu.user_id IS NULL AND lower(tu.email) = lower($2)
         AND NOT EXISTS (SELECT 1 FROM trip_users o WHERE o.trip_id = tu.trip_id AND o.user_id = $1)`,
      [account.id, invite.email]
    );

    return account;
  });

  setSessionCookie(res, user);
  res.status(201).json({ user: toPublicUser(user) });
}

// ------------------------------------------------------------
// Passwort vergessen / zurücksetzen
// ------------------------------------------------------------

const forgotPasswordSchema = z.object({ email: emailSchema });

/** POST /api/auth/forgot-password — antwortet immer gleich, damit keine Konten erraten werden können. */
export async function forgotPassword(req: Request, res: Response) {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

  const neutralResponse = {
    message: 'Falls ein Konto mit dieser E-Mail-Adresse existiert, haben wir dir einen Link zum Zurücksetzen gesendet.',
  };

  const found = await query<User>("SELECT * FROM users WHERE lower(email) = $1 AND status = 'active'", [
    parsed.data.email,
  ]);
  const user = found.rows[0];
  if (!user) return res.json(neutralResponse);

  // Mail-Bombing verhindern: höchstens ein Link pro Minute
  const recent = await query(
    `SELECT 1 FROM password_resets WHERE user_id = $1 AND created_at > now() - ($2 || ' seconds')::interval LIMIT 1`,
    [user.id, String(RESET_COOLDOWN_SECONDS)]
  );
  if (recent.rows.length > 0) return res.json(neutralResponse);

  const token = generateToken(32);
  await query('UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [user.id]);
  await query(
    `INSERT INTO password_resets (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + ($3 || ' minutes')::interval)`,
    [user.id, hashString(token), String(env.passwordResetTtlMin)]
  );

  // nicht abwarten: die Antwortzeit darf nicht verraten, ob das Konto existiert
  void sendMail(
    user.email,
    passwordResetEmail({
      name: user.name,
      link: `${env.frontendUrl}/reset-password/${encodeURIComponent(token)}`,
      expiresInMinutes: env.passwordResetTtlMin,
    })
  );

  res.json(neutralResponse);
}

/** GET /api/auth/reset/:token — prüft, ob ein Reset-Link noch gültig ist. */
export async function checkResetToken(req: Request, res: Response) {
  const result = await query(
    `SELECT 1 FROM password_resets pr JOIN users u ON u.id = pr.user_id
     WHERE pr.token_hash = $1 AND pr.used_at IS NULL AND pr.expires_at > now() AND u.status = 'active'`,
    [hashString(req.params.token)]
  );
  if (result.rows.length === 0) throw notFound('Dieser Link ist ungültig oder abgelaufen');
  res.json({ valid: true });
}

const resetPasswordSchema = z.object({
  token: z.string().min(10).max(200),
  password: passwordSchema,
});

/** POST /api/auth/reset-password */
export async function resetPassword(req: Request, res: Response) {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);
  const { token, password } = parsed.data;

  const passwordHash = await hashPassword(password);

  const user = await withTransaction(async (client) => {
    const resetResult = await client.query<{ id: string; user_id: string }>(
      `SELECT pr.id, pr.user_id FROM password_resets pr
       WHERE pr.token_hash = $1 AND pr.used_at IS NULL AND pr.expires_at > now()
       FOR UPDATE`,
      [hashString(token)]
    );
    const reset = resetResult.rows[0];
    if (!reset) throw notFound('Dieser Link ist ungültig oder abgelaufen');

    const userResult = await client.query<User>("SELECT * FROM users WHERE id = $1 AND status = 'active' FOR UPDATE", [
      reset.user_id,
    ]);
    const account = userResult.rows[0];
    if (!account) throw notFound('Dieser Link ist ungültig oder abgelaufen');

    if (password.toLowerCase() === account.email.toLowerCase()) {
      throw badRequest('Das Passwort darf nicht deiner E-Mail-Adresse entsprechen');
    }

    // token_version erhöhen beendet alle bestehenden Sitzungen
    await client.query(
      `UPDATE users SET password_hash = $2, token_version = token_version + 1,
              failed_logins = 0, locked_until = NULL WHERE id = $1`,
      [account.id, passwordHash]
    );
    await client.query('UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [account.id]);
    return account;
  });

  void sendMail(user.email, passwordChangedEmail({ name: user.name }));
  res.json({ ok: true });
}
