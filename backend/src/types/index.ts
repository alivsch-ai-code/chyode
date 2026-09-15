export type TripType = 'hut' | 'wellness' | 'hotel' | 'other';
export type DateMode = 'fixed' | 'multiple_choice';
export type TripStatus = 'voting' | 'closed' | 'booked';
export type ParticipantRole = 'creator' | 'participant';
export type NoteCategory = 'wish' | 'idea' | 'requirement';
export type SearchProvider = 'booking' | 'airbnb' | 'rapidapi';

export interface User {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export interface Trip {
  id: string;
  creator_id: string;
  title: string;
  location: string;
  trip_type: TripType;
  date_mode: DateMode;
  start_date: string | null;
  end_date: string | null;
  nights: number;
  budget_per_person: string | null;
  invite_token: string;
  status: TripStatus;
  created_at: string;
  updated_at: string;
}

export interface TripUser {
  id: string;
  trip_id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  role: ParticipantRole;
  session_token: string;
  joined_at: string;
}

export interface DateOption {
  id: string;
  trip_id: string;
  label: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface Vote {
  id: string;
  trip_id: string;
  trip_user_id: string;
  date_option_id: string;
  people_count: number;
  created_at: string;
}

export interface Note {
  id: string;
  trip_id: string;
  trip_user_id: string;
  category: NoteCategory;
  content: string;
  created_at: string;
}

export interface AccommodationSuggestion {
  id: string;
  provider: SearchProvider;
  name: string;
  imageUrl: string | null;
  pricePerNight: number;
  currency: string;
  pricePerPerson: number;
  rating: number | null;
  distanceKm: number | null;
  amenities: string[];
  url: string;
  matchReasons: string[];
  score: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      creator?: { userId: string; email: string };
      participant?: {
        id: string;
        tripId: string;
        name: string;
        role: ParticipantRole;
      };
    }
  }
}
