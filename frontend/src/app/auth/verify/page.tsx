'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch, setCreatorToken } from '@/lib/api';

function VerifyMagicLinkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Kein Token gefunden.');
      return;
    }

    apiFetch<{ token: string }>(`/auth/verify?token=${encodeURIComponent(token)}`)
      .then((data) => {
        setCreatorToken(data.token);
        router.replace('/trips/create');
      })
      .catch(() => setError('Der Magic-Link ist ungültig oder abgelaufen.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="card text-center">
      {error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <p className="text-slate-600">Du wirst angemeldet…</p>
      )}
    </div>
  );
}

export default function VerifyMagicLinkPage() {
  return (
    <Suspense fallback={<div className="card text-center text-slate-600">Lädt…</div>}>
      <VerifyMagicLinkContent />
    </Suspense>
  );
}
