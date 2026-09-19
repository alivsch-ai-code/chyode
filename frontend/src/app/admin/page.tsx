'use client';

import { useState, type FormEvent } from 'react';
import useSWR from 'swr';
import type { AuthUser, InviteStatus, InviteSummary, UserRole } from '@shared/types';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Alert, Avatar, Badge, EmptyState, PageLoading, Skeleton } from '@/components/ui/Feedback';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { Segmented } from '@/components/ui/Segmented';
import { useToast } from '@/components/ui/Toast';
import { IconCopy, IconMail, IconRefresh, IconTrash, IconUsers } from '@/components/ui/Icons';
import { apiFetch, errorMessage } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth';
import { copyToClipboard } from '@/lib/clipboard';
import { formatDateTime } from '@/lib/format';

type Section = 'invites' | 'users';

export default function AdminPage() {
  const { allowed } = useRequireAuth({ admin: true });
  const [section, setSection] = useState<Section>('invites');
  if (!allowed) return <PageLoading />;

  return (
    <div className="animate-fade-up space-y-8">
      <header className="space-y-5">
        <div>
          <h1 className="text-title1">Verwaltung</h1>
          <p className="mt-1.5 text-callout text-secondary">Lade Personen ein und verwalte die Konten deiner Gruppe.</p>
        </div>
        <Segmented
          ariaLabel="Bereich"
          value={section}
          onChange={setSection}
          options={[
            { value: 'invites', label: 'Einladungen' },
            { value: 'users', label: 'Nutzer' },
          ]}
        />
      </header>

      {section === 'invites' ? <InvitesSection /> : <UsersSection />}
    </div>
  );
}

// ------------------------------------------------------------
// Einladungen
// ------------------------------------------------------------

interface CreatedInvite {
  email: string;
  link: string;
  emailSent: boolean;
  emailError?: string;
}

const STATUS_BADGE: Record<InviteStatus, { label: string; tone: 'accent' | 'success' | 'neutral' | 'warning' }> = {
  pending: { label: 'Offen', tone: 'accent' },
  accepted: { label: 'Angenommen', tone: 'success' },
  revoked: { label: 'Widerrufen', tone: 'neutral' },
  expired: { label: 'Abgelaufen', tone: 'warning' },
};

