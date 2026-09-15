'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { CopyInviteLink } from '@/components/CopyInviteLink';
import type { Trip, TripUser } from '@shared/types';

interface TripDetailResponse {
  trip: Trip;
  participants: Pick<TripUser, 'id' | 'name' | 'role' | 'joined_at'>[];
  inviteLink: string;
}

export default function TripDashboardPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { data, error, isLoading, mutate } = useSWR<TripDetailResponse>(
    `/trips/${tripId}`,
    () => apiFetch<TripDetailResponse>(`/trips/${tripId}`, { tripId })
  );

  async function handleCloseVoting() {
    if (!confirm('Voting jetzt schließen? Teilnehmer können danach nicht mehr abstimmen.')) return;
    await apiFetch(`/trips/${tripId}/close-voting`, { method: 'POST', tripId });
    mutate();
  }

  if (isLoading) return <p className="text-slate-500">Lädt…</p>;
  if (error || !data) return <p className="text-red-600">Trip konnte nicht geladen werden.</p>;

  const { trip, participants, inviteLink } = data;

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{trip.title}</h1>
            <p className="text-slate-600">
              {trip.location} · {trip.nights} Nächte · {trip.trip_type}
            </p>
          </div>
          <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
            {trip.status === 'voting' ? 'Voting läuft' : trip.status === 'closed' ? 'Voting geschlossen' : 'Gebucht'}
          </span>
        </div>

        <div className="mt-4">
          <p className="label">Einladungslink teilen</p>
          <CopyInviteLink link={inviteLink} />
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Teilnehmer ({participants.length})</h2>
        <ul className="space-y-2">
          {participants.map((p) => (
            <li key={p.id} className="flex items-center justify-between text-sm">
              <span>{p.name}</span>
              {p.role === 'creator' && (
                <span className="text-xs text-slate-400">Ersteller:in</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href={`/trips/${trip.id}/results`} className="btn-secondary">
          Ergebnis-Dashboard
        </Link>
        <Link href={`/trips/${trip.id}/accommodations`} className="btn-secondary">
          Unterkunfts-Vorschläge
        </Link>
        {trip.status === 'voting' && (
          <button onClick={handleCloseVoting} className="btn-primary">
            Voting schließen
          </button>
        )}
      </div>
    </div>
  );
}
