import { env } from '../config/env';
import { AccommodationSuggestion } from '../types';
import { AccommodationSearchParams } from './booking.service';

interface RawAirbnbListing {
  id: number;
  name: string;
  images?: string[];
  price?: { rate?: number; currency?: string };
  rating?: number;
  bedrooms?: number;
  amenities?: string[];
  url?: string;
}

/**
 * Sucht Unterkünfte über eine Airbnb-API auf RapidAPI (z.B. "Airbnb13").
 * https://rapidapi.com/3b-data-3b-data-default/api/airbnb13
 *
 * Ist kein RAPIDAPI_KEY gesetzt, werden deterministische Mock-Daten zurückgegeben.
 */
export async function searchAirbnbAccommodations(
  params: AccommodationSearchParams
): Promise<AccommodationSuggestion[]> {
  if (!env.rapidApiKey) {
    console.warn('[airbnb] Kein RAPIDAPI_KEY gesetzt – gebe Mock-Ergebnisse zurück.');
    return mockAirbnbResults(params);
  }

  const url = new URL(`https://${env.airbnbRapidApiHost}/search-location`);
  url.searchParams.set('location', params.location);
  url.searchParams.set('checkin', params.checkIn);
  url.searchParams.set('checkout', params.checkOut);
  url.searchParams.set('adults', String(params.adults));
  url.searchParams.set('currency', 'EUR');

  const response = await fetch(url.toString(), {
    headers: {
      'X-RapidAPI-Key': env.rapidApiKey,
      'X-RapidAPI-Host': env.airbnbRapidApiHost,
    },
  });

  if (!response.ok) {
    console.error(`[airbnb] API Fehler: ${response.status} ${response.statusText}`);
    return mockAirbnbResults(params);
  }

  const data = (await response.json()) as { results?: RawAirbnbListing[] };
  return (data.results ?? []).slice(0, 10).map((listing) => mapAirbnbListing(listing, params));
}

function mapAirbnbListing(
  listing: RawAirbnbListing,
  params: AccommodationSearchParams
): AccommodationSuggestion {
  const pricePerNight = listing.price?.rate ?? 0;
  const nights = nightsBetween(params.checkIn, params.checkOut);
  const totalPrice = pricePerNight * nights;

  return {
    id: `airbnb-${listing.id}`,
    provider: 'airbnb',
    name: listing.name,
    imageUrl: listing.images?.[0] ?? null,
    pricePerNight,
    currency: listing.price?.currency ?? 'EUR',
    pricePerPerson: params.adults > 0 ? Math.round((totalPrice / params.adults) * 100) / 100 : totalPrice,
    rating: listing.rating ?? null,
    distanceKm: null,
    amenities: listing.amenities?.map((a) => a.toLowerCase()) ?? [],
    url: listing.url ?? '#',
    matchReasons: [],
    score: 0,
  };
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function mockAirbnbResults(params: AccommodationSearchParams): AccommodationSuggestion[] {
  const nights = nightsBetween(params.checkIn, params.checkOut);
  const base: Array<Omit<AccommodationSuggestion, 'pricePerPerson' | 'score' | 'matchReasons'>> = [
    {
      id: 'airbnb-mock-1',
      provider: 'airbnb',
      name: `Ganzes Ferienhaus in ${params.location}`,
      imageUrl: 'https://images.unsplash.com/photo-1501183638710-841dd1904471?w=800',
      pricePerNight: 195,
      currency: 'EUR',
      rating: 4.9,
      distanceKm: null,
      amenities: ['sauna', 'garten', '3 schlafzimmer', 'kamin'],
      url: 'https://www.airbnb.com/mock-1',
    },
    {
      id: 'airbnb-mock-2',
      provider: 'airbnb',
      name: `Design-Loft mit Whirlpool, ${params.location}`,
      imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      pricePerNight: 275,
      currency: 'EUR',
      rating: 4.95,
      distanceKm: null,
      amenities: ['whirlpool', 'sauna', '4 schlafzimmer', 'wlan'],
      url: 'https://www.airbnb.com/mock-2',
    },
    {
      id: 'airbnb-mock-3',
      provider: 'airbnb',
      name: `Rustikale Almhütte, ${params.location}`,
      imageUrl: 'https://images.unsplash.com/photo-1449752606331-6537308549b3?w=800',
      pricePerNight: 140,
      currency: 'EUR',
      rating: 4.7,
      distanceKm: null,
      amenities: ['kamin', '2 schlafzimmer', 'grill'],
      url: 'https://www.airbnb.com/mock-3',
    },
  ];

  return base.map((listing) => ({
    ...listing,
    pricePerPerson:
      params.adults > 0
        ? Math.round(((listing.pricePerNight * nights) / params.adults) * 100) / 100
        : listing.pricePerNight * nights,
    matchReasons: [],
    score: 0,
  }));
}
