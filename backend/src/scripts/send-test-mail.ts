/**
 * Sendet eine Testnachricht, um die SMTP-Konfiguration zu prüfen.
 * Aufruf: node dist/scripts/send-test-mail.js <empfänger@example.com>
 */
import { env, smtpConfigured } from '../config/env';
import { sendMail } from '../services/mailer.service';
import { testEmail } from '../services/emailTemplates';

async function main() {
  const to = process.argv[2]?.trim();
  if (!to) {
    console.error('Aufruf: node dist/scripts/send-test-mail.js <empfänger@example.com>');
    process.exit(1);
  }
  if (!smtpConfigured) {
    console.error('SMTP_USER/SMTP_PASS sind nicht gesetzt.');
    process.exit(1);
  }

  console.log(`Sende Testmail über ${env.smtp.host}:${env.smtp.port} (secure=${env.smtp.secure}) von ${env.mailFrom} an ${to} ...`);
  const result = await sendMail(to, testEmail());
  console.log(result.sent ? 'Erfolgreich versendet.' : `Fehlgeschlagen: ${result.error}`);
  process.exit(result.sent ? 0 : 1);
}

main();
