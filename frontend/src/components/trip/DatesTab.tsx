'use client';

import { useMemo, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import type { DateOption, Vote } from '@shared/types';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog';
import { Alert, Avatar, Badge, EmptyState, ProgressBar, Skeleton } from '@/components/ui/Feedback';
import { IconCalendar, IconCheck, IconMinus, IconPlus, IconTrash } from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import { WeekendPicker } from '@/components/WeekendPicker';
import { apiFetch, errorMessage } from '@/lib/api';
import {
  dateFromYmd,
  formatDateRange,
  nightsBetween,
  pluralize,
  toYmd,
  weekdayShort,
} from '@/lib/format';
import { holidaysBetween, type Weekend } from '@/lib/weekends';

type VoteRow = Vote & { voter_name: string };

const monthShort = new Intl.DateTimeFormat('de-DE', { month: 'short', timeZone: 'UTC' });

export function DatesTab({
  tripId,
  votingOpen,
  isCreator,
  participantCount,
}: {
  tripId: string;
  votingOpen: boolean;
  isCreator: boolean;
  participantCount: number;
}) {
  const { toast } = useToast();
  const { mutate: mutateGlobal } = useSWRConfig();
  const optionsKey = `/trips/${tripId}/date-options`;
  const votesKey = `/trips/${tripId}/votes`;
  const myVotesKey = `/trips/${tripId}/votes/me`;

  const options = useSWR<{ dateOptions: DateOption[] }>(optionsKey);
  const votes = useSWR<{ votes: VoteRow[] }>(votesKey);
  const myVotes = useSWR<{ votes: Vote[] }>(myVotesKey);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newWeekends, setNewWeekends] = useState<Weekend[]>([]);
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<DateOption | null>(null);

  const refreshVotes = async () => {
    await Promise.all([
      votes.mutate(),
      myVotes.mutate(),
      mutateGlobal(`/trips/${tripId}/results`),
    ]);
  };

  const votesByOption = useMemo(() => {
    const map = new Map<string, VoteRow[]>();
    for (const vote of votes.data?.votes ?? []) {
      map.set(vote.date_option_id, [...(map.get(vote.date_option_id) ?? []), vote]);
    }
    return map;
  }, [votes.data]);

  const myVoteByOption = useMemo(
    () => new Map((myVotes.data?.votes ?? []).map((v) => [v.date_option_id, v])),
    [myVotes.data]
  );

  const leaderId = useMemo(() => {
    let best: { id: string; people: number } | null = null;
    let tie = false;
    for (const option of options.data?.dateOptions ?? []) {
      const people = (votesByOption.get(option.id) ?? []).reduce((sum, v) => sum + v.people_count, 0);
      if (people === 0) continue;
      if (!best || people > best.people) {
        best = { id: option.id, people };
        tie = false;
      } else if (people === best.people) {
        tie = true;
      }
    }
    return best && !tie ? best.id : null;
  }, [options.data, votesByOption]);

  async function setVote(optionId: string, peopleCount: number) {
    setBusyId(optionId);
    try {
      await apiFetch(votesKey, { method: 'POST', body: { dateOptionId: optionId, peopleCount } });
      await refreshVotes();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function withdraw(optionId: string) {
    setBusyId(optionId);
    try {
      await apiFetch(`${votesKey}/${optionId}`, { method: 'DELETE' });
      await refreshVotes();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function addWeekends() {
    setAddError(null);
    setAddBusy(true);
    try {
      await apiFetch(optionsKey, {
        method: 'POST',
        body: {
          dateOptions: newWeekends.map((w) => ({ label: w.label, startDate: w.startDate, endDate: w.endDate })),
        },
      });
      await options.mutate();
      toast(pluralize(newWeekends.length, 'Termin hinzugefügt', 'Termine hinzugefügt'), 'success');
      setAdding(false);
      setNewWeekends([]);
    } catch (err) {
      setAddError(errorMessage(err));
    } finally {
      setAddBusy(false);
    }
  }

  async function removeOption(option: DateOption) {
    await apiFetch(`${optionsKey}/${option.id}`, { method: 'DELETE' });
    await Promise.all([options.mutate(), refreshVotes()]);
    toast('Termin entfernt', 'success');
  }

  const existingIds = (options.data?.dateOptions ?? []).map((o) => `${toYmd(o.start_date)}_${toYmd(o.end_date)}`);

  if (options.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }
  if (options.error) return <Alert tone="error">{errorMessage(options.error)}</Alert>;

  const list = options.data?.dateOptions ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-title2">Wann passt es dir?</h2>
          <p className="mt-1 text-callout text-secondary">
            {votingOpen
              ? 'Markiere alle Wochenenden, an denen du kannst, und gib an, wie viele Personen mitkommen.'
              : 'Die Abstimmung ist beendet – die Auswertung findest du unter „Ergebnis“.'}
          </p>
        </div>
        {isCreator && (
          <Button variant="tinted" icon={<IconPlus size={18} />} onClick={() => setAdding(true)}>
            Wochenenden hinzufügen
          </Button>
        )}
      </div>

      {!votingOpen && <Alert tone="info">Die Abstimmung ist geschlossen. Stimmen können nicht mehr geändert werden.</Alert>}

      {list.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconCalendar size={26} />}
            title="Noch keine Termine"
            action={
              isCreator ? (
                <Button icon={<IconPlus size={18} />} onClick={() => setAdding(true)}>
                  Wochenenden hinzufügen
                </Button>
              ) : undefined
            }
          >
            {isCreator ? 'Schlage Wochenenden vor, über die deine Gruppe abstimmen kann.' : 'Der Ersteller hat noch keine Termine vorgeschlagen.'}
          </EmptyState>
        </div>
      ) : (
        <ul className="space-y-3.5">
          {list.map((option) => {
            const start = toYmd(option.start_date);
            const end = toYmd(option.end_date);
            const optionVotes = votesByOption.get(option.id) ?? [];
            const totalPeople = optionVotes.reduce((sum, v) => sum + v.people_count, 0);
            const mine = myVoteByOption.get(option.id);
            const busy = busyId === option.id;
            const holidays = holidaysBetween(start, end);
            const startDate = dateFromYmd(start);
            const isLeader = leaderId === option.id;

            return (
              <li
                key={option.id}
                className={`card overflow-hidden p-5 transition ${mine ? 'ring-2 ring-accent/70' : ''}`}
              >
                <div className="flex gap-4 sm:gap-5">
                  <div
                    aria-hidden="true"
                    className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-control bg-grouped"
                  >
                    <span className="text-caption font-semibold uppercase tracking-wide text-danger">
                      {monthShort.format(startDate).replace('.', '')}
                    </span>
                    <span className="text-title2 leading-none">{startDate.getUTCDate()}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-headline">{formatDateRange(start, end)}</h3>
                      {isLeader && <Badge tone="success">Favorit</Badge>}
                      {holidays.map((name) => (
                        <Badge key={name} tone="warning">
                          {name}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-0.5 text-subhead text-secondary">
                      {weekdayShort(start)} – {weekdayShort(end)} · {pluralize(nightsBetween(start, end), 'Nacht', 'Nächte')}
                    </p>

                    <div className="mt-4 space-y-2">
                      <ProgressBar
                        value={optionVotes.length}
                        max={Math.max(participantCount, optionVotes.length, 1)}
                        label={`Zusagen für ${formatDateRange(start, end)}`}
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-footnote text-secondary">
                          {optionVotes.length === 0
                            ? 'Noch keine Zusagen'
                            : `${pluralize(optionVotes.length, 'Zusage', 'Zusagen')} · ${pluralize(totalPeople, 'Person', 'Personen')}`}
                        </p>
                        {optionVotes.length > 0 && (
                          <ul className="flex -space-x-1" aria-label="Zugesagt haben">
                            {optionVotes.slice(0, 5).map((v) => (
                              <li key={v.id} title={`${v.voter_name} (${v.people_count})`} className="rounded-full ring-2 ring-surface">
                                <Avatar name={v.voter_name} size={26} />
                              </li>
                            ))}
                            {optionVotes.length > 5 && (
                              <li className="flex h-[26px] items-center rounded-full bg-fill/15 px-2 text-caption text-secondary ring-2 ring-surface">
                                +{optionVotes.length - 5}
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-line/60 pt-4">
                  {mine ? (
                    <>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-3 py-1.5 text-subhead font-medium text-success">
                        <IconCheck size={16} strokeWidth={2.5} /> Du kommst mit
                      </span>
                      <div
                        role="group"
                        aria-label="Anzahl Personen"
                        className="inline-flex items-center rounded-full bg-fill/15"
                      >
                        <button
                          type="button"
                          aria-label="Eine Person weniger"
                          disabled={!votingOpen || busy || mine.people_count <= 1}
                          onClick={() => setVote(option.id, mine.people_count - 1)}
                          className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-fill/20 disabled:opacity-40"
                        >
                          <IconMinus size={16} />
                        </button>
                        <span className="min-w-[5.5rem] text-center text-subhead font-medium tabular-nums" aria-live="polite">
                          {pluralize(mine.people_count, 'Person', 'Personen')}
                        </span>
                        <button
                          type="button"
                          aria-label="Eine Person mehr"
                          disabled={!votingOpen || busy || mine.people_count >= 20}
                          onClick={() => setVote(option.id, mine.people_count + 1)}
                          className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-fill/20 disabled:opacity-40"
                        >
                          <IconPlus size={16} />
                        </button>
                      </div>
                      {votingOpen && (
                        <Button size="sm" variant="plain" loading={busy} onClick={() => withdraw(option.id)}>
                          Zurückziehen
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button size="sm" loading={busy} disabled={!votingOpen} onClick={() => setVote(option.id, 1)}>
                      Passt mir
                    </Button>
                  )}

                  {isCreator && (
                    <Button
                      size="sm"
                      variant="danger"
                      className="ml-auto"
                      icon={<IconTrash size={16} />}
                      onClick={() => setRemoving(option)}
                      aria-label={`Termin ${formatDateRange(start, end)} entfernen`}
                    >
                      Entfernen
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={adding} onClose={() => setAdding(false)} title="Wochenenden hinzufügen" size="lg">
        <h2 className="text-title2">Wochenenden hinzufügen</h2>
        <p className="mb-6 mt-1 text-callout text-secondary">Wähle weitere Termine, über die abgestimmt werden soll.</p>
        {addError && <Alert tone="error" className="mb-5">{addError}</Alert>}
        <WeekendPicker selected={newWeekends} onChange={setNewWeekends} excludeIds={existingIds} />
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="plain" onClick={() => setAdding(false)} disabled={addBusy}>
            Abbrechen
          </Button>
          <Button onClick={addWeekends} loading={addBusy} disabled={newWeekends.length === 0}>
            {newWeekends.length > 0 ? `${pluralize(newWeekends.length, 'Termin', 'Termine')} hinzufügen` : 'Hinzufügen'}
          </Button>
        </div>
      </Dialog>

      <ConfirmDialog
        open={removing !== null}
        danger
        title="Termin entfernen?"
        message="Der Termin und alle dafür abgegebenen Stimmen werden gelöscht."
        confirmLabel="Entfernen"
        onConfirm={() => (removing ? removeOption(removing) : undefined)}
        onClose={() => setRemoving(null)}
      />
    </div>
  );
}
