import type { ReactNode, SVGProps } from 'react';

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function createIcon(children: ReactNode, displayName: string) {
  const Icon = ({ size = 20, className, ...rest }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      {children}
    </svg>
  );
  Icon.displayName = displayName;
  return Icon;
}

export const IconMountain = createIcon(
  <>
    <path d="m3 19 6.2-10.5a1 1 0 0 1 1.7 0L14 14l2.2-3.6a1 1 0 0 1 1.7 0L21 19H3Z" />
    <path d="m9.6 9.2 1.4 2.3 1.3-1.1" />
  </>,
  'IconMountain'
);
export const IconCalendar = createIcon(
  <>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </>,
  'IconCalendar'
);
export const IconUsers = createIcon(
  <>
    <circle cx="9" cy="8.5" r="3.25" />
    <path d="M2.75 19.5c.6-3.4 3.2-5.25 6.25-5.25s5.65 1.85 6.25 5.25" />
    <path d="M16 5.6a3.25 3.25 0 0 1 0 5.8M18.4 14.6c1.6.7 2.6 2.2 2.85 4.4" />
  </>,
  'IconUsers'
);
export const IconUser = createIcon(
  <>
    <circle cx="12" cy="8" r="3.75" />
    <path d="M4.5 20c.7-3.6 3.8-5.5 7.5-5.5s6.8 1.9 7.5 5.5" />
  </>,
  'IconUser'
);
export const IconCheck = createIcon(<path d="m5 12.5 4.5 4.5L19 7.5" />, 'IconCheck');
export const IconX = createIcon(<path d="M6 6l12 12M18 6 6 18" />, 'IconX');
export const IconPlus = createIcon(<path d="M12 5v14M5 12h14" />, 'IconPlus');
export const IconMinus = createIcon(<path d="M5 12h14" />, 'IconMinus');
export const IconChevronRight = createIcon(<path d="m9.5 5.5 6.5 6.5-6.5 6.5" />, 'IconChevronRight');
export const IconChevronLeft = createIcon(<path d="m14.5 5.5-6.5 6.5 6.5 6.5" />, 'IconChevronLeft');
export const IconChevronDown = createIcon(<path d="m5.5 9.5 6.5 6.5 6.5-6.5" />, 'IconChevronDown');
export const IconEye = createIcon(
  <>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.75" />
  </>,
  'IconEye'
);
export const IconEyeOff = createIcon(
  <>
    <path d="M3 3l18 18" />
    <path d="M10.6 5.65A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.8M6.4 6.9A15.6 15.6 0 0 0 2.5 12S6 18.5 12 18.5c1.4 0 2.7-.35 3.8-.9" />
    <path d="M9.9 9.9a2.75 2.75 0 0 0 3.9 3.9" />
  </>,
  'IconEyeOff'
);
export const IconLogOut = createIcon(
  <>
    <path d="M9.5 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3" />
    <path d="M14 8l4 4-4 4M18 12H9.5" />
  </>,
  'IconLogOut'
);
export const IconMail = createIcon(
  <>
    <rect x="3" y="5.5" width="18" height="13" rx="3" />
    <path d="m4 8 8 5.5L20 8" />
  </>,
  'IconMail'
);
export const IconCopy = createIcon(
  <>
    <rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.5" />
    <path d="M15.5 8.5v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
  </>,
  'IconCopy'
);
export const IconLink = createIcon(
  <>
    <path d="M10.5 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M13.5 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </>,
  'IconLink'
);
export const IconMapPin = createIcon(
  <>
    <path d="M12 21s-6.75-5.6-6.75-11.1a6.75 6.75 0 0 1 13.5 0C18.75 15.4 12 21 12 21Z" />
    <circle cx="12" cy="9.9" r="2.4" />
  </>,
  'IconMapPin'
);
export const IconSparkles = createIcon(
  <>
    <path d="M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.5l-1.9-5.7L4.5 10.9 10.1 9 12 3.5Z" />
    <path d="M19 3v3M17.5 4.5h3M5 17v3M3.5 18.5h3" />
  </>,
  'IconSparkles'
);
export const IconNote = createIcon(
  <>
    <path d="M6.5 3.5h8.7L19.5 8v11a1.5 1.5 0 0 1-1.5 1.5H6.5A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5Z" />
    <path d="M14.5 3.5V8h5M8.5 12.5h7M8.5 16h5" />
  </>,
  'IconNote'
);
export const IconTrophy = createIcon(
  <>
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
    <path d="M8 6H5v1.5A3 3 0 0 0 8 10.5M16 6h3v1.5a3 3 0 0 1-3 3M12 13v4M8.5 20h7M10 17h4" />
  </>,
  'IconTrophy'
);
export const IconBed = createIcon(
  <>
    <path d="M3 18.5V6M3 14h18v4.5M21 14v-2.5A2.5 2.5 0 0 0 18.5 9H11v5" />
    <circle cx="7" cy="11" r="1.75" />
  </>,
  'IconBed'
);
export const IconLock = createIcon(
  <>
    <rect x="4.5" y="10.5" width="15" height="10" rx="3" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </>,
  'IconLock'
);
export const IconShield = createIcon(
  <>
    <path d="M12 3.5 5 6v5.6c0 4.2 2.8 7.4 7 8.9 4.2-1.5 7-4.7 7-8.9V6l-7-2.5Z" />
    <path d="m9 12 2.2 2.2L15.2 10" />
  </>,
  'IconShield'
);
export const IconMenu = createIcon(<path d="M4 7h16M4 12h16M4 17h16" />, 'IconMenu');
export const IconExternal = createIcon(
  <>
    <path d="M14 4.5h5.5V10M19.5 4.5 11 13" />
    <path d="M17.5 14v4a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h4" />
  </>,
  'IconExternal'
);
export const IconTrash = createIcon(
  <>
    <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.5h6.4a1.5 1.5 0 0 0 1.5-1.5l.8-12" />
    <path d="M10 11v6M14 11v6" />
  </>,
  'IconTrash'
);
export const IconRefresh = createIcon(
  <>
    <path d="M19.5 12a7.5 7.5 0 0 1-13.2 4.9M4.5 12a7.5 7.5 0 0 1 13.2-4.9" />
    <path d="M18.5 3.5V8H14M5.5 20.5V16H10" />
  </>,
  'IconRefresh'
);
export const IconSnowflake = createIcon(
  <>
    <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" />
    <path d="m9.5 4.5 2.5 2 2.5-2M9.5 19.5l2.5-2 2.5 2" />
  </>,
  'IconSnowflake'
);
export const IconSun = createIcon(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8" />
  </>,
  'IconSun'
);
export const IconLeaf = createIcon(
  <>
    <path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15" />
    <path d="M5 19c2.5-4 5.5-6.5 9-8" />
  </>,
  'IconLeaf'
);
export const IconFlower = createIcon(
  <>
    <circle cx="12" cy="12" r="2.25" />
    <path d="M12 9.75C12 7 10.6 4.5 12 3.5c1.4 1 0 3.5 0 6.25ZM12 14.25c0 2.75 1.4 5.25 0 6.25-1.4-1-0-3.5 0-6.25ZM9.75 12C7 12 4.5 13.4 3.5 12c1-1.4 3.5 0 6.25 0ZM14.25 12c2.75 0 5.25-1.4 6.25 0-1 1.4-3.5 0-6.25 0Z" />
  </>,
  'IconFlower'
);
export const IconAlert = createIcon(
  <>
    <path d="M12 4 2.75 19.5h18.5L12 4Z" />
    <path d="M12 10v4.5M12 17.25v.01" />
  </>,
  'IconAlert'
);
export const IconInfo = createIcon(
  <>
    <circle cx="12" cy="12" r="8.75" />
    <path d="M12 11v5M12 8v.01" />
  </>,
  'IconInfo'
);
export const IconSettings = createIcon(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.75l.05.05a2 2 0 1 1-2.8 2.8l-.05-.05a1.6 1.6 0 0 0-1.75-.3 1.6 1.6 0 0 0-1 1.45V20.5a2 2 0 1 1-4 0v-.08a1.6 1.6 0 0 0-1.05-1.45 1.6 1.6 0 0 0-1.75.3l-.05.05a2 2 0 1 1-2.8-2.8l.05-.05a1.6 1.6 0 0 0 .3-1.75 1.6 1.6 0 0 0-1.45-1H3.5a2 2 0 1 1 0-4h.08a1.6 1.6 0 0 0 1.45-1.05 1.6 1.6 0 0 0-.3-1.75l-.05-.05a2 2 0 1 1 2.8-2.8l.05.05a1.6 1.6 0 0 0 1.75.3H9a1.6 1.6 0 0 0 1-1.45V3.5a2 2 0 1 1 4 0v.08a1.6 1.6 0 0 0 1 1.45 1.6 1.6 0 0 0 1.75-.3l.05-.05a2 2 0 1 1 2.8 2.8l-.05.05a1.6 1.6 0 0 0-.3 1.75V9a1.6 1.6 0 0 0 1.45 1h.08a2 2 0 1 1 0 4h-.08a1.6 1.6 0 0 0-1.45 1Z" />
  </>,
  'IconSettings'
);
export const IconHome = createIcon(
  <>
    <path d="M4 11.5 12 4.5l8 7" />
    <path d="M6 10.5V19a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19v-8.5" />
    <path d="M10 20.5v-5h4v5" />
  </>,
  'IconHome'
);
export const IconBuilding = createIcon(
  <>
    <rect x="5" y="3.5" width="14" height="17" rx="2" />
    <path d="M9 8h.01M12 8h.01M15 8h.01M9 12h.01M12 12h.01M15 12h.01" />
    <path d="M10 20.5v-4h4v4" />
  </>,
  'IconBuilding'
);
export const IconTent = createIcon(
  <>
    <path d="M12 4 3 19.5h18L12 4Z" />
    <path d="M12 4v15.5M9 19.5l3-5 3 5" />
  </>,
  'IconTent'
);
export const IconWave = createIcon(
  <>
    <path d="M3 9c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2" />
    <path d="M3 14c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2" />
    <path d="M3 19c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2" />
  </>,
  'IconWave'
);
export const IconCompass = createIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
  </>,
  'IconCompass'
);
export const IconUtensils = createIcon(
  <path d="M7 3.5v7a2 2 0 0 0 2 2M7 3.5v17M11 3.5v7a2 2 0 0 1-2 2M17 20.5V3.5c-2 1.5-3 4-3 7v2.5h3" />,
  'IconUtensils'
);
export const IconMusic = createIcon(
  <>
    <path d="M9 18V6l10-2v12" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="16.5" cy="16" r="2.5" />
  </>,
  'IconMusic'
);
export const IconMoon = createIcon(<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />, 'IconMoon');
export const IconLandmark = createIcon(
  <>
    <path d="M3.5 9 12 4l8.5 5H3.5Z" />
    <path d="M5.5 9.5v8M9.5 9.5v8M14.5 9.5v8M18.5 9.5v8M3.5 20.5h17M4.5 17.5h15" />
  </>,
  'IconLandmark'
);
export const IconEyeLock = createIcon(
  <>
    <path d="M12 5.5C6 5.5 2.5 12 2.5 12s1.4 2.6 3.7 4.4" />
    <path d="M21.5 12s-1.2-2.2-3.2-3.9" />
    <rect x="9" y="12.5" width="6" height="5.5" rx="1.5" />
    <path d="M10.2 12.5v-1.3a1.8 1.8 0 0 1 3.6 0v1.3" />
  </>,
  'IconEyeLock'
);
