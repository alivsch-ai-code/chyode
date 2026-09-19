import { CookieOptions, Request, Response } from 'express';
import { PoolClient } from 'pg';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool';
import { PublicUser, User, UserInvite } from '../types';
import { env } from '../config/env';
import { SESSION_COOKIE } from '../middleware/auth';
import { HttpError, badRequest, conflict, forbidden, notFound, unauthorized } from '../utils/httpError';
import { signSessionToken } from '../utils/jwt';
import { hashPassword, passwordSchema, verifyAgainstDummy, verifyPassword } from '../utils/password';
import { generateToken, hashString } from '../utils/tokens';
import { sendMail } from '../services/mailer.service';
import {
  accountExistsEmail,
  passwordChangedEmail,
  passwordResetEmail,
  verifyEmailEmail,
} from '../services/emailTemplates';

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

const deleteAccountSchema = z.object({ password: z.string().min(1, 'Bitte gib dein Passwort zur Bestätigung ein').max(200) });

/**
 * DELETE /api/auth/me — löscht das eigene Konto samt aller Daten (Recht auf Löschung).
 * Reisen, die das Konto erstellt hat, werden vollständig gelöscht; die Teilnahmen an fremden Reisen
 * (inkl. Stimmen, Notizen, Präferenzen) ebenfalls.
 */
export async function deleteAccount(req: Request, res: Response) {
  const parsed = deleteAccountSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);
  const user = req.user!;

  if (!user.password_hash || !(await verifyPassword(parsed.data.password, user.password_hash))) {
    throw new HttpError(403, 'Das Passwort ist falsch');
  }

  await withTransaction(async (client) => {
    if (user.role === 'admin') {
      const otherAdmins = await client.query(
        "SELECT 1 FROM users WHERE role = 'admin' AND status = 'active' AND password_hash IS NOT NULL AND id <> $1",
        [user.id]
      );
      if (otherAdmins.rows.length === 0) {
        throw conflict('Du bist der letzte Administrator. Ernenne zuerst eine andere Person zum Admin.');
      }
    }

    await client.query('DELETE FROM trips WHERE creator_id = $1', [user.id]);
    await client.query('DELETE FROM trip_users WHERE user_id = $1', [user.id]);
    await client.query('DELETE FROM email_verifications WHERE lower(email) = lower($1)', [user.email]);
    await client.query('DELETE FROM user_invites WHERE lower(email) = lower($1)', [user.email]);
    await client.query('DELETE FROM users WHERE id = $1', [user.id]);
  });

  clearSessionCookie(res);
  res.status(204).send();
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

/** Ordnet frühere Gast-Teilnahmen (Altdaten ohne Konto) mit gleicher E-Mail dem Account zu. */
async function claimGuestParticipations(client: PoolClient, userId: string, email: string) {
  await client.query(
    `UPDATE trip_users tu SET user_id = $1
     WHERE tu.user_id IS NULL AND lower(tu.email) = lower($2)
       AND NOT EXISTS (SELECT 1 FROM trip_users o WHERE o.trip_id = tu.trip_id AND o.user_id = $1)`,
    [userId, email]
  );
}

// ------------------------------------------------------------
// Selbstregistrierung mit E-Mail-Bestätigung
// ------------------------------------------------------------

/** GET /api/auth/config — öffentliche Einstellungen, die die Oberfläche braucht. */
export async function getAuthConfig(_req: Request, res: Response) {
  res.json({
    registrationEnabled: env.registrationEnabled,
    tripRetentionDays: env.tripRetentionDays,
    tripMaxAgeDays: env.tripMaxAgeDays,
  });
}

// Pro Adresse höchstens eine Mail pro Minute (Schutz vor Mail-Bombing fremder Postfächer).
const MAIL_COOLDOWN_MS = 60_000;
const recentMails = new Map<string, number>();

function mailAllowed(key: string): boolean {
  const now = Date.now();
  for (const [k, t] of recentMails) if (now - t > MAIL_COOLDOWN_MS) recentMails.delete(k);
  if (recentMails.has(key)) return false;
  recentMails.set(key, now);
  return true;
}

/** Nur relative Pfade als Ziel nach der Bestätigung zulassen (kein Open-Redirect). */
function sanitizeRedirect(value: string | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\') || /[\r\n]/.test(value)) return null;
  return value.slice(0, 300);
}

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Bitte gib deinen Namen ein').max(120),
  email: emailSchema,
  password: passwordSchema,
  next: z.string().max(300).optional(),
  // Honeypot: für Menschen unsichtbar, Bots füllen es aus
  website: z.string().max(200).optional(),
});

interface EmailVerificationRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  redirect_path: string | null;
}

/**
 * POST /api/auth/register — nimmt eine Registrierung entgegen. Es wird noch KEIN Konto angelegt:
 * erst der Klick auf den Bestätigungslink aus der E-Mail erzeugt es. Die Antwort ist immer
 * gleich, damit sich nicht herausfinden lässt, welche Adressen schon registriert sind.
 */
