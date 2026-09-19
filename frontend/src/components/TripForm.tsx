'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AccommodationTypeKey, Trip } from '@shared/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Alert, Badge } from '@/components/ui/Feedback';
import { IconCheck, IconChevronLeft } from '@/components/ui/Icons';
import { ChoiceCards } from '@/components/ui/ChoiceCards';
import { Segmented } from '@/components/ui/Segmented';
import { WeekendPicker } from '@/components/WeekendPicker';
import { apiFetch, errorMessage } from '@/lib/api';
import { ACCOMMODATION_TYPES } from '@/lib/catalog';
import { TRIP_TYPE_LABELS, formatDateRange, nightsBetween, pluralize } from '@/lib/format';
import { todayYmd, type Weekend } from '@/lib/weekends';

type Step = 0 | 1 | 2;
type DateMode = 'multiple_choice' | 'fixed';

const STEPS = ['Details', 'Termine', 'Überblick'];

export function TripForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [tripType, setTripType] = useState<AccommodationTypeKey>('hut');
  const [dateMode, setDateMode] = useState<DateMode>('multiple_choice');
  const [weekends, setWeekends] = useState<Weekend[]>([]);
  const [fixedStart, setFixedStart] = useState('');
  const [fixedEnd, setFixedEnd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fixedInvalid = dateMode === 'fixed' && (!fixedStart || !fixedEnd || fixedEnd <= fixedStart);
  const detailsValid = title.trim().length > 0 && location.trim().length > 0;
  const datesValid = dateMode === 'multiple_choice' ? weekends.length > 0 : !fixedInvalid;

  // Nächte: bei Wochenenden die am häufigsten gewählte Länge, sonst aus dem festen Zeitraum
  const nights =
    dateMode === 'fixed'
      ? Math.max(1, fixedStart && fixedEnd ? nightsBetween(fixedStart, fixedEnd) : 2)
      : mostCommon(weekends.map((w) => w.nights)) ?? 2;

  function next() {
    setError(null);
    if (step === 0 && !detailsValid) return;
    if (step === 1 && !datesValid) return;
    setStep((s) => Math.min(2, s + 1) as Step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(0, s - 1) as Step);
  }

  async function create() {
    setError(null);
    setSubmitting(true);
    try {
      const result = await apiFetch<{ trip: Trip }>('/trips', {
        method: 'POST',
        body: {
          title: title.trim(),
          location: location.trim(),
          tripType,
          dateMode,
          nights,
          ...(dateMode === 'fixed'
            ? { startDate: fixedStart, endDate: fixedEnd }
            : {
                dateOptions: weekends.map((w) => ({ label: w.label, startDate: w.startDate, endDate: w.endDate })),
              }),
        },
      });
      router.push(`/trips/${result.trip.id}?neu=1`);
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <ol aria-label="Fortschritt" className="flex items-center gap-2">
        {STEPS.map((label, index) => {
          const done = index < step;
          const current = index === step;
          return (
            <li key={label} className="flex flex-1 items-center gap-2" aria-current={current ? 'step' : undefined}>
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-footnote font-semibold transition-colors ${
                  done ? 'bg-accent text-white dark:text-black' : current ? 'bg-label text-canvas' : 'bg-fill/15 text-secondary'
                }`}
              >
                {done ? <IconCheck size={14} strokeWidth={3} /> : index + 1}
              </span>
              <span className={`hidden text-subhead sm:inline ${current ? 'font-semibold' : 'text-secondary'}`}>{label}</span>
              {index < STEPS.length - 1 && <span aria-hidden="true" className="h-px flex-1 bg-line" />}
            </li>
          );
        })}
      </ol>

      {error && <Alert tone="error">{error}</Alert>}

      {step === 0 && (
        <section className="card animate-fade-up space-y-6 p-6 sm:p-8" aria-labelledby="step-details">
          <div>
            <h2 id="step-details" className="text-title2">
              Worum geht es?
            </h2>
            <p className="mt-1 text-callout text-secondary">Gib deiner Reise einen Namen und sag, wohin es gehen soll.</p>
          </div>
          <Input
            label="Titel"
            placeholder="z. B. Hüttenwochenende Herbst"
            maxLength={200}
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            label="Region oder Ort"
            placeholder="z. B. Allgäu, Zillertal, Südtirol"
            maxLength={200}
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <div>
            <p className="text-subhead font-medium">Welche Unterkunft schwebt dir vor?</p>
            <p className="mb-3 mt-0.5 text-footnote text-secondary">
              Nur ein Vorschlag – die Gruppe gibt später ihre eigenen Präferenzen an.
            </p>
            <ChoiceCards legend="Art der Unterkunft" items={ACCOMMODATION_TYPES} value={tripType} onChange={setTripType} />
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="card animate-fade-up space-y-6 p-6 sm:p-8" aria-labelledby="step-dates">
          <div>
            <h2 id="step-dates" className="text-title2">
              Wann soll es losgehen?
            </h2>
            <p className="mt-1 text-callout text-secondary">
              Schlage Wochenenden vor – deine Gruppe stimmt anschließend darüber ab.
            </p>
          </div>

          <Segmented
            ariaLabel="Terminart"
            value={dateMode}
            onChange={setDateMode}
            options={[
              { value: 'multiple_choice', label: 'Wochenenden zur Wahl' },
              { value: 'fixed', label: 'Fester Zeitraum' },
            ]}
          />

          {dateMode === 'multiple_choice' ? (
            <WeekendPicker selected={weekends} onChange={setWeekends} />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Anreise"
                type="date"
                min={todayYmd()}
                value={fixedStart}
                onChange={(e) => setFixedStart(e.target.value)}
              />
              <Input
                label="Abreise"
                type="date"
                min={fixedStart || todayYmd()}
                value={fixedEnd}
                error={fixedStart && fixedEnd && fixedEnd <= fixedStart ? 'Die Abreise muss nach der Anreise liegen.' : null}
                onChange={(e) => setFixedEnd(e.target.value)}
              />
            </div>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="card animate-fade-up space-y-6 p-6 sm:p-8" aria-labelledby="step-summary">
          <div>
            <h2 id="step-summary" className="text-title2">
              Alles bereit?
            </h2>
            <p className="mt-1 text-callout text-secondary">
              Nach dem Erstellen erhältst du einen Einladungslink für deine Gruppe.
            </p>
          </div>

          <dl className="divide-y divide-line/60 rounded-control bg-grouped px-4 text-callout">
            <SummaryRow label="Titel">{title.trim()}</SummaryRow>
            <SummaryRow label="Ort">{location.trim()}</SummaryRow>
            <SummaryRow label="Unterkunft">{TRIP_TYPE_LABELS[tripType]}</SummaryRow>
            <SummaryRow label="Termine">
              {dateMode === 'fixed' ? (
                formatDateRange(fixedStart, fixedEnd)
              ) : (
                <span className="flex flex-wrap justify-end gap-1.5">
                  {weekends.map((w) => (
                    <Badge key={w.id} tone="accent">
                      {formatDateRange(w.startDate, w.endDate)}
                    </Badge>
                  ))}
                </span>
              )}
            </SummaryRow>
            <SummaryRow label="Dauer">{pluralize(nights, 'Nacht', 'Nächte')}</SummaryRow>
          </dl>
        </section>
      )}

      <div className="flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button variant="plain" onClick={back} icon={<IconChevronLeft size={18} />} disabled={submitting}>
            Zurück
          </Button>
        ) : (
          <span />
        )}
        {step < 2 ? (
          <Button size="lg" onClick={next} disabled={step === 0 ? !detailsValid : !datesValid}>
            Weiter
          </Button>
        ) : (
          <Button size="lg" onClick={create} loading={submitting}>
            Reise erstellen
          </Button>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3">
      <dt className="shrink-0 text-secondary">{label}</dt>
      <dd className="min-w-0 text-right font-medium">{children}</dd>
    </div>
  );
}

function mostCommon(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
}
