'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import type { AuthUser } from '@shared/types';
import { AuthShell } from '@/components/AuthShell';
import { Button, LinkButton } from '@/components/ui/Button';
import { Input, PasswordInput, PasswordRules } from '@/components/ui/Field';
import { Alert, PageLoading } from '@/components/ui/Feedback';
import { apiFetch, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface InvitePreview {
  invite: { email: string; name: string | null; expiresAt: string };
}

export default function RegisterPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const router = useRouter();
  const { setUser } = useAuth();
  const [state, setState] = useState<'checking' | 'valid' | 'invalid'>('checking');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<InvitePreview>(`/auth/invite/${encodeURIComponent(token)}`)
      .then((data) => {
        setEmail(data.invite.email);
        setName(data.invite.name ?? '');
        setState('valid');
      })
      .catch(() => setState('invalid'));
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
      const result = await apiFetch<{ user: AuthUser }>('/auth/accept-invite', {
        method: 'POST',
        body: { token, name: name.trim(), password },
      });
      setUser(result.user);
      router.replace('/');
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  if (state === 'checking') return <PageLoading label="Einladung wird geprüft …" />;

  if (state === 'invalid') {
    return (
      <AuthShell title="Einladung nicht gültig">
        <Alert tone="warning">
          Diese Einladung ist abgelaufen, wurde widerrufen oder bereits verwendet. Bitte die Person, die dich
          eingeladen hat, dir eine neue Einladung zu senden.
        </Alert>
        <LinkButton href="/login" variant="plain" size="lg" fullWidth className="mt-5">
          Zur Anmeldung
        </LinkButton>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Willkommen"
      subtitle="Du wurdest eingeladen. Lege dein Konto an, um loszulegen."
      footer={
        <>
          Schon ein Konto?{' '}
          <Link href="/login" className="text-accent hover:underline">
            Anmelden
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <Input label="E-Mail-Adresse" type="email" value={email} readOnly autoComplete="username" className="bg-grouped" />
        <Input
          label="Dein Name"
          hint="So sehen dich die anderen in der Gruppe."
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
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
        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={submitting}
          disabled={!name.trim() || password.length < 10 || password !== confirm}
        >
          Konto erstellen
        </Button>
      </form>
    </AuthShell>
  );
}
