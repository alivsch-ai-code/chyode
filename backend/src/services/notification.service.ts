import { query } from '../db/pool';
import { env } from '../config/env';
import { Trip } from '../types';
import { sendMail } from './mailer.service';
import { resultsReadyEmail } from './emailTemplates';
import { computeTripResults } from './results.service';

const dayMonthYear = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function formatFavorite(startDate: string, endDate: string): string {
  const start = new Date(`${startDate.slice(0, 10)}T00:00:00Z`);
  const end = new Date(`${endDate.slice(0, 10)}T00:00:00Z`);
  return `${dayMonthYear.format(start)} – ${dayMonthYear.format(end)}`;
}

/**
 * Informiert alle Mitglieder per E-Mail, sobald das Ergebnis freigegeben ist UND alle abgestimmt haben.
 * Wird höchstens einmal pro Reise versendet (Markierung `results_notified_at`) und kann gefahrlos
 * nach jeder Freigabe bzw. jeder abgegebenen Stimme aufgerufen werden.
 */
export async function notifyResultsIfReady(tripId: string): Promise<{ sent: number } | null> {
  const tripResult = await query<Trip>('SELECT * FROM trips WHERE id = $1', [tripId]);
  const trip = tripResult.rows[0];
  if (!trip || !trip.results_released_at || trip.results_notified_at) return null;

  const members = await query<{ id: string; name: string; email: string | null }>(
    'SELECT id, name, email FROM trip_users WHERE trip_id = $1',
    [tripId]
  );
  if (members.rows.length === 0) return null;

  const voted = await query<{ trip_user_id: string }>('SELECT DISTINCT trip_user_id FROM votes WHERE trip_id = $1', [tripId]);
  const votedIds = new Set(voted.rows.map((v) => v.trip_user_id));
  if (members.rows.some((m) => !votedIds.has(m.id))) return null;

  // Atomar beanspruchen, damit parallele Aufrufe nicht doppelt versenden
  const claimed = await query('UPDATE trips SET results_notified_at = now() WHERE id = $1 AND results_notified_at IS NULL RETURNING id', [
    tripId,
  ]);
  if (claimed.rows.length === 0) return null;

  const results = await computeTripResults(tripId);
  const favorite = results.topDateOption ? formatFavorite(results.topDateOption.startDate, results.topDateOption.endDate) : null;
  const link = `${env.frontendUrl}/trips/${trip.id}?tab=results`;

  let sent = 0;
  for (const member of members.rows) {
    if (!member.email) continue;
    const mail = await sendMail(member.email, resultsReadyEmail({ name: member.name, tripTitle: trip.title, link, favorite }));
    if (mail.sent) sent++;
  }
  return { sent };
}

/** Wie notifyResultsIfReady, wirft aber nie – für den Einsatz nach Requests, die dadurch nicht scheitern sollen. */
export function notifyResultsIfReadySafe(tripId: string): void {
  notifyResultsIfReady(tripId).catch((err) => console.error('[notification] Ergebnis-Mail fehlgeschlagen:', err));
}
