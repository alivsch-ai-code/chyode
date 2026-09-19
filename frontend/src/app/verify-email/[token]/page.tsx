'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { AuthUser } from '@shared/types';
import { AuthShell } from '@/components/AuthShell';
import { LinkButton } from '@/components/ui/Button';
import { Alert, PageLoading } from '@/components/ui/Feedback';
import { ApiError, apiFetch, errorMessage } from '@/lib/api';
import { safeNextPath, useAuth } from '@/lib/auth';

type State = { status: 'verifying' } | { status: 'error'; message: string; code: number };

export default function VerifyEmailPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const router = useRouter();
  const { setUser } = useAuth();
  const [state, setState] = useState<State>({ status: 'verifying' });
  const started = useRef(false);

  // Der Link wird erst hier per POST eingelöst – ein bloßes Abrufen der URL (z. B. durch Mail-Scanner) verbraucht ihn nicht.
  useEffect(() => {
    if (started.current) return;
    started.current = true;

    apiFetch<{ user: AuthUser; next: string | null }>('/auth/verify-email', { method: 'POST', body: { token } })
      .then((result) => {
        setUser(result.user);
        router.replace(safeNextPath(result.next, '/'));
      })
      .catch((err) => {
        setState({
          status: 'error',
          message: errorMessage(err),
          code: err instanceof ApiError ? err.status : 0,
        });
      });
  }, [token, router, setUser]);

  if (state.status === 'verifying') return <PageLoading label="E-Mail-Adresse wird bestätigt …" />;

  const alreadyRegistered = state.code === 409;
  return (
    <AuthShell title={alreadyRegistered ? 'Konto existiert bereits' : 'Bestätigung nicht möglich'}>
      <Alert tone={alreadyRegistered ? 'info' : 'warning'}>{state.message}</Alert>
      <div className="mt-5 space-y-3">
        <LinkButton href="/login" size="lg" fullWidth>
          Zur Anmeldung
        </LinkButton>
        {!alreadyRegistered && (
          <LinkButton href="/register" variant="plain" size="lg" fullWidth>
            Erneut registrieren
          </LinkButton>
        )}
      </div>
    </AuthShell>
  );
}
