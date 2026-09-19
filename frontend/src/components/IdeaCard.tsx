import { MountainArt } from '@/components/MountainArt';
import { Badge } from '@/components/ui/Feedback';
import { IconExternal, IconMapPin } from '@/components/ui/Icons';
import { buttonClasses } from '@/components/ui/Button';
import { googleMapsUrl, type MountainIdea, type Season } from '@/data/mountain-ideas';

export function IdeaCard({ idea, season, highlightTags = [] }: { idea: MountainIdea; season: Season; highlightTags?: string[] }) {
  return (
    <article className="card flex h-full flex-col overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="relative aspect-[2/1] w-full overflow-hidden">
        <MountainArt hue={idea.hue} season={season} className="h-full w-full" />
        <div className="absolute left-3 top-3">
          <Badge className="bg-surface/85 text-label backdrop-blur">
            <IconMapPin size={13} /> {idea.country}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <h3 className="text-title3">{idea.name}</h3>
          <p className="text-subhead text-secondary">{idea.region}</p>
        </div>
        <p className="text-callout text-secondary">{idea.summary}</p>

        <ul className="space-y-1.5 text-subhead">
          {idea.highlights.map((highlight) => (
            <li key={highlight} className="flex gap-2">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-1.5">
          {idea.tags.map((tag) => (
            <Badge key={tag} tone={highlightTags.includes(tag) ? 'accent' : 'neutral'}>
              {tag}
            </Badge>
          ))}
        </div>

        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <a
            href={googleMapsUrl(idea.mapsQuery)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses('tinted', 'sm')}
          >
            Auf Google Maps <IconExternal size={15} />
            <span className="sr-only">(öffnet in neuem Tab)</span>
          </a>
          <a
            href={googleMapsUrl(`Hütte Unterkunft ${idea.mapsQuery}`)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses('plain', 'sm')}
          >
            Unterkünfte ansehen <IconExternal size={15} />
            <span className="sr-only">(öffnet in neuem Tab)</span>
          </a>
        </div>
      </div>
    </article>
  );
}
