/**
 * Legt den ersten Administrator an (oder befördert einen bestehenden Account) und
 * erzeugt einen Link zum Setzen des Passworts.
 *
 * Aufruf (im Backend-Container):
 *   node dist/scripts/bootstrap-admin.js <email> "<Name>"
 *
 * - Existiert die E-Mail bereits: Rolle wird auf admin gesetzt, Sessions werden beendet und
 *   ein Passwort-Setz-Link (1 Stunde gültig) erzeugt.
 * - Sonst: es wird eine Admin-Einladung (7 Tage gültig) erzeugt.
 * Der Link wird ausgegeben und zusätzlich per E-Mail versendet (sofern SMTP konfiguriert ist).
 */
import { env } from '../config/env';
import { pool, query } from '../db/pool';
import { User } from '../types';
import { generateToken, hashString } from '../utils/tokens';
import { sendMail } from '../services/mailer.service';
import { inviteEmail, passwordResetEmail } from '../services/emailTemplates';

async function main() {
  const [emailArg, ...nameParts] = process.argv.slice(2);
  const email = emailArg?.trim().toLowerCase();
  const name = nameParts.join(' ').trim() || null;

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error('Aufruf: node dist/scripts/bootstrap-admin.js <email> "<Name>"');
    process.exit(1);
  }

  const existing = await query<User>('SELECT * FROM users WHERE lower(email) = $1', [email]);
  const token = generateToken(32);
  let link: string;
  let mail;

  if (existing.rows[0]) {
    const user = existing.rows[0];
    await query(
      `UPDATE users SET role = 'admin', status = 'active', name = COALESCE($2, name),
              token_version = token_version + 1 WHERE id = $1`,
      [user.id, name]
    );
    await query('UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [user.id]);
    await query(
      `INSERT INTO password_resets (user_id, token_hash, expires_at)
       VALUES ($1, $2, now() + ($3 || ' minutes')::interval)`,
      [user.id, hashString(token), String(env.passwordResetTtlMin)]
    );
    link = `${env.frontendUrl}/reset-password/${encodeURIComponent(token)}`;
    console.log(`Bestehender Account ${email} ist jetzt Administrator.`);
    mail = await sendMail(
      email,
      passwordResetEmail({ name: name ?? user.name, link, expiresInMinutes: env.passwordResetTtlMin })
    );
  } else {
    await query(
      `UPDATE user_invites SET revoked_at = now()
       WHERE lower(email) = $1 AND used_at IS NULL AND revoked_at IS NULL`,
      [email]
    );
    await query(
      `INSERT INTO user_invites (email, name, role, token_hash, expires_at)
       VALUES ($1, $2, 'admin', $3, now() + ($4 || ' days')::interval)`,
      [email, name, hashString(token), String(env.inviteTtlDays)]
    );
    link = `${env.frontendUrl}/register/${encodeURIComponent(token)}`;
    console.log(`Admin-Einladung für ${email} erstellt.`);
    mail = await sendMail(
      email,
      inviteEmail({ inviteeName: name, inviterName: null, link, expiresInDays: env.inviteTtlDays })
    );
  }

  console.log(mail.sent ? `E-Mail an ${email} wurde versendet.` : `E-Mail wurde NICHT versendet (${mail.error}).`);
  console.log('\nLink zum Festlegen des Passworts (nur einmal verwendbar):\n');
  console.log(link);
  console.log('');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
