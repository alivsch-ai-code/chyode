import type { AccommodationSuggestion } from '@shared/types';

export function AccommodationCard({
  suggestion,
  rank,
}: {
  suggestion: AccommodationSuggestion;
  rank?: number;
}) {
  return (
    <div className="card flex flex-col gap-4 sm:flex-row">
      {suggestion.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={suggestion.imageUrl}
          alt={suggestion.name}
          className="h-40 w-full rounded-lg object-cover sm:h-32 sm:w-48"
        />
      )}
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold">
            {rank && <span className="mr-2 text-brand-600">#{rank}</span>}
            {suggestion.name}
          </h3>
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-500">
            {suggestion.provider}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
          <span>
            {suggestion.pricePerPerson.toFixed(0)} {suggestion.currency} / Person
          </span>
          <span>
            {suggestion.pricePerNight.toFixed(0)} {suggestion.currency} / Nacht
          </span>
          {suggestion.rating && <span>⭐ {suggestion.rating.toFixed(1)}</span>}
          {suggestion.distanceKm !== null && <span>{suggestion.distanceKm} km entfernt</span>}
        </div>

        {suggestion.amenities.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {suggestion.amenities.map((amenity) => (
              <span key={amenity} className="rounded-full bg-slate-50 px-2 py-0.5 text-xs text-slate-500">
                {amenity}
              </span>
            ))}
          </div>
        )}

        {suggestion.matchReasons.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-xs text-green-700">
            {suggestion.matchReasons.map((reason, i) => (
              <li key={i}>✓ {reason}</li>
            ))}
          </ul>
        )}

        <a
          href={suggestion.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary mt-3 inline-block text-sm"
        >
          Zur Unterkunft
        </a>
      </div>
    </div>
  );
}
