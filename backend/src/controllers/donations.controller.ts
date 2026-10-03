import { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/pool';
import { badRequest, forbidden, notFound } from '../utils/httpError';
import { isUuid } from '../middleware/auth';

const addDonationSchema = z.object({
  donorName: z.string().trim().min(1, 'Bitte gib an, wer spendet').max(80),
  amount: z.number().positive('Der Betrag muss größer als 0 sein').max(100000),
  receivedBy: z.string().trim().optional(), // trip_user_id; Standard: wer den Eintrag anlegt
  note: z.string().trim().max(300).optional(),
});

/**
 * POST /api/trips/:tripId/donations — trägt eine Spende von außen ein (Spender fährt nicht mit).
 * Ein Mitglied hat das Geld erhalten; es senkt die Kosten für alle Mitreisenden gleichmäßig.
 */
export async function addDonation(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();

  const parsed = addDonationSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);
  const { donorName, amount, receivedBy, note } = parsed.data;

  const receiver = receivedBy || req.participant!.id;
  if (!isUuid(receiver)) throw badRequest('Unbekanntes Mitglied');
  const member = await query('SELECT 1 FROM trip_users WHERE id = $1 AND trip_id = $2', [receiver, tripId]);
  if (!member.rows[0]) throw badRequest('Unbekanntes Mitglied als Empfänger angegeben');

  const result = await query(
    `INSERT INTO trip_donations (trip_id, donor_name, amount, received_by, note, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [tripId, donorName, amount, receiver, note || null, req.participant!.id]
  );
  res.status(201).json({ donation: result.rows[0] });
}

/** GET /api/trips/:tripId/donations — alle Spenden, neueste zuerst. */
export async function listDonations(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();

  const result = await query(
    `SELECT d.*, tu.name AS received_by_name
     FROM trip_donations d
     JOIN trip_users tu ON tu.id = d.received_by
     WHERE d.trip_id = $1
     ORDER BY d.created_at DESC`,
    [tripId]
  );
  res.json({ donations: result.rows });
}

/** DELETE /api/trips/:tripId/donations/:donationId — Ersteller, Empfänger oder wer sie eingetragen hat. */
export async function deleteDonation(req: Request, res: Response) {
  const { tripId, donationId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();
  if (!isUuid(donationId)) throw notFound('Spende nicht gefunden');

  const found = await query<{ received_by: string; created_by: string | null }>(
    'SELECT received_by, created_by FROM trip_donations WHERE id = $1 AND trip_id = $2',
    [donationId, tripId]
  );
  if (!found.rows[0]) throw notFound('Spende nicht gefunden');

  const me = req.participant!.id;
  const allowed = req.participant!.role === 'creator' || found.rows[0].received_by === me || found.rows[0].created_by === me;
  if (!allowed) throw forbidden('Du kannst nur eigene Einträge entfernen');

  await query('DELETE FROM trip_donations WHERE id = $1 AND trip_id = $2', [donationId, tripId]);
  res.status(204).send();
}
