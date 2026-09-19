'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import useSWR from 'swr';
import { AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/ui/Button';
import { Input, PasswordInput } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import { errorMessage } from '@/lib/api';
import { safeNextPath, useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const config = useSWR<{ registrationEnabled: boolean }>('/auth/config');
  const [registerHref, setRegisterHref] = useState('/register');

  const nextPath = () => safeNextPath(new URLSearchParams(window.location.search).get('next'));

  // Rücksprungziel an die Registrierung weiterreichen (z. B. Einladungslink zu einer Reise)
  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get('next');
    if (next) setRegisterHref(`/register?next=${encodeURIComponent(safeNextPath(next))}`);
  }, []);

  useEffect(() => {
    if (!loading && user) router.replace(nextPath());
  }, [loading, user, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace(nextPath());
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Anmelden"
      subtitle="Melde dich mit deinem Konto an, um deine Reisen zu sehen."
      footer={
        config.data?.registrationEnabled === false ? (
          <>Neue Konten entstehen derzeit nur per Einladung.</>
        ) : (
          <>
            Noch kein Konto?{' '}
            <Link href={registerHref} className="text-accent hover:underline">
              Jetzt registrieren
            </Link>
          </>
        )
      }
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
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
        <div>
          <PasswordInput
            label="Passwort"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="mt-2 text-right">
            <Link href="/forgot-password" className="text-subhead text-accent hover:underline">
              Passwort vergessen?
            </Link>
          </div>
        </div>
        <Button type="submit" size="lg" fullWidth loading={submitting} disabled={!email || !password}>
          Anmelden
        </Button>
      </form>
    </AuthShell>
  );
}
