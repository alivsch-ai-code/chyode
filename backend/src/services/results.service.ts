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

/** Kennzahlen zu den von den Teilnehmern genannten Höchstbeträgen (pro Person). */
export interface BudgetStats {
  count: number;
  median: number | null;
  average: number | null;
  min: number | null;
  max: number | null;
}

export interface ChoiceCount {
  key: string;
  count: number;
}

export interface TripResults {
  topDateOption: DateOptionResult | null;
  dateOptionRanking: DateOptionResult[];
  topWishes: WishFrequency[];
  budget: {
    accommodation: BudgetStats;
    activities: BudgetStats;
    /** Übernachtung + Aktivitäten, nur von Teilnehmern mit beiden Angaben */
    total: BudgetStats;
  };
  experiences: ChoiceCount[];
  accommodationTypes: ChoiceCount[];
  preferencesSubmitted: number;
  totalParticipants: number;
  votedParticipants: number;
}

export function budgetStats(values: number[]): BudgetStats {
  if (values.length === 0) return { count: 0, median: null, average: null, min: null, max: null };
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    count: sorted.length,
    median: Math.round(median),
    average: Math.round(sum / sorted.length),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

export function countChoices(lists: string[][]): ChoiceCount[] {
  const counts = new Map<string, number>();
  for (const list of lists) for (const key of list) counts.set(key, (counts.get(key) ?? 0) + 1);
  return [...counts.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}

/** Berechnet Termin-Ranking, Budget-Kennzahlen, Erlebnis-/Unterkunftswünsche und Notiz-Schlagworte eines Trips. */
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
    trip_user_id: string;
  }>(
    `SELECT v.date_option_id, v.people_count, v.trip_user_id, tu.name AS voter_name
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

  // Alle Mitglieder zählen (der Ersteller stimmt ebenfalls ab)
  const participantsResult = await query<{ id: string }>('SELECT id FROM trip_users WHERE trip_id = $1', [tripId]);
  const votedParticipantIds = new Set(votesResult.rows.map((v) => v.trip_user_id));

  const prefsResult = await query<{
    budget_accommodation: string | null;
    budget_activities: string | null;
    experiences: string[];
    accommodation_types: string[];
  }>(
    `SELECT budget_accommodation, budget_activities, experiences, accommodation_types
     FROM participant_preferences WHERE trip_id = $1`,
    [tripId]
  );
  const prefs = prefsResult.rows;
  const accommodationBudgets = prefs.filter((p) => p.budget_accommodation !== null).map((p) => parseFloat(p.budget_accommodation!));
  const activityBudgets = prefs.filter((p) => p.budget_activities !== null).map((p) => parseFloat(p.budget_activities!));
  const totalBudgets = prefs
    .filter((p) => p.budget_accommodation !== null && p.budget_activities !== null)
    .map((p) => parseFloat(p.budget_accommodation!) + parseFloat(p.budget_activities!));

  return {
    topDateOption: ranking[0] && ranking[0].totalVotes > 0 ? ranking[0] : null,
    dateOptionRanking: ranking,
    topWishes,
    budget: {
      accommodation: budgetStats(accommodationBudgets),
      activities: budgetStats(activityBudgets),
      total: budgetStats(totalBudgets),
    },
    experiences: countChoices(prefs.map((p) => p.experiences)),
    accommodationTypes: countChoices(prefs.map((p) => p.accommodation_types)),
    preferencesSubmitted: prefs.length,
    totalParticipants: participantsResult.rows.length,
    votedParticipants: votedParticipantIds.size,
  };
}

/** Übersetzt die beliebtesten Erlebniswünsche in Ausstattungs-Schlagworte für die Unterkunftssuche. */
export function experienceKeywords(experiences: ChoiceCount[]): WishFrequency[] {
  const mapping: Record<string, string[]> = {
    wellness: ['sauna', 'whirlpool', 'pool'],
    nature: ['bergblick'],
    water: ['seeblick'],
  };
  const extras: WishFrequency[] = [];
  for (const { key, count } of experiences.slice(0, 3)) {
    for (const keyword of mapping[key] ?? []) extras.push({ keyword, count, category: 'experience' });
  }
  return extras;
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
  /** Höchstbetrag pro Person für die Übernachtung (z. B. Median der Gruppe); überschreibt das Trip-Budget */
  budgetPerPerson?: number | null;
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
  budgetPerPerson,
}: RankAccommodationsInput): AccommodationSuggestion[] {
  const budget = budgetPerPerson ?? (trip.budget_per_person ? parseFloat(trip.budget_per_person) : null);
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
        matchReasons.push(`Preis pro Person (${suggestion.pricePerPerson.toFixed(0)}€) im Gruppenbudget`);
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
