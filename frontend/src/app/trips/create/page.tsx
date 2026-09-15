'use client';

import { useEffect, useState } from 'react';
import { apiFetch, getCreatorToken } from '@/lib/api';
import { TripForm } from '@/components/TripForm';

export default function CreateTripPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoggedIn(!!getCreatorToken());
  }, []);

  async function handleRequestLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const data = await apiFetch<{ devLink?: string }>('/auth/magic-link', {
        method: 'POST',
        body: { email },
      });
      setSent(true);
      setDevLink(data.devLink ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Link konnte nicht versendet werden.');
    }
  }

  if (isLoggedIn === null) return null;

  if (!isLoggedIn) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="mb-4 text-2xl font-bold">Als Trip-Ersteller anmelden</h1>
        <p className="mb-6 text-sm text-slate-600">
          Kein Passwort nötig – gib deine E-Mail-Adresse ein und wir senden dir einen Login-Link.
        </p>
        {sent ? (
          <div className="card space-y-3">
            <p>
              Wir haben einen Login-Link an <strong>{email}</strong> gesendet.
            </p>
            {devLink && (
              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                <p className="mb-1 font-medium">Dev-Modus:</p>
                <a href={devLink} className="underline">
                  {devLink}
                </a>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleRequestLink} className="card space-y-4">
            <div>
              <label className="label">E-Mail-Adresse</label>
              <input
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="btn-primary w-full">
              Login-Link senden
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Neuen Trip erstellen</h1>
      <TripForm />
    </div>
  );
}
