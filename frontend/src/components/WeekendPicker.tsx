'use client';

import { useEffect, useMemo, useState } from 'react';
import { MonthCalendar } from '@/components/MonthCalendar';
import { Segmented } from '@/components/ui/Segmented';
import { Select } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/Feedback';
import { IconCalendar, IconX } from '@/components/ui/Icons';
import { addDays, formatDateRange, formatShortRange, isoWeek, nightsBetween, pluralize } from '@/lib/format';
import {
  WEEKEND_KINDS,
  customRange,
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

const sortByStart = (list: Weekend[]) => [...list].sort((a, b) => a.startDate.localeCompare(b.startDate));

function eachDay(startDate: string, endDate: string): string[] {
  const days: string[] = [];
  for (let day = startDate; day <= endDate; day = addDays(day, 1)) days.push(day);
  return days;
}

/**
 * Terminauswahl: kompakte Wochenend-Chips (mit Kalenderwoche), ein Monatskalender zur Orientierung
 * und die Möglichkeit, im Kalender einen eigenen Zeitraum aufzuziehen (Start- und Enddatum anklicken).
 */
export function WeekendPicker({ selected, onChange, excludeIds = [] }: WeekendPickerProps) {
  const months = useMemo(() => monthOptions(18), []);
  const [kind, setKind] = useState<WeekendKind>('fri-sun');
  const [fromMonth, setFromMonth] = useState(months[0].value);
  const [toMonth, setToMonth] = useState(months[Math.min(3, months.length - 1)].value);
  const [focusMonth, setFocusMonth] = useState(months[0].value);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const weekends = useMemo(() => generateWeekends({ fromMonth, toMonth, kind }), [fromMonth, toMonth, kind]);
  const groups = useMemo(() => groupByMonth(weekends), [weekends]);
  const selectedIds = useMemo(() => new Set(selected.map((w) => w.id)), [selected]);
  const excluded = useMemo(() => new Set(excludeIds), [excludeIds]);

  const selectedDays = useMemo(() => new Set(selected.flatMap((w) => eachDay(w.startDate, w.endDate))), [selected]);
  const candidateDays = useMemo(() => new Set(weekends.flatMap((w) => eachDay(w.startDate, w.endDate))), [weekends]);

  // Escape bricht einen begonnenen eigenen Zeitraum ab
  useEffect(() => {
    if (!anchor) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAnchor(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [anchor]);

  const monthOf = (ymd: string) => ymd.slice(0, 7);

  const toggle = (weekend: Weekend) => {
    setNotice(null);
    setFocusMonth(monthOf(weekend.saturday));
    if (selectedIds.has(weekend.id)) onChange(selected.filter((w) => w.id !== weekend.id));
    else onChange(sortByStart([...selected, weekend]));
  };

  const setMonthSelection = (monthWeekends: Weekend[], select: boolean) => {
    const selectable = monthWeekends.filter((w) => !excluded.has(w.id));
    const withoutMonth = selected.filter((w) => !selectable.some((m) => m.id === w.id));
    onChange(sortByStart(select ? [...withoutMonth, ...selectable] : withoutMonth));
  };

  // Eigenen Zeitraum im Kalender aufziehen: erster Klick = Start, zweiter Klick = Ende
  const onDayClick = (ymd: string) => {
    setNotice(null);
    if (!anchor) {
      setAnchor(ymd);
      return;
    }
    if (ymd === anchor) {
      setAnchor(null);
      return;
    }
    const [start, end] = ymd < anchor ? [ymd, anchor] : [anchor, ymd];
    if (nightsBetween(start, end) > 14) {
      setNotice('Ein Zeitraum darf höchstens 14 Nächte umfassen.');
      setAnchor(null);
      return;
    }
    const range = customRange(start, end);
    if (excluded.has(range.id)) {
      setNotice('Diesen Zeitraum gibt es bereits.');
    } else if (!selectedIds.has(range.id)) {
      onChange(sortByStart([...selected, range]));
    }
    setAnchor(null);
  };

  const remove = (id: string) => onChange(selected.filter((w) => w.id !== id));

  const onFromChange = (value: string) => {
    setFromMonth(value);
    if (toMonth < value) setToMonth(value);
    setFocusMonth(value);
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
        <div className="grid grid-cols-2 gap-3">
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
        <div className="space-y-4">
          {groups.map((group) => {
            const selectable = group.weekends.filter((w) => !excluded.has(w.id));
            const allSelected = selectable.length > 0 && selectable.every((w) => selectedIds.has(w.id));
            return (
              <section key={group.key} aria-label={group.title}>
                <div className="mb-1.5 flex items-center justify-between">
                  <h3 className="text-subhead font-semibold">{group.title}</h3>
                  {selectable.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setMonthSelection(group.weekends, !allSelected)}
                      className="rounded-md text-footnote text-accent hover:underline"
                    >
                      {allSelected ? 'Monat abwählen' : 'Alle wählen'}
                    </button>
                  )}
                </div>
                <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
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
                          title={isExcluded ? 'Bereits vorgeschlagen' : undefined}
                          className={`relative flex w-full flex-col items-center rounded-control border px-1.5 py-1.5 text-center transition duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 ${
                            isSelected
                              ? 'border-accent bg-accent text-white dark:text-black'
                              : 'border-line bg-surface hover:border-tertiary'
                          }`}
                        >
                          <span className="text-subhead font-semibold leading-tight">
                            {formatShortRange(weekend.startDate, weekend.endDate)}
                          </span>
                          <span className={`text-caption leading-tight ${isSelected ? 'opacity-85' : 'text-secondary'}`}>
                            KW {isoWeek(weekend.saturday)}
                          </span>
                          {weekend.holidays.length > 0 && (
                            <>
                              <span
                                aria-hidden="true"
                                className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white dark:bg-black' : 'bg-warning'}`}
                              />
                              <span className="sr-only">Feiertag: {weekend.holidays.join(', ')}</span>
                            </>
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

      <div className="space-y-3">
        <div>
          <h3 className="text-subhead font-semibold">Kalender</h3>
          <p className="text-footnote text-secondary" aria-live="polite">
            {anchor
              ? `Beginn: ${formatShortRange(anchor, anchor)} – klicke jetzt das Enddatum. (Esc zum Abbrechen)`
              : 'Klicke ein Start- und ein Enddatum an, um einen eigenen Zeitraum hinzuzufügen.'}
          </p>
        </div>
        <MonthCalendar
          month={focusMonth}
          onMonthChange={setFocusMonth}
          selectedDays={selectedDays}
          candidateDays={candidateDays}
          anchor={anchor}
          onDayClick={onDayClick}
          minMonth={months[0].value}
          maxMonth={months[months.length - 1].value}
        />
        {notice && (
          <p role="alert" className="text-footnote font-medium text-danger">
            {notice}
          </p>
        )}
      </div>

      <div className="rounded-control bg-grouped px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" className="text-subhead">
            <strong className="font-semibold">{pluralize(selected.length, 'Termin', 'Termine')}</strong> ausgewählt
          </p>
          {selected.length > 0 && (
            <button type="button" onClick={() => onChange([])} className="text-subhead text-accent hover:underline">
              Auswahl zurücksetzen
            </button>
          )}
        </div>
        {selected.length > 0 && (
          <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Ausgewählte Termine">
            {selected.map((w) => (
              <li
                key={w.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface py-1 pl-3 pr-1.5 text-footnote font-medium shadow-sm"
              >
                {formatDateRange(w.startDate, w.endDate)} · KW {isoWeek(w.startDate)}
                {w.custom && <span className="text-secondary">(eigener)</span>}
                <button
                  type="button"
                  onClick={() => remove(w.id)}
                  aria-label={`${formatDateRange(w.startDate, w.endDate)} entfernen`}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-secondary transition hover:bg-fill/20 hover:text-label"
                >
                  <IconX size={12} strokeWidth={2.5} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-footnote text-secondary">Angezeigt werden bundesweite gesetzliche Feiertage.</p>
    </div>
  );
}
