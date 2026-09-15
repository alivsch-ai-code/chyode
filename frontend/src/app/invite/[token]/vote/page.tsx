'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { VoteForm } from '@/components/VoteForm';
import type { Trip } from '@shared/types';

export default function VotePage() {
  const { token } = useParams<{ token: string }>();
  const { data, error, isLoading } = useSWR<{ trip: Pick<Trip, 'id' | 'title'> }>(
    `/trips/invite/${token}`,
    () => apiFetch<{ trip: Pick<Trip, 'id' | 'title'> }>(`/trips/invite/${token}`)
  );

  if (isLoading) return <p className="text-slate-500">Lädt…</p>;
  if (error || !data) return <p className="text-red-600">Einladung nicht gefunden.</p>;

  const tripId = data.trip.id;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Termin-Voting: {data.trip.title}</h1>
        <p className="text-slate-600">Wähle die Termine, an denen du kannst, und gib die Personenanzahl an.</p>
      </div>
      <VoteForm tripId={tripId} />
      <Link href={`/invite/${token}/notes`} className="btn-secondary inline-block">
        Weiter zu Notizen & Wünschen →
      </Link>
    </div>
  );
}
