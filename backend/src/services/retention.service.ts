import { query } from '../db/pool';
import { env } from '../config/env';

export interface RetentionReport {
  finishedTrips: number;
  staleTrips: number;
  invites: number;
  resets: number;
  verifications: number;
}

/**
 * Datensparsamkeit: löscht Daten, die nicht mehr gebraucht werden.
 *
 * - Reisen mit beendeter Abstimmung: `TRIP_RETENTION_DAYS` Tage nach dem Ende (samt Stimmen,
 *   Notizen, Präferenzen, Teilnahmen und gespeicherten Suchergebnissen – per ON DELETE CASCADE).
 * - Nie abgeschlossene Reisen: spätestens `TRIP_MAX_AGE_DAYS` Tage nach dem Erstellen.
 * - Abgelaufene bzw. verbrauchte Einladungen, Reset-Links und Registrierungsanfragen.
 */
export async function runRetention(): Promise<RetentionReport> {
  const finished = await query(
    `DELETE FROM trips
     WHERE voting_closed_at IS NOT NULL
       AND voting_closed_at < now() - ($1 || ' days')::interval`,
    [String(env.tripRetentionDays)]
  );

  const stale = await query(
    `DELETE FROM trips
     WHERE voting_closed_at IS NULL
       AND created_at < now() - ($1 || ' days')::interval`,
    [String(env.tripMaxAgeDays)]
  );

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
    finishedTrips: finished.rowCount ?? 0,
    staleTrips: stale.rowCount ?? 0,
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
