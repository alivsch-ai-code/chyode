'use client';

import useSWR from 'swr';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { NoteForm } from '@/components/NoteForm';
import type { Trip } from '@shared/types';

export default function NotesPage() {
  const { token } = useParams<{ token: string }>();
  const { data, error, isLoading } = useSWR<{ trip: Pick<Trip, 'id' | 'title'> }>(
    `/trips/invite/${token}`,
    () => apiFetch<{ trip: Pick<Trip, 'id' | 'title'> }>(`/trips/invite/${token}`)
  );

  if (isLoading) return <p className="text-slate-500">Lädt…</p>;
  if (error || !data) return <p className="text-red-600">Einladung nicht gefunden.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notizen & Wünsche: {data.trip.title}</h1>
        <p className="text-slate-600">
          Sauna, 3 Schlafzimmer, Haustier erlaubt? Teile alles, was der Gruppe bei der Auswahl hilft.
        </p>
      </div>
      <NoteForm tripId={data.trip.id} />
    </div>
  );
}
