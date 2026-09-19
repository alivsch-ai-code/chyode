import { env } from '../config/env';

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface LayoutOptions {
  preheader: string;
  heading: string;
  paragraphs: string[];
  button?: { label: string; url: string };
  footnote?: string;
}

function renderLayout(options: LayoutOptions): string {
  const { preheader, heading, paragraphs, button, footnote } = options;
  const appName = escapeHtml(env.appName);

  const paragraphHtml = paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">${p}</p>`)
    .join('');

  const buttonHtml = button
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;">
        <tr><td style="border-radius:10px;background:#0f766e;">
          <a href="${escapeHtml(button.url)}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(button.label)}</a>
        </td></tr>
      </table>
      <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#64748b;">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br><a href="${escapeHtml(button.url)}" style="color:#0f766e;word-break:break-all;">${escapeHtml(button.url)}</a></p>`
    : '';

  const footnoteHtml = footnote
    ? `<p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#64748b;">${footnote}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#0f766e;padding:20px 32px;font-size:18px;font-weight:700;color:#ffffff;">${appName}</td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0f172a;">${escapeHtml(heading)}</h1>
          ${paragraphHtml}
          ${buttonHtml}
          ${footnoteHtml}
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">${appName} &middot; Diese Nachricht wurde automatisch versendet.</p>
    </td></tr>
  </table>
</body>
</html>`;
}

export function inviteEmail(params: {
  inviteeName: string | null;
  inviterName: string | null;
  link: string;
  expiresInDays: number;
}): EmailContent {
  const { inviteeName, inviterName, link, expiresInDays } = params;
  const greeting = inviteeName ? `Hallo ${escapeHtml(inviteeName)},` : 'Hallo,';
  const inviter = inviterName ? escapeHtml(inviterName) : 'Ein Administrator';

  const html = renderLayout({
    preheader: `Du wurdest zum ${env.appName} eingeladen.`,
    heading: 'Du bist eingeladen',
    paragraphs: [
      greeting,
      `${inviter} hat dich zum ${escapeHtml(env.appName)} eingeladen. Dort planst du gemeinsam mit deiner Gruppe Reisen, stimmst über Wochenenden ab und sammelst Wünsche.`,
      'Lege jetzt dein Konto an und wähle ein Passwort:',
    ],
    button: { label: 'Konto anlegen', url: link },
    footnote: `Der Link ist ${expiresInDays} Tage gültig und kann nur einmal verwendet werden. Wenn du diese Einladung nicht erwartet hast, kannst du diese E-Mail ignorieren.`,
  });

  const text = [
    inviteeName ? `Hallo ${inviteeName},` : 'Hallo,',
    '',
    `${inviterName ?? 'Ein Administrator'} hat dich zum ${env.appName} eingeladen.`,
    'Lege dein Konto an und wähle ein Passwort:',
    link,
    '',
    `Der Link ist ${expiresInDays} Tage gültig und kann nur einmal verwendet werden.`,
    'Wenn du diese Einladung nicht erwartet hast, kannst du diese E-Mail ignorieren.',
  ].join('\n');

  return { subject: `Einladung zum ${env.appName}`, html, text };
}

export function passwordResetEmail(params: {
  name: string | null;
  link: string;
  expiresInMinutes: number;
}): EmailContent {
  const { name, link, expiresInMinutes } = params;

  const html = renderLayout({
    preheader: 'Setze dein Passwort zurück.',
    heading: 'Passwort zurücksetzen',
    paragraphs: [
      name ? `Hallo ${escapeHtml(name)},` : 'Hallo,',
      `für dein Konto beim ${escapeHtml(env.appName)} wurde das Zurücksetzen des Passworts angefordert. Klicke auf den Button, um ein neues Passwort zu vergeben:`,
    ],
    button: { label: 'Neues Passwort festlegen', url: link },
    footnote: `Der Link ist ${expiresInMinutes} Minuten gültig und kann nur einmal verwendet werden. Falls du das nicht angefordert hast, ignoriere diese E-Mail – dein Passwort bleibt unverändert.`,
  });

  const text = [
    name ? `Hallo ${name},` : 'Hallo,',
    '',
    `für dein Konto beim ${env.appName} wurde das Zurücksetzen des Passworts angefordert.`,
    'Neues Passwort festlegen:',
    link,
    '',
    `Der Link ist ${expiresInMinutes} Minuten gültig und kann nur einmal verwendet werden.`,
    'Falls du das nicht angefordert hast, ignoriere diese E-Mail – dein Passwort bleibt unverändert.',
  ].join('\n');

  return { subject: `Passwort zurücksetzen – ${env.appName}`, html, text };
}

export function passwordChangedEmail(params: { name: string | null }): EmailContent {
  const html = renderLayout({
    preheader: 'Dein Passwort wurde geändert.',
    heading: 'Dein Passwort wurde geändert',
    paragraphs: [
      params.name ? `Hallo ${escapeHtml(params.name)},` : 'Hallo,',
      `das Passwort für dein Konto beim ${escapeHtml(env.appName)} wurde soeben geändert. Alle bisherigen Anmeldungen wurden abgemeldet.`,
      'Warst du das nicht? Setze dein Passwort sofort über „Passwort vergessen“ zurück und informiere den Administrator.',
    ],
  });

  const text = [
    params.name ? `Hallo ${params.name},` : 'Hallo,',
    '',
    `das Passwort für dein Konto beim ${env.appName} wurde soeben geändert. Alle bisherigen Anmeldungen wurden abgemeldet.`,
    'Warst du das nicht? Setze dein Passwort sofort über „Passwort vergessen“ zurück und informiere den Administrator.',
  ].join('\n');

  return { subject: `Dein Passwort wurde geändert – ${env.appName}`, html, text };
}

export function testEmail(): EmailContent {
  const html = renderLayout({
    preheader: 'Testnachricht',
    heading: 'Der E-Mail-Versand funktioniert',
    paragraphs: ['Diese Testnachricht bestätigt, dass die SMTP-Anbindung korrekt eingerichtet ist.'],
  });
  return {
    subject: `Testnachricht – ${env.appName}`,
    html,
    text: 'Der E-Mail-Versand funktioniert. Diese Testnachricht bestätigt, dass die SMTP-Anbindung korrekt eingerichtet ist.',
  };
}
