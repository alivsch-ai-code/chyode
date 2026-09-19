'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';
import type { TripStatus, TripType } from '@shared/types';
import { MountainArt } from '@/components/MountainArt';
import { Button, LinkButton } from '@/components/ui/Button';
import { Alert, Badge, PageLoading } from '@/components/ui/Feedback';
import { IconMapPin, IconUsers } from '@/components/ui/Icons';
import { ApiError, apiFetch, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { TRIP_TYPE_LABELS, pluralize } from '@/lib/format';

interface InvitePreview {
  trip: {
    id: string;
    title: string;
    location: string;
    trip_type: TripType;
    status: TripStatus;
    nights: number;
    creator_name: string | null;
  };
  participantCount: number;
}

export default function InvitePage({ params }: { params: { token: string } }) {
  const { token } = params;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data, error, isLoading } = useSWR<InvitePreview>(`/trips/invite/${encodeURIComponent(token)}`);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  async function join() {
    setJoinError(null);
    setJoining(true);
    try {
      const result = await apiFetch<{ tripId: string }>(`/trips/invite/${encodeURIComponent(token)}/join`, { method: 'POST' });
      router.replace(`/trips/${result.tripId}?tab=dates`);
    } catch (err) {
      setJoinError(errorMessage(err));
      setJoining(false);
    }
  }

  if (isLoading || authLoading) return <PageLoading label="Einladung wird geladen …" />;

  if (error || !data) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="mx-auto max-w-narrow pt-8">
        <Alert tone={notFound ? 'warning' : 'error'} title={notFound ? 'Einladung nicht gefunden' : 'Einladung konnte nicht geladen werden'}>
          {notFound ? 'Der Link ist ungültig oder die Reise wurde gelöscht. Frage nach einem neuen Link.' : errorMessage(error)}
        </Alert>
      </div>
    );
  }

  const { trip, participantCount } = data;
  const loginHref = `/login?next=${encodeURIComponent(`/invite/${token}`)}`;

  return (
    <div className="mx-auto w-full max-w-narrow animate-fade-up pt-2 sm:pt-8">
      <div className="card overflow-hidden">
        <div className="aspect-[2/1] w-full">
          <MountainArt hue={205} className="h-full w-full" />
        </div>
        <div className="space-y-6 p-6 sm:p-8">
          <div className="text-center">
            <p className="eyebrow">Einladung</p>
            <h1 className="mt-1.5 text-title1">{trip.title}</h1>
            <p className="mt-2 text-callout text-secondary">
              {trip.creator_name ? `${trip.creator_name} lädt dich ein, gemeinsam zu planen.` : 'Du wurdest zu einer Reise eingeladen.'}
            </p>
          </div>

          <ul className="flex flex-wrap justify-center gap-2">
            <li>
              <Badge>
                <IconMapPin size={13} /> {trip.location}
              </Badge>
            </li>
            <li>
              <Badge>{TRIP_TYPE_LABELS[trip.trip_type]}</Badge>
            </li>
            <li>
              <Badge>
                <IconUsers size={13} /> {pluralize(participantCount, 'Person', 'Personen')}
              </Badge>
            </li>
          </ul>

          {joinError && <Alert tone="error">{joinError}</Alert>}

          {user ? (
            trip.status === 'voting' ? (
              <div className="space-y-3">
                <Button size="lg" fullWidth loading={joining} onClick={join}>
                  Reise beitreten
                </Button>
                <p className="text-center text-footnote text-secondary">Du trittst als {user.name ?? user.email} bei.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Alert tone="info">Die Abstimmung ist beendet. Falls du bereits dabei bist, findest du die Reise unter „Meine Reisen“.</Alert>
                <LinkButton href="/" variant="plain" size="lg" fullWidth>
                  Zu meinen Reisen
                </LinkButton>
              </div>
            )
          ) : (
            <div className="space-y-3">
              <LinkButton href={loginHref} size="lg" fullWidth>
                Anmelden und beitreten
              </LinkButton>
              <p className="text-center text-footnote text-secondary">
                Für die Teilnahme brauchst du ein Konto. Der Zugang erfolgt per Einladung durch einen Administrator.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
