import type { ComponentType } from 'react';
import type { AccommodationTypeKey, ActivityCategory, ExperienceKey, MealCategory, TripType } from '@shared/types';
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
  IconSun,
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

/** Kategorien für gesammelte Aktivitäten in der Nähe. */
export const ACTIVITY_CATEGORIES: CatalogItem<ActivityCategory>[] = [
  { key: 'wellness', label: 'Wellness', description: 'Sauna, Spa und Entspannung', icon: IconSparkles },
  { key: 'nature', label: 'Natur', description: 'Wandern, Ausblick, frische Luft', icon: IconLeaf },
  { key: 'sport', label: 'Sport', description: 'Ski, Action und Bewegung', icon: IconCompass },
  { key: 'food', label: 'Essen', description: 'Hütten, Restaurants und Genuss', icon: IconUtensils },
];

export const ACTIVITY_CATEGORY_LABELS = Object.fromEntries(
  ACTIVITY_CATEGORIES.map((c) => [c.key, c.label])
) as Record<ActivityCategory, string>;

/** Mahlzeiten-Kategorien zur Gruppierung der Einkaufsliste. */
export const MEAL_CATEGORIES: CatalogItem<MealCategory>[] = [
  { key: 'breakfast', label: 'Frühstück', description: 'Brötchen, Kaffee, Eier …', icon: IconSun },
  { key: 'lunch', label: 'Mittag', description: 'Nudeln, Salat, Brot …', icon: IconUtensils },
  { key: 'dinner', label: 'Abend', description: 'Grillen, Wein, Snacks …', icon: IconMoon },
  { key: 'other', label: 'Sonstiges', description: 'Wasser, Kaffee, Haushalt …', icon: IconSparkles },
];

export const MEAL_CATEGORY_LABELS = Object.fromEntries(
  MEAL_CATEGORIES.map((c) => [c.key, c.label])
) as Record<MealCategory, string>;

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
