import { env } from '../config/env';

/**
 * Minimaler Mailer für den Magic-Link-Login.
 * In Produktion hier einen echten Provider (SES, Postmark, Resend, ...) anbinden.
 * Im Dev-Modus wird der Link nur in die Konsole geloggt, damit man ihn manuell öffnen kann.
 */
export async function sendMagicLinkEmail(to: string, link: string): Promise<void> {
  if (env.nodeEnv === 'production' && !process.env.MAIL_PROVIDER_API_KEY) {
    console.warn('[mailer] Kein Mail-Provider konfiguriert – Link wird nur geloggt.');
  }

  console.log('----------------------------------------------------');
  console.log(`[mailer] Magic-Link für ${to} (von ${env.mailFrom}):`);
  console.log(link);
  console.log('----------------------------------------------------');

  // Beispiel für echten Versand via fetch an einen Mail-API-Provider:
  // await fetch('https://api.resend.com/emails', {
  //   method: 'POST',
  //   headers: {
  //     Authorization: `Bearer ${process.env.MAIL_PROVIDER_API_KEY}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     from: env.mailFrom,
  //     to,
  //     subject: 'Dein Login-Link für den Gruppen-Reiseplaner',
  //     html: `<p>Klicke hier zum Einloggen: <a href="${link}">${link}</a></p>`,
  //   }),
  // });
}
