'use client';

import { useState } from 'react';
import type { AccommodationSuggestion } from '@shared/types';
import { MountainArt } from '@/components/MountainArt';
import { buttonClasses } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Feedback';
import { IconCheck, IconExternal, IconMapPin } from '@/components/ui/Icons';
import { formatMoney } from '@/lib/format';

const PROVIDER_LABELS: Record<AccommodationSuggestion['provider'], string> = {
  booking: 'Booking.com',
  airbnb: 'Airbnb',
  rapidapi: 'RapidAPI',
};

/** Airbnb bewertet auf 5, Booking.com auf 10 – für die Anzeige beides sichtbar machen. */
function ratingLabel(suggestion: AccommodationSuggestion): string | null {
  if (suggestion.rating === null) return null;
  const scale = suggestion.provider === 'airbnb' ? 5 : 10;
  return `${suggestion.rating.toString().replace('.', ',')} / ${scale}`;
}

export function AccommodationCard({
  suggestion,
  rank,
  hue = 200,
}: {
  suggestion: AccommodationSuggestion;
  rank?: number;
  hue?: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const rating = ratingLabel(suggestion);
  const showImage = suggestion.imageUrl && !imageFailed;

  return (
    <article className="card flex flex-col overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-lift sm:flex-row">
      <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-grouped sm:aspect-auto sm:w-72">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={suggestion.imageUrl ?? undefined}
            alt={`Foto: ${suggestion.name}`}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <MountainArt hue={hue} className="h-full w-full" />
        )}
        {rank && (
          <span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-subhead font-semibold shadow-card backdrop-blur">
            {rank}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h3 className="text-title3">{suggestion.name}</h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-subhead text-secondary">
              <Badge>{PROVIDER_LABELS[suggestion.provider]}</Badge>
              {rating && <span>★ {rating}</span>}
              {suggestion.distanceKm !== null && (
                <span className="inline-flex items-center gap-1">
                  <IconMapPin size={14} /> {Math.round(suggestion.distanceKm)} km entfernt
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-title2 tabular-nums">{formatMoney(suggestion.pricePerPerson, suggestion.currency)}</p>
            <p className="text-footnote text-secondary">pro Person · {formatMoney(suggestion.pricePerNight, suggestion.currency)} / Nacht</p>
          </div>
        </div>

        {suggestion.matchReasons.length > 0 && (
          <div>
            <p className="eyebrow mb-2">Warum das passt</p>
            <ul className="space-y-1.5 text-subhead">
              {suggestion.matchReasons.map((reason) => (
                <li key={reason} className="flex gap-2">
                  <IconCheck size={16} strokeWidth={2.5} className="mt-0.5 shrink-0 text-success" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {suggestion.amenities.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Ausstattung">
            {suggestion.amenities.map((amenity) => (
              <li key={amenity}>
                <Badge className="capitalize">{amenity}</Badge>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto pt-1">
          <a href={suggestion.url} target="_blank" rel="noopener noreferrer" className={buttonClasses('tinted', 'sm')}>
            Angebot ansehen <IconExternal size={15} />
            <span className="sr-only">(öffnet in neuem Tab)</span>
          </a>
        </div>
      </div>
    </article>
  );
}
