import { Request, Response } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool';
import { DateOption } from '../types';
import { badRequest, forbidden, notFound } from '../utils/httpError';
import { isUuid } from '../middleware/auth';
import { dateOptionInputSchema } from './trips.controller';

const addDateOptionsSchema = z.object({
  dateOptions: z.array(dateOptionInputSchema).min(1, 'Bitte wähle mindestens einen Termin aus').max(60),
});

/** POST /api/trips/:tripId/date-options — Ersteller ergänzt einen oder mehrere Termine (z. B. Wochenenden). */
export async function addDateOptions(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();
  if (req.participant!.role !== 'creator') throw forbidden('Nur der Ersteller darf Terminoptionen anlegen');

  const body = Array.isArray(req.body?.dateOptions) ? req.body : { dateOptions: [req.body] };
  const parsed = addDateOptionsSchema.safeParse(body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

  const created = await withTransaction(async (client) => {
    const rows: DateOption[] = [];
    for (const option of parsed.data.dateOptions) {
      const duplicate = await client.query(
        'SELECT 1 FROM date_options WHERE trip_id = $1 AND start_date = $2 AND end_date = $3',
        [tripId, option.startDate, option.endDate]
      );
      if (duplicate.rows.length > 0) continue;

      const inserted = await client.query<DateOption>(
        'INSERT INTO date_options (trip_id, label, start_date, end_date) VALUES ($1, $2, $3, $4) RETURNING *',
        [tripId, option.label, option.startDate, option.endDate]
      );
      rows.push(inserted.rows[0]);
    }
    return rows;
  });

  res.status(201).json({ dateOptions: created });
}

/** GET /api/trips/:tripId/date-options — alle Terminoptionen eines Trips. */
export async function listDateOptions(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();

  const result = await query<DateOption>(
    'SELECT * FROM date_options WHERE trip_id = $1 ORDER BY start_date ASC',
    [tripId]
  );
  res.json({ dateOptions: result.rows });
}

/** DELETE /api/trips/:tripId/date-options/:dateOptionId — Ersteller entfernt einen Termin (samt Stimmen). */
export async function deleteDateOption(req: Request, res: Response) {
  const { tripId, dateOptionId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();
  if (req.participant!.role !== 'creator') throw forbidden('Nur der Ersteller darf Terminoptionen entfernen');
  if (!isUuid(dateOptionId)) throw notFound('Terminoption nicht gefunden');

  const result = await query('DELETE FROM date_options WHERE id = $1 AND trip_id = $2', [dateOptionId, tripId]);
  if (result.rowCount === 0) throw notFound('Terminoption nicht gefunden');
  res.status(204).send();
}
