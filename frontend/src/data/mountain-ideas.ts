export type Season = 'winter' | 'spring' | 'summer' | 'autumn';
export type IdeaTag = 'Hütte' | 'Sauna & Wellness' | 'Ski & Snowboard' | 'Wandern' | 'See' | 'Gletscher' | 'Ruhe';

export interface MountainIdea {
  id: string;
  name: string;
  region: string;
  country: 'Deutschland' | 'Österreich' | 'Italien';
  summary: string;
  highlights: string[];
  seasons: Season[];
  tags: IdeaTag[];
  /** Grundfarbton (0–360) für die Illustration. */
  hue: number;
  /** Suchbegriff für Google Maps. */
  mapsQuery: string;
}

export const SEASON_LABELS: Record<Season, string> = {
  winter: 'Winter',
  spring: 'Frühling',
  summer: 'Sommer',
  autumn: 'Herbst',
};

/** Meteorologisch-touristische Zuordnung: Dez–Mär Winter, Apr–Mai Frühling, Jun–Sep Sommer, Okt–Nov Herbst. */
export function seasonOfMonth(monthIndex: number): Season {
  if (monthIndex === 11 || monthIndex <= 2) return 'winter';
  if (monthIndex <= 4) return 'spring';
  if (monthIndex <= 8) return 'summer';
  return 'autumn';
}

