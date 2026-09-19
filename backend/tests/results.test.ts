import { test } from 'node:test';
import assert from 'node:assert/strict';

// env.ts verlangt diese Variablen beim Import; verbunden wird in diesen reinen Rechen-Tests nie.
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET ??= 'test-secret';

import { budgetStats, countChoices, experienceKeywords, rankAccommodations } from '../src/services/results.service';
import type { AccommodationSuggestion, Trip } from '../src/types';

test('budgetStats: leere Eingabe liefert Nullwerte', () => {
  assert.deepEqual(budgetStats([]), { count: 0, median: null, average: null, min: null, max: null });
});

test('budgetStats: ungerade Anzahl', () => {
  assert.deepEqual(budgetStats([300, 100, 200]), { count: 3, median: 200, average: 200, min: 100, max: 300 });
});

test('budgetStats: gerade Anzahl mittelt die beiden mittleren Werte', () => {
  const stats = budgetStats([100, 200, 300, 400]);
  assert.equal(stats.median, 250);
  assert.equal(stats.average, 250);
  assert.equal(stats.min, 100);
  assert.equal(stats.max, 400);
});

test('budgetStats: ein Ausreißer verschiebt den Median kaum, den Durchschnitt deutlich', () => {
  const stats = budgetStats([100, 120, 140, 1000]);
  assert.equal(stats.median, 130);
  assert.equal(stats.average, 340);
});

test('countChoices: zählt und sortiert absteigend', () => {
  const counts = countChoices([['nature', 'wellness'], ['nature'], ['calm', 'nature', 'wellness']]);
  assert.deepEqual(counts, [
    { key: 'nature', count: 3 },
    { key: 'wellness', count: 2 },
    { key: 'calm', count: 1 },
  ]);
  assert.deepEqual(countChoices([]), []);
});

test('experienceKeywords: Wellness wird zu Sauna/Whirlpool/Pool, nur für die Top 3', () => {
  const keywords = experienceKeywords([
    { key: 'winter', count: 5 },
    { key: 'wellness', count: 4 },
    { key: 'nature', count: 3 },
    { key: 'water', count: 2 }, // Platz 4 -> ignoriert
  ]).map((k) => k.keyword);
  assert.deepEqual(keywords.sort(), ['bergblick', 'pool', 'sauna', 'whirlpool']);
});

const baseTrip = { budget_per_person: null } as unknown as Trip;
const suggestion = (id: string, pricePerPerson: number, amenities: string[]): AccommodationSuggestion => ({
  id,
  provider: 'booking',
  name: id,
  imageUrl: null,
  pricePerNight: 100,
  currency: 'EUR',
  pricePerPerson,
  rating: 8,
  distanceKm: null,
  amenities,
  url: 'https://example.com',
  matchReasons: [],
  score: 0,
});

test('rankAccommodations: Gruppenbudget bevorzugt Angebote im Budget', () => {
  const ranked = rankAccommodations({
    trip: baseTrip,
    suggestions: [suggestion('teuer', 300, []), suggestion('guenstig', 100, [])],
    wishes: [],
    totalPeople: 4,
    budgetPerPerson: 150,
  });
  assert.equal(ranked[0].id, 'guenstig');
  assert.ok(ranked[0].matchReasons.some((r) => r.includes('Gruppenbudget')));
});

test('rankAccommodations: Wünsche wie Sauna erhöhen die Bewertung', () => {
  const ranked = rankAccommodations({
    trip: baseTrip,
    suggestions: [suggestion('ohne', 100, ['wlan']), suggestion('mit-sauna', 100, ['sauna'])],
    wishes: [{ keyword: 'sauna', count: 2, category: 'wish' }],
    totalPeople: 4,
  });
  assert.equal(ranked[0].id, 'mit-sauna');
});
