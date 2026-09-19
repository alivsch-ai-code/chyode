'use client';

import { useState } from 'react';
import useSWR from 'swr';
import type { BudgetStats, ChoiceCount, TripResults } from '@shared/types';
import { Button } from '@/components/ui/Button';
import { Alert, Badge, EmptyState, ProgressBar, Skeleton } from '@/components/ui/Feedback';
import { IconEyeLock, IconTrophy } from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import { ACCOMMODATION_TYPES, EXPERIENCES, type CatalogItem } from '@/lib/catalog';
import { apiFetch, errorMessage } from '@/lib/api';
import { formatDateRange, formatLongDate, formatMoney, pluralize, toYmd } from '@/lib/format';

export function ResultsTab({
  tripId,
  isCreator,
  resultsReleased,
  progress,
  onReleaseChanged,
}: {
  tripId: string;
  isCreator: boolean;
  resultsReleased: boolean;
  progress?: { voted: number; total: number };
  onReleaseChanged: () => Promise<unknown>;
}) {
  const { toast } = useToast();
  const canSee = isCreator || resultsReleased;
  const { data, error, isLoading } = useSWR<{ results: TripResults }>(canSee ? `/trips/${tripId}/results` : null);
  const [busy, setBusy] = useState(false);

  async function setReleased(release: boolean) {
    setBusy(true);
    try {
      await apiFetch(`/trips/${tripId}/${release ? 'release-results' : 'hide-results'}`, { method: 'POST' });
      await onReleaseChanged();
      toast(release ? 'Ergebnis für alle freigegeben' : 'Freigabe zurückgenommen', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!canSee) {
    return (
      <div className="card">
        <EmptyState icon={<IconEyeLock size={28} />} title="Das Ergebnis ist noch nicht freigegeben">
          Sobald alle abgestimmt haben und der Ersteller die Auswertung freigibt, siehst du hier Termin, Budget und Wünsche der
          Gruppe – und bekommst eine E-Mail.
        </EmptyState>
      </div>
    );
  }

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
        <p className="mt-1 text-callout text-secondary">So sieht die Gruppe Termine, Budget und Wünsche.</p>
      </div>

      {isCreator && (
        <section
          className={`rounded-card p-5 sm:p-6 ${resultsReleased ? 'bg-success/10' : 'bg-warning/10'}`}
          aria-labelledby="release-heading"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h3 id="release-heading" className="text-headline">
                {resultsReleased ? 'Für alle Teilnehmer freigegeben' : 'Nur für dich sichtbar'}
              </h3>
              <p className="mt-1 text-subhead text-secondary">
                {resultsReleased
                  ? 'Alle Teilnehmer sehen dieses Ergebnis. Sobald alle abgestimmt haben, erhalten sie eine E-Mail.'
                  : 'Teilnehmer sehen das Ergebnis erst, wenn du es freigibst. Danach bekommen alle eine E-Mail, sobald jeder abgestimmt hat.'}
              </p>
              {progress && (
                <p className="mt-1 text-subhead text-secondary">
                  {progress.voted} von {progress.total} haben abgestimmt.
                </p>
              )}
            </div>
            {resultsReleased ? (
              <Button variant="plain" loading={busy} onClick={() => setReleased(false)}>
                Freigabe zurücknehmen
              </Button>
            ) : (
              <Button loading={busy} onClick={() => setReleased(true)}>
                Für alle freigeben
              </Button>
            )}
          </div>
        </section>
      )}

      <section className="card p-6 sm:p-8" aria-labelledby="participation">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 id="participation" className="text-headline">
            Beteiligung
          </h3>
          <p className="text-subhead text-secondary">
            {results.votedParticipants} von {results.totalParticipants} haben abgestimmt · {results.preferencesSubmitted} haben
            Präferenzen angegeben
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

      <section className="card space-y-6 p-6 sm:p-8" aria-labelledby="budget-heading">
        <div>
          <h3 id="budget-heading" className="text-headline">
            Budget der Gruppe
          </h3>
          <p className="mt-1 text-subhead text-secondary">Höchstbeträge pro Person für den gesamten Aufenthalt.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <BudgetBlock title="Übernachtung" stats={results.budget.accommodation} />
          <BudgetBlock title="Aktivitäten" stats={results.budget.activities} />
          <BudgetBlock title="Gesamt" stats={results.budget.total} highlight />
        </div>
      </section>

      <ChoiceRanking
        title="Gewünschte Erlebnisse"
        emptyText="Noch keine Erlebniswünsche angegeben."
        items={EXPERIENCES}
        counts={results.experiences}
        participants={results.preferencesSubmitted}
      />
      <ChoiceRanking
        title="Bevorzugte Unterkunftsarten"
        emptyText="Noch keine Unterkunftswünsche angegeben."
        items={ACCOMMODATION_TYPES}
        counts={results.accommodationTypes}
        participants={results.preferencesSubmitted}
      />

      <section className="card p-6 sm:p-8" aria-labelledby="wishes">
        <h3 id="wishes" className="text-headline">
          Häufigste Wünsche aus den Notizen
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

function BudgetBlock({ title, stats, highlight = false }: { title: string; stats: BudgetStats; highlight?: boolean }) {
  const hasData = stats.count > 0 && stats.median !== null && stats.min !== null && stats.max !== null;
  const span = hasData ? Math.max(stats.max! - stats.min!, 1) : 1;
  const position = (value: number) => (hasData ? `${((value - stats.min!) / span) * 100}%` : '0%');

  return (
    <div className={`rounded-control p-5 ${highlight ? 'bg-accent/10' : 'bg-grouped'}`}>
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-subhead font-semibold">{title}</h4>
        <span className="text-footnote text-secondary">{pluralize(stats.count, 'Angabe', 'Angaben')}</span>
      </div>

      {hasData ? (
        <>
          <p className="mt-3 text-title2 tabular-nums">{formatMoney(stats.median!)}</p>
          <p className="text-footnote text-secondary">Median – die Hälfte der Gruppe möchte höchstens so viel ausgeben</p>

          <div className="relative mt-5 h-2 rounded-full bg-fill/20" aria-hidden="true">
            <span
              className="absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
              style={{ left: position(stats.median!) }}
            />
            {stats.average !== null && (
              <span
                className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-warning"
                style={{ left: position(stats.average) }}
              />
            )}
          </div>

          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Stat label="Minimum" value={formatMoney(stats.min!)} />
            <Stat label="Durchschnitt" value={stats.average !== null ? formatMoney(stats.average) : '–'} />
            <Stat label="Maximum" value={formatMoney(stats.max!)} />
          </dl>
        </>
      ) : (
        <p className="mt-3 text-callout text-secondary">Noch keine Angaben.</p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-caption text-secondary">{label}</dt>
      <dd className="text-subhead font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function ChoiceRanking<K extends string>({
  title,
  items,
  counts,
  participants,
  emptyText,
}: {
  title: string;
  items: CatalogItem<K>[];
  counts: ChoiceCount<K>[];
  participants: number;
  emptyText: string;
}) {
  const max = Math.max(1, participants, ...counts.map((c) => c.count));
  const lookup = new Map(items.map((item) => [item.key, item]));

  return (
    <section className="card p-6 sm:p-8" aria-label={title}>
      <h3 className="text-headline">{title}</h3>
      {counts.length === 0 ? (
        <p className="mt-2 text-callout text-secondary">{emptyText}</p>
      ) : (
        <ol className="mt-5 space-y-4">
          {counts.map((choice, index) => {
            const item = lookup.get(choice.key);
            if (!item) return null;
            const Icon = item.icon;
            return (
              <li key={choice.key}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2.5 text-callout font-medium">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-accent">
                      <Icon size={15} />
                    </span>
                    {item.label}
                  </p>
                  <p className="shrink-0 text-subhead text-secondary tabular-nums">{pluralize(choice.count, 'Stimme', 'Stimmen')}</p>
                </div>
                <div
                  role="img"
                  aria-label={`${choice.count} von ${max} Teilnehmern`}
                  className="h-2.5 overflow-hidden rounded-full bg-fill/15"
                >
                  <div
                    className={`h-full rounded-full transition-[width] duration-500 ${index === 0 ? 'bg-accent' : 'bg-accent/45'}`}
                    style={{ width: `${(choice.count / max) * 100}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
