import { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/pool';
import { Vote } from '../types';
import { badRequest, forbidden, notFound } from '../utils/httpError';

const castVoteSchema = z.object({
  dateOptionId: z.string().uuid(),
  peopleCount: z.number().int().positive().default(1),
});

/**
 * POST /api/trips/:tripId/votes — Teilnehmer stimmt für eine Terminoption ab.
 * Wiederholtes Abstimmen für dieselbe Option aktualisiert die Personenanzahl (Upsert).
 */
export async function castVote(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();

  const parsed = castVoteSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

  const dateOption = await query('SELECT id FROM date_options WHERE id = $1 AND trip_id = $2', [
    parsed.data.dateOptionId,
    tripId,
  ]);
  if (!dateOption.rows[0]) throw notFound('Terminoption nicht gefunden');

  const result = await query<Vote>(
    `INSERT INTO votes (trip_id, trip_user_id, date_option_id, people_count)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (trip_user_id, date_option_id)
     DO UPDATE SET people_count = EXCLUDED.people_count
     RETURNING *`,
    [tripId, req.participant!.id, parsed.data.dateOptionId, parsed.data.peopleCount]
  );

  res.status(201).json({ vote: result.rows[0] });
}

/** DELETE /api/trips/:tripId/votes/:dateOptionId — Stimme zurückziehen. */
export async function removeVote(req: Request, res: Response) {
  const { tripId, dateOptionId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();

  await query('DELETE FROM votes WHERE trip_id = $1 AND trip_user_id = $2 AND date_option_id = $3', [
    tripId,
    req.participant!.id,
    dateOptionId,
  ]);

  res.status(204).send();
}

/** GET /api/trips/:tripId/votes — alle Stimmen eines Trips (für Voting-UI / Auswertung). */
export async function listVotes(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();

  const result = await query(
    `SELECT v.*, tu.name AS voter_name
     FROM votes v
     JOIN trip_users tu ON tu.id = v.trip_user_id
     WHERE v.trip_id = $1`,
    [tripId]
  );
  res.json({ votes: result.rows });
}

/** GET /api/trips/:tripId/votes/me — eigene Stimmen des angemeldeten Teilnehmers. */
export async function listMyVotes(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();

  const result = await query<Vote>(
    'SELECT * FROM votes WHERE trip_id = $1 AND trip_user_id = $2',
    [tripId, req.participant!.id]
  );
  res.json({ votes: result.rows });
}
