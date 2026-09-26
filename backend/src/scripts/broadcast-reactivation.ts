/**
 * Sendet die "Zeit für den nächsten Trip"-Rundmail an alle aktiven Konten mit Passwort
 * (also keine offenen Einladungen, keine deaktivierten Konten).
 *
 * Aufruf (im Backend-Container):
 *   node dist/scripts/broadcast-reactivation.js --dry-run   # zeigt nur, an wie viele es ginge
 *   node dist/scripts/broadcast-reactivation.js --send      # versendet wirklich
 */
import { env, smtpConfigured } from '../config/env';
import { pool, query } from '../db/pool';
import { sendMail } from '../services/mailer.service';
import { reactivationEmail } from '../services/emailTemplates';

function mask(email: string): string {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain ?? '?'}`;
}

async function main() {
  const dryRun = !process.argv.includes('--send');

  const { rows } = await query<{ id: string; email: string; name: string | null }>(
    "SELECT id, email, name FROM users WHERE status = 'active' AND password_hash IS NOT NULL ORDER BY created_at"
  );

  console.log(`${rows.length} aktive Konten gefunden.`);
  if (dryRun) {
    console.log('Testlauf (--dry-run) – es wird nichts verschickt. Für den echten Versand: --send');
    rows.forEach((u) => console.log(`  würde senden an ${mask(u.email)}`));
    return;
  }

  if (!smtpConfigured) {
    console.error('SMTP_USER/SMTP_PASS sind nicht gesetzt – Abbruch.');
    process.exitCode = 1;
    return;
  }

  const loginLink = `${env.frontendUrl}/login`;
  let ok = 0;
  let failed = 0;

  for (const user of rows) {
    const result = await sendMail(user.email, reactivationEmail({ name: user.name, loginLink }));
    if (result.sent) {
      ok += 1;
      console.log(`  OK    ${mask(user.email)}`);
    } else {
      failed += 1;
      console.log(`  FEHLER ${mask(user.email)}: ${result.error}`);
    }
    // kleine Pause, um das Postfach nicht zu überlasten
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`\nFertig: ${ok} versendet, ${failed} fehlgeschlagen.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
