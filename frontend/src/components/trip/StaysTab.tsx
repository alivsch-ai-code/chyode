'use client';

import { useState } from 'react';
import useSWR from 'swr';
import type { AccommodationSuggestion } from '@shared/types';
import { AccommodationCard } from '@/components/AccommodationCard';
import { Button } from '@/components/ui/Button';
import { Alert, EmptyState, Skeleton } from '@/components/ui/Feedback';
import { IconBed, IconEyeLock, IconRefresh } from '@/components/ui/Icons';
import { Input } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { apiFetch, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';

interface AccommodationResponse {
  topSuggestions: AccommodationSuggestion[];
  allSuggestions: AccommodationSuggestion[];
  cached?: boolean;
  searchedAt?: string;
  demo?: boolean;
}

export function StaysTab({
  tripId,
  isCreator,
  canSeeResults,
}: {
  tripId: string;
  isCreator: boolean;
  canSeeResults: boolean;
}) {
  const { toast } = useToast();
  const key = `/trips/${tripId}/accommodations`;
  const { data, error, isLoading, mutate } = useSWR<AccommodationResponse>(canSeeResults ? key : null);

  const [origin, setOrigin] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [searching, setSearching] = useState(false);
  const [showAll, setShowAll] = useState(false);

  async function search() {
    setSearching(true);
    try {
      const price = maxPrice.trim() ? Number(maxPrice.replace(',', '.')) : undefined;
      const result = await apiFetch<AccommodationResponse>(`${key}/search`, {
        method: 'POST',
        body: {
          origin: origin.trim() || undefined,
          maxPricePerNight: price && price > 0 ? price : undefined,
        },
      });
      await mutate({ ...result, cached: false, searchedAt: new Date().toISOString() }, { revalidate: false });
      toast('Suche abgeschlossen', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSearching(false);
    }
  }

  if (!canSeeResults) {
    return (
      <div className="card">
        <EmptyState icon={<IconEyeLock size={28} />} title="Unterkunftsvorschläge folgen">
          Die Vorschläge basieren auf dem Gruppenergebnis und erscheinen, sobald der Ersteller die Auswertung freigibt.
        </EmptyState>
      </div>
    );
  }
  if (isLoading) return <Skeleton className="h-56" />;
  if (error) return <Alert tone="error">{errorMessage(error)}</Alert>;

  const top = data?.topSuggestions ?? [];
  const rest = (data?.allSuggestions ?? []).slice(top.length);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-title2">Unterkünfte</h2>
        <p className="mt-1 text-callout text-secondary">
          Passende Angebote für das Favoriten-Wochenende – ausgewählt nach Gruppengröße, Preis und den genannten Wünschen.
        </p>
      </div>

      {data?.demo && (
        <Alert tone="warning" title="Beispieldaten">
          Solange keine Anbindung an Buchungsportale konfiguriert ist, zeigt die Suche Beispielangebote. Preise und Links sind nicht
          verbindlich.
        </Alert>
      )}

      {isCreator ? (
        <section className="card space-y-5 p-5 sm:p-6" aria-labelledby="search-heading">
          <h3 id="search-heading" className="text-headline">
            Suche starten
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Startort der Gruppe"
              optional
              placeholder="z. B. München"
              hint="Für die Entfernungsangabe."
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
            />
            <Input
              label="Höchstpreis pro Nacht"
              optional
              type="number"
              inputMode="decimal"
              min={0}
              placeholder="in Euro"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button loading={searching} onClick={search} icon={<IconRefresh size={18} />}>
              {top.length > 0 ? 'Suche aktualisieren' : 'Unterkünfte suchen'}
            </Button>
            {data?.searchedAt && (
              <p className="text-footnote text-secondary">Stand: {formatDateTime(data.searchedAt)}</p>
            )}
          </div>
        </section>
      ) : (
        top.length === 0 && <Alert tone="info">Der Ersteller der Reise startet die Unterkunftssuche.</Alert>
      )}

      {top.length === 0 ? (
        <div className="card">
          <EmptyState icon={<IconBed size={26} />} title="Noch keine Vorschläge">
            {isCreator
              ? 'Starte die Suche, sobald deine Gruppe abgestimmt hat.'
              : 'Sobald die Suche gestartet wurde, erscheinen die Vorschläge hier.'}
          </EmptyState>
        </div>
      ) : (
        <section aria-label="Top-Vorschläge" className="space-y-4">
          <h3 className="text-headline">Top 3 für deine Gruppe</h3>
          <div className="space-y-4">
            {top.map((suggestion, index) => (
              <AccommodationCard key={suggestion.id} suggestion={suggestion} rank={index + 1} hue={195 + index * 25} />
            ))}
          </div>

          {rest.length > 0 && (
            <div className="space-y-4 pt-2">
              <Button variant="plain" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
                {showAll ? 'Weitere Vorschläge ausblenden' : `${rest.length} weitere Vorschläge anzeigen`}
              </Button>
              {showAll && (
                <div className="space-y-4">
                  {rest.map((suggestion, index) => (
                    <AccommodationCard key={suggestion.id} suggestion={suggestion} hue={210 + index * 20} />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
