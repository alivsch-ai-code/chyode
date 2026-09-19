'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import { apiFetch, errorMessage } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch('/auth/forgot-password', { method: 'POST', body: { email: email.trim() } });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Passwort vergessen"
      subtitle="Wir senden dir einen Link, mit dem du ein neues Passwort festlegst."
      footer={
        <Link href="/login" className="text-accent hover:underline">
          Zurück zur Anmeldung
        </Link>
      }
    >
      {sent ? (
        <Alert tone="success" title="Prüfe dein Postfach">
          Falls ein Konto mit <strong className="font-semibold">{email}</strong> existiert, haben wir dir eine E-Mail mit dem
          Link zum Zurücksetzen geschickt. Der Link ist 60 Minuten gültig. Schau bei Bedarf auch im Spam-Ordner nach.
        </Alert>
      ) : (
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
          <Button type="submit" size="lg" fullWidth loading={submitting} disabled={!email}>
            Link senden
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
