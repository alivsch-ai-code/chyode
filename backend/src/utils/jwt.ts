import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface CreatorTokenPayload {
  userId: string;
  email: string;
}

export interface MagicLinkTokenPayload {
  userId: string;
  email: string;
  purpose: 'magic-link';
}

export function signCreatorSession(payload: CreatorTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: `${env.creatorSessionTtlDays}d`,
  });
}

export function signMagicLinkToken(payload: Omit<MagicLinkTokenPayload, 'purpose'>): string {
  return jwt.sign({ ...payload, purpose: 'magic-link' }, env.jwtSecret, {
    expiresIn: `${env.magicLinkTtlMin}m`,
  });
}

export function verifyToken<T>(token: string): T {
  return jwt.verify(token, env.jwtSecret) as T;
}
