import { Request, Response } from 'express';
import { forbidden } from '../utils/httpError';
import { computeLedger } from '../services/ledger.service';

/** GET /api/trips/:tripId/balances — wer wem wie viel schuldet, plus Vorschlag mit wenigen Transaktionen. */
export async function getLedger(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();

  const ledger = await computeLedger(tripId);
  res.json(ledger);
}
