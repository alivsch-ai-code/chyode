'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import type { DateOption, Note, TripResults } from '@shared/types';
import { IdeaCard } from '@/components/IdeaCard';
import { Badge } from '@/components/ui/Feedback';
import { Segmented } from '@/components/ui/Segmented';
import {
  SEASON_LABELS,
  ideasForSeason,
  seasonOfMonth,
  type IdeaTag,
  type Season,
} from '@/data/mountain-ideas';
import { dateFromYmd, formatDateRange, toYmd } from '@/lib/format';

const TAG_PATTERNS: [IdeaTag, RegExp][] = [
  ['Sauna & Wellness', /sauna|wellness|therme|whirlpool|\bspa\b/i],
  ['Ski & Snowboard', /\bski|snowboard|piste|langlauf|rodel/i],
  ['Wandern', /wander|trekking|gipfel|bergtour/i],
  ['Hütte', /hütte|huette|\balm\b|kamin/i],
  ['See', /\bsee\b|seeblick|baden|schwimm/i],
  ['Gletscher', /gletscher/i],
  ['Ruhe', /\bruhe\b|ruhig|entspann|abgelegen/i],
];

function preferredTags(notes: Note[]): IdeaTag[] {
  const text = notes.map((n) => n.content).join(' \n ');
  return TAG_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([tag]) => tag);
}

const SEASON_OPTIONS = (Object.keys(SEASON_LABELS) as Season[]).map((value) => ({ value, label: SEASON_LABELS[value] }));

export function IdeasTab({ tripId }: { tripId: string }) {
  const options = useSWR<{ dateOptions: DateOption[] }>(`/trips/${tripId}/date-options`);
  const results = useSWR<{ results: TripResults }>(`/trips/${tripId}/results`);
  const notes = useSWR<{ notes: Note[] }>(`/trips/${tripId}/notes`);
  const [chosenSeason, setChosenSeason] = useState<Season | null>(null);

  // Bezugstermin: Favorit, sonst der nächste vorgeschlagene Termin
  const reference = useMemo(() => {
    const top = results.data?.results.topDateOption;
    if (top) return { start: toYmd(top.startDate), end: toYmd(top.endDate), isTop: true };
    const first = options.data?.dateOptions[0];
    if (first) return { start: toYmd(first.start_date), end: toYmd(first.end_date), isTop: false };
    return null;
  }, [results.data, options.data]);

  const derivedSeason: Season = reference
    ? seasonOfMonth(dateFromYmd(reference.start).getUTCMonth())
    : seasonOfMonth(new Date().getMonth());
  const season = chosenSeason ?? derivedSeason;

  const tags = useMemo(() => preferredTags(notes.data?.notes ?? []), [notes.data]);
  const ideas = useMemo(() => ideasForSeason(season, tags), [season, tags]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-title2">Ideen für die Berge</h2>
        <p className="mt-1 text-callout text-secondary">
          {reference
            ? `Passend zu ${reference.isTop ? 'eurem Favoriten' : 'dem ersten Termin'} (${formatDateRange(reference.start, reference.end)}) – sortiert nach Jahreszeit und euren Wünschen.`
            : 'Beliebte Ziele nach Jahreszeit – sortiert nach euren Wünschen.'}
        </p>
      </div>

      <div className="space-y-3">
        <Segmented ariaLabel="Jahreszeit" value={season} onChange={setChosenSeason} options={SEASON_OPTIONS} />
        {tags.length > 0 && (
          <p className="flex flex-wrap items-center gap-2 text-subhead text-secondary">
            Aus euren Notizen erkannt:
            {tags.map((tag) => (
              <Badge key={tag} tone="accent">
                {tag}
              </Badge>
            ))}
          </p>
        )}
      </div>

      <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {ideas.map((idea) => (
          <li key={idea.id}>
            <IdeaCard idea={idea} season={season} highlightTags={tags} />
          </li>
        ))}
      </ul>

      <p className="text-footnote text-secondary">
        Kuratierte Beispiele als Inspiration. Verfügbarkeit, Preise und Öffnungszeiten bitte direkt prüfen – die Links führen zu
        Google Maps.
      </p>
    </div>
  );
}
