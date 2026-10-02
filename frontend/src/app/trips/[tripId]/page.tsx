'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import useSWR from 'swr';
import type { TripDetailResponse } from '@shared/types';
import { ActivitiesTab } from '@/components/trip/ActivitiesTab';
import { DatesTab } from '@/components/trip/DatesTab';
import { GroceryTab } from '@/components/trip/GroceryTab';
import { IdeasTab } from '@/components/trip/IdeasTab';
import { LedgerTab } from '@/components/trip/LedgerTab';
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
  IconCompass,
  IconMapPin,
  IconMountain,
  IconNote,
  IconReceipt,
  IconSparkles,
  IconTrophy,
  IconUsers,
  IconUtensils,
} from '@/components/ui/Icons';
import { Segmented, Tabs, type TabItem } from '@/components/ui/Segmented';
import { ApiError, errorMessage } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth';
import { TRIP_STATUS_LABELS } from '@/lib/format';

type TabId = 'overview' | 'dates' | 'prefs' | 'notes' | 'results' | 'stays' | 'food' | 'activities' | 'ledger' | 'ideas';
type GroupId = 'overview' | 'voting' | 'planning' | 'ledger' | 'more';

// Jede Gruppe ist ein Reiter oben; hat sie mehr als einen Unterpunkt, erscheint darunter eine
// kompakte zweite Auswahl. So bleibt die obere Leiste immer kurz und ruhig, egal wie viel die
// Reise schon enthält.
interface TabGroup {
  value: GroupId;
  label: string;
  icon: ReactNode;
  leaves: TabItem<TabId>[];
}

function groupsForMode(mode: 'voting' | 'planning'): TabGroup[] {
  const groups: TabGroup[] = [
    {
      value: 'overview',
      label: 'Übersicht',
      icon: <IconUsers size={17} />,
      leaves: [{ value: 'overview', label: 'Übersicht', icon: <IconUsers size={17} /> }],
    },
  ];
  if (mode === 'voting') {
    groups.push({
      value: 'voting',
      label: 'Abstimmung',
      icon: <IconCalendar size={17} />,
      leaves: [
        { value: 'dates', label: 'Termine', icon: <IconCalendar size={16} /> },
        { value: 'prefs', label: 'Präferenzen', icon: <IconSparkles size={16} /> },
        { value: 'results', label: 'Ergebnis', icon: <IconTrophy size={16} /> },
      ],
    });
  }
  groups.push({
    value: 'planning',
    label: 'Planung',
    icon: <IconBed size={17} />,
    leaves: [
      { value: 'stays', label: 'Unterkünfte', icon: <IconBed size={16} /> },
      { value: 'food', label: 'Essen', icon: <IconUtensils size={16} /> },
      { value: 'activities', label: 'Aktivitäten', icon: <IconCompass size={16} /> },
    ],
  });
  groups.push({
    value: 'ledger',
    label: 'Kasse',
    icon: <IconReceipt size={17} />,
    leaves: [{ value: 'ledger', label: 'Kasse', icon: <IconReceipt size={17} /> }],
  });
  groups.push({
    value: 'more',
    label: 'Mehr',
    icon: <IconNote size={17} />,
    leaves: [
      { value: 'notes', label: 'Notizen', icon: <IconNote size={16} /> },
      { value: 'ideas', label: 'Ideen', icon: <IconMountain size={16} /> },
    ],
  });
  return groups;
}

const ALL_TAB_IDS = [
  ...new Set([...groupsForMode('voting'), ...groupsForMode('planning')].flatMap((g) => g.leaves.map((l) => l.value))),
];
const isTabId = (value: string | null): value is TabId => ALL_TAB_IDS.includes(value as TabId);

export default function TripPage({ params }: { params: { tripId: string } }) {
  const { tripId } = params;
  const { allowed } = useRequireAuth();
  const { data, error, isLoading, mutate } = useSWR<TripDetailResponse>(allowed ? `/trips/${tripId}` : null, {
    // Teilnehmer erfahren so ohne Neuladen, wann der Ersteller die Auswertung freigibt
    refreshInterval: (latest) => (latest && latest.myRole !== 'creator' && !latest.resultsReleased ? 30_000 : 0),
  });
  const [tab, setTab] = useState<TabId>('overview');
  const [isNew, setIsNew] = useState(false);
  const groups = groupsForMode(data?.trip.mode === 'planning' ? 'planning' : 'voting');
  const activeGroup = groups.find((g) => g.leaves.some((l) => l.value === tab)) ?? groups[0];

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

  const changeGroup = (next: GroupId) => {
    const group = groups.find((g) => g.value === next);
    if (group) changeTab(group.leaves[0].value);
  };

  // Ist der aktuelle Tab im jetzigen Modus gar nicht verfügbar (z. B. nach einem Moduswechsel), zurück zur Übersicht
  useEffect(() => {
    if (data && !groups.some((g) => g.leaves.some((l) => l.value === tab))) changeTab('overview');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.trip.mode]);

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
              <Badge tone={trip.mode === 'planning' ? 'accent' : 'neutral'}>
                {trip.mode === 'planning' ? 'Planungsmodus' : 'Abstimmungsmodus'}
              </Badge>
              {isCreator && <Badge tone="accent">Du bist Ersteller</Badge>}
            </p>
          </div>
        </header>
        <Tabs
          tabs={groups.map((g) => ({ value: g.value, label: g.label, icon: g.icon }))}
          value={activeGroup.value}
          onChange={changeGroup}
          idPrefix="trip"
        />
        {activeGroup.leaves.length > 1 && (
          <Segmented
            ariaLabel={activeGroup.label}
            value={tab}
            onChange={changeTab}
            options={activeGroup.leaves.map((l) => ({ value: l.value, label: l.label }))}
          />
        )}
      </div>

      <div id={`trip-panel-${tab}`} role="tabpanel" aria-labelledby={`trip-tab-${tab}`} tabIndex={0} className="outline-none">
        {tab === 'overview' && (
          <OverviewTab detail={data} onChanged={() => mutate()} onOpenLedger={() => changeTab('ledger')} isNew={isNew} />
        )}
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
        {tab === 'stays' && (
          <StaysTab
            tripId={trip.id}
            trip={trip}
            isCreator={isCreator}
            canSeeResults={canSeeResults}
            participants={participants}
            myParticipantId={myParticipantId}
            onTripChanged={() => mutate()}
          />
        )}
        {tab === 'food' && <GroceryTab tripId={trip.id} myParticipantId={myParticipantId} />}
        {tab === 'activities' && <ActivitiesTab tripId={trip.id} myParticipantId={myParticipantId} />}
        {tab === 'ledger' && (
          <LedgerTab tripId={trip.id} trip={trip} myParticipantId={myParticipantId} participants={participants} />
        )}
        {tab === 'ideas' && <IdeasTab tripId={trip.id} canSeeResults={canSeeResults} />}
      </div>
    </div>
  );
}
