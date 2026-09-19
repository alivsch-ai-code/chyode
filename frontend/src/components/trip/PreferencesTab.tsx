'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import type { AccommodationTypeKey, ExperienceKey, MyPreferences } from '@shared/types';
import { Button } from '@/components/ui/Button';
import { ChoiceCards } from '@/components/ui/ChoiceCards';
import { Input } from '@/components/ui/Field';
import { Alert, Skeleton } from '@/components/ui/Feedback';
import { IconCheck, IconLock } from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import { apiFetch, errorMessage } from '@/lib/api';
import {
  ACCOMMODATION_TYPES,
  EXPERIENCES,
  MAX_ACCOMMODATION_TYPES,
  MAX_EXPERIENCES,
} from '@/lib/catalog';

const BUDGET_SUGGESTIONS = [100, 150, 200, 300, 400, 500];

function toNumber(value: string): number | null {
  const parsed = Number(value.replace(',', '.'));
  return value.trim() !== '' && Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
}

export function PreferencesTab({ tripId, votingOpen }: { tripId: string; votingOpen: boolean }) {
  const { toast } = useToast();
  const key = `/trips/${tripId}/preferences/me`;
  const { data, error, isLoading, mutate } = useSWR<{ preferences: MyPreferences | null }>(key);

  const [accommodation, setAccommodation] = useState('');
  const [activities, setActivities] = useState('');
  const [experiences, setExperiences] = useState<ExperienceKey[]>([]);
  const [types, setTypes] = useState<AccommodationTypeKey[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Formular einmalig mit den gespeicherten Werten füllen
  useEffect(() => {
    if (!data || initialized) return;
    const prefs = data.preferences;
    if (prefs) {
      setAccommodation(prefs.budgetAccommodation === null ? '' : String(prefs.budgetAccommodation));
      setActivities(prefs.budgetActivities === null ? '' : String(prefs.budgetActivities));
      setExperiences(prefs.experiences);
      setTypes(prefs.accommodationTypes);
    }
    setInitialized(true);
  }, [data, initialized]);

  const saved = data?.preferences ?? null;
  const dirty = useMemo(() => {
    const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((v) => b.includes(v));
    return (
      toNumber(accommodation) !== (saved?.budgetAccommodation ?? null) ||
      toNumber(activities) !== (saved?.budgetActivities ?? null) ||
      !sameList(experiences, saved?.experiences ?? []) ||
      !sameList(types, saved?.accommodationTypes ?? [])
    );
  }, [accommodation, activities, experiences, types, saved]);

  const completion = [
    { label: 'Budget', done: toNumber(accommodation) !== null || toNumber(activities) !== null },
    { label: 'Erlebnisse', done: experiences.length > 0 },
    { label: 'Unterkunft', done: types.length > 0 },
  ];

  async function save() {
    setFormError(null);
    setSaving(true);
    try {
      await apiFetch(`/trips/${tripId}/preferences`, {
        method: 'PUT',
        body: {
          budgetAccommodation: toNumber(accommodation),
          budgetActivities: toNumber(activities),
          experiences,
          accommodationTypes: types,
        },
      });
      await mutate();
      toast('Präferenzen gespeichert', 'success');
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !initialized) return <Skeleton className="h-96" />;
  if (error) return <Alert tone="error">{errorMessage(error)}</Alert>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-title2">Deine Präferenzen</h2>
        <p className="mt-1 text-callout text-secondary">
          Sag, was dir wichtig ist – so findet die Gruppe ein Ziel, das für alle passt.
        </p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-fill/12 px-3.5 py-1.5 text-footnote text-secondary">
          <IconLock size={14} /> Andere sehen nur die Gruppenauswertung – nie deine einzelnen Angaben.
        </p>
      </div>

      {!votingOpen && <Alert tone="info">Die Abstimmung ist beendet. Präferenzen können nicht mehr geändert werden.</Alert>}
      {formError && <Alert tone="error">{formError}</Alert>}

      <ul className="flex flex-wrap gap-2" aria-label="Fortschritt">
        {completion.map((step) => (
          <li
            key={step.label}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-footnote font-medium ${
              step.done ? 'bg-success/12 text-success' : 'bg-fill/12 text-secondary'
            }`}
          >
            {step.done && <IconCheck size={13} strokeWidth={3} />}
            {step.label}
          </li>
        ))}
      </ul>

      <section className="card space-y-6 p-6 sm:p-8" aria-labelledby="budget-heading">
        <div>
          <h3 id="budget-heading" className="text-title3">
            Wie viel möchtest du maximal ausgeben?
          </h3>
          <p className="mt-1 text-callout text-secondary">
            Pro Person für den gesamten Aufenthalt. Die Gruppe orientiert sich am mittleren Wert (Median).
          </p>
        </div>

        <BudgetField
          label="Übernachtung"
          hint="Anteil an der Unterkunft, den du bereit bist zu zahlen."
          value={accommodation}
          onChange={setAccommodation}
          disabled={!votingOpen}
        />
        <BudgetField
          label="Aktivitäten"
          hint="Ausflüge, Skipass, Eintritte, Essen unterwegs."
          value={activities}
          onChange={setActivities}
          disabled={!votingOpen}
        />
      </section>

      <section className="card space-y-5 p-6 sm:p-8" aria-labelledby="experience-heading">
        <div>
          <h3 id="experience-heading" className="text-title3">
            Welches Erlebnis wünschst du dir?
          </h3>
          <p className="mt-1 text-callout text-secondary">
            Wähle bis zu {MAX_EXPERIENCES} ({experiences.length}/{MAX_EXPERIENCES} ausgewählt).
          </p>
        </div>
        <ChoiceCards
          multiple
          legend="Erlebnisse"
          items={EXPERIENCES}
          value={experiences}
          max={MAX_EXPERIENCES}
          onChange={setExperiences}
          disabled={!votingOpen}
        />
      </section>

      <section className="card space-y-5 p-6 sm:p-8" aria-labelledby="stay-heading">
        <div>
          <h3 id="stay-heading" className="text-title3">
            Wo möchtest du übernachten?
          </h3>
          <p className="mt-1 text-callout text-secondary">
            Wähle bis zu {MAX_ACCOMMODATION_TYPES} ({types.length}/{MAX_ACCOMMODATION_TYPES} ausgewählt).
          </p>
        </div>
        <ChoiceCards
          multiple
          legend="Unterkunftsarten"
          items={ACCOMMODATION_TYPES}
          value={types}
          max={MAX_ACCOMMODATION_TYPES}
          onChange={setTypes}
          disabled={!votingOpen}
        />
      </section>

      {votingOpen && (
        <div className="sticky bottom-4 z-10 flex justify-end">
          <Button size="lg" loading={saving} disabled={!dirty} onClick={save} className="shadow-lift">
            {saved && !dirty ? 'Gespeichert' : 'Präferenzen speichern'}
          </Button>
        </div>
      )}
    </div>
  );
}

function BudgetField({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3">
      <Input
        label={label}
        hint={hint}
        type="number"
        inputMode="numeric"
        min={0}
        max={100000}
        step={10}
        placeholder="Betrag in Euro"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="flex flex-wrap gap-2" role="group" aria-label={`${label}: Schnellauswahl`}>
        {BUDGET_SUGGESTIONS.map((amount) => (
          <button
            key={amount}
            type="button"
            disabled={disabled}
            aria-pressed={toNumber(value) === amount}
            onClick={() => onChange(String(amount))}
            className={`rounded-full px-3.5 py-1.5 text-subhead font-medium tabular-nums transition disabled:opacity-45 ${
              toNumber(value) === amount ? 'bg-accent text-white dark:text-black' : 'bg-fill/12 text-label hover:bg-fill/20'
            }`}
          >
            {amount} €
          </button>
        ))}
      </div>
    </div>
  );
}
