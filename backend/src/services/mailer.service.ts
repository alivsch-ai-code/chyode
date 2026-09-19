import nodemailer, { Transporter } from 'nodemailer';
import { env, smtpConfigured } from '../config/env';
import { EmailContent } from './emailTemplates';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure, // true = SSL (Port 465), false = STARTTLS (Port 587)
      requireTLS: !env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }
  return transporter;
}

export interface SendResult {
  sent: boolean;
  error?: string;
}

/**
 * Versendet eine E-Mail über das konfigurierte SMTP-Postfach (IONOS).
 * Wirft nie – der Aufrufer entscheidet anhand des Ergebnisses, was der Nutzer sieht.
 */
export async function sendMail(to: string, content: EmailContent): Promise<SendResult> {
  if (!smtpConfigured) {
    if (env.nodeEnv === 'production') {
      console.warn(`[mailer] SMTP nicht konfiguriert – E-Mail an ${to} ("${content.subject}") wurde nicht versendet.`);
    } else {
      console.log('----------------------------------------------------');
      console.log(`[mailer] (SMTP nicht konfiguriert) an ${to}: ${content.subject}`);
      console.log(content.text);
      console.log('----------------------------------------------------');
    }
    return { sent: false, error: 'SMTP nicht konfiguriert' };
  }

  try {
    await getTransporter().sendMail({
      from: `"${env.appName}" <${env.mailFrom}>`,
      to,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[mailer] Versand an ${to} fehlgeschlagen: ${message}`);
    return { sent: false, error: message };
  }
}