function InvitesSection() {
  const { toast } = useToast();
  const { data, error, isLoading, mutate } = useSWR<{ invites: InviteSummary[] }>('/admin/invites');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [created, setCreated] = useState<CreatedInvite | null>(null);
  const [revoking, setRevoking] = useState<InviteSummary | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setCreated(null);
    setSending(true);
    try {
      const result = await apiFetch<{ link: string; emailSent: boolean; emailError?: string }>('/admin/invites', {
        method: 'POST',
        body: { email: email.trim(), name: name.trim() || undefined, role },
      });
      setCreated({ email: email.trim(), ...result });
      setEmail('');
      setName('');
      setRole('user');
      await mutate();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  async function resend(invite: InviteSummary) {
    setResendingId(invite.id);
    try {
      const result = await apiFetch<{ link: string; emailSent: boolean; emailError?: string }>(
        `/admin/invites/${invite.id}/resend`,
        { method: 'POST' }
      );
      setCreated({ email: invite.email, ...result });
      await mutate();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setResendingId(null);
    }
  }

  async function revoke(invite: InviteSummary) {
    await apiFetch(`/admin/invites/${invite.id}`, { method: 'DELETE' });
    await mutate();
    toast('Einladung widerrufen', 'success');
  }

  return (
    <div className="space-y-8">
      <section className="card p-6 sm:p-8" aria-labelledby="new-invite">
        <h2 id="new-invite" className="text-title3">
          Person einladen
        </h2>
        <p className="mt-1 text-callout text-secondary">
          Die Person erhält eine E-Mail mit einem persönlichen Link und legt damit Konto und Passwort selbst an.
        </p>

        <form onSubmit={onSubmit} className="mt-6 grid gap-5 sm:grid-cols-2" noValidate>
          {formError && (
            <div className="sm:col-span-2">
              <Alert tone="error">{formError}</Alert>
            </div>
          )}
          <Input
            label="E-Mail-Adresse"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input label="Name" optional autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
          <Select label="Rolle" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            <option value="user">Nutzer – kann Trips erstellen und teilnehmen</option>
            <option value="admin">Administrator – zusätzlich Nutzerverwaltung</option>
          </Select>
          <div className="flex items-end">
            <Button type="submit" size="lg" loading={sending} disabled={!email.trim()} icon={<IconMail size={18} />}>
              Einladung senden
            </Button>
          </div>
        </form>

        {created && <InviteResult result={created} onDismiss={() => setCreated(null)} />}
      </section>

      <section aria-labelledby="invite-list" className="space-y-3">
        <h2 id="invite-list" className="text-title3">
          Alle Einladungen
        </h2>
        {isLoading && <Skeleton className="h-24" />}
        {error && <Alert tone="error">{errorMessage(error)}</Alert>}
        {data && data.invites.length === 0 && (
          <div className="card">
            <EmptyState icon={<IconMail size={26} />} title="Noch keine Einladungen">
              Sobald du jemanden einlädst, erscheint die Einladung hier.
            </EmptyState>
          </div>
        )}
        {data && data.invites.length > 0 && (
          <ul className="card divide-y divide-line/60 overflow-hidden">
            {data.invites.map((invite) => {
              const badge = STATUS_BADGE[invite.status];
              const actionable = invite.status === 'pending' || invite.status === 'expired';
              return (
                <li key={invite.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-callout font-medium">{invite.name || invite.email}</p>
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                      {invite.role === 'admin' && <Badge tone="neutral">Admin</Badge>}
                    </div>
                    <p className="mt-0.5 truncate text-footnote text-secondary">
                      {invite.name ? `${invite.email} · ` : ''}
                      {invite.status === 'pending' ? 'gültig bis' : 'erstellt'}{' '}
                      {formatDateTime(invite.status === 'pending' ? invite.expires_at : invite.created_at)}
                    </p>
                  </div>
                  {actionable && (
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        variant="tinted"
                        loading={resendingId === invite.id}
                        icon={<IconRefresh size={16} />}
                        onClick={() => resend(invite)}
                      >
                        Neu senden
                      </Button>
                      {invite.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="danger"
                          icon={<IconTrash size={16} />}
                          onClick={() => setRevoking(invite)}
                          aria-label={`Einladung für ${invite.email} widerrufen`}
                        >
                          Widerrufen
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={revoking !== null}
        danger
        title="Einladung widerrufen?"
        message={
          <>
            Der Link für <strong className="font-semibold text-label">{revoking?.email}</strong> funktioniert danach nicht mehr.
          </>
        }
        confirmLabel="Widerrufen"
        onConfirm={() => (revoking ? revoke(revoking) : undefined)}
        onClose={() => setRevoking(null)}
      />
    </div>
  );
}

function InviteResult({ result, onDismiss }: { result: CreatedInvite; onDismiss: () => void }) {
  const { toast } = useToast();

  async function copy() {
    const ok = await copyToClipboard(result.link);
    toast(ok ? 'Link kopiert' : 'Kopieren nicht möglich – bitte markiere den Link manuell', ok ? 'success' : 'error');
  }

  return (
    <div className="mt-6 space-y-3">
      {result.emailSent ? (
        <Alert tone="success" title="Einladung versendet">
          Die E-Mail an <strong className="font-semibold">{result.email}</strong> ist unterwegs.
        </Alert>
      ) : (
        <Alert tone="warning" title="E-Mail konnte nicht versendet werden">
          Die Einladung ist trotzdem erstellt. Teile den Link unten direkt mit der Person.
          {result.emailError ? ` (${result.emailError})` : ''}
        </Alert>
      )}
      <div className="flex items-center gap-2 rounded-control bg-grouped p-1.5 pl-4">
        <input
          readOnly
          value={result.link}
          aria-label="Einladungslink"
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 bg-transparent text-subhead text-secondary outline-none"
        />
        <Button size="sm" variant="tinted" icon={<IconCopy size={16} />} onClick={copy}>
          Kopieren
        </Button>
      </div>
      <button type="button" onClick={onDismiss} className="text-subhead text-secondary hover:text-label">
        Ausblenden
      </button>
    </div>
  );
}

// ------------------------------------------------------------
// Nutzer
// ------------------------------------------------------------

function UsersSection() {
  const { toast } = useToast();
  const { user: me } = useRequireAuth({ admin: true });
  const { data, error, isLoading, mutate } = useSWR<{ users: AuthUser[] }>('/admin/users');
  const [pending, setPending] = useState<{ user: AuthUser; change: 'disable' | 'enable' | 'promote' | 'demote' } | null>(
    null
  );

  async function apply(user: AuthUser, change: 'disable' | 'enable' | 'promote' | 'demote') {
    const body =
      change === 'disable'
        ? { status: 'disabled' }
        : change === 'enable'
          ? { status: 'active' }
          : { role: change === 'promote' ? 'admin' : 'user' };
    await apiFetch(`/admin/users/${user.id}`, { method: 'PATCH', body });
    await mutate();
    toast('Änderung gespeichert', 'success');
  }

  const texts = {
    disable: { title: 'Konto deaktivieren?', confirm: 'Deaktivieren', danger: true, text: 'kann sich danach nicht mehr anmelden. Bestehende Sitzungen werden beendet.' },
    enable: { title: 'Konto wieder aktivieren?', confirm: 'Aktivieren', danger: false, text: 'kann sich danach wieder anmelden.' },
    promote: { title: 'Zum Administrator machen?', confirm: 'Bestätigen', danger: false, text: 'darf danach Personen einladen und Konten verwalten.' },
    demote: { title: 'Adminrechte entziehen?', confirm: 'Entziehen', danger: true, text: 'kann danach keine Personen mehr einladen.' },
  } as const;

  return (
    <section aria-labelledby="user-list" className="space-y-3">
      <h2 id="user-list" className="sr-only">
        Nutzer
      </h2>
      {isLoading && <Skeleton className="h-32" />}
      {error && <Alert tone="error">{errorMessage(error)}</Alert>}
      {data && data.users.length === 0 && (
        <div className="card">
          <EmptyState icon={<IconUsers size={26} />} title="Noch keine Nutzer" />
        </div>
      )}
      {data && data.users.length > 0 && (
        <ul className="card divide-y divide-line/60 overflow-hidden">
          {data.users.map((u) => {
            const isMe = u.id === me?.id;
            return (
              <li key={u.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3.5">
                  <Avatar name={u.name ?? u.email} size={42} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-callout font-medium">{u.name ?? u.email}</p>
                      {u.role === 'admin' && <Badge tone="accent">Admin</Badge>}
                      {u.status === 'disabled' && <Badge tone="danger">Deaktiviert</Badge>}
                      {isMe && <Badge tone="neutral">Du</Badge>}
                    </div>
                    <p className="truncate text-footnote text-secondary">
                      {u.name ? `${u.email} · ` : ''}
                      {u.last_login_at ? `zuletzt aktiv ${formatDateTime(u.last_login_at)}` : 'noch nie angemeldet'}
                    </p>
                  </div>
                </div>
                {!isMe && (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="plain"
                      onClick={() => setPending({ user: u, change: u.role === 'admin' ? 'demote' : 'promote' })}
                    >
                      {u.role === 'admin' ? 'Adminrechte entziehen' : 'Zum Admin machen'}
                    </Button>
                    <Button
                      size="sm"
                      variant={u.status === 'active' ? 'danger' : 'tinted'}
                      onClick={() => setPending({ user: u, change: u.status === 'active' ? 'disable' : 'enable' })}
                    >
                      {u.status === 'active' ? 'Deaktivieren' : 'Aktivieren'}
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={pending !== null}
        title={pending ? texts[pending.change].title : ''}
        danger={pending ? texts[pending.change].danger : false}
        confirmLabel={pending ? texts[pending.change].confirm : 'Bestätigen'}
        message={
          pending && (
            <>
              <strong className="font-semibold text-label">{pending.user.name ?? pending.user.email}</strong>{' '}
              {texts[pending.change].text}
            </>
          )
        }
        onConfirm={() => (pending ? apply(pending.user, pending.change) : undefined)}
        onClose={() => setPending(null)}
      />
    </section>
  );
}