export const MOUNTAIN_IDEAS: MountainIdea[] = [
  {
    id: 'allgaeu',
    name: 'Allgäuer Alpen',
    region: 'Oberstdorf & Umgebung',
    country: 'Deutschland',
    summary: 'Klassische Alpenkulisse: im Sommer Hüttenwanderungen, im Winter Skiberge und gespurte Loipen.',
    highlights: ['Nebelhorn und Fellhorn als Aussichtsberge mit Bergbahn', 'Breitachklamm bei Oberstdorf', 'Hüttenwanderungen mit Einkehr'],
    seasons: ['winter', 'spring', 'summer', 'autumn'],
    tags: ['Wandern', 'Ski & Snowboard', 'Hütte'],
    hue: 205,
    mapsQuery: 'Oberstdorf Allgäu',
  },
  {
    id: 'berchtesgaden',
    name: 'Berchtesgadener Land',
    region: 'Oberbayern',
    country: 'Deutschland',
    summary: 'Wilde Bergwelt rund um den Königssee – ideal für ruhige Wochenenden in der Natur.',
    highlights: ['Königssee mit Elektroboot-Fahrt', 'Nationalpark Berchtesgaden', 'Blick auf das Watzmann-Massiv'],
    seasons: ['summer', 'autumn', 'winter'],
    tags: ['Wandern', 'See', 'Ruhe'],
    hue: 165,
    mapsQuery: 'Königssee Berchtesgaden',
  },
  {
    id: 'zugspitze',
    name: 'Garmisch-Partenkirchen & Zugspitze',
    region: 'Werdenfelser Land',
    country: 'Deutschland',
    summary: 'Deutschlands höchster Berg in Reichweite: Aussicht, Klammen und im Winter Skibetrieb.',
    highlights: ['Zugspitze (2.962 m) per Bahn erreichbar', 'Partnachklamm', 'Skigebiete im Winter'],
    seasons: ['winter', 'summer', 'autumn'],
    tags: ['Ski & Snowboard', 'Wandern'],
    hue: 215,
    mapsQuery: 'Garmisch-Partenkirchen Zugspitze',
  },
  {
    id: 'chiemgau',
    name: 'Chiemgau',
    region: 'Chiemsee & Voralpen',
    country: 'Deutschland',
    summary: 'Sanfte Berge und Bayerns größter See: entspannt, familienfreundlich und schnell erreichbar.',
    highlights: ['Chiemsee mit Alpenpanorama', 'Kampenwand als Ausflugsberg', 'Wander- und Radwege für jedes Niveau'],
    seasons: ['spring', 'summer', 'autumn'],
    tags: ['See', 'Wandern', 'Ruhe'],
    hue: 185,
    mapsQuery: 'Chiemgau Kampenwand',
  },
  {
    id: 'zillertal',
    name: 'Zillertal',
    region: 'Tirol',
    country: 'Österreich',
    summary: 'Große Skigebiete im Winter, weite Almen und Gipfeltouren im Sommer.',
    highlights: ['Hintertuxer Gletscher mit Skibetrieb fast ganzjährig', 'Mayrhofen als lebendiger Talort', 'Almhütten mit regionaler Küche'],
    seasons: ['winter', 'summer'],
    tags: ['Ski & Snowboard', 'Gletscher', 'Wandern', 'Hütte'],
    hue: 200,
    mapsQuery: 'Mayrhofen Zillertal',
  },
  {
    id: 'stubai',
    name: 'Stubaital',
    region: 'Tirol',
    country: 'Österreich',
    summary: 'Gletscher, Almen und Rodelbahnen nur eine kurze Fahrt von Innsbruck entfernt.',
    highlights: ['Stubaier Gletscher', 'Wanderungen zu bewirtschafteten Almen', 'Rodelbahnen im Winter'],
    seasons: ['winter', 'summer'],
    tags: ['Gletscher', 'Ski & Snowboard', 'Wandern'],
    hue: 225,
    mapsQuery: 'Stubaital Neustift Tirol',
  },
  {
    id: 'zell-am-see',
    name: 'Zell am See & Kaprun',
    region: 'Salzburger Land',
    country: 'Österreich',
    summary: 'See und Gletscher an einem Ort: Baden im Sommer, Skifahren im Winter.',
    highlights: ['Zeller See zum Baden und Segeln', 'Kitzsteinhorn-Gletscher', 'Großglockner Hochalpenstraße in der Nähe'],
    seasons: ['winter', 'summer', 'autumn'],
    tags: ['See', 'Ski & Snowboard', 'Gletscher'],
    hue: 190,
    mapsQuery: 'Zell am See Kaprun',
  },
  {
    id: 'montafon',
    name: 'Montafon',
    region: 'Vorarlberg',
    country: 'Österreich',
    summary: 'Die Silvretta-Region verbindet Skibetrieb, Skitouren und gemütliche Hüttenkultur.',
    highlights: ['Silvretta-Hochgebirge', 'Skifahren und Skitouren', 'Viele bewirtschaftete Hütten'],
    seasons: ['winter', 'summer', 'autumn'],
    tags: ['Ski & Snowboard', 'Wandern', 'Hütte'],
    hue: 230,
    mapsQuery: 'Montafon Vorarlberg',
  },
  {
    id: 'kleinwalsertal',
    name: 'Kleinwalsertal',
    region: 'Vorarlberg',
    country: 'Österreich',
    summary: 'Ein ruhiges Hochtal, das nur von Deutschland aus mit dem Auto erreichbar ist.',
    highlights: ['Wandern rund um das Walmendinger Horn', 'Skifahren ohne Massenandrang', 'Gemütliche Hüttenwirte'],
    seasons: ['winter', 'spring', 'summer', 'autumn'],
    tags: ['Ruhe', 'Wandern', 'Ski & Snowboard'],
    hue: 175,
    mapsQuery: 'Kleinwalsertal Riezlern',
  },
  {
    id: 'dolomiten',
    name: 'Südtirol – Dolomiten',
    region: 'Seiser Alm, Gröden & Umgebung',
    country: 'Italien',
    summary: 'UNESCO-Welterbe mit spektakulären Felstürmen, Wellnesshotels und feiner Küche.',
    highlights: ['Seiser Alm als eine der größten Hochalmen Europas', 'Dolomiten – UNESCO-Weltnaturerbe', 'Törggelen im Herbst mit Kastanien und Wein'],
    seasons: ['winter', 'summer', 'autumn'],
    tags: ['Wandern', 'Ski & Snowboard', 'Sauna & Wellness', 'Hütte'],
    hue: 20,
    mapsQuery: 'Seiser Alm Südtirol',
  },
  {
    id: 'achensee',
    name: 'Achensee',
    region: 'Tirol',
    country: 'Österreich',
    summary: 'Der größte See Tirols, eingerahmt von Bergen – Wandern und Wasser in einem Wochenende.',
    highlights: ['Tirols größter See', 'Rofan-Gebirge mit Seilbahn', 'Rad- und Wanderwege rund um den See'],
    seasons: ['spring', 'summer', 'autumn'],
    tags: ['See', 'Wandern'],
    hue: 195,
    mapsQuery: 'Achensee Tirol',
  },
  {
    id: 'feldberg',
    name: 'Schwarzwald – Feldberg',
    region: 'Baden-Württemberg',
    country: 'Deutschland',
    summary: 'Mittelgebirge mit Weitblick: Winterwandern, Langlauf und urige Berggasthöfe.',
    highlights: ['Feldberg (1.493 m), höchster Berg des Schwarzwalds', 'Langlaufloipen und Winterwanderwege', 'Traditionelle Berggasthöfe'],
    seasons: ['winter', 'spring', 'summer', 'autumn'],
    tags: ['Wandern', 'Ruhe', 'Ski & Snowboard'],
    hue: 150,
    mapsQuery: 'Feldberg Schwarzwald',
  },
  {
    id: 'harz',
    name: 'Harz – Brocken',
    region: 'Sachsen-Anhalt',
    country: 'Deutschland',
    summary: 'Norddeutschlands höchster Berg mit Dampfzug, Sagen und weiten Wäldern.',
    highlights: ['Brocken (1.141 m) mit historischer Brockenbahn', 'Walpurgisnacht Ende April', 'Wandern durch den Nationalpark Harz'],
    seasons: ['spring', 'autumn', 'winter'],
    tags: ['Wandern', 'Ruhe'],
    hue: 130,
    mapsQuery: 'Brocken Harz',
  },
];

/** Passende Ideen für eine Jahreszeit, sortiert nach Anzahl der Tags mit Bezug zu den Wünschen. */
export function ideasForSeason(season: Season, preferredTags: IdeaTag[] = []): MountainIdea[] {
  return MOUNTAIN_IDEAS.filter((idea) => idea.seasons.includes(season)).sort((a, b) => {
    const score = (idea: MountainIdea) => idea.tags.filter((tag) => preferredTags.includes(tag)).length;
    return score(b) - score(a);
  });
}

export function googleMapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
