'use client';

import Link from 'next/link';
import useSWR from 'swr';
import type { MyTrip } from '@shared/types';
import { MountainArt } from '@/components/MountainArt';
import { LinkButton } from '@/components/ui/Button';
import { Alert, Badge, EmptyState, Skeleton } from '@/components/ui/Feedback';
import { IconBed, IconCalendar, IconChevronRight, IconMapPin, IconMountain, IconNote, IconPlus, IconUsers } from '@/components/ui/Icons';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { TRIP_STATUS_LABELS, TRIP_TYPE_LABELS, pluralize } from '@/lib/format';

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return user ? <Dashboard name={user.name ?? user.email} isAdmin={user.role === 'admin'} /> : <Landing />;
}

// ------------------------------------------------------------
// Startseite für Besucher
// ------------------------------------------------------------

const FEATURES = [
  {
    icon: <IconCalendar size={24} />,
    title: 'Wochenenden abstimmen',
    text: 'Wähle Wochenenden aus dem Kalender aus – die Gruppe stimmt ab, der Favorit steht sofort fest.',
  },
  {
    icon: <IconNote size={24} />,
    title: 'Wünsche sammeln',
    text: 'Sauna, Kamin, Bergblick: Alle teilen Wünsche und Ideen an einem Ort.',
  },
  {
    icon: <IconBed size={24} />,
    title: 'Unterkünfte finden',
    text: 'Passende Vorschläge mit Preis pro Person – abgestimmt auf Gruppe und Wünsche.',
  },
];

function Landing() {
  return (
    <div className="space-y-20 sm:space-y-28">
      <section className="animate-fade-up pt-4 text-center sm:pt-10">
        <p className="eyebrow">Reiseplaner</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-display">
          Gemeinsam planen.
          <br />
          <span className="text-secondary">Gemeinsam losziehen.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-body text-secondary sm:text-[1.3rem]">
          Die einfachste Art, mit Freunden ein Wochenende in den Bergen zu organisieren – vom Termin bis zur Unterkunft.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <LinkButton href="/login" size="lg">
            Anmelden
          </LinkButton>
        </div>
        <p className="mt-4 text-footnote text-secondary">Der Zugang ist nur mit Einladung möglich.</p>

        <div className="relative mx-auto mt-14 max-w-4xl overflow-hidden rounded-sheet shadow-lift">
          <div className="aspect-[2/1] sm:aspect-[21/9]">
            <MountainArt hue={208} className="h-full w-full" />
          </div>
        </div>
      </section>

      <section aria-label="Funktionen">
        <ul className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="card p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">{feature.icon}</span>
              <h2 className="mt-5 text-title3">{feature.title}</h2>
              <p className="mt-2 text-callout text-secondary">{feature.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ------------------------------------------------------------
// Dashboard für angemeldete Nutzer
// ------------------------------------------------------------

function hueFromId(id: string): number {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return 150 + (hash % 100);
}

function Dashboard({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  const { data, error, isLoading } = useSWR<{ trips: MyTrip[] }>('/trips');
  const firstName = name.includes('@') ? name.split('@')[0] : name.split(' ')[0];

  return (
    <div className="animate-fade-up space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Meine Reisen</p>
          <h1 className="mt-1 text-title1 sm:text-[2.25rem]">Hallo, {firstName}</h1>
        </div>
        <LinkButton href="/trips/create" icon={<IconPlus size={18} />}>
          Neue Reise
        </LinkButton>
      </header>

      {isLoading && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      )}
      {error && <Alert tone="error">{errorMessage(error)}</Alert>}

      {data && data.trips.length === 0 && (
        <div className="card">
          <EmptyState
            icon={<IconMountain size={28} />}
            title="Noch keine Reise"
            action={
              <LinkButton href="/trips/create" icon={<IconPlus size={18} />}>
                Erste Reise planen
              </LinkButton>
            }
          >
            Lege eine Reise an und lade deine Gruppe ein – oder öffne einen Einladungslink, den du erhalten hast.
          </EmptyState>
        </div>
      )}

      {data && data.trips.length > 0 && (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.trips.map((trip) => (
            <li key={trip.id}>
              <Link
                href={`/trips/${trip.id}`}
                className="card group flex h-full flex-col overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="aspect-[5/2] w-full overflow-hidden">
                  <MountainArt hue={hueFromId(trip.id)} className="h-full w-full transition duration-500 group-hover:scale-105" />
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-title3">{trip.title}</h2>
                    <IconChevronRight size={20} className="mt-1 shrink-0 text-tertiary transition group-hover:translate-x-0.5" />
                  </div>
                  <p className="flex items-center gap-1.5 text-subhead text-secondary">
                    <IconMapPin size={15} /> {trip.location} · {TRIP_TYPE_LABELS[trip.trip_type]}
                  </p>
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                    <Badge tone={trip.status === 'voting' ? 'success' : 'neutral'}>{TRIP_STATUS_LABELS[trip.status]}</Badge>
                    <Badge>
                      <IconUsers size={13} /> {pluralize(trip.participant_count, 'Person', 'Personen')}
                    </Badge>
                    {trip.my_role === 'creator' && <Badge tone="accent">Ersteller</Badge>}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {isAdmin && (
        <Link
          href="/admin"
          className="card flex items-center justify-between gap-4 p-5 transition hover:shadow-lift"
        >
          <div>
            <p className="text-headline">Verwaltung</p>
            <p className="text-subhead text-secondary">Personen einladen und Konten verwalten</p>
          </div>
          <IconChevronRight size={20} className="text-tertiary" />
        </Link>
      )}
    </div>
  );
}
