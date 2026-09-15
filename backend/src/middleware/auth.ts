import { RequestHandler } from 'express';
import { query } from '../db/pool';
import { TripUser } from '../types';
import { unauthorized } from '../utils/httpError';
import { verifyToken, CreatorTokenPayload } from '../utils/jwt';

/**
 * Authentifiziert den Trip-Ersteller über ein JWT (aus Magic-Link-Login).
 * Erwartet Header: Authorization: Bearer <jwt>
 */
export const requireCreatorAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(unauthorized('Anmeldung erforderlich'));
  }
  try {
    const payload = verifyToken<CreatorTokenPayload>(header.slice('Bearer '.length));
    req.creator = { userId: payload.userId, email: payload.email };
    next();
  } catch {
    next(unauthorized('Ungültiges oder abgelaufenes Token'));
  }
};

/**
 * Authentifiziert einen Trip-Teilnehmer über ein Session-Token (aus dem Einladungslink-Beitritt).
 * Erwartet Header: X-Participant-Token: <session_token>
 */
export const requireParticipantAuth: RequestHandler = async (req, res, next) => {
  const token = req.headers['x-participant-token'];
  if (typeof token !== 'string' || !token) {
    return next(unauthorized('Teilnehmer-Session erforderlich'));
  }

  const result = await query<TripUser>(
    'SELECT * FROM trip_users WHERE session_token = $1',
    [token]
  );
  const participant = result.rows[0];
  if (!participant) {
    return next(unauthorized('Ungültige Teilnehmer-Session'));
  }

  req.participant = {
    id: participant.id,
    tripId: participant.trip_id,
    name: participant.name,
    role: participant.role,
  };
  next();
};

/** Stellt sicher, dass der authentifizierte Teilnehmer der Ersteller des Trips ist. */
export const requireTripCreatorParticipant: RequestHandler = (req, res, next) => {
  if (req.participant?.role !== 'creator') {
    return next(unauthorized('Nur der Trip-Ersteller darf diese Aktion ausführen'));
  }
  next();
};
