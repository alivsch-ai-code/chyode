'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { AccommodationCard } from '@/components/AccommodationCard';
import type { AccommodationSuggestion } from '@shared/types';

interface AccommodationsResponse {
  topSuggestions: AccommodationSuggestion[];
  allSuggestions: AccommodationSuggestion[];
  cached: boolean;
}

export default function AccommodationsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { data, mutate, isLoading } = useSWR<AccommodationsResponse>(
    `/trips/${tripId}/accommodations`,
    () => apiFetch<AccommodationsResponse>(`/trips/${tripId}/accommodations`, { tripId })
  );
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    setSearching(true);
    setError(null);
    try {
      const result = await apiFetch<AccommodationsResponse>(`/trips/${tripId}/accommodations/search`, {
        method: 'POST',
        tripId,
        body: {},
      });
      mutate(result, { revalidate: false });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Suche fehlgeschlagen. Ggf. hat noch niemand abgestimmt oder du bist nicht der Ersteller.'
      );
    } finally {
      setSearching(false);
    }
  }

  const topSuggestions = data?.topSuggestions ?? [];
  const otherSuggestions = (data?.allSuggestions ?? []).slice(3);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Unterkunfts-Vorschläge</h1>
        <button onClick={handleSearch} disabled={searching} className="btn-primary">
          {searching ? 'Suche läuft…' : 'Suche jetzt starten'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {isLoading && <p className="text-slate-500">Lädt…</p>}

      {!isLoading && topSuggestions.length === 0 && (
        <p className="text-slate-500">
          Noch keine Vorschläge vorhanden. Starte die Suche, sobald genug Teilnehmer:innen abgestimmt haben.
        </p>
      )}

      {topSuggestions.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold">Top 3 Empfehlungen</h2>
          <div className="space-y-4">
            {topSuggestions.map((s, i) => (
              <AccommodationCard key={s.id} suggestion={s} rank={i + 1} />
            ))}
          </div>
        </div>
      )}

      {otherSuggestions.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold">Weitere Optionen</h2>
          <div className="space-y-4">
            {otherSuggestions.map((s) => (
              <AccommodationCard key={s.id} suggestion={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
