import { promises as fs } from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { env } from '../config/env';

/**
 * Ablage für eingescannte Belege. Dateien liegen außerhalb jedes statisch/öffentlich
 * ausgelieferten Ordners und werden nur über eine authentifizierte, trip-gebundene Route
 * (requireParticipantAuth) gestreamt. In der Datenbank steht nur der reine Dateiname.
 */

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

export function isAllowedReceiptMime(mime: string): boolean {
  return mime in ALLOWED_MIME;
}

export function mimeFromFilename(filename: string): string {
  const ext = path.extname(filename).slice(1).toLowerCase();
  return Object.entries(ALLOWED_MIME).find(([, e]) => e === ext)?.[0] ?? 'application/octet-stream';
}

/** Speichert einen Beleg unter einem zufälligen Dateinamen; gibt den in der DB zu speichernden Namen zurück. */
export async function saveReceipt(buffer: Buffer, mime: string): Promise<string> {
  const ext = ALLOWED_MIME[mime];
  if (!ext) throw new Error(`Nicht unterstützter Dateityp: ${mime}`);
  await fs.mkdir(env.uploadDir, { recursive: true });
  const filename = `${randomBytes(16).toString('hex')}.${ext}`;
  await fs.writeFile(path.join(env.uploadDir, filename), buffer);
  return filename;
}

/** Absoluter Pfad zu einem gespeicherten Beleg. Nimmt nur den reinen Dateinamen (Schutz vor Path Traversal). */
export function receiptAbsolutePath(filename: string): string {
  const safeName = path.basename(filename);
  return path.join(env.uploadDir, safeName);
}

export async function deleteReceipt(filename: string | null | undefined): Promise<void> {
  if (!filename) return;
  try {
    await fs.unlink(receiptAbsolutePath(filename));
  } catch {
    // Datei existierte schon nicht mehr (oder nie) – kein Fehler
  }
}
