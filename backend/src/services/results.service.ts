import { query } from '../db/pool';
import { AccommodationSuggestion, Note, Trip } from '../types';

export interface DateOptionResult {
  dateOptionId: string;
  label: string;
  startDate: string;
  endDate: string;
  totalVotes: number;
  totalPeople: number;
  voterNames: string[];
}

export interface WishFrequency {
  keyword: string;
  count: number;
  category: string;
}

export interface TripResults {
  topDateOption: DateOptionResult | null;
  dateOptionRanking: DateOptionResult[];
  topWishes: WishFrequency[];
  totalParticipants: number;
  votedParticipants: number;
}

/** Berechnet das meistgewählte Datum/Wochenende sowie die häufigsten Wünsche eines Trips. */
export async function computeTripResults(tripId: string): Promise<TripResults> {
  const dateOptionsResult = await query<{
    id: string;
    label: string;
    start_date: string;
    end_date: string;
  }>('SELECT id, label, start_date, end_date FROM date_options WHERE trip_id = $1', [tripId]);

  const votesResult = await query<{
    date_option_id: string;
    people_count: number;
    voter_name: string;
  }>(
    `SELECT v.date_option_id, v.people_count, tu.name AS voter_name
     FROM votes v
     JOIN trip_users tu ON tu.id = v.trip_user_id
     WHERE v.trip_id = $1`,
    [tripId]
  );

  const ranking: DateOptionResult[] = dateOptionsResult.rows.map((option) => {
    const votesForOption = votesResult.rows.filter((v) => v.date_option_id === option.id);
    return {
      dateOptionId: option.id,
      label: option.label,
      startDate: option.start_date,
      endDate: option.end_date,
      totalVotes: votesForOption.length,
      totalPeople: votesForOption.reduce((sum, v) => sum + v.people_count, 0),
      voterNames: votesForOption.map((v) => v.voter_name),
    };
  });

  ranking.sort((a, b) => b.totalVotes - a.totalVotes || b.totalPeople - a.totalPeople);

  const notesResult = await query<Note>('SELECT * FROM notes WHERE trip_id = $1', [tripId]);
  const topWishes = computeWishFrequency(notesResult.rows);

  const participantsResult = await query<{ id: string }>(
    "SELECT id FROM trip_users WHERE trip_id = $1 AND role = 'participant'",
    [tripId]
  );
  const votedParticipantIds = new Set(
    votesResult.rows.length > 0
      ? (
          await query<{ trip_user_id: string }>(
            'SELECT DISTINCT trip_user_id FROM votes WHERE trip_id = $1',
            [tripId]
          )
        ).rows.map((r) => r.trip_user_id)
      : []
  );

  return {
    topDateOption: ranking[0] ?? null,
    dateOptionRanking: ranking,
    topWishes,
    totalParticipants: participantsResult.rows.length,
    votedParticipants: votedParticipantIds.size,
  };
}

/** Sehr einfache Keyword-Häufigkeitsanalyse der Notizen (ohne externe NLP-Abhängigkeit). */
function computeWishFrequency(notes: Note[]): WishFrequency[] {
  const KNOWN_KEYWORDS = [
    'sauna',
    'pool',
    'whirlpool',
    'kamin',
    'haustier',
    'hund',
    'grill',
    'wlan',
    'parkplatz',
    'barrierefrei',
    'garten',
    'terrasse',
    'seeblick',
    'bergblick',
  ];

  const counts = new Map<string, { count: number; category: string }>();

  for (const note of notes) {
    const text = note.content.toLowerCase();
    for (const keyword of KNOWN_KEYWORDS) {
      if (text.includes(keyword)) {
        const existing = counts.get(keyword);
        counts.set(keyword, { count: (existing?.count ?? 0) + 1, category: note.category });
      }
    }
  }

  return [...counts.entries()]
    .map(([keyword, { count, category }]) => ({ keyword, count, category }))
    .sort((a, b) => b.count - a.count);
}

export interface RankAccommodationsInput {
  trip: Trip;
  suggestions: AccommodationSuggestion[];
  wishes: WishFrequency[];
  totalPeople: number;
}

/**
 * Bewertet und sortiert Unterkunftsvorschläge nach Budget, Bewertung, Entfernung
 * und Übereinstimmung mit den geäußerten Gruppen-Wünschen.
 */
export function rankAccommodations({
  trip,
  suggestions,
  wishes,
  totalPeople,
}: RankAccommodationsInput): AccommodationSuggestion[] {
  const budget = trip.budget_per_person ? parseFloat(trip.budget_per_person) : null;
  const wishKeywords = new Set(wishes.map((w) => w.keyword));

  const scored = suggestions.map((suggestion) => {
    let score = 0;
    const matchReasons: string[] = [];

    // Bewertung (0-10 Skala normalisiert)
    if (suggestion.rating) {
      score += (suggestion.rating / 10) * 25;
    }

    // Budget-Fit
    if (budget) {
      if (suggestion.pricePerPerson <= budget) {
        score += 25;
        matchReasons.push(`Preis pro Person (${suggestion.pricePerPerson.toFixed(0)}€) im Budget`);
      } else {
        const overshoot = (suggestion.pricePerPerson - budget) / budget;
        score -= Math.min(20, overshoot * 40);
      }
    }

    // Wunsch-Übereinstimmung
    const matchedAmenities = suggestion.amenities.filter((a) =>
      [...wishKeywords].some((w) => a.includes(w))
    );
    score += matchedAmenities.length * 10;
    if (matchedAmenities.length > 0) {
      matchReasons.push(`Erfüllt Gruppenwünsche: ${matchedAmenities.join(', ')}`);
    }

    // Bettenkapazität grob über Schlafzimmer-Angabe in amenities/Name
    const bedroomMatch = suggestion.amenities.find((a) => /\d+\s*schlafzimmer/.test(a));
    if (bedroomMatch) {
      matchReasons.push(`${bedroomMatch} für ${totalPeople} Personen`);
    }

    // Entfernung (näher ist besser)
    if (suggestion.distanceKm !== null) {
      score += Math.max(0, 10 - suggestion.distanceKm / 20);
      matchReasons.push(`${suggestion.distanceKm} km Entfernung`);
    }

    return { ...suggestion, score: Math.round(score * 10) / 10, matchReasons };
  });

  return scored.sort((a, b) => b.score - a.score);
}
