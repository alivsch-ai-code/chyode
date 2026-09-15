import crypto from 'crypto';

/** URL-sicheres, zufälliges Token, z.B. für Einladungslinks oder Teilnehmer-Sessions. */
export function generateToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function hashString(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
