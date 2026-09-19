import { Request, Response } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool';
import { Trip, TripUser } from '../types';
import { badRequest, forbidden, notFound } from '../utils/httpError';
import { generateToken } from '../utils/tokens';
import { env } from '../config/env';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum muss das Format JJJJ-MM-TT haben');

export const dateOptionInputSchema = z
  .object({
    label: z.string().trim().min(1).max(200),
    startDate: isoDate,
    endDate: isoDate,
  })
  .refine((o) => o.endDate >= o.startDate, 'Das Enddatum darf nicht vor dem Startdatum liegen');

const createTripSchema = z.object({
  title: z.string().trim().min(1, 'Bitte gib einen Titel ein').max(200),
  location: z.string().trim().min(1, 'Bitte gib eine Region oder einen Ort ein').max(200),
  tripType: z.enum(['hut', 'wellness', 'hotel', 'other']).default('other'),
  dateMode: z.enum(['fixed', 'multiple_choice']).default('multiple_choice'),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  nights: z.number().int().positive().max(60).default(2),
  budgetPerPerson: z.number().positive().max(100000).optional(),
  dateOptions: z.array(dateOptionInputSchema).max(60).optional(),
});

function displayName(user: { name: string | null; email: string }): string {
  return user.name?.trim() || user.email.split('@')[0];
}

