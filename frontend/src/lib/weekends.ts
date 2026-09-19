import { addDays, dateFromYmd, formatDateRange, monthYearLabel, nightsBetween, ymdFromDate } from '@/lib/format';

export type WeekendKind = 'fri-sun' | 'sat-sun' | 'thu-sun' | 'fri-mon';

interface WeekendKindDef {
  id: WeekendKind;
  label: string;
  hint: string;
  /** Verschiebung von Start/Ende relativ zum Samstag in Tagen. */
  startOffset: number;
  endOffset: number;
}

export const WEEKEND_KINDS: WeekendKindDef[] = [
  { id: 'fri-sun', label: 'Fr–So', hint: '2 Nächte', startOffset: -1, endOffset: 1 },
  { id: 'sat-sun', label: 'Sa–So', hint: '1 Nacht', startOffset: 0, endOffset: 1 },
  { id: 'thu-sun', label: 'Do–So', hint: '3 Nächte', startOffset: -2, endOffset: 1 },
  { id: 'fri-mon', label: 'Fr–Mo', hint: '3 Nächte', startOffset: -1, endOffset: 2 },
];

export interface Weekend {
  /** Eindeutig über Start und Ende, z. B. "2026-11-06_2026-11-08". */
  id: string;
  /** Der Samstag des Wochenendes (bestimmt die Monatsgruppe). */
  saturday: string;
  startDate: string;
  endDate: string;
  nights: number;
  label: string;
  /** Bundesweite Feiertage, die in das Wochenende fallen. */
  holidays: string[];
  /** true bei frei im Kalender gewähltem Zeitraum (kein Standard-Wochenende) */
  custom?: boolean;
}

/** Baut einen frei gewählten Zeitraum (mindestens 1 Nacht) als Terminoption. */
export function customRange(startDate: string, endDate: string): Weekend {
  return {
    id: `${startDate}_${endDate}`,
    saturday: startDate,
    startDate,
    endDate,
    nights: nightsBetween(startDate, endDate),
    label: `Eigener Zeitraum ${formatDateRange(startDate, endDate)}`,
    holidays: holidaysBetween(startDate, endDate),
    custom: true,
  };
}

export interface WeekendMonthGroup {
  key: string;
  title: string;
  weekends: Weekend[];
}

/** Ostersonntag (Gauß-/Anonymous-Gregorian-Algorithmus) als "JJJJ-MM-TT". */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return ymdFromDate(new Date(Date.UTC(year, month - 1, day)));
}

const holidayCache = new Map<number, Map<string, string>>();

/** Bundesweit einheitliche gesetzliche Feiertage (ohne regionale Feiertage). */
export function germanHolidays(year: number): Map<string, string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;

  const easter = easterSunday(year);
  const holidays = new Map<string, string>([
    [`${year}-01-01`, 'Neujahr'],
    [addDays(easter, -2), 'Karfreitag'],
    [addDays(easter, 1), 'Ostermontag'],
    [`${year}-05-01`, 'Tag der Arbeit'],
    [addDays(easter, 39), 'Christi Himmelfahrt'],
    [addDays(easter, 50), 'Pfingstmontag'],
    [`${year}-10-03`, 'Tag der Deutschen Einheit'],
    [`${year}-12-25`, '1. Weihnachtstag'],
    [`${year}-12-26`, '2. Weihnachtstag'],
  ]);
  holidayCache.set(year, holidays);
  return holidays;
}

/** Namen der bundesweiten Feiertage, die zwischen zwei Daten (inklusive) liegen. */
export function holidaysBetween(startYmd: string, endYmd: string): string[] {
  const names: string[] = [];
  const startYear = dateFromYmd(startYmd).getUTCFullYear();
  const endYear = dateFromYmd(endYmd).getUTCFullYear();
  for (let year = startYear; year <= endYear; year++) {
    for (const [ymd, name] of germanHolidays(year)) {
      if (ymd >= startYmd && ymd <= endYmd) names.push(name);
    }
  }
  return names;
}

export function weekendLabel(startDate: string, endDate: string): string {
  return `Wochenende ${formatDateRange(startDate, endDate)}`;
}

export function todayYmd(): string {
  const now = new Date();
  return ymdFromDate(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

export interface MonthOption {
  value: string; // "JJJJ-MM"
  label: string;
}

/** Monate ab dem aktuellen Monat als Auswahlliste. */
export function monthOptions(count = 18, from: string = todayYmd()): MonthOption[] {
  const start = dateFromYmd(from);
  const options: MonthOption[] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    options.push({
      value: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`,
      label: monthYearLabel(date.getUTCMonth(), date.getUTCFullYear()),
    });
  }
  return options;
}

function monthStart(value: string): string {
  return `${value}-01`;
}

function monthEnd(value: string): string {
  const [year, month] = value.split('-').map(Number);
  return ymdFromDate(new Date(Date.UTC(year, month, 0)));
}

/**
 * Erzeugt alle Wochenenden, deren Samstag im Zeitraum [fromMonth, toMonth] liegt.
 * Vergangene Wochenenden (Start vor heute) werden ausgelassen.
 */
export function generateWeekends(params: {
  fromMonth: string;
  toMonth: string;
  kind: WeekendKind;
  today?: string;
}): Weekend[] {
  const { fromMonth, toMonth, kind } = params;
  const today = params.today ?? todayYmd();
  const def = WEEKEND_KINDS.find((k) => k.id === kind) ?? WEEKEND_KINDS[0];

  const rangeStart = monthStart(fromMonth);
  const rangeEnd = monthEnd(toMonth);
  if (rangeEnd < rangeStart) return [];

  const first = dateFromYmd(rangeStart);
  const daysUntilSaturday = (6 - first.getUTCDay() + 7) % 7;
  let saturday = addDays(rangeStart, daysUntilSaturday);

  const weekends: Weekend[] = [];
  while (saturday <= rangeEnd) {
    const startDate = addDays(saturday, def.startOffset);
    const endDate = addDays(saturday, def.endOffset);
    if (startDate >= today) {
      weekends.push({
        id: `${startDate}_${endDate}`,
        saturday,
        startDate,
        endDate,
        nights: nightsBetween(startDate, endDate),
        label: weekendLabel(startDate, endDate),
        holidays: holidaysBetween(startDate, endDate),
      });
    }
    saturday = addDays(saturday, 7);
  }
  return weekends;
}

export function groupByMonth(weekends: Weekend[]): WeekendMonthGroup[] {
  const groups = new Map<string, WeekendMonthGroup>();
  for (const weekend of weekends) {
    const anchor = dateFromYmd(weekend.saturday);
    const key = `${anchor.getUTCFullYear()}-${String(anchor.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!groups.has(key)) {
      groups.set(key, { key, title: monthYearLabel(anchor.getUTCMonth(), anchor.getUTCFullYear()), weekends: [] });
    }
    groups.get(key)!.weekends.push(weekend);
  }
  return [...groups.values()];
}
