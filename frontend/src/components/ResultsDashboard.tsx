'use client';

import useSWR from 'swr';
import { apiFetch } from '@/lib/api';
import type { TripResults } from '@shared/types';

export function ResultsDashboard({ tripId }: { tripId: string }) {
  const { data, error, isLoading } = useSWR<{ results: TripResults }>(
    `/trips/${tripId}/results`,
    () => apiFetch<{ results: TripResults }>(`/trips/${tripId}/results`, { tripId })
  );

  if (isLoading) return <p className="text-slate-500">Berechne Ergebnisse…</p>;
  if (error || !data) return <p className="text-red-600">Ergebnisse konnten nicht geladen werden.</p>;

  const { results } = data;

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="mb-1 font-semibold">Abstimmungsfortschritt</h2>
        <p className="text-sm text-slate-600">
          {results.votedParticipants} von {results.totalParticipants} Teilnehmer:innen haben abgestimmt.
        </p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-brand-600"
            style={{
              width: `${results.totalParticipants > 0 ? (results.votedParticipants / results.totalParticipants) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">🏆 Top-Termin</h2>
        {results.topDateOption ? (
          <div>
            <p className="text-lg font-medium">{results.topDateOption.label}</p>
            <p className="text-sm text-slate-500">
              {results.topDateOption.startDate} – {results.topDateOption.endDate}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {results.topDateOption.totalVotes} Stimmen · {results.topDateOption.totalPeople} Personen
            </p>
          </div>
        ) : (
          <p className="text-slate-500">Noch keine Stimmen abgegeben.</p>
        )}
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Terminranking</h2>
        <ul className="space-y-2">
          {results.dateOptionRanking.map((option, index) => (
            <li key={option.dateOptionId} className="flex items-center justify-between text-sm">
              <span>
                {index + 1}. {option.label}
              </span>
              <span className="text-slate-500">
                {option.totalVotes} Stimmen · {option.totalPeople} Personen
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Häufigste Wünsche</h2>
        {results.topWishes.length === 0 ? (
          <p className="text-slate-500">Noch keine Wünsche erkannt.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {results.topWishes.map((wish) => (
              <span
                key={wish.keyword}
                className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700"
              >
                {wish.keyword} ({wish.count}×)
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
