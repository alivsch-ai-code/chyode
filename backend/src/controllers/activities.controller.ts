import { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/pool';
import { TripActivity } from '../types';
import { badRequest, forbidden, notFound } from '../utils/httpError';
import { isUuid } from '../middleware/auth';

const addActivitySchema = z.object({
  title: z.string().trim().min(1, 'Bitte gib einen Titel ein').max(200),
  category: z.enum(['wellness', 'nature', 'sport', 'food']).optional(),
  distanceKm: z.number().min(0).max(500).optional(),
  price: z.number().min(0).max(10000).optional(),
  description: z.string().trim().max(500).optional(),
  link: z
    .string()
    .trim()
    .max(500)
    .optional()
    .refine((v) => !v || /^https?:\/\//i.test(v), 'Der Link muss mit https:// beginnen'),
});

/** POST /api/trips/:tripId/activities — fügt eine Aktivität/Idee in der Nähe hinzu. */
export async function addActivity(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();

  const parsed = addActivitySchema.safeParse(req.body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);
  const { title, category, distanceKm, price, description, link } = parsed.data;

  const result = await query<TripActivity>(
    `INSERT INTO trip_activities (trip_id, trip_user_id, title, category, distance_km, price, description, link)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [tripId, req.participant!.id, title, category ?? null, distanceKm ?? null, price ?? null, description || null, link || null]
  );
  res.status(201).json({ activity: result.rows[0] });
}

/** GET /api/trips/:tripId/activities — alle gesammelten Aktivitäten, nächstgelegene zuerst. */
export async function listActivities(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();

  const result = await query(
    `SELECT a.*, tu.name AS added_by_name
     FROM trip_activities a
     JOIN trip_users tu ON tu.id = a.trip_user_id
     WHERE a.trip_id = $1
     ORDER BY a.distance_km ASC NULLS LAST, a.created_at ASC`,
    [tripId]
  );
  res.json({ activities: result.rows });
}

/** DELETE /api/trips/:tripId/activities/:activityId — Ersteller (jede) bzw. Eintragende (eigene) entfernt eine Aktivität. */
export async function deleteActivity(req: Request, res: Response) {
  const { tripId, activityId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();
  if (!isUuid(activityId)) throw notFound('Aktivität nicht gefunden');

  const found = await query<{ trip_user_id: string }>(
    'SELECT trip_user_id FROM trip_activities WHERE id = $1 AND trip_id = $2',
    [activityId, tripId]
  );
  if (!found.rows[0]) throw notFound('Aktivität nicht gefunden');

  const isCreator = req.participant!.role === 'creator';
  const isOwn = found.rows[0].trip_user_id === req.participant!.id;
  if (!isCreator && !isOwn) throw forbidden('Du kannst nur deine eigenen Einträge entfernen');

  await query('DELETE FROM trip_activities WHERE id = $1 AND trip_id = $2', [activityId, tripId]);
  res.status(204).send();
}
