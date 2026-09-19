import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, formatDateRange, formatShortRange, isoWeek, nightsBetween } from '../src/lib/format';
import {
  customRange,
  easterSunday,
  generateWeekends,
  germanHolidays,
  groupByMonth,
  holidaysBetween,
  monthOptions,
} from '../src/lib/weekends';

test('isoWeek: bekannte Kalenderwochen (ISO 8601)', () => {
  assert.equal(isoWeek('2026-11-06'), 45);
  assert.equal(isoWeek('2026-01-01'), 1); // Donnerstag -> KW 1
  assert.equal(isoWeek('2026-12-31'), 53); // 2026 hat 53 Wochen
  assert.equal(isoWeek('2027-01-01'), 53); // Freitag gehört noch zur KW 53 des Vorjahres
  assert.equal(isoWeek('2024-12-30'), 1); // Montag gehört schon zur KW 1 von 2025
  assert.equal(isoWeek('2026-11-08'), 45); // Sonntag gehört zur selben Woche wie der Montag
  assert.equal(isoWeek('2026-11-09'), 46);
});

test('Datums-Arithmetik und Nächte', () => {
  assert.equal(addDays('2026-02-27', 2), '2026-03-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(nightsBetween('2026-11-06', '2026-11-08'), 2);
  assert.equal(nightsBetween('2026-10-30', '2026-11-02'), 3);
});

test('Datumsformate', () => {
  assert.equal(formatShortRange('2026-11-06', '2026-11-08'), '6.–8. Nov.');
  assert.equal(formatShortRange('2026-10-30', '2026-11-01'), '30. Okt. – 1. Nov.');
  assert.equal(formatDateRange('2026-11-06', '2026-11-08'), '6.–8. Nov. 2026');
});

test('easterSunday: bekannte Termine', () => {
  assert.equal(easterSunday(2024), '2024-03-31');
  assert.equal(easterSunday(2026), '2026-04-05');
  assert.equal(easterSunday(2027), '2027-03-28');
});

test('Feiertage 2026: Ostern-abhängige und feste Tage', () => {
  const holidays = germanHolidays(2026);
  assert.equal(holidays.get('2026-04-03'), 'Karfreitag');
  assert.equal(holidays.get('2026-04-06'), 'Ostermontag');
  assert.equal(holidays.get('2026-05-14'), 'Christi Himmelfahrt');
  assert.equal(holidays.get('2026-05-25'), 'Pfingstmontag');
  assert.equal(holidays.get('2026-10-03'), 'Tag der Deutschen Einheit');
  assert.equal(holidays.get('2026-12-25'), '1. Weihnachtstag');
  assert.equal(holidays.size, 9);
});

test('holidaysBetween: findet Feiertage im Zeitraum, auch über Jahresgrenzen', () => {
  assert.deepEqual(holidaysBetween('2026-10-02', '2026-10-04'), ['Tag der Deutschen Einheit']);
  assert.deepEqual(holidaysBetween('2026-11-06', '2026-11-08'), []);
  assert.deepEqual(holidaysBetween('2026-12-31', '2027-01-02'), ['Neujahr']);
});

test('generateWeekends: Fr–So im Oktober bis November 2026', () => {
  const weekends = generateWeekends({ fromMonth: '2026-10', toMonth: '2026-11', kind: 'fri-sun', today: '2026-09-19' });
  // Samstage: 3., 10., 17., 24., 31. Okt und 7., 14., 21., 28. Nov -> 9 Wochenenden
  assert.equal(weekends.length, 9);
  assert.deepEqual([weekends[0].startDate, weekends[0].endDate], ['2026-10-02', '2026-10-04']);
  assert.equal(weekends[0].nights, 2);
  assert.deepEqual(weekends[0].holidays, ['Tag der Deutschen Einheit']);
  assert.equal(weekends[4].startDate, '2026-10-30'); // Wochenende über den Monatswechsel
  assert.equal(weekends[4].endDate, '2026-11-01');
  assert.ok(weekends.every((w) => new Date(w.saturday + 'T00:00:00Z').getUTCDay() === 6));
});

test('generateWeekends: Varianten und vergangene Wochenenden', () => {
  const frMo = generateWeekends({ fromMonth: '2026-11', toMonth: '2026-11', kind: 'fri-mon', today: '2026-09-19' });
  assert.equal(frMo[0].nights, 3);
  assert.equal(frMo[0].endDate, '2026-11-09');

  const saSo = generateWeekends({ fromMonth: '2026-11', toMonth: '2026-11', kind: 'sat-sun', today: '2026-09-19' });
  assert.equal(saSo[0].nights, 1);

  // Beginnt das Wochenende vor "heute", wird es ausgelassen
  const past = generateWeekends({ fromMonth: '2026-11', toMonth: '2026-11', kind: 'fri-sun', today: '2026-11-10' });
  assert.equal(past[0].startDate, '2026-11-13');

  assert.deepEqual(generateWeekends({ fromMonth: '2026-12', toMonth: '2026-11', kind: 'fri-sun', today: '2026-09-19' }), []);
});

test('groupByMonth: gruppiert nach dem Monat des Samstags', () => {
  const weekends = generateWeekends({ fromMonth: '2026-10', toMonth: '2026-11', kind: 'fri-sun', today: '2026-09-19' });
  const groups = groupByMonth(weekends);
  assert.deepEqual(
    groups.map((g) => [g.key, g.weekends.length]),
    [
      ['2026-10', 5],
      ['2026-11', 4],
    ]
  );
});

test('customRange: eigener Zeitraum mit Nächten, Feiertagen und eindeutiger ID', () => {
  const range = customRange('2026-12-24', '2026-12-27');
  assert.equal(range.id, '2026-12-24_2026-12-27');
  assert.equal(range.nights, 3);
  assert.equal(range.custom, true);
  assert.deepEqual(range.holidays, ['1. Weihnachtstag', '2. Weihnachtstag']);
  assert.ok(range.label.startsWith('Eigener Zeitraum'));
});

test('monthOptions: beginnt mit dem Monat des Startdatums', () => {
  const options = monthOptions(3, '2026-11-15');
  assert.deepEqual(
    options.map((o) => o.value),
    ['2026-11', '2026-12', '2027-01']
  );
  assert.equal(options[0].label, 'November 2026');
});
