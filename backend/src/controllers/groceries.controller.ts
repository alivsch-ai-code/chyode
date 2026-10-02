import { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/pool';
import { GroceryItem } from '../types';
import { badRequest, forbidden, notFound } from '../utils/httpError';
import { isUuid } from '../middleware/auth';

const addGroceryItemSchema = z.object({
  item: z.string().trim().min(1, 'Bitte gib an, was du brauchst').max(200),
  quantity: z.string().trim().max(60).optional(),
  note: z.string().trim().max(300).optional(),
  price: z.number().min(0).max(10000).optional(),
});

/** POST /api/trips/:tripId/groceries — trägt einen Essenswunsch/Einkaufsartikel ein. */
export async function addGroceryItem(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();

  const parsed = addGroceryItemSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);
  const { item, quantity, note, price } = parsed.data;

  const result = await query<GroceryItem>(
    `INSERT INTO grocery_items (trip_id, trip_user_id, item, quantity, note, price)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [tripId, req.participant!.id, item, quantity || null, note || null, price ?? null]
  );
  res.status(201).json({ item: result.rows[0] });
}

/** GET /api/trips/:tripId/groceries — die gemeinsame Einkaufsliste (offene Artikel zuerst). */
export async function listGroceryItems(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();

  const result = await query(
    `SELECT g.*, tu.name AS added_by_name, checker.name AS checked_by_name
     FROM grocery_items g
     JOIN trip_users tu ON tu.id = g.trip_user_id
     LEFT JOIN trip_users checker ON checker.id = g.checked_by
     WHERE g.trip_id = $1
     ORDER BY (g.checked_at IS NOT NULL), g.created_at ASC`,
    [tripId]
  );
  res.json({ items: result.rows });
}

/**
 * GET /api/trips/:tripId/groceries/summary — Gesamtsumme und zwei Varianten der Kostenaufteilung:
 * gleichmäßig unter allen Mitgliedern, oder jeder zahlt, was er selbst eingetragen hat.
 * Wird live berechnet statt gespeichert, damit sie nie veraltet.
 */
export async function getGrocerySummary(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();

  const participants = await query<{ count: string }>('SELECT COUNT(*) FROM trip_users WHERE trip_id = $1', [tripId]);
  const participantCount = parseInt(participants.rows[0].count, 10);

  const byPerson = await query<{ trip_user_id: string; name: string; spent: string }>(
    `SELECT tu.id AS trip_user_id, tu.name, COALESCE(SUM(g.price), 0) AS spent
     FROM trip_users tu
     LEFT JOIN grocery_items g ON g.trip_user_id = tu.id AND g.price IS NOT NULL
     WHERE tu.trip_id = $1
     GROUP BY tu.id, tu.name
     ORDER BY tu.name ASC`,
    [tripId]
  );

  const total = byPerson.rows.reduce((sum, row) => sum + Number(row.spent), 0);
  const perPersonEven = participantCount > 0 ? total / participantCount : 0;

  res.json({
    total: Math.round(total * 100) / 100,
    participantCount,
    perPersonEven: Math.round(perPersonEven * 100) / 100,
    byPerson: byPerson.rows.map((row) => ({ tripUserId: row.trip_user_id, name: row.name, spent: Number(row.spent) })),
  });
}

/** PATCH /api/trips/:tripId/groceries/:itemId/toggle — hakt einen Artikel ab oder macht das rückgängig. */
export async function toggleGroceryItem(req: Request, res: Response) {
  const { tripId, itemId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();
  if (!isUuid(itemId)) throw notFound('Eintrag nicht gefunden');

  const existing = await query<{ checked_at: string | null }>(
    'SELECT checked_at FROM grocery_items WHERE id = $1 AND trip_id = $2',
    [itemId, tripId]
  );
  if (!existing.rows[0]) throw notFound('Eintrag nicht gefunden');

  const nowChecked = existing.rows[0].checked_at === null;
  const result = await query<GroceryItem>(
    `UPDATE grocery_items
     SET checked_at = CASE WHEN $3 THEN now() ELSE NULL END,
         checked_by = CASE WHEN $3 THEN $4::uuid ELSE NULL END
     WHERE id = $1 AND trip_id = $2 RETURNING *`,
    [itemId, tripId, nowChecked, req.participant!.id]
  );
  res.json({ item: result.rows[0] });
}

/** DELETE /api/trips/:tripId/groceries/:itemId — Ersteller (jeden) bzw. Eintragende (eigene) entfernt einen Artikel. */
export async function deleteGroceryItem(req: Request, res: Response) {
  const { tripId, itemId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();
  if (!isUuid(itemId)) throw notFound('Eintrag nicht gefunden');

  const found = await query<{ trip_user_id: string }>(
    'SELECT trip_user_id FROM grocery_items WHERE id = $1 AND trip_id = $2',
    [itemId, tripId]
  );
  if (!found.rows[0]) throw notFound('Eintrag nicht gefunden');

  const isCreator = req.participant!.role === 'creator';
  const isOwn = found.rows[0].trip_user_id === req.participant!.id;
  if (!isCreator && !isOwn) throw forbidden('Du kannst nur deine eigenen Einträge entfernen');

  await query('DELETE FROM grocery_items WHERE id = $1 AND trip_id = $2', [itemId, tripId]);
  res.status(204).send();
}
