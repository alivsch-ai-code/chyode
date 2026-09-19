'use client';

import { useState } from 'react';
import useSWR from 'swr';
import type { DateOption, TripDetailResponse } from '@shared/types';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { Alert, Avatar, Badge } from '@/components/ui/Feedback';
import { IconCopy, IconLink } from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/api';
import { copyToClipboard } from '@/lib/clipboard';
import { TRIP_STATUS_LABELS, TRIP_TYPE_LABELS, formatDateRange, formatDateTime, pluralize } from '@/lib/format';

export function OverviewTab({
  detail,
  onChanged,
  isNew,
}: {
  detail: TripDetailResponse;
  onChanged: () => Promise<unknown>;
  isNew: boolean;
}) {
  const { trip, participants, myRole, inviteLink } = detail;
  const { toast } = useToast();
  const options = useSWR<{ dateOptions: DateOption[] }>(`/trips/${trip.id}/date-options`);
  const [confirmClose, setConfirmClose] = useState(false);
  const [reopening, setReopening] = useState(false);
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
            <li key={p.id} className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0">
              <Avatar name={p.name} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-callout font-medium">{p.name}</p>
                <p className="text-footnote text-secondary">dabei seit {formatDateTime(p.joined_at)}</p>
              </div>
              {p.role === 'creator' && <Badge tone="accent">Ersteller</Badge>}
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-6 sm:p-8" aria-labelledby="status-heading">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="status-heading" className="text-title3">
              Status
            </h2>
            <p className="mt-1 flex items-center gap-2 text-callout text-secondary">
              <Badge tone={trip.status === 'voting' ? 'success' : 'neutral'}>{TRIP_STATUS_LABELS[trip.status]}</Badge>
            </p>
          </div>
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
        </div>
      </section>

      <ConfirmDialog
        open={confirmClose}
        title="Abstimmung beenden?"
        message="Danach kann niemand mehr neu beitreten oder abstimmen. Du kannst die Abstimmung später wieder öffnen."
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
