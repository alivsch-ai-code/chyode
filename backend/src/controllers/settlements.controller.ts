import { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/pool';
import { badRequest, forbidden, notFound } from '../utils/httpError';
import { isUuid } from '../middleware/auth';

const addSettlementSchema = z.object({
  toTripUserId: z.string().trim().min(1, 'Bitte wähle, an wen gezahlt wurde'),
  amount: z.number().positive('Der Betrag muss größer als 0 sein').max(100000),
  note: z.string().trim().max(300).optional(),
});

/** POST /api/trips/:tripId/settlements — trägt eine manuelle Zahlung ein (gleicht Schulden aus). */
export async function addSettlement(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();

  const parsed = addSettlementSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);
  const { toTripUserId, amount, note } = parsed.data;

  if (toTripUserId === req.participant!.id) throw badRequest('Du kannst keine Zahlung an dich selbst eintragen');
  const member = await query('SELECT 1 FROM trip_users WHERE id = $1 AND trip_id = $2', [toTripUserId, tripId]);
  if (!member.rows[0]) throw badRequest('Unbekanntes Mitglied');

  const result = await query(
    `INSERT INTO trip_settlements (trip_id, from_trip_user_id, to_trip_user_id, amount, note, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [tripId, req.participant!.id, toTripUserId, amount, note || null, req.participant!.id]
  );
  res.status(201).json({ settlement: result.rows[0] });
}

/** GET /api/trips/:tripId/settlements — alle eingetragenen Zahlungen, neueste zuerst. */
export async function listSettlements(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();

  const result = await query(
    `SELECT s.*, f.name AS from_name, t.name AS to_name
     FROM trip_settlements s
     JOIN trip_users f ON f.id = s.from_trip_user_id
     JOIN trip_users t ON t.id = s.to_trip_user_id
     WHERE s.trip_id = $1
     ORDER BY s.created_at DESC`,
    [tripId]
  );
  res.json({ settlements: result.rows });
}

/** DELETE /api/trips/:tripId/settlements/:settlementId — Ersteller oder eine der beiden Parteien. */
export async function deleteSettlement(req: Request, res: Response) {
  const { tripId, settlementId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();
  if (!isUuid(settlementId)) throw notFound('Eintrag nicht gefunden');

  const found = await query<{ from_trip_user_id: string; to_trip_user_id: string }>(
    'SELECT from_trip_user_id, to_trip_user_id FROM trip_settlements WHERE id = $1 AND trip_id = $2',
    [settlementId, tripId]
  );
  if (!found.rows[0]) throw notFound('Eintrag nicht gefunden');

  const isCreator = req.participant!.role === 'creator';
  const involved = [found.rows[0].from_trip_user_id, found.rows[0].to_trip_user_id].includes(req.participant!.id);
  if (!isCreator && !involved) throw forbidden('Du kannst nur Zahlungen entfernen, an denen du beteiligt bist');

  await query('DELETE FROM trip_settlements WHERE id = $1 AND trip_id = $2', [settlementId, tripId]);
  res.status(204).send();
}