export async function register(req: Request, res: Response) {
  if (!env.registrationEnabled) {
    throw forbidden('Die Registrierung ist derzeit geschlossen. Bitte lass dich von einem Administrator einladen.');
  }

  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);
  const { name, email, password, website } = parsed.data;

  const neutralResponse = {
    message: 'Fast geschafft! Wir haben dir eine E-Mail geschickt. Bestätige darin deine Adresse, um loszulegen.',
  };

  if (website) return res.json(neutralResponse); // Bot

  if (password.toLowerCase() === email) throw badRequest('Das Passwort darf nicht deiner E-Mail-Adresse entsprechen');

  // Hashen in allen Pfaden, damit die Antwortzeit nicht verrät, ob die Adresse schon registriert ist
  const passwordHash = await hashPassword(password);

  const existing = await query<User>('SELECT * FROM users WHERE lower(email) = $1', [email]);
  const account = existing.rows[0];

  if (account?.password_hash) {
    // Konto existiert: Hinweis an das Postfach statt an den Anfragenden (keine Enumeration)
    if (account.status === 'active' && mailAllowed(`exists:${email}`)) {
      void sendMail(
        email,
        accountExistsEmail({
          name: account.name,
          loginLink: `${env.frontendUrl}/login`,
          resetLink: `${env.frontendUrl}/forgot-password`,
        })
      );
    }
    return res.json(neutralResponse);
  }

  if (!mailAllowed(`verify:${email}`)) return res.json(neutralResponse);

  const recent = await query<{ count: string }>(
    "SELECT COUNT(*) FROM email_verifications WHERE created_at > now() - interval '1 hour'"
  );
  if (parseInt(recent.rows[0].count, 10) >= env.registrationHourlyLimit) {
    throw new HttpError(429, 'Momentan gibt es sehr viele Registrierungen. Bitte versuche es später erneut.');
  }

  const token = generateToken(32);
  const redirectPath = sanitizeRedirect(parsed.data.next);

  await withTransaction(async (client) => {
    await client.query("DELETE FROM email_verifications WHERE expires_at < now() - interval '7 days'");
    await client.query(
      'UPDATE email_verifications SET used_at = now() WHERE lower(email) = $1 AND used_at IS NULL',
      [email]
    );
    await client.query(
      `INSERT INTO email_verifications (email, name, password_hash, redirect_path, token_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5, now() + ($6 || ' hours')::interval)`,
      [email, name, passwordHash, redirectPath, hashString(token), String(env.verificationTtlHours)]
    );
  });

  void sendMail(
    email,
    verifyEmailEmail({
      name,
      link: `${env.frontendUrl}/verify-email/${encodeURIComponent(token)}`,
      expiresInHours: env.verificationTtlHours,
    })
  );

  res.json(neutralResponse);
}

const verifyEmailSchema = z.object({ token: z.string().min(10).max(200) });

/** POST /api/auth/verify-email — bestätigt die Adresse, legt das Konto an und meldet an. */
export async function verifyEmail(req: Request, res: Response) {
  if (!env.registrationEnabled) {
    throw forbidden('Die Registrierung ist derzeit geschlossen. Bitte lass dich von einem Administrator einladen.');
  }
  const parsed = verifyEmailSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest('Ungültiger Bestätigungslink');

  const { user, redirectPath } = await withTransaction(async (client) => {
    const found = await client.query<EmailVerificationRow>(
      `SELECT id, email, name, password_hash, redirect_path FROM email_verifications
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
       FOR UPDATE`,
      [hashString(parsed.data.token)]
    );
    const verification = found.rows[0];
    if (!verification) throw notFound('Dieser Bestätigungslink ist ungültig oder abgelaufen');

    const existingResult = await client.query<User>(
      'SELECT * FROM users WHERE lower(email) = lower($1) FOR UPDATE',
      [verification.email]
    );
    const existing = existingResult.rows[0];

    if (existing?.password_hash) {
      await client.query('UPDATE email_verifications SET used_at = now() WHERE id = $1', [verification.id]);
      throw conflict('Für diese E-Mail-Adresse existiert bereits ein Konto. Bitte melde dich an.');
    }
    if (existing?.status === 'disabled') throw forbidden('Dieses Konto ist deaktiviert.');

    let account: User;
    if (existing) {
      // Altkonto ohne Passwort (früherer Magic-Link-Login): die bestätigte Adresse schaltet es frei
      const updated = await client.query<User>(
        `UPDATE users SET password_hash = $2, name = $3, token_version = token_version + 1, last_login_at = now()
         WHERE id = $1 RETURNING *`,
        [existing.id, verification.password_hash, verification.name]
      );
      account = updated.rows[0];
    } else {
      const created = await client.query<User>(
        `INSERT INTO users (email, name, password_hash, role, last_login_at)
         VALUES (lower($1), $2, $3, 'user', now()) RETURNING *`,
        [verification.email, verification.name, verification.password_hash]
      );
      account = created.rows[0];
    }

    await client.query('UPDATE email_verifications SET used_at = now() WHERE id = $1', [verification.id]);
    await claimGuestParticipations(client, account.id, verification.email);

    return { user: account, redirectPath: verification.redirect_path };
  });

  setSessionCookie(res, user);
  res.status(201).json({ user: toPublicUser(user), next: redirectPath });
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

    await claimGuestParticipations(client, account.id, invite.email);

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
