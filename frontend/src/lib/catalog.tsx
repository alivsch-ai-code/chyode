import type { ComponentType } from 'react';
import type { AccommodationTypeKey, ExperienceKey, TripType } from '@shared/types';
import {
  IconBed,
  IconBuilding,
  IconCompass,
  IconHome,
  IconLandmark,
  IconLeaf,
  IconMoon,
  IconMountain,
  IconMusic,
  IconSnowflake,
  IconSparkles,
  IconTent,
  IconUtensils,
  IconWave,
  type IconProps,
} from '@/components/ui/Icons';

export interface CatalogItem<K extends string> {
  key: K;
  label: string;
  description: string;
  icon: ComponentType<IconProps>;
}

/** Unterkunftsarten – gleichzeitig Trip-Typ (Vorschlag des Erstellers) und Auswahl bei den Präferenzen. */
export const ACCOMMODATION_TYPES: CatalogItem<AccommodationTypeKey>[] = [
  { key: 'hut', label: 'Berghütte', description: 'Urig, gemütlich, mitten in der Natur', icon: IconMountain },
  { key: 'chalet', label: 'Chalet & Ferienhaus', description: 'Ganzes Haus für die Gruppe mit eigener Küche', icon: IconHome },
  { key: 'hotel', label: 'Hotel', description: 'Frühstück, Service und Komfort', icon: IconBuilding },
  { key: 'wellness', label: 'Wellness- & Spa-Hotel', description: 'Sauna, Pool und Behandlungen', icon: IconSparkles },
  { key: 'apartment', label: 'Ferienwohnung', description: 'Apartments – flexibel und zentral', icon: IconBed },
  { key: 'glamping', label: 'Glamping & Camping', description: 'Naturerlebnis mit oder ohne Komfort', icon: IconTent },
];

/** Erlebniswelten – wonach sich die Gruppe sehnt. */
export const EXPERIENCES: CatalogItem<ExperienceKey>[] = [
  { key: 'nature', label: 'Natur & Wandern', description: 'Gipfel, Almen und frische Luft', icon: IconLeaf },
  { key: 'wellness', label: 'Wellness & Entspannung', description: 'Sauna, Therme und abschalten', icon: IconSparkles },
  { key: 'winter', label: 'Ski & Wintersport', description: 'Piste, Loipe und Schneeschuhe', icon: IconSnowflake },
  { key: 'culinary', label: 'Kulinarik & Genuss', description: 'Hüttenküche, Wein und Regionales', icon: IconUtensils },
  { key: 'adventure', label: 'Abenteuer & Action', description: 'Klettern, Biken, Rafting', icon: IconCompass },
  { key: 'culture', label: 'Kultur & Sightseeing', description: 'Orte, Museen und Geschichte', icon: IconLandmark },
  { key: 'water', label: 'Wasser & Seen', description: 'Baden, Stand-up-Paddling, Boot', icon: IconWave },
  { key: 'social', label: 'Feiern & Geselligkeit', description: 'Spieleabende, Après-Ski, Party', icon: IconMusic },
  { key: 'calm', label: 'Ruhe & Auszeit', description: 'Nichts müssen, einfach sein', icon: IconMoon },
];

export const MAX_EXPERIENCES = 4;
export const MAX_ACCOMMODATION_TYPES = 3;

export const ACCOMMODATION_LABELS: Record<TripType, string> = {
  hut: 'Berghütte',
  chalet: 'Chalet & Ferienhaus',
  hotel: 'Hotel',
  wellness: 'Wellness- & Spa-Hotel',
  apartment: 'Ferienwohnung',
  glamping: 'Glamping & Camping',
  other: 'Sonstiges',
};

export const EXPERIENCE_LABELS = Object.fromEntries(EXPERIENCES.map((e) => [e.key, e.label])) as Record<ExperienceKey, string>;
