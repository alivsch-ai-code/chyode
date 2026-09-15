'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { apiFetch } from '@/lib/api';
import type { DateOption, Vote } from '@shared/types';

export function VoteForm({ tripId }: { tripId: string }) {
  const { data: optionsData, isLoading: optionsLoading } = useSWR<{ dateOptions: DateOption[] }>(
    `/trips/${tripId}/date-options`,
    () => apiFetch<{ dateOptions: DateOption[] }>(`/trips/${tripId}/date-options`, { tripId })
  );
  const { data: votesData, mutate: mutateVotes } = useSWR<{ votes: Vote[] }>(
    `/trips/${tripId}/votes/me`,
    () => apiFetch<{ votes: Vote[] }>(`/trips/${tripId}/votes/me`, { tripId })
  );

  const [peopleByOption, setPeopleByOption] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  if (optionsLoading) return <p className="text-slate-500">Lädt Terminoptionen…</p>;

  const dateOptions = optionsData?.dateOptions ?? [];
  const myVotes = votesData?.votes ?? [];
  const votedOptionIds = new Set(myVotes.map((v) => v.date_option_id));

  async function vote(dateOptionId: string) {
    setSavingId(dateOptionId);
    try {
      await apiFetch(`/trips/${tripId}/votes`, {
        method: 'POST',
        tripId,
        body: { dateOptionId, peopleCount: peopleByOption[dateOptionId] ?? 1 },
      });
      mutateVotes();
    } finally {
      setSavingId(null);
    }
  }

  async function unvote(dateOptionId: string) {
    setSavingId(dateOptionId);
    try {
      await apiFetch(`/trips/${tripId}/votes/${dateOptionId}`, { method: 'DELETE', tripId });
      mutateVotes();
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {dateOptions.map((option) => {
        const isVoted = votedOptionIds.has(option.id);
        const existingVote = myVotes.find((v) => v.date_option_id === option.id);
        return (
          <div key={option.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{option.label}</p>
              <p className="text-sm text-slate-500">
                {option.start_date} – {option.end_date}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                className="input w-20"
                defaultValue={existingVote?.people_count ?? 1}
                onChange={(e) =>
                  setPeopleByOption((prev) => ({ ...prev, [option.id]: parseInt(e.target.value, 10) || 1 }))
                }
              />
              <span className="text-sm text-slate-500">Personen</span>
              {isVoted ? (
                <button
                  onClick={() => unvote(option.id)}
                  disabled={savingId === option.id}
                  className="btn-secondary"
                >
                  Zurückziehen
                </button>
              ) : (
                <button onClick={() => vote(option.id)} disabled={savingId === option.id} className="btn-primary">
                  Abstimmen
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
