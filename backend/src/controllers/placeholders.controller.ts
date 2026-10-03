import { Request, Response } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool';
import { badRequest, notFound } from '../utils/httpError';
import { isUuid } from '../middleware/auth';

/**
 * Platzhalter sind Mitreisende ohne Konto. Sie zählen in der Kasse mit (Unterkunft, Einkäufe,
 * Ausgaben), stimmen aber nicht ab und bekommen keine Mails. Meldet sich die Person später an,
 * überträgt der Ersteller den Platzhalter auf ihr Konto. Alle Routen: nur Ersteller.
 */

const nameSchema = z.object({ name: z.string().trim().min(1, 'Bitte gib einen Namen ein').max(80) });
const mergeSchema = z.object({ intoTripUserId: z.string().trim().min(1, 'Bitte wähle ein Mitglied') });

async function loadPlaceholder(tripId: string, placeholderId: string) {
  if (!isUuid(placeholderId)) throw notFound('Platzhalter nicht gefunden');
  const found = await query<{ id: string }>(
    'SELECT id FROM trip_users WHERE id = $1 AND trip_id = $2 AND is_placeholder',
    [placeholderId, tripId]
  );
  if (!found.rows[0]) throw notFound('Platzhalter nicht gefunden');
}

/** POST /api/trips/:tripId/placeholders — legt eine Person ohne Konto an. */
export async function addPlaceholder(req: Request, res: Response) {
  const { tripId } = req.params;
  const parsed = nameSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

  const result = await query(
    `INSERT INTO trip_users (trip_id, user_id, name, email, role, is_placeholder)
     VALUES ($1, NULL, $2, NULL, 'participant', true)
     RETURNING id, name, role, joined_at, is_placeholder`,
    [tripId, parsed.data.name]
  );
  res.status(201).json({ participant: result.rows[0] });
}

/**
 * DELETE /api/trips/:tripId/placeholders/:placeholderId — entfernt einen Platzhalter. Hat er schon
 * etwas bezahlt oder Geld erhalten, würde das mitgelöscht – dann erst übertragen oder die Einträge löschen.
 */
export async function deletePlaceholder(req: Request, res: Response) {
  const { tripId, placeholderId } = req.params;
  await loadPlaceholder(tripId, placeholderId);

  const refs = await query<{ count: string }>(
    `SELECT (SELECT COUNT(*) FROM trip_expenses WHERE paid_by = $1)
          + (SELECT COUNT(*) FROM trip_settlements WHERE from_trip_user_id = $1 OR to_trip_user_id = $1)
          + (SELECT COUNT(*) FROM trip_donations WHERE received_by = $1)
          + (SELECT COUNT(*) FROM trips WHERE accommodation_paid_by = $1) AS count`,
    [placeholderId]
  );
  if (parseInt(refs.rows[0].count, 10) > 0) {
    throw badRequest('Dieser Platzhalter hat schon etwas bezahlt oder erhalten. Übertrage ihn auf ein Konto oder lösche zuerst die Einträge.');
  }

  await query('DELETE FROM trip_users WHERE id = $1 AND trip_id = $2', [placeholderId, tripId]);
  res.status(204).send();
}

/**
 * POST /api/trips/:tripId/placeholders/:placeholderId/merge — überträgt alles, was am Platzhalter
 * hängt (Zahlungen, Ausgaben, Spenden, Unterkunft), auf ein angemeldetes Mitglied und entfernt ihn.
 */
export async function mergePlaceholder(req: Request, res: Response) {
  const { tripId, placeholderId } = req.params;
  await loadPlaceholder(tripId, placeholderId);

  const parsed = mergeSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);
  const target = parsed.data.intoTripUserId;
  if (!isUuid(target)) throw badRequest('Unbekanntes Mitglied');
  const targetRow = await query(
    'SELECT 1 FROM trip_users WHERE id = $1 AND trip_id = $2 AND NOT is_placeholder',
    [target, tripId]
  );
  if (!targetRow.rows[0]) throw badRequest('Bitte wähle ein angemeldetes Mitglied dieser Reise');

  await withTransaction(async (client) => {
    const ph = placeholderId;
    // Zahlungen zwischen Platzhalter und Ziel wären danach Zahlungen an sich selbst
    await client.query(
      `DELETE FROM trip_settlements
       WHERE (from_trip_user_id = $1 AND to_trip_user_id = $2) OR (from_trip_user_id = $2 AND to_trip_user_id = $1)`,
      [ph, target]
    );
    await client.query('UPDATE trip_settlements SET from_trip_user_id = $2 WHERE from_trip_user_id = $1', [ph, target]);
    await client.query('UPDATE trip_settlements SET to_trip_user_id = $2 WHERE to_trip_user_id = $1', [ph, target]);
    await client.query('UPDATE trip_expenses SET paid_by = $2 WHERE paid_by = $1', [ph, target]);
    await client.query(
      `UPDATE trip_expense_participants p SET trip_user_id = $2
       WHERE p.trip_user_id = $1
         AND NOT EXISTS (SELECT 1 FROM trip_expense_participants o WHERE o.expense_id = p.expense_id AND o.trip_user_id = $2)`,
      [ph, target]
    );
    await client.query('DELETE FROM trip_expense_participants WHERE trip_user_id = $1', [ph]);
    await client.query('UPDATE trip_donations SET received_by = $2 WHERE received_by = $1', [ph, target]);
    await client.query('UPDATE trips SET accommodation_paid_by = $2 WHERE accommodation_paid_by = $1', [ph, target]);
    await client.query('DELETE FROM trip_users WHERE id = $1', [ph]);
  });

  res.status(204).send();
}
