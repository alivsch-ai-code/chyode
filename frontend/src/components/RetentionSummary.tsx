'use client';

import useSWR from 'swr';
import { pluralize } from '@/lib/format';

/** Zeigt die aktuell konfigurierten Löschfristen (Standard: 7 bzw. 90 Tage) für die Datenschutzerklärung. */
export function RetentionSummary() {
  const { data } = useSWR<{ tripRetentionDays: number; tripMaxAgeDays: number }>('/auth/config');
  const finished = data?.tripRetentionDays ?? 7;
  const maxAge = data?.tripMaxAgeDays ?? 90;

  return (
    <ul className="list-disc space-y-1.5 pl-5">
      <li>
        <strong className="font-semibold text-label">Reisedaten</strong> (Termine, Stimmen, Präferenzen, Notizen,
        Teilnahmen, Einkaufsliste, Aktivitäten, Ausgaben und eingescannte Belege): automatisch{' '}
        {pluralize(finished, 'Tag', 'Tage')} nach dem Beenden der Abstimmung bzw. nach dem tatsächlichen Ende der
        Reise – oder sofort, sobald alle Schulden in der Kasse beglichen sind. Spätestens{' '}
        {pluralize(maxAge, 'Tag', 'Tage')} nach dem Erstellen der Reise. Der Ersteller kann eine Reise jederzeit sofort
        löschen.
      </li>
      <li>
        <strong className="font-semibold text-label">Konto</strong>: bis du es selbst löschst (Konto → „Konto löschen“). Dabei
        werden auch alle deine Reisen und Teilnahmen entfernt.
      </li>
      <li>
        <strong className="font-semibold text-label">Einladungen, Bestätigungs- und Reset-Links</strong>: verfallen nach
        24 Stunden bis 7 Tagen und werden kurz danach gelöscht.
      </li>
      <li>
        <strong className="font-semibold text-label">Datensicherungen</strong>: Die Datenbank wird regelmäßig gesichert;
        Sicherungen werden 7 Tage aufbewahrt. Gelöschte Daten verschwinden daher spätestens nach 7 Tagen auch aus den
        Sicherungen.
      </li>
    </ul>
  );
}
