'use client';

import useSWR from 'swr';
import type { TripResults } from '@shared/types';
import { Alert, Badge, EmptyState, ProgressBar, Skeleton } from '@/components/ui/Feedback';
import { IconTrophy } from '@/components/ui/Icons';
import { errorMessage } from '@/lib/api';
import { formatDateRange, formatLongDate, pluralize, toYmd } from '@/lib/format';

export function ResultsTab({ tripId }: { tripId: string }) {
  const { data, error, isLoading } = useSWR<{ results: TripResults }>(`/trips/${tripId}/results`);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-24" />
      </div>
    );
  }
  if (error) return <Alert tone="error">{errorMessage(error)}</Alert>;
  if (!data) return null;

  const { results } = data;
  const top = results.topDateOption;
  const maxPeople = Math.max(1, ...results.dateOptionRanking.map((o) => o.totalPeople));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-title2">Ergebnis</h2>
        <p className="mt-1 text-callout text-secondary">So sieht die Gruppe die Termine und Wünsche.</p>
      </div>

      <section className="card p-6 sm:p-8" aria-labelledby="participation">
        <div className="flex items-baseline justify-between gap-3">
          <h3 id="participation" className="text-headline">
            Beteiligung
          </h3>
          <p className="text-subhead text-secondary">
            {results.votedParticipants} von {results.totalParticipants} haben abgestimmt
          </p>
        </div>
        <div className="mt-3">
          <ProgressBar
            value={results.votedParticipants}
            max={Math.max(results.totalParticipants, 1)}
            label="Anteil der Teilnehmer, die abgestimmt haben"
          />
        </div>
      </section>

      {top ? (
        <section
          className="overflow-hidden rounded-card bg-accent p-6 text-white shadow-lift dark:text-black sm:p-8"
          aria-labelledby="top-date"
        >
          <p className="flex items-center gap-2 text-footnote font-semibold uppercase tracking-[0.08em] opacity-85">
            <IconTrophy size={16} /> Favorit
          </p>
          <h3 id="top-date" className="mt-2 text-title1 sm:text-[2.25rem]">
            {formatDateRange(toYmd(top.startDate), toYmd(top.endDate))}
          </h3>
          <p className="mt-1 text-callout opacity-90">
            {formatLongDate(toYmd(top.startDate))} bis {formatLongDate(toYmd(top.endDate))}
          </p>
          <p className="mt-5 text-headline">
            {pluralize(top.totalVotes, 'Zusage', 'Zusagen')} · {pluralize(top.totalPeople, 'Person', 'Personen')}
          </p>
          {top.voterNames.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Zugesagt haben">
              {top.voterNames.map((name) => (
                <li key={name} className="rounded-full bg-white/20 px-3 py-1 text-subhead dark:bg-black/15">
                  {name}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <div className="card">
          <EmptyState icon={<IconTrophy size={26} />} title="Noch kein Favorit">
            Sobald die ersten Stimmen eingehen, erscheint hier das beliebteste Wochenende.
          </EmptyState>
        </div>
      )}

      {results.dateOptionRanking.length > 0 && (
        <section className="card p-6 sm:p-8" aria-labelledby="ranking">
          <h3 id="ranking" className="text-headline">
            Alle Termine im Vergleich
          </h3>
          <ol className="mt-5 space-y-5">
            {results.dateOptionRanking.map((option, index) => (
              <li key={option.dateOptionId}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <p className="text-callout font-medium">
                    <span className="mr-2 text-secondary tabular-nums">{index + 1}.</span>
                    {formatDateRange(toYmd(option.startDate), toYmd(option.endDate))}
                  </p>
                  <p className="shrink-0 text-subhead text-secondary tabular-nums">
                    {pluralize(option.totalPeople, 'Person', 'Personen')}
                  </p>
                </div>
                <div
                  role="img"
                  aria-label={`${option.totalPeople} von maximal ${maxPeople} Personen`}
                  className="h-2.5 overflow-hidden rounded-full bg-fill/15"
                >
                  <div
                    className={`h-full rounded-full transition-[width] duration-500 ${index === 0 && option.totalPeople > 0 ? 'bg-accent' : 'bg-accent/45'}`}
                    style={{ width: `${(option.totalPeople / maxPeople) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="card p-6 sm:p-8" aria-labelledby="wishes">
        <h3 id="wishes" className="text-headline">
          Häufigste Wünsche
        </h3>
        {results.topWishes.length === 0 ? (
          <p className="mt-2 text-callout text-secondary">
            Noch keine erkannten Wünsche. Unter „Notizen“ kann die Gruppe Wünsche wie Sauna, Kamin oder Bergblick nennen.
          </p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2">
            {results.topWishes.map((wish) => (
              <li key={wish.keyword}>
                <Badge tone="accent" className="px-3.5 py-1.5 text-subhead">
                  <span className="capitalize">{wish.keyword}</span>
                  <span className="ml-1 rounded-full bg-accent/15 px-2 text-footnote tabular-nums">{wish.count}×</span>
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
