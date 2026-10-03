import fs from 'fs';
import { Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { env } from '../config/env';
import { query, withTransaction } from '../db/pool';
import { badRequest, forbidden, notFound } from '../utils/httpError';
import { isUuid } from '../middleware/auth';
import {
  deleteReceipt,
  isAllowedReceiptMime,
  mimeFromFilename,
  receiptAbsolutePath,
  saveReceipt,
} from '../utils/receiptStorage';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxReceiptSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (isAllowedReceiptMime(file.mimetype)) cb(null, true);
    else cb(badRequest('Nur JPG, PNG, WEBP oder PDF sind als Beleg erlaubt'));
  },
});

/** Multer-Middleware: liest ein optionales Feld "receipt" (Formular-Upload). */
export const receiptUpload = upload.single('receipt');

// Im Formular-Upload (multipart) kommt die Liste als JSON-Text, als JSON-Body direkt als Array.
const idList = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}, z.array(z.string().trim()).max(100));

const addExpenseSchema = z.object({
  description: z.string().trim().min(1, 'Bitte gib an, worum es geht').max(200),
  amount: z.coerce.number().positive('Der Betrag muss größer als 0 sein').max(100000),
  paidBy: z.string().trim().optional(), // trip_user_id; Standard: wer den Eintrag anlegt
  // nicht gesetzt = auf alle aktuellen Mitglieder verteilt; sonst nur auf diese Personen
  participantIds: idList.optional(),
});

function shapeExpense<T extends { receipt_path?: string | null }>(row: T) {
  const { receipt_path, ...rest } = row;
  return { ...rest, hasReceipt: Boolean(receipt_path) };
}

/**
 * POST /api/trips/:tripId/expenses — trägt eine Ausgabe ein (z. B. Taxi, Tickets), optional mit
 * Beleg-Foto (multipart/form-data). Ohne `participantIds` wird sie auf alle aktuellen Mitglieder
 * verteilt (auch auf später Beitretende), mit `participantIds` nur auf diese Personen.
 */
export async function addExpense(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();

  const parsed = addExpenseSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);
  const { description, amount, paidBy, participantIds } = parsed.data;

  const members = await query<{ id: string }>('SELECT id FROM trip_users WHERE trip_id = $1', [tripId]);
  const memberIds = new Set(members.rows.map((m) => m.id));

  let paidByTripUserId = req.participant!.id;
  if (paidBy && paidBy !== req.participant!.id) {
    if (!memberIds.has(paidBy)) throw badRequest('Unbekanntes Mitglied als Zahler angegeben');
    paidByTripUserId = paidBy;
  }

  const sharedBy = participantIds ? [...new Set(participantIds)] : null;
  if (sharedBy) {
    if (sharedBy.length === 0) throw badRequest('Bitte wähle mindestens eine Person zum Aufteilen');
    if (sharedBy.some((id) => !memberIds.has(id))) throw badRequest('Unbekanntes Mitglied beim Aufteilen');
  }

  let receiptPath: string | null = null;
  if (req.file) {
    receiptPath = await saveReceipt(req.file.buffer, req.file.mimetype);
  }

  try {
    const expense = await withTransaction(async (client) => {
      const inserted = await client.query(
        `INSERT INTO trip_expenses (trip_id, paid_by, description, amount, receipt_path, split_all, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [tripId, paidByTripUserId, description, amount, receiptPath, sharedBy === null, req.participant!.id]
      );
      const row = inserted.rows[0];
      for (const id of sharedBy ?? []) {
        await client.query('INSERT INTO trip_expense_participants (expense_id, trip_user_id) VALUES ($1, $2)', [row.id, id]);
      }
      return row;
    });

    res.status(201).json({ expense: shapeExpense(expense) });
  } catch (err) {
    await deleteReceipt(receiptPath); // Datei nicht verwaisen lassen, wenn das Anlegen fehlschlägt
    throw err;
  }
}

/** GET /api/trips/:tripId/expenses — alle manuellen Ausgaben, neueste zuerst. */
export async function listExpenses(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();

  const result = await query(
    `SELECT e.*, tu.name AS paid_by_name,
            CASE WHEN e.split_all THEN NULL ELSE ARRAY(
              SELECT p.name FROM trip_expense_participants ep
              JOIN trip_users p ON p.id = ep.trip_user_id
              WHERE ep.expense_id = e.id ORDER BY p.name
            ) END AS shared_by_names
     FROM trip_expenses e
     JOIN trip_users tu ON tu.id = e.paid_by
     WHERE e.trip_id = $1
     ORDER BY e.created_at DESC`,
    [tripId]
  );
  res.json({ expenses: result.rows.map(shapeExpense) });
}

/** DELETE /api/trips/:tripId/expenses/:expenseId — Ersteller oder Beteiligte (Zahler/Anlegende). */
export async function deleteExpense(req: Request, res: Response) {
  const { tripId, expenseId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();
  if (!isUuid(expenseId)) throw notFound('Ausgabe nicht gefunden');

  const found = await query<{ paid_by: string; created_by: string | null; receipt_path: string | null }>(
    'SELECT paid_by, created_by, receipt_path FROM trip_expenses WHERE id = $1 AND trip_id = $2',
    [expenseId, tripId]
  );
  if (!found.rows[0]) throw notFound('Ausgabe nicht gefunden');

  const isCreator = req.participant!.role === 'creator';
  const isOwn = found.rows[0].paid_by === req.participant!.id || found.rows[0].created_by === req.participant!.id;
  if (!isCreator && !isOwn) throw forbidden('Du kannst nur eigene Ausgaben entfernen');

  await query('DELETE FROM trip_expenses WHERE id = $1 AND trip_id = $2', [expenseId, tripId]);
  await deleteReceipt(found.rows[0].receipt_path);
  res.status(204).send();
}

/** GET /api/trips/:tripId/expenses/:expenseId/receipt — liefert das eingescannte Beleg-Bild/PDF. */
export async function getReceipt(req: Request, res: Response) {
  const { tripId, expenseId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();
  if (!isUuid(expenseId)) throw notFound('Beleg nicht gefunden');

  const found = await query<{ receipt_path: string | null }>(
    'SELECT receipt_path FROM trip_expenses WHERE id = $1 AND trip_id = $2',
    [expenseId, tripId]
  );
  const filename = found.rows[0]?.receipt_path;
  if (!filename) throw notFound('Beleg nicht gefunden');

  const filePath = receiptAbsolutePath(filename);
  if (!fs.existsSync(filePath)) throw notFound('Beleg nicht gefunden');

  res.setHeader('Content-Type', mimeFromFilename(filename));
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('Cache-Control', 'private, no-store');
  fs.createReadStream(filePath).pipe(res);
}
