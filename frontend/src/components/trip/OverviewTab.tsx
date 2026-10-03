'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import useSWR from 'swr';
import type { DateOption, GroceryItem, LedgerSummary, TripDetailResponse, TripParticipant } from '@shared/types';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog';
import { Input, Select } from '@/components/ui/Field';
import { Alert, Avatar, Badge, Skeleton } from '@/components/ui/Feedback';
import { IconCheck, IconCopy, IconLink, IconLock, IconPlus, IconReceipt, IconTrash, IconUtensils } from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import { apiFetch, errorMessage } from '@/lib/api';
import { copyToClipboard } from '@/lib/clipboard';
import { TRIP_STATUS_LABELS, TRIP_TYPE_LABELS, formatDateRange, formatDateTime, formatMoney, pluralize } from '@/lib/format';

export function OverviewTab({
  detail,
  onChanged,
  onOpenLedger,
  onOpenFood,
  isNew,
}: {
  detail: TripDetailResponse;
  onChanged: () => Promise<unknown>;
  onOpenLedger: () => void;
  onOpenFood: () => void;
  isNew: boolean;
}) {
  const { trip, participants, myRole, inviteLink, progress } = detail;
  const { toast } = useToast();
  const router = useRouter();
  const options = useSWR<{ dateOptions: DateOption[] }>(`/trips/${trip.id}/date-options`);
  const config = useSWR<{ tripRetentionDays: number; tripMaxAgeDays: number }>('/auth/config');
  const ledger = useSWR<LedgerSummary>(`/trips/${trip.id}/balances`);
  const groceries = useSWR<{ items: GroceryItem[] }>(`/trips/${trip.id}/groceries`);
  const me = detail.myParticipantId;
  const myDebts = ledger.data?.suggestions.filter((s) => s.fromTripUserId === me) ?? [];
  const myCredits = ledger.data?.suggestions.filter((s) => s.toTripUserId === me) ?? [];
  const myShoppingCount = groceries.data?.items.filter((i) => i.claimed_by === me && !i.checked_at).length ?? 0;
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [switchingMode, setSwitchingMode] = useState(false);
  const isCreator = myRole === 'creator';
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  async function copy() {
    const ok = await copyToClipboard(inviteLink);
    toast(ok ? 'Einladungslink kopiert' : 'Kopieren nicht möglich – bitte markiere den Link manuell', ok ? 'success' : 'error');
  }

  async function share() {
    try {
      await navigator.share({ title: trip.title, text: `Komm mit auf „${trip.title}“ und stimme über den Termin ab.`, url: inviteLink });
    } catch {
      /* Abbruch durch den Nutzer ist kein Fehler */
    }
  }

  async function closeVoting() {
    await apiFetch(`/trips/${trip.id}/close-voting`, { method: 'POST' });
    await onChanged();
    toast('Abstimmung beendet', 'success');
  }

  async function deleteTrip() {
    await apiFetch(`/trips/${trip.id}`, { method: 'DELETE' });
    toast('Reise gelöscht', 'success');
    router.replace('/');
  }

  async function reopenVoting() {
    setReopening(true);
    try {
      await apiFetch(`/trips/${trip.id}/reopen-voting`, { method: 'POST' });
      await onChanged();
      toast('Abstimmung wieder geöffnet', 'success');
    } finally {
      setReopening(false);
    }
  }

  // -- Platzhalter (Mitreisende ohne Konto) --------------------------------
  const [placeholderOpen, setPlaceholderOpen] = useState(false);
  const [placeholderName, setPlaceholderName] = useState('');
  const [placeholderError, setPlaceholderError] = useState<string | null>(null);
  const [savingPlaceholder, setSavingPlaceholder] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<TripParticipant | null>(null);
  const [mergeInto, setMergeInto] = useState('');
  const [merging, setMerging] = useState(false);
  const realMembers = participants.filter((p) => !p.is_placeholder);

  async function addPlaceholder(event: FormEvent) {
    event.preventDefault();
    if (!placeholderName.trim()) return;
    setPlaceholderError(null);
    setSavingPlaceholder(true);
    try {
      await apiFetch(`/trips/${trip.id}/placeholders`, { method: 'POST', body: { name: placeholderName.trim() } });
      setPlaceholderName('');
      setPlaceholderOpen(false);
      await Promise.all([onChanged(), ledger.mutate()]);
      toast('Person hinzugefügt', 'success');
    } catch (err) {
      setPlaceholderError(errorMessage(err));
    } finally {
      setSavingPlaceholder(false);
    }
  }

  async function removePlaceholder(p: TripParticipant) {
    try {
      await apiFetch(`/trips/${trip.id}/placeholders/${p.id}`, { method: 'DELETE' });
      await Promise.all([onChanged(), ledger.mutate()]);
      toast(`${p.name} entfernt`, 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  async function mergePlaceholder(event: FormEvent) {
    event.preventDefault();
    if (!mergeTarget || !mergeInto) return;
    setMerging(true);
    try {
      await apiFetch(`/trips/${trip.id}/placeholders/${mergeTarget.id}/merge`, {
        method: 'POST',
        body: { intoTripUserId: mergeInto },
      });
      setMergeTarget(null);
      await Promise.all([onChanged(), ledger.mutate()]);
      toast('Platzhalter übertragen', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setMerging(false);
    }
  }

  useEffect(() => {
    if (mergeTarget) setMergeInto(realMembers[0]?.id ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergeTarget]);

  async function switchMode(mode: 'voting' | 'planning') {
    setSwitchingMode(true);
    try {
      await apiFetch(`/trips/${trip.id}/mode`, { method: 'PATCH', body: { mode } });
      await onChanged();
      toast(mode === 'planning' ? 'Zur Planung gewechselt' : 'Zurück zur Abstimmung gewechselt', 'success');
    } finally {
      setSwitchingMode(false);
    }
  }

  const dateSummary =
    trip.date_mode === 'fixed' && trip.start_date && trip.end_date
      ? formatDateRange(trip.start_date, trip.end_date)
      : options.data
        ? pluralize(options.data.dateOptions.length, 'Termin zur Wahl', 'Termine zur Wahl')
        : '…';

  return (
    <div className="space-y-8">
      {isNew && (
        <Alert tone="success" title="Deine Reise ist erstellt">
          Teile jetzt den Einladungslink mit deiner Gruppe, damit alle abstimmen können.
        </Alert>
      )}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Teilnehmer">{participants.length}</Stat>
        <Stat label="Termine">{dateSummary}</Stat>
        <Stat label="Unterkunft">{TRIP_TYPE_LABELS[trip.trip_type]}</Stat>
        <Stat label="Nächte">{trip.nights}</Stat>
      </dl>

      <section className="card space-y-4 p-6 sm:p-8" aria-labelledby="invite-heading">
        <div>
          <h2 id="invite-heading" className="text-title3">
            Gruppe einladen
          </h2>
          <p className="mt-1 text-callout text-secondary">
            Wer den Link öffnet und ein Konto hat, kann der Reise mit einem Klick beitreten.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-control bg-grouped p-1.5 pl-4">
          <IconLink size={18} className="shrink-0 text-secondary" />
          <input
            readOnly
            value={inviteLink}
            aria-label="Einladungslink"
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 bg-transparent text-subhead outline-none"
          />
          <Button size="sm" icon={<IconCopy size={16} />} onClick={copy}>
            Kopieren
          </Button>
        </div>
        {canShare && (
          <Button variant="tinted" onClick={share}>
            Über andere App teilen
          </Button>
        )}
      </section>

      <section className="card p-6 sm:p-8" aria-labelledby="participants-heading">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="participants-heading" className="text-title3">
            Teilnehmer
          </h2>
          <p className="text-subhead text-secondary">{pluralize(participants.length, 'Person', 'Personen')}</p>
        </div>
        <ul className="mt-5 divide-y divide-line/60">
          {participants.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3.5 py-3 first:pt-0 last:pb-0">
              <Avatar name={p.name} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-callout font-medium">{p.name}</p>
                <p className="text-footnote text-secondary">
                  {p.is_placeholder ? 'noch ohne Konto · zählt in der Kasse mit' : `dabei seit ${formatDateTime(p.joined_at)}`}
                </p>
              </div>
              {p.role === 'creator' && <Badge tone="accent">Ersteller</Badge>}
              {p.is_placeholder && <Badge tone="neutral">Platzhalter</Badge>}
              {p.is_placeholder && isCreator && (
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="plain" onClick={() => setMergeTarget(p)}>
                    Übertragen
                  </Button>
                  <button
                    type="button"
                    onClick={() => removePlaceholder(p)}
                    aria-label={`${p.name} entfernen`}
                    className="h-8 w-8 shrink-0 rounded-full text-secondary transition hover:bg-danger/10 hover:text-danger"
                  >
                    <IconTrash size={16} className="mx-auto" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
        {isCreator && (
          <div className="mt-5 border-t border-line/60 pt-4">
            <Button size="sm" variant="tinted" icon={<IconPlus size={16} />} onClick={() => setPlaceholderOpen(true)}>
              Person ohne Konto hinzufügen
            </Button>
            <p className="mt-2 text-footnote text-secondary">
              Für Mitreisende, die sich noch nicht angemeldet haben. Sie zählen in der Kasse mit; meldet sich die Person
              später an, überträgst du den Platzhalter auf ihr Konto.
            </p>
          </div>
        )}
      </section>

      <Dialog open={placeholderOpen} onClose={() => setPlaceholderOpen(false)} title="Person ohne Konto hinzufügen">
        <form onSubmit={addPlaceholder} className="space-y-4 p-5 sm:p-6" noValidate>
          {placeholderError && <Alert tone="error">{placeholderError}</Alert>}
          <Input label="Name" placeholder="z. B. Max" maxLength={80} value={placeholderName} onChange={(e) => setPlaceholderName(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="plain" onClick={() => setPlaceholderOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" loading={savingPlaceholder} disabled={!placeholderName.trim()}>
              Hinzufügen
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={mergeTarget !== null} onClose={() => setMergeTarget(null)} title="Platzhalter übertragen">
        <form onSubmit={mergePlaceholder} className="space-y-4 p-5 sm:p-6" noValidate>
          <p className="text-callout text-secondary">
            Alles, was bei <span className="font-medium text-label">{mergeTarget?.name}</span> eingetragen ist (Zahlungen,
            Ausgaben, Spenden), geht auf dieses Konto über. Der Platzhalter verschwindet danach.
          </p>
          {realMembers.length === 0 ? (
            <Alert tone="info">Es gibt noch kein angemeldetes Mitglied, auf das du übertragen kannst.</Alert>
          ) : (
            <Select label="Auf wen übertragen?" value={mergeInto} onChange={(e) => setMergeInto(e.target.value)}>
              {realMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          )}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="plain" onClick={() => setMergeTarget(null)}>
              Abbrechen
            </Button>
            <Button type="submit" loading={merging} disabled={!mergeInto}>
              Übertragen
            </Button>
          </div>
        </form>
      </Dialog>

      <section className="card p-6 sm:p-8" aria-labelledby="status-heading">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="status-heading" className="text-title3">
              Status
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-callout text-secondary">
              <Badge tone={trip.status === 'voting' ? 'success' : 'neutral'}>{TRIP_STATUS_LABELS[trip.status]}</Badge>
              <Badge tone={trip.mode === 'planning' ? 'accent' : 'neutral'}>
                {trip.mode === 'planning' ? 'Planungsmodus' : 'Abstimmungsmodus'}
              </Badge>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isCreator && trip.status === 'voting' && (
              <Button variant="plain" onClick={() => setConfirmClose(true)}>
                Abstimmung beenden
              </Button>
            )}
            {isCreator && trip.status === 'closed' && (
              <Button variant="plain" loading={reopening} onClick={reopenVoting}>
                Abstimmung wieder öffnen
              </Button>
            )}
            {isCreator && trip.mode === 'voting' && (
              <Button variant="tinted" loading={switchingMode} onClick={() => switchMode('planning')}>
                Zur Planung wechseln
              </Button>
            )}
            {isCreator && trip.mode === 'planning' && (
              <Button variant="plain" loading={switchingMode} onClick={() => switchMode('voting')}>
                Zurück zur Abstimmung
              </Button>
            )}
          </div>
        </div>
        {trip.mode === 'planning' && (
          <p className="mt-3 text-footnote text-secondary">
            Im Planungsmodus stehen Termine, Präferenzen und Ergebnis im Hintergrund – der Fokus liegt auf Essen,
            Aktivitäten und Unterkunft.
          </p>
        )}
      </section>

      <section className="card space-y-4 p-6 sm:p-8" aria-labelledby="payment-heading">
        <h2 id="payment-heading" className="text-title3">
          Geld &amp; Einkauf
        </h2>
        {!ledger.data ? (
          <Skeleton className="h-12" />
        ) : (
          <div className="space-y-2">
            {ledger.data.totalExpenses === 0 ? (
              <p className="text-callout text-secondary">Noch keine Ausgaben erfasst.</p>
            ) : ledger.data.settled ? (
              <p className="flex items-center gap-1.5 text-callout text-success">
                <IconCheck size={16} /> Alle Schulden beglichen ({formatMoney(ledger.data.totalExpenses)} insgesamt).
              </p>
            ) : (
              <p className="text-callout text-secondary">
                Gruppe: noch {formatMoney(ledger.data.suggestions.reduce((sum, s) => sum + s.amount, 0))} offen von{' '}
                {formatMoney(ledger.data.totalExpenses)}.
              </p>
            )}
            {myDebts.length > 0 && (
              <ul className="space-y-1.5">
                {myDebts.map((s) => (
                  <li key={s.toTripUserId} className="rounded-control bg-warning/10 px-3.5 py-2.5 text-callout">
                    Du zahlst <span className="font-semibold">{s.toName}</span>{' '}
                    <span className="font-semibold">{formatMoney(s.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
            {myCredits.length > 0 && (
              <ul className="space-y-1.5">
                {myCredits.map((s) => (
                  <li key={s.fromTripUserId} className="rounded-control bg-success/10 px-3.5 py-2.5 text-callout">
                    <span className="font-semibold">{s.fromName}</span> zahlt dir{' '}
                    <span className="font-semibold">{formatMoney(s.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
            {ledger.data.totalExpenses > 0 && !ledger.data.settled && myDebts.length === 0 && myCredits.length === 0 && (
              <p className="text-callout text-secondary">Du selbst bist ausgeglichen.</p>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="tinted" size="sm" icon={<IconReceipt size={16} />} onClick={onOpenLedger}>
            Zur Kasse
          </Button>
          <Button variant="plain" size="sm" icon={<IconUtensils size={16} />} onClick={onOpenFood}>
            {myShoppingCount > 0 ? `Meine Einkaufsliste (${myShoppingCount})` : 'Zur Einkaufsliste'}
          </Button>
        </div>
      </section>

      {isCreator && progress && (
        <section className="card p-6 sm:p-8" aria-labelledby="progress-heading">
          <h2 id="progress-heading" className="text-title3">
            Abstimmungsstand
          </h2>
          <p className="mt-1 text-callout text-secondary">
            {progress.voted} von {progress.total} haben abgestimmt.{' '}
            {detail.resultsNotified
              ? 'Alle Teilnehmer wurden per E-Mail über das Ergebnis informiert.'
              : detail.resultsReleased
                ? 'Sobald alle abgestimmt haben, bekommen alle eine E-Mail.'
                : 'Gib die Auswertung im Tab „Ergebnis“ frei, damit alle sie sehen und informiert werden.'}
          </p>
        </section>
      )}

      <section className="card space-y-4 p-6 sm:p-8" aria-labelledby="privacy-heading">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fill/12 text-secondary">
            <IconLock size={18} />
          </span>
          <div>
            <h2 id="privacy-heading" className="text-title3">
              Datensparsamkeit
            </h2>
            <p className="mt-1 text-callout text-secondary">
              Diese Reise wird automatisch gelöscht:{' '}
              {config.data
                ? `${pluralize(config.data.tripRetentionDays, 'Tag', 'Tage')} nach Ende der Abstimmung, spätestens ${pluralize(config.data.tripMaxAgeDays, 'Tag', 'Tage')} nach dem Erstellen.`
                : 'kurz nach Ende der Abstimmung.'}
            </p>
          </div>
        </div>
        {isCreator && (
          <Button variant="danger" icon={<IconTrash size={16} />} onClick={() => setConfirmDelete(true)}>
            Reise jetzt löschen
          </Button>
        )}
      </section>

      <ConfirmDialog
        open={confirmDelete}
        danger
        title="Reise endgültig löschen?"
        message="Alle Termine, Stimmen, Präferenzen und Notizen dieser Reise werden für alle Teilnehmer unwiderruflich gelöscht."
        confirmLabel="Löschen"
        onConfirm={deleteTrip}
        onClose={() => setConfirmDelete(false)}
      />

      <ConfirmDialog
        open={confirmClose}
        title="Abstimmung beenden?"
        message={
          <>
            Danach kann niemand mehr neu beitreten oder abstimmen. Du kannst die Abstimmung wieder öffnen.
            {config.data && (
              <>
                {' '}
                <strong className="font-semibold text-label">
                  Die Reise wird {pluralize(config.data.tripRetentionDays, 'Tag', 'Tage')} nach dem Beenden automatisch gelöscht.
                </strong>
              </>
            )}
          </>
        }
        confirmLabel="Beenden"
        onConfirm={closeVoting}
        onClose={() => setConfirmClose(false)}
      />
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <dt className="text-footnote text-secondary">{label}</dt>
      <dd className="mt-1 text-headline tabular-nums">{children}</dd>
    </div>
  );
}
