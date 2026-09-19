import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { query } from '../db/pool';
import { Trip } from '../types';
import { env } from '../config/env';
import { assertResultsAccess } from '../services/access.service';
import { badRequest, forbidden, notFound } from '../utils/httpError';
import { computeTripResults, experienceKeywords, rankAccommodations } from '../services/results.service';
import { searchBookingAccommodations, AccommodationSearchParams } from '../services/booking.service';
import { searchAirbnbAccommodations } from '../services/airbnb.service';
import { getDistancesKm } from '../services/googleMaps.service';

const CACHE_TTL_HOURS = 6;

const searchSchema = z.object({
  origin: z.string().optional(), // z.B. Wohnort der Gruppe, für Entfernungsberechnung
  maxPricePerNight: z.number().positive().optional(),
});

/**
 * POST /api/trips/:tripId/accommodations/search
 * Löst die automatische Unterkunftssuche aus (Booking.com + Airbnb via RapidAPI),
 * kombiniert und bewertet die Ergebnisse und cached sie in search_results_cache.
 * Nur der Ersteller darf die Suche manuell auslösen; automatisch würde man dies
 * z.B. per Cron/Job triggern, sobald alle Teilnehmer abgestimmt haben.
 */
export async function searchAccommodations(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();
  if (req.participant!.role !== 'creator') throw forbidden('Nur der Ersteller darf die Suche starten');

  const parsed = searchSchema.safeParse(req.body ?? {});
  if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

  const tripResult = await query<Trip>('SELECT * FROM trips WHERE id = $1', [tripId]);
  const trip = tripResult.rows[0];
  if (!trip) throw notFound('Trip nicht gefunden');

  const results = await computeTripResults(tripId);
  // Wünsche aus Notizen plus Ausstattung, die sich aus den beliebtesten Erlebniswünschen ergibt
  const wishes = [...results.topWishes, ...experienceKeywords(results.experiences)];

  const { checkIn, checkOut, totalPeople } = resolveSearchDates(trip, results.topDateOption, trip.nights);

  const searchParams: AccommodationSearchParams = {
    location: trip.location,
    checkIn,
    checkOut,
    adults: totalPeople,
    amenities: [...new Set(wishes.map((w) => w.keyword))],
    maxPricePerNight: parsed.data.maxPricePerNight,
  };

  const queryHash = hashSearchParams(searchParams);

  const [bookingResults, airbnbResults] = await Promise.all([
    searchBookingAccommodations(searchParams),
    searchAirbnbAccommodations(searchParams),
  ]);

  let combined = [...bookingResults, ...airbnbResults];

  if (parsed.data.origin) {
    const distances = await getDistancesKm(
      parsed.data.origin,
      combined.map((c) => `${c.name}, ${trip.location}`)
    );
    combined = combined.map((item, index) => ({
      ...item,
      distanceKm: distances[index]?.distanceKm ?? null,
    }));
  }

  const ranked = rankAccommodations({
    trip,
    suggestions: combined,
    wishes,
    totalPeople,
    budgetPerPerson: results.budget.accommodation.median,
  });

  const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000);

  await query(
    `INSERT INTO search_results_cache (trip_id, provider, query_hash, results, expires_at)
     VALUES ($1, 'rapidapi', $2, $3, $4)
     ON CONFLICT (trip_id, provider, query_hash)
     DO UPDATE SET results = EXCLUDED.results, expires_at = EXCLUDED.expires_at, created_at = now()`,
    [tripId, queryHash, JSON.stringify(ranked), expiresAt]
  );

  res.json({
    searchParams,
    topSuggestions: ranked.slice(0, 3),
    allSuggestions: ranked,
    demo: !env.rapidApiKey,
  });
}

/** GET /api/trips/:tripId/accommodations — liefert die zuletzt gecachten Top-3-Vorschläge. */
export async function getCachedAccommodations(req: Request, res: Response) {
  const { tripId } = req.params;
  if (req.participant!.tripId !== tripId) throw forbidden();
  await assertResultsAccess(req.participant!);

  const result = await query<{ results: unknown; created_at: string; expires_at: string }>(
    `SELECT results, created_at, expires_at FROM search_results_cache
     WHERE trip_id = $1 AND provider = 'rapidapi'
     ORDER BY created_at DESC LIMIT 1`,
    [tripId]
  );

  if (!result.rows[0]) {
    return res.json({ topSuggestions: [], allSuggestions: [], cached: false, demo: !env.rapidApiKey });
  }

  const suggestions = result.rows[0].results as unknown[];
  res.json({
    topSuggestions: suggestions.slice(0, 3),
    allSuggestions: suggestions,
    cached: true,
    demo: !env.rapidApiKey,
    searchedAt: result.rows[0].created_at,
    expiresAt: result.rows[0].expires_at,
  });
}

function resolveSearchDates(
  trip: Trip,
  topDateOption: { startDate: string; endDate: string; totalPeople: number } | null,
  fallbackNights: number
): { checkIn: string; checkOut: string; totalPeople: number } {
  if (trip.date_mode === 'fixed' && trip.start_date && trip.end_date) {
    return { checkIn: trip.start_date, checkOut: trip.end_date, totalPeople: topDateOption?.totalPeople ?? 1 };
  }
  if (topDateOption) {
    return {
      checkIn: topDateOption.startDate,
      checkOut: topDateOption.endDate,
      totalPeople: topDateOption.totalPeople,
    };
  }
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 30);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + fallbackNights);
  return {
    checkIn: checkIn.toISOString().slice(0, 10),
    checkOut: checkOut.toISOString().slice(0, 10),
    totalPeople: 1,
  };
}

function hashSearchParams(params: AccommodationSearchParams): string {
  return crypto.createHash('sha256').update(JSON.stringify(params)).digest('hex').slice(0, 32);
}
