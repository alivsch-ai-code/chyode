/**
 * Von Backend und Frontend gemeinsam genutzte Typen für den Gruppen-Reiseplaner.
 * (Das Frontend importiert diese Datei über den TS-Pfad-Alias "@shared/*".)
 */

export type TripType = 'hut' | 'chalet' | 'hotel' | 'wellness' | 'apartment' | 'glamping' | 'other';
export type AccommodationTypeKey = Exclude<TripType, 'other'>;
export type ExperienceKey =
  | 'nature'
  | 'wellness'
  | 'winter'
  | 'culinary'
  | 'adventure'
  | 'culture'
  | 'water'
  | 'social'
  | 'calm';
export type DateMode = 'fixed' | 'multiple_choice';
export type TripStatus = 'voting' | 'closed' | 'booked';
export type TripMode = 'voting' | 'planning';
export type ParticipantRole = 'creator' | 'participant';
export type NoteCategory = 'wish' | 'idea' | 'requirement';
export type SearchProvider = 'booking' | 'airbnb' | 'rapidapi';
export type ActivityCategory = 'wellness' | 'nature' | 'sport' | 'food';
export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'other';

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
  added_by_name?: string;
  checked_by_name?: string | null;
  claimed_by_name?: string | null;
}

export interface GrocerySummary {
  total: number;
  participantCount: number;
  perPersonEven: number;
  byPerson: { tripUserId: string; name: string; spent: number }[];
}

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
  added_by_name?: string;
}

export interface TripUser {
  id: string;
  trip_id: string;
  name: string;
  email: string | null;
  role: ParticipantRole;
  joined_at: string;
}

export interface TripStaySuggestion {
  id: string;
  trip_id: string;
  trip_user_id: string;
  title: string;
  address: string | null;
  url: string | null;
  image_url: string | null;
  note: string | null;
  price: string | null;
  created_at: string;
  added_by_name?: string;
}

export interface TripExpense {
  id: string;
  trip_id: string;
  paid_by: string;
  description: string;
  amount: string;
  created_by: string | null;
  created_at: string;
  paid_by_name?: string;
  hasReceipt: boolean;
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
  from_name?: string;
  to_name?: string;
}

export interface LedgerBalance {
  tripUserId: string;
  name: string;
  /** positiv = hat Geld vorgestreckt; negativ = schuldet noch */
  balance: number;
}

export interface SettlementSuggestion {
  fromTripUserId: string;
  fromName: string;
  toTripUserId: string;
  toName: string;
  amount: number;
}

export interface LedgerSummary {
  balances: LedgerBalance[];
  suggestions: SettlementSuggestion[];
  totalExpenses: number;
  settled: boolean;
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
  /** true, sobald der Ersteller die Auswertung für Teilnehmer freigegeben hat */
  resultsReleased: boolean;
  /** true, sobald die Ergebnis-Mail an alle Teilnehmer versendet wurde */
  resultsNotified: boolean;
  /** Abstimmungsfortschritt – nur für den Ersteller */
  progress?: { voted: number; total: number };
  inviteLink: string;
}

export interface DateOption {
  id: string;
  trip_id: string;
  label: string;
  start_date: string;
  end_date: string;
  created_by?: string | null;
  /** Name des Vorschlagenden (nur in der Terminliste) */
  proposed_by_name?: string | null;
  proposed_by_creator?: boolean | null;
}

/** Eigene Präferenzen eines Teilnehmers (Höchstbeträge pro Person in Euro). */
export interface MyPreferences {
  budgetAccommodation: number | null;
  budgetActivities: number | null;
  experiences: ExperienceKey[];
  accommodationTypes: AccommodationTypeKey[];
  updatedAt: string;
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

export interface BudgetStats {
  count: number;
  median: number | null;
  average: number | null;
  min: number | null;
  max: number | null;
}

export interface ChoiceCount<K extends string = string> {
  key: K;
  count: number;
}

export interface TripResults {
  topDateOption: DateOptionResult | null;
  dateOptionRanking: DateOptionResult[];
  topWishes: WishFrequency[];
  budget: { accommodation: BudgetStats; activities: BudgetStats; total: BudgetStats };
  experiences: ChoiceCount<ExperienceKey>[];
  accommodationTypes: ChoiceCount<AccommodationTypeKey>[];
  preferencesSubmitted: number;
  totalParticipants: number;
  votedParticipants: number;
}
