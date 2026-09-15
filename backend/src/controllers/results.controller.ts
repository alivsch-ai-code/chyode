import { Request, Response } from 'express';
import { forbidden } from '../utils/httpError';
import { computeTripResults } from '../services/results.service';

/** GET /api/trips/:tripId/results — berechnet Top-Datum, Top-Wochenende und häufigste Wünsche. */
export async function getTripResults(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();

  const results = await computeTripResults(tripId);
  res.json({ results });
}
