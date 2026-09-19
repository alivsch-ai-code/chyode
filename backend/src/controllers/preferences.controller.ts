import { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/pool';
import { ParticipantPreferences, Trip } from '../types';
import { badRequest, forbidden, notFound } from '../utils/httpError';
import {
  ACCOMMODATION_TYPE_KEYS,
  EXPERIENCE_KEYS,
  MAX_ACCOMMODATION_TYPES,
  MAX_EXPERIENCES,
} from '../utils/catalog';

const savePreferencesSchema = z.object({
  budgetAccommodation: z.number().min(0).max(100000).nullable(),
  budgetActivities: z.number().min(0).max(100000).nullable(),
  experiences: z.array(z.enum(EXPERIENCE_KEYS)).max(MAX_EXPERIENCES, `Bitte wähle höchstens ${MAX_EXPERIENCES} Erlebnisse aus`),
  accommodationTypes: z
    .array(z.enum(ACCOMMODATION_TYPE_KEYS))
    .max(MAX_ACCOMMODATION_TYPES, `Bitte wähle höchstens ${MAX_ACCOMMODATION_TYPES} Unterkunftsarten aus`),
});

function toClient(row: ParticipantPreferences) {
  return {
    budgetAccommodation: row.budget_accommodation === null ? null : parseFloat(row.budget_accommodation),
    budgetActivities: row.budget_activities === null ? null : parseFloat(row.budget_activities),
    experiences: row.experiences,
    accommodationTypes: row.accommodation_types,
    updatedAt: row.updated_at,
  };
}

/** GET /api/trips/:tripId/preferences/me — eigene Präferenzen (oder null, falls noch keine abgegeben). */
export async function getMyPreferences(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();

  const result = await query<ParticipantPreferences>(
    'SELECT * FROM participant_preferences WHERE trip_user_id = $1',
    [req.participant!.id]
  );
  res.json({ preferences: result.rows[0] ? toClient(result.rows[0]) : null });
}

/** PUT /api/trips/:tripId/preferences — speichert die eigenen Präferenzen (solange abgestimmt werden darf). */
export async function saveMyPreferences(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();

  const parsed = savePreferencesSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);
  const data = parsed.data;

  const trip = await query<Pick<Trip, 'status'>>('SELECT status FROM trips WHERE id = $1', [tripId]);
  if (!trip.rows[0]) throw notFound('Trip nicht gefunden');
  if (trip.rows[0].status !== 'voting') throw forbidden('Die Abstimmung ist beendet – Präferenzen können nicht mehr geändert werden');

  const result = await query<ParticipantPreferences>(
    `INSERT INTO participant_preferences
       (trip_id, trip_user_id, budget_accommodation, budget_activities, experiences, accommodation_types)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (trip_user_id) DO UPDATE SET
       budget_accommodation = EXCLUDED.budget_accommodation,
       budget_activities = EXCLUDED.budget_activities,
       experiences = EXCLUDED.experiences,
       accommodation_types = EXCLUDED.accommodation_types,
       updated_at = now()
     RETURNING *`,
    [
      tripId,
      req.participant!.id,
      data.budgetAccommodation,
      data.budgetActivities,
      [...new Set(data.experiences)],
      [...new Set(data.accommodationTypes)],
    ]
  );

  res.json({ preferences: toClient(result.rows[0]) });
}
