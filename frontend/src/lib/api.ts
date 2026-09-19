const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Wird ausgelöst, wenn die Sitzung abgelaufen ist (401 auf einer geschützten Route). */
export const UNAUTHORIZED_EVENT = 'tp:unauthorized';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

// Anmelde-Endpunkte liefern bei falschen Daten ebenfalls 401 – das ist dort kein Sitzungsablauf.
const AUTH_FORM_PATHS = ['/auth/login', '/auth/accept-invite', '/auth/reset-password', '/auth/change-password'];

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, 'Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.');
  }

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined' && !AUTH_FORM_PATHS.includes(path)) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(response.status, data.error ?? 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
  }

  return data as T;
}

/** Fetcher für SWR: der Schlüssel ist der API-Pfad. */
export const fetcher = <T,>(path: string) => apiFetch<T>(path);

export function errorMessage(err: unknown, fallback = 'Etwas ist schiefgelaufen. Bitte versuche es erneut.'): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
