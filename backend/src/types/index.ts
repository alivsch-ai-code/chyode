export type TripType = 'hut' | 'chalet' | 'hotel' | 'wellness' | 'apartment' | 'glamping' | 'other';
export type DateMode = 'fixed' | 'multiple_choice';
export type TripStatus = 'voting' | 'closed' | 'booked';
export type TripMode = 'voting' | 'planning';
export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'other';
export type ParticipantRole = 'creator' | 'participant';
export type NoteCategory = 'wish' | 'idea' | 'requirement';
export type SearchProvider = 'booking' | 'airbnb' | 'rapidapi';

export type UserRole = 'admin' | 'user';
export type UserStatus = 'active' | 'disabled';

/** Vollständige DB-Zeile inkl. Geheimnisse – niemals direkt an den Client schicken. */
export interface User {
  id: string;
  email: string;
  name: string | null;
  password_hash: string | null;
  role: UserRole;
  status: UserStatus;
  token_version: number;
  failed_logins: number;
  locked_until: string | null;
  last_login_at: string | null;
  created_at: string;
}

/** Öffentliche Sicht auf einen Account. */
export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  last_login_at: string | null;
}

export interface UserInvite {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  token_hash: string;
  invited_by: string | null;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
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
  mode: TripMode;
  results_released_at: string | null;
  results_notified_at: string | null;
  voting_closed_at: string | null;
  accommodation_title: string | null;
  accommodation_address: string | null;
  accommodation_url: string | null;
  accommodation_image_url: string | null;
  accommodation_note: string | null;
  accommodation_rating: string | null;
  accommodation_amenities: string[];
  accommodation_picked_by: string | null;
  accommodation_picked_at: string | null;
  accommodation_total_price: string | null;
  accommodation_paid_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroceryItem {
  id: string;
  trip_id: string;
  trip_user_id: string;
  item: string;
  quantity: string | null;
  category: MealCategory | null;
  note: string | null;
  price: string | null;
  checked_at: string | null;
  checked_by: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  created_at: string;
}

export interface TripExpense {
  id: string;
  trip_id: string;
  paid_by: string;
  description: string;
  amount: string;
  receipt_path: string | null;
  created_by: string | null;
  created_at: string;
}

export interface TripSettlement {
  id: string;
  trip_id: string;
  from_trip_user_id: string;
  to_trip_user_id: string;
  amount: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export type ActivityCategory = 'wellness' | 'nature' | 'sport' | 'food';

export interface TripActivity {
  id: string;
  trip_id: string;
  trip_user_id: string;
  title: string;
  category: ActivityCategory | null;
  distance_km: string | null;
  duration_min: number | null;
  price: string | null;
  description: string | null;
  link: string | null;
  created_at: string;
}

export interface TripUser {
  id: string;
  trip_id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  role: ParticipantRole;
  joined_at: string;
}

export interface DateOption {
  id: string;
  trip_id: string;
  label: string;
  start_date: string;
  end_date: string;
  created_by: string | null;
  created_at: string;
}

export interface ParticipantPreferences {
  id: string;
  trip_id: string;
  trip_user_id: string;
  budget_accommodation: string | null;
  budget_activities: string | null;
  experiences: string[];
  accommodation_types: string[];
  created_at: string;
  updated_at: string;
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
      user?: User;
      participant?: {
        id: string;
        tripId: string;
        name: string;
        role: ParticipantRole;
      };
    }
  }
}
