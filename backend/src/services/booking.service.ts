import { env } from '../config/env';
import { AccommodationSuggestion } from '../types';

export interface AccommodationSearchParams {
  location: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  adults: number;
  amenities: string[]; // z.B. ['sauna', 'pool']
  minBedrooms?: number;
  maxPricePerNight?: number;
}

interface RawBookingHotel {
  hotel_id: number;
  hotel_name: string;
  max_photo_url?: string;
  review_score?: number;
  price_breakdown?: { gross_price?: number };
  currency?: string;
  address?: string;
  hotel_facilities?: string;
  url?: string;
}

/**
 * Sucht Unterkünfte über die Booking.com-API auf RapidAPI.
 * https://rapidapi.com/DataCrawler/api/booking-com
 *
 * Ist kein RAPIDAPI_KEY gesetzt, werden deterministische Mock-Daten zurückgegeben,
 * damit die App auch ohne Zugangsdaten lokal lauffähig bleibt.
 */
export async function searchBookingAccommodations(
  params: AccommodationSearchParams
): Promise<AccommodationSuggestion[]> {
  if (!env.rapidApiKey) {
    console.warn('[booking] Kein RAPIDAPI_KEY gesetzt – gebe Mock-Ergebnisse zurück.');
    return mockBookingResults(params);
  }

  const url = new URL(`https://${env.bookingRapidApiHost}/v1/hotels/search-by-coordinates`);
  // In der Praxis würden hier vorher Koordinaten der `location` per Geocoding aufgelöst.
  url.searchParams.set('locale', 'de');
  url.searchParams.set('room_number', '1');
  url.searchParams.set('checkin_date', params.checkIn);
  url.searchParams.set('checkout_date', params.checkOut);
  url.searchParams.set('adults_number', String(params.adults));
  url.searchParams.set('order_by', 'popularity');
  url.searchParams.set('filter_by_currency', 'EUR');
  url.searchParams.set('units', 'metric');

  const response = await fetch(url.toString(), {
    headers: {
      'X-RapidAPI-Key': env.rapidApiKey,
      'X-RapidAPI-Host': env.bookingRapidApiHost,
    },
  });

  if (!response.ok) {
    console.error(`[booking] API Fehler: ${response.status} ${response.statusText}`);
    return mockBookingResults(params);
  }

  const data = (await response.json()) as RawBookingHotel[];

  return data.slice(0, 10).map((hotel) => mapBookingHotel(hotel, params));
}

function mapBookingHotel(
  hotel: RawBookingHotel,
  params: AccommodationSearchParams
): AccommodationSuggestion {
  const pricePerNight = hotel.price_breakdown?.gross_price ?? 0;
  const nights = nightsBetween(params.checkIn, params.checkOut);
  const totalPrice = pricePerNight * nights;

  return {
    id: `booking-${hotel.hotel_id}`,
    provider: 'booking',
    name: hotel.hotel_name,
    imageUrl: hotel.max_photo_url ?? null,
    pricePerNight,
    currency: hotel.currency ?? 'EUR',
    pricePerPerson: params.adults > 0 ? Math.round((totalPrice / params.adults) * 100) / 100 : totalPrice,
    rating: hotel.review_score ?? null,
    distanceKm: null,
    amenities: (hotel.hotel_facilities ?? '').split(',').map((a) => a.trim()).filter(Boolean),
    url: hotel.url ?? '#',
    matchReasons: [],
    score: 0,
  };
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function mockBookingResults(params: AccommodationSearchParams): AccommodationSuggestion[] {
  const nights = nightsBetween(params.checkIn, params.checkOut);
  const base: Array<Omit<AccommodationSuggestion, 'pricePerPerson' | 'score' | 'matchReasons'>> = [
    {
      id: 'booking-mock-1',
      provider: 'booking',
      name: `Berghütte Panorama, ${params.location}`,
      imageUrl: 'https://images.unsplash.com/photo-1518602164578-cd0074062767?w=800',
      pricePerNight: 220,
      currency: 'EUR',
      rating: 9.1,
      distanceKm: null,
      amenities: ['sauna', 'kamin', '3 schlafzimmer', 'wlan'],
      url: 'https://www.booking.com/mock-1',
    },
    {
      id: 'booking-mock-2',
      provider: 'booking',
      name: `Wellness Chalet, ${params.location}`,
      imageUrl: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800',
      pricePerNight: 310,
      currency: 'EUR',
      rating: 9.5,
      distanceKm: null,
      amenities: ['sauna', 'pool', 'whirlpool', '4 schlafzimmer'],
      url: 'https://www.booking.com/mock-2',
    },
    {
      id: 'booking-mock-3',
      provider: 'booking',
      name: `Gemütliche Hütte am See, ${params.location}`,
      imageUrl: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=800',
      pricePerNight: 165,
      currency: 'EUR',
      rating: 8.7,
      distanceKm: null,
      amenities: ['kamin', 'terrasse', '2 schlafzimmer', 'wlan'],
      url: 'https://www.booking.com/mock-3',
    },
  ];

  return base.map((hotel) => ({
    ...hotel,
    pricePerPerson:
      params.adults > 0
        ? Math.round(((hotel.pricePerNight * nights) / params.adults) * 100) / 100
        : hotel.pricePerNight * nights,
    matchReasons: [],
    score: 0,
  }));
}
