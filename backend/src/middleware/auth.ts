import { Request, RequestHandler } from 'express';
import { query } from '../db/pool';
import { TripUser, User } from '../types';
import { forbidden, notFound, unauthorized } from '../utils/httpError';
import { verifySessionToken } from '../utils/jwt';

export const SESSION_COOKIE = 'tp_session';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID_RE.test(value);

/** Lädt den angemeldeten Account aus dem Session-Cookie; wirft 401 bei jedem Problem. */
async function loadSessionUser(req: Request): Promise<User> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== 'string' || !token) throw unauthorized('Anmeldung erforderlich');

  let payload;
  try {
    payload = verifySessionToken(token);
  } catch {
    throw unauthorized('Sitzung abgelaufen. Bitte erneut anmelden.');
  }
  if (!isUuid(payload.sub)) throw unauthorized('Sitzung abgelaufen. Bitte erneut anmelden.');

  const result = await query<User>('SELECT * FROM users WHERE id = $1', [payload.sub]);
  const user = result.rows[0];
  // token_version ändert sich bei Passwortänderung/-reset und macht alte Sessions ungültig
  if (!user || user.status !== 'active' || user.token_version !== payload.tv) {
    throw unauthorized('Sitzung abgelaufen. Bitte erneut anmelden.');
  }
  return user;
}

/** Erfordert eine gültige Anmeldung (Cookie-Session). */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    req.user = await loadSessionUser(req);
    next();
  } catch (err) {
    next(err);
  }
};

/** Erfordert Anmeldung als Administrator. */
export const requireAdmin: RequestHandler = async (req, _res, next) => {
  try {
    const user = await loadSessionUser(req);
    if (user.role !== 'admin') throw forbidden('Nur Administratoren dürfen diese Aktion ausführen');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Erfordert Anmeldung UND Mitgliedschaft im Trip aus `req.params.tripId`.
 * Setzt `req.participant` (Teilnehmer-Zeile des Accounts in diesem Trip).
 */
export const requireParticipantAuth: RequestHandler = async (req, _res, next) => {
  try {
    const user = await loadSessionUser(req);
    req.user = user;

    const { tripId } = req.params;
    if (!isUuid(tripId)) throw notFound('Trip nicht gefunden');

    const result = await query<TripUser>(
      'SELECT * FROM trip_users WHERE trip_id = $1 AND user_id = $2',
      [tripId, user.id]
    );
    const participant = result.rows[0];
    if (!participant) throw forbidden('Du bist kein Teilnehmer dieses Trips');

    req.participant = {
      id: participant.id,
      tripId: participant.trip_id,
      name: participant.name,
      role: participant.role,
    };
    next();
  } catch (err) {
    next(err);
  }
};

/** Stellt sicher, dass der authentifizierte Teilnehmer der Ersteller des Trips ist. */
export const requireTripCreatorParticipant: RequestHandler = (req, _res, next) => {
  if (req.participant?.role !== 'creator') {
    return next(forbidden('Nur der Trip-Ersteller darf diese Aktion ausführen'));
  }
  next();
};
