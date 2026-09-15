import { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/pool';
import { Trip, TripUser } from '../types';
import { badRequest, forbidden, notFound } from '../utils/httpError';
import { generateToken } from '../utils/tokens';
import { env } from '../config/env';

const createTripSchema = z.object({
  title: z.string().min(1).max(200),
  location: z.string().min(1).max(200),
  tripType: z.enum(['hut', 'wellness', 'hotel', 'other']).default('other'),
  dateMode: z.enum(['fixed', 'multiple_choice']).default('multiple_choice'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  nights: z.number().int().positive().default(2),
  budgetPerPerson: z.number().positive().optional(),
  creatorName: z.string().min(1).max(120),
  dateOptions: z
    .array(
      z.object({
        label: z.string().min(1),
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .optional(),
});

/** POST /api/trips — erstellt einen neuen Trip (nur eingeloggte Ersteller). */
export async function createTrip(req: Request, res: Response) {
  const parsed = createTripSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);
  const data = parsed.data;

  if (data.dateMode === 'fixed' && (!data.startDate || !data.endDate)) {
    throw badRequest('startDate und endDate sind bei date_mode "fixed" erforderlich');
  }
  if (data.dateMode === 'multiple_choice' && (!data.dateOptions || data.dateOptions.length < 1)) {
    throw badRequest('Mindestens eine Terminoption ist bei date_mode "multiple_choice" erforderlich');
  }

  const creatorId = req.creator!.userId;
  const inviteToken = generateToken(16);

  const tripResult = await query<Trip>(
    `INSERT INTO trips
      (creator_id, title, location, trip_type, date_mode, start_date, end_date, nights, budget_per_person, invite_token)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      creatorId,
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
  const trip = tripResult.rows[0];

  if (data.dateMode === 'multiple_choice' && data.dateOptions) {
    for (const option of data.dateOptions) {
      await query(
        'INSERT INTO date_options (trip_id, label, start_date, end_date) VALUES ($1, $2, $3, $4)',
        [trip.id, option.label, option.startDate, option.endDate]
      );
    }
  }

  // Der Ersteller wird gleichzeitig als Teilnehmer mit Rolle "creator" angelegt,
  // damit er dieselben trip-scoped Endpoints (Voting, Notizen, Ergebnisse) nutzen kann.
  const sessionToken = generateToken(24);
  const creatorParticipant = await query<TripUser>(
    `INSERT INTO trip_users (trip_id, user_id, name, email, role, session_token)
     VALUES ($1, $2, $3, $4, 'creator', $5)
     RETURNING *`,
    [trip.id, creatorId, data.creatorName, req.creator!.email, sessionToken]
  );

  res.status(201).json({
    trip,
    participantToken: creatorParticipant.rows[0].session_token,
    inviteLink: `${env.frontendUrl}/invite/${trip.invite_token}`,
  });
}

/** GET /api/trips — listet alle Trips des eingeloggten Erstellers. */
export async function listMyTrips(req: Request, res: Response) {
  const result = await query<Trip>(
    'SELECT * FROM trips WHERE creator_id = $1 ORDER BY created_at DESC',
    [req.creator!.userId]
  );
  res.json({ trips: result.rows });
}

/** GET /api/trips/:tripId — Trip-Detail für einen authentifizierten Teilnehmer. */
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
    inviteLink: `${env.frontendUrl}/invite/${result.rows[0].invite_token}`,
  });
}

/** GET /api/trips/invite/:inviteToken — öffentliche Trip-Vorschau für die Einladungsseite. */
export async function getTripByInviteToken(req: Request, res: Response) {
  const { inviteToken } = req.params;
  const result = await query<Trip>('SELECT * FROM trips WHERE invite_token = $1', [inviteToken]);
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
    },
    participantCount: parseInt(participantCount.rows[0].count, 10),
  });
}

const joinTripSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().optional(),
});

/** POST /api/trips/invite/:inviteToken/join — Teilnehmer tritt ohne Passwort bei. */
export async function joinTrip(req: Request, res: Response) {
  const { inviteToken } = req.params;
  const parsed = joinTripSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

  const tripResult = await query<Trip>('SELECT * FROM trips WHERE invite_token = $1', [inviteToken]);
  const trip = tripResult.rows[0];
  if (!trip) throw notFound('Einladung nicht gefunden oder abgelaufen');
  if (trip.status !== 'voting') throw forbidden('Das Voting für diesen Trip ist bereits geschlossen');

  const sessionToken = generateToken(24);
  const result = await query<TripUser>(
    `INSERT INTO trip_users (trip_id, name, email, role, session_token)
     VALUES ($1, $2, $3, 'participant', $4)
     RETURNING *`,
    [trip.id, parsed.data.name, parsed.data.email ?? null, sessionToken]
  );

  res.status(201).json({ participant: result.rows[0], trip });
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
