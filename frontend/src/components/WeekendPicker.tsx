'use client';

import { useMemo, useState } from 'react';
import { Segmented } from '@/components/ui/Segmented';
import { Select } from '@/components/ui/Field';
import { Badge, EmptyState } from '@/components/ui/Feedback';
import { IconCalendar, IconCheck } from '@/components/ui/Icons';
import { formatShortRange, pluralize } from '@/lib/format';
import {
  WEEKEND_KINDS,
  generateWeekends,
  groupByMonth,
  monthOptions,
  type Weekend,
  type WeekendKind,
} from '@/lib/weekends';

interface WeekendPickerProps {
  selected: Weekend[];
  onChange: (weekends: Weekend[]) => void;
  /** IDs (Start_Ende) bereits vorhandener Termine, die nicht erneut gewählt werden können. */
  excludeIds?: string[];
}

/**
 * Wochenend-Auswahl: Zeitraum und Wochenend-Typ wählen, dann gezielt einzelne Wochenenden
 * (mit Hinweis auf gesetzliche Feiertage) als Terminoptionen markieren.
 */
export function WeekendPicker({ selected, onChange, excludeIds = [] }: WeekendPickerProps) {
  const months = useMemo(() => monthOptions(18), []);
  const [kind, setKind] = useState<WeekendKind>('fri-sun');
  const [fromMonth, setFromMonth] = useState(months[0].value);
  const [toMonth, setToMonth] = useState(months[Math.min(3, months.length - 1)].value);

  const weekends = useMemo(() => generateWeekends({ fromMonth, toMonth, kind }), [fromMonth, toMonth, kind]);
  const groups = useMemo(() => groupByMonth(weekends), [weekends]);
  const selectedIds = useMemo(() => new Set(selected.map((w) => w.id)), [selected]);
  const excluded = useMemo(() => new Set(excludeIds), [excludeIds]);

  const toggle = (weekend: Weekend) => {
    if (selectedIds.has(weekend.id)) onChange(selected.filter((w) => w.id !== weekend.id));
    else onChange([...selected, weekend].sort((a, b) => a.startDate.localeCompare(b.startDate)));
  };

  const setMonthSelection = (monthWeekends: Weekend[], select: boolean) => {
    const selectable = monthWeekends.filter((w) => !excluded.has(w.id));
    const withoutMonth = selected.filter((w) => !selectable.some((m) => m.id === w.id));
    onChange(
      (select ? [...withoutMonth, ...selectable] : withoutMonth).sort((a, b) => a.startDate.localeCompare(b.startDate))
    );
  };

  const onFromChange = (value: string) => {
    setFromMonth(value);
    if (toMonth < value) setToMonth(value);
  };
  const onToChange = (value: string) => {
    setToMonth(value);
    if (value < fromMonth) setFromMonth(value);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-subhead font-medium">Art des Wochenendes</p>
          <Segmented
            ariaLabel="Art des Wochenendes"
            value={kind}
            onChange={setKind}
            options={WEEKEND_KINDS.map((k) => ({ value: k.id, label: k.label, hint: k.hint }))}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Von" value={fromMonth} onChange={(e) => onFromChange(e.target.value)}>
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
          <Select label="Bis" value={toMonth} onChange={(e) => onToChange(e.target.value)}>
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-card bg-grouped">
          <EmptyState icon={<IconCalendar size={26} />} title="Keine Wochenenden im Zeitraum">
            Wähle einen späteren Zeitraum oder eine andere Art des Wochenendes.
          </EmptyState>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => {
            const selectable = group.weekends.filter((w) => !excluded.has(w.id));
            const allSelected = selectable.length > 0 && selectable.every((w) => selectedIds.has(w.id));
            return (
              <section key={group.key} aria-label={group.title}>
                <div className="mb-2.5 flex items-center justify-between">
                  <h3 className="text-headline">{group.title}</h3>
                  {selectable.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setMonthSelection(group.weekends, !allSelected)}
                      className="rounded-md text-subhead text-accent hover:underline"
                    >
                      {allSelected ? 'Monat abwählen' : 'Alle im Monat wählen'}
                    </button>
                  )}
                </div>
                <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                  {group.weekends.map((weekend) => {
                    const isSelected = selectedIds.has(weekend.id);
                    const isExcluded = excluded.has(weekend.id);
                    return (
                      <li key={weekend.id}>
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          disabled={isExcluded}
                          onClick={() => toggle(weekend)}
                          className={`group relative flex h-full w-full flex-col items-start gap-1 rounded-control border px-3.5 py-3 text-left transition duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                            isSelected
                              ? 'border-accent bg-accent text-white dark:text-black'
                              : 'border-line bg-surface hover:border-tertiary'
                          }`}
                        >
                          <span className="flex w-full items-center justify-between gap-2">
                            <span className="text-callout font-semibold">
                              {formatShortRange(weekend.startDate, weekend.endDate)}
                            </span>
                            {isSelected && <IconCheck size={16} strokeWidth={2.5} />}
                          </span>
                          <span className={`text-footnote ${isSelected ? 'opacity-85' : 'text-secondary'}`}>
                            {isExcluded ? 'Bereits vorgeschlagen' : pluralize(weekend.nights, 'Nacht', 'Nächte')}
                          </span>
                          {weekend.holidays.length > 0 && (
                            <Badge tone={isSelected ? 'neutral' : 'warning'} className="mt-0.5">
                              {weekend.holidays[0]}
                            </Badge>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-grouped px-4 py-3">
        <p aria-live="polite" className="text-subhead">
          <strong className="font-semibold">{pluralize(selected.length, 'Wochenende', 'Wochenenden')}</strong> ausgewählt
        </p>
        {selected.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="text-subhead text-accent hover:underline">
            Auswahl zurücksetzen
          </button>
        )}
      </div>
      <p className="text-footnote text-secondary">Angezeigt werden bundesweite gesetzliche Feiertage.</p>
    </div>
  );
}
