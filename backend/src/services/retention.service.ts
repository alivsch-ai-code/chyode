import { query } from '../db/pool';
import { env } from '../config/env';
import { computeLedger } from './ledger.service';
import { deleteReceipt } from '../utils/receiptStorage';

export interface RetentionReport {
  finishedTrips: number;
  endedTrips: number;
  settledTrips: number;
  staleTrips: number;
  invites: number;
  resets: number;
  verifications: number;
}

/** Holt die Dateinamen aller Belege der angegebenen Reisen (bevor sie per CASCADE mitgelöscht werden). */
async function collectReceiptPaths(tripIds: string[]): Promise<string[]> {
  if (tripIds.length === 0) return [];
  const result = await query<{ receipt_path: string }>(
    'SELECT receipt_path FROM trip_expenses WHERE trip_id = ANY($1) AND receipt_path IS NOT NULL',
    [tripIds]
  );
  return result.rows.map((r) => r.receipt_path);
}

/** Löscht die angegebenen Reisen (samt alles per CASCADE) und räumt danach ihre Beleg-Dateien weg. */
async function deleteTripsByIds(tripIds: string[]): Promise<number> {
  if (tripIds.length === 0) return 0;
  const receiptPaths = await collectReceiptPaths(tripIds);
  const result = await query('DELETE FROM trips WHERE id = ANY($1)', [tripIds]);
  await Promise.all(receiptPaths.map((p) => deleteReceipt(p)));
  return result.rowCount ?? 0;
}

/**
 * Datensparsamkeit: löscht Daten, die nicht mehr gebraucht werden.
 *
 * - Abstimmung beendet: `TRIP_RETENTION_DAYS` Tage nach dem Ende der Abstimmung.
 * - Reise real beendet (`end_date` erreicht, z. B. Planungsmodus): `TRIP_RETENTION_DAYS` Tage
 *   nach dem tatsächlichen Ende – oder sofort, sobald alle Schulden beglichen sind.
 * - Nie abgeschlossene Reisen: spätestens `TRIP_MAX_AGE_DAYS` Tage nach dem Erstellen.
 * - Abgelaufene bzw. verbrauchte Einladungen, Reset-Links und Registrierungsanfragen.
 */
export async function runRetention(): Promise<RetentionReport> {
  const finishedIds = await query<{ id: string }>(
    `SELECT id FROM trips
     WHERE voting_closed_at IS NOT NULL AND voting_closed_at < now() - ($1 || ' days')::interval`,
    [String(env.tripRetentionDays)]
  );
  const finishedTrips = await deleteTripsByIds(finishedIds.rows.map((r) => r.id));

  // Reise real beendet (end_date erreicht) und die Löschfrist ist abgelaufen
  const endedIds = await query<{ id: string }>(
    `SELECT id FROM trips
     WHERE voting_closed_at IS NULL AND end_date IS NOT NULL
       AND end_date::timestamptz < now() - ($1 || ' days')::interval`,
    [String(env.tripRetentionDays)]
  );
  const endedTrips = await deleteTripsByIds(endedIds.rows.map((r) => r.id));

  // Reise real beendet, Frist läuft noch, aber alle Schulden sind schon beglichen -> nicht warten
  const withinGrace = await query<{ id: string }>(
    `SELECT id FROM trips
     WHERE voting_closed_at IS NULL AND end_date IS NOT NULL
       AND end_date::timestamptz < now()
       AND end_date::timestamptz >= now() - ($1 || ' days')::interval`,
    [String(env.tripRetentionDays)]
  );
  const settledIds: string[] = [];
  for (const row of withinGrace.rows) {
    const ledger = await computeLedger(row.id);
    if (ledger.settled && ledger.totalExpenses > 0) settledIds.push(row.id);
  }
  const settledTrips = await deleteTripsByIds(settledIds);

  const staleIds = await query<{ id: string }>(
    `SELECT id FROM trips WHERE voting_closed_at IS NULL AND created_at < now() - ($1 || ' days')::interval`,
    [String(env.tripMaxAgeDays)]
  );
  const staleTrips = await deleteTripsByIds(staleIds.rows.map((r) => r.id));

  const invites = await query(
    `DELETE FROM user_invites
     WHERE created_at < now() - interval '7 days'
       AND (used_at IS NOT NULL OR revoked_at IS NOT NULL OR expires_at < now())`
  );

  const resets = await query(
    `DELETE FROM password_resets
     WHERE created_at < now() - interval '1 day' AND (used_at IS NOT NULL OR expires_at < now())`
  );

  const verifications = await query(
    `DELETE FROM email_verifications
     WHERE created_at < now() - interval '1 day' AND (used_at IS NOT NULL OR expires_at < now())`
  );

  return {
    finishedTrips,
    endedTrips,
    settledTrips,
    staleTrips,
    invites: invites.rowCount ?? 0,
    resets: resets.rowCount ?? 0,
    verifications: verifications.rowCount ?? 0,
  };
}

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

/** Startet die regelmäßige Bereinigung (einmal kurz nach dem Start, danach alle 6 Stunden). */
export function startRetentionJob(): void {
  const run = async () => {
    try {
      const report = await runRetention();
      const total = Object.values(report).reduce((a, b) => a + b, 0);
      if (total > 0) console.log('[retention] gelöscht:', JSON.stringify(report));
    } catch (err) {
      console.error('[retention] Bereinigung fehlgeschlagen:', err);
    }
  };
  setTimeout(run, 60_000).unref();
  setInterval(run, SIX_HOURS_MS).unref();
}
