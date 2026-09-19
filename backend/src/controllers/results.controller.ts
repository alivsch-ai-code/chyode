import { Request, Response } from 'express';
import { forbidden } from '../utils/httpError';
import { computeTripResults } from '../services/results.service';
import { assertResultsAccess } from '../services/access.service';

/**
 * GET /api/trips/:tripId/results — Auswertung (Termine, Budget, Erlebnisse, Wünsche).
 * Ersteller sehen sie sofort, Teilnehmer erst nach Freigabe durch den Ersteller.
 */
export async function getTripResults(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();
  await assertResultsAccess(req.participant!);

  const results = await computeTripResults(tripId);
  res.json({ results });
}
