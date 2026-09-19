'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { AuthUser } from '@shared/types';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input, PasswordInput, PasswordRules } from '@/components/ui/Field';
import { Alert, Avatar, Badge, PageLoading } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/Toast';
import { apiFetch, errorMessage } from '@/lib/api';
import { useAuth, useRequireAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';

export default function AccountPage() {
  const { user, allowed, setUser } = useRequireAuth();
  if (!allowed || !user) return <PageLoading />;

  return (
    <div className="mx-auto max-w-2xl animate-fade-up space-y-8">
      <header className="flex items-center gap-4">
        <Avatar name={user.name ?? user.email} size={64} />
        <div className="min-w-0">
          <h1 className="text-title1">Konto</h1>
          <p className="truncate text-callout text-secondary">{user.email}</p>
        </div>
        {user.role === 'admin' && <Badge tone="accent" className="ml-auto">Administrator</Badge>}
      </header>

      <ProfileCard user={user} onUpdated={setUser} />
      <PasswordCard />
      <DeleteAccountCard />

      {user.last_login_at && (
        <p className="text-center text-footnote text-secondary">Letzte Anmeldung: {formatDateTime(user.last_login_at)}</p>
      )}
    </div>
  );
}

function ProfileCard({ user, onUpdated }: { user: AuthUser; onUpdated: (user: AuthUser) => void }) {
  const { toast } = useToast();
  const [name, setName] = useState(user.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const result = await apiFetch<{ user: AuthUser }>('/auth/me', { method: 'PATCH', body: { name: name.trim() } });
      onUpdated(result.user);
      toast('Name gespeichert', 'success');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card p-6 sm:p-8" aria-labelledby="profile-heading">
      <h2 id="profile-heading" className="text-title3">
        Profil
      </h2>
      <form onSubmit={onSubmit} className="mt-5 space-y-5" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <Input
          label="Anzeigename"
          hint="Wird in allen deinen Trips angezeigt."
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" loading={saving} disabled={!name.trim() || name.trim() === (user.name ?? '')}>
          Speichern
        </Button>
      </form>
    </section>
  );
}

function DeleteAccountCard() {
  const router = useRouter();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onDelete(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiFetch('/auth/me', { method: 'DELETE', body: { password } });
      await logout();
      router.replace('/');
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <section className="card p-6 sm:p-8" aria-labelledby="delete-heading">
      <h2 id="delete-heading" className="text-title3">
        Konto löschen
      </h2>
      <p className="mt-1 text-callout text-secondary">
        Löscht dein Konto und alle deine Daten unwiderruflich – auch Reisen, die du erstellt hast, samt allen Teilnehmerdaten.
        Deine Teilnahmen, Stimmen und Notizen bei anderen Reisen werden ebenfalls entfernt.
      </p>
      <Button variant="danger" className="mt-5" onClick={() => setOpen(true)}>
        Konto löschen …
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Konto löschen">
        <form onSubmit={onDelete} className="space-y-5">
          <div>
            <h2 className="text-title3">Konto endgültig löschen?</h2>
            <p className="mt-2 text-callout text-secondary">Bestätige mit deinem Passwort. Das lässt sich nicht rückgängig machen.</p>
          </div>
          {error && <Alert tone="error">{error}</Alert>}
          <PasswordInput
            label="Passwort"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="plain" onClick={() => setOpen(false)} disabled={busy}>
              Abbrechen
            </Button>
            <Button type="submit" variant="danger-solid" loading={busy} disabled={!password}>
              Endgültig löschen
            </Button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}

function PasswordCard() {
  const { toast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const mismatch = confirm.length > 0 && next !== confirm;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError('Die beiden neuen Passwörter stimmen nicht überein.');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/auth/change-password', { method: 'POST', body: { currentPassword: current, newPassword: next } });
      setCurrent('');
      setNext('');
      setConfirm('');
      toast('Passwort geändert. Andere Geräte wurden abgemeldet.', 'success');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card p-6 sm:p-8" aria-labelledby="password-heading">
      <h2 id="password-heading" className="text-title3">
        Passwort ändern
      </h2>
      <p className="mt-1 text-callout text-secondary">
        Nach der Änderung werden alle anderen Geräte automatisch abgemeldet.
      </p>
      <form onSubmit={onSubmit} className="mt-5 space-y-5" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <PasswordInput
          label="Aktuelles Passwort"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <div className="space-y-2.5">
          <PasswordInput
            label="Neues Passwort"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          <PasswordRules password={next} />
        </div>
        <PasswordInput
          label="Neues Passwort wiederholen"
          autoComplete="new-password"
          value={confirm}
          error={mismatch ? 'Die Passwörter stimmen nicht überein.' : null}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <Button type="submit" loading={saving} disabled={!current || next.length < 10 || next !== confirm}>
          Passwort ändern
        </Button>
      </form>
    </section>
  );
}