/** POST /api/trips — erstellt einen neuen Trip; der angemeldete Account wird Ersteller. */
export async function createTrip(req: Request, res: Response) {
  const parsed = createTripSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);
  const data = parsed.data;

  if (data.dateMode === 'fixed') {
    if (!data.startDate || !data.endDate) {
      throw badRequest('Start- und Enddatum sind bei einem festen Zeitraum erforderlich');
    }
    if (data.endDate < data.startDate) throw badRequest('Das Enddatum darf nicht vor dem Startdatum liegen');
  }
  if (data.dateMode === 'multiple_choice' && (!data.dateOptions || data.dateOptions.length < 1)) {
    throw badRequest('Bitte wähle mindestens ein Wochenende bzw. einen Termin aus');
  }

  const user = req.user!;
  const inviteToken = generateToken(16);

  const trip = await withTransaction(async (client) => {
    const tripResult = await client.query<Trip>(
      `INSERT INTO trips
        (creator_id, title, location, trip_type, date_mode, start_date, end_date, nights, budget_per_person, invite_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        user.id,
        data.title,
        data.location,
        data.tripType,
        data.dateMode,
        data.startDate ?? null,
        data.endDate ?? null,
        data.nights,
        data.budgetPerPerson ?? null,
        inviteToken,
      ]
    );
    const created = tripResult.rows[0];

    if (data.dateMode === 'multiple_choice' && data.dateOptions) {
      for (const option of data.dateOptions) {
        await client.query(
          'INSERT INTO date_options (trip_id, label, start_date, end_date) VALUES ($1, $2, $3, $4)',
          [created.id, option.label, option.startDate, option.endDate]
        );
      }
    }

    // Der Ersteller ist zugleich Teilnehmer mit Rolle "creator" und darf damit Termine, Voting und Suche steuern.
    await client.query(
      `INSERT INTO trip_users (trip_id, user_id, name, email, role)
       VALUES ($1, $2, $3, $4, 'creator')`,
      [created.id, user.id, displayName(user), user.email]
    );
    return created;
  });

  res.status(201).json({ trip, inviteLink: `${env.frontendUrl}/invite/${trip.invite_token}` });
}

/** GET /api/trips — alle Trips, in denen der Account Mitglied ist. */
export async function listMyTrips(req: Request, res: Response) {
  const result = await query(
    `SELECT t.*, tu.role AS my_role,
            (SELECT COUNT(*)::int FROM trip_users x WHERE x.trip_id = t.id) AS participant_count,
            (SELECT COUNT(*)::int FROM date_options d WHERE d.trip_id = t.id) AS date_option_count
     FROM trips t
     JOIN trip_users tu ON tu.trip_id = t.id AND tu.user_id = $1
     ORDER BY t.created_at DESC`,
    [req.user!.id]
  );
  res.json({ trips: result.rows });
}

/** GET /api/trips/:tripId — Trip-Detail für ein Mitglied. */
export async function getTrip(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();

  const result = await query<Trip>('SELECT * FROM trips WHERE id = $1', [tripId]);
  if (!result.rows[0]) throw notFound('Trip nicht gefunden');

  const participants = await query<Pick<TripUser, 'id' | 'name' | 'role' | 'joined_at'>>(
    'SELECT id, name, role, joined_at FROM trip_users WHERE trip_id = $1 ORDER BY joined_at ASC',
    [tripId]
  );

  res.json({
    trip: result.rows[0],
    participants: participants.rows,
    myRole: req.participant!.role,
    myParticipantId: req.participant!.id,
    inviteLink: `${env.frontendUrl}/invite/${result.rows[0].invite_token}`,
  });
}

/** GET /api/trips/invite/:inviteToken — öffentliche Trip-Vorschau für die Einladungsseite. */
export async function getTripByInviteToken(req: Request, res: Response) {
  const { inviteToken } = req.params;
  const result = await query<Trip & { creator_name: string | null }>(
    `SELECT t.*, (SELECT tu.name FROM trip_users tu WHERE tu.trip_id = t.id AND tu.role = 'creator' LIMIT 1) AS creator_name
     FROM trips t WHERE t.invite_token = $1`,
    [inviteToken]
  );
  if (!result.rows[0]) throw notFound('Einladung nicht gefunden oder abgelaufen');

  const trip = result.rows[0];
  const participantCount = await query<{ count: string }>(
    'SELECT COUNT(*) FROM trip_users WHERE trip_id = $1',
    [trip.id]
  );

  res.json({
    trip: {
      id: trip.id,
      title: trip.title,
      location: trip.location,
      trip_type: trip.trip_type,
      date_mode: trip.date_mode,
      start_date: trip.start_date,
      end_date: trip.end_date,
      nights: trip.nights,
      status: trip.status,
      creator_name: trip.creator_name,
    },
    participantCount: parseInt(participantCount.rows[0].count, 10),
  });
}

/** POST /api/trips/invite/:inviteToken/join — angemeldeter Account tritt dem Trip bei. */
export async function joinTrip(req: Request, res: Response) {
  const { inviteToken } = req.params;
  const user = req.user!;

  const tripResult = await query<Trip>('SELECT * FROM trips WHERE invite_token = $1', [inviteToken]);
  const trip = tripResult.rows[0];
  if (!trip) throw notFound('Einladung nicht gefunden oder abgelaufen');

  const existing = await query('SELECT 1 FROM trip_users WHERE trip_id = $1 AND user_id = $2', [trip.id, user.id]);
  if (existing.rows.length > 0) {
    return res.json({ tripId: trip.id, alreadyMember: true });
  }

  if (trip.status !== 'voting') throw forbidden('Das Voting für diesen Trip ist bereits geschlossen');

  await query(
    `INSERT INTO trip_users (trip_id, user_id, name, email, role)
     VALUES ($1, $2, $3, $4, 'participant')
     ON CONFLICT (trip_id, user_id) WHERE user_id IS NOT NULL DO NOTHING`,
    [trip.id, user.id, displayName(user), user.email]
  );

  res.status(201).json({ tripId: trip.id, alreadyMember: false });
}

/** POST /api/trips/:tripId/close-voting — nur der Ersteller darf das Voting schließen. */
export async function closeVoting(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();

  const result = await query<Trip>(
    "UPDATE trips SET status = 'closed' WHERE id = $1 RETURNING *",
    [tripId]
  );
  if (!result.rows[0]) throw notFound('Trip nicht gefunden');
  res.json({ trip: result.rows[0] });
}

/** POST /api/trips/:tripId/reopen-voting — nur der Ersteller darf das Voting wieder öffnen. */
export async function reopenVoting(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();

  const result = await query<Trip>(
    "UPDATE trips SET status = 'voting' WHERE id = $1 AND status = 'closed' RETURNING *",
    [tripId]
  );
  if (!result.rows[0]) throw badRequest('Das Voting ist nicht geschlossen');
  res.json({ trip: result.rows[0] });
}
