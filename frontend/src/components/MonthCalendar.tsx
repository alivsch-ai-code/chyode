'use client';

import { useMemo } from 'react';
import { IconChevronLeft, IconChevronRight } from '@/components/ui/Icons';
import { addDays, dateFromYmd, formatLongDate, isoWeek, monthYearLabel, ymdFromDate } from '@/lib/format';
import { germanHolidays, todayYmd } from '@/lib/weekends';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

interface MonthCalendarProps {
  /** Angezeigter Monat als "JJJJ-MM". */
  month: string;
  onMonthChange: (month: string) => void;
  /** Tage, die zu einem ausgewählten Termin gehören. */
  selectedDays: Set<string>;
  /** Tage der Standard-Wochenenden im gewählten Zeitraum (zur Orientierung). */
  candidateDays: Set<string>;
  /** Startdatum eines gerade begonnenen eigenen Zeitraums. */
  anchor: string | null;
  onDayClick: (ymd: string) => void;
  /** Ältester wählbarer Monat / neuester Monat der Navigation. */
  minMonth: string;
  maxMonth: string;
}

function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, m - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Monatskalender mit Kalenderwochen (KW), Wochenend-Markierung, Feiertagen und Auswahl eigener Zeiträume. */
export function MonthCalendar({
  month,
  onMonthChange,
  selectedDays,
  candidateDays,
  anchor,
  onDayClick,
  minMonth,
  maxMonth,
}: MonthCalendarProps) {
  const today = useMemo(() => todayYmd(), []);
  const [year, monthNumber] = month.split('-').map(Number);
  const holidays = useMemo(() => germanHolidays(year), [year]);

  // Wochen (Montag zuerst); Tage außerhalb des Monats bleiben leer
  const weeks = useMemo(() => {
    const first = new Date(Date.UTC(year, monthNumber - 1, 1));
    const offset = (first.getUTCDay() + 6) % 7; // Mo = 0
    const gridStart = addDays(ymdFromDate(first), -offset);
    const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const weekCount = Math.ceil((offset + daysInMonth) / 7);

    return Array.from({ length: weekCount }, (_, w) => {
      const monday = addDays(gridStart, w * 7);
      return {
        week: isoWeek(monday),
        days: Array.from({ length: 7 }, (_, d) => {
          const ymd = addDays(monday, d);
          return dateFromYmd(ymd).getUTCMonth() === monthNumber - 1 ? ymd : null;
        }),
      };
    });
  }, [year, monthNumber]);

  return (
    <div className="rounded-card border border-line/70 bg-surface p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(month, -1))}
          disabled={month <= minMonth}
          aria-label="Vorheriger Monat"
          className="flex h-9 w-9 items-center justify-center rounded-full text-secondary transition hover:bg-fill/12 hover:text-label disabled:opacity-30"
        >
          <IconChevronLeft size={18} />
        </button>
        <h4 className="text-headline" aria-live="polite">
          {monthYearLabel(monthNumber - 1, year)}
        </h4>
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(month, 1))}
          disabled={month >= maxMonth}
          aria-label="Nächster Monat"
          className="flex h-9 w-9 items-center justify-center rounded-full text-secondary transition hover:bg-fill/12 hover:text-label disabled:opacity-30"
        >
          <IconChevronRight size={18} />
        </button>
      </div>

      <table className="w-full table-fixed border-separate border-spacing-y-1 text-center" role="grid" aria-label={`Kalender ${monthYearLabel(monthNumber - 1, year)}`}>
        <thead>
          <tr>
            <th scope="col" className="w-9 pb-1 text-caption font-medium text-tertiary sm:w-11">
              KW
            </th>
            {WEEKDAYS.map((d, i) => (
              <th key={d} scope="col" className={`pb-1 text-caption font-medium ${i >= 5 ? 'text-accent' : 'text-tertiary'}`}>
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week.week + (week.days.find(Boolean) ?? '')}>
              <th scope="row" className="text-caption font-medium tabular-nums text-tertiary">
                {week.week}
              </th>
              {week.days.map((ymd, index) => {
                if (!ymd) return <td key={index} />;
                const past = ymd < today;
                const selected = selectedDays.has(ymd);
                const candidate = !selected && candidateDays.has(ymd);
                const isAnchor = anchor === ymd;
                const holiday = holidays.get(ymd);
                const day = dateFromYmd(ymd).getUTCDate();
                return (
                  <td key={ymd} className="p-0">
                    <button
                      type="button"
                      disabled={past}
                      onClick={() => onDayClick(ymd)}
                      aria-label={`${formatLongDate(ymd)}${holiday ? `, ${holiday}` : ''}${selected ? ', ausgewählt' : ''}`}
                      aria-pressed={selected || isAnchor}
                      title={holiday}
                      className={`relative mx-auto flex h-9 w-9 items-center justify-center rounded-full text-subhead tabular-nums transition duration-150 disabled:cursor-not-allowed disabled:opacity-30 sm:h-10 sm:w-10 ${
                        selected || isAnchor
                          ? 'bg-accent font-semibold text-white dark:text-black'
                          : candidate
                            ? 'bg-accent/10 font-medium text-accent hover:bg-accent/20'
                            : 'text-label hover:bg-fill/15'
                      } ${isAnchor ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''}`}
                    >
                      {day}
                      {holiday && (
                        <span
                          aria-hidden="true"
                          className={`absolute bottom-1 h-1 w-1 rounded-full ${selected || isAnchor ? 'bg-white dark:bg-black' : 'bg-warning'}`}
                        />
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-caption text-secondary" aria-label="Legende">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-3 rounded-full bg-accent" /> Ausgewählt
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-3 rounded-full bg-accent/20" /> Wochenende im Zeitraum
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-warning" /> Feiertag
        </li>
      </ul>
    </div>
  );
}
