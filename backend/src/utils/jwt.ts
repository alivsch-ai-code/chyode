import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface SessionTokenPayload {
  sub: string; // user id
  tv: number; // token_version des Users zum Zeitpunkt der Anmeldung
}

export function signSessionToken(payload: SessionTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: `${env.sessionTtlDays}d` });
}

export function verifySessionToken(token: string): SessionTokenPayload {
  const decoded = jwt.verify(token, env.jwtSecret);
  if (typeof decoded === 'string' || typeof decoded.sub !== 'string' || typeof decoded.tv !== 'number') {
    throw new Error('Invalid session token');
  }
  return { sub: decoded.sub, tv: decoded.tv };
}
