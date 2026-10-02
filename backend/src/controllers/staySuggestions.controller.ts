import { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/pool';
import { Trip } from '../types';
import { badRequest, forbidden, notFound } from '../utils/httpError';
import { isUuid } from '../middleware/auth';

const httpsUrl = (label: string) =>
  z
    .string()
    .trim()
    .max(label === 'Bild' ? 1000 : 500)
    .optional()
    .refine((v) => !v || /^https?:\/\//i.test(v), `${label} muss mit https:// beginnen`);

const addStaySuggestionSchema = z.object({
  title: z.string().trim().min(1, 'Bitte gib einen Namen ein').max(200),
  address: z.string().trim().max(300).optional(),
  url: httpsUrl('Link'),
  imageUrl: httpsUrl('Bild'),
  note: z.string().trim().max(500).optional(),
  price: z.number().min(0).max(1000000).optional(),
});

/**
 * POST /api/trips/:tripId/stay-suggestions — jedes Mitglied kann eine eigene Unterkunft
 * vorschlagen (manuell, unabhängig von der Booking/Airbnb-Suche).
 */
export async function addStaySuggestion(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();

  const parsed = addStaySuggestionSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);
  const { title, address, url, imageUrl, note, price } = parsed.data;

  const result = await query(
    `INSERT INTO trip_stay_suggestions (trip_id, trip_user_id, title, address, url, image_url, note, price)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [tripId, req.participant!.id, title, address || null, url || null, imageUrl || null, note || null, price ?? null]
  );
  res.status(201).json({ suggestion: result.rows[0] });
}

/** GET /api/trips/:tripId/stay-suggestions — alle Vorschläge, neueste zuerst. */
export async function listStaySuggestions(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();

  const result = await query(
    `SELECT s.*, tu.name AS added_by_name
     FROM trip_stay_suggestions s
     JOIN trip_users tu ON tu.id = s.trip_user_id
     WHERE s.trip_id = $1
     ORDER BY s.created_at DESC`,
    [tripId]
  );
  res.json({ suggestions: result.rows });
}

/** DELETE /api/trips/:tripId/stay-suggestions/:id — Ersteller (jeden) bzw. Vorschlagende (eigene). */
export async function deleteStaySuggestion(req: Request, res: Response) {
  const { tripId, suggestionId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();
  if (!isUuid(suggestionId)) throw notFound('Vorschlag nicht gefunden');

  const found = await query<{ trip_user_id: string }>(
    'SELECT trip_user_id FROM trip_stay_suggestions WHERE id = $1 AND trip_id = $2',
    [suggestionId, tripId]
  );
  if (!found.rows[0]) throw notFound('Vorschlag nicht gefunden');

  const isCreator = req.participant!.role === 'creator';
  const isOwn = found.rows[0].trip_user_id === req.participant!.id;
  if (!isCreator && !isOwn) throw forbidden('Du kannst nur deine eigenen Vorschläge entfernen');

  await query('DELETE FROM trip_stay_suggestions WHERE id = $1 AND trip_id = $2', [suggestionId, tripId]);
  res.status(204).send();
}

/**
 * POST /api/trips/:tripId/stay-suggestions/:id/select — übernimmt einen Vorschlag als die fest
 * ausgewählte Unterkunft (nur Ersteller). Der Vorschlag bleibt zusätzlich erhalten.
 */
export async function selectStaySuggestion(req: Request, res: Response) {
  const { tripId, suggestionId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();
  if (!isUuid(suggestionId)) throw notFound('Vorschlag nicht gefunden');

  const found = await query<{
    title: string;
    address: string | null;
    url: string | null;
    image_url: string | null;
    note: string | null;
    price: string | null;
  }>(
    'SELECT title, address, url, image_url, note, price FROM trip_stay_suggestions WHERE id = $1 AND trip_id = $2',
    [suggestionId, tripId]
  );
  if (!found.rows[0]) throw notFound('Vorschlag nicht gefunden');
  const s = found.rows[0];

  const result = await query<Trip>(
    `UPDATE trips SET
       accommodation_title = $2,
       accommodation_address = $3,
       accommodation_url = $4,
       accommodation_image_url = $5,
       accommodation_note = $6,
       accommodation_picked_by = $7,
       accommodation_picked_at = now(),
       accommodation_total_price = COALESCE($8, accommodation_total_price),
       accommodation_paid_by = CASE WHEN $8 IS NOT NULL THEN $7 ELSE accommodation_paid_by END
     WHERE id = $1 RETURNING *`,
    [tripId, s.title, s.address, s.url, s.image_url, s.note, req.participant!.id, s.price]
  );
  if (!result.rows[0]) throw notFound('Trip nicht gefunden');
  res.json({ trip: result.rows[0] });
}
