const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

const CREATOR_TOKEN_KEY = 'tripplanner_creator_token';
const participantTokenKey = (tripId: string) => `tripplanner_participant_token_${tripId}`;

export function getCreatorToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CREATOR_TOKEN_KEY);
}

export function setCreatorToken(token: string) {
  localStorage.setItem(CREATOR_TOKEN_KEY, token);
}

export function getParticipantToken(tripId: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(participantTokenKey(tripId));
}

export function setParticipantToken(tripId: string, token: string) {
  localStorage.setItem(participantTokenKey(tripId), token);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  tripId?: string; // fügt automatisch den Participant-Token-Header hinzu
  asCreator?: boolean; // fügt automatisch den Creator-JWT-Header hinzu
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (options.asCreator) {
    const token = getCreatorToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (options.tripId) {
    const token = getParticipantToken(options.tripId);
    if (token) headers['X-Participant-Token'] = token;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(response.status, data.error ?? 'Unbekannter Fehler');
  }

  return data as T;
}
