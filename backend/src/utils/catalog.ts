/**
 * Schlüssel für Unterkunftsarten und Erlebniswelten. Die Anzeigenamen liegen im Frontend
 * (frontend/src/lib/catalog.ts) – beide Listen müssen synchron bleiben.
 */
export const ACCOMMODATION_TYPE_KEYS = ['hut', 'chalet', 'hotel', 'wellness', 'apartment', 'glamping'] as const;
export const EXPERIENCE_KEYS = [
  'nature',
  'wellness',
  'winter',
  'culinary',
  'adventure',
  'culture',
  'water',
  'social',
  'calm',
] as const;

export type AccommodationTypeKey = (typeof ACCOMMODATION_TYPE_KEYS)[number];
export type ExperienceKey = (typeof EXPERIENCE_KEYS)[number];

/** Wie viele Auswahlen ein Teilnehmer treffen darf (erzwingt Priorisierung). */
export const MAX_EXPERIENCES = 4;
export const MAX_ACCOMMODATION_TYPES = 3;
