'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { AuthShell } from '@/components/AuthShell';
import { Button, LinkButton } from '@/components/ui/Button';
import { PasswordInput, PasswordRules } from '@/components/ui/Field';
import { Alert, PageLoading } from '@/components/ui/Feedback';
import { apiFetch, errorMessage } from '@/lib/api';

type LinkState = 'checking' | 'valid' | 'invalid';

export default function ResetPasswordPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [linkState, setLinkState] = useState<LinkState>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    apiFetch(`/auth/reset/${encodeURIComponent(token)}`)
      .then(() => setLinkState('valid'))
      .catch(() => setLinkState('invalid'));
  }, [token]);

  const mismatch = confirm.length > 0 && password !== confirm;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Die beiden Passwörter stimmen nicht überein.');
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/auth/reset-password', { method: 'POST', body: { token, password } });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (linkState === 'checking') return <PageLoading label="Link wird geprüft …" />;

  if (linkState === 'invalid') {
    return (
      <AuthShell title="Link nicht mehr gültig">
        <Alert tone="warning">
          Dieser Link zum Zurücksetzen ist abgelaufen oder wurde bereits verwendet. Fordere einfach einen neuen an.
        </Alert>
        <LinkButton href="/forgot-password" size="lg" fullWidth className="mt-5">
          Neuen Link anfordern
        </LinkButton>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="Passwort geändert">
        <Alert tone="success">Dein neues Passwort ist gespeichert. Alle bisherigen Anmeldungen wurden abgemeldet.</Alert>
        <LinkButton href="/login" size="lg" fullWidth className="mt-5">
          Zur Anmeldung
        </LinkButton>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Neues Passwort"
      subtitle="Wähle ein Passwort, das du nirgendwo sonst verwendest."
      footer={
        <Link href="/login" className="text-accent hover:underline">
          Abbrechen
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <div className="space-y-2.5">
          <PasswordInput
            label="Neues Passwort"
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
        <Button type="submit" size="lg" fullWidth loading={submitting} disabled={password.length < 10 || password !== confirm}>
          Passwort speichern
        </Button>
      </form>
    </AuthShell>
  );
}
