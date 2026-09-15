import { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/pool';
import { Note } from '../types';
import { badRequest, forbidden } from '../utils/httpError';

const createNoteSchema = z.object({
  category: z.enum(['wish', 'idea', 'requirement']).default('wish'),
  content: z.string().min(1).max(1000),
});

/** POST /api/trips/:tripId/notes — Teilnehmer hinterlässt eine Notiz (Wunsch/Idee/Anforderung). */
export async function addNote(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();

  const parsed = createNoteSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

  const result = await query<Note>(
    'INSERT INTO notes (trip_id, trip_user_id, category, content) VALUES ($1, $2, $3, $4) RETURNING *',
    [tripId, req.participant!.id, parsed.data.category, parsed.data.content]
  );

  res.status(201).json({ note: result.rows[0] });
}

/** GET /api/trips/:tripId/notes — alle Notizen eines Trips. */
export async function listNotes(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();

  const result = await query(
    `SELECT n.*, tu.name AS author_name
     FROM notes n
     JOIN trip_users tu ON tu.id = n.trip_user_id
     WHERE n.trip_id = $1
     ORDER BY n.created_at DESC`,
    [tripId]
  );
  res.json({ notes: result.rows });
}

/** DELETE /api/trips/:tripId/notes/:noteId — eigene Notiz löschen. */
export async function deleteNote(req: Request, res: Response) {
  const { tripId, noteId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();

  await query('DELETE FROM notes WHERE id = $1 AND trip_id = $2 AND trip_user_id = $3', [
    noteId,
    tripId,
    req.participant!.id,
  ]);

  res.status(204).send();
}
