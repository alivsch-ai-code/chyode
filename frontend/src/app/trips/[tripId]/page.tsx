'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import type { TripDetailResponse } from '@shared/types';
import { DatesTab } from '@/components/trip/DatesTab';
import { IdeasTab } from '@/components/trip/IdeasTab';
import { NotesTab } from '@/components/trip/NotesTab';
import { OverviewTab } from '@/components/trip/OverviewTab';
import { PreferencesTab } from '@/components/trip/PreferencesTab';
import { ResultsTab } from '@/components/trip/ResultsTab';
import { StaysTab } from '@/components/trip/StaysTab';
import { Alert, Badge, PageLoading } from '@/components/ui/Feedback';
import {
  IconBed,
  IconCalendar,
  IconChevronLeft,
  IconMapPin,
  IconMountain,
  IconNote,
  IconSparkles,
  IconTrophy,
  IconUsers,
} from '@/components/ui/Icons';
import { Tabs, type TabItem } from '@/components/ui/Segmented';
import { ApiError, errorMessage } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth';
import { TRIP_STATUS_LABELS } from '@/lib/format';

type TabId = 'overview' | 'dates' | 'prefs' | 'notes' | 'results' | 'stays' | 'ideas';

const TABS: TabItem<TabId>[] = [
  { value: 'overview', label: 'Übersicht', icon: <IconUsers size={17} /> },
  { value: 'dates', label: 'Termine', icon: <IconCalendar size={17} /> },
  { value: 'prefs', label: 'Präferenzen', icon: <IconSparkles size={17} /> },
  { value: 'notes', label: 'Notizen', icon: <IconNote size={17} /> },
  { value: 'results', label: 'Ergebnis', icon: <IconTrophy size={17} /> },
  { value: 'stays', label: 'Unterkünfte', icon: <IconBed size={17} /> },
  { value: 'ideas', label: 'Ideen', icon: <IconMountain size={17} /> },
];

const isTabId = (value: string | null): value is TabId => TABS.some((t) => t.value === value);

export default function TripPage({ params }: { params: { tripId: string } }) {
  const { tripId } = params;
  const { allowed } = useRequireAuth();
  const { data, error, isLoading, mutate } = useSWR<TripDetailResponse>(allowed ? `/trips/${tripId}` : null, {
    // Teilnehmer erfahren so ohne Neuladen, wann der Ersteller die Auswertung freigibt
    refreshInterval: (latest) => (latest && latest.myRole !== 'creator' && !latest.resultsReleased ? 30_000 : 0),
  });
  const [tab, setTab] = useState<TabId>('overview');
  const [isNew, setIsNew] = useState(false);

  // Tab und "neu erstellt"-Hinweis aus der URL übernehmen
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const fromUrl = search.get('tab');
    if (isTabId(fromUrl)) setTab(fromUrl);
    if (search.get('neu') === '1') setIsNew(true);
  }, []);

  const changeTab = (next: TabId) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    url.searchParams.delete('neu');
    window.history.replaceState(null, '', url);
    setIsNew(false);
  };

  if (!allowed) return <PageLoading />;
  if (isLoading) return <PageLoading label="Reise wird geladen …" />;

  if (error || !data) {
    const status = error instanceof ApiError ? error.status : 0;
    return (
      <div className="mx-auto max-w-narrow space-y-5 pt-8 text-center">
        <Alert tone="error" title={status === 403 || status === 404 ? 'Kein Zugriff auf diese Reise' : 'Reise konnte nicht geladen werden'}>
          {status === 403 || status === 404
            ? 'Du bist kein Teilnehmer dieser Reise oder sie existiert nicht. Öffne den Einladungslink, um beizutreten.'
            : errorMessage(error)}
        </Alert>
        <Link href="/" className="inline-block text-callout text-accent hover:underline">
          Zu meinen Reisen
        </Link>
      </div>
    );
  }

  const { trip, participants, myRole, myParticipantId, resultsReleased } = data;
  const isCreator = myRole === 'creator';
  // Ersteller sehen die Auswertung immer, Teilnehmer erst nach Freigabe
  const canSeeResults = isCreator || resultsReleased;

  return (
    <div className="animate-fade-up space-y-8">
      <div className="space-y-4">
        <Link href="/" className="inline-flex items-center gap-1 text-subhead text-accent hover:underline">
          <IconChevronLeft size={16} /> Meine Reisen
        </Link>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-title1 sm:text-[2.25rem]">{trip.title}</h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-callout text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <IconMapPin size={16} /> {trip.location}
              </span>
              <Badge tone={trip.status === 'voting' ? 'success' : 'neutral'}>{TRIP_STATUS_LABELS[trip.status]}</Badge>
              {isCreator && <Badge tone="accent">Du bist Ersteller</Badge>}
            </p>
          </div>
        </header>
        <Tabs tabs={TABS} value={tab} onChange={changeTab} idPrefix="trip" />
      </div>

      <div id={`trip-panel-${tab}`} role="tabpanel" aria-labelledby={`trip-tab-${tab}`} tabIndex={0} className="outline-none">
        {tab === 'overview' && <OverviewTab detail={data} onChanged={() => mutate()} isNew={isNew} />}
        {tab === 'dates' && (
          <DatesTab
            tripId={trip.id}
            votingOpen={trip.status === 'voting'}
            isCreator={isCreator}
            canSeeResults={canSeeResults}
            myParticipantId={myParticipantId}
            participantCount={participants.length}
          />
        )}
        {tab === 'prefs' && <PreferencesTab tripId={trip.id} votingOpen={trip.status === 'voting'} />}
        {tab === 'notes' && <NotesTab tripId={trip.id} myParticipantId={myParticipantId} />}
        {tab === 'results' && (
          <ResultsTab
            tripId={trip.id}
            isCreator={isCreator}
            resultsReleased={resultsReleased}
            progress={data.progress}
            onReleaseChanged={() => mutate()}
          />
        )}
        {tab === 'stays' && <StaysTab tripId={trip.id} isCreator={isCreator} canSeeResults={canSeeResults} />}
        {tab === 'ideas' && <IdeasTab tripId={trip.id} canSeeResults={canSeeResults} />}
      </div>
    </div>
  );
}
