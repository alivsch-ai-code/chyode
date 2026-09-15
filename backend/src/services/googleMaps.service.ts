import { env } from '../config/env';

interface DistanceResult {
  destination: string;
  distanceKm: number | null;
  durationMinutes: number | null;
}

/**
 * Fragt die Google Maps Distance Matrix API ab, um die Entfernung zwischen dem
 * Startort der Gruppe (z.B. Wohnort des Erstellers) und einer Unterkunft zu berechnen.
 * Docs: https://developers.google.com/maps/documentation/distance-matrix
 */
export async function getDistanceKm(
  origin: string,
  destination: string
): Promise<DistanceResult> {
  if (!env.googleMapsApiKey) {
    console.warn('[googleMaps] Kein GOOGLE_MAPS_API_KEY gesetzt – überspringe Distanzberechnung.');
    return { destination, distanceKm: null, durationMinutes: null };
  }

  const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
  url.searchParams.set('origins', origin);
  url.searchParams.set('destinations', destination);
  url.searchParams.set('units', 'metric');
  url.searchParams.set('key', env.googleMapsApiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Google Maps API Fehler: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    rows?: { elements?: { status: string; distance?: { value: number }; duration?: { value: number } }[] }[];
  };

  const element = data.rows?.[0]?.elements?.[0];
  if (!element || element.status !== 'OK') {
    return { destination, distanceKm: null, durationMinutes: null };
  }

  return {
    destination,
    distanceKm: element.distance ? Math.round(element.distance.value / 100) / 10 : null,
    durationMinutes: element.duration ? Math.round(element.duration.value / 60) : null,
  };
}

/** Batch-Variante für mehrere Unterkünfte gleichzeitig. */
export async function getDistancesKm(
  origin: string,
  destinations: string[]
): Promise<DistanceResult[]> {
  return Promise.all(destinations.map((destination) => getDistanceKm(origin, destination)));
}
