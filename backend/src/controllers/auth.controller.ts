import { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/pool';
import { User } from '../types';
import { badRequest, unauthorized } from '../utils/httpError';
import { signCreatorSession, signMagicLinkToken, verifyToken, MagicLinkTokenPayload } from '../utils/jwt';
import { sendMagicLinkEmail } from '../services/mailer.service';
import { env } from '../config/env';

const requestMagicLinkSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120).optional(),
});

/** POST /api/auth/magic-link — fordert einen Login-Link für einen Trip-Ersteller an. */
export async function requestMagicLink(req: Request, res: Response) {
  const parsed = requestMagicLinkSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);
  const { email, name } = parsed.data;

  const existing = await query<User>('SELECT * FROM users WHERE email = $1', [email]);
  let user = existing.rows[0];

  if (!user) {
    const created = await query<User>(
      'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *',
      [email, name ?? null]
    );
    user = created.rows[0];
  }

  const token = signMagicLinkToken({ userId: user.id, email: user.email });
  const link = `${env.frontendUrl}/auth/verify?token=${encodeURIComponent(token)}`;

  await sendMagicLinkEmail(user.email, link);

  res.json({
    message: 'Magic-Link wurde versendet (im Dev-Modus siehe Server-Konsole).',
    // Nur zu Entwicklungszwecken direkt zurückgegeben, damit man nicht auf E-Mail warten muss:
    devLink: env.nodeEnv !== 'production' ? link : undefined,
  });
}

/** GET /api/auth/verify?token=... — verifiziert den Magic-Link und stellt eine Session aus. */
export async function verifyMagicLink(req: Request, res: Response) {
  const token = req.query.token;
  if (typeof token !== 'string') throw badRequest('Token fehlt');

  let payload: MagicLinkTokenPayload;
  try {
    payload = verifyToken<MagicLinkTokenPayload>(token);
  } catch {
    throw unauthorized('Magic-Link ist ungültig oder abgelaufen');
  }
  if (payload.purpose !== 'magic-link') throw unauthorized('Ungültiges Token');

  const sessionToken = signCreatorSession({ userId: payload.userId, email: payload.email });
  res.json({ token: sessionToken, user: { id: payload.userId, email: payload.email } });
}

/** GET /api/auth/me — liefert das aktuell eingeloggte Nutzerprofil. */
export async function getCurrentUser(req: Request, res: Response) {
  if (!req.creator) throw unauthorized();
  const result = await query<User>('SELECT * FROM users WHERE id = $1', [req.creator.userId]);
  if (!result.rows[0]) throw unauthorized();
  res.json({ user: result.rows[0] });
}
