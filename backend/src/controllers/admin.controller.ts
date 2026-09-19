import { Request, Response } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool';
import { env } from '../config/env';
import { isUuid } from '../middleware/auth';
import { User } from '../types';
import { badRequest, conflict, forbidden, notFound } from '../utils/httpError';
import { generateToken, hashString } from '../utils/tokens';
import { sendMail } from '../services/mailer.service';
import { inviteEmail } from '../services/emailTemplates';
import { toPublicUser } from './auth.controller';

const emailSchema = z
  .string()
  .trim()
  .max(254)
  .email('Bitte gib eine gültige E-Mail-Adresse ein')
  .transform((value) => value.toLowerCase());

interface InviteRow {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'user';
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
  created_at: string;
  invited_by_name: string | null;
}

function inviteStatus(row: InviteRow): 'pending' | 'accepted' | 'revoked' | 'expired' {
  if (row.used_at) return 'accepted';
  if (row.revoked_at) return 'revoked';
  if (new Date(row.expires_at) <= new Date()) return 'expired';
  return 'pending';
}

function toPublicInvite(row: InviteRow) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    status: inviteStatus(row),
    expires_at: row.expires_at,
    created_at: row.created_at,
    invited_by_name: row.invited_by_name,
  };
}

const INVITE_SELECT = `
  SELECT i.id, i.email, i.name, i.role, i.expires_at, i.used_at, i.revoked_at, i.created_at,
         u.name AS invited_by_name
  FROM user_invites i
  LEFT JOIN users u ON u.id = i.invited_by`;

/** GET /api/admin/users */
export async function listUsers(_req: Request, res: Response) {
  const result = await query<User>('SELECT * FROM users ORDER BY created_at ASC');
  res.json({ users: result.rows.map(toPublicUser) });
}

const updateUserSchema = z
  .object({
    role: z.enum(['admin', 'user']).optional(),
    status: z.enum(['active', 'disabled']).optional(),
  })
  .refine((v) => v.role !== undefined || v.status !== undefined, 'Nichts zu ändern');

/** PATCH /api/admin/users/:id — Rolle ändern oder Konto (de)aktivieren. */
export async function updateUser(req: Request, res: Response) {
  const { id } = req.params;
  if (!isUuid(id)) throw notFound('Nutzer nicht gefunden');

  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);
  const { role, status } = parsed.data;

  if (id === req.user!.id && (role === 'user' || status === 'disabled')) {
    throw forbidden('Du kannst dir die eigenen Adminrechte oder dein Konto nicht selbst entziehen');
  }

  const updated = await withTransaction(async (client) => {
    const target = await client.query<User>('SELECT * FROM users WHERE id = $1 FOR UPDATE', [id]);
    if (!target.rows[0]) throw notFound('Nutzer nicht gefunden');

    const result = await client.query<User>(
      `UPDATE users SET role = COALESCE($2::text, role), status = COALESCE($3::text, status),
              token_version = CASE WHEN $3::text = 'disabled' THEN token_version + 1 ELSE token_version END
       WHERE id = $1 RETURNING *`,
      [id, role ?? null, status ?? null]
    );

    const admins = await client.query(
      "SELECT 1 FROM users WHERE role = 'admin' AND status = 'active' AND password_hash IS NOT NULL"
    );
    if (admins.rows.length === 0) throw conflict('Es muss mindestens ein aktiver Administrator übrig bleiben');
    return result.rows[0];
  });

  res.json({ user: toPublicUser(updated) });
}

/** GET /api/admin/invites */
export async function listInvites(_req: Request, res: Response) {
  const result = await query<InviteRow>(`${INVITE_SELECT} ORDER BY i.created_at DESC LIMIT 200`);
  res.json({ invites: result.rows.map(toPublicInvite) });
}

const createInviteSchema = z.object({
  email: emailSchema,
  name: z.string().trim().max(120).optional(),
  role: z.enum(['admin', 'user']).default('user'),
});

function inviteLink(token: string): string {
  return `${env.frontendUrl}/register/${encodeURIComponent(token)}`;
}

/** POST /api/admin/invites — lädt einen Nutzer per E-Mail ein. */
export async function createInvite(req: Request, res: Response) {
  const parsed = createInviteSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);
  const { email, name, role } = parsed.data;

  const existing = await query<User>('SELECT id, password_hash FROM users WHERE lower(email) = $1', [email]);
  if (existing.rows[0]?.password_hash) {
    throw conflict('Für diese E-Mail-Adresse existiert bereits ein Konto');
  }

  const token = generateToken(32);
  const inviteId = await withTransaction(async (client) => {
    // ältere offene Einladungen für dieselbe Adresse ungültig machen
    await client.query(
      `UPDATE user_invites SET revoked_at = now()
       WHERE lower(email) = $1 AND used_at IS NULL AND revoked_at IS NULL`,
      [email]
    );
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO user_invites (email, name, role, token_hash, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, now() + ($6 || ' days')::interval) RETURNING id`,
      [email, name || null, role, hashString(token), req.user!.id, String(env.inviteTtlDays)]
    );
    return inserted.rows[0].id;
  });

  const link = inviteLink(token);
  const mail = await sendMail(
    email,
    inviteEmail({
      inviteeName: name || null,
      inviterName: req.user!.name,
      link,
      expiresInDays: env.inviteTtlDays,
    })
  );

  const row = await query<InviteRow>(`${INVITE_SELECT} WHERE i.id = $1`, [inviteId]);
  // Der Link geht bewusst nur an den angemeldeten Admin zurück (Fallback, falls die Mail nicht ankommt).
  res.status(201).json({
    invite: toPublicInvite(row.rows[0]),
    link,
    emailSent: mail.sent,
    emailError: mail.sent ? undefined : mail.error,
  });
}

/** POST /api/admin/invites/:id/resend — erzeugt einen neuen Link und versendet ihn erneut. */
export async function resendInvite(req: Request, res: Response) {
  const { id } = req.params;
  if (!isUuid(id)) throw notFound('Einladung nicht gefunden');

  const token = generateToken(32);
  const updated = await query<{ email: string; name: string | null }>(
    `UPDATE user_invites
     SET token_hash = $2, expires_at = now() + ($3 || ' days')::interval
     WHERE id = $1 AND used_at IS NULL AND revoked_at IS NULL
     RETURNING email, name`,
    [id, hashString(token), String(env.inviteTtlDays)]
  );
  if (!updated.rows[0]) throw notFound('Einladung nicht gefunden oder nicht mehr offen');

  const link = inviteLink(token);
  const mail = await sendMail(
    updated.rows[0].email,
    inviteEmail({
      inviteeName: updated.rows[0].name,
      inviterName: req.user!.name,
      link,
      expiresInDays: env.inviteTtlDays,
    })
  );

  res.json({ link, emailSent: mail.sent, emailError: mail.sent ? undefined : mail.error });
}

/** DELETE /api/admin/invites/:id — widerruft eine offene Einladung. */
export async function revokeInvite(req: Request, res: Response) {
  const { id } = req.params;
  if (!isUuid(id)) throw notFound('Einladung nicht gefunden');

  const result = await query(
    'UPDATE user_invites SET revoked_at = now() WHERE id = $1 AND used_at IS NULL AND revoked_at IS NULL',
    [id]
  );
  if (result.rowCount === 0) throw notFound('Einladung nicht gefunden oder nicht mehr offen');
  res.status(204).send();
}
