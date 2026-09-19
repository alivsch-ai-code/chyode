'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import useSWR from 'swr';
import { AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/ui/Button';
import { Input, PasswordInput, PasswordRules } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import { IconMail } from '@/components/ui/Icons';
import { apiFetch, errorMessage } from '@/lib/api';
import { safeNextPath } from '@/lib/auth';

export default function RegisterPage() {
  const config = useSWR<{ registrationEnabled: boolean }>('/auth/config');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [website, setWebsite] = useState(''); // Honeypot
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const closed = config.data?.registrationEnabled === false;
  const mismatch = confirm.length > 0 && password !== confirm;
  const [loginHref, setLoginHref] = useState('/login');
  const nextParam = () => new URLSearchParams(window.location.search).get('next');

  useEffect(() => {
    const next = nextParam();
    if (next) setLoginHref(`/login?next=${encodeURIComponent(safeNextPath(next))}`);
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Die beiden Passwörter stimmen nicht überein.');
      return;
    }
    setSubmitting(true);
    try {
      const next = nextParam();
      await apiFetch('/auth/register', {
        method: 'POST',
        body: {
          name: name.trim(),
          email: email.trim(),
          password,
          website,
          next: next ? safeNextPath(next, '') || undefined : undefined,
        },
      });
      setSentTo(email.trim());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (sentTo) {
    return (
      <AuthShell title="Prüfe dein Postfach">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
            <IconMail size={26} />
          </span>
          <p className="text-callout text-secondary">
            Wir haben dir eine E-Mail an <strong className="font-semibold text-label">{sentTo}</strong> geschickt. Klicke auf den
            Link darin, um deine Adresse zu bestätigen und loszulegen. Der Link ist 24 Stunden gültig.
          </p>
          <p className="text-footnote text-secondary">Nichts angekommen? Schau im Spam-Ordner nach.</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Konto erstellen"
      subtitle="Registriere dich und plane deine nächste Reise gemeinsam mit Freunden."
      footer={
        <>
          Schon ein Konto?{' '}
          <Link href={loginHref} className="text-accent hover:underline">
            Anmelden
          </Link>
        </>
      }
    >
      {closed ? (
        <Alert tone="warning" title="Registrierung geschlossen">
          Neue Konten entstehen derzeit nur per Einladung. Bitte lass dich von einem Administrator einladen.
        </Alert>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          {error && <Alert tone="error">{error}</Alert>}
          <Input
            label="Dein Name"
            hint="So sehen dich die anderen in der Gruppe."
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="E-Mail-Adresse"
            type="email"
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="space-y-2.5">
            <PasswordInput
              label="Passwort"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordRules password={password} />
          </div>
          <PasswordInput
            label="Passwort wiederholen"
            autoComplete="new-password"
            required
            value={confirm}
            error={mismatch ? 'Die Passwörter stimmen nicht überein.' : null}
            onChange={(e) => setConfirm(e.target.value)}
          />

          {/* Honeypot: für Menschen unsichtbar und nicht per Tab erreichbar */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>
              Website
              <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </label>
          </div>

          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={submitting}
            disabled={!name.trim() || !email.trim() || password.length < 10 || password !== confirm}
          >
            Konto erstellen
          </Button>
          <p className="text-center text-footnote text-secondary">
            Mit der Registrierung stimmst du der Verarbeitung deiner Daten gemäß{' '}
            <Link href="/datenschutz" className="text-accent hover:underline">
              Datenschutzerklärung
            </Link>{' '}
            zu.
          </p>
        </form>
      )}
    </AuthShell>
  );
}
