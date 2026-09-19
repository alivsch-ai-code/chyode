import bcrypt from 'bcryptjs';
import { z } from 'zod';

const BCRYPT_COST = 12;

// bcrypt verarbeitet maximal 72 Bytes; längere Eingaben würden stillschweigend abgeschnitten.
export const passwordSchema = z
  .string()
  .min(10, 'Das Passwort muss mindestens 10 Zeichen lang sein')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Das Passwort ist zu lang (max. 72 Bytes)');

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Wird für unbekannte E-Mail-Adressen verglichen, damit die Antwortzeit nichts verrät.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_COST);
export function verifyAgainstDummy(password: string): Promise<boolean> {
  return bcrypt.compare(password, DUMMY_HASH);
}
