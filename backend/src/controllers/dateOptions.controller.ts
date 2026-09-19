import { Request, Response } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool';
import { DateOption } from '../types';
import { badRequest, forbidden, notFound } from '../utils/httpError';
import { isUuid } from '../middleware/auth';
import { assertVotingOpen } from '../services/access.service';
import { dateOptionInputSchema } from './trips.controller';

// Teilnehmer (nicht Ersteller) dürfen nur eine begrenzte Zahl eigener Termine vorschlagen.
const MAX_PARTICIPANT_PROPOSALS = 5;

const addDateOptionsSchema = z.object({
  dateOptions: z.array(dateOptionInputSchema).min(1, 'Bitte wähle mindestens einen Termin aus').max(60),
});

/**
 * POST /api/trips/:tripId/date-options — schlägt einen oder mehrere Termine vor.
 * Jedes Mitglied darf Termine vorschlagen, solange abgestimmt werden kann.
 */
export async function addDateOptions(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();
  await assertVotingOpen(tripId);

  const body = Array.isArray(req.body?.dateOptions) ? req.body : { dateOptions: [req.body] };
  const parsed = addDateOptionsSchema.safeParse(body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

  const isCreator = req.participant!.role === 'creator';

  const created = await withTransaction(async (client) => {
    if (!isCreator) {
      const own = await client.query<{ count: string }>(
        'SELECT COUNT(*) FROM date_options WHERE trip_id = $1 AND created_by = $2',
        [tripId, req.participant!.id]
      );
      if (parseInt(own.rows[0].count, 10) + parsed.data.dateOptions.length > MAX_PARTICIPANT_PROPOSALS) {
        throw badRequest(`Du kannst höchstens ${MAX_PARTICIPANT_PROPOSALS} eigene Termine vorschlagen`);
      }
    }

    const rows: DateOption[] = [];
    for (const option of parsed.data.dateOptions) {
      const duplicate = await client.query(
        'SELECT 1 FROM date_options WHERE trip_id = $1 AND start_date = $2 AND end_date = $3',
        [tripId, option.startDate, option.endDate]
      );
      if (duplicate.rows.length > 0) continue;

      const inserted = await client.query<DateOption>(
        `INSERT INTO date_options (trip_id, label, start_date, end_date, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [tripId, option.label, option.startDate, option.endDate, req.participant!.id]
      );
      rows.push(inserted.rows[0]);
    }
    return rows;
  });

  res.status(201).json({ dateOptions: created });
}

/** GET /api/trips/:tripId/date-options — alle Terminoptionen eines Trips (inkl. Vorschlagender). */
export async function listDateOptions(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();

  const result = await query(
    `SELECT d.*, tu.name AS proposed_by_name, (tu.role = 'creator') AS proposed_by_creator
     FROM date_options d
     LEFT JOIN trip_users tu ON tu.id = d.created_by
     WHERE d.trip_id = $1
     ORDER BY d.start_date ASC`,
    [tripId]
  );
  res.json({ dateOptions: result.rows });
}

/** DELETE /api/trips/:tripId/date-options/:dateOptionId — Ersteller (jeden) bzw. Vorschlagender (eigene) entfernt einen Termin. */
export async function deleteDateOption(req: Request, res: Response) {
  const { tripId, dateOptionId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();
  if (!isUuid(dateOptionId)) throw notFound('Terminoption nicht gefunden');

  const found = await query<{ created_by: string | null }>(
    'SELECT created_by FROM date_options WHERE id = $1 AND trip_id = $2',
    [dateOptionId, tripId]
  );
  if (!found.rows[0]) throw notFound('Terminoption nicht gefunden');

  const isCreator = req.participant!.role === 'creator';
  const isOwn = found.rows[0].created_by === req.participant!.id;
  if (!isCreator && !isOwn) throw forbidden('Du kannst nur deine eigenen Terminvorschläge entfernen');
  if (!isCreator) await assertVotingOpen(tripId);

  await query('DELETE FROM date_options WHERE id = $1 AND trip_id = $2', [dateOptionId, tripId]);
  res.status(204).send();
}
