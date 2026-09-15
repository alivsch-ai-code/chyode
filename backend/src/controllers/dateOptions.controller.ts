import { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/pool';
import { DateOption } from '../types';
import { badRequest, forbidden } from '../utils/httpError';

const createDateOptionSchema = z.object({
  label: z.string().min(1).max(200),
  startDate: z.string(),
  endDate: z.string(),
});

/** POST /api/trips/:tripId/date-options — Ersteller fügt eine weitere Terminoption hinzu. */
export async function addDateOption(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();
  if (req.participant!.role !== 'creator') throw forbidden('Nur der Ersteller darf Terminoptionen anlegen');

  const parsed = createDateOptionSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

  const result = await query<DateOption>(
    'INSERT INTO date_options (trip_id, label, start_date, end_date) VALUES ($1, $2, $3, $4) RETURNING *',
    [tripId, parsed.data.label, parsed.data.startDate, parsed.data.endDate]
  );

  res.status(201).json({ dateOption: result.rows[0] });
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
