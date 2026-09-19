/**
 * Von Backend und Frontend gemeinsam genutzte Typen für den Gruppen-Reiseplaner.
 * (Das Frontend importiert diese Datei über den TS-Pfad-Alias "@shared/*".)
 */

export type TripType = 'hut' | 'wellness' | 'hotel' | 'other';
export type DateMode = 'fixed' | 'multiple_choice';
export type TripStatus = 'voting' | 'closed' | 'booked';
export type ParticipantRole = 'creator' | 'participant';
export type NoteCategory = 'wish' | 'idea' | 'requirement';
export type SearchProvider = 'booking' | 'airbnb' | 'rapidapi';

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
  name: string;
  email: string | null;
  role: ParticipantRole;
  joined_at: string;
}

export type UserRole = 'admin' | 'user';
export type UserStatus = 'active' | 'disabled';

/** Öffentliche Sicht auf einen Account (wie sie das Backend ausliefert). */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  last_login_at: string | null;
}

export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface InviteSummary {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  status: InviteStatus;
  expires_at: string;
  created_at: string;
  invited_by_name: string | null;
}

/** Eintrag in "Meine Trips". */
export interface MyTrip extends Trip {
  my_role: ParticipantRole;
  participant_count: number;
  date_option_count: number;
}

export interface TripParticipant {
  id: string;
  name: string;
  role: ParticipantRole;
  joined_at: string;
}

export interface TripDetailResponse {
  trip: Trip;
  participants: TripParticipant[];
  myRole: ParticipantRole;
  myParticipantId: string;
  inviteLink: string;
}

export interface DateOption {
  id: string;
  trip_id: string;
  label: string;
  start_date: string;
  end_date: string;
}

export interface Vote {
  id: string;
  trip_id: string;
  trip_user_id: string;
  date_option_id: string;
  people_count: number;
}

export interface Note {
  id: string;
  trip_id: string;
  trip_user_id: string;
  category: NoteCategory;
  content: string;
  created_at: string;
  author_name?: string;
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
