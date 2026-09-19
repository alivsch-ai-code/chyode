import type { TripStatus, TripType } from '@shared/types';

const LOCALE = 'de-DE';

/** Backend liefert Datumsfelder teils als ISO-Zeitstempel – wir brauchen nur "JJJJ-MM-TT". */
export function toYmd(value: string): string {
  return value.slice(0, 10);
}

export function dateFromYmd(ymd: string): Date {
  const [y, m, d] = toYmd(ymd).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function ymdFromDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(ymd: string, days: number): string {
  const date = dateFromYmd(ymd);
  date.setUTCDate(date.getUTCDate() + days);
  return ymdFromDate(date);
}

export function nightsBetween(startYmd: string, endYmd: string): number {
  const ms = dateFromYmd(endYmd).getTime() - dateFromYmd(startYmd).getTime();
  return Math.round(ms / 86_400_000);
}

const dayMonth = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', timeZone: 'UTC' });
const dayMonthYear = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const longDate = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const weekdayShortFmt = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', timeZone: 'UTC' });
const monthLong = new Intl.DateTimeFormat(LOCALE, { month: 'long', timeZone: 'UTC' });
const monthLongYear = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric', timeZone: 'UTC' });
const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' });

/** "6.–8. Nov. 2026" bzw. "30. Okt. – 2. Nov. 2026". */
export function formatDateRange(startValue: string, endValue: string): string {
  const start = dateFromYmd(startValue);
  const end = dateFromYmd(endValue);
  if (start.getTime() === end.getTime()) return dayMonthYear.format(start);

  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth();

  if (sameMonth) {
    return `${start.getUTCDate()}.–${dayMonthYear.format(end)}`;
  }
  if (sameYear) {
    return `${dayMonth.format(start)} – ${dayMonthYear.format(end)}`;
  }
  return `${dayMonthYear.format(start)} – ${dayMonthYear.format(end)}`;
}

/** Kurzform ohne Jahr: "6.–8. Nov." bzw. "30. Okt. – 2. Nov.". */
export function formatShortRange(startValue: string, endValue: string): string {
  const start = dateFromYmd(startValue);
  const end = dateFromYmd(endValue);
  if (start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear()) {
    return `${start.getUTCDate()}.–${dayMonth.format(end)}`;
  }
  return `${dayMonth.format(start)} – ${dayMonth.format(end)}`;
}

/** "Freitag, 6. November 2026". */
export function formatLongDate(value: string): string {
  return longDate.format(dateFromYmd(value));
}

/** "Fr." */
export function weekdayShort(value: string): string {
  return weekdayShortFmt.format(dateFromYmd(value));
}

export function monthName(monthIndex: number, year: number): string {
  return monthLong.format(new Date(Date.UTC(year, monthIndex, 1)));
}

export function monthYearLabel(monthIndex: number, year: number): string {
  return monthLongYear.format(new Date(Date.UTC(year, monthIndex, 1)));
}

export function formatDateTime(iso: string): string {
  return dateTimeFmt.format(new Date(iso));
}

export function formatMoney(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat(LOCALE, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export const TRIP_TYPE_LABELS: Record<TripType, string> = {
  hut: 'Berghütte',
  chalet: 'Chalet & Ferienhaus',
  hotel: 'Hotel',
  wellness: 'Wellness- & Spa-Hotel',
  apartment: 'Ferienwohnung',
  glamping: 'Glamping & Camping',
  other: 'Sonstiges',
};

/** ISO-8601-Kalenderwoche (die Woche mit dem ersten Donnerstag des Jahres ist KW 1). */
export function isoWeek(value: string): number {
  const date = dateFromYmd(value);
  const weekday = date.getUTCDay() || 7; // Mo = 1 … So = 7
  date.setUTCDate(date.getUTCDate() + 4 - weekday); // Donnerstag derselben Woche
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.ceil(((date.getTime() - yearStart) / 86_400_000 + 1) / 7);
}

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  voting: 'Abstimmung läuft',
  closed: 'Abstimmung beendet',
  booked: 'Gebucht',
};

export function initials(name: string | null | undefined, fallback = '?'): string {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}
