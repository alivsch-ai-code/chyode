'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch, setParticipantToken } from '@/lib/api';
import type { Trip, TripUser } from '@shared/types';

interface InvitePreviewResponse {
  trip: Pick<Trip, 'id' | 'title' | 'location' | 'trip_type' | 'date_mode' | 'start_date' | 'end_date' | 'nights' | 'status'>;
  participantCount: number;
}

interface JoinResponse {
  participant: TripUser;
  trip: Trip;
}

export default function InviteJoinPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { data, error, isLoading } = useSWR<InvitePreviewResponse>(
    `/trips/invite/${token}`,
    () => apiFetch<InvitePreviewResponse>(`/trips/invite/${token}`)
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setJoining(true);
    setJoinError(null);
    try {
      const result = await apiFetch<JoinResponse>(`/trips/invite/${token}/join`, {
        method: 'POST',
        body: { name, email: email || undefined },
      });
      setParticipantToken(result.trip.id, result.participant.session_token);
      router.push(`/invite/${token}/vote`);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Beitritt fehlgeschlagen.');
    } finally {
      setJoining(false);
    }
  }

  if (isLoading) return <p className="text-slate-500">Lädt…</p>;
  if (error || !data) return <p className="text-red-600">Diese Einladung ist ungültig oder abgelaufen.</p>;

  const { trip, participantCount } = data;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="card text-center">
        <h1 className="text-2xl font-bold">{trip.title}</h1>
        <p className="mt-1 text-slate-600">{trip.location}</p>
        <p className="mt-2 text-sm text-slate-400">{participantCount} Teilnehmer:innen bereits dabei</p>
      </div>

      {trip.status !== 'voting' ? (
        <p className="text-center text-slate-600">Das Voting für diesen Trip ist bereits geschlossen.</p>
      ) : (
        <form onSubmit={handleJoin} className="card space-y-4">
          <div>
            <label className="label">Dein Name</label>
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">E-Mail (optional)</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {joinError && <p className="text-sm text-red-600">{joinError}</p>}
          <button type="submit" disabled={joining} className="btn-primary w-full">
            {joining ? 'Trete bei…' : 'Beitreten & abstimmen'}
          </button>
        </form>
      )}
    </div>
  );
}
