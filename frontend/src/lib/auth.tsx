'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import useSWR, { useSWRConfig } from 'swr';
import type { AuthUser } from '@shared/types';
import { UNAUTHORIZED_EVENT, apiFetch, fetcher } from '@/lib/api';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, mutate } = useSWR<{ user: AuthUser }>('/auth/me', fetcher, {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
  });
  const { mutate: mutateAll } = useSWRConfig();

  useEffect(() => {
    const onUnauthorized = () => {
      void mutate(undefined, { revalidate: false });
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [mutate]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await apiFetch<{ user: AuthUser }>('/auth/login', { method: 'POST', body: { email, password } });
      await mutate(result, { revalidate: false });
      return result.user;
    },
    [mutate]
  );

  const logout = useCallback(async () => {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
    // gesamten Cache leeren, damit keine Daten des vorherigen Accounts sichtbar bleiben
    await mutateAll(() => true, undefined, { revalidate: false });
  }, [mutateAll]);

  const setUser = useCallback(
    (user: AuthUser) => {
      void mutate({ user }, { revalidate: false });
    },
    [mutate]
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user: data?.user ?? null, loading: isLoading, login, logout, setUser }),
    [data, isLoading, login, logout, setUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth muss innerhalb von <AuthProvider> verwendet werden');
  return ctx;
}

/** Nur relative Pfade zulassen, damit der ?next=-Parameter nicht als Open-Redirect missbraucht werden kann. */
export function safeNextPath(next: string | null | undefined, fallback = '/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return fallback;
  return next;
}

/** Leitet nicht angemeldete Nutzer auf /login um (mit Rücksprung); optional nur für Admins. */
export function useRequireAuth(options: { admin?: boolean } = {}) {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user) {
      const here = window.location.pathname + window.location.search;
      router.replace(`/login?next=${encodeURIComponent(here)}`);
    } else if (options.admin && auth.user.role !== 'admin') {
      router.replace('/');
    }
  }, [auth.loading, auth.user, options.admin, router]);

  const allowed = Boolean(auth.user) && (!options.admin || auth.user?.role === 'admin');
  return { ...auth, allowed };
}
