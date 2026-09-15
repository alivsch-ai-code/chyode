'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, setParticipantToken } from '@/lib/api';
import type { Trip } from '@shared/types';

interface DateOptionInput {
  label: string;
  startDate: string;
  endDate: string;
}

interface CreateTripResponse {
  trip: Trip;
  participantToken: string;
  inviteLink: string;
}

export function TripForm() {
  const router = useRouter();
  const [creatorName, setCreatorName] = useState('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [tripType, setTripType] = useState<'hut' | 'wellness' | 'hotel' | 'other'>('hut');
  const [nights, setNights] = useState(2);
  const [budgetPerPerson, setBudgetPerPerson] = useState('');
  const [dateOptions, setDateOptions] = useState<DateOptionInput[]>([
    { label: '', startDate: '', endDate: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateDateOption(index: number, patch: Partial<DateOptionInput>) {
    setDateOptions((prev) => prev.map((opt, i) => (i === index ? { ...opt, ...patch } : opt)));
  }

  function addDateOption() {
    setDateOptions((prev) => [...prev, { label: '', startDate: '', endDate: '' }]);
  }

  function removeDateOption(index: number) {
    setDateOptions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<CreateTripResponse>('/trips', {
        method: 'POST',
        asCreator: true,
        body: {
          title,
          location,
          tripType,
          dateMode: 'multiple_choice',
          nights,
          budgetPerPerson: budgetPerPerson ? parseFloat(budgetPerPerson) : undefined,
          creatorName,
          dateOptions: dateOptions.filter((o) => o.label && o.startDate && o.endDate),
        },
      });

      setParticipantToken(data.trip.id, data.participantToken);
      router.push(`/trips/${data.trip.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Trip konnte nicht erstellt werden.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5">
      <div>
        <label className="label">Dein Name</label>
        <input
          className="input"
          value={creatorName}
          onChange={(e) => setCreatorName(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="label">Titel der Reise</label>
        <input
          className="input"
          placeholder="z.B. Mädels-Wochenende im Schwarzwald"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Ort / Region</label>
          <input
            className="input"
            placeholder="Schwarzwald, Deutschland"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Reiseart</label>
          <select
            className="input"
            value={tripType}
            onChange={(e) => setTripType(e.target.value as typeof tripType)}
          >
            <option value="hut">Hütte</option>
            <option value="wellness">Wellness</option>
            <option value="hotel">Hotel</option>
            <option value="other">Sonstiges</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Anzahl Nächte</label>
          <input
            type="number"
            min={1}
            className="input"
            value={nights}
            onChange={(e) => setNights(parseInt(e.target.value, 10))}
          />
        </div>
        <div>
          <label className="label">Budget pro Person (optional, €)</label>
          <input
            type="number"
            min={0}
            className="input"
            value={budgetPerPerson}
            onChange={(e) => setBudgetPerPerson(e.target.value)}
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="label mb-0">Terminoptionen zum Voten</label>
          <button type="button" onClick={addDateOption} className="btn-secondary text-xs">
            + Option hinzufügen
          </button>
        </div>
        <div className="space-y-3">
          {dateOptions.map((option, index) => (
            <div key={index} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-4">
              <input
                className="input sm:col-span-2"
                placeholder="z.B. Wochenende 12.–14. Jan"
                value={option.label}
                onChange={(e) => updateDateOption(index, { label: e.target.value })}
              />
              <input
                type="date"
                className="input"
                value={option.startDate}
                onChange={(e) => updateDateOption(index, { startDate: e.target.value })}
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  className="input"
                  value={option.endDate}
                  onChange={(e) => updateDateOption(index, { endDate: e.target.value })}
                />
                {dateOptions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDateOption(index)}
                    className="shrink-0 text-slate-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Erstelle Trip…' : 'Trip erstellen & Einladungslink generieren'}
      </button>
    </form>
  );
}
